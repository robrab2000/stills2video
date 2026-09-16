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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
      onClick={onClose}
    >
      <div
        className="surface max-h-[90vh] w-full max-w-4xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 id="preview-title" className="font-display text-lg font-semibold text-ink">
            Preview
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost text-xl leading-none"
            aria-label="Close preview"
          >
            ×
          </button>
        </div>

        <div className="p-4">
          <video
            src={video.url}
            controls
            className="max-h-[60vh] w-full rounded-md bg-ink object-contain"
            autoPlay
            muted
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-ink-muted">
              Format: {video.extension.toUpperCase()} · {video.name}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onDownload(video)}
                className="btn-primary"
              >
                Download
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
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
