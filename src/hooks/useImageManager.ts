import { useCallback } from 'react';
import { toast } from 'sonner';
import { ImageFile, SortOption } from '../types';
import { FileService } from '../services/fileService';
import { sortImages } from '../lib/imageUtils';
import { useAppDispatch } from '../contexts/AppContext';

export function useImageManager(
  images: ImageFile[],
  sortOption: SortOption,
  onSortOptionChange: (option: SortOption) => void
) {
  const dispatch = useAppDispatch();

  const handleFileSelect = useCallback((files: FileList) => {
    try {
      console.log('🖼️ handleFileSelect called with', files.length, 'files');
      const result = FileService.processFileList(files);
      console.log('📁 FileService result:', result);
      
      if (result.images.length > 0) {
        console.log('✅ Dispatching ADD_IMAGES with', result.images.length, 'images');
        dispatch({ type: 'ADD_IMAGES', payload: result.images });
        toast.success(`Added ${result.images.length} images`);
      }
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          toast.error(error);
        });
      }
    } catch (error) {
      console.error('❌ Error in handleFileSelect:', error);
      toast.error('Failed to process images');
    }
  }, [dispatch]);

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
    dispatch({ type: 'REMOVE_IMAGE', payload: id });
    toast.success("Image removed");
  }, [dispatch]);

  const handleClearAllImages = useCallback(() => {
    FileService.cleanupImageUrls(images);
    dispatch({ type: 'CLEAR_ALL_IMAGES' });
    toast.success("All images cleared");
  }, [images, dispatch]);

  const handleSortOptionChange = useCallback((option: SortOption) => {
    onSortOptionChange(option);
    if (option !== 'manual') {
      const sortedImages = sortImages(images, option);
      // For sorting, we need to replace the entire images array
      // This is a bit of a hack since we don't have a REPLACE_IMAGES action
      // We'll clear and re-add
      dispatch({ type: 'CLEAR_ALL_IMAGES' });
      dispatch({ type: 'ADD_IMAGES', payload: sortedImages });
    }
  }, [images, onSortOptionChange, dispatch]);

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