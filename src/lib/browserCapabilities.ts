/**
 * Browser Capabilities Detection
 * Detects various browser features and capabilities for performance optimization
 */

export interface BrowserCapabilities {
  // Multithreading support
  webWorkers: boolean;
  sharedArrayBuffer: boolean;
  atomics: boolean;
  
  // Performance features
  performanceObserver: boolean;
  performanceMemory: boolean;
  requestIdleCallback: boolean;
  
  // Hardware capabilities
  hardwareConcurrency: number;
  deviceMemory: number | null;
  
  // Browser-specific features
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
  
  // FFmpeg-specific optimizations
  ffmpegMultithreading: boolean;
  ffmpegWebAssembly: boolean;
  ffmpegSharedMemory: boolean;
}

/**
 * Detects browser capabilities for performance optimization
 */
export function detectBrowserCapabilities(): BrowserCapabilities {
  if (typeof window === 'undefined') {
    return {
      webWorkers: false,
      sharedArrayBuffer: false,
      atomics: false,
      performanceObserver: false,
      performanceMemory: false,
      requestIdleCallback: false,
      hardwareConcurrency: 1,
      deviceMemory: null,
      isChrome: false,
      isFirefox: false,
      isSafari: false,
      isEdge: false,
      ffmpegMultithreading: false,
      ffmpegWebAssembly: false,
      ffmpegSharedMemory: false,
    };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isChrome = userAgent.includes('chrome') && !userAgent.includes('edge');
  const isFirefox = userAgent.includes('firefox');
  const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
  const isEdge = userAgent.includes('edge');

  // Detect multithreading capabilities
  const webWorkers = typeof Worker !== 'undefined';
  const sharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const atomics = typeof Atomics !== 'undefined';

  // Detect performance APIs
  const performanceObserver = typeof PerformanceObserver !== 'undefined';
  const performanceMemory = 'memory' in performance;
  
  // Safely check for requestIdleCallback
  const requestIdleCallback = 'requestIdleCallback' in window;

  // Get hardware information
  const hardwareConcurrency = navigator.hardwareConcurrency || 1;
  const deviceMemory = (navigator as any).deviceMemory || null;

  // Determine FFmpeg multithreading capabilities
  const ffmpegMultithreading = webWorkers && hardwareConcurrency > 1;
  const ffmpegWebAssembly = typeof WebAssembly !== 'undefined';
  const ffmpegSharedMemory = sharedArrayBuffer && atomics;

  return {
    webWorkers,
    sharedArrayBuffer,
    atomics,
    performanceObserver,
    performanceMemory,
    requestIdleCallback,
    hardwareConcurrency,
    deviceMemory,
    isChrome,
    isFirefox,
    isSafari,
    isEdge,
    ffmpegMultithreading,
    ffmpegWebAssembly,
    ffmpegSharedMemory,
  };
}

/**
 * Gets optimal thread count for FFmpeg operations
 */
export function getOptimalThreadCount(): number {
  const capabilities = detectBrowserCapabilities();
  
  if (!capabilities.ffmpegMultithreading) {
    return 1;
  }

  // Use hardware concurrency, but cap it to avoid overwhelming the system
  const maxThreads = Math.min(capabilities.hardwareConcurrency, 8);
  
  // For memory-constrained devices, use fewer threads
  if (capabilities.deviceMemory && capabilities.deviceMemory < 4) {
    return Math.min(maxThreads, 2);
  }
  
  return maxThreads;
}

/**
 * Checks if multithreading should be enabled for FFmpeg operations
 */
export function shouldEnableFFmpegMultithreading(): boolean {
  const capabilities = detectBrowserCapabilities();
  
  // Enable if we have the necessary capabilities and multiple cores
  return capabilities.ffmpegMultithreading && capabilities.hardwareConcurrency > 1;
}

/**
 * Gets browser-specific FFmpeg optimization flags
 */
export function getFFmpegOptimizationFlags(): string[] {
  const capabilities = detectBrowserCapabilities();
  const flags: string[] = [];

  // Thread count optimization
  if (capabilities.ffmpegMultithreading) {
    const threadCount = getOptimalThreadCount();
    flags.push(`-threads`, threadCount.toString());
  }

  // Browser-specific optimizations
  if (capabilities.isChrome) {
    // Chrome has good WebAssembly performance
    flags.push('-cpu-used', '0'); // Best quality
  } else if (capabilities.isFirefox) {
    // Firefox may benefit from different settings
    flags.push('-cpu-used', '1'); // Slightly faster
  } else if (capabilities.isSafari) {
    // Safari may need more conservative settings
    flags.push('-cpu-used', '2'); // Balanced
  }

  // Memory optimization for constrained devices
  if (capabilities.deviceMemory && capabilities.deviceMemory < 4) {
    flags.push('-max_muxing_queue_size', '1024');
  }

  return flags;
}

/**
 * Creates a performance-optimized FFmpeg command with multithreading
 */
export function createOptimizedFFmpegCommand(
  baseCommand: string[],
  enableMultithreading: boolean = true
): string[] {
  if (!enableMultithreading) {
    return baseCommand;
  }

  const optimizationFlags = getFFmpegOptimizationFlags();
  
  // Insert optimization flags after input parameters but before output
  const outputIndex = baseCommand.findIndex(arg => arg.endsWith('.mp4') || arg.endsWith('.webm'));
  
  if (outputIndex === -1) {
    // If no output found, append to end
    return [...baseCommand, ...optimizationFlags];
  }
  
  // Insert before output
  return [
    ...baseCommand.slice(0, outputIndex),
    ...optimizationFlags,
    ...baseCommand.slice(outputIndex)
  ];
}

/**
 * Logs browser capabilities for debugging
 */
export function logBrowserCapabilities(): void {
  const capabilities = detectBrowserCapabilities();
  
  console.log('🌐 Browser Capabilities:', {
    multithreading: capabilities.ffmpegMultithreading,
    threads: getOptimalThreadCount(),
    webWorkers: capabilities.webWorkers,
    sharedMemory: capabilities.ffmpegSharedMemory,
    hardwareConcurrency: capabilities.hardwareConcurrency,
    deviceMemory: capabilities.deviceMemory,
    browser: {
      chrome: capabilities.isChrome,
      firefox: capabilities.isFirefox,
      safari: capabilities.isSafari,
      edge: capabilities.isEdge,
    }
  });
}