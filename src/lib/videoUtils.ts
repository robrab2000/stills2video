export function calculateFrameDuration(fps: number): number {
  return 1000 / fps;
}

export function estimateVideoSize(
  imageCount: number,
  fps: number,
  width: number,
  height: number
): number {
  // Rough estimation based on video parameters
  const duration = imageCount / fps;
  const bitrate = width * height * fps * 0.1; // Rough bitrate estimation
  return (bitrate * duration) / 8; // Convert to bytes
}

export function validateVideoSettings(fps: number, width: number, height: number): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (fps < 0.1 || fps > 30) {
    errors.push('FPS must be between 0.1 and 30');
  }

  if (width < 480 || width > 3840) {
    errors.push('Video width must be between 480 and 3840');
  }

  if (height < 360 || height > 2160) {
    errors.push('Video height must be between 360 and 2160');
  }

  if (width % 16 !== 0) {
    errors.push('Video width should be divisible by 16 for better compression');
  }

  if (height % 16 !== 0) {
    errors.push('Video height should be divisible by 16 for better compression');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function calculateOptimalVideoDimensions(
  images: { width?: number; height?: number }[]
): { width: number; height: number } {
  if (images.length === 0) {
    return { width: 1920, height: 1080 };
  }

  // Find the most common aspect ratio
  const aspectRatios = images
    .filter(img => img.width && img.height)
    .map(img => img.width! / img.height!);

  if (aspectRatios.length === 0) {
    return { width: 1920, height: 1080 };
  }

  const avgAspectRatio = aspectRatios.reduce((sum, ratio) => sum + ratio, 0) / aspectRatios.length;

  // Choose standard resolution based on aspect ratio
  if (avgAspectRatio > 1.7) {
    return { width: 1920, height: 1080 }; // 16:9
  } else if (avgAspectRatio > 1.3) {
    return { width: 1440, height: 1080 }; // 4:3
  } else {
    return { width: 1080, height: 1080 }; // 1:1
  }
}