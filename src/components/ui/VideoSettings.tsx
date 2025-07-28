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
  if (imagesCount === 0) return null;

  const handleSettingChange = (key: keyof VideoSettingsType, value: any) => {
    onSettingsChange({ [key]: value });
  };

  const videoDuration = imagesCount / settings.fps;

  // Determine the current stage based on progress
  const getCurrentStage = () => {
    if (generationProgress < 10) return "Initializing...";
    if (generationProgress < 30) return "Processing images...";
    if (generationProgress < 70) return "Encoding video...";
    if (generationProgress < 95) return "Finalizing...";
    return "Complete!";
  };

  const getStageIcon = () => {
    if (generationProgress < 10) return "⚙️";
    if (generationProgress < 30) return "🖼️";
    if (generationProgress < 70) return "🎬";
    if (generationProgress < 95) return "✨";
    return "✅";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <button
        onClick={onTogglePanel}
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
                onChange={(e) => onSortOptionChange(e.target.value as SortOption)}
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
                onChange={(e) => handleSettingChange('selectedCodec', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {videoCodecs.map((codec) => (
                  <option
                    key={codec.mimeType}
                    value={codec.mimeType}
                    disabled={!codec.supported}
                    className={!codec.supported ? "text-gray-400" : ""}
                  >
                    {codec.name} {!codec.supported ? "(Not Supported)" : ""}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frames Per Second (FPS)
              </label>
              <input
                type="number"
                value={settings.fps}
                onChange={(e) => handleSettingChange('fps', Number(e.target.value))}
                min="0.1"
                max="30"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video Width
              </label>
              <input
                type="number"
                value={settings.videoWidth}
                onChange={(e) => handleSettingChange('videoWidth', Number(e.target.value))}
                min="480"
                max="3840"
                step="16"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video Height
              </label>
              <input
                type="number"
                value={settings.videoHeight}
                onChange={(e) => handleSettingChange('videoHeight', Number(e.target.value))}
                min="360"
                max="2160"
                step="16"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {imagesCount} images • Video duration: ~{videoDuration.toFixed(1)}s at {settings.fps} FPS
            </div>
            <button
              onClick={onGenerateVideo}
              disabled={isGenerating || imagesCount === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? "Generating..." : "Generate Video"}
            </button>
          </div>

          {/* Enhanced Progress Indicator */}
          {isGenerating && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getStageIcon()}</span>
                  <span className="font-medium text-gray-800">{getCurrentStage()}</span>
                </div>
                <span className="text-sm font-semibold text-green-600">
                  {Math.round(generationProgress)}%
                </span>
              </div>
              
              {/* Main Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
              
              {/* Progress Details */}
              <div className="flex justify-between text-xs text-gray-500">
                <span>Processing {imagesCount} images</span>
                <span>~{videoDuration.toFixed(1)}s video</span>
              </div>
              
              {/* Stage Indicators */}
              <div className="mt-3 flex justify-between text-xs">
                <div className={`flex items-center space-x-1 ${generationProgress >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
                  <span>⚙️</span>
                  <span>Init</span>
                </div>
                <div className={`flex items-center space-x-1 ${generationProgress >= 30 ? 'text-green-600' : 'text-gray-400'}`}>
                  <span>🖼️</span>
                  <span>Images</span>
                </div>
                <div className={`flex items-center space-x-1 ${generationProgress >= 70 ? 'text-green-600' : 'text-gray-400'}`}>
                  <span>🎬</span>
                  <span>Encode</span>
                </div>
                <div className={`flex items-center space-x-1 ${generationProgress >= 95 ? 'text-green-600' : 'text-gray-400'}`}>
                  <span>✨</span>
                  <span>Final</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}