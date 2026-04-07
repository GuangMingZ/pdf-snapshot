# @guangmingz/pdf-snapshot

中文 | [English](./README_EN.md)

> PDF 页面截图工具 - 将 PDF 页面转换为 PNG 图片

一个用于 PDF 页面截图的 Node.js 工具包，支持指定页码范围、流式输入、进度回调和取消能力。

## 特性

- ✅ **页码范围截图** - 输入 `[start, end]`，返回该范围内每页的截图
- ✅ **离散页码截图** - 输入 `[1, 3, 5, 7]`，返回指定页的截图
- ✅ **全部页面截图** - 不传页码参数时，返回所有页面截图
- ✅ **多种输入格式** - 文件路径 / Buffer / ReadableStream
- ✅ **多种输出格式** - Buffer / Base64 / 文件路径
- ✅ **进度回调** - 通知 preparing / completed 阶段
- ✅ **取消能力** - 支持 AbortController 中断
- ✅ **超时控制** - 子进程超时自动 SIGKILL
- ✅ **子进程隔离** - PDF 渲染在独立进程中执行，主进程内存不受影响
- ✅ **CLI 工具** - 命令行接口支持
- ⚠️ **仅支持 PNG 输出** - 底层 `pdf-parse` 仅支持 PNG 渲染，如需 JPEG 请在外部用 `sharp` 等库二次转码

## 安装

```bash
npm install @guangmingz/pdf-snapshot
```

## API 使用

### 基本用法 — 页码范围

```typescript
import { snapshotPdf } from '@guangmingz/pdf-snapshot';

// 截取第 2-4 页，返回 Buffer 数组
const results = await snapshotPdf('./document.pdf', {
  pageRange: [2, 4],
});
// results: [
//   { page: 2, width: 1275, height: 1650, data: Buffer<...> },
//   { page: 3, width: 1275, height: 1650, data: Buffer<...> },
//   { page: 4, width: 1275, height: 1650, data: Buffer<...> },
// ]
```

### 离散页码

```typescript
const results = await snapshotPdf('./document.pdf', {
  pages: [1, 5, 10],
});
```

> `pageRange` 和 `pages` 互斥，同时传入会抛错。

### 全部页面

```typescript
// 不传页码参数，截取所有页
const results = await snapshotPdf('./document.pdf');
```

### 流式输入

```typescript
import { createReadStream } from 'node:fs';

const stream = createReadStream('./large-document.pdf');
const results = await snapshotPdf(stream, {
  pages: [1, 10, 20],
  output: 'file',
  outputDir: './screenshots',
});
```

> Buffer / Stream 输入会先写入临时文件再处理，函数返回后自动清理。

### 输出为文件

```typescript
const results = await snapshotPdf('./document.pdf', {
  pageRange: [1, 5],
  output: 'file',
  outputDir: './screenshots',
  fileNameTemplate: 'slide-{PAGE}.png',  // {PAGE} = 原始页码，{page} = 3位补零页码
});
// results[0].data => './screenshots/slide-1.png'
```

**文件名模板占位符：**

| 占位符 | 说明 | 示例（第2页） |
|--------|------|--------------|
| `{page}` | 3 位补零页码 | `page-002.png` |
| `{PAGE}` | 原始页码（不补零） | `page-2.png` |

### 输出为 Base64

```typescript
const results = await snapshotPdf('./document.pdf', {
  pageRange: [1, 3],
  output: 'base64',
});
// results[0].data => 'iVBORw0KGgoAAAANSUhEUgAA...'
```

### 进度回调

进度回调在操作开始（`preparing`）和完成（`completed`）时触发：

```typescript
await snapshotPdf('./document.pdf', {
  pageRange: [1, 50],
  onProgress: (progress) => {
    console.log(`[${progress.stage}] ${progress.percent}%`);
  },
});
// 输出:
// [preparing] 0%
// [completed] 100%
```

### 取消操作

```typescript
import { SnapshotAbortedError } from '@guangmingz/pdf-snapshot';

const controller = new AbortController();

// 5 秒后取消
setTimeout(() => controller.abort(), 5000);

try {
  const results = await snapshotPdf('./large-document.pdf', {
    pageRange: [1, 500],
    signal: controller.signal,
  });
} catch (error) {
  if (error instanceof SnapshotAbortedError) {
    console.log('截图被用户取消');
  }
}
```

### 获取 PDF 信息

```typescript
import { getPdfInfo } from '@guangmingz/pdf-snapshot';

const info = await getPdfInfo('./document.pdf');
console.log(`PDF 共 ${info.totalPages} 页`);
console.log(`文件大小: ${info.fileSize} bytes`);

// 结合 getPdfInfo 截取最后 5 页
const lastFive = await snapshotPdf('./document.pdf', {
  pageRange: [Math.max(1, info.totalPages - 4), info.totalPages],
});
```

## CLI 使用

### 基本命令

```bash
# 截取第 2-4 页
pdf-snapshot -r 2-4 -o ./output document.pdf

# 截取指定页码
pdf-snapshot -p 1,5,10,15 document.pdf

# 截取所有页面（高清，scale=2.0）
pdf-snapshot -s 2.0 -o ./screenshots document.pdf

# 自定义文件名模板（{PAGE} = 不补零，{page} = 3位补零）
pdf-snapshot -t "slide-{PAGE}.png" -r 1-5 document.pdf

# 仅查看 PDF 信息
pdf-snapshot --info document.pdf
# 输出: 📄 PDF 信息: 共 25 页, 文件大小: 2.5 MB

# 静默模式（不显示进度）
pdf-snapshot --silent -r 1-100 document.pdf

# 从标准输入读取（流式）
cat document.pdf | pdf-snapshot -o ./output -r 1-5 -

# 自定义超时（毫秒）
pdf-snapshot --timeout 60000 -r 1-200 document.pdf
```

### 选项参数

| 选项 | 简写 | 描述 | 默认值 |
|------|------|------|--------|
| `--output <dir>` | `-o` | 输出目录 | `./pdf-screenshots` |
| `--pages <pages>` | `-p` | 离散页码，逗号分隔（如 `1,3,5`） | - |
| `--range <start-end>` | `-r` | 页码范围（如 `1-10`） | - |
| `--scale <number>` | `-s` | 渲染缩放比例（越大越清晰） | `1.5` |
| `--template <name>` | `-t` | 文件名模板（支持 `{page}` / `{PAGE}`） | `page-{page}.png` |
| `--info` | `-i` | 仅显示 PDF 信息 | - |
| `--silent` | | 静默模式，不显示进度 | - |
| `--timeout <ms>` | | 子进程超时时间（毫秒） | `120000` |
| `--help` | `-h` | 显示帮助 | - |
| `--version` | `-v` | 显示版本 | - |

> 输出格式固定为 **PNG**。

## API 参考

### `snapshotPdf(input, options?)`

对 PDF 指定页面进行截图，返回截图结果数组。

**参数：**

- `input`: `string | Buffer | Readable` — PDF 输入（文件路径 / Buffer / 可读流）
- `options`: `SnapshotOptions` — 配置选项（可选）

**返回值：** `Promise<SnapshotResult[]>`

**异常：**

| 错误类 | 触发条件 |
|--------|---------|
| `SnapshotAbortedError` | `signal.abort()` 被调用 |
| `SnapshotTimeoutError` | 超过 `timeout` 时间限制 |
| `Error` | `pageRange` 和 `pages` 同时传入 / `output: 'file'` 时未传 `outputDir` |

---

### `getPdfInfo(input)`

获取 PDF 基本信息。

**参数：**

- `input`: `string | Buffer | Readable` — PDF 输入

**返回值：** `Promise<PdfInfo>`

---

### `SnapshotOptions`

| 属性 | 类型 | 描述 | 默认值 |
|------|------|------|--------|
| `pageRange` | `[number, number]` | 页码范围（闭区间），与 `pages` 互斥 | - |
| `pages` | `number[]` | 离散页码数组，与 `pageRange` 互斥 | - |
| `scale` | `number` | 渲染缩放比例 | `1.5` |
| `output` | `'buffer' \| 'base64' \| 'file'` | 输出格式 | `'buffer'` |
| `outputDir` | `string` | 输出目录（`output: 'file'` 时必填） | - |
| `fileNameTemplate` | `string` | 文件名模板，支持 `{page}`（补零）/ `{PAGE}`（原始） | `'page-{page}.png'` |
| `onProgress` | `(progress: ProgressInfo) => void` | 进度回调（preparing / completed 阶段） | - |
| `signal` | `AbortSignal` | 取消信号 | - |
| `timeout` | `number` | 子进程超时时间（毫秒） | `120000` |

---

### `SnapshotResult`

| 属性 | 类型 | 描述 |
|------|------|------|
| `page` | `number` | 页码（1-based） |
| `width` | `number` | 图片宽度（像素） |
| `height` | `number` | 图片高度（像素） |
| `data` | `Buffer \| string` | 图片数据（Buffer / Base64 字符串 / 文件路径，取决于 `output`） |

---

### `ProgressInfo`

| 属性 | 类型 | 描述 |
|------|------|------|
| `currentPage` | `number` | 当前处理的页码（`completed` 阶段为最后一页） |
| `completedPages` | `number` | 已完成页数 |
| `totalPages` | `number` | 总页数 |
| `percent` | `number` | 进度百分比（0 或 100） |
| `stage` | `'preparing' \| 'completed'` | 当前阶段 |

---

### `PdfInfo`

| 属性 | 类型 | 描述 |
|------|------|------|
| `totalPages` | `number` | PDF 总页数 |
| `fileSize` | `number` | 文件大小（bytes）；Stream 输入时为收集后的 Buffer 大小 |

## 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化自动构建）
npm run dev

# 构建
npm run build

# 运行测试
npm test

# 类型检查
npm run type-check
```

## 注意事项

- **PNG only**：底层 `pdf-parse` 的 `getScreenshot` 固定输出 PNG（`canvas.toBuffer("image/png")`），不支持 JPEG。如需 JPEG，在拿到 `data: Buffer` 后自行用 `sharp` 转码。
- **子进程隔离**：PDF 渲染在独立子进程中执行，子进程退出后 `pdfjs-dist` 占用的 V8 堆内存全部释放，不会累积泄漏。
- **临时文件**：Buffer / Stream 输入会写入 `os.tmpdir()` 的临时文件，函数结束（无论成功或异常）后自动清理。
- **页码越界**：`pageRange` / `pages` 中超出 PDF 实际页数的值会被自动裁剪，不报错。

## License

MIT
