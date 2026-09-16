import { memo, useCallback } from 'react';
import { ImageFile } from '../../types';

interface ImageGridItemProps {
  image: ImageFile;
  index: number;
  sortOption: string;
  isDragged: boolean;
  onRemove: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
}

export const ImageGridItem = memo(function ImageGridItem({
  image,
  index,
  sortOption,
  isDragged,
  onRemove,
  onDragStart,
  onDragEnd,
  onDragOver
}: ImageGridItemProps) {
  const handleRemove = useCallback(() => {
    onRemove(image.id);
  }, [image.id, onRemove]);

  const handleDragStart = useCallback(() => {
    onDragStart(index);
  }, [index, onDragStart]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    onDragOver(e, index);
  }, [index, onDragOver]);

  return (
    <div
      draggable={sortOption === 'manual'}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      className={`grid-enter group relative overflow-hidden rounded-md border border-line bg-paper-elevated transition-colors ${
        sortOption === 'manual' ? 'cursor-move' : ''
      } ${isDragged ? 'opacity-50' : ''} hover:border-ink-muted`}
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      <div className="aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={image.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="absolute left-2 top-2 rounded bg-ink/80 px-2 py-0.5 text-xs font-medium text-white">
        {index + 1}
      </div>

      <button
        type="button"
        onClick={handleRemove}
        aria-label={`Remove ${image.name}`}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-sm font-bold text-white opacity-100 transition-opacity hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
      >
        ×
      </button>

      <div className="absolute bottom-0 left-0 right-0 bg-ink/75 p-2 text-xs text-white">
        <div className="truncate">{image.name}</div>
        <div className="text-white/70">{(image.size / 1024).toFixed(1)} KB</div>
      </div>
    </div>
  );
});
