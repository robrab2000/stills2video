import { useEffect, useState } from 'react';
import { VideoCodec } from '../types';
import { getAvailableVideoCodecs, getFirstSupportedCodec } from '../lib/imageUtils';
import { CodecService } from '../services/codecService';
import { getFFmpegCodecs } from '../lib/ffmpegUtils';

export function useVideoCodecs() {
  const [videoCodecs, setVideoCodecs] = useState<VideoCodec[]>([]);
  const [selectedCodec, setSelectedCodec] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCodecs() {
      try {
        setIsLoading(true);
        
        // Try FFmpeg codecs first
        let codecs: VideoCodec[] = [];
        try {
          console.log("Loading FFmpeg codecs...");
          const ffmpegCodecs = await getFFmpegCodecs();
          codecs = ffmpegCodecs.map(codec => ({
            name: codec.name,
            mimeType: codec.mimeType,
            extension: codec.extension,
            supported: codec.supported
          }));
          console.log("FFmpeg codecs loaded:", codecs);
        } catch (error) {
          console.log("FFmpeg codecs failed, using MediaRecorder fallback:", error);
          // Fallback to MediaRecorder codecs
          codecs = getAvailableVideoCodecs();
        }
        
        setVideoCodecs(codecs);
        
        // Set default codec to best available one
        if (!selectedCodec) {
          const bestCodec = CodecService.getBestCodec(codecs);
          if (bestCodec) {
            setSelectedCodec(bestCodec.mimeType);
            console.log("Selected default codec:", bestCodec.name);
          } else {
            // Fallback to VP8 if no H.264 support
            const fallbackCodec = CodecService.getFallbackCodec(codecs);
            if (fallbackCodec) {
              setSelectedCodec(fallbackCodec.mimeType);
              console.log("Selected fallback codec:", fallbackCodec.name);
            }
          }
        }
      } catch (error) {
        console.error("Error loading codecs:", error);
        // Final fallback
        const fallbackCodecs = getAvailableVideoCodecs();
        setVideoCodecs(fallbackCodecs);
        if (!selectedCodec && fallbackCodecs.length > 0) {
          setSelectedCodec(fallbackCodecs[0].mimeType);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadCodecs();
  }, []); // Remove selectedCodec from dependencies to prevent infinite loop

  const getSelectedCodecInfo = () => {
    return videoCodecs.find(codec => codec.mimeType === selectedCodec);
  };

  const getFallbackCodec = () => {
    return CodecService.getFallbackCodec(videoCodecs);
  };

  const getBestCodec = () => {
    return CodecService.getBestCodec(videoCodecs);
  };

  const getH264Codec = () => {
    return CodecService.getPreferredH264Codec(videoCodecs);
  };

  return {
    videoCodecs,
    selectedCodec,
    setSelectedCodec,
    getSelectedCodecInfo,
    getFallbackCodec,
    getBestCodec,
    getH264Codec,
    isLoading,
  };
}