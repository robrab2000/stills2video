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
      draggable={sortOption === "manual"}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      className={`relative group border-2 rounded-lg overflow-hidden ${
        sortOption === "manual" ? "cursor-move" : ""
      } ${isDragged ? "opacity-50" : ""} hover:border-blue-300 transition-colors`}
    >
      <div className="aspect-square">
        <img
          src={image.url}
          alt={image.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      
      <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
        {index + 1}
      </div>
      
      <button
        onClick={handleRemove}
        className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
      >
        ×
      </button>
      
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2">
        <div className="truncate">{image.name}</div>
        <div>{(image.size / 1024).toFixed(1)} KB</div>
      </div>
    </div>
  );
});