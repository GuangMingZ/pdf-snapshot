import { fork, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SnapshotAbortedError, SnapshotTimeoutError } from '../errors.js';
import type { SnapshotOptions, PageInfo, WorkerResponse } from '../types.js';
import { DEFAULT_FORMAT, DEFAULT_QUALITY } from '../constants.js';

interface WorkerManagerOptions {
  pdfPath: string;
  pages: number[];
  scale: number;
  outputDir: string;
  timeout: number;
  format?: 'png' | 'jpeg';
  quality?: number;
  signal?: AbortSignal;
  onProgress?: SnapshotOptions['onProgress'];
}

// ESM 兼容路径计算（不能使用 __dirname）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKER_SCRIPT = resolve(__dirname, '../core/worker.js');

export async function runWorker(options: WorkerManagerOptions): Promise<PageInfo[]> {
  const {
    pdfPath,
    pages,
    scale,
    outputDir,
    timeout,
    format = DEFAULT_FORMAT,
    quality = DEFAULT_QUALITY,
    signal,
    onProgress,
  } = options;
  const totalPages = pages.length;

  return new Promise((resolve, reject) => {
    let settled = false;

    // 启动子进程（使用已编译的 .js 文件）
    const child: ChildProcess = fork(WORKER_SCRIPT, [], {
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    });

    // 超时定时器
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill('SIGKILL');
        reject(new SnapshotTimeoutError(timeout));
      }
    }, timeout);

    // 取消信号处理
    const abortHandler = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        child.kill('SIGTERM');
        reject(new SnapshotAbortedError());
      }
    };

    if (signal) {
      if (signal.aborted) {
        child.kill('SIGKILL');
        reject(new SnapshotAbortedError());
        return;
      }
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    // 清理辅助函数
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abortHandler);
    };

    // 处理子进程消息
    child.on(
      'message',
      (msg: { ready?: boolean } & WorkerResponse) => {
        // worker 就绪后发送任务
        if (msg.ready) {
          child.send({ pdfPath, pages, scale, outputDir, format, quality });
          // 发出 preparing 阶段进度
          onProgress?.({
            currentPage: 0,
            completedPages: 0,
            totalPages,
            percent: 0,
            stage: 'preparing',
          });
          return;
        }

        // 收到最终结果（成功或失败）
        if (!settled) {
          settled = true;
          cleanup();

          if (msg.success && msg.pages) {
            // 触发完成进度
            onProgress?.({
              currentPage: pages[pages.length - 1],
              completedPages: totalPages,
              totalPages,
              percent: 100,
              stage: 'completed',
            });
            resolve(msg.pages);
          } else {
            reject(new Error(msg.error ?? 'Worker returned failure without error message'));
          }
        }
      }
    );

    child.on('error', (err) => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(err);
      }
    });

    child.on('exit', (code) => {
      if (!settled) {
        settled = true;
        cleanup();
        if (code !== 0) {
          reject(new Error(`Worker exited with code ${code}`));
        }
      }
    });
  });
}
