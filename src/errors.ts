/**
 * 截图操作被取消时抛出的错误
 */
export class SnapshotAbortedError extends Error {
  constructor(message = 'Snapshot operation was aborted') {
    super(message);
    this.name = 'SnapshotAbortedError';
  }
}

/**
 * 截图操作超时时抛出的错误
 */
export class SnapshotTimeoutError extends Error {
  constructor(timeout: number) {
    super(`Snapshot operation timed out after ${timeout}ms`);
    this.name = 'SnapshotTimeoutError';
  }
}

/**
 * PDF 解析错误
 */
export class PdfParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfParseError';
  }
}

/**
 * 无效页码错误
 */
export class InvalidPageError extends Error {
  constructor(page: number, totalPages: number) {
    super(`Invalid page number ${page}. PDF has ${totalPages} pages (1-${totalPages}).`);
    this.name = 'InvalidPageError';
  }
}
