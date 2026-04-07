import { Readable } from 'node:stream';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { PdfInput } from '../types.js';

export interface NormalizedInput {
  /** PDF 文件路径 */
  path: string;
  /** 是否为临时文件（需要在使用后清理） */
  isTempFile: boolean;
}

/**
 * 将任意输入格式归一化为临时文件路径。
 * 调用方负责在使用完毕后删除该临时文件。
 *
 * - string  → 直接返回原路径（不复制，需调用方确认文件在任务期间不被删除）
 * - Buffer  → 写入 os.tmpdir() 下的临时文件
 * - Stream  → 先收集成 Buffer，再写入临时文件
 */
export async function normalizeInput(input: PdfInput): Promise<NormalizedInput> {
  // 1. 文件路径 → 直接使用，无需复制
  if (typeof input === 'string') {
    return { path: input, isTempFile: false };
  }

  // 2. Buffer 或 Stream → 写入临时文件
  let buffer: Buffer;
  if (Buffer.isBuffer(input)) {
    buffer = input;
  } else if (input instanceof Readable) {
    buffer = await streamToBuffer(input);
  } else {
    throw new Error('Invalid input type: expected string | Buffer | Readable');
  }

  const tempPath = join(tmpdir(), `pdf-snapshot-${randomUUID()}.pdf`);
  await writeFile(tempPath, buffer);
  return { path: tempPath, isTempFile: true };
}

/**
 * 将可读流收集为 Buffer
 */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
