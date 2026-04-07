import { readFile, stat, rm } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';
import type { PdfInput, PdfInfo } from '../types.js';
import { normalizeInput } from '../utils/input-normalizer.js';

/**
 * 获取 PDF 信息（页数等）
 *
 * @param input - PDF 输入（文件路径、Buffer 或 ReadableStream）
 * @returns PDF 信息对象
 */
export async function getPdfInfo(input: PdfInput): Promise<PdfInfo> {
  // 归一化输入
  const { path: pdfPath, isTempFile } = await normalizeInput(input);

  try {
    // 获取文件大小
    const fileStat = await stat(pdfPath);
    const fileSize = fileStat.size;

    // 解析 PDF 获取页数
    const pdfBuffer = await readFile(pdfPath);
    const parser = new PDFParse({ data: pdfBuffer });

    try {
      const info = await parser.getInfo();
      return {
        totalPages: info.total || 1,
        fileSize,
      };
    } finally {
      await parser.destroy();
    }
  } finally {
    // 清理临时文件
    if (isTempFile) {
      await rm(pdfPath, { force: true }).catch(() => {
        /* 忽略清理错误 */
      });
    }
  }
}
