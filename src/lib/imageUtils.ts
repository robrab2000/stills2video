export interface ImageFile {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  lastModified: number;
}

export type SortOption = "manual" | "name" | "date" | "size";

export interface VideoCodec {
  name: string;
  mimeType: string;
  extension: string;
  supported: boolean;
}

/**
 * Validates if a file is a supported image type
 */
export function isValidImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * Sorts images based on the specified option
 */
export function sortImages(images: ImageFile[], option: SortOption): ImageFile[] {
  if (option === "manual") return images;
  
  const sorted = [...images];
  switch (option) {
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "date":
      sorted.sort((a, b) => a.lastModified - b.lastModified);
      break;
    case "size":
      sorted.sort((a, b) => a.size - b.size);
      break;
  }
  return sorted;
}

/**
 * Calculates video duration based on number of images and FPS
 */
export function calculateVideoDuration(imageCount: number, fps: number): number {
  return imageCount / fps;
}

/**
 * Creates an ImageFile object from a File
 */
export function createImageFile(file: File): ImageFile {
  const id = Math.random().toString(36).substr(2, 9);
  const url = URL.createObjectURL(file);
  return {
    id,
    file,
    url,
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
  };
}

/**
 * Gets available video codecs with browser support detection
 */
export function getAvailableVideoCodecs(): VideoCodec[] {
  return [
    {
      name: "H.264 (MP4)",
      mimeType: "video/mp4;codecs=h264",
      extension: "mp4",
      supported: MediaRecorder.isTypeSupported("video/mp4;codecs=h264")
    },
    {
      name: "VP9 (WebM)",
      mimeType: "video/webm;codecs=vp9",
      extension: "webm",
      supported: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    },
    {
      name: "VP8 (WebM)",
      mimeType: "video/webm;codecs=vp8",
      extension: "webm",
      supported: MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
    }
  ];
}

/**
 * Gets the first supported video codec
 */
export function getFirstSupportedCodec(): VideoCodec | undefined {
  const codecs = getAvailableVideoCodecs();
  return codecs.find(codec => codec.supported);
}

/**
 * Calculates image scaling to fit canvas while maintaining aspect ratio
 */
export function calculateImageScaling(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number
) {
  const imgAspect = imageWidth / imageHeight;
  const canvasAspect = canvasWidth / canvasHeight;
  
  let drawWidth, drawHeight, drawX, drawY;
  
  if (imgAspect > canvasAspect) {
    // Image is wider than canvas
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / imgAspect;
    drawX = 0;
    drawY = (canvasHeight - drawHeight) / 2;
  } else {
    // Image is taller than canvas
    drawHeight = canvasHeight;
    drawWidth = canvasHeight * imgAspect;
    drawX = (canvasWidth - drawWidth) / 2;
    drawY = 0;
  }
  
  return { drawWidth, drawHeight, drawX, drawY };
} 