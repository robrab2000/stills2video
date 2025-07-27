import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock browser APIs
global.URL.createObjectURL = vi.fn(() => "mocked-url");
global.URL.revokeObjectURL = vi.fn();

// Mock MediaRecorder
global.MediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null,
  onstop: null,
}));
global.MediaRecorder.isTypeSupported = vi.fn(() => true);

// Mock Canvas
const mockCanvasContext = {
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  fillStyle: "",
};

// Mock HTMLCanvasElement methods
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => mockCanvasContext),
  configurable: true,
});

Object.defineProperty(HTMLCanvasElement.prototype, 'captureStream', {
  value: vi.fn(() => ({})),
  configurable: true,
});

// Mock File API
global.File = vi.fn().mockImplementation((content, name, options) => ({
  name,
  type: options?.type || "image/jpeg",
  size: Array.isArray(content) ? content.length : content.length,
  lastModified: Date.now(),
}));

// Mock FileList
global.FileList = vi.fn().mockImplementation(() => []);

// Mock Image constructor
global.Image = vi.fn().mockImplementation(() => ({
  src: "",
  onload: null,
  width: 100,
  height: 100,
}));

// Mock document.createElement for download link
const mockCreateElement = vi.fn();
mockCreateElement.mockReturnValue({
  href: "",
  download: "",
  click: vi.fn(),
});
global.document.createElement = mockCreateElement;

// Mock window.URL for createObjectURL
global.window.URL.createObjectURL = vi.fn(() => "mocked-url");
global.window.URL.revokeObjectURL = vi.fn();

// Mock console methods to reduce noise in tests
global.console.error = vi.fn();
global.console.warn = vi.fn();

// Mock window object for React DOM
global.window = global.window || {};
global.window.WebkitAnimation = undefined;
global.window.document = global.document;
global.window.navigator = global.navigator;
global.window.location = global.location;

// Fix React DOM compatibility issues
Object.defineProperty(global.window, 'WebkitAnimation', {
  value: undefined,
  writable: true,
  configurable: true,
});

// Mock CSS properties that React DOM checks
Object.defineProperty(global.window, 'CSS', {
  value: {
    supports: vi.fn(() => false),
  },
  writable: true,
  configurable: true,
});

// Mock getComputedStyle
global.window.getComputedStyle = vi.fn(() => ({
  getPropertyValue: vi.fn(() => ''),
}));

// Mock matchMedia
global.window.matchMedia = vi.fn(() => ({
  matches: false,
  addListener: vi.fn(),
  removeListener: vi.fn(),
}));

// Mock document.createElement for React
const originalCreateElement = global.document.createElement;
global.document.createElement = function(tagName: string) {
  const element = originalCreateElement.call(this, tagName);
  if (tagName.toLowerCase() === 'canvas') {
    element.getContext = vi.fn(() => mockCanvasContext);
    element.captureStream = vi.fn(() => ({}));
  }
  return element;
}; 