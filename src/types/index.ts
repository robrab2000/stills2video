export interface ImageFile {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  lastModified: number;
}

export type SortOption = "manual" | "name" | "date" | "size";

export interface VideoCodec {
  name: string;
  mimeType: string;
  extension: string;
  supported: boolean;
}

export interface VideoPreview {
  url: string;
  blob: Blob;
  extension: string;
  id: string;
  timestamp: number;
  name: string;
  thumbnailUrl?: string;
}

export interface VideoSettings {
  fps: number;
  videoWidth: number;
  videoHeight: number;
  selectedCodec: string;
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
}

export interface AppState {
  images: ImageFile[];
  generatedVideos: VideoPreview[];
  settings: VideoSettings;
  ui: UIState;
  videoCodecs: VideoCodec[];
}

export type AppAction = 
  | { type: 'ADD_IMAGES'; payload: ImageFile[] }
  | { type: 'REMOVE_IMAGE'; payload: string }
  | { type: 'CLEAR_ALL_IMAGES' }
  | { type: 'SORT_IMAGES'; payload: SortOption }
  | { type: 'REORDER_IMAGES'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<VideoSettings> }
  | { type: 'ADD_GENERATED_VIDEO'; payload: VideoPreview }
  | { type: 'REMOVE_GENERATED_VIDEO'; payload: string }
  | { type: 'CLEAR_ALL_VIDEOS' }
  | { type: 'SET_UI_STATE'; payload: Partial<UIState> }
  | { type: 'SET_VIDEO_CODECS'; payload: VideoCodec[] };

export type AppDispatch = (action: AppAction) => void;