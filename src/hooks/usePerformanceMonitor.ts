import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  componentName: string;
  timestamp: number;
}

interface UsePerformanceMonitorOptions {
  componentName: string;
  enabled?: boolean;
  logToConsole?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export function usePerformanceMonitor({
  componentName,
  enabled = process.env.NODE_ENV === 'development',
  logToConsole = false,
  onMetricsUpdate
}: UsePerformanceMonitorOptions) {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  // Start measuring render time
  const startRender = useCallback(() => {
    if (!enabled) return;
    renderStartTime.current = performance.now();
  }, [enabled]);

  // End measuring render time and collect metrics
  const endRender = useCallback(() => {
    if (!enabled) return;
    
    const renderTime = performance.now() - renderStartTime.current;
    renderCount.current += 1;

    const metrics: PerformanceMetrics = {
      renderTime,
      componentName,
      timestamp: Date.now(),
      memoryUsage: (performance as any).memory?.usedJSHeapSize
    };

    if (logToConsole) {
      console.log(`[Performance] ${componentName}:`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        renderCount: renderCount.current,
        memoryUsage: metrics.memoryUsage ? `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB` : 'N/A'
      });
    }

    onMetricsUpdate?.(metrics);
  }, [enabled, componentName, logToConsole, onMetricsUpdate]);

  // Monitor memory usage
  const getMemoryUsage = useCallback(() => {
    if (!enabled || !(performance as any).memory) return null;
    
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit
    };
  }, [enabled]);

  // Monitor frame rate
  const useFrameRateMonitor = useCallback((callback?: (fps: number) => void) => {
    if (!enabled) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFrameRate = (currentTime: number) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        callback?.(fps);
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFrameRate);
    };

    animationId = requestAnimationFrame(measureFrameRate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [enabled]);

  // Monitor long tasks
  const useLongTaskMonitor = useCallback((threshold = 50, callback?: (duration: number) => void) => {
    if (!enabled || !('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > threshold) {
          callback?.(entry.duration);
          if (logToConsole) {
            console.warn(`[Performance] Long task detected: ${entry.duration.toFixed(2)}ms`, entry);
          }
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });

    return () => {
      observer.disconnect();
    };
  }, [enabled, logToConsole]);

  // Monitor layout shifts
  const useLayoutShiftMonitor = useCallback((callback?: (score: number) => void) => {
    if (!enabled || !('PerformanceObserver' in window)) return;

    let cumulativeLayoutShift = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          cumulativeLayoutShift += (entry as any).value;
          callback?.(cumulativeLayoutShift);
        }
      }
    });

    observer.observe({ entryTypes: ['layout-shift'] });

    return () => {
      observer.disconnect();
    };
  }, [enabled]);

  // Auto-start render measurement on mount
  useEffect(() => {
    startRender();
    return () => {
      endRender();
    };
  }, [startRender, endRender]);

  return {
    startRender,
    endRender,
    getMemoryUsage,
    useFrameRateMonitor,
    useLongTaskMonitor,
    useLayoutShiftMonitor,
    renderCount: renderCount.current
  };
}