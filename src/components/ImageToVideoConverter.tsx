"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { useApp } from "../contexts/AppContext";
import { useImageManager } from "../hooks/useImageManager";
import { useVideoCodecs } from "../hooks/useVideoCodecs";
import { useVideoGenerator } from "../hooks/useVideoGenerator";
import { VideoService } from "../services/videoService";
import { FileService } from "../services/fileService";
import { CodecService } from "../services/codecService";
import { UploadZone } from "./ui/UploadZone";
import { ImageGrid } from "./ui/ImageGrid";
import { VideoSettings } from "./ui/VideoSettings";
import { VideoPreview } from "./ui/VideoPreview";
import { GeneratedVideosList } from "./ui/GeneratedVideosList";
import { SortOption } from "../types";

export function ImageToVideoConverter() {
  const [state, dispatch] = useApp();
  const [sortOption, setSortOption] = useState<SortOption>("manual");

  // Initialize video codecs
  const { videoCodecs, selectedCodec, setSelectedCodec } = useVideoCodecs();

  // Update codecs in global state
  useEffect(() => {
    if (videoCodecs.length > 0) {
      dispatch({ type: 'SET_VIDEO_CODECS', payload: videoCodecs });
    }
  }, [videoCodecs, dispatch]);

  // Update selected codec in global state
  useEffect(() => {
    if (selectedCodec) {
      dispatch({ type: 'UPDATE_SETTINGS', payload: { selectedCodec } });
    }
  }, [selectedCodec, dispatch]);

  // Image management
  const imageManager = useImageManager(
    state.images,
    (newImages) => dispatch({ type: 'ADD_IMAGES', payload: newImages }),
    sortOption,
    setSortOption
  );

  // Video generation
  const videoGenerator = useVideoGenerator(
    (video) => {
      dispatch({ type: 'ADD_GENERATED_VIDEO', payload: video });
      dispatch({ type: 'SET_UI_STATE', payload: { videoPreview: video, showPreview: true } });
    },
    (progress) => dispatch({ type: 'SET_UI_STATE', payload: { generationProgress: progress } }),
    (isGenerating) => dispatch({ type: 'SET_UI_STATE', payload: { isGenerating } })
  );

  // Event handlers
  const handleGenerateVideo = useCallback(async () => {
    try {
      const video = await VideoService.generateVideo(
        state.images,
        state.settings,
        state.settings.selectedCodec,
        state.videoCodecs,
        (progress) => dispatch({ type: 'SET_UI_STATE', payload: { generationProgress: progress } })
      );
      
      dispatch({ type: 'ADD_GENERATED_VIDEO', payload: video });
      dispatch({ type: 'SET_UI_STATE', payload: { videoPreview: video, showPreview: true } });
      toast.success("Video generated successfully! Preview available.");
    } catch (error) {
      console.error("Error generating video:", error);
      toast.error("Failed to generate video");
    } finally {
      dispatch({ type: 'SET_UI_STATE', payload: { isGenerating: false, generationProgress: 0 } });
    }
  }, [state.images, state.settings, state.videoCodecs, dispatch, state]);

  const handleDownloadVideo = useCallback((video: any) => {
    FileService.downloadVideo(video);
    toast.success("Video downloaded successfully!");
  }, []);

  const handlePreviewVideo = useCallback((video: any) => {
    dispatch({ type: 'SET_UI_STATE', payload: { videoPreview: video, showPreview: true } });
  }, [dispatch]);

  const handleRemoveGeneratedVideo = useCallback((videoId: string) => {
    dispatch({ type: 'REMOVE_GENERATED_VIDEO', payload: videoId });
    toast.success("Video removed from list");
  }, [dispatch]);

  const handleClearAllVideos = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_VIDEOS' });
  }, [dispatch]);

  const handleClosePreview = useCallback(() => {
    dispatch({ type: 'SET_UI_STATE', payload: { showPreview: false, videoPreview: null } });
  }, [dispatch]);

  const handleTogglePanel = useCallback((panel: keyof typeof state.ui.collapsedPanels) => {
    dispatch({
      type: 'SET_UI_STATE',
      payload: {
        collapsedPanels: {
          ...state.ui.collapsedPanels,
          [panel]: !state.ui.collapsedPanels[panel]
        }
      }
    });
  }, [state.ui.collapsedPanels, dispatch]);

  const handleSettingsChange = useCallback((settings: any) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, [dispatch]);

  const handleDragStart = useCallback((index: number) => {
    dispatch({ type: 'SET_UI_STATE', payload: { draggedIndex: index } });
  }, [dispatch]);

  const handleDragEnd = useCallback(() => {
    dispatch({ type: 'SET_UI_STATE', payload: { draggedIndex: null } });
  }, [dispatch]);

  const handleReorderImages = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_IMAGES', payload: { fromIndex, toIndex } });
  }, [dispatch]);

  const handleClearAllImages = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_IMAGES' });
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div className="main-logo">
        <Image
          src="/logo.png"
          alt="Stills-2-Video Logo"
          width={128}
          height={128}
          className="mx-auto h-32 w-auto mb-4"
        />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-400 mb-2">A Simple Image Sequence to Video Converter</h1>
        <p className="text-gray-600 text-sm md:text-base">Drop images, arrange them, and export as video</p>
      </div>

      {/* Upload Zone */}
      <UploadZone
        onFilesSelected={imageManager.handleFileSelect}
        onDrop={imageManager.handleDrop}
        onDragOver={imageManager.handleDragOver}
        disabled={state.ui.isGenerating}
      />

      {/* Video Settings */}
      <VideoSettings
        settings={state.settings}
        videoCodecs={state.videoCodecs}
        sortOption={sortOption}
        imagesCount={state.images.length}
        isGenerating={state.ui.isGenerating}
        generationProgress={state.ui.generationProgress}
        onSettingsChange={handleSettingsChange}
        onSortOptionChange={imageManager.handleSortOptionChange}
        onGenerateVideo={handleGenerateVideo}
        onTogglePanel={() => handleTogglePanel('settings')}
        isPanelCollapsed={state.ui.collapsedPanels.settings}
      />

      {/* Generated Videos List */}
      <GeneratedVideosList
        videos={state.generatedVideos}
        onPreview={handlePreviewVideo}
        onDownload={handleDownloadVideo}
        onRemove={handleRemoveGeneratedVideo}
        onClearAll={handleClearAllVideos}
        onTogglePanel={() => handleTogglePanel('generatedVideos')}
        isPanelCollapsed={state.ui.collapsedPanels.generatedVideos}
      />

      {/* Image Grid */}
      <ImageGrid
        images={state.images}
        sortOption={sortOption}
        draggedIndex={state.ui.draggedIndex}
        onRemoveImage={(id) => dispatch({ type: 'REMOVE_IMAGE', payload: id })}
        onClearAll={handleClearAllImages}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOverItem={(e, index) => imageManager.handleDragOverItem(
          e, 
          index, 
          state.ui.draggedIndex, 
          handleReorderImages, 
          handleDragStart
        )}
        onTogglePanel={() => handleTogglePanel('images')}
        isPanelCollapsed={state.ui.collapsedPanels.images}
      />

      {/* Video Preview Modal */}
      <VideoPreview
        video={state.ui.videoPreview}
        isOpen={state.ui.showPreview}
        onClose={handleClosePreview}
        onDownload={handleDownloadVideo}
      />

      {/* Hidden canvas for video generation */}
      <canvas
        ref={videoGenerator.canvasRef}
        className="hidden"
        width={state.settings.videoWidth}
        height={state.settings.videoHeight}
      />
    </div>
  );
}
