import type { Readable } from 'node:stream';

// ============ 输入类型 ============

/**
 * PDF 输入类型
 * - string: 文件路径
 * - Buffer: 内存 Buffer
 * - Readable: 可读流（支持流式输入）
 */
export type PdfInput = string | Buffer | Readable;

// ============ 配置选项 ============

export interface SnapshotOptions {
  /**
   * 页码范围 [start, end]（闭区间）
   * 例如 [2, 4] 返回第 2、3、4 页
   */
  pageRange?: [number, number];

  /**
   * 离散页码数组
   * 例如 [1, 3, 5] 返回第 1、3、5 页
   * 与 pageRange 互斥，优先使用 pageRange
   */
  pages?: number[];

  /**
   * 渲染缩放比例，默认 1.5
   * 越大图片越清晰，但内存占用更高
   */
  scale?: number;

  /**
   * 输出格式
   * - 'buffer': 返回 Buffer 数组（默认）
   * - 'base64': 返回 Base64 字符串数组
   * - 'file': 保存到文件，返回文件路径数组
   */
  output?: 'buffer' | 'base64' | 'file';

  /**
   * 当 output 为 'file' 时，指定输出目录
   * 默认为系统临时目录
   */
  outputDir?: string;

  /**
   * 文件名模板，支持 {page} 占位符
   * 默认: 'page-{page}.png'
   */
  fileNameTemplate?: string;

  /**
   * 图片格式，默认 'png'
   */
  format?: 'png' | 'jpeg';

  /**
   * JPEG 质量 (1-100)，仅当 format 为 'jpeg' 时有效
   * 默认: 80
   */
  quality?: number;

  /**
   * 进度回调函数
   * 每完成一页截图后调用
   */
  onProgress?: (progress: ProgressInfo) => void;

  /**
   * AbortSignal 用于取消操作
   * 当 signal.aborted 为 true 时，停止后续截图
   */
  signal?: AbortSignal;

  /**
   * 子进程超时时间（毫秒）
   * 默认: 120000 (2分钟)
   */
  timeout?: number;
}

// ============ 进度信息 ============

export interface ProgressInfo {
  /** 当前处理的页码 */
  currentPage: number;
  /** 已完成的页数 */
  completedPages: number;
  /** 总共需要处理的页数 */
  totalPages: number;
  /** 进度百分比 (0-100) */
  percent: number;
  /** 当前阶段 */
  stage: 'preparing' | 'rendering' | 'saving' | 'completed';
}

// ============ 结果类型 ============

export interface SnapshotResult {
  /** 页码（1-based） */
  page: number;
  /** 图片宽度（像素） */
  width: number;
  /** 图片高度（像素） */
  height: number;
  /**
   * 图片数据
   * - output='buffer' 时为 Buffer
   * - output='base64' 时为 string
   * - output='file' 时为文件路径 string
   */
  data: Buffer | string;
}

export interface PdfInfo {
  /** 总页数 */
  totalPages: number;
  /** 文件大小 (bytes) */
  fileSize: number;
}

// ============ Worker 通信类型 ============

export interface WorkerRequest {
  /** 临时 PDF 文件路径（主进程写入，worker 读取） */
  pdfPath: string;
  /** 需要渲染的页码数组 */
  pages: number[];
  /** 渲染缩放比例 */
  scale: number;
  /** 截图输出临时目录 */
  outputDir: string;
  /** 图片格式 */
  format: 'png' | 'jpeg';
  /** JPEG 质量 */
  quality: number;
}

export interface PageInfo {
  pageNumber: number;
  /** 图片临时文件路径 */
  filePath: string;
  width: number;
  height: number;
  size: number;
}

export interface WorkerResponse {
  success: boolean;
  pages?: PageInfo[];
  error?: string;
}
