import { useMemo, useCallback } from 'react';
import { VideoCodec, VideoSettings as VideoSettingsType, SortOption } from '../../types';

interface VideoSettingsProps {
  settings: VideoSettingsType;
  videoCodecs: VideoCodec[];
  sortOption: SortOption;
  imagesCount: number;
  isGenerating: boolean;
  generationProgress: number;
  onSettingsChange: (settings: Partial<VideoSettingsType>) => void;
  onSortOptionChange: (option: SortOption) => void;
  onGenerateVideo: () => void;
  onTogglePanel: () => void;
  isPanelCollapsed: boolean;
}

export function VideoSettings({
  settings,
  videoCodecs,
  sortOption,
  imagesCount,
  isGenerating,
  generationProgress,
  onSettingsChange,
  onSortOptionChange,
  onGenerateVideo,
  onTogglePanel,
  isPanelCollapsed
}: VideoSettingsProps) {
  // Memoize expensive calculations
  const videoDuration = useMemo(() => {
    return imagesCount / settings.fps;
  }, [imagesCount, settings.fps]);

  const currentStage = useMemo(() => {
    if (generationProgress < 10) return "Initializing...";
    if (generationProgress < 30) return "Processing images...";
    if (generationProgress < 70) return "Encoding video...";
    if (generationProgress < 95) return "Finalizing...";
    return "Complete!";
  }, [generationProgress]);

  const stageIcon = useMemo(() => {
    if (generationProgress < 10) return "⚙️";
    if (generationProgress < 30) return "🖼️";
    if (generationProgress < 70) return "🎬";
    if (generationProgress < 95) return "✨";
    return "✅";
  }, [generationProgress]);

  // Memoize event handlers
  const handleSettingChange = useCallback((key: keyof VideoSettingsType, value: any) => {
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
    handleSettingChange('videoWidth', parseInt(e.target.value));
  }, [handleSettingChange]);

  const handleHeightChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleSettingChange('videoHeight', parseInt(e.target.value));
  }, [handleSettingChange]);

  const handleTogglePanel = useCallback(() => {
    onTogglePanel();
  }, [onTogglePanel]);

  const handleGenerateVideo = useCallback(() => {
    onGenerateVideo();
  }, [onGenerateVideo]);

  if (imagesCount === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <button
        onClick={handleTogglePanel}
        className="w-full p-4 flex items-center hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-400 text-xs mr-2">
          {isPanelCollapsed ? '▶' : '▼'}
        </span>
        <h3 className="text-lg font-semibold">Generate Video</h3>
      </button>
      
      {!isPanelCollapsed && (
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order
              </label>
              <select
                value={sortOption}
                onChange={handleSortOptionChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="manual">Manual (drag to reorder)</option>
                <option value="name">Alphabetical</option>
                <option value="date">Date Modified</option>
                <option value="size">File Size</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video Codec
              </label>
              <select
                value={settings.selectedCodec}
                onChange={handleCodecChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {videoCodecs.map((codec) => (
                  <option
                    key={codec.mimeType}
                    value={codec.mimeType}
                    disabled={!codec.supported}
                    className={!codec.supported ? "text-gray-400" : ""}
                  >
                    {codec.name} ({codec.extension.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FPS
              </label>
              <input
                type="number"
                min="0.1"
                max="30"
                step="0.1"
                value={settings.fps}
                onChange={handleFpsChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Width
              </label>
              <input
                type="number"
                min="480"
                max="3840"
                step="1"
                value={settings.videoWidth}
                onChange={handleWidthChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height
              </label>
              <input
                type="number"
                min="360"
                max="2160"
                step="1"
                value={settings.videoHeight}
                onChange={handleHeightChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Estimated Duration: {videoDuration.toFixed(2)}s
              </span>
              <span className="text-sm text-gray-500">
                {imagesCount} images
              </span>
            </div>
            
            {isGenerating && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {stageIcon} {currentStage}
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {generationProgress.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <button
              onClick={handleGenerateVideo}
              disabled={isGenerating || imagesCount === 0}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Generate Video'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}