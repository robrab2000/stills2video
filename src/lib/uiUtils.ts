/**
 * Formats file size in bytes to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Formats duration in seconds to human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Formats timestamp to readable date/time
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    return `${diffInMinutes} minutes ago`;
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)} hours ago`;
  } else if (diffInHours < 48) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Generates a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Debounces a function call
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
 * Throttles a function call
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
 * Clamps a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Rounds a number to a specified number of decimal places
 */
export function roundTo(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Converts a percentage to a value between 0 and 1
 */
export function percentageToDecimal(percentage: number): number {
  return clamp(percentage / 100, 0, 1);
}

/**
 * Converts a decimal value to a percentage
 */
export function decimalToPercentage(decimal: number): number {
  return roundTo(clamp(decimal * 100, 0, 100), 1);
}

/**
 * Formats a number with appropriate units
 */
export function formatNumber(value: number, unit: string = ''): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M${unit}`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K${unit}`;
  } else {
    return `${value}${unit}`;
  }
}

/**
 * Gets a color based on a value and range
 */
export function getColorForValue(
  value: number,
  min: number,
  max: number,
  colors: string[] = ['#ef4444', '#f59e0b', '#10b981']
): string {
  const normalized = (value - min) / (max - min);
  const index = Math.floor(normalized * (colors.length - 1));
  return colors[Math.min(index, colors.length - 1)];
}

/**
 * Gets a CSS class based on a condition
 */
export function getConditionalClass(
  condition: boolean,
  trueClass: string,
  falseClass: string = ''
): string {
  return condition ? trueClass : falseClass;
}

/**
 * Merges multiple CSS classes
 */
export function mergeClasses(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Truncates text to a specified length
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a string to title case
 */
export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Formats a number as currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

/**
 * Gets the appropriate icon for a file type
 */
export function getFileTypeIcon(fileType: string): string {
  if (fileType.startsWith('image/')) {
    return '🖼️';
  } else if (fileType.startsWith('video/')) {
    return '🎬';
  } else if (fileType.includes('pdf')) {
    return '📄';
  } else if (fileType.includes('text')) {
    return '📝';
  } else {
    return '📁';
  }
}

/**
 * Validates an email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the file extension from a filename
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * Removes the file extension from a filename
 */
export function removeFileExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '');
}

/**
 * Formats a progress percentage
 */
export function formatProgress(progress: number): string {
  return `${Math.round(progress)}%`;
}

/**
 * Gets a progress color based on percentage
 */
export function getProgressColor(progress: number): string {
  if (progress < 30) return '#ef4444'; // red
  if (progress < 70) return '#f59e0b'; // yellow
  return '#10b981'; // green
}

/**
 * Animates a value over time
 */
export function animateValue(
  start: number,
  end: number,
  duration: number,
  onUpdate: (value: number) => void,
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' = 'linear'
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    
    function update(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      let easedProgress = progress;
      switch (easing) {
        case 'easeIn':
          easedProgress = progress * progress;
          break;
        case 'easeOut':
          easedProgress = 1 - (1 - progress) * (1 - progress);
          break;
        case 'easeInOut':
          easedProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - 2 * (1 - progress) * (1 - progress);
          break;
      }
      
      const currentValue = start + (end - start) * easedProgress;
      onUpdate(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        resolve();
      }
    }
    
    requestAnimationFrame(update);
  });
}