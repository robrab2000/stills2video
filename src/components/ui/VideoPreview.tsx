import { VideoPreview as VideoPreviewType } from '../../types';

interface VideoPreviewProps {
  video: VideoPreviewType | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (video: VideoPreviewType) => void;
}

export function VideoPreview({ video, isOpen, onClose, onDownload }: VideoPreviewProps) {
  if (!isOpen || !video) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">Video Preview</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="p-4">
          <video
            src={video.url}
            controls
            className="w-full max-h-[60vh] object-contain bg-black rounded"
            autoPlay
            muted
          />
          
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Video format: {video.extension.toUpperCase()}
            </div>
            <div className="space-x-2">
              <button
                onClick={() => onDownload(video)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Download Video
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}