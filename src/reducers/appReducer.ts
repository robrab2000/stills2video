import { AppState, AppAction, VideoSettings, UIState } from '../types';

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_IMAGES':
      return {
        ...state,
        images: [...state.images, ...action.payload]
      };

    case 'REMOVE_IMAGE':
      const imageToRemove = state.images.find(img => img.id === action.payload);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.url);
      }
      return {
        ...state,
        images: state.images.filter(img => img.id !== action.payload)
      };

    case 'CLEAR_ALL_IMAGES':
      state.images.forEach(img => URL.revokeObjectURL(img.url));
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

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };

    case 'ADD_GENERATED_VIDEO':
      return {
        ...state,
        generatedVideos: [action.payload, ...state.generatedVideos]
      };

    case 'REMOVE_GENERATED_VIDEO':
      const videoToRemove = state.generatedVideos.find(v => v.id === action.payload);
      if (videoToRemove) {
        URL.revokeObjectURL(videoToRemove.url);
      }
      return {
        ...state,
        generatedVideos: state.generatedVideos.filter(v => v.id !== action.payload)
      };

    case 'CLEAR_ALL_VIDEOS':
      state.generatedVideos.forEach(video => URL.revokeObjectURL(video.url));
      return {
        ...state,
        generatedVideos: []
      };

    case 'SET_UI_STATE':
      return {
        ...state,
        ui: { ...state.ui, ...action.payload }
      };

    case 'SET_VIDEO_CODECS':
      return {
        ...state,
        videoCodecs: action.payload
      };

    default:
      return state;
  }
}