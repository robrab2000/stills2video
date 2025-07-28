import { ImageFile, SortOption } from '../../types';

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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                draggable={sortOption === "manual"}
                onDragStart={() => onDragStart(index)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => onDragOverItem(e, index)}
                className={`relative group border-2 rounded-lg overflow-hidden ${
                  sortOption === "manual" ? "cursor-move" : ""
                } ${draggedIndex === index ? "opacity-50" : ""} hover:border-blue-300 transition-colors`}
              >
                <div className="aspect-square">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                  {index + 1}
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}