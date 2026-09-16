import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ImageFile, SortOption } from '../types';
import { FileService } from '../services/fileService';
import { useAppDispatch } from '../contexts/AppContext';
import {
  collectImageFilesFromDataTransfer,
  filesToFileList,
} from '../lib/folderDrop';
import {
  createImageThumbnailWithNaturalSize,
  mapWithConcurrency,
} from '../lib/thumbnailUtils';

const isDev = process.env.NODE_ENV === 'development';
const THUMBNAIL_CONCURRENCY = 2;

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function useImageManager(
  images: ImageFile[],
  sortOption: SortOption,
  onSortOptionChange: (option: SortOption) => void
) {
  const dispatch = useAppDispatch();
  const thumbQueueRef = useRef<Set<string>>(new Set());
  const imagesRef = useRef(images);
  const activeThumbPassRef = useRef(false);
  const pendingThumbIdsRef = useRef<string[]>([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const flushThumbnailQueue = useCallback(async () => {
    if (activeThumbPassRef.current) return;
    activeThumbPassRef.current = true;

    try {
      while (pendingThumbIdsRef.current.length > 0) {
        const batchIds = pendingThumbIdsRef.current.splice(0, 8);
        const batch = batchIds
          .map((id) => imagesRef.current.find((img) => img.id === id))
          .filter((img): img is ImageFile => img != null && !img.thumbnailUrl);

        if (batch.length === 0) continue;

        await mapWithConcurrency(
          batch,
          THUMBNAIL_CONCURRENCY,
          async (image) => {
            try {
              const thumb = await createImageThumbnailWithNaturalSize(image.file);
              await new Promise((resolve) => setTimeout(resolve, 0));
              return { id: image.id, ...thumb };
            } catch (error) {
              if (isDev) {
                console.warn('Thumbnail failed for', image.name, error);
              }
              thumbQueueRef.current.delete(image.id);
              return null;
            }
          },
          (result) => {
            if (!result) return;
            dispatch({
              type: 'UPDATE_IMAGE_METADATA',
              payload: {
                id: result.id,
                metadata: {
                  thumbnailUrl: result.thumbnailUrl,
                  width: result.width,
                  height: result.height,
                },
              },
            });
            thumbQueueRef.current.delete(result.id);
          }
        );
      }
    } finally {
      activeThumbPassRef.current = false;
      if (pendingThumbIdsRef.current.length > 0) {
        void flushThumbnailQueue();
      }
    }
  }, [dispatch]);

  const requestThumbnail = useCallback((id: string) => {
    const image = imagesRef.current.find((img) => img.id === id);
    if (!image || image.thumbnailUrl || thumbQueueRef.current.has(id)) {
      return;
    }
    thumbQueueRef.current.add(id);
    pendingThumbIdsRef.current.push(id);
    void flushThumbnailQueue();
  }, [flushThumbnailQueue]);

  const handleFileSelect = useCallback((files: FileList | File[]) => {
    try {
      const list = Array.isArray(files) ? filesToFileList(files) : files;
      if (isDev) {
        console.log('handleFileSelect called with', list.length, 'files');
      }
      const result = FileService.processFileList(list);

      if (result.images.length > 0) {
        dispatch({ type: 'ADD_IMAGES', payload: result.images });
        const totalBytes = result.images.reduce((sum, img) => sum + img.size, 0);
        toast.success(`Added ${result.images.length} images (${formatBytes(totalBytes)})`, {
          description: 'Files stay on your device. Previews load as you scroll.',
        });
      } else if (result.errors.length === 0) {
        toast.error('No images found');
      }

      if (result.errors.length > 0) {
        result.errors.slice(0, 5).forEach((error) => {
          toast.error(error);
        });
        if (result.errors.length > 5) {
          toast.error(`…and ${result.errors.length - 5} more errors`);
        }
      }
    } catch (error) {
      console.error('Error in handleFileSelect:', error);
      toast.error('Failed to process images');
    }
  }, [dispatch]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const files = await collectImageFilesFromDataTransfer(e.dataTransfer);
      if (files.length > 0) {
        handleFileSelect(files);
      } else {
        toast.error('No images found in that drop');
      }
    } catch (error) {
      console.error('Error reading dropped folder/files:', error);
      toast.error('Failed to read dropped files');
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleRemoveImage = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_IMAGE', payload: id });
    toast.success('Image removed');
  }, [dispatch]);

  const handleClearAllImages = useCallback(() => {
    FileService.cleanupUrls(
      images.flatMap((img) => [img.url, img.thumbnailUrl].filter(Boolean) as string[])
    );
    dispatch({ type: 'CLEAR_ALL_IMAGES' });
    toast.success('All images cleared');
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
    handleDragOverItem,
    requestThumbnail,
  };
}
