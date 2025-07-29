import { lazy, Suspense, useState, useEffect } from 'react';
import { VideoPreview as VideoPreviewType } from '../../types';

// Lazy load the VideoPreview component
const VideoPreview = lazy(() => import('./VideoPreview').then(module => ({ default: module.VideoPreview })));

interface LazyVideoPreviewProps {
  video: VideoPreviewType | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (video: VideoPreviewType) => void;
}

export function LazyVideoPreview({ video, isOpen, onClose, onDownload }: LazyVideoPreviewProps) {
  const [shouldLoad, setShouldLoad] = useState(false);

  // Only load the component when the modal is opened
  useEffect(() => {
    if (isOpen && !shouldLoad) {
      setShouldLoad(true);
    }
  }, [isOpen, shouldLoad]);

  if (!isOpen || !video) return null;

  return (
    <Suspense fallback={
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
          <div className="p-4 flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading video preview...</span>
          </div>
        </div>
      </div>
    }>
      {shouldLoad && (
        <VideoPreview
          video={video}
          isOpen={isOpen}
          onClose={onClose}
          onDownload={onDownload}
        />
      )}
    </Suspense>
  );
}