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
  
  // Base thread count on hardware concurrency
  let threadCount = capabilities.hardwareConcurrency || 1;
  
  // Adjust based on device memory if available
  if (capabilities.deviceMemory) {
    // More memory = more threads, but cap at reasonable limits
    if (capabilities.deviceMemory >= 8) {
      threadCount = Math.min(threadCount, 8); // Cap at 8 threads for high memory
    } else if (capabilities.deviceMemory >= 4) {
      threadCount = Math.min(threadCount, 6); // Cap at 6 threads for medium memory
    } else {
      threadCount = Math.min(threadCount, 4); // Cap at 4 threads for low memory
    }
  } else {
    // No device memory info, use conservative limits
    threadCount = Math.min(threadCount, 4);
  }
  
  // Ensure minimum of 1 thread
  return Math.max(1, threadCount);
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
  const threadCount = getOptimalThreadCount();
  
  const flags: string[] = [];
  
  // Thread count optimization
  if (threadCount > 1) {
    flags.push('-threads', threadCount.toString());
  }
  
  // CPU usage optimization based on browser and capabilities
  if (capabilities.isChrome || capabilities.isEdge) {
    // Chrome/Edge can handle more aggressive settings
    flags.push('-cpu-used', '0'); // Fastest encoding
  } else if (capabilities.isFirefox) {
    // Firefox with more conservative settings
    flags.push('-cpu-used', '1'); // Balanced speed/quality
  } else {
    // Safari and other browsers
    flags.push('-cpu-used', '2'); // Conservative for compatibility
  }
  
  // Memory optimization
  if (capabilities.deviceMemory && capabilities.deviceMemory >= 4) {
    flags.push('-max_muxing_queue_size', '1024'); // Higher queue for more memory
  } else {
    flags.push('-max_muxing_queue_size', '512'); // Conservative queue
  }
  
  // Additional performance flags for high-end systems
  if (capabilities.hardwareConcurrency >= 6 && capabilities.deviceMemory && capabilities.deviceMemory >= 8) {
    flags.push('-thread_type', 'frame'); // Frame-based threading
    flags.push('-threads', 'auto'); // Let FFmpeg auto-detect optimal thread count
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