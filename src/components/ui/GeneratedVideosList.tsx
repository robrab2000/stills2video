import { VideoPreview } from '../../types';

interface GeneratedVideosListProps {
  videos: VideoPreview[];
  onPreview: (video: VideoPreview) => void;
  onDownload: (video: VideoPreview) => void;
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <button
          onClick={onTogglePanel}
          className="flex items-center hover:bg-gray-100 rounded px-2 py-1 transition-colors"
        >
          <span className="text-gray-400 text-xs mr-2">
            {isPanelCollapsed ? '▶' : '▼'}
          </span>
          <h3 className="text-lg font-semibold">Generated Videos</h3>
          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            {videos.length}
          </span>
        </button>
        
        {videos.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-red-600 hover:text-red-800 text-sm px-3 py-1 hover:bg-red-50 rounded transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
      
      {!isPanelCollapsed && (
        <div className="px-6 pb-6">
          <div className="space-y-3">
            {videos.map((video) => (
              <div
                key={video.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  {video.thumbnailUrl && (
                    <img
                      src={video.thumbnailUrl}
                      alt="Video thumbnail"
                      className="w-12 h-8 object-cover rounded"
                    />
                  )}
                  <div>
                    <div className="font-medium text-sm">{video.name}</div>
                    <div className="text-xs text-gray-500">
                      {video.extension.toUpperCase()} • {formatFileSize(video.blob.size)} • {formatTimestamp(video.timestamp)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onPreview(video)}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => onDownload(video)}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => onRemove(video.id)}
                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                  >
                    Remove
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