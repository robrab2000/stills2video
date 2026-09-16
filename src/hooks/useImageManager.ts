import { useCallback } from 'react';
import { toast } from 'sonner';
import { ImageFile, SortOption } from '../types';
import { FileService } from '../services/fileService';
import { useAppDispatch } from '../contexts/AppContext';

const isDev = process.env.NODE_ENV === 'development';

export function useImageManager(
  images: ImageFile[],
  sortOption: SortOption,
  onSortOptionChange: (option: SortOption) => void
) {
  const dispatch = useAppDispatch();

  const handleFileSelect = useCallback((files: FileList) => {
    try {
      if (isDev) {
        console.log('handleFileSelect called with', files.length, 'files');
      }
      const result = FileService.processFileList(files);
      
      if (result.images.length > 0) {
        dispatch({ type: 'ADD_IMAGES', payload: result.images });
        toast.success(`Added ${result.images.length} images`);
      }
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          toast.error(error);
        });
      }
    } catch (error) {
      console.error('Error in handleFileSelect:', error);
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
    FileService.cleanupUrls(images.map(img => img.url));
    dispatch({ type: 'CLEAR_ALL_IMAGES' });
    toast.success("All images cleared");
  }, [images, dispatch]);

  const handleSortOptionChange = useCallback((option: SortOption) => {
    onSortOptionChange(option);
    if (option !== 'manual') {
      dispatch({ type: 'SORT_IMAGES', payload: option });
    }
  }, [onSortOptionChange, dispatch]);

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
