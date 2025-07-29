import { AppState, AppAction, VideoSettings, UIState, Notification, AppError, AppWarning } from '../types';
import { FileService } from '../services/fileService';
import { UIService } from '../services/uiService';

// Helper function to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper function to get current timestamp
const getTimestamp = () => Date.now();

// Helper function to clean up URLs
const cleanupUrls = (items: any[]) => {
  items.forEach(item => {
    try {
      if (item.url) URL.revokeObjectURL(item.url);
      if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
    } catch (error) {
      console.warn('Failed to cleanup URL:', error);
    }
  });
};

export function appReducer(state: AppState, action: AppAction): AppState {
  try {
    console.log('🔄 Reducer called with action:', action.type, action);
    
    switch (action.type) {
      // Image management
      case 'ADD_IMAGES':
        console.log('📸 Adding images:', action.payload.length);
        return {
          ...state,
          images: [...state.images, ...action.payload]
        };

      case 'REMOVE_IMAGE':
        const imageToRemove = state.images.find(img => img.id === action.payload);
        if (imageToRemove) {
          cleanupUrls([imageToRemove]);
        }
        return {
          ...state,
          images: state.images.filter(img => img.id !== action.payload)
        };

      case 'CLEAR_ALL_IMAGES':
        cleanupUrls(state.images);
        return {
          ...state,
          images: []
        };

      case 'SORT_IMAGES':
        // Sorting is handled by the useImageManager hook
        return state;

      case 'REORDER_IMAGES':
        const { fromIndex, toIndex } = action.payload;
        const newImages = [...state.images];
        const draggedItem = newImages[fromIndex];
        newImages.splice(fromIndex, 1);
        newImages.splice(toIndex, 0, draggedItem);
        return {
          ...state,
          images: newImages
        };

      case 'UPDATE_IMAGE_METADATA':
        return {
          ...state,
          images: state.images.map(img => 
            img.id === action.payload.id 
              ? { ...img, ...action.payload.metadata }
              : img
          )
        };

      // Video management
      case 'ADD_GENERATED_VIDEO':
        const newVideo = {
          ...action.payload,
          size: action.payload.blob.size,
          settings: state.settings
        };
        return {
          ...state,
          generatedVideos: [newVideo, ...state.generatedVideos],
          history: {
            ...state.history,
            recentVideos: [newVideo, ...state.history.recentVideos.slice(0, 9)] // Keep last 10
          }
        };

      case 'REMOVE_GENERATED_VIDEO':
        const videoToRemove = state.generatedVideos.find(v => v.id === action.payload);
        if (videoToRemove) {
          cleanupUrls([videoToRemove]);
        }
        return {
          ...state,
          generatedVideos: state.generatedVideos.filter(v => v.id !== action.payload)
        };

      case 'CLEAR_ALL_VIDEOS':
        cleanupUrls(state.generatedVideos);
        return {
          ...state,
          generatedVideos: []
        };

      case 'UPDATE_VIDEO_METADATA':
        return {
          ...state,
          generatedVideos: state.generatedVideos.map(video => 
            video.id === action.payload.id 
              ? { ...video, ...action.payload.metadata }
              : video
          )
        };

      // Settings management
      case 'UPDATE_SETTINGS':
        const updatedSettings = { ...state.settings, ...action.payload };
        return {
          ...state,
          settings: updatedSettings,
          history: {
            ...state.history,
            recentSettings: [updatedSettings, ...state.history.recentSettings.slice(0, 9)] // Keep last 10
          }
        };

      case 'RESET_SETTINGS':
        return {
          ...state,
          settings: state.preferences.defaultSettings
        };

      case 'SAVE_SETTINGS_PRESET':
        // This would typically save to localStorage or backend
        return state;

      case 'LOAD_SETTINGS_PRESET':
        // This would typically load from localStorage or backend
        return state;

      // UI state management
      case 'SET_UI_STATE':
        return {
          ...state,
          ui: { ...state.ui, ...action.payload }
        };

      case 'ADD_NOTIFICATION':
        const newNotification: Notification = {
          id: generateId(),
          timestamp: getTimestamp(),
          ...action.payload
        };
        return {
          ...state,
          ui: {
            ...state.ui,
            notifications: [...state.ui.notifications, newNotification]
          }
        };

      case 'REMOVE_NOTIFICATION':
        return {
          ...state,
          ui: {
            ...state.ui,
            notifications: state.ui.notifications.filter(n => n.id !== action.payload)
          }
        };

      case 'DISMISS_NOTIFICATION':
        return {
          ...state,
          ui: {
            ...state.ui,
            notifications: state.ui.notifications.map(n => 
              n.id === action.payload ? { ...n, dismissed: true } : n
            )
          }
        };

      case 'ADD_ERROR':
        const newError: AppError = {
          id: generateId(),
          timestamp: getTimestamp(),
          resolved: false,
          ...action.payload
        };
        return {
          ...state,
          ui: {
            ...state.ui,
            errors: [...state.ui.errors, newError]
          }
        };

      case 'RESOLVE_ERROR':
        return {
          ...state,
          ui: {
            ...state.ui,
            errors: state.ui.errors.map(e => 
              e.id === action.payload ? { ...e, resolved: true } : e
            )
          }
        };

      case 'ADD_WARNING':
        const newWarning: AppWarning = {
          id: generateId(),
          timestamp: getTimestamp(),
          dismissed: false,
          ...action.payload
        };
        return {
          ...state,
          ui: {
            ...state.ui,
            warnings: [...state.ui.warnings, newWarning]
          }
        };

      case 'DISMISS_WARNING':
        return {
          ...state,
          ui: {
            ...state.ui,
            warnings: state.ui.warnings.map(w => 
              w.id === action.payload ? { ...w, dismissed: true } : w
            )
          }
        };

      // Codec management
      case 'SET_VIDEO_CODECS':
        return {
          ...state,
          videoCodecs: action.payload
        };

      case 'UPDATE_CODEC_INFO':
        return {
          ...state,
          videoCodecs: state.videoCodecs.map(codec => 
            codec.mimeType === action.payload.mimeType 
              ? { ...codec, ...action.payload.info }
              : codec
          )
        };

      // History management
      case 'ADD_TO_HISTORY':
        if (action.payload.type === 'video') {
          return {
            ...state,
            history: {
              ...state.history,
              recentVideos: [action.payload.data, ...state.history.recentVideos.slice(0, 9)]
            }
          };
        } else if (action.payload.type === 'settings') {
          return {
            ...state,
            history: {
              ...state.history,
              recentSettings: [action.payload.data, ...state.history.recentSettings.slice(0, 9)]
            }
          };
        }
        return state;

      case 'CLEAR_HISTORY':
        if (!action.payload || action.payload === 'videos') {
          return {
            ...state,
            history: {
              ...state.history,
              recentVideos: []
            }
          };
        } else if (action.payload === 'settings') {
          return {
            ...state,
            history: {
              ...state.history,
              recentSettings: []
            }
          };
        }
        return state;

      // Performance tracking
      case 'UPDATE_PERFORMANCE':
        return {
          ...state,
          performance: { ...state.performance, ...action.payload }
        };

      // Preferences management
      case 'UPDATE_PREFERENCES':
        return {
          ...state,
          preferences: { ...state.preferences, ...action.payload }
        };

      case 'RESET_PREFERENCES':
        return {
          ...state,
          preferences: {
            autoSave: true,
            defaultSettings: {
              fps: 25,
              videoWidth: 1920,
              videoHeight: 1080,
              selectedCodec: 'video/mp4;codecs=h264'
            },
            theme: 'light',
            language: 'en'
          }
        };

      // Bulk operations
      case 'BULK_UPDATE':
        return {
          ...state,
          ...action.payload
        };

      case 'RESET_STATE':
        if (!action.payload || action.payload === 'all') {
          // Clean up all URLs before resetting
          cleanupUrls([...state.images, ...state.generatedVideos]);
          return {
            ...state,
            images: [],
            generatedVideos: [],
            settings: state.preferences.defaultSettings,
            ui: UIService.createInitialUIState(),
            history: {
              recentVideos: [],
              recentSettings: []
            },
            performance: {},
            videoCodecs: []
          };
        } else if (action.payload === 'images') {
          cleanupUrls(state.images);
          return { ...state, images: [] };
        } else if (action.payload === 'videos') {
          cleanupUrls(state.generatedVideos);
          return { ...state, generatedVideos: [] };
        } else if (action.payload === 'settings') {
          return { ...state, settings: state.preferences.defaultSettings };
        } else if (action.payload === 'ui') {
          return { ...state, ui: UIService.createInitialUIState() };
        }
        return state;

      default:
        return state;
    }
  } catch (error) {
    console.error('❌ Error in appReducer:', error);
    return state; // Return current state to prevent crash
  }
}