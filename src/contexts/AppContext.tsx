"use client";

import { createContext, useContext, useReducer, ReactNode, useCallback, useRef } from 'react';
import { AppState, AppDispatch, AppAction, VideoSettings, Notification, AppError, AppWarning } from '../types';
import { appReducer } from '../reducers/appReducer';
import { CodecService } from '../services/codecService';
import { UIService } from '../services/uiService';
import { MiddlewareManager, createDefaultMiddleware } from '../middleware/stateMiddleware';

const initialState: AppState = {
  images: [],
  generatedVideos: [],
  settings: {
    fps: 25,
    videoWidth: 1920,
    videoHeight: 1080,
    selectedCodec: CodecService.getDefaultCodec(),
    quality: 'high',
    bitrate: 5000000, // 5 Mbps
  },
  ui: UIService.createInitialUIState(),
  videoCodecs: [],
  // Enhanced state properties
  history: {
    recentVideos: [],
    recentSettings: [],
  },
  performance: {
    lastGenerationTime: undefined,
    averageGenerationTime: undefined,
    memoryUsage: undefined,
  },
  preferences: {
    autoSave: true,
    defaultSettings: {
      fps: 25,
      videoWidth: 1920,
      videoHeight: 1080,
      selectedCodec: 'video/mp4;codecs=h264',
      quality: 'high',
      bitrate: 5000000,
    },
    theme: 'light',
    language: 'en',
  },
};

const AppContext = createContext<AppState | undefined>(undefined);
const AppDispatchContext = createContext<AppDispatch | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const middlewareManagerRef = useRef<MiddlewareManager>(createDefaultMiddleware());

  // Enhanced dispatch with middleware support
  const enhancedDispatch = useCallback(async (action: AppAction) => {
    // Temporarily disable middleware to isolate the issue
    try {
      dispatch(action);
    } catch (error) {
      console.error('❌ Dispatch error:', error);
      // Dispatch an error action
      dispatch({
        type: 'ADD_ERROR',
        payload: {
          type: 'system',
          message: 'Action dispatch failed',
          details: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }, []);

  return (
    <AppContext.Provider value={state}>
      <AppDispatchContext.Provider value={enhancedDispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppContext.Provider>
  );
}

export function useAppState(): AppState {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
}

export function useAppDispatch(): AppDispatch {
  const context = useContext(AppDispatchContext);
  if (context === undefined) {
    throw new Error('useAppDispatch must be used within an AppProvider');
  }
  return context;
}

export function useApp(): [AppState, AppDispatch] {
  return [useAppState(), useAppDispatch()];
}

// Enhanced hooks for specific state slices
export function useImages() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  
  return {
    images: state.images,
    addImages: (images: any[]) => dispatch({ type: 'ADD_IMAGES', payload: images }),
    removeImage: (id: string) => dispatch({ type: 'REMOVE_IMAGE', payload: id }),
    clearAllImages: () => dispatch({ type: 'CLEAR_ALL_IMAGES' }),
    reorderImages: (fromIndex: number, toIndex: number) => 
      dispatch({ type: 'REORDER_IMAGES', payload: { fromIndex, toIndex } }),
  };
}

export function useVideos() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  
  return {
    videos: state.generatedVideos,
    addVideo: (video: any) => dispatch({ type: 'ADD_GENERATED_VIDEO', payload: video }),
    removeVideo: (id: string) => dispatch({ type: 'REMOVE_GENERATED_VIDEO', payload: id }),
    clearAllVideos: () => dispatch({ type: 'CLEAR_ALL_VIDEOS' }),
  };
}

export function useSettings() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  
  return {
    settings: state.settings,
    updateSettings: (settings: Partial<VideoSettings>) => 
      dispatch({ type: 'UPDATE_SETTINGS', payload: settings }),
    resetSettings: () => dispatch({ type: 'RESET_SETTINGS' }),
  };
}

export function useUI() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  
  return {
    ui: state.ui,
    setUIState: (uiState: Partial<typeof state.ui>) => 
      dispatch({ type: 'SET_UI_STATE', payload: uiState }),
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => 
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification }),
    removeNotification: (id: string) => 
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: id }),
    addError: (error: Omit<AppError, 'id' | 'timestamp'>) => 
      dispatch({ type: 'ADD_ERROR', payload: error }),
    resolveError: (id: string) => 
      dispatch({ type: 'RESOLVE_ERROR', payload: id }),
    addWarning: (warning: Omit<AppWarning, 'id' | 'timestamp'>) => 
      dispatch({ type: 'ADD_WARNING', payload: warning }),
    dismissWarning: (id: string) => 
      dispatch({ type: 'DISMISS_WARNING', payload: id }),
  };
}

export function usePerformance() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  
  return {
    performance: state.performance,
    updatePerformance: (performance: Partial<typeof state.performance>) => 
      dispatch({ type: 'UPDATE_PERFORMANCE', payload: performance }),
  };
}

export function usePreferences() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  
  return {
    preferences: state.preferences,
    updatePreferences: (preferences: Partial<typeof state.preferences>) => 
      dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences }),
    resetPreferences: () => dispatch({ type: 'RESET_PREFERENCES' }),
  };
}

export function useHistory() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  
  return {
    history: state.history,
    addToHistory: (type: 'video' | 'settings', data: any) => 
      dispatch({ type: 'ADD_TO_HISTORY', payload: { type, data } }),
    clearHistory: (type?: 'videos' | 'settings') => 
      dispatch({ type: 'CLEAR_HISTORY', payload: type }),
  };
}

// Hook for accessing middleware manager
export function useMiddleware() {
  const dispatch = useAppDispatch();
  
  return {
    addMiddleware: (middleware: any) => {
      // This would need to be implemented with a ref to the middleware manager
      console.log('Middleware management not yet implemented in hooks');
    },
    removeMiddleware: (name: string) => {
      console.log('Middleware management not yet implemented in hooks');
    }
  };
}