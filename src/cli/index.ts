#!/usr/bin/env node

import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { snapshotPdf } from '../core/snapshot.js';
import { getPdfInfo } from '../core/pdf-info.js';
import type { SnapshotOptions, PdfInput } from '../types.js';
import { SnapshotAbortedError, SnapshotTimeoutError } from '../errors.js';

const program = new Command();

program
  .name('pdf-snapshot')
  .description('PDF 页面截图工具 - 将 PDF 页面转换为图片')
  .version('1.0.0')
  .argument('<input>', 'PDF 文件路径，或使用 - 从标准输入读取')
  .option('-o, --output <dir>', '输出目录', './pdf-screenshots')
  .option('-p, --pages <pages>', '离散页码，逗号分隔 (如: 1,3,5)')
  .option('-r, --range <range>', '页码范围 (如: 1-10)')
  .option('-s, --scale <number>', '缩放比例', '1.5')
  .option('-f, --format <type>', '图片格式 (png/jpeg)', 'png')
  .option('-q, --quality <number>', 'JPEG 质量 (1-100)', '80')
  .option('-t, --template <name>', '文件名模板', 'page-{page}.png')
  .option('-i, --info', '仅显示 PDF 信息')
  .option('--silent', '静默模式，不显示进度')
  .option('--timeout <ms>', '超时时间（毫秒）', '120000')
  .action(async (input: string, opts: Record<string, string | boolean | undefined>) => {
    try {
      // 处理输入
      let pdfInput: PdfInput;
      if (input === '-') {
        // 从标准输入读取 - process.stdin 是 Node.js 的 Readable 流
        pdfInput = process.stdin as unknown as Readable;
      } else {
        if (!existsSync(input)) {
          console.error(`❌ 文件不存在: ${input}`);
          process.exit(1);
        }
        pdfInput = resolve(input);
      }

      // 仅显示 PDF 信息
      if (opts.info) {
        const info = await getPdfInfo(pdfInput);
        console.log(`📄 PDF 信息: 共 ${info.totalPages} 页, 文件大小: ${formatBytes(info.fileSize)}`);
        return;
      }

      // 解析选项
      const options: SnapshotOptions = {
        output: 'file',
        outputDir: resolve(opts.output as string),
        scale: parseFloat(opts.scale as string),
        format: (opts.format as 'png' | 'jpeg') || 'png',
        quality: parseInt(opts.quality as string, 10),
        fileNameTemplate: opts.template as string,
        timeout: parseInt(opts.timeout as string, 10),
      };

      // 解析页码
      if (opts.range) {
        const rangeStr = opts.range as string;
        const parts = rangeStr.split('-').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          options.pageRange = [parts[0], parts[1]];
        } else {
          console.error(`❌ 无效的页码范围: ${rangeStr}，格式应为 start-end (如: 1-10)`);
          process.exit(1);
        }
      } else if (opts.pages) {
        const pagesStr = opts.pages as string;
        const pageNumbers = pagesStr.split(',').map((s) => parseInt(s.trim(), 10));
        if (pageNumbers.some(isNaN)) {
          console.error(`❌ 无效的页码: ${pagesStr}，格式应为逗号分隔的数字 (如: 1,3,5)`);
          process.exit(1);
        }
        options.pages = pageNumbers;
      }

      // 创建输出目录
      await mkdir(options.outputDir!, { recursive: true });

      // 显示开始信息
      if (!opts.silent) {
        console.log('\n📄 PDF 截图工具 v1.0.0');
        console.log('━'.repeat(40));
        console.log(`📁 输入: ${input}`);
        console.log(`📂 输出: ${options.outputDir}`);
        if (options.pageRange) {
          console.log(`📑 页码: ${options.pageRange[0]}-${options.pageRange[1]}`);
        } else if (options.pages) {
          console.log(`📑 页码: ${options.pages.join(', ')}`);
        } else {
          console.log(`📑 页码: 全部`);
        }
        console.log('━'.repeat(40));
        console.log('\n⏳ 正在截图...');
      }

      // 进度显示
      let lastPercent = -1;
      if (!opts.silent) {
        options.onProgress = (progress) => {
          if (progress.percent !== lastPercent) {
            lastPercent = progress.percent;
            const bar = createProgressBar(progress.percent);
            process.stdout.write(
              `\r  [${bar}] ${progress.percent}% | ${progress.completedPages}/${progress.totalPages} 页`
            );
          }
        };
      }

      // 执行截图
      const results = await snapshotPdf(pdfInput, options);

      if (!opts.silent) {
        console.log('\n');
        console.log(`✅ 完成！已保存 ${results.length} 张截图到 ${options.outputDir}`);
      }
    } catch (error) {
      if (error instanceof SnapshotAbortedError) {
        console.error('\n⚠️ 操作已取消');
        process.exit(130); // 128 + SIGINT(2)
      } else if (error instanceof SnapshotTimeoutError) {
        console.error(`\n⏱️ 操作超时: ${(error as Error).message}`);
        process.exit(124); // timeout exit code
      } else {
        console.error(`\n❌ 错误: ${(error as Error).message}`);
        process.exit(1);
      }
    }
  });

/**
 * 创建进度条
 */
function createProgressBar(percent: number, width = 40): string {
  const filled = Math.round((width * percent) / 100);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * 格式化文件大小
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 解析命令行参数
program.parse();
