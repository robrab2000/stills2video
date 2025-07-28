import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ImageFile, SortOption } from '../types';
import { FileService } from '../services/fileService';
import { sortImages } from '../lib/imageUtils';

export function useImageManager(
  images: ImageFile[],
  onImagesChange: (images: ImageFile[]) => void,
  sortOption: SortOption,
  onSortOptionChange: (option: SortOption) => void
) {
  const handleFileSelect = useCallback((files: FileList) => {
    const result = FileService.processFileList(files);
    
    if (result.images.length > 0) {
      const updatedImages = [...images, ...result.images];
      onImagesChange(updatedImages);
      toast.success(`Added ${result.images.length} images`);
    }
    
    if (result.errors.length > 0) {
      result.errors.forEach(error => {
        toast.error(error);
      });
    }
  }, [images, onImagesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleRemoveImage = useCallback((id: string) => {
    const updatedImages = images.filter(img => img.id !== id);
    onImagesChange(updatedImages);
    toast.success("Image removed");
  }, [images, onImagesChange]);

  const handleClearAllImages = useCallback(() => {
    FileService.cleanupImageUrls(images);
    onImagesChange([]);
    toast.success("All images cleared");
  }, [images, onImagesChange]);

  const handleSortOptionChange = useCallback((option: SortOption) => {
    onSortOptionChange(option);
    if (option !== 'manual') {
      const sortedImages = sortImages(images, option);
      onImagesChange(sortedImages);
    }
  }, [images, onImagesChange, onSortOptionChange]);

  const handleDragOverItem = useCallback((
    e: React.DragEvent,
    index: number,
    draggedIndex: number | null,
    onReorder: (fromIndex: number, toIndex: number) => void,
    onDragStart: (index: number) => void
  ) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === index) {
      return;
    }

    if (draggedIndex !== index) {
      onReorder(draggedIndex, index);
      onDragStart(index);
    }
  }, []);

  return {
    handleFileSelect,
    handleDrop,
    handleDragOver,
    handleRemoveImage,
    handleClearAllImages,
    handleSortOptionChange,
    handleDragOverItem
  };
}