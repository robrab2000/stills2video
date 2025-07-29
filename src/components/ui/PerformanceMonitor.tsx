import { useState, useEffect, useCallback } from 'react';
import { getMemoryInfo } from '../../lib/performanceUtils';

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
  }>({
    fps: 0,
    memory: null,
    renderTime: 0,
    longTasks: 0
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

  // Render time monitoring
  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();
    
    const updateRenderTime = () => {
      const renderTime = performance.now() - startTime;
      setMetrics(prev => ({ ...prev, renderTime }));
    };

    // Update render time after a short delay to measure initial render
    const timeout = setTimeout(updateRenderTime, 100);

    return () => clearTimeout(timeout);
  }, [enabled]);

  // Toggle visibility
  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={toggleVisibility}
        className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
        title="Performance Monitor"
      >
        📊
      </button>

      {/* Performance panel */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-64">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Performance Monitor</h3>
            <button
              onClick={toggleVisibility}
              className="text-gray-500 hover:text-gray-700 text-lg"
            >
              ×
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {/* FPS */}
            <div className="flex justify-between">
              <span className="text-gray-600">FPS:</span>
              <span className={`font-mono ${metrics.fps < 30 ? 'text-red-600' : metrics.fps < 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                {metrics.fps}
              </span>
            </div>

            {/* Memory Usage */}
            {metrics.memory && (
              <div className="flex justify-between">
                <span className="text-gray-600">Memory:</span>
                <span className={`font-mono ${metrics.memory.percentage > 80 ? 'text-red-600' : metrics.memory.percentage > 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {metrics.memory.percentage.toFixed(1)}%
                </span>
              </div>
            )}

            {/* Render Time */}
            <div className="flex justify-between">
              <span className="text-gray-600">Render:</span>
              <span className={`font-mono ${metrics.renderTime > 16 ? 'text-red-600' : metrics.renderTime > 8 ? 'text-yellow-600' : 'text-green-600'}`}>
                {metrics.renderTime.toFixed(1)}ms
              </span>
            </div>

            {/* Long Tasks */}
            <div className="flex justify-between">
              <span className="text-gray-600">Long Tasks:</span>
              <span className={`font-mono ${metrics.longTasks > 5 ? 'text-red-600' : metrics.longTasks > 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                {metrics.longTasks}
              </span>
            </div>

            {/* Detailed Memory Info */}
            {showDetails && metrics.memory && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Used: {(metrics.memory.used / 1024 / 1024).toFixed(1)} MB</div>
                  <div>Total: {(metrics.memory.total / 1024 / 1024).toFixed(1)} MB</div>
                  <div>Limit: {(metrics.memory.limit / 1024 / 1024).toFixed(1)} MB</div>
                </div>
              </div>
            )}
          </div>

          {/* Performance indicators */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex space-x-1">
              <div className={`w-3 h-3 rounded-full ${metrics.fps >= 50 ? 'bg-green-500' : metrics.fps >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`} title="FPS"></div>
              <div className={`w-3 h-3 rounded-full ${metrics.memory?.percentage <= 60 ? 'bg-green-500' : metrics.memory?.percentage <= 80 ? 'bg-yellow-500' : 'bg-red-500'}`} title="Memory"></div>
              <div className={`w-3 h-3 rounded-full ${metrics.renderTime <= 8 ? 'bg-green-500' : metrics.renderTime <= 16 ? 'bg-yellow-500' : 'bg-red-500'}`} title="Render Time"></div>
              <div className={`w-3 h-3 rounded-full ${metrics.longTasks <= 2 ? 'bg-green-500' : metrics.longTasks <= 5 ? 'bg-yellow-500' : 'bg-red-500'}`} title="Long Tasks"></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}