import { readFile, copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { SnapshotResult, SnapshotOptions, PageInfo } from '../types.js';
import { DEFAULT_FILENAME_TEMPLATE } from '../constants.js';

/**
 * 将 worker 输出的临时文件转换为目标格式。
 *
 * - 'buffer'  → 读取文件，返回 Buffer
 * - 'base64'  → 读取文件，转为 Base64 字符串
 * - 'file'    → 复制到用户指定目录，返回最终文件路径
 */
export async function formatOutput(
  pages: PageInfo[],
  options: Pick<SnapshotOptions, 'output' | 'outputDir' | 'fileNameTemplate'>
): Promise<SnapshotResult[]> {
  const {
    output = 'buffer',
    outputDir,
    fileNameTemplate = DEFAULT_FILENAME_TEMPLATE,
  } = options;

  if (output === 'file') {
    if (!outputDir) {
      throw new Error('outputDir is required when output is "file"');
    }
    await mkdir(outputDir, { recursive: true });
  }

  return Promise.all(
    pages.map(async (page) => {
      let data: Buffer | string;

      switch (output) {
        case 'base64': {
          const buf = await readFile(page.filePath);
          data = buf.toString('base64');
          break;
        }
        case 'file': {
          // 使用模板替换页码，支持 {page} 占位符，并补零
          const paddedPage = String(page.pageNumber).padStart(3, '0');
          const fileName = fileNameTemplate
            .replace('{page}', paddedPage)
            .replace('{PAGE}', String(page.pageNumber));
          const finalPath = join(outputDir!, fileName);
          await copyFile(page.filePath, finalPath);
          data = finalPath;
          break;
        }
        default: {
          // 'buffer'
          data = await readFile(page.filePath);
          break;
        }
      }

      return {
        page: page.pageNumber,
        width: page.width,
        height: page.height,
        data,
      } as SnapshotResult;
    })
  );
}
