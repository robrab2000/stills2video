import { lazy, Suspense, useState, useEffect } from 'react';
import { VideoPreview as VideoPreviewType } from '../../types';

const VideoPreview = lazy(() => import('./VideoPreview').then(module => ({ default: module.VideoPreview })));

interface LazyVideoPreviewProps {
  video: VideoPreviewType | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (video: VideoPreviewType) => void;
}

export function LazyVideoPreview({ video, isOpen, onClose, onDownload }: LazyVideoPreviewProps) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (isOpen && !shouldLoad) {
      setShouldLoad(true);
    }
  }, [isOpen, shouldLoad]);

  if (!isOpen || !video) return null;

  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
        <div className="surface w-full max-w-4xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="font-display text-lg font-semibold text-ink">Preview</h3>
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost text-xl leading-none"
              aria-label="Close preview"
            >
              ×
            </button>
          </div>
          <div className="flex h-64 items-center justify-center p-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
            <span className="ml-3 text-ink-muted">Loading preview…</span>
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
