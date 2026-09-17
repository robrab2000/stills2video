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
import { UploadZone } from "./ui/UploadZone";
import { ImageGrid } from "./ui/ImageGrid";
import { VirtualImageGrid } from "./ui/VirtualImageGrid";
import { VideoSettings } from "./ui/VideoSettings";
import { LazyVideoPreview } from "./ui/LazyVideoPreview";
import { GeneratedVideosList } from "./ui/GeneratedVideosList";
import { SortOption, VideoPreview, VideoSettings as VideoSettingsType } from "../types";
import { shouldEnableFFmpegMultithreading, isMultithreadingAvailable } from '../lib/ffmpegUtils';

const isDev = process.env.NODE_ENV === 'development';

export function ImageToVideoConverter() {
  const [state, dispatch] = useApp();
  const [sortOption, setSortOption] = useState<SortOption>("name");

  const { images, removeImage, clearAllImages, reorderImages } = useImages();
  const { videos, addVideo, removeVideo, clearAllVideos } = useVideos();
  const { settings, updateSettings } = useSettings();
  const { ui, setUIState } = useUI();

  const { videoCodecs, selectedCodec, setSelectedCodec } = useVideoCodecs();

  // Keep settings.selectedCodec as the single source of truth once codecs load
  useEffect(() => {
    if (videoCodecs.length > 0) {
      dispatch({ type: 'SET_VIDEO_CODECS', payload: videoCodecs });
    }
  }, [videoCodecs, dispatch]);

  useEffect(() => {
    if (selectedCodec && selectedCodec !== settings.selectedCodec) {
      updateSettings({ selectedCodec });
    }
  }, [selectedCodec, settings.selectedCodec, updateSettings]);

  // Pre-init FFmpeg worker quietly (dev status only via PerformanceMonitor)
  useEffect(() => {
    const initializeWorker = async () => {
      try {
        const { ffmpegWorkerManager } = await import('../lib/ffmpegWorkerManager');
        await ffmpegWorkerManager.initialize();
        if (isDev) {
          console.log('FFmpeg worker pre-initialized', {
            enabled: shouldEnableFFmpegMultithreading(),
            available: isMultithreadingAvailable(),
          });
        }
      } catch (error) {
        if (isDev) {
          console.warn('Failed to pre-initialize FFmpeg worker:', error);
        }
      }
    };

    initializeWorker();
  }, []);

  const imageManager = useImageManager(
    images,
    sortOption,
    setSortOption
  );

  const videoGenerator = useVideoGenerator(
    (video) => {
      addVideo(video);
      setUIState({ videoPreview: video, showPreview: true });
    },
    (progress) => setUIState({ generationProgress: progress }),
    (isGenerating) => setUIState({ isGenerating })
  );

  const shouldUseVirtualGrid = useMemo(() => images.length > 24, [images.length]);
  const hasImages = images.length > 0;

  const handleGenerateVideo = useCallback(async () => {
    if (images.length === 0) {
      toast.error("Please add some images first");
      return;
    }

    const codec = settings.selectedCodec || selectedCodec;

    try {
      setUIState({ isGenerating: true, generationProgress: 0 });

      const video = await VideoService.generateVideo(
        images,
        settings,
        codec,
        state.videoCodecs,
        (progress) => setUIState({ generationProgress: progress })
      );

      addVideo(video);
      setUIState({ videoPreview: video, showPreview: true });
      toast.success("Video generated successfully");
    } catch (error) {
      console.error("Error generating video:", error);
      const message = error instanceof Error ? error.message : "Failed to generate video";
      toast.error(message.length > 180 ? `${message.slice(0, 177)}…` : message);
    } finally {
      setUIState({ isGenerating: false, generationProgress: 0 });
    }
  }, [images, settings, selectedCodec, state.videoCodecs, addVideo, setUIState]);

  const handleDownloadVideo = useCallback((video: VideoPreview) => {
    FileService.downloadVideo(video);
    toast.success("Video downloaded");
  }, []);

  const handlePreviewVideo = useCallback((video: VideoPreview) => {
    setUIState({ videoPreview: video, showPreview: true });
  }, [setUIState]);

  const handleRemoveGeneratedVideo = useCallback((videoId: string) => {
    removeVideo(videoId);
    toast.success("Video removed");
  }, [removeVideo]);

  const handleClearAllVideos = useCallback(() => {
    clearAllVideos();
  }, [clearAllVideos]);

  const handleClosePreview = useCallback(() => {
    setUIState({ showPreview: false, videoPreview: null });
  }, [setUIState]);

  const handleSettingsChange = useCallback((newSettings: Partial<VideoSettingsType>) => {
    updateSettings(newSettings);
    if (newSettings.selectedCodec) {
      setSelectedCodec(newSettings.selectedCodec);
    }
  }, [updateSettings, setSelectedCodec]);

  const handleDragStart = useCallback((index: number) => {
    setUIState({ draggedIndex: index });
  }, [setUIState]);

  const handleDragEnd = useCallback(() => {
    setUIState({ draggedIndex: null });
  }, [setUIState]);

  const handleReorderImages = useCallback((fromIndex: number, toIndex: number) => {
    reorderImages(fromIndex, toIndex);
    setSortOption('manual');
  }, [reorderImages]);

  const handleClearAllImages = useCallback(() => {
    clearAllImages();
  }, [clearAllImages]);

  const handleRemoveImage = useCallback((id: string) => {
    removeImage(id);
  }, [removeImage]);

  return (
    <div className="space-y-8">
      {hasImages ? (
        <>
          <header className="flex flex-wrap items-center gap-3">
            <Image
              src="/logo-mark.png"
              alt=""
              width={40}
              height={27}
              className="h-8 w-auto"
              priority
            />
            <h1 className="font-display text-xl font-semibold tracking-tight text-ink md:text-2xl">
              Stills-2-Video
            </h1>
          </header>

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
              onFilesSelected={imageManager.handleFileSelect}
              onDrop={imageManager.handleDrop}
              onDragOver={imageManager.handleDragOver}
              isGenerating={ui.isGenerating}
              onRequestThumbnail={imageManager.requestThumbnail}
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
              onFilesSelected={imageManager.handleFileSelect}
              onDrop={imageManager.handleDrop}
              onDragOver={imageManager.handleDragOver}
              isGenerating={ui.isGenerating}
              onRequestThumbnail={imageManager.requestThumbnail}
            />
          )}

          <VideoSettings
            settings={settings}
            videoCodecs={state.videoCodecs}
            sortOption={sortOption}
            images={images}
            imagesCount={images.length}
            isGenerating={ui.isGenerating}
            generationProgress={ui.generationProgress}
            onSettingsChange={handleSettingsChange}
            onSortOptionChange={imageManager.handleSortOptionChange}
            onGenerateVideo={handleGenerateVideo}
          />

          <GeneratedVideosList
            videos={videos}
            onPreview={handlePreviewVideo}
            onDownload={handleDownloadVideo}
            onRemove={handleRemoveGeneratedVideo}
            onClearAll={handleClearAllVideos}
          />
        </>
      ) : (
        <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center text-center">
          <Image
            src="/logo-web.png"
            alt="Stills-2-Video"
            width={280}
            height={187}
            className="mb-6 h-auto w-48 md:w-64"
            priority
          />
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">
            Stills-2-Video
          </h1>
          <p className="mt-3 max-w-md text-base text-ink-muted md:text-lg">
            Drop stills. Export video. All in your browser.
          </p>
          <p className="mt-2 text-sm text-ink-faint">
            Encoding happens in your browser — nothing is uploaded.
          </p>

          <div className="mt-10 w-full">
            <UploadZone
              onFilesSelected={imageManager.handleFileSelect}
              onDrop={imageManager.handleDrop}
              onDragOver={imageManager.handleDragOver}
              disabled={ui.isGenerating}
            />
          </div>

          {videos.length > 0 && (
            <div className="mt-10 w-full text-left">
              <GeneratedVideosList
                videos={videos}
                onPreview={handlePreviewVideo}
                onDownload={handleDownloadVideo}
                onRemove={handleRemoveGeneratedVideo}
                onClearAll={handleClearAllVideos}
              />
            </div>
          )}
        </div>
      )}

      <LazyVideoPreview
        video={ui.videoPreview}
        isOpen={ui.showPreview}
        onClose={handleClosePreview}
        onDownload={handleDownloadVideo}
      />

      <canvas
        ref={videoGenerator.canvasRef}
        className="hidden"
        width={settings.videoWidth}
        height={settings.videoHeight}
      />
    </div>
  );
}
