"use client";

import { useEffect, useState } from 'react';
import { getMemoryInfo } from '../../lib/performanceUtils';
import { VideoService } from '../../services/videoService';
import { isMultithreadingAvailable } from '../../lib/ffmpegWorkerManager';
import { shouldEnableFFmpegMultithreading, getOptimalThreadCount, getFFmpegManager } from '../../lib/ffmpegUtils';

interface PerformanceMonitorProps {
  enabled?: boolean;
  showDetails?: boolean;
}

export function PerformanceMonitor({ 
  enabled = process.env.NODE_ENV === 'development',
  showDetails = false 
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<{
    fps: number;
    memory: any;
    renderTime: number;
    longTasks: number;
    multithreading: {
      enabled: boolean;
      available: boolean;
      optimalThreads: number;
      ffmpegReady: boolean;
    };
  }>({
    fps: 0,
    memory: null,
    renderTime: 0,
    longTasks: 0,
    multithreading: {
      enabled: false,
      available: false,
      optimalThreads: 1,
      ffmpegReady: false,
    }
  });

  const [isVisible, setIsVisible] = useState(false);

  // Frame rate monitoring
  useEffect(() => {
    if (!enabled) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFrameRate = (currentTime: number) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        setMetrics(prev => ({ ...prev, fps }));
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

  // Long task monitoring
  useEffect(() => {
    if (!enabled || !('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          setMetrics(prev => ({ ...prev, longTasks: prev.longTasks + 1 }));
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });

    return () => {
      observer.disconnect();
    };
  }, [enabled]);

  // Memory monitoring
  useEffect(() => {
    if (!enabled) return;

    const updateMemory = () => {
      const memory = getMemoryInfo();
      setMetrics(prev => ({ ...prev, memory }));
    };

    updateMemory();
    const interval = setInterval(updateMemory, 2000);

    return () => clearInterval(interval);
  }, [enabled]);

  // Multithreading status monitoring
  useEffect(() => {
    if (!enabled) return;

    const updateMultithreadingStatus = () => {
      const multithreading = {
        enabled: shouldEnableFFmpegMultithreading(),
        available: isMultithreadingAvailable(),
        optimalThreads: getOptimalThreadCount(),
        ffmpegReady: getFFmpegManager().isFFmpegLoaded(),
      };
      
      setMetrics(prev => ({ ...prev, multithreading }));
    };

    updateMultithreadingStatus();
    const interval = setInterval(updateMultithreadingStatus, 5000);

    return () => clearInterval(interval);
  }, [enabled]);

  // Render time monitoring
  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      setMetrics(prev => ({ ...prev, renderTime }));
    };
  }, [enabled]);

  if (!enabled) return null;

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-500';
    if (value <= thresholds.warning) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMultithreadingStatus = () => {
    const { enabled, available, optimalThreads, ffmpegReady } = metrics.multithreading;
    
    if (!enabled) return { status: 'Disabled', color: 'text-gray-500' };
    if (!available) return { status: 'Unavailable', color: 'text-red-500' };
    if (!ffmpegReady) return { status: 'FFmpeg Loading', color: 'text-yellow-500' };
    return { status: `Active (${optimalThreads} threads)`, color: 'text-green-500' };
  };

  const multithreadingStatus = getMultithreadingStatus();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
        title="Performance Monitor"
      >
        📊
      </button>

      {/* Performance Dashboard */}
      {isVisible && (
        <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 min-w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Performance Monitor
            </h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          {/* Basic Metrics */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400">FPS:</span>
              <span className={`text-xs font-mono ${getPerformanceColor(metrics.fps, { good: 55, warning: 30 })}`}>
                {metrics.fps}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400">Memory:</span>
              <span className={`text-xs font-mono ${getPerformanceColor(metrics.memory?.usedJSHeapSize || 0, { good: 50 * 1024 * 1024, warning: 100 * 1024 * 1024 })}`}>
                {metrics.memory ? `${Math.round(metrics.memory.usedJSHeapSize / (1024 * 1024))}MB` : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400">Render Time:</span>
              <span className={`text-xs font-mono ${getPerformanceColor(metrics.renderTime, { good: 16, warning: 33 })}`}>
                {metrics.renderTime.toFixed(1)}ms
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400">Long Tasks:</span>
              <span className={`text-xs font-mono ${getPerformanceColor(metrics.longTasks, { good: 0, warning: 2 })}`}>
                {metrics.longTasks}
              </span>
            </div>
          </div>

          {/* Multithreading Status */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">Multithreading:</span>
              <span className={`text-xs font-mono ${multithreadingStatus.color}`}>
                {multithreadingStatus.status}
              </span>
            </div>

            {showDetails && (
              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <div>• Hardware Concurrency: {navigator.hardwareConcurrency || 'Unknown'}</div>
                <div>• Web Workers: {typeof Worker !== 'undefined' ? 'Available' : 'Unavailable'}</div>
                <div>• SharedArrayBuffer: {typeof SharedArrayBuffer !== 'undefined' ? 'Available' : 'Unavailable'}</div>
                <div>• FFmpeg Ready: {metrics.multithreading.ffmpegReady ? 'Yes' : 'No'}</div>
              </div>
            )}
          </div>

          {/* Performance Indicators */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
            <div className="flex space-x-2">
              <div className={`w-3 h-3 rounded-full ${getPerformanceColor(metrics.fps, { good: 55, warning: 30 })}`}></div>
              <div className={`w-3 h-3 rounded-full ${getPerformanceColor(metrics.memory?.usedJSHeapSize || 0, { good: 50 * 1024 * 1024, warning: 100 * 1024 * 1024 })}`}></div>
              <div className={`w-3 h-3 rounded-full ${getPerformanceColor(metrics.renderTime, { good: 16, warning: 33 })}`}></div>
              <div className={`w-3 h-3 rounded-full ${multithreadingStatus.color}`}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}