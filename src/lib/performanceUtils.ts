// Performance utility functions for image processing and UI optimization

/**
 * Debounce function to limit the rate at which a function can fire
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function to ensure a function is called at most once in a specified time period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Efficient image preloading with priority queue
 */
export class ImagePreloader {
  private queue: Array<{ src: string; priority: number }> = [];
  private loading: Set<string> = new Set();
  private loaded: Set<string> = new Set();
  private maxConcurrent: number;

  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  preload(src: string, priority = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.loaded.has(src)) {
        resolve();
        return;
      }

      if (this.loading.has(src)) {
        // Wait for existing load to complete
        const checkLoaded = () => {
          if (this.loaded.has(src)) {
            resolve();
          } else if (this.loading.has(src)) {
            setTimeout(checkLoaded, 50);
          } else {
            reject(new Error('Image load failed'));
          }
        };
        checkLoaded();
        return;
      }

      this.queue.push({ src, priority });
      this.queue.sort((a, b) => b.priority - a.priority);
      this.processQueue();
    });
  }

  private processQueue() {
    if (this.loading.size >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const { src } = this.queue.shift()!;
    this.loading.add(src);

    const img = new Image();
    img.onload = () => {
      this.loaded.add(src);
      this.loading.delete(src);
      this.processQueue();
    };
    img.onerror = () => {
      this.loading.delete(src);
      this.processQueue();
    };
    img.src = src;
  }

  clear() {
    this.queue = [];
    this.loading.clear();
    this.loaded.clear();
  }
}

/**
 * Efficient batch processing with requestIdleCallback fallback
 */
export function batchProcess<T>(
  items: T[],
  processor: (item: T) => void,
  batchSize = 10,
  delay = 16
): Promise<void> {
  return new Promise((resolve) => {
    let index = 0;

    const processBatch = () => {
      const endIndex = Math.min(index + batchSize, items.length);
      
      for (let i = index; i < endIndex; i++) {
        processor(items[i]);
      }
      
      index = endIndex;
      
      if (index < items.length) {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(processBatch, { timeout: delay });
        } else {
          setTimeout(processBatch, delay);
        }
      } else {
        resolve();
      }
    };

    processBatch();
  });
}

/**
 * Efficient array chunking for large datasets
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Memory-efficient image resizing using canvas
 */
export function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw resized image
      ctx?.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to resize image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Efficient file size formatting
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Efficient date formatting with caching
 */
const dateCache = new Map<number, string>();
export function formatDate(timestamp: number): string {
  if (dateCache.has(timestamp)) {
    return dateCache.get(timestamp)!;
  }
  
  const formatted = new Date(timestamp).toLocaleString();
  dateCache.set(timestamp, formatted);
  
  // Limit cache size
  if (dateCache.size > 1000) {
    const firstKey = dateCache.keys().next().value;
    if (firstKey !== undefined) {
      dateCache.delete(firstKey);
    }
  }
  
  return formatted;
}

/**
 * Efficient intersection observer for lazy loading
 */
export function createIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  return new IntersectionObserver(callback, {
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  });
}

/**
 * Efficient scroll event handler with throttling
 */
export function createScrollHandler(
  callback: (scrollTop: number) => void,
  throttleMs = 16
): (e: Event) => void {
  let ticking = false;
  
  return (e: Event) => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollTop = (e.target as Element).scrollTop;
        callback(scrollTop);
        ticking = false;
      });
      ticking = true;
    }
  };
}

/**
 * Memory usage monitoring
 */
export function getMemoryInfo() {
  if (!(performance as any).memory) {
    return null;
  }
  
  const memory = (performance as any).memory;
  return {
    used: memory.usedJSHeapSize,
    total: memory.totalJSHeapSize,
    limit: memory.jsHeapSizeLimit,
    percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
  };
}

/**
 * Performance budget checker
 */
export class PerformanceBudget {
  private budgets: Map<string, number> = new Map();
  private measurements: Map<string, number[]> = new Map();

  setBudget(metric: string, budget: number) {
    this.budgets.set(metric, budget);
  }

  measure(metric: string, value: number) {
    if (!this.measurements.has(metric)) {
      this.measurements.set(metric, []);
    }
    this.measurements.get(metric)!.push(value);
    
    const budget = this.budgets.get(metric);
    if (budget && value > budget) {
      console.warn(`[Performance] Budget exceeded for ${metric}: ${value}ms > ${budget}ms`);
    }
  }

  getAverage(metric: string): number {
    const measurements = this.measurements.get(metric);
    if (!measurements || measurements.length === 0) return 0;
    
    return measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
  }

  clear() {
    this.measurements.clear();
  }
}