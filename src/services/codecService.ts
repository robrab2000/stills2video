import { VideoCodec } from '../types';
import { getAvailableVideoCodecs, getFirstSupportedCodec } from '../lib/imageUtils';

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
}