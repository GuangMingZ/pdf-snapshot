import { PDFParse } from 'pdf-parse';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { WorkerRequest, PageInfo, WorkerResponse } from '../types.js';

/**
 * Worker 子进程入口
 *
 * 核心职责:
 * 1. 接收文件路径（不是 Buffer），通过读取磁盘避免 IPC 大数据传输
 * 2. 一次性传入所有页码到 getScreenshot，避免重复解析 PDF
 * 3. 渲染结果直接写入临时目录，IPC 只回传文件路径 + 宽高元数据
 *
 * 注意：pdf-parse v2 的 getScreenshot 底层使用 canvas.toBuffer("image/png")，
 * 仅支持 PNG 输出。如需 JPEG，请在主进程通过 sharp 等库二次转码。
 */

process.on('message', async (msg: WorkerRequest) => {
  const { pdfPath, pages, scale, outputDir } = msg;
  let pdfParser: PDFParse | null = null;

  try {
    const pdfBuffer = await readFile(pdfPath);
    pdfParser = new PDFParse({ data: pdfBuffer });

    // 一次性传入所有页码，避免重复解析 PDF
    const screenshotResult = await pdfParser.getScreenshot({
      partial: pages,
      scale,
      imageDataUrl: false,
      imageBuffer: true,
    });

    await mkdir(outputDir, { recursive: true });
    const results: PageInfo[] = [];

    for (const page of screenshotResult.pages) {
      if (!page.data || page.data.length === 0) continue;

      // pdf-parse v2 的 getScreenshot 仅支持 PNG 输出，始终写入 .png
      const fileName = `page-${String(page.pageNumber).padStart(3, '0')}.png`;
      const filePath = join(outputDir, fileName);
      const imageBuffer = Buffer.from(page.data);

      // 写入磁盘，IPC 只传路径（避免传输 MB 级 Buffer）
      await writeFile(filePath, imageBuffer);

      results.push({
        pageNumber: page.pageNumber,
        filePath,
        width: page.width,
        height: page.height,
        size: imageBuffer.length,
      });
    }

    process.send!({ success: true, pages: results } as WorkerResponse);
  } catch (error) {
    process.send!({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    } as WorkerResponse);
  } finally {
    if (pdfParser) {
      try {
        await pdfParser.destroy();
      } catch {
        /* 忽略清理错误 */
      }
    }
    // 子进程退出，pdfjs-dist 占用的 V8 堆内存全部释放
    process.exit(0);
  }
});

// 通知主进程 worker 已就绪
process.send!({ ready: true });
