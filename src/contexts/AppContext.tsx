"use client";

import { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, AppDispatch, AppAction } from '../types';
import { appReducer } from '../reducers/appReducer';
import { CodecService } from '../services/codecService';

const initialState: AppState = {
  images: [],
  generatedVideos: [],
  settings: {
    fps: 25,
    videoWidth: 1920,
    videoHeight: 1080,
    selectedCodec: CodecService.getDefaultCodec(),
  },
  ui: {
    isGenerating: false,
    generationProgress: 0,
    draggedIndex: null,
    showPreview: false,
    videoPreview: null,
    collapsedPanels: {
      settings: false,
      generatedVideos: false,
      images: false,
    },
  },
  videoCodecs: [],
};

const AppContext = createContext<AppState | undefined>(undefined);
const AppDispatchContext = createContext<AppDispatch | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
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