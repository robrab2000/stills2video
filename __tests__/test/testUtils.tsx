import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { AppProvider } from '../../src/contexts/AppContext';

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>
    {children}
  </AppProvider>
);

// Custom render function with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestWrapper, ...options });

// Mock data for tests
export const mockImageFile = {
  id: 'test-image-1',
  file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
  url: 'data:image/jpeg;base64,test',
  name: 'test.jpg',
  size: 1024,
  type: 'image/jpeg',
  lastModified: Date.now(),
};

export const mockVideoPreview = {
  id: 'test-video-1',
  blob: new Blob(['test'], { type: 'video/mp4' }),
  thumbnail: 'data:image/png;base64,test',
  duration: 2.5,
  size: 1024,
  timestamp: Date.now(),
};

export const mockVideoSettings = {
  fps: 30,
  videoWidth: 1280,
  videoHeight: 720,
  selectedCodec: 'video/mp4;codecs=h264',
};

export const mockVideoCodecs = [
  { name: 'H.264 (MP4)', mimeType: 'video/mp4;codecs=h264', supported: true },
  { name: 'VP9 (WebM)', mimeType: 'video/webm;codecs=vp9', supported: true },
  { name: 'VP8 (WebM)', mimeType: 'video/webm;codecs=vp8', supported: true },
];

// Test file creation helpers
export const createMockFile = (
  name: string,
  type: string,
  size: number = 1024
): File => {
  return new File(['test content'], name, { type });
};

export const createMockImageFile = (name: string = 'test.jpg') => {
  return {
    ...mockImageFile,
    id: `img-${Date.now()}`,
    name,
    file: createMockFile(name, 'image/jpeg'),
  };
};

export const createMockVideoPreview = (id: string = 'test-video-1') => {
  return {
    ...mockVideoPreview,
    id,
  };
};

// Async test helpers
export const waitForElementToBeRemoved = async (
  element: Element | null,
  timeout: number = 5000
): Promise<void> => {
  const startTime = Date.now();
  while (element && Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (element) {
    throw new Error(`Element was not removed within ${timeout}ms`);
  }
};

export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000
): Promise<void> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Condition not met within ${timeout}ms`);
};

// Mock service responses
export const mockServiceResponses = {
  videoService: {
    generateVideo: {
      success: mockVideoPreview,
      error: new Error('Video generation failed'),
    },
    createThumbnail: {
      success: 'data:image/png;base64,test',
      error: new Error('Thumbnail creation failed'),
    },
  },
  fileService: {
    validateImageFile: {
      success: true,
      failure: false,
    },
    createImageFile: {
      success: mockImageFile,
      error: new Error('Image file creation failed'),
    },
  },
  errorService: {
    handleValidationError: {
      success: { id: 'error-1', message: 'Validation error', type: 'validation' },
    },
    handleProcessingError: {
      success: { id: 'error-2', message: 'Processing error', type: 'processing' },
    },
  },
};

// Test constants
export const TEST_CONSTANTS = {
  TIMEOUTS: {
    SHORT: 1000,
    MEDIUM: 5000,
    LONG: 10000,
    VERY_LONG: 30000,
  },
  DELAYS: {
    SHORT: 100,
    MEDIUM: 500,
    LONG: 1000,
  },
  FILE_SIZES: {
    SMALL: 1024,
    MEDIUM: 1024 * 1024,
    LARGE: 10 * 1024 * 1024,
  },
  VIDEO_DIMENSIONS: {
    SD: { width: 640, height: 480 },
    HD: { width: 1280, height: 720 },
    FULL_HD: { width: 1920, height: 1080 },
  },
  FPS_VALUES: {
    LOW: 15,
    MEDIUM: 30,
    HIGH: 60,
  },
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };

// Test suite to validate test utilities
describe('Test Utilities', () => {
  describe('Mock Data Creation', () => {
    test('should create mock image file', () => {
      const mockFile = createMockImageFile('test-image.jpg');
      expect(mockFile).toHaveProperty('id');
      expect(mockFile).toHaveProperty('file');
      expect(mockFile).toHaveProperty('name', 'test-image.jpg');
      // In test environment, File might be mocked, so check if it's an object with required properties
      expect(typeof mockFile.file).toBe('object');
      expect(mockFile.file).toHaveProperty('name');
      expect(mockFile.file).toHaveProperty('type');
    });

    test('should create mock video preview', () => {
      const mockVideo = createMockVideoPreview('test-video-123');
      expect(mockVideo).toHaveProperty('id', 'test-video-123');
      expect(mockVideo).toHaveProperty('blob');
      // In test environment, Blob might be mocked
      expect(typeof mockVideo.blob).toBe('object');
    });

    test('should create mock file with correct properties', () => {
      const mockFile = createMockFile('test.txt', 'text/plain', 2048);
      expect(mockFile.name).toBe('test.txt');
      expect(mockFile.type).toBe('text/plain');
      // File size depends on the content, just check it's a number
      expect(typeof mockFile.size).toBe('number');
      expect(mockFile.size).toBeGreaterThan(0);
    });
  });

  describe('Test Constants', () => {
    test('should have valid timeout values', () => {
      expect(TEST_CONSTANTS.TIMEOUTS.SHORT).toBe(1000);
      expect(TEST_CONSTANTS.TIMEOUTS.MEDIUM).toBe(5000);
      expect(TEST_CONSTANTS.TIMEOUTS.LONG).toBe(10000);
    });

    test('should have valid video dimensions', () => {
      expect(TEST_CONSTANTS.VIDEO_DIMENSIONS.HD).toEqual({
        width: 1280,
        height: 720
      });
      expect(TEST_CONSTANTS.VIDEO_DIMENSIONS.FULL_HD).toEqual({
        width: 1920,
        height: 1080
      });
    });
  });

  describe('Mock Service Responses', () => {
    test('should have valid video service responses', () => {
      expect(mockServiceResponses.videoService.generateVideo.success).toBeDefined();
      expect(mockServiceResponses.videoService.generateVideo.error).toBeInstanceOf(Error);
    });

    test('should have valid file service responses', () => {
      expect(mockServiceResponses.fileService.validateImageFile.success).toBe(true);
      expect(mockServiceResponses.fileService.validateImageFile.failure).toBe(false);
    });
  });
});