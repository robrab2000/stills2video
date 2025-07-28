import { useCallback } from 'react';
import { toast } from 'sonner';
import { ImageFile, SortOption } from '../types';
import { FileService } from '../services/fileService';

export function useImageManager(
  images: ImageFile[],
  onImagesChange: (images: ImageFile[]) => void,
  sortOption: SortOption,
  onSortOptionChange: (option: SortOption) => void
) {
  const handleFileSelect = useCallback((files: FileList) => {
    const newImages = FileService.processFileList(files);

    if (newImages.length > 0) {
      const updatedImages = [...images, ...newImages];
      onImagesChange(updatedImages);
      toast.success(`Added ${newImages.length} images`);
    }
  }, [images, onImagesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeImage = useCallback((id: string) => {
    const imageToRemove = images.find(img => img.id === id);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.url);
    }
    
    const updatedImages = images.filter(img => img.id !== id);
    onImagesChange(updatedImages);
  }, [images, onImagesChange]);

  const clearAllImages = useCallback(() => {
    FileService.cleanupImageUrls(images);
    onImagesChange([]);
  }, [images, onImagesChange]);

  const handleSortOptionChange = useCallback((option: SortOption) => {
    onSortOptionChange(option);
    // Note: Sorting is now handled by the reducer
  }, [onSortOptionChange]);

  const handleDragStart = useCallback((index: number, onDragStart: (index: number) => void) => {
    onDragStart(index);
  }, []);

  const handleDragEnd = useCallback((onDragEnd: () => void) => {
    onDragEnd();
  }, []);

  const handleDragOverItem = useCallback((
    e: React.DragEvent, 
    index: number, 
    draggedIndex: number | null,
    onReorder: (fromIndex: number, toIndex: number) => void,
    onDragIndexChange: (index: number) => void
  ) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    onReorder(draggedIndex, index);
    onDragIndexChange(index);
  }, []);

  return {
    handleFileSelect,
    handleDrop,
    handleDragOver,
    removeImage,
    clearAllImages,
    handleSortOptionChange,
    handleDragStart,
    handleDragEnd,
    handleDragOverItem,
  };
}