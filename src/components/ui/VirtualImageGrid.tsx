import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ImageFile, SortOption } from '../../types';

interface VirtualImageGridProps {
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
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
}

interface VirtualItem {
  index: number;
  start: number;
  end: number;
  size: number;
}

export function VirtualImageGrid({
  images,
  sortOption,
  draggedIndex,
  onRemoveImage,
  onClearAll,
  onDragStart,
  onDragEnd,
  onDragOverItem,
  onTogglePanel,
  isPanelCollapsed,
  itemHeight = 200, // Height of each grid item
  containerHeight = 600, // Height of the container
  overscan = 5 // Number of items to render outside the visible area
}: VirtualImageGridProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Calculate grid layout
  const gridLayout = useMemo(() => {
    if (containerWidth === 0) return { columns: 1, itemWidth: 0 };
    
    // Calculate number of columns based on container width
    const minItemWidth = 150; // Minimum item width
    const gap = 16; // Gap between items
    const columns = Math.max(1, Math.floor((containerWidth + gap) / (minItemWidth + gap)));
    const itemWidth = (containerWidth - (columns - 1) * gap) / columns;
    
    return { columns, itemWidth };
  }, [containerWidth]);

  // Calculate virtual items
  const virtualItems = useMemo(() => {
    if (images.length === 0) return [];
    
    const { columns } = gridLayout;
    const itemsPerRow = columns;
    const rows = Math.ceil(images.length / itemsPerRow);
    
    const items: VirtualItem[] = [];
    for (let i = 0; i < rows; i++) {
      const startIndex = i * itemsPerRow;
      const endIndex = Math.min(startIndex + itemsPerRow, images.length);
      
      items.push({
        index: i,
        start: startIndex,
        end: endIndex,
        size: itemHeight
      });
    }
    
    return items;
  }, [images.length, gridLayout.columns, itemHeight]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      virtualItems.length
    );
    
    return {
      start: Math.max(0, start - overscan),
      end
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, virtualItems.length]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    return virtualItems.length * itemHeight;
  }, [virtualItems.length, itemHeight]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  if (images.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
        <button
          onClick={onTogglePanel}
          className="flex items-center hover:bg-gray-100 rounded px-2 py-1 transition-colors"
        >
          <span className="text-gray-400 text-xs mr-2">
            {isPanelCollapsed ? '▶' : '▼'}
          </span>
          <h3 className="text-lg font-semibold">Images ({images.length})</h3>
        </button>
        <button
          onClick={onClearAll}
          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          Clear All
        </button>
      </div>
      
      {!isPanelCollapsed && (
        <div className="px-6 pb-6">
          <div 
            ref={containerRef}
            className="overflow-auto"
            style={{ height: containerHeight }}
            onScroll={handleScroll}
          >
            <div style={{ height: totalHeight, position: 'relative' }}>
              {virtualItems.slice(visibleRange.start, visibleRange.end).map((virtualItem) => (
                <div
                  key={virtualItem.index}
                  style={{
                    position: 'absolute',
                    top: virtualItem.index * itemHeight,
                    left: 0,
                    right: 0,
                    height: itemHeight
                  }}
                >
                  <div 
                    className="grid gap-4"
                    style={{ 
                      gridTemplateColumns: `repeat(${gridLayout.columns}, 1fr)`,
                      height: '100%'
                    }}
                  >
                    {images.slice(virtualItem.start, virtualItem.end).map((image, localIndex) => {
                      const globalIndex = virtualItem.start + localIndex;
                      return (
                        <div
                          key={image.id}
                          draggable={sortOption === "manual"}
                          onDragStart={() => onDragStart(globalIndex)}
                          onDragEnd={onDragEnd}
                          onDragOver={(e) => onDragOverItem(e, globalIndex)}
                          className={`relative group border-2 rounded-lg overflow-hidden ${
                            sortOption === "manual" ? "cursor-move" : ""
                          } ${draggedIndex === globalIndex ? "opacity-50" : ""} hover:border-blue-300 transition-colors`}
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
                            {globalIndex + 1}
                          </div>
                          
                          <button
                            onClick={() => onRemoveImage(image.id)}
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
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}