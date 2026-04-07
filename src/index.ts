// 导出核心函数
export { snapshotPdf } from './core/snapshot.js';
export { getPdfInfo } from './core/pdf-info.js';

// 导出类型
export type {
  PdfInput,
  SnapshotOptions,
  SnapshotResult,
  PdfInfo,
  ProgressInfo,
  PageInfo,
} from './types.js';

// 导出错误类
export {
  SnapshotAbortedError,
  SnapshotTimeoutError,
  PdfParseError,
  InvalidPageError,
} from './errors.js';

// 导出常量
export {
  DEFAULT_SCALE,
  DEFAULT_TIMEOUT,
  DEFAULT_FORMAT,
  DEFAULT_QUALITY,
  DEFAULT_FILENAME_TEMPLATE,
  DEFAULT_OUTPUT_DIR,
} from './constants.js';
