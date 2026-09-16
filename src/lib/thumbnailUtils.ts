const DEFAULT_MAX_EDGE = 320;
const JPEG_QUALITY = 0.72;

export interface ThumbnailResult {
  thumbnailUrl: string;
  width: number;
  height: number;
}

/**
 * Decode once, capture natural dimensions, and emit a small JPEG blob URL
 * for grid display. Never attaches the full-resolution bitmap to the DOM.
 */
export async function createImageThumbnailWithNaturalSize(
  file: File,
  maxEdge: number = DEFAULT_MAX_EDGE
): Promise<ThumbnailResult> {
  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(file);
    const naturalWidth = bitmap.width;
    const naturalHeight = bitmap.height;

    const scale = Math.min(1, maxEdge / Math.max(naturalWidth, naturalHeight));
    const targetW = Math.max(1, Math.round(naturalWidth * scale));
    const targetH = Math.max(1, Math.round(naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not create canvas context for thumbnail');
    }

    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();
    bitmap = null;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error('Thumbnail encoding failed'));
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    });

    return {
      thumbnailUrl: URL.createObjectURL(blob),
      width: naturalWidth,
      height: naturalHeight,
    };
  } finally {
    bitmap?.close();
  }
}

/**
 * Process items with limited concurrency so huge stills don't freeze the UI.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  onItem?: (result: R, index: number) => void
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      const result = await worker(items[current], current);
      results[current] = result;
      onItem?.(result, current);
    }
  }

  const pool = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => runWorker()
  );
  await Promise.all(pool);
  return results;
}
