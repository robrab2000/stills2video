import { describe, test, expect, beforeEach, vi } from 'vitest';
import { 
  detectBrowserCapabilities, 
  shouldEnableFFmpegMultithreading, 
  getOptimalThreadCount,
  getFFmpegOptimizationFlags,
  createOptimizedFFmpegCommand 
} from '../../src/lib/browserCapabilities';
import { isMultithreadingAvailable } from '../../src/lib/ffmpegWorkerManager';

// Mock browser APIs
const mockNavigator = {
  hardwareConcurrency: 8,
  deviceMemory: 8,
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

const mockWorker = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null,
  onerror: null
};

describe('Multithreading Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock global objects
    global.navigator = mockNavigator as any;
    global.Worker = vi.fn(() => mockWorker as any);
    global.SharedArrayBuffer = {} as any;
    global.Atomics = {} as any;
    global.PerformanceObserver = vi.fn() as any;
    global.requestIdleCallback = vi.fn() as any;
  });

  describe('Browser Capabilities Detection', () => {
    test('should detect browser capabilities correctly', () => {
      const capabilities = detectBrowserCapabilities();
      
      expect(capabilities).toMatchObject({
        webWorkers: true,
        sharedArrayBuffer: true,
        atomics: true,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        isChrome: true,
        ffmpegMultithreading: true,
        ffmpegWebAssembly: true,
        ffmpegSharedMemory: true
      });
    });

    test('should handle missing browser APIs gracefully', () => {
      // Remove Worker support
      delete (global as any).Worker;
      
      const capabilities = detectBrowserCapabilities();
      
      expect(capabilities.webWorkers).toBe(false);
      expect(capabilities.ffmpegMultithreading).toBe(false);
    });

    test('should determine optimal thread count', () => {
      const threadCount = getOptimalThreadCount();
      
      // Should be limited by hardware concurrency
      expect(threadCount).toBe(8);
    });

    test('should reduce thread count for memory-constrained devices', () => {
      // Mock low memory device
      global.navigator = { ...mockNavigator, deviceMemory: 2 } as any;
      
      const threadCount = getOptimalThreadCount();
      
      // Should be limited to 2 threads for low memory
      expect(threadCount).toBe(2);
    });
  });

  describe('FFmpeg Optimization Flags', () => {
    test('should generate optimization flags for Chrome', () => {
      const flags = getFFmpegOptimizationFlags();
      
      expect(flags).toContain('-threads');
      expect(flags).toContain('8'); // hardware concurrency
      expect(flags).toContain('-cpu-used');
      expect(flags).toContain('0'); // best quality for Chrome
    });

    test('should create optimized FFmpeg commands', () => {
      const baseCommand = [
        '-f', 'concat',
        '-i', 'input.txt',
        '-c:v', 'libx264',
        'output.mp4'
      ];

      const optimizedCommand = createOptimizedFFmpegCommand(baseCommand);
      
      // Should include thread count flag
      expect(optimizedCommand).toContain('-threads');
      expect(optimizedCommand).toContain('8');
      
      // Should preserve original command structure
      expect(optimizedCommand).toContain('-f');
      expect(optimizedCommand).toContain('concat');
      expect(optimizedCommand).toContain('output.mp4');
    });

    test('should not modify command when multithreading disabled', () => {
      const baseCommand = [
        '-f', 'concat',
        '-i', 'input.txt',
        '-c:v', 'libx264',
        'output.mp4'
      ];

      const optimizedCommand = createOptimizedFFmpegCommand(baseCommand, false);
      
      // Should be identical to base command
      expect(optimizedCommand).toEqual(baseCommand);
    });
  });

  describe('Multithreading Availability', () => {
    test('should check if multithreading is available', () => {
      const available = isMultithreadingAvailable();
      
      // Should be false initially since worker manager isn't initialized
      expect(available).toBe(false);
    });

    test('should enable multithreading when conditions are met', () => {
      const shouldEnable = shouldEnableFFmpegMultithreading();
      
      // Should be true with our mock setup
      expect(shouldEnable).toBe(true);
    });
  });

  describe('Browser-Specific Optimizations', () => {
    test('should apply Chrome-specific optimizations', () => {
      global.navigator = { ...mockNavigator, userAgent: 'Chrome/120.0.0.0' } as any;
      
      const flags = getFFmpegOptimizationFlags();
      
      expect(flags).toContain('-cpu-used');
      expect(flags).toContain('0'); // Best quality for Chrome
    });

    test('should apply Firefox-specific optimizations', () => {
      global.navigator = { ...mockNavigator, userAgent: 'Firefox/120.0' } as any;
      
      const flags = getFFmpegOptimizationFlags();
      
      expect(flags).toContain('-cpu-used');
      expect(flags).toContain('1'); // Slightly faster for Firefox
    });

    test('should apply Safari-specific optimizations', () => {
      global.navigator = { ...mockNavigator, userAgent: 'Safari/537.36' } as any;
      
      const flags = getFFmpegOptimizationFlags();
      
      expect(flags).toContain('-cpu-used');
      expect(flags).toContain('2'); // Balanced for Safari
    });
  });

  describe('Memory Optimization', () => {
    test('should add memory optimization flags for low memory devices', () => {
      global.navigator = { ...mockNavigator, deviceMemory: 2 } as any;
      
      const flags = getFFmpegOptimizationFlags();
      
      expect(flags).toContain('-max_muxing_queue_size');
      expect(flags).toContain('1024');
    });

    test('should not add memory flags for high memory devices', () => {
      global.navigator = { ...mockNavigator, deviceMemory: 16 } as any;
      
      const flags = getFFmpegOptimizationFlags();
      
      expect(flags).not.toContain('-max_muxing_queue_size');
    });
  });
});