export interface ImageFile {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  lastModified: number;
  width?: number;
  height?: number;
  type: string;
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
    type: file.type,
  };
}

/**
 * Gets available video codecs with browser support detection
 */
export function getAvailableVideoCodecs(): VideoCodec[] {
  // Check for MediaRecorder support first
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return [];
  }

  // Get user agent for browser-specific detection
  const userAgent = navigator.userAgent.toLowerCase();
  const isChrome = userAgent.includes('chrome') && !userAgent.includes('edge');
  const isFirefox = userAgent.includes('firefox');
  const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
  const isEdge = userAgent.includes('edge');

  console.log("Browser detection:", { isChrome, isFirefox, isSafari, isEdge });

  const codecs: VideoCodec[] = [
    // H.264 variants - try different MIME types
    {
      name: "H.264 (MP4)",
      mimeType: "video/mp4;codecs=h264",
      extension: "mp4",
      supported: MediaRecorder.isTypeSupported("video/mp4;codecs=h264")
    },
    {
      name: "H.264 (AVC)",
      mimeType: "video/mp4;codecs=avc1.42E01E",
      extension: "mp4",
      supported: MediaRecorder.isTypeSupported("video/mp4;codecs=avc1.42E01E")
    },
    {
      name: "H.264 (AVC1)",
      mimeType: "video/mp4;codecs=avc1",
      extension: "mp4",
      supported: MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")
    },
    // WebM variants
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

  console.log("Available codecs:", codecs.map(c => ({ name: c.name, supported: c.supported })));
  return codecs;
}

/**
 * Gets the first supported codec, prioritizing H.264
 */
export function getFirstSupportedCodec(): VideoCodec | undefined {
  const codecs = getAvailableVideoCodecs();
  
  // Prioritize H.264 variants
  const h264Codec = codecs.find(c => 
    c.supported && c.mimeType.includes('h264') || c.mimeType.includes('avc')
  );
  if (h264Codec) return h264Codec;
  
  // Fallback to any supported codec
  return codecs.find(c => c.supported);
}

/**
 * Calculates image scaling to fit within canvas dimensions
 */
export function calculateImageScaling(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number
) {
  const scaleX = canvasWidth / imageWidth;
  const scaleY = canvasHeight / imageHeight;
  const scale = Math.min(scaleX, scaleY);
  
  return {
    scale,
    scaledWidth: imageWidth * scale,
    scaledHeight: imageHeight * scale,
    offsetX: (canvasWidth - imageWidth * scale) / 2,
    offsetY: (canvasHeight - imageHeight * scale) / 2
  };
} 