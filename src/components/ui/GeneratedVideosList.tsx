import { VideoPreview as VideoPreviewType } from '../../types';

interface GeneratedVideosListProps {
  videos: VideoPreviewType[];
  onPreview: (video: VideoPreviewType) => void;
  onDownload: (video: VideoPreviewType) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onTogglePanel: () => void;
  isPanelCollapsed: boolean;
}

export function GeneratedVideosList({
  videos,
  onPreview,
  onDownload,
  onRemove,
  onClearAll,
  onTogglePanel,
  isPanelCollapsed
}: GeneratedVideosListProps) {
  if (videos.length === 0) return null;

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
          <h3 className="text-lg font-semibold">Generated Videos ({videos.length})</h3>
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
          <div className="space-y-3">
            {videos.map((video) => (
              <div
                key={video.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-10 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-gray-600">🎬</span>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{video.name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(video.timestamp).toLocaleTimeString()} • {video.extension.toUpperCase()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onPreview(video)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => onDownload(video)}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => onRemove(video.id)}
                    className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}