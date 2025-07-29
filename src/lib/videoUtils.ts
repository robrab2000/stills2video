import { VideoSettings } from '../types';

/**
 * Calculates frame duration in milliseconds
 */
export function calculateFrameDuration(fps: number): number {
  return 1000 / fps;
}

/**
 * Estimates video file size based on parameters
 */
export function estimateVideoSize(
  imageCount: number,
  fps: number,
  width: number,
  height: number,
  codec: string = 'h264'
): number {
  const duration = imageCount / fps;
  const pixelsPerFrame = width * height;
  
  // Bitrate estimation based on codec and quality
  let bitsPerPixel: number;
  switch (codec.toLowerCase()) {
    case 'h264':
    case 'avc':
      bitsPerPixel = 0.1; // H.264 is efficient
      break;
    case 'vp9':
      bitsPerPixel = 0.08; // VP9 is very efficient
      break;
    case 'vp8':
      bitsPerPixel = 0.15; // VP8 is less efficient
      break;
    default:
      bitsPerPixel = 0.12; // Default
  }
  
  const bitrate = pixelsPerFrame * bitsPerPixel * fps;
  const sizeInBits = bitrate * duration;
  
  return sizeInBits / 8; // Convert to bytes
}

/**
 * Calculates video duration from frame count and FPS
 */
export function calculateVideoDuration(imageCount: number, fps: number): number {
  return imageCount / fps;
}

/**
 * Formats duration in seconds to human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Estimates processing time based on image count and complexity
 */
export function estimateProcessingTime(
  imageCount: number,
  width: number,
  height: number,
  fps: number,
  codec: string
): number {
  // Base processing time per frame (in seconds)
  let baseTimePerFrame = 0.05;
  
  // Adjust for resolution
  const pixels = width * height;
  if (pixels > 1920 * 1080) {
    baseTimePerFrame *= 1.5; // High resolution
  } else if (pixels < 640 * 480) {
    baseTimePerFrame *= 0.7; // Low resolution
  }
  
  // Adjust for codec complexity
  switch (codec.toLowerCase()) {
    case 'h264':
      baseTimePerFrame *= 1.2; // H.264 is more complex
      break;
    case 'vp9':
      baseTimePerFrame *= 1.5; // VP9 is most complex
      break;
    case 'vp8':
      baseTimePerFrame *= 1.0; // VP8 is simpler
      break;
  }
  
  // Adjust for FPS
  if (fps > 30) {
    baseTimePerFrame *= 1.3; // High FPS takes longer
  } else if (fps < 15) {
    baseTimePerFrame *= 0.8; // Low FPS is faster
  }
  
  return imageCount * baseTimePerFrame;
}

/**
 * Validates video settings for optimal performance
 */
export function validateVideoSettings(settings: VideoSettings): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // FPS validation
  if (settings.fps < 1) {
    errors.push('FPS must be at least 1');
  } else if (settings.fps < 10) {
    warnings.push('Low FPS may result in choppy video');
    recommendations.push('Consider using 15-30 FPS for smooth playback');
  } else if (settings.fps > 60) {
    warnings.push('Very high FPS may cause performance issues');
    recommendations.push('Consider using 24-30 FPS for optimal balance');
  }

  // Resolution validation
  const pixels = settings.videoWidth * settings.videoHeight;
  if (pixels > 3840 * 2160) {
    errors.push('Resolution too high (max 4K supported)');
  } else if (pixels > 1920 * 1080) {
    warnings.push('High resolution may slow down processing');
    recommendations.push('Consider 1080p for faster processing');
  } else if (pixels < 640 * 480) {
    warnings.push('Low resolution may result in poor quality');
    recommendations.push('Consider at least 720p for good quality');
  }

  // Aspect ratio validation
  const aspectRatio = settings.videoWidth / settings.videoHeight;
  if (aspectRatio < 0.5 || aspectRatio > 3) {
    warnings.push('Unusual aspect ratio detected');
    recommendations.push('Consider 16:9 or 4:3 for better compatibility');
  }

  // Codec validation
  if (!settings.selectedCodec) {
    errors.push('No codec selected');
  } else if (!settings.selectedCodec.includes('h264') && !settings.selectedCodec.includes('vp')) {
    warnings.push('Unsupported codec selected');
    recommendations.push('Use H.264 or VP8/VP9 for best compatibility');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendations
  };
}

/**
 * Gets optimal settings based on image collection
 */
export function getOptimalSettings(
  imageCount: number,
  avgImageWidth: number,
  avgImageHeight: number
): Partial<VideoSettings> {
  const recommendations: Partial<VideoSettings> = {};

  // Optimal FPS based on image count
  if (imageCount < 30) {
    recommendations.fps = 15; // Few images = lower FPS
  } else if (imageCount < 100) {
    recommendations.fps = 24; // Medium sequence = standard FPS
  } else {
    recommendations.fps = 30; // Many images = higher FPS
  }

  // Optimal resolution based on image dimensions
  const avgPixels = avgImageWidth * avgImageHeight;
  if (avgPixels > 1920 * 1080) {
    recommendations.videoWidth = 1920;
    recommendations.videoHeight = 1080;
  } else if (avgPixels > 1280 * 720) {
    recommendations.videoWidth = 1280;
    recommendations.videoHeight = 720;
  } else {
    recommendations.videoWidth = Math.min(avgImageWidth, 1280);
    recommendations.videoHeight = Math.min(avgImageHeight, 720);
  }

  // Round to nearest 16 for better encoding
  recommendations.videoWidth = Math.round(recommendations.videoWidth! / 16) * 16;
  recommendations.videoHeight = Math.round(recommendations.videoHeight! / 16) * 16;

  return recommendations;
}

/**
 * Calculates video bitrate for different quality levels
 */
export function calculateBitrate(
  width: number,
  height: number,
  fps: number,
  quality: 'low' | 'medium' | 'high' = 'medium'
): number {
  const pixels = width * height;
  let bitsPerPixel: number;

  switch (quality) {
    case 'low':
      bitsPerPixel = 0.05;
      break;
    case 'medium':
      bitsPerPixel = 0.1;
      break;
    case 'high':
      bitsPerPixel = 0.2;
      break;
  }

  return pixels * bitsPerPixel * fps;
}

/**
 * Formats bitrate for display
 */
export function formatBitrate(bitrate: number): string {
  if (bitrate < 1000) {
    return `${bitrate.toFixed(0)} bps`;
  } else if (bitrate < 1000000) {
    return `${(bitrate / 1000).toFixed(1)} Kbps`;
  } else {
    return `${(bitrate / 1000000).toFixed(1)} Mbps`;
  }
}

/**
 * Gets video quality score based on settings
 */
export function getVideoQualityScore(settings: VideoSettings): {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high';
  factors: string[];
} {
  let score = 50; // Base score
  const factors: string[] = [];

  // Resolution factor
  const pixels = settings.videoWidth * settings.videoHeight;
  if (pixels >= 1920 * 1080) {
    score += 25;
    factors.push('High resolution (1080p+)');
  } else if (pixels >= 1280 * 720) {
    score += 15;
    factors.push('Medium resolution (720p+)');
  } else {
    score -= 10;
    factors.push('Low resolution');
  }

  // FPS factor
  if (settings.fps >= 30) {
    score += 15;
    factors.push('High frame rate (30+ FPS)');
  } else if (settings.fps >= 24) {
    score += 10;
    factors.push('Standard frame rate (24 FPS)');
  } else if (settings.fps >= 15) {
    score += 5;
    factors.push('Low frame rate (15 FPS)');
  } else {
    score -= 15;
    factors.push('Very low frame rate');
  }

  // Codec factor
  if (settings.selectedCodec.includes('h264')) {
    score += 10;
    factors.push('H.264 codec (excellent compatibility)');
  } else if (settings.selectedCodec.includes('vp9')) {
    score += 15;
    factors.push('VP9 codec (high quality)');
  } else if (settings.selectedCodec.includes('vp8')) {
    score += 5;
    factors.push('VP8 codec (good compatibility)');
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine level
  let level: 'low' | 'medium' | 'high';
  if (score >= 80) {
    level = 'high';
  } else if (score >= 50) {
    level = 'medium';
  } else {
    level = 'low';
  }

  return { score, level, factors };
}