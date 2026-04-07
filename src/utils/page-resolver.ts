import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';

export interface ResolvePageOptions {
  /** 页码范围 [start, end]（闭区间） */
  pageRange?: [number, number];
  /** 离散页码数组 */
  pages?: number[];
}

/**
 * 解析页码，返回最终需要处理的页码数组
 *
 * @param pdfPath PDF 文件路径
 * @param options 页码选项
 * @returns 排序后的页码数组（1-based）
 */
export async function resolvePages(
  pdfPath: string,
  options: ResolvePageOptions
): Promise<number[]> {
  const { pageRange, pages } = options;

  // 先获取 PDF 总页数
  const totalPages = await getPdfTotalPages(pdfPath);

  // 1. 如果指定了 pageRange
  if (pageRange) {
    const [start, end] = pageRange;
    const validStart = Math.max(1, Math.min(start, totalPages));
    const validEnd = Math.max(validStart, Math.min(end, totalPages));
    return Array.from({ length: validEnd - validStart + 1 }, (_, i) => validStart + i);
  }

  // 2. 如果指定了 pages
  if (pages && pages.length > 0) {
    return pages
      .filter((p) => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b)
      .filter((p, i, arr) => i === 0 || p !== arr[i - 1]); // 去重
  }

  // 3. 默认返回所有页
  return Array.from({ length: totalPages }, (_, i) => i + 1);
}

/**
 * 获取 PDF 总页数
 */
async function getPdfTotalPages(pdfPath: string): Promise<number> {
  const pdfBuffer = await readFile(pdfPath);
  const parser = new PDFParse({ data: pdfBuffer });

  try {
    const info = await parser.getInfo();
    return info.total || 1;
  } finally {
    await parser.destroy();
  }
}
