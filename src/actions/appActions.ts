import { 
  AppAction, 
  ImageFile, 
  VideoPreview, 
  VideoSettings, 
  VideoCodec,
  Notification,
  AppError,
  AppWarning,
  SortOption
} from '../types';

// Image Actions
export const addImages = (images: ImageFile[]): AppAction => ({
  type: 'ADD_IMAGES',
  payload: images
});

export const removeImage = (id: string): AppAction => ({
  type: 'REMOVE_IMAGE',
  payload: id
});

export const clearAllImages = (): AppAction => ({
  type: 'CLEAR_ALL_IMAGES'
});

export const sortImages = (option: SortOption): AppAction => ({
  type: 'SORT_IMAGES',
  payload: option
});

export const reorderImages = (fromIndex: number, toIndex: number): AppAction => ({
  type: 'REORDER_IMAGES',
  payload: { fromIndex, toIndex }
});

export const updateImageMetadata = (id: string, metadata: Partial<ImageFile>): AppAction => ({
  type: 'UPDATE_IMAGE_METADATA',
  payload: { id, metadata }
});

// Video Actions
export const addGeneratedVideo = (video: VideoPreview): AppAction => ({
  type: 'ADD_GENERATED_VIDEO',
  payload: video
});

export const removeGeneratedVideo = (id: string): AppAction => ({
  type: 'REMOVE_GENERATED_VIDEO',
  payload: id
});

export const clearAllVideos = (): AppAction => ({
  type: 'CLEAR_ALL_VIDEOS'
});

export const updateVideoMetadata = (id: string, metadata: Partial<VideoPreview>): AppAction => ({
  type: 'UPDATE_VIDEO_METADATA',
  payload: { id, metadata }
});

// Settings Actions
export const updateSettings = (settings: Partial<VideoSettings>): AppAction => ({
  type: 'UPDATE_SETTINGS',
  payload: settings
});

export const resetSettings = (): AppAction => ({
  type: 'RESET_SETTINGS'
});

export const saveSettingsPreset = (name: string, settings: VideoSettings): AppAction => ({
  type: 'SAVE_SETTINGS_PRESET',
  payload: { name, settings }
});

export const loadSettingsPreset = (name: string): AppAction => ({
  type: 'LOAD_SETTINGS_PRESET',
  payload: name
});

// UI Actions
export const setUIState = (state: any): AppAction => ({
  type: 'SET_UI_STATE',
  payload: state
});

export const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>): AppAction => ({
  type: 'ADD_NOTIFICATION',
  payload: notification
});

export const removeNotification = (id: string): AppAction => ({
  type: 'REMOVE_NOTIFICATION',
  payload: id
});

export const dismissNotification = (id: string): AppAction => ({
  type: 'DISMISS_NOTIFICATION',
  payload: id
});

export const addError = (error: Omit<AppError, 'id' | 'timestamp'>): AppAction => ({
  type: 'ADD_ERROR',
  payload: error
});

export const resolveError = (id: string): AppAction => ({
  type: 'RESOLVE_ERROR',
  payload: id
});

export const addWarning = (warning: Omit<AppWarning, 'id' | 'timestamp'>): AppAction => ({
  type: 'ADD_WARNING',
  payload: warning
});

export const dismissWarning = (id: string): AppAction => ({
  type: 'DISMISS_WARNING',
  payload: id
});

// Codec Actions
export const setVideoCodecs = (codecs: VideoCodec[]): AppAction => ({
  type: 'SET_VIDEO_CODECS',
  payload: codecs
});

export const updateCodecInfo = (mimeType: string, info: Partial<VideoCodec>): AppAction => ({
  type: 'UPDATE_CODEC_INFO',
  payload: { mimeType, info }
});

// History Actions
export const addToHistory = (type: 'video' | 'settings', data: any): AppAction => ({
  type: 'ADD_TO_HISTORY',
  payload: { type, data }
});

export const clearHistory = (type?: 'videos' | 'settings'): AppAction => ({
  type: 'CLEAR_HISTORY',
  payload: type
});

// Performance Actions
export const updatePerformance = (performance: any): AppAction => ({
  type: 'UPDATE_PERFORMANCE',
  payload: performance
});

// Preferences Actions
export const updatePreferences = (preferences: any): AppAction => ({
  type: 'UPDATE_PREFERENCES',
  payload: preferences
});

export const resetPreferences = (): AppAction => ({
  type: 'RESET_PREFERENCES'
});

// Bulk Actions
export const bulkUpdate = (updates: any): AppAction => ({
  type: 'BULK_UPDATE',
  payload: updates
});

export const resetState = (type?: 'all' | 'images' | 'videos' | 'settings' | 'ui'): AppAction => ({
  type: 'RESET_STATE',
  payload: type
});

// Convenience action creators for common operations
export const createSuccessNotification = (message: string, duration?: number) => 
  addNotification({ type: 'success', message, duration });

export const createErrorNotification = (message: string, duration?: number) => 
  addNotification({ type: 'error', message, duration });

export const createWarningNotification = (message: string, duration?: number) => 
  addNotification({ type: 'warning', message, duration });

export const createInfoNotification = (message: string, duration?: number) => 
  addNotification({ type: 'info', message, duration });

export const createValidationError = (message: string, details?: string) => 
  addError({ type: 'validation', message, details });

export const createProcessingError = (message: string, details?: string) => 
  addError({ type: 'processing', message, details });

export const createNetworkError = (message: string, details?: string) => 
  addError({ type: 'network', message, details });

export const createSystemError = (message: string, details?: string) => 
  addError({ type: 'system', message, details });

export const createPerformanceWarning = (message: string, details?: string) => 
  addWarning({ type: 'performance', message, details });

export const createCompatibilityWarning = (message: string, details?: string) => 
  addWarning({ type: 'compatibility', message, details });

export const createQualityWarning = (message: string, details?: string) => 
  addWarning({ type: 'quality', message, details });