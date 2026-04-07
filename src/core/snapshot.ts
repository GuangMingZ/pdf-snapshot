import { rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { PdfInput, SnapshotOptions, SnapshotResult } from '../types.js';
import { normalizeInput } from '../utils/input-normalizer.js';
import { resolvePages } from '../utils/page-resolver.js';
import { runWorker } from '../utils/worker-manager.js';
import { formatOutput } from '../utils/output-formatter.js';
import {
  DEFAULT_SCALE,
  DEFAULT_TIMEOUT,
  DEFAULT_FORMAT,
  DEFAULT_QUALITY,
} from '../constants.js';

/**
 * 对 PDF 指定页面进行截图
 *
 * @param input - PDF 输入（文件路径、Buffer 或 ReadableStream）
 * @param options - 配置选项
 * @returns 截图结果数组
 * @throws {SnapshotAbortedError} 当操作被取消时
 * @throws {SnapshotTimeoutError} 当操作超时时
 */
export async function snapshotPdf(
  input: PdfInput,
  options: SnapshotOptions = {}
): Promise<SnapshotResult[]> {
  const {
    pageRange,
    pages,
    scale = DEFAULT_SCALE,
    output = 'buffer',
    outputDir,
    fileNameTemplate,
    format = DEFAULT_FORMAT,
    quality = DEFAULT_QUALITY,
    onProgress,
    signal,
    timeout = DEFAULT_TIMEOUT,
  } = options;

  // pageRange 和 pages 互斥校验
  if (pageRange && pages) {
    throw new Error('Options "pageRange" and "pages" are mutually exclusive. Provide only one.');
  }

  // 归一化输入为临时文件路径
  const { path: pdfPath, isTempFile } = await normalizeInput(input);

  // 创建临时截图目录
  const tempDir = await mkdtemp(join(tmpdir(), `pdf-snapshot-${randomUUID()}-`));

  try {
    // 解析最终页码数组（pageRange / pages / 全部）
    const pageNumbers = await resolvePages(pdfPath, { pageRange, pages });

    if (pageNumbers.length === 0) {
      return [];
    }

    // 子进程渲染
    const pageInfoList = await runWorker({
      pdfPath,
      pages: pageNumbers,
      scale,
      outputDir: tempDir,
      timeout,
      format,
      quality,
      signal,
      onProgress,
    });

    // 格式化输出
    return await formatOutput(pageInfoList, { output, outputDir, fileNameTemplate });
  } finally {
    // 始终清理临时文件，即使发生错误
    await rm(tempDir, { recursive: true, force: true }).catch(() => {
      /* 忽略清理错误 */
    });
    if (isTempFile) {
      await rm(pdfPath, { force: true }).catch(() => {
        /* 忽略清理错误 */
      });
    }
  }
}
