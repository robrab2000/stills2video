export interface ImageFile {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  lastModified: number;
  width?: number;
  height?: number;
  type: string;
}

export type SortOption = "manual" | "name" | "date" | "size";

export interface VideoCodec {
  name: string;
  mimeType: string;
  extension: string;
  supported: boolean;
  quality?: 'high' | 'medium' | 'low';
  compatibility?: {
    chrome: boolean;
    firefox: boolean;
    safari: boolean;
    edge: boolean;
  };
}

export interface VideoPreview {
  url: string;
  blob: Blob;
  extension: string;
  id: string;
  timestamp: number;
  name: string;
  thumbnailUrl?: string;
  size?: number;
  duration?: number;
  settings?: VideoSettings;
}

export interface VideoSettings {
  fps: number;
  videoWidth: number;
  videoHeight: number;
  selectedCodec: string;
  quality?: 'high' | 'medium' | 'low';
  bitrate?: number;
}

export interface UIState {
  isGenerating: boolean;
  generationProgress: number;
  draggedIndex: number | null;
  showPreview: boolean;
  videoPreview: VideoPreview | null;
  collapsedPanels: {
    settings: boolean;
    generatedVideos: boolean;
    images: boolean;
  };
  notifications: Notification[];
  errors: AppError[];
  warnings: AppWarning[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
  duration?: number;
  dismissed?: boolean;
}

export interface AppError {
  id: string;
  type: 'validation' | 'processing' | 'network' | 'system';
  message: string;
  details?: string;
  timestamp: number;
  resolved?: boolean;
}

export interface AppWarning {
  id: string;
  type: 'performance' | 'compatibility' | 'quality';
  message: string;
  details?: string;
  timestamp: number;
  dismissed?: boolean;
}

export interface AppState {
  images: ImageFile[];
  generatedVideos: VideoPreview[];
  settings: VideoSettings;
  ui: UIState;
  videoCodecs: VideoCodec[];
  // Enhanced state properties
  history: {
    recentVideos: VideoPreview[];
    recentSettings: VideoSettings[];
  };
  performance: {
    lastGenerationTime?: number;
    averageGenerationTime?: number;
    memoryUsage?: number;
  };
  preferences: {
    autoSave: boolean;
    defaultSettings: VideoSettings;
    theme: 'light' | 'dark' | 'auto';
    language: string;
  };
}

export type AppAction = 
  // Image management
  | { type: 'ADD_IMAGES'; payload: ImageFile[] }
  | { type: 'REMOVE_IMAGE'; payload: string }
  | { type: 'CLEAR_ALL_IMAGES' }
  | { type: 'SORT_IMAGES'; payload: SortOption }
  | { type: 'REORDER_IMAGES'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'UPDATE_IMAGE_METADATA'; payload: { id: string; metadata: Partial<ImageFile> } }
  
  // Video management
  | { type: 'ADD_GENERATED_VIDEO'; payload: VideoPreview }
  | { type: 'REMOVE_GENERATED_VIDEO'; payload: string }
  | { type: 'CLEAR_ALL_VIDEOS' }
  | { type: 'UPDATE_VIDEO_METADATA'; payload: { id: string; metadata: Partial<VideoPreview> } }
  
  // Settings management
  | { type: 'UPDATE_SETTINGS'; payload: Partial<VideoSettings> }
  | { type: 'RESET_SETTINGS' }
  | { type: 'SAVE_SETTINGS_PRESET'; payload: { name: string; settings: VideoSettings } }
  | { type: 'LOAD_SETTINGS_PRESET'; payload: string }
  
  // UI state management
  | { type: 'SET_UI_STATE'; payload: Partial<UIState> }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id' | 'timestamp'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'DISMISS_NOTIFICATION'; payload: string }
  | { type: 'ADD_ERROR'; payload: Omit<AppError, 'id' | 'timestamp'> }
  | { type: 'RESOLVE_ERROR'; payload: string }
  | { type: 'ADD_WARNING'; payload: Omit<AppWarning, 'id' | 'timestamp'> }
  | { type: 'DISMISS_WARNING'; payload: string }
  
  // Codec management
  | { type: 'SET_VIDEO_CODECS'; payload: VideoCodec[] }
  | { type: 'UPDATE_CODEC_INFO'; payload: { mimeType: string; info: Partial<VideoCodec> } }
  
  // History management
  | { type: 'ADD_TO_HISTORY'; payload: { type: 'video' | 'settings'; data: any } }
  | { type: 'CLEAR_HISTORY'; payload?: 'videos' | 'settings' }
  
  // Performance tracking
  | { type: 'UPDATE_PERFORMANCE'; payload: Partial<AppState['performance']> }
  
  // Preferences management
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<AppState['preferences']> }
  | { type: 'RESET_PREFERENCES' }
  
  // Bulk operations
  | { type: 'BULK_UPDATE'; payload: Partial<AppState> }
  | { type: 'RESET_STATE'; payload?: 'all' | 'images' | 'videos' | 'settings' | 'ui' };

export type AppDispatch = (action: AppAction) => void;

// Enhanced action creators for better type safety
export interface ActionCreators {
  // Image actions
  addImages: (images: ImageFile[]) => AppAction;
  removeImage: (id: string) => AppAction;
  clearAllImages: () => AppAction;
  reorderImages: (fromIndex: number, toIndex: number) => AppAction;
  
  // Video actions
  addGeneratedVideo: (video: VideoPreview) => AppAction;
  removeGeneratedVideo: (id: string) => AppAction;
  clearAllVideos: () => AppAction;
  
  // Settings actions
  updateSettings: (settings: Partial<VideoSettings>) => AppAction;
  resetSettings: () => AppAction;
  
  // UI actions
  setUIState: (state: Partial<UIState>) => AppAction;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => AppAction;
  removeNotification: (id: string) => AppAction;
  addError: (error: Omit<AppError, 'id' | 'timestamp'>) => AppAction;
  resolveError: (id: string) => AppAction;
  
  // Codec actions
  setVideoCodecs: (codecs: VideoCodec[]) => AppAction;
}