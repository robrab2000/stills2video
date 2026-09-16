/**
 * Keep export dimensions within encoder limits and even (required for yuv420p).
 */
export function fitExportDimensions(
  width: number,
  height: number,
  maxWidth = 3840,
  maxHeight = 2160
): { width: number; height: number; scaled: boolean } {
  const safeW = Math.max(2, width || 1920);
  const safeH = Math.max(2, height || 1080);
  const scale = Math.min(1, maxWidth / safeW, maxHeight / safeH);
  const fittedW = Math.max(2, Math.round((safeW * scale) / 2) * 2);
  const fittedH = Math.max(2, Math.round((safeH * scale) / 2) * 2);
  return {
    width: fittedW,
    height: fittedH,
    scaled: scale < 0.999,
  };
}

export function getImageFileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'avif'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName;
  }
  switch (file.type) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/bmp':
      return 'bmp';
    case 'image/avif':
      return 'avif';
    default:
      return 'jpg';
  }
}
