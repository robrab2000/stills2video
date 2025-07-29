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

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface OptimalDimensions {
  width: number;
  height: number;
  aspectRatio: number;
  isOptimal: boolean;
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

// ===== NEW UTILITY FUNCTIONS FOR PHASE 4 =====

/**
 * Calculates optimal video dimensions based on image sizes
 */
export function calculateOptimalVideoDimensions(images: ImageFile[]): OptimalDimensions {
  if (images.length === 0) {
    return {
      width: 1920,
      height: 1080,
      aspectRatio: 16 / 9,
      isOptimal: true
    };
  }

  // Calculate average dimensions
  let totalWidth = 0;
  let totalHeight = 0;
  let validImages = 0;

  images.forEach(img => {
    if (img.width && img.height) {
      totalWidth += img.width;
      totalHeight += img.height;
      validImages++;
    }
  });

  if (validImages === 0) {
    return {
      width: 1920,
      height: 1080,
      aspectRatio: 16 / 9,
      isOptimal: false
    };
  }

  const avgWidth = totalWidth / validImages;
  const avgHeight = totalHeight / validImages;
  const aspectRatio = avgWidth / avgHeight;

  // Round to nearest 16 for better encoding
  const optimalWidth = Math.round(avgWidth / 16) * 16;
  const optimalHeight = Math.round(avgHeight / 16) * 16;

  // Constrain to reasonable limits
  const width = Math.max(480, Math.min(3840, optimalWidth));
  const height = Math.max(360, Math.min(2160, optimalHeight));

  return {
    width,
    height,
    aspectRatio,
    isOptimal: width === optimalWidth && height === optimalHeight
  };
}

/**
 * Validates video settings
 */
export function validateVideoSettings(settings: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate FPS
  if (typeof settings.fps !== 'number' || settings.fps < 0.1 || settings.fps > 60) {
    errors.push('FPS must be between 0.1 and 60');
  } else if (settings.fps < 1) {
    warnings.push('Very low FPS may result in choppy video');
  } else if (settings.fps > 30) {
    warnings.push('High FPS may result in large file sizes');
  }

  // Validate dimensions
  if (typeof settings.videoWidth !== 'number' || settings.videoWidth < 480 || settings.videoWidth > 3840) {
    errors.push('Video width must be between 480 and 3840 pixels');
  }

  if (typeof settings.videoHeight !== 'number' || settings.videoHeight < 360 || settings.videoHeight > 2160) {
    errors.push('Video height must be between 360 and 2160 pixels');
  }

  // Validate aspect ratio
  if (settings.videoWidth && settings.videoHeight) {
    const aspectRatio = settings.videoWidth / settings.videoHeight;
    if (aspectRatio < 0.5 || aspectRatio > 3) {
      warnings.push('Unusual aspect ratio may affect video quality');
    }
  }

  // Validate codec
  if (!settings.selectedCodec || typeof settings.selectedCodec !== 'string') {
    errors.push('Video codec must be selected');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Analyzes image collection for optimal settings
 */
export function analyzeImageCollection(images: ImageFile[]): {
  totalSize: number;
  averageSize: number;
  sizeRange: { min: number; max: number };
  dimensions: { width: number; height: number; aspectRatio: number };
  recommendations: string[];
} {
  if (images.length === 0) {
    return {
      totalSize: 0,
      averageSize: 0,
      sizeRange: { min: 0, max: 0 },
      dimensions: { width: 1920, height: 1080, aspectRatio: 16 / 9 },
      recommendations: ['Add images to get recommendations']
    };
  }

  const sizes = images.map(img => img.size);
  const totalSize = sizes.reduce((sum, size) => sum + size, 0);
  const averageSize = totalSize / images.length;
  const sizeRange = {
    min: Math.min(...sizes),
    max: Math.max(...sizes)
  };

  const dimensions = calculateOptimalVideoDimensions(images);
  const recommendations: string[] = [];

  // Size-based recommendations
  if (averageSize > 5 * 1024 * 1024) { // 5MB
    recommendations.push('Large images detected - consider resizing for faster processing');
  }

  if (sizeRange.max - sizeRange.min > 2 * 1024 * 1024) { // 2MB difference
    recommendations.push('Mixed image sizes detected - consider standardizing for consistent quality');
  }

  // Dimension-based recommendations
  if (!dimensions.isOptimal) {
    recommendations.push('Images have varying dimensions - consider cropping for consistent aspect ratio');
  }

  if (dimensions.aspectRatio < 1) {
    recommendations.push('Portrait orientation detected - consider landscape for better video viewing');
  }

  // Performance recommendations
  if (images.length > 100) {
    recommendations.push('Large image sequence detected - processing may take longer');
  }

  return {
    totalSize,
    averageSize,
    sizeRange,
    dimensions,
    recommendations
  };
}

/**
 * Gets image metadata including dimensions
 */
export function getImageMetadata(file: File): Promise<{ width: number; height: number; type: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        type: file.type
      });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image metadata'));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Creates ImageFile with metadata
 */
export async function createImageFileWithMetadata(file: File): Promise<ImageFile> {
  const metadata = await getImageMetadata(file);
  const imageFile = createImageFile(file);
  
  return {
    ...imageFile,
    width: metadata.width,
    height: metadata.height
  };
} 