import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface FFmpegCodec {
  name: string;
  mimeType: string;
  extension: string;
  supported: boolean;
}

export class FFmpegManager {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private isLoading = false;

  async load(): Promise<void> {
    if (this.isLoaded) return;
    if (this.isLoading) {
      // Wait for current loading to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isLoading = true;

    try {
      this.ffmpeg = new FFmpeg();
      
      // Load FFmpeg core
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.isLoaded = true;
      console.log('FFmpeg loaded successfully');
    } catch (error) {
      console.error('FFmpeg loading failed:', error);
      this.ffmpeg = null;
      this.isLoaded = false;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async isReady(): Promise<boolean> {
    if (!this.ffmpeg) {
      try {
        await this.load();
      } catch (error) {
        return false;
      }
    }
    return this.isLoaded;
  }

  async generateVideoFromImages(
    imageFiles: File[],
    settings: {
      fps: number;
      width: number;
      height: number;
      codec: string;
    }
  ): Promise<Blob> {
    if (!this.ffmpeg || !this.isLoaded) {
      await this.load();
    }

    if (!this.ffmpeg) {
      throw new Error('FFmpeg not loaded');
    }

    try {
      // Write image files to FFmpeg
      for (let i = 0; i < imageFiles.length; i++) {
        const imageData = await fetchFile(imageFiles[i]);
        await this.ffmpeg.writeFile(`image_${i.toString().padStart(4, '0')}.jpg`, imageData);
      }

      // Create input file list
      const inputList = imageFiles.map((_, i) => 
        `file 'image_${i.toString().padStart(4, '0')}.jpg'`
      ).join('\n');
      await this.ffmpeg.writeFile('input.txt', inputList);

      // Determine output format and codec
      const isH264 = settings.codec.includes('h264') || settings.codec.includes('avc');
      const outputFormat = isH264 ? 'mp4' : 'webm';
      const codec = isH264 ? 'libx264' : (settings.codec.includes('vp9') ? 'libvpx-vp9' : 'libvpx');

      // Build FFmpeg command
      const command = [
        '-f', 'concat',
        '-safe', '0',
        '-i', 'input.txt',
        '-c:v', codec,
        '-pix_fmt', 'yuv420p',
        '-r', settings.fps.toString(),
        '-s', `${settings.width}x${settings.height}`,
        '-y', // Overwrite output
        `output.${outputFormat}`
      ];

      console.log('FFmpeg command:', command.join(' '));

      // Execute FFmpeg command
      await this.ffmpeg.exec(command);

      // Read the output file
      const data = await this.ffmpeg.readFile(`output.${outputFormat}`);
      
      // Clean up files
      for (let i = 0; i < imageFiles.length; i++) {
        try {
          await this.ffmpeg.deleteFile(`image_${i.toString().padStart(4, '0')}.jpg`);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      try {
        await this.ffmpeg.deleteFile('input.txt');
        await this.ffmpeg.deleteFile(`output.${outputFormat}`);
      } catch (e) {
        // Ignore cleanup errors
      }

      return new Blob([data], { type: `video/${outputFormat}` });
    } catch (error) {
      console.error('FFmpeg error:', error);
      throw new Error(`FFmpeg processing failed: ${error}`);
    }
  }

  async getSupportedCodecs(): Promise<FFmpegCodec[]> {
    if (!this.ffmpeg || !this.isLoaded) {
      try {
        await this.load();
      } catch (error) {
        console.log('FFmpeg failed to load, returning default codecs');
        return this.getDefaultCodecs();
      }
    }

    if (!this.ffmpeg) {
      return this.getDefaultCodecs();
    }

    try {
      // Use a simpler approach - just return the codecs we know FFmpeg supports
      // instead of trying to query the encoders list which can cause FS errors
      return [
        {
          name: "H.264 (MP4)",
          mimeType: "video/mp4;codecs=h264",
          extension: "mp4",
          supported: true
        },
        {
          name: "VP9 (WebM)",
          mimeType: "video/webm;codecs=vp9",
          extension: "webm",
          supported: true
        },
        {
          name: "VP8 (WebM)",
          mimeType: "video/webm;codecs=vp8",
          extension: "webm",
          supported: true
        }
      ];
    } catch (error) {
      console.error('Error getting codecs:', error);
      return this.getDefaultCodecs();
    }
  }

  private getDefaultCodecs(): FFmpegCodec[] {
    return [
      {
        name: "H.264 (MP4)",
        mimeType: "video/mp4;codecs=h264",
        extension: "mp4",
        supported: true
      },
      {
        name: "VP9 (WebM)",
        mimeType: "video/webm;codecs=vp9",
        extension: "webm",
        supported: true
      },
      {
        name: "VP8 (WebM)",
        mimeType: "video/webm;codecs=vp8",
        extension: "webm",
        supported: true
      }
    ];
  }

  async createThumbnail(videoBlob: Blob): Promise<string> {
    if (!this.ffmpeg || !this.isLoaded) {
      try {
        await this.load();
      } catch (error) {
        console.error('FFmpeg failed to load for thumbnail creation:', error);
        return '';
      }
    }

    if (!this.ffmpeg) {
      return '';
    }

    try {
      const videoData = await fetchFile(videoBlob);
      await this.ffmpeg.writeFile('input_video.mp4', videoData);

      // Extract first frame
      await this.ffmpeg.exec([
        '-i', 'input_video.mp4',
        '-vframes', '1',
        '-f', 'image2',
        '-y',
        'thumbnail.jpg'
      ]);

      const thumbnailData = await this.ffmpeg.readFile('thumbnail.jpg');
      
      // Clean up
      try {
        await this.ffmpeg.deleteFile('input_video.mp4');
        await this.ffmpeg.deleteFile('thumbnail.jpg');
      } catch (e) {
        // Ignore cleanup errors
      }

      const thumbnailBlob = new Blob([thumbnailData], { type: 'image/jpeg' });
      return URL.createObjectURL(thumbnailBlob);
    } catch (error) {
      console.error('Thumbnail creation error:', error);
      return '';
    }
  }
}

// Create singleton instance
export const ffmpegManager = new FFmpegManager();

// Export utility functions
export async function getFFmpegCodecs(): Promise<FFmpegCodec[]> {
  return await ffmpegManager.getSupportedCodecs();
}

export async function generateVideoWithFFmpeg(
  imageFiles: File[],
  settings: {
    fps: number;
    width: number;
    height: number;
    codec: string;
  }
): Promise<Blob> {
  return await ffmpegManager.generateVideoFromImages(imageFiles, settings);
}