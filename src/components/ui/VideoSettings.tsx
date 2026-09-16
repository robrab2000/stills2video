import { useMemo, useCallback, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { VideoCodec, VideoSettings as VideoSettingsType, SortOption, ImageFile } from '../../types';
import { fitExportDimensions } from '../../lib/exportDimensions';

type ResolutionPreset = 'match' | '1080p' | '720p' | 'custom';

interface VideoSettingsProps {
  settings: VideoSettingsType;
  videoCodecs: VideoCodec[];
  sortOption: SortOption;
  images: ImageFile[];
  imagesCount: number;
  isGenerating: boolean;
  generationProgress: number;
  onSettingsChange: (settings: Partial<VideoSettingsType>) => void;
  onSortOptionChange: (option: SortOption) => void;
  onGenerateVideo: () => void;
}

function detectPreset(width: number, height: number, images: ImageFile[]): ResolutionPreset {
  const first = images[0];
  if (first?.width && first?.height) {
    const fitted = fitExportDimensions(first.width, first.height);
    if (width === fitted.width && height === fitted.height) {
      return 'match';
    }
  }
  if (width === 1920 && height === 1080) return '1080p';
  if (width === 1280 && height === 720) return '720p';
  return 'custom';
}

export function VideoSettings({
  settings,
  videoCodecs,
  sortOption,
  images,
  imagesCount,
  isGenerating,
  generationProgress,
  onSettingsChange,
  onSortOptionChange,
  onGenerateVideo,
}: VideoSettingsProps) {
  const [preset, setPreset] = useState<ResolutionPreset>(() =>
    detectPreset(settings.videoWidth, settings.videoHeight, images)
  );

  useEffect(() => {
    setPreset(detectPreset(settings.videoWidth, settings.videoHeight, images));
  }, [settings.videoWidth, settings.videoHeight, images]);

  const videoDuration = useMemo(() => {
    return imagesCount / settings.fps;
  }, [imagesCount, settings.fps]);

  const currentStage = useMemo(() => {
    if (generationProgress < 10) return 'Initializing…';
    if (generationProgress < 30) return 'Processing images…';
    if (generationProgress < 70) return 'Encoding video…';
    if (generationProgress < 95) return 'Finalizing…';
    return 'Complete';
  }, [generationProgress]);

  const handleSettingChange = useCallback((key: keyof VideoSettingsType, value: number | string) => {
    onSettingsChange({ [key]: value });
  }, [onSettingsChange]);

  const handleSortOptionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortOptionChange(e.target.value as SortOption);
  }, [onSortOptionChange]);

  const handleCodecChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    handleSettingChange('selectedCodec', e.target.value);
  }, [handleSettingChange]);

  const handleFpsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleSettingChange('fps', parseFloat(e.target.value));
  }, [handleSettingChange]);

  const handleWidthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPreset('custom');
    const fitted = fitExportDimensions(parseInt(e.target.value, 10) || 1920, settings.videoHeight);
    onSettingsChange({ videoWidth: fitted.width, videoHeight: fitted.height });
  }, [onSettingsChange, settings.videoHeight]);

  const handleHeightChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPreset('custom');
    const fitted = fitExportDimensions(settings.videoWidth, parseInt(e.target.value, 10) || 1080);
    onSettingsChange({ videoWidth: fitted.width, videoHeight: fitted.height });
  }, [onSettingsChange, settings.videoWidth]);

  const applyMatchFirst = useCallback(() => {
    const first = images[0];
    if (!first) return;

    const applySize = (width: number, height: number) => {
      const fitted = fitExportDimensions(width, height);
      onSettingsChange({ videoWidth: fitted.width, videoHeight: fitted.height });
      if (fitted.scaled) {
        toast.message(`Export size limited to ${fitted.width}×${fitted.height}`, {
          description: 'Source stills are larger than the max encode size.',
        });
      }
    };

    if (first.width && first.height) {
      applySize(first.width, first.height);
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      applySize(img.naturalWidth, img.naturalHeight);
    };
    img.src = first.url;
  }, [images, onSettingsChange]);

  const handlePresetChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as ResolutionPreset;
    setPreset(next);

    if (next === '1080p') {
      onSettingsChange({ videoWidth: 1920, videoHeight: 1080 });
      return;
    }
    if (next === '720p') {
      onSettingsChange({ videoWidth: 1280, videoHeight: 720 });
      return;
    }
    if (next === 'match') {
      applyMatchFirst();
    }
  }, [applyMatchFirst, onSettingsChange]);

  useEffect(() => {
    if (preset !== 'match') return;
    const first = images[0];
    if (first?.width && first?.height) {
      const fitted = fitExportDimensions(first.width, first.height);
      if (settings.videoWidth !== fitted.width || settings.videoHeight !== fitted.height) {
        onSettingsChange({ videoWidth: fitted.width, videoHeight: fitted.height });
      }
    }
  }, [preset, images, settings.videoWidth, settings.videoHeight, onSettingsChange]);

  if (imagesCount === 0) return null;

  const matchLabel = (() => {
    const first = images[0];
    if (!first?.width || !first?.height) return 'Match first image';
    const fitted = fitExportDimensions(first.width, first.height);
    if (fitted.scaled) {
      return `Match first (fit ${fitted.width}×${fitted.height})`;
    }
    return `Match first (${fitted.width}×${fitted.height})`;
  })();

  return (
    <section className="surface p-4 md:p-5" aria-labelledby="export-heading" data-testid="video-settings">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="export-heading" className="font-display text-lg font-semibold text-ink">
            Export
          </h2>
          <p className="text-sm text-ink-muted">
            {imagesCount} frames · {videoDuration.toFixed(2)}s at {settings.fps} fps
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div>
          <label htmlFor="sort-order" className="field-label">Sort</label>
          <select
            id="sort-order"
            value={sortOption}
            onChange={handleSortOptionChange}
            className="field-control"
          >
            <option value="manual">Manual (drag)</option>
            <option value="name">Alphabetical</option>
            <option value="date">Date modified</option>
            <option value="size">File size</option>
          </select>
        </div>

        <div>
          <label htmlFor="video-codec" className="field-label">Codec</label>
          <select
            id="video-codec"
            value={settings.selectedCodec}
            onChange={handleCodecChange}
            className="field-control"
          >
            {videoCodecs.map((codec) => (
              <option
                key={codec.mimeType}
                value={codec.mimeType}
                disabled={!codec.supported}
              >
                {codec.name} ({codec.extension.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="fps" className="field-label">FPS</label>
          <input
            id="fps"
            type="number"
            min="0.1"
            max="30"
            step="0.1"
            value={settings.fps}
            onChange={handleFpsChange}
            className="field-control"
          />
        </div>

        <div>
          <label htmlFor="resolution-preset" className="field-label">Size</label>
          <select
            id="resolution-preset"
            value={preset}
            onChange={handlePresetChange}
            className="field-control"
          >
            <option value="match">{matchLabel}</option>
            <option value="1080p">1080p (1920×1080)</option>
            <option value="720p">720p (1280×720)</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div>
          <label htmlFor="video-width" className="field-label">Width</label>
          <input
            id="video-width"
            type="number"
            min="480"
            max="3840"
            step="1"
            value={settings.videoWidth}
            onChange={handleWidthChange}
            className="field-control"
            disabled={preset !== 'custom'}
          />
        </div>

        <div>
          <label htmlFor="video-height" className="field-label">Height</label>
          <input
            id="video-height"
            type="number"
            min="360"
            max="2160"
            step="1"
            value={settings.videoHeight}
            onChange={handleHeightChange}
            className="field-control"
            disabled={preset !== 'custom'}
          />
        </div>
      </div>

      {isGenerating && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm text-ink-muted">
            <span>{currentStage}</span>
            <span className="font-medium text-ink">{generationProgress.toFixed(0)}%</span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuenow={generationProgress} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="progress-fill"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={onGenerateVideo}
          disabled={isGenerating || imagesCount === 0}
          className="btn-primary w-full py-3 text-base"
        >
          {isGenerating ? 'Generating…' : 'Generate Video'}
        </button>
      </div>
    </section>
  );
}
