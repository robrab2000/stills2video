/**
 * Collect image files from a drag-and-drop event, including nested folders.
 * Uses the File System Entry API when available; falls back to DataTransfer.files.
 */

const IMAGE_EXTENSION = /\.(jpe?g|png|gif|webp|bmp|avif|tiff?)$/i;

export function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return IMAGE_EXTENSION.test(file.name);
}

/** Natural compare so frame_2 comes before frame_10 */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function fileSortKey(file: File): string {
  const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return relative && relative.length > 0 ? relative : file.name;
}

/** Stable sequence order for dropped folders / multi-select */
export function sortFilesForSequence(files: File[]): File[] {
  return [...files].sort((a, b) => naturalCompare(fileSortKey(a), fileSortKey(b)));
}

function readAllDirectoryEntries(
  reader: FileSystemDirectoryReader
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: FileSystemEntry[] = [];

    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) {
            resolve(entries);
            return;
          }
          entries.push(...batch);
          readBatch();
        },
        reject
      );
    };

    readBatch();
  });
}

function readFileEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

async function traverseEntry(
  entry: FileSystemEntry,
  out: File[],
  pathPrefix = ''
): Promise<void> {
  if (entry.isFile) {
    const file = await readFileEntry(entry as FileSystemFileEntry);
    if (isLikelyImageFile(file)) {
      // Preserve folder-relative path for sorting when the browser omits webkitRelativePath
      const relativePath = pathPrefix ? `${pathPrefix}/${file.name}` : file.name;
      try {
        Object.defineProperty(file, 'webkitRelativePath', {
          value: relativePath,
          configurable: true,
        });
      } catch {
        // Some browsers make this non-configurable; name-only sort still works
      }
      out.push(file);
    }
    return;
  }

  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const children = await readAllDirectoryEntries(reader);
    children.sort((a, b) => naturalCompare(a.name, b.name));
    const nextPrefix = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;
    for (const child of children) {
      await traverseEntry(child, out, nextPrefix);
    }
  }
}

export async function collectImageFilesFromDataTransfer(
  dataTransfer: DataTransfer
): Promise<File[]> {
  const items = Array.from(dataTransfer.items ?? []);
  const entries = items
    .map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null))
    .filter((entry): entry is FileSystemEntry => Boolean(entry));

  if (entries.length > 0) {
    const files: File[] = [];
    const roots = [...entries].sort((a, b) => naturalCompare(a.name, b.name));
    for (const entry of roots) {
      await traverseEntry(entry, files);
    }
    if (files.length > 0) {
      return sortFilesForSequence(files);
    }
  }

  return sortFilesForSequence(
    Array.from(dataTransfer.files ?? []).filter(isLikelyImageFile)
  );
}

export function filesToFileList(files: File[]): FileList {
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  return dataTransfer.files;
}
