import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { ImageFile, VideoPreview, VideoSettings } from '../types';
import { calculateImageScaling } from '../lib/imageUtils';

export function useVideoGenerator(
  onVideoGenerated: (video: VideoPreview) => void,
  onProgressChange: (progress: number) => void,
  onGeneratingChange: (isGenerating: boolean) => void
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const createVideoThumbnail = useCallback(async (videoBlob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.muted = true;
      video.crossOrigin = 'anonymous';
      
      video.onloadeddata = () => {
        video.currentTime = 0;
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 80;
        const ctx = canvas.getContext('2d')!;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnailUrl);
        
        URL.revokeObjectURL(video.src);
      };
      
      video.onerror = () => {
        resolve('');
        URL.revokeObjectURL(video.src);
      };
      
      video.src = URL.createObjectURL(videoBlob);
    });
  }, []);

  const generateVideo = useCallback(async (
    images: ImageFile[],
    settings: VideoSettings,
    selectedCodec: string,
    videoCodecs: any[]
  ) => {
    if (images.length === 0) {
      toast.error("Please add some images first");
      return;
    }

    onGeneratingChange(true);
    onProgressChange(0);
    
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    
    canvas.width = settings.videoWidth;
    canvas.height = settings.videoHeight;

    try {
      const stream = canvas.captureStream(30);
      
      let mimeType = selectedCodec;
      if (!mimeType || !MediaRecorder.isTypeSupported(mimeType)) {
        const fallbackCodec = videoCodecs.find((codec: any) => codec.supported);
        mimeType = fallbackCodec?.mimeType || "video/webm;codecs=vp8";
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const selectedCodecInfo = videoCodecs.find((codec: any) => codec.mimeType === mimeType);
        const extension = selectedCodecInfo?.extension || (mimeType.includes("mp4") ? "mp4" : "webm");
        const videoId = Math.random().toString(36).substr(2, 9);
        const timestamp = Date.now();
        const videoName = `images-video-${timestamp}.${extension}`;
        
        const thumbnailUrl = await createVideoThumbnail(blob);
        
        const newVideo: VideoPreview = {
          url,
          blob,
          extension,
          id: videoId,
          timestamp,
          name: videoName,
          thumbnailUrl
        };
        
        onVideoGenerated(newVideo);
        onGeneratingChange(false);
        onProgressChange(100);
        toast.success("Video generated successfully! Preview available.");
      };

      mediaRecorder.start();

      const frameDuration = 1000 / settings.fps;

      for (let i = 0; i < images.length; i++) {
        const img = new window.Image();
        await new Promise<void>((resolve) => {
          img.onload = () => {
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const scaling = calculateImageScaling(
              img.width,
              img.height,
              canvas.width,
              canvas.height
            );
            
            ctx.drawImage(
              img, 
              scaling.drawX, 
              scaling.drawY, 
              scaling.drawWidth, 
              scaling.drawHeight
            );
            resolve();
          };
          img.src = images[i].url;
        });

        const progress = ((i + 1) / images.length) * 100;
        onProgressChange(progress);

        await new Promise(resolve => setTimeout(resolve, frameDuration));
      }

      setTimeout(() => {
        mediaRecorder.stop();
      }, 100);

    } catch (error) {
      console.error("Error generating video:", error);
      toast.error("Failed to generate video");
      onGeneratingChange(false);
      onProgressChange(0);
    }
  }, [createVideoThumbnail, onVideoGenerated, onProgressChange, onGeneratingChange]);

  return {
    generateVideo,
    canvasRef,
  };
}