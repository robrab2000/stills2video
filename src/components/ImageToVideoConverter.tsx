"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { useApp, useImages, useVideos, useSettings, useUI } from "../contexts/AppContext";
import { useImageManager } from "../hooks/useImageManager";
import { useVideoCodecs } from "../hooks/useVideoCodecs";
import { useVideoGenerator } from "../hooks/useVideoGenerator";
import { VideoService } from "../services/videoService";
import { FileService } from "../services/fileService";
import { CodecService } from "../services/codecService";
import { UploadZone } from "./ui/UploadZone";
import { ImageGrid } from "./ui/ImageGrid";
import { VirtualImageGrid } from "./ui/VirtualImageGrid";
import { VideoSettings } from "./ui/VideoSettings";
import { LazyVideoPreview } from "./ui/LazyVideoPreview";
import { GeneratedVideosList } from "./ui/GeneratedVideosList";
import { SortOption } from "../types";
import { shouldEnableFFmpegMultithreading, isMultithreadingAvailable } from '../lib/ffmpegUtils';

export function ImageToVideoConverter() {
  const [state, dispatch] = useApp();
  const [sortOption, setSortOption] = useState<SortOption>("manual");
  const [multithreadingStatus, setMultithreadingStatus] = useState<{
    enabled: boolean;
    available: boolean;
    active: boolean;
  }>({
    enabled: false,
    available: false,
    active: false
  });

  // Use the new state slice hooks
  const { images, addImages, removeImage, clearAllImages, reorderImages } = useImages();
  const { videos, addVideo, removeVideo, clearAllVideos } = useVideos();
  const { settings, updateSettings } = useSettings();
  const { ui, setUIState } = useUI();

  // Initialize video codecs
  const { videoCodecs, selectedCodec, setSelectedCodec } = useVideoCodecs();

  // Update codecs in global state
  useEffect(() => {
    if (videoCodecs.length > 0) {
      dispatch({ type: 'SET_VIDEO_CODECS', payload: videoCodecs });
    }
  }, [videoCodecs, dispatch]);

  // Check multithreading status
  useEffect(() => {
    const checkMultithreadingStatus = () => {
      const enabled = shouldEnableFFmpegMultithreading();
      const available = isMultithreadingAvailable();
      
      setMultithreadingStatus({
        enabled,
        available,
        active: enabled && available
      });
    };

    const initializeWorker = async () => {
      try {
        // Pre-initialize the FFmpeg worker to ensure it's ready when needed
        const { ffmpegWorkerManager } = await import('../lib/ffmpegWorkerManager');
        await ffmpegWorkerManager.initialize();
        console.log('🔧 FFmpeg worker pre-initialized');
      } catch (error) {
        console.warn('⚠️ Failed to pre-initialize FFmpeg worker:', error);
        // Worker failed to initialize, will fall back to main thread
      }
    };

    checkMultithreadingStatus();
    
    // Initialize worker and check status again
    initializeWorker().then(() => {
      // Check status again after initialization
      setTimeout(checkMultithreadingStatus, 1000);
    }).catch(() => {
      // Worker failed, check status anyway
      setTimeout(checkMultithreadingStatus, 1000);
    });
    
    // Check again after a delay to allow FFmpeg to load
    const timer = setTimeout(checkMultithreadingStatus, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Image management - updated to work with the new state system
  const imageManager = useImageManager(
    images,
    sortOption,
    setSortOption
  );

  // Video generation
  const videoGenerator = useVideoGenerator(
    (video) => {
      addVideo(video);
      setUIState({ videoPreview: video, showPreview: true });
    },
    (progress) => setUIState({ generationProgress: progress }),
    (isGenerating) => setUIState({ isGenerating })
  );

  // Memoize expensive calculations
  const shouldUseVirtualGrid = useMemo(() => {
    return images.length > 50; // Use virtual scrolling for large image collections
  }, [images.length]);

  // Memoize event handlers
  const handleGenerateVideo = useCallback(async () => {
    if (images.length === 0) {
      toast.error("Please add some images first");
      return;
    }

    try {
      // Log multithreading status before generation
      console.log('🎬 Starting video generation with multithreading:', {
        enabled: multithreadingStatus.enabled,
        available: multithreadingStatus.available,
        active: multithreadingStatus.active
      });

      // Set generating state to true and reset progress
      setUIState({ isGenerating: true, generationProgress: 0 });
      
      const video = await VideoService.generateVideo(
        images,
        settings,
        selectedCodec, // Use selectedCodec from useVideoCodecs hook
        state.videoCodecs,
        (progress) => setUIState({ generationProgress: progress })
      );
      
      addVideo(video);
      setUIState({ videoPreview: video, showPreview: true });
      toast.success("Video generated successfully! Preview available.");
    } catch (error) {
      console.error("Error generating video:", error);
      toast.error("Failed to generate video");
    } finally {
      setUIState({ isGenerating: false, generationProgress: 0 });
    }
  }, [images, settings, selectedCodec, state.videoCodecs, addVideo, setUIState, multithreadingStatus]);

  const handleDownloadVideo = useCallback((video: any) => {
    FileService.downloadVideo(video);
    toast.success("Video downloaded successfully!");
  }, []);

  const handlePreviewVideo = useCallback((video: any) => {
    setUIState({ videoPreview: video, showPreview: true });
  }, [setUIState]);

  const handleRemoveGeneratedVideo = useCallback((videoId: string) => {
    removeVideo(videoId);
    toast.success("Video removed from list");
  }, [removeVideo]);

  const handleClearAllVideos = useCallback(() => {
    clearAllVideos();
  }, [clearAllVideos]);

  const handleClosePreview = useCallback(() => {
    setUIState({ showPreview: false, videoPreview: null });
  }, [setUIState]);

  const handleTogglePanel = useCallback((panel: keyof typeof ui.collapsedPanels) => {
    setUIState({
      collapsedPanels: {
        ...ui.collapsedPanels,
        [panel]: !ui.collapsedPanels[panel]
      }
    });
  }, [ui.collapsedPanels, setUIState]);

  const handleSettingsChange = useCallback((newSettings: any) => {
    updateSettings(newSettings);
  }, [updateSettings]);

  const handleDragStart = useCallback((index: number) => {
    setUIState({ draggedIndex: index });
  }, [setUIState]);

  const handleDragEnd = useCallback(() => {
    setUIState({ draggedIndex: null });
  }, [setUIState]);

  const handleReorderImages = useCallback((fromIndex: number, toIndex: number) => {
    reorderImages(fromIndex, toIndex);
  }, [reorderImages]);

  const handleClearAllImages = useCallback(() => {
    clearAllImages();
  }, [clearAllImages]);

  const handleRemoveImage = useCallback((id: string) => {
    removeImage(id);
  }, [removeImage]);

  return (
    <div className="space-y-6">
      <div className="main-logo">
        <Image
          src="/logo.png"
          alt="Stills-2-Video Logo"
          width={128}
          height={128}
          className="mx-auto h-32 w-auto mb-4"
          priority
        />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-400 mb-2">A Simple Image Sequence to Video Converter</h1>
        <p className="text-gray-600 text-sm md:text-base">Drop images, arrange them, and export as video</p>
      </div>

      {/* Multithreading Status Indicator */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${multithreadingStatus.active ? 'bg-green-500' : multithreadingStatus.enabled && !multithreadingStatus.available ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {multithreadingStatus.active ? 'Multithreaded Processing' : 
               multithreadingStatus.enabled && !multithreadingStatus.available ? 'Hybrid Processing' :
               'Single-threaded Processing'}
            </span>
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-300">
            {multithreadingStatus.enabled && multithreadingStatus.available ? (
              '🚀 Using multiple CPU cores'
            ) : multithreadingStatus.enabled && !multithreadingStatus.available ? (
              '🔄 Worker ready, using main thread for FFmpeg'
            ) : (
              'ℹ️ Single-threaded mode'
            )}
          </div>
        </div>
        {!multithreadingStatus.active && (
          <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
            {!multithreadingStatus.enabled && 'Multithreading disabled for this browser/device'}
            {multithreadingStatus.enabled && !multithreadingStatus.available && 'Worker communication available, FFmpeg uses main thread for compatibility'}
          </div>
        )}
      </div>

      {/* Upload Zone */}
      <UploadZone
        onFilesSelected={imageManager.handleFileSelect}
        onDrop={imageManager.handleDrop}
        onDragOver={imageManager.handleDragOver}
        disabled={ui.isGenerating}
      />

      {/* Video Settings */}
      <VideoSettings
        settings={settings}
        videoCodecs={state.videoCodecs}
        sortOption={sortOption}
        imagesCount={images.length}
        isGenerating={ui.isGenerating}
        generationProgress={ui.generationProgress}
        onSettingsChange={handleSettingsChange}
        onSortOptionChange={imageManager.handleSortOptionChange}
        onGenerateVideo={handleGenerateVideo}
        onTogglePanel={() => handleTogglePanel('settings')}
        isPanelCollapsed={ui.collapsedPanels.settings}
      />

      {/* Generated Videos List */}
      <GeneratedVideosList
        videos={videos}
        onPreview={handlePreviewVideo}
        onDownload={handleDownloadVideo}
        onRemove={handleRemoveGeneratedVideo}
        onClearAll={handleClearAllVideos}
        onTogglePanel={() => handleTogglePanel('generatedVideos')}
        isPanelCollapsed={ui.collapsedPanels.generatedVideos}
      />

      {/* Image Grid - Use virtual scrolling for large collections */}
      {shouldUseVirtualGrid ? (
        <VirtualImageGrid
          images={images}
          sortOption={sortOption}
          draggedIndex={ui.draggedIndex}
          onRemoveImage={handleRemoveImage}
          onClearAll={handleClearAllImages}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOverItem={(e, index) => imageManager.handleDragOverItem(
            e, 
            index, 
            ui.draggedIndex, 
            handleReorderImages, 
            handleDragStart
          )}
          onTogglePanel={() => handleTogglePanel('images')}
          isPanelCollapsed={ui.collapsedPanels.images}
        />
      ) : (
        <ImageGrid
          images={images}
          sortOption={sortOption}
          draggedIndex={ui.draggedIndex}
          onRemoveImage={handleRemoveImage}
          onClearAll={handleClearAllImages}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOverItem={(e, index) => imageManager.handleDragOverItem(
            e, 
            index, 
            ui.draggedIndex, 
            handleReorderImages, 
            handleDragStart
          )}
          onTogglePanel={() => handleTogglePanel('images')}
          isPanelCollapsed={ui.collapsedPanels.images}
        />
      )}

      {/* Lazy Video Preview Modal */}
      <LazyVideoPreview
        video={ui.videoPreview}
        isOpen={ui.showPreview}
        onClose={handleClosePreview}
        onDownload={handleDownloadVideo}
      />

      {/* Hidden canvas for video generation */}
      <canvas
        ref={videoGenerator.canvasRef}
        className="hidden"
        width={settings.videoWidth}
        height={settings.videoHeight}
      />
    </div>
  );
}
