import { VideoCodec } from '../types';
import { getAvailableVideoCodecs, getFirstSupportedCodec } from '../lib/imageUtils';

export interface CodecValidationResult {
  isValid: boolean;
  errors: string[];
  recommendedCodec?: VideoCodec;
}

export class CodecService {
  static getAvailableCodecs(): VideoCodec[] {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
      return [];
    }
    return getAvailableVideoCodecs();
  }

  static getFirstSupportedCodec(): VideoCodec | undefined {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
      return undefined;
    }
    return getFirstSupportedCodec();
  }

  static isCodecSupported(mimeType: string): boolean {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
      return false;
    }
    return MediaRecorder.isTypeSupported(mimeType);
  }

  static getDefaultCodec(): string {
    const firstSupported = this.getFirstSupportedCodec();
    return firstSupported?.mimeType || "video/webm;codecs=vp8";
  }

  static getCodecInfo(mimeType: string, codecs: VideoCodec[]): VideoCodec | undefined {
    return codecs.find(codec => codec.mimeType === mimeType);
  }

  static getFallbackCodec(codecs: VideoCodec[]): VideoCodec | undefined {
    return codecs.find(codec => codec.supported);
  }

  static getPreferredH264Codec(codecs: VideoCodec[]): VideoCodec | undefined {
    // Look for any supported H.264 variant
    return codecs.find(codec => 
      codec.supported && 
      (codec.mimeType.includes('h264') || codec.mimeType.includes('avc'))
    );
  }

  static getBestCodec(codecs: VideoCodec[]): VideoCodec | undefined {
    // Priority order: H.264 > VP9 > VP8
    const h264 = this.getPreferredH264Codec(codecs);
    if (h264) return h264;

    const vp9 = codecs.find(codec => codec.supported && codec.mimeType.includes('vp9'));
    if (vp9) return vp9;

    const vp8 = codecs.find(codec => codec.supported && codec.mimeType.includes('vp8'));
    if (vp8) return vp8;

    return this.getFallbackCodec(codecs);
  }

  static validateCodec(mimeType: string, codecs: VideoCodec[]): CodecValidationResult {
    const errors: string[] = [];
    
    if (!mimeType) {
      errors.push("Codec must be selected");
      return {
        isValid: false,
        errors,
        recommendedCodec: this.getBestCodec(codecs)
      };
    }

    const codecInfo = this.getCodecInfo(mimeType, codecs);
    
    if (!codecInfo) {
      errors.push("Selected codec not found");
      return {
        isValid: false,
        errors,
        recommendedCodec: this.getBestCodec(codecs)
      };
    }

    if (!codecInfo.supported) {
      errors.push(`Codec ${codecInfo.name} is not supported in this browser`);
      return {
        isValid: false,
        errors,
        recommendedCodec: this.getBestCodec(codecs)
      };
    }

    return {
      isValid: true,
      errors: []
    };
  }

  static getCodecQuality(mimeType: string): 'high' | 'medium' | 'low' {
    if (mimeType.includes('h264') || mimeType.includes('avc')) {
      return 'high';
    } else if (mimeType.includes('vp9')) {
      return 'high';
    } else if (mimeType.includes('vp8')) {
      return 'medium';
    }
    return 'low';
  }

  static getCodecCompatibility(mimeType: string): {
    chrome: boolean;
    firefox: boolean;
    safari: boolean;
    edge: boolean;
  } {
    const isH264 = mimeType.includes('h264') || mimeType.includes('avc');
    const isVP9 = mimeType.includes('vp9');
    const isVP8 = mimeType.includes('vp8');

    return {
      chrome: isH264 || isVP9 || isVP8,
      firefox: isVP9 || isVP8, // Limited H.264 support in MediaRecorder
      safari: isH264, // Limited WebM support
      edge: isH264 || isVP9 || isVP8
    };
  }

  static getRecommendedCodecForBrowser(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      // Safari prefers H.264
      return "video/mp4;codecs=h264";
    } else if (userAgent.includes('firefox')) {
      // Firefox prefers WebM
      return "video/webm;codecs=vp9";
    } else {
      // Chrome/Edge can handle both well
      return "video/mp4;codecs=h264";
    }
  }

  static getCodecDescription(mimeType: string): string {
    if (mimeType.includes('h264') || mimeType.includes('avc')) {
      return "H.264 (AVC) - High quality, widely compatible, good compression";
    } else if (mimeType.includes('vp9')) {
      return "VP9 - High quality, good compression, modern browsers";
    } else if (mimeType.includes('vp8')) {
      return "VP8 - Good quality, broad compatibility, moderate compression";
    }
    return "Unknown codec";
  }

  static getCodecFileExtension(mimeType: string): string {
    if (mimeType.includes('mp4') || mimeType.includes('h264') || mimeType.includes('avc')) {
      return 'mp4';
    } else if (mimeType.includes('webm')) {
      return 'webm';
    }
    return 'mp4'; // Default fallback
  }
}