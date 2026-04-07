# @guangmingz/pdf-snapshot

[中文](./README.md) | English

> PDF Page Screenshot Tool - Convert PDF pages to PNG images

A Node.js toolkit for PDF page screenshots, supporting page range selection, stream input, progress callbacks, and cancellation capabilities.

## Features

- ✅ **Page Range Screenshots** - Input `[start, end]`, returns screenshots for each page in range
- ✅ **Discrete Page Screenshots** - Input `[1, 3, 5, 7]`, returns screenshots for specified pages
- ✅ **All-page screenshots** - Returns one screenshot per page when no page parameter is provided
- ✅ **Multiple Input Formats** - File path / Buffer / ReadableStream
- ✅ **Multiple Output Formats** - Buffer / Base64 / File path
- ✅ **Progress Callback** - Fires on the `preparing` and `completed` stages
- ✅ **Cancellation Support** - AbortController interrupt support
- ✅ **Timeout Control** - Auto SIGKILL for subprocess timeout
- ✅ **Subprocess Isolation** - PDF rendering executes in isolated process, main process memory unaffected
- ✅ **CLI Tool** - Command-line interface support
- ⚠️ **PNG Output Only** - Underlying `pdf-parse` only supports PNG rendering. For JPEG, use external libraries like `sharp` for transcoding

## Installation

```bash
npm install @guangmingz/pdf-snapshot
```

## API Usage

### Basic Usage — Page Range

```typescript
import { snapshotPdf } from '@guangmingz/pdf-snapshot';

// Screenshot pages 2-4, returns Buffer array
const results = await snapshotPdf('./document.pdf', {
  pageRange: [2, 4],
});
// results: [
//   { page: 2, width: 1275, height: 1650, data: Buffer<...> },
//   { page: 3, width: 1275, height: 1650, data: Buffer<...> },
//   { page: 4, width: 1275, height: 1650, data: Buffer<...> },
// ]
```

### Discrete Pages

```typescript
const results = await snapshotPdf('./document.pdf', {
  pages: [1, 5, 10],
});
```

> `pageRange` and `pages` are mutually exclusive. Passing both will throw an error.

### All Pages

```typescript
// No page parameters; captures all pages
const results = await snapshotPdf('./document.pdf');
```

### Stream Input

```typescript
import { createReadStream } from 'node:fs';

const stream = createReadStream('./large-document.pdf');
const results = await snapshotPdf(stream, {
  pages: [1, 10, 20],
  output: 'file',
  outputDir: './screenshots',
});
```

> Buffer / Stream input will be written to a temporary file first, then processed. Cleanup is automatic after the function returns.

### Output to File

```typescript
const results = await snapshotPdf('./document.pdf', {
  pageRange: [1, 5],
  output: 'file',
  outputDir: './screenshots',
  fileNameTemplate: 'slide-{PAGE}.png',  // {PAGE} = original page number, {page} = 3-digit zero-padded
});
// results[0].data => './screenshots/slide-1.png'
```

**Filename Template Placeholders:**

| Placeholder | Description | Example (Page 2) |
|-------------|-------------|------------------|
| `{page}` | 3-digit zero-padded page number | `page-002.png` |
| `{PAGE}` | Original page number (no padding) | `page-2.png` |

### Output as Base64

```typescript
const results = await snapshotPdf('./document.pdf', {
  pageRange: [1, 3],
  output: 'base64',
});
// results[0].data => 'iVBORw0KGgoAAAANSUhEUgAA...'
```

### Progress Callback

The progress callback fires on the `preparing` and `completed` stages:

```typescript
await snapshotPdf('./document.pdf', {
  pageRange: [1, 50],
  onProgress: (progress) => {
    console.log(`[${progress.stage}] ${progress.percent}%`);
  },
});
// Output:
// [preparing] 0%
// [completed] 100%
```

### Cancel Operation

```typescript
import { SnapshotAbortedError } from '@guangmingz/pdf-snapshot';

const controller = new AbortController();

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  const results = await snapshotPdf('./large-document.pdf', {
    pageRange: [1, 500],
    signal: controller.signal,
  });
} catch (error) {
  if (error instanceof SnapshotAbortedError) {
    console.log('Screenshot cancelled by user');
  }
}
```

### Get PDF Info

```typescript
import { getPdfInfo } from '@guangmingz/pdf-snapshot';

const info = await getPdfInfo('./document.pdf');
console.log(`PDF has ${info.totalPages} pages`);
console.log(`File size: ${info.fileSize} bytes`);

// Combined with getPdfInfo to screenshot last 5 pages
const lastFive = await snapshotPdf('./document.pdf', {
  pageRange: [Math.max(1, info.totalPages - 4), info.totalPages],
});
```

## CLI Usage

### Basic Commands

```bash
# Screenshot pages 2-4
pdf-snapshot -r 2-4 -o ./output document.pdf

# Screenshot specific pages
pdf-snapshot -p 1,5,10,15 document.pdf

# Screenshot all pages (HD, scale=2.0)
pdf-snapshot -s 2.0 -o ./screenshots document.pdf

# Custom filename template ({PAGE} = no padding, {page} = 3-digit zero-padded)
pdf-snapshot -t "slide-{PAGE}.png" -r 1-5 document.pdf

# View PDF info only
pdf-snapshot --info document.pdf
# Output (CLI uses Chinese labels): 📄 PDF 信息: 共 25 页, 文件大小: 2.5 MB

# Silent mode (no progress display)
pdf-snapshot --silent -r 1-100 document.pdf

# Read from stdin (streaming)
cat document.pdf | pdf-snapshot -o ./output -r 1-5 -

# Custom timeout (milliseconds)
pdf-snapshot --timeout 60000 -r 1-200 document.pdf
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--output <dir>` | `-o` | Output directory | `./pdf-screenshots` |
| `--pages <pages>` | `-p` | Discrete page numbers, comma-separated (e.g., `1,3,5`) | - |
| `--range <start-end>` | `-r` | Page range (e.g., `1-10`) | - |
| `--scale <number>` | `-s` | Render scale ratio (higher = clearer) | `1.5` |
| `--template <name>` | `-t` | Filename template (supports `{page}` / `{PAGE}`) | `page-{page}.png` |
| `--info` | `-i` | Show PDF info only | - |
| `--silent` | | Silent mode, no progress display | - |
| `--timeout <ms>` | | Subprocess timeout (milliseconds) | `120000` |
| `--help` | `-h` | Show help | - |
| `--version` | `-v` | Show version | - |

> Output format is fixed to **PNG**.

## API Reference

### `snapshotPdf(input, options?)`

Takes screenshots of specified PDF pages, returns an array of screenshot results.

**Parameters:**

- `input`: `string | Buffer | Readable` — PDF input (file path / Buffer / readable stream)
- `options`: `SnapshotOptions` — Configuration options (optional)

**Returns:** `Promise<SnapshotResult[]>`

**Exceptions:**

| Error Class | Trigger Condition |
|-------------|-------------------|
| `SnapshotAbortedError` | `signal.abort()` is called |
| `SnapshotTimeoutError` | Exceeds `timeout` time limit |
| `Error` | Both `pageRange` and `pages` are provided / `outputDir` not provided when `output: 'file'` |

---

### `getPdfInfo(input)`

Gets basic PDF information.

**Parameters:**

- `input`: `string | Buffer | Readable` — PDF input

**Returns:** `Promise<PdfInfo>`

---

### `SnapshotOptions`

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `pageRange` | `[number, number]` | Page range (closed interval), mutually exclusive with `pages` | - |
| `pages` | `number[]` | Discrete page number array, mutually exclusive with `pageRange` | - |
| `scale` | `number` | Render scale ratio | `1.5` |
| `output` | `'buffer' \| 'base64' \| 'file'` | Output format | `'buffer'` |
| `outputDir` | `string` | Output directory (required when `output: 'file'`) | - |
| `fileNameTemplate` | `string` | Filename template, supports `{page}` (zero-padded) / `{PAGE}` (original) | `'page-{page}.png'` |
| `onProgress` | `(progress: ProgressInfo) => void` | Progress callback; fires on `preparing` / `completed` | - |
| `signal` | `AbortSignal` | Cancellation signal | - |
| `timeout` | `number` | Subprocess timeout (milliseconds) | `120000` |

---

### `SnapshotResult`

| Property | Type | Description |
|----------|------|-------------|
| `page` | `number` | Page number (1-based) |
| `width` | `number` | Image width (pixels) |
| `height` | `number` | Image height (pixels) |
| `data` | `Buffer \| string` | Image data (Buffer / Base64 string / file path, depends on `output`) |

---

### `ProgressInfo`

| Property | Type | Description |
|----------|------|-------------|
| `currentPage` | `number` | Page currently being processed; in the `completed` stage, this is the last page |
| `completedPages` | `number` | Number of completed pages |
| `totalPages` | `number` | Total number of pages |
| `percent` | `number` | Progress percentage (0 or 100) |
| `stage` | `'preparing' \| 'completed'` | Current stage |

---

### `PdfInfo`

| Property | Type | Description |
|----------|------|-------------|
| `totalPages` | `number` | Total PDF pages |
| `fileSize` | `number` | File size (bytes); for Stream input, this is the collected Buffer size |

## Development

```bash
# Install dependencies
npm install

# Development mode (watch file changes and auto-build)
npm run dev

# Build
npm run build

# Run tests
npm test

# Type check
npm run type-check
```

## Notes

- **PNG only**: The underlying `pdf-parse`'s `getScreenshot` outputs PNG (`canvas.toBuffer("image/png")`) only, JPEG is not supported. For JPEG, use `sharp` to transcode after receiving `data: Buffer`.
- **Subprocess Isolation**: PDF rendering executes in an isolated subprocess. After the subprocess exits, V8 heap memory used by `pdfjs-dist` is fully released, preventing memory leak accumulation.
- **Temporary Files**: Buffer / Stream input will be written to a temporary file in `os.tmpdir()`. Cleanup is automatic after the function ends, whether it succeeds or throws.
- **Page Number Out of Range**: Values in `pageRange` / `pages` that exceed actual PDF page count will be automatically clipped, no error thrown.

## License

MIT
