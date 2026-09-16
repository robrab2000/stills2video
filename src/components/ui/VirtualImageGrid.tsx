import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ImageFile, SortOption } from '../../types';
import { UploadZone } from './UploadZone';

interface VirtualImageGridProps {
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
  onFilesSelected,
  onDrop,
  onDragOver,
  isGenerating = false,
  itemHeight = 200,
  containerHeight = 600,
  overscan = 5,
}: VirtualImageGridProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const gridLayout = useMemo(() => {
    if (containerWidth === 0) return { columns: 1, itemWidth: 0 };

    const minItemWidth = 150;
    const gap = 12;
    const columns = Math.max(1, Math.floor((containerWidth + gap) / (minItemWidth + gap)));
    const itemWidth = (containerWidth - (columns - 1) * gap) / columns;

    return { columns, itemWidth };
  }, [containerWidth]);

  const virtualItems = useMemo(() => {
    if (images.length === 0) return [];

    const { columns } = gridLayout;
    const rows = Math.ceil(images.length / columns);
    const items: VirtualItem[] = [];

    for (let i = 0; i < rows; i++) {
      const startIndex = i * columns;
      const endIndex = Math.min(startIndex + columns, images.length);
      items.push({
        index: i,
        start: startIndex,
        end: endIndex,
        size: itemHeight,
      });
    }

    return items;
  }, [images.length, gridLayout, itemHeight]);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      virtualItems.length
    );

    return {
      start: Math.max(0, start - overscan),
      end,
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, virtualItems.length]);

  const totalHeight = useMemo(() => {
    return virtualItems.length * itemHeight;
  }, [virtualItems.length, itemHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => setContainerWidth(el.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (images.length === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="sequence-heading-virtual">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="sequence-heading-virtual" className="font-display text-lg font-semibold text-ink">
            Sequence
          </h2>
          <p className="text-sm text-ink-muted">
            {images.length} stills · virtual scrolling
            {sortOption === 'manual' ? ' · drag to reorder' : ''}
          </p>
        </div>
        <button type="button" onClick={onClearAll} className="btn-danger">
          Clear All
        </button>
      </div>

      <div
        ref={containerRef}
        className="overflow-auto rounded-md border border-line bg-paper-elevated"
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
                height: itemHeight,
                padding: '0 12px',
              }}
            >
              <div
                className="grid h-full gap-3"
                style={{
                  gridTemplateColumns: `repeat(${gridLayout.columns}, 1fr)`,
                }}
              >
                {images.slice(virtualItem.start, virtualItem.end).map((image, localIndex) => {
                  const globalIndex = virtualItem.start + localIndex;
                  return (
                    <div
                      key={image.id}
                      draggable={sortOption === 'manual'}
                      onDragStart={() => onDragStart(globalIndex)}
                      onDragEnd={onDragEnd}
                      onDragOver={(e) => onDragOverItem(e, globalIndex)}
                      className={`group relative overflow-hidden rounded-md border border-line ${
                        sortOption === 'manual' ? 'cursor-move' : ''
                      } ${draggedIndex === globalIndex ? 'opacity-50' : ''}`}
                    >
                        <div className="aspect-square bg-[rgba(26,28,30,0.06)]">
                          {image.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={image.thumbnailUrl}
                              alt={image.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="flex h-full w-full animate-pulse items-center justify-center">
                              <span className="text-[10px] uppercase tracking-wide text-ink-faint">Loading</span>
                            </div>
                          )}
                        </div>

                      <div className="absolute left-2 top-2 rounded bg-ink/80 px-2 py-0.5 text-xs font-medium text-white">
                        {globalIndex + 1}
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveImage(image.id)}
                        aria-label={`Remove ${image.name}`}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-sm font-bold text-white opacity-100 hover:bg-accent-hover md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                      >
                        ×
                      </button>

                      <div className="absolute bottom-0 left-0 right-0 bg-ink/75 p-2 text-xs text-white">
                        <div className="truncate">{image.name}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
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
