import { AppAction, AppState } from '../types';

export interface StateMiddleware {
  name: string;
  before?: (action: AppAction, state: AppState) => AppAction | null;
  after?: (action: AppAction, state: AppState, newState: AppState) => void;
}

// Logging middleware for debugging
export const loggingMiddleware: StateMiddleware = {
  name: 'logging',
  before: (action, state) => {
    console.group(`🔄 Action: ${action.type}`);
    console.log('Previous State:', state);
    console.log('Action:', action);
    return action;
  },
  after: (action, state, newState) => {
    console.log('New State:', newState);
    console.groupEnd();
  }
};

// Performance tracking middleware
export const performanceMiddleware: StateMiddleware = {
  name: 'performance',
  before: (action, state) => {
    if (action.type === 'ADD_GENERATED_VIDEO') {
      (action as any).__startTime = performance.now();
    }
    return action;
  },
  after: (action, state, newState) => {
    if (action.type === 'ADD_GENERATED_VIDEO' && (action as any).__startTime) {
      const duration = performance.now() - (action as any).__startTime;
      console.log(`⏱️ Video generation took ${duration.toFixed(2)}ms`);
    }
  }
};

// Validation middleware
export const validationMiddleware: StateMiddleware = {
  name: 'validation',
  before: (action, state) => {
    switch (action.type) {
      case 'ADD_IMAGES':
        if (!Array.isArray(action.payload) || action.payload.length === 0) {
          console.warn('⚠️ Invalid images payload:', action.payload);
          return null; // Prevent action
        }
        break;
      
      case 'UPDATE_SETTINGS':
        if (action.payload.fps && (action.payload.fps < 1 || action.payload.fps > 60)) {
          console.warn('⚠️ Invalid FPS value:', action.payload.fps);
          return null; // Prevent action
        }
        if (action.payload.videoWidth && action.payload.videoWidth < 1) {
          console.warn('⚠️ Invalid video width:', action.payload.videoWidth);
          return null; // Prevent action
        }
        if (action.payload.videoHeight && action.payload.videoHeight < 1) {
          console.warn('⚠️ Invalid video height:', action.payload.videoHeight);
          return null; // Prevent action
        }
        break;
      
      case 'ADD_GENERATED_VIDEO':
        if (!action.payload.id || !action.payload.blob) {
          console.warn('⚠️ Invalid video payload:', action.payload);
          return null; // Prevent action
        }
        break;
    }
    return action;
  }
};

// Persistence middleware for localStorage
export const persistenceMiddleware: StateMiddleware = {
  name: 'persistence',
  after: (action, state, newState) => {
    const persistActions = [
      'UPDATE_SETTINGS',
      'UPDATE_PREFERENCES',
      'ADD_GENERATED_VIDEO',
      'REMOVE_GENERATED_VIDEO'
    ];
    
    if (persistActions.includes(action.type)) {
      try {
        // Only persist non-sensitive data
        const dataToPersist = {
          settings: newState.settings,
          preferences: newState.preferences,
          history: newState.history,
          performance: newState.performance
        };
        localStorage.setItem('stills2video-state', JSON.stringify(dataToPersist));
      } catch (error) {
        console.warn('Failed to persist state:', error);
      }
    }
  }
};

// Error handling middleware
export const errorHandlingMiddleware: StateMiddleware = {
  name: 'errorHandling',
  before: (action, state) => {
    try {
      return action;
    } catch (error) {
      console.error('❌ Action error:', error);
      return {
        type: 'ADD_ERROR',
        payload: {
          type: 'system',
          message: 'Action execution failed',
          details: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
};

// Analytics middleware (for future use)
export const analyticsMiddleware: StateMiddleware = {
  name: 'analytics',
  after: (action, state, newState) => {
    // Track important user actions
    const trackableActions = [
      'ADD_IMAGES',
      'ADD_GENERATED_VIDEO',
      'UPDATE_SETTINGS',
      'CLEAR_ALL_IMAGES',
      'CLEAR_ALL_VIDEOS'
    ];
    
    if (trackableActions.includes(action.type)) {
      // In a real app, you'd send this to your analytics service
      console.log('📊 Analytics:', {
        action: action.type,
        timestamp: Date.now(),
        payload: 'payload' in action ? action.payload : undefined
      });
    }
  }
};

// Memory management middleware
export const memoryMiddleware: StateMiddleware = {
  name: 'memory',
  after: (action, state, newState) => {
    // Clean up old notifications after 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const oldNotifications = newState.ui.notifications.filter(
      n => n.timestamp < fiveMinutesAgo && n.dismissed
    );
    
    if (oldNotifications.length > 0) {
      // This would trigger a cleanup action
      console.log('🧹 Cleaning up old notifications:', oldNotifications.length);
    }
    
    // Limit history size
    if (newState.history.recentVideos.length > 20) {
      console.log('🧹 Trimming video history');
    }
    
    if (newState.history.recentSettings.length > 20) {
      console.log('🧹 Trimming settings history');
    }
  }
};

// Middleware manager
export class MiddlewareManager {
  private middlewares: StateMiddleware[] = [];
  
  constructor(middlewares: StateMiddleware[] = []) {
    this.middlewares = middlewares;
  }
  
  addMiddleware(middleware: StateMiddleware) {
    this.middlewares.push(middleware);
  }
  
  removeMiddleware(name: string) {
    this.middlewares = this.middlewares.filter(m => m.name !== name);
  }
  
  async processAction(action: AppAction, state: AppState): Promise<AppAction | null> {
    let processedAction = action;
    
    // Run before middleware
    for (const middleware of this.middlewares) {
      if (middleware.before) {
        const result = middleware.before(processedAction, state);
        if (result === null) {
          return null; // Action blocked
        }
        processedAction = result;
      }
    }
    
    return processedAction;
  }
  
  async processAfterAction(action: AppAction, state: AppState, newState: AppState) {
    // Run after middleware
    for (const middleware of this.middlewares) {
      if (middleware.after) {
        try {
          middleware.after(action, state, newState);
        } catch (error) {
          console.error(`Middleware ${middleware.name} error:`, error);
        }
      }
    }
  }
}

// Default middleware configuration
export const createDefaultMiddleware = (): MiddlewareManager => {
  return new MiddlewareManager([
    validationMiddleware,
    errorHandlingMiddleware,
    performanceMiddleware,
    persistenceMiddleware,
    memoryMiddleware,
    // Uncomment for debugging
    // loggingMiddleware,
    // analyticsMiddleware,
  ]);
};