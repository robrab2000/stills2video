import { useEffect, useState } from 'react';
import { VideoCodec } from '../types';
import { getAvailableVideoCodecs } from '../lib/imageUtils';
import { CodecService } from '../services/codecService';
import { getFFmpegCodecs } from '../lib/ffmpegUtils';

const isDev = process.env.NODE_ENV === 'development';

export function useVideoCodecs() {
  const [videoCodecs, setVideoCodecs] = useState<VideoCodec[]>([]);
  const [selectedCodec, setSelectedCodec] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCodecs() {
      try {
        setIsLoading(true);

        let codecs: VideoCodec[] = [];
        try {
          if (isDev) console.log("Loading FFmpeg codecs...");
          const ffmpegCodecs = await getFFmpegCodecs();
          codecs = ffmpegCodecs.map(codec => ({
            name: codec.name,
            mimeType: codec.mimeType,
            extension: codec.extension,
            supported: codec.supported
          }));
          if (isDev) console.log("FFmpeg codecs loaded:", codecs);
        } catch (error) {
          if (isDev) console.log("FFmpeg codecs failed, using MediaRecorder fallback:", error);
          codecs = getAvailableVideoCodecs();
        }

        setVideoCodecs(codecs);

        if (!selectedCodec) {
          const bestCodec = CodecService.getBestCodec(codecs);
          if (bestCodec) {
            setSelectedCodec(bestCodec.mimeType);
            if (isDev) console.log("Selected default codec:", bestCodec.name);
          } else {
            const fallbackCodec = CodecService.getFallbackCodec(codecs);
            if (fallbackCodec) {
              setSelectedCodec(fallbackCodec.mimeType);
              if (isDev) console.log("Selected fallback codec:", fallbackCodec.name);
            }
          }
        }
      } catch (error) {
        console.error("Error loading codecs:", error);
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
  }, []);

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
