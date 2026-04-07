import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

// 测试类型导出
import type {
  PdfInput,
  SnapshotOptions,
  SnapshotResult,
  PdfInfo,
  ProgressInfo,
} from '../src/types.js';

// 测试错误类
import {
  SnapshotAbortedError,
  SnapshotTimeoutError,
  PdfParseError,
  InvalidPageError,
} from '../src/errors.js';

// 测试常量
import {
  DEFAULT_SCALE,
  DEFAULT_TIMEOUT,
  DEFAULT_FORMAT,
  DEFAULT_QUALITY,
} from '../src/constants.js';

describe('Types', () => {
  it('should export PdfInput type', () => {
    // 类型测试 - 编译时检查
    const stringInput: PdfInput = '/path/to/file.pdf';
    const bufferInput: PdfInput = Buffer.from('test');
    expect(typeof stringInput).toBe('string');
    expect(Buffer.isBuffer(bufferInput)).toBe(true);
  });
});

describe('Errors', () => {
  it('should create SnapshotAbortedError', () => {
    const error = new SnapshotAbortedError();
    expect(error.name).toBe('SnapshotAbortedError');
    expect(error.message).toBe('Snapshot operation was aborted');
  });

  it('should create SnapshotAbortedError with custom message', () => {
    const error = new SnapshotAbortedError('Custom abort message');
    expect(error.message).toBe('Custom abort message');
  });

  it('should create SnapshotTimeoutError', () => {
    const error = new SnapshotTimeoutError(5000);
    expect(error.name).toBe('SnapshotTimeoutError');
    expect(error.message).toContain('5000ms');
  });

  it('should create PdfParseError', () => {
    const error = new PdfParseError('Failed to parse PDF');
    expect(error.name).toBe('PdfParseError');
    expect(error.message).toBe('Failed to parse PDF');
  });

  it('should create InvalidPageError', () => {
    const error = new InvalidPageError(10, 5);
    expect(error.name).toBe('InvalidPageError');
    expect(error.message).toContain('10');
    expect(error.message).toContain('5');
  });
});

describe('Constants', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_SCALE).toBe(1.5);
    expect(DEFAULT_TIMEOUT).toBe(120000);
    expect(DEFAULT_FORMAT).toBe('png');
    expect(DEFAULT_QUALITY).toBe(80);
  });
});

describe('Input Normalizer', () => {
  it('should return path for string input', async () => {
    const { normalizeInput } = await import('../src/utils/input-normalizer.js');
    const result = await normalizeInput('/path/to/file.pdf');
    expect(result.path).toBe('/path/to/file.pdf');
    expect(result.isTempFile).toBe(false);
  });

  it('should create temp file for Buffer input', async () => {
    const { normalizeInput } = await import('../src/utils/input-normalizer.js');
    const buffer = Buffer.from('%PDF-1.4 fake pdf content');
    const result = await normalizeInput(buffer);
    
    expect(result.isTempFile).toBe(true);
    expect(result.path).toContain('pdf-snapshot-');
    expect(existsSync(result.path)).toBe(true);
    
    // 清理临时文件
    const { rm } = await import('node:fs/promises');
    await rm(result.path, { force: true });
  });
});

describe('Page Resolver', () => {
  // 这些测试需要真实的 PDF 文件，暂时跳过
  it.todo('should resolve page range');
  it.todo('should resolve discrete pages');
  it.todo('should resolve all pages when no options provided');
});
