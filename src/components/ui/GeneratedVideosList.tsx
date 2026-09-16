import { useMemo, useCallback } from 'react';
import { VideoPreview } from '../../types';

interface GeneratedVideosListProps {
  videos: VideoPreview[];
  onPreview: (video: VideoPreview) => void;
  onDownload: (video: VideoPreview) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export function GeneratedVideosList({
  videos,
  onPreview,
  onDownload,
  onRemove,
  onClearAll,
}: GeneratedVideosListProps) {
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatTimestamp = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  }, []);

  const sortedVideos = useMemo(() => {
    return [...videos].sort((a, b) => b.timestamp - a.timestamp);
  }, [videos]);

  if (videos.length === 0) return null;

  return (
    <section className="surface p-4 md:p-5" aria-labelledby="videos-heading">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 id="videos-heading" className="font-display text-lg font-semibold text-ink">
            Generated videos
          </h2>
          <p className="text-sm text-ink-muted">{videos.length} export{videos.length === 1 ? '' : 's'}</p>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="btn-danger"
        >
          Clear All
        </button>
      </div>

      <ul className="space-y-3">
        {sortedVideos.map((video) => (
          <li
            key={video.id}
            className="flex flex-col gap-3 rounded-md border border-line bg-paper p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              {video.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.thumbnailUrl}
                  alt=""
                  className="h-10 w-14 shrink-0 rounded object-cover"
                  loading="lazy"
                />
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-ink">{video.name}</div>
                <div className="text-xs text-ink-muted">
                  {video.extension.toUpperCase()} · {formatFileSize(video.blob.size)} · {formatTimestamp(video.timestamp)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onPreview(video)}
                className="btn-secondary"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => onDownload(video)}
                className="btn-primary"
              >
                Download
              </button>
              <button
                type="button"
                onClick={() => onRemove(video.id)}
                className="btn-ghost"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
