import { useMemo, useCallback, useState, useEffect } from 'react';
import { ImageFile, SortOption } from '../../types';
import { ImageGridItem } from './ImageGridItem';

interface ImageGridProps {
  images: ImageFile[];
  sortOption: SortOption;
  draggedIndex: number | null;
  onRemoveImage: (id: string) => void;
  onClearAll: () => void;
  onDragStart: (index: number) => void;
  onDragEnd: () => void;
  onDragOverItem: (e: React.DragEvent, index: number) => void;
  onTogglePanel: () => void;
  isPanelCollapsed: boolean;
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
  onTogglePanel,
  isPanelCollapsed
}: ImageGridProps) {
  const [windowWidth, setWindowWidth] = useState<number>(1024); // Default fallback

  // Handle window resize safely
  useEffect(() => {
    const updateWidth = () => {
      setWindowWidth(window.innerWidth);
    };

    // Set initial width
    updateWidth();

    // Add event listener
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Memoize the grid layout calculation
  const gridLayout = useMemo(() => {
    // Determine number of columns based on screen size
    const isLargeScreen = windowWidth >= 1024; // lg
    const isMediumScreen = windowWidth >= 768; // md
    
    if (isLargeScreen) return 'grid-cols-6';
    if (isMediumScreen) return 'grid-cols-4';
    return 'grid-cols-2';
  }, [windowWidth]);

  // Memoize the clear all handler
  const handleClearAll = useCallback(() => {
    onClearAll();
  }, [onClearAll]);

  // Memoize the toggle panel handler
  const handleTogglePanel = useCallback(() => {
    onTogglePanel();
  }, [onTogglePanel]);

  // Memoize the drag end handler
  const handleDragEnd = useCallback(() => {
    onDragEnd();
  }, [onDragEnd]);

  if (images.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
        <button
          onClick={handleTogglePanel}
          className="flex items-center hover:bg-gray-100 rounded px-2 py-1 transition-colors"
        >
          <span className="text-gray-400 text-xs mr-2">
            {isPanelCollapsed ? '▶' : '▼'}
          </span>
          <h3 className="text-lg font-semibold">Images ({images.length})</h3>
        </button>
        <button
          onClick={handleClearAll}
          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          Clear All
        </button>
      </div>
      
      {!isPanelCollapsed && (
        <div className="px-6 pb-6">
          <div className={`grid ${gridLayout} gap-4`}>
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
        </div>
      )}
    </div>
  );
}