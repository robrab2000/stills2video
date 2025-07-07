import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import logo_img from '/assets/logo.png';

interface ImageFile {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  lastModified: number;
}

type SortOption = "manual" | "name" | "date" | "size";

interface VideoCodec {
  name: string;
  mimeType: string;
  extension: string;
  supported: boolean;
}

export function ImageToVideoConverter() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>("manual");
  const [isGenerating, setIsGenerating] = useState(false);
  const [fps, setFps] = useState(25); // frames per second
  const [videoWidth, setVideoWidth] = useState(1920);
  const [videoHeight, setVideoHeight] = useState(1080);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectedCodec, setSelectedCodec] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Available video codecs with browser support detection
  const videoCodecs: VideoCodec[] = [
    {
      name: "H.264 (MP4)",
      mimeType: "video/mp4;codecs=h264",
      extension: "mp4",
      supported: MediaRecorder.isTypeSupported("video/mp4;codecs=h264")
    },
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

  // Set default codec to first supported one
  useEffect(() => {
    if (!selectedCodec) {
      const firstSupported = videoCodecs.find(codec => codec.supported);
      if (firstSupported) {
        setSelectedCodec(firstSupported.mimeType);
      }
    }
  }, [selectedCodec]);

  const handleFileSelect = useCallback((files: FileList) => {
    const newImages: ImageFile[] = [];
    
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const id = Math.random().toString(36).substr(2, 9);
        const url = URL.createObjectURL(file);
        newImages.push({
          id,
          file,
          url,
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
        });
      }
    });

    setImages(prev => [...prev, ...newImages]);
    toast.success(`Added ${newImages.length} images`);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== id);
      // Revoke object URL to prevent memory leaks
      const removed = prev.find(img => img.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.url);
      }
      return updated;
    });
  }, []);

  const sortImages = useCallback((option: SortOption) => {
    if (option === "manual") return;
    
    setImages(prev => {
      const sorted = [...prev];
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
    });
  }, []);

  useEffect(() => {
    sortImages(sortOption);
  }, [sortOption, sortImages]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOverItem = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setImages(prev => {
      const newImages = [...prev];
      const draggedItem = newImages[draggedIndex];
      newImages.splice(draggedIndex, 1);
      newImages.splice(index, 0, draggedItem);
      return newImages;
    });
    setDraggedIndex(index);
  };

  const generateVideo = async () => {
    if (images.length === 0) {
      toast.error("Please add some images first");
      return;
    }

    setIsGenerating(true);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    try {
      const stream = canvas.captureStream(30); // High capture rate for smooth recording
      
      // Use selected codec or fallback to first supported one
      let mimeType = selectedCodec;
      if (!mimeType || !MediaRecorder.isTypeSupported(mimeType)) {
        const fallbackCodec = videoCodecs.find(codec => codec.supported);
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

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const selectedCodecInfo = videoCodecs.find(codec => codec.mimeType === mimeType);
        const extension = selectedCodecInfo?.extension || (mimeType.includes("mp4") ? "mp4" : "webm");
        a.download = `images-video-${Date.now()}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
        setIsGenerating(false);
        toast.success("Video generated successfully!");
      };

      mediaRecorder.start();

      // Calculate frame duration from FPS
      const frameDuration = 1000 / fps; // milliseconds per frame

      // Draw each image for the calculated duration
      for (let i = 0; i < images.length; i++) {
        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => {
            // Clear canvas
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Calculate scaling to fit image while maintaining aspect ratio
            const imgAspect = img.width / img.height;
            const canvasAspect = canvas.width / canvas.height;
            
            let drawWidth, drawHeight, drawX, drawY;
            
            if (imgAspect > canvasAspect) {
              // Image is wider than canvas
              drawWidth = canvas.width;
              drawHeight = canvas.width / imgAspect;
              drawX = 0;
              drawY = (canvas.height - drawHeight) / 2;
            } else {
              // Image is taller than canvas
              drawHeight = canvas.height;
              drawWidth = canvas.height * imgAspect;
              drawX = (canvas.width - drawWidth) / 2;
              drawY = 0;
            }
            
            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
            resolve();
          };
          img.src = images[i].url;
        });

        // Wait for the frame duration
        await new Promise(resolve => setTimeout(resolve, frameDuration));
      }

      // Stop recording after all frames
      setTimeout(() => {
        mediaRecorder.stop();
      }, 100);

    } catch (error) {
      console.error("Error generating video:", error);
      toast.error("Failed to generate video");
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="main-logo">
        <img
          src={logo_img}
          alt="Stills-2-Video Logo"
          className="mx-auto h-32 w-auto mb-4"
        />
        </div>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Simple Image Sequence to Video Converter</h1>
        <p className="text-gray-600">Drop images, arrange them, and export as video</p>
      </div>

      {/* Upload Area */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="space-y-4">
          <div className="text-4xl">📁</div>
          <div>
            <p className="text-lg font-medium text-gray-900">Drop images here</p>
            <p className="text-gray-500">or click to browse</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          />
        </div>
      </div>

      {/* Controls */}
      {images.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order
              </label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="manual">Manual (drag to reorder)</option>
                <option value="name">Alphabetical</option>
                <option value="date">Date Modified</option>
                <option value="size">File Size</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video Codec
              </label>
              <select
                value={selectedCodec}
                onChange={(e) => setSelectedCodec(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {videoCodecs.map((codec) => (
                  <option
                    key={codec.mimeType}
                    value={codec.mimeType}
                    disabled={!codec.supported}
                    className={!codec.supported ? "text-gray-400" : ""}
                  >
                    {codec.name} {!codec.supported ? "(Not Supported)" : ""}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frames Per Second (FPS)
              </label>
              <input
                type="number"
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                min="0.1"
                max="30"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video Width
              </label>
              <input
                type="number"
                value={videoWidth}
                onChange={(e) => setVideoWidth(Number(e.target.value))}
                min="480"
                max="3840"
                step="16"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video Height
              </label>
              <input
                type="number"
                value={videoHeight}
                onChange={(e) => setVideoHeight(Number(e.target.value))}
                min="360"
                max="2160"
                step="16"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {images.length} images • Video duration: ~{(images.length / fps).toFixed(1)}s at {fps} FPS
            </div>
            <button
              onClick={generateVideo}
              disabled={isGenerating || images.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? "Generating..." : "Generate Video"}
            </button>
          </div>
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Images ({images.length})</h3>
            <button
              onClick={() => {
                images.forEach(img => URL.revokeObjectURL(img.url));
                setImages([]);
              }}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              Clear All
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                draggable={sortOption === "manual"}
                onDragStart={() => handleDragStart(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOverItem(e, index)}
                className={`relative group border-2 rounded-lg overflow-hidden ${
                  sortOption === "manual" ? "cursor-move" : ""
                } ${draggedIndex === index ? "opacity-50" : ""} hover:border-blue-300 transition-colors`}
              >
                <div className="aspect-square">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                  {index + 1}
                </div>
                
                <button
                  onClick={() => removeImage(image.id)}
                  className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                >
                  ×
                </button>
                
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2">
                  <div className="truncate">{image.name}</div>
                  <div>{(image.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden canvas for video generation */}
      <canvas
        ref={canvasRef}
        className="hidden"
        width={videoWidth}
        height={videoHeight}
      />
    </div>
  );
}
