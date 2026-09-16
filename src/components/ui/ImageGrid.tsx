import { useCallback } from 'react';
import { ImageFile, SortOption } from '../../types';
import { ImageGridItem } from './ImageGridItem';
import { UploadZone } from './UploadZone';

interface ImageGridProps {
  images: ImageFile[];
  sortOption: SortOption;
  draggedIndex: number | null;
  onRemoveImage: (id: string) => void;
  onClearAll: () => void;
  onDragStart: (index: number) => void;
  onDragEnd: () => void;
  onDragOverItem: (e: React.DragEvent, index: number) => void;
  onFilesSelected?: (files: FileList) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  isGenerating?: boolean;
}

export function ImageGrid({
  images,
  sortOption,
  draggedIndex,
  onRemoveImage,
  onClearAll,
  onDragStart,
  onDragEnd,
  onDragOverItem,
  onFilesSelected,
  onDrop,
  onDragOver,
  isGenerating = false,
}: ImageGridProps) {
  const handleClearAll = useCallback(() => {
    onClearAll();
  }, [onClearAll]);

  const handleDragEnd = useCallback(() => {
    onDragEnd();
  }, [onDragEnd]);

  if (images.length === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="sequence-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="sequence-heading" className="font-display text-lg font-semibold text-ink">
            Sequence
          </h2>
          <p className="text-sm text-ink-muted">
            {images.length} still{images.length === 1 ? '' : 's'}
            {sortOption === 'manual' ? ' · drag to reorder' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClearAll}
          className="btn-danger"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {images.map((image, index) => (
          <ImageGridItem
            key={image.id}
            image={image}
            index={index}
            sortOption={sortOption}
            isDragged={draggedIndex === index}
            onRemove={onRemoveImage}
            onDragStart={onDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={onDragOverItem}
          />
        ))}
      </div>

      {onFilesSelected && onDrop && onDragOver && (
        <UploadZone
          onFilesSelected={onFilesSelected}
          onDrop={onDrop}
          onDragOver={onDragOver}
          disabled={isGenerating}
          compact
        />
      )}
    </section>
  );
}
