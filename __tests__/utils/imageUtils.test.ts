import { describe, test, expect, beforeEach } from 'vitest';
import {
  isValidImageFile,
  sortImages,
  calculateVideoDuration,
  createImageFile,
  getAvailableVideoCodecs,
  getFirstSupportedCodec,
  calculateImageScaling,
  type ImageFile,
  type SortOption,
} from '../../src/lib/imageUtils';

describe('Image Utils', () => {
  let mockImageFile: ImageFile;
  let mockFile: File;

  beforeEach(() => {
    mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    mockImageFile = {
      id: '1',
      file: mockFile,
      url: 'mocked-url',
      name: 'test.jpg',
      size: 1000,
      lastModified: 1000,
    };
  });

  describe('isValidImageFile', () => {
    test('should return true for valid image files', () => {
      const jpgFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const pngFile = new File([''], 'test.png', { type: 'image/png' });
      const gifFile = new File([''], 'test.gif', { type: 'image/gif' });

      expect(isValidImageFile(jpgFile)).toBe(true);
      expect(isValidImageFile(pngFile)).toBe(true);
      expect(isValidImageFile(gifFile)).toBe(true);
    });

    test('should return false for non-image files', () => {
      const textFile = new File([''], 'test.txt', { type: 'text/plain' });
      const pdfFile = new File([''], 'test.pdf', { type: 'application/pdf' });

      expect(isValidImageFile(textFile)).toBe(false);
      expect(isValidImageFile(pdfFile)).toBe(false);
    });
  });

  describe('sortImages', () => {
    const images: ImageFile[] = [
      {
        id: '1',
        file: new File([''], 'c.jpg', { type: 'image/jpeg' }),
        url: 'url1',
        name: 'c.jpg',
        size: 300,
        lastModified: 3000,
      },
      {
        id: '2',
        file: new File([''], 'a.jpg', { type: 'image/jpeg' }),
        url: 'url2',
        name: 'a.jpg',
        size: 100,
        lastModified: 1000,
      },
      {
        id: '3',
        file: new File([''], 'b.jpg', { type: 'image/jpeg' }),
        url: 'url3',
        name: 'b.jpg',
        size: 200,
        lastModified: 2000,
      },
    ];

    test('should sort by name correctly', () => {
      const sorted = sortImages(images, 'name');
      expect(sorted[0].name).toBe('a.jpg');
      expect(sorted[1].name).toBe('b.jpg');
      expect(sorted[2].name).toBe('c.jpg');
    });

    test('should sort by date correctly', () => {
      const sorted = sortImages(images, 'date');
      expect(sorted[0].lastModified).toBe(1000);
      expect(sorted[1].lastModified).toBe(2000);
      expect(sorted[2].lastModified).toBe(3000);
    });

    test('should sort by size correctly', () => {
      const sorted = sortImages(images, 'size');
      expect(sorted[0].size).toBe(100);
      expect(sorted[1].size).toBe(200);
      expect(sorted[2].size).toBe(300);
    });

    test('should return original array for manual sort', () => {
      const sorted = sortImages(images, 'manual');
      expect(sorted).toEqual(images);
    });
  });

  describe('calculateVideoDuration', () => {
    test('should calculate duration correctly', () => {
      expect(calculateVideoDuration(50, 25)).toBe(2); // 50 images at 25 FPS = 2 seconds
      expect(calculateVideoDuration(100, 30)).toBeCloseTo(3.33, 2); // 100 images at 30 FPS ≈ 3.33 seconds
      expect(calculateVideoDuration(1, 1)).toBe(1); // 1 image at 1 FPS = 1 second
    });

    test('should handle zero values', () => {
      expect(calculateVideoDuration(0, 25)).toBe(0);
      expect(calculateVideoDuration(10, 0)).toBe(Infinity);
    });
  });

  describe('createImageFile', () => {
    test('should create ImageFile object correctly', () => {
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const imageFile = createImageFile(file);

      expect(imageFile.file).toBe(file);
      expect(imageFile.name).toBe('test.jpg');
      expect(imageFile.size).toBe(file.size);
      expect(imageFile.lastModified).toBe(file.lastModified);
      expect(imageFile.id).toBeDefined();
      expect(imageFile.url).toBeDefined();
    });
  });

  describe('getAvailableVideoCodecs', () => {
    test('should return array of video codecs', () => {
      const codecs = getAvailableVideoCodecs();
      
      expect(codecs).toHaveLength(3);
      expect(codecs[0].name).toBe('H.264 (MP4)');
      expect(codecs[1].name).toBe('VP9 (WebM)');
      expect(codecs[2].name).toBe('VP8 (WebM)');
      
      codecs.forEach(codec => {
        expect(codec).toHaveProperty('name');
        expect(codec).toHaveProperty('mimeType');
        expect(codec).toHaveProperty('extension');
        expect(codec).toHaveProperty('supported');
      });
    });
  });

  describe('getFirstSupportedCodec', () => {
    test('should return first supported codec', () => {
      const codec = getFirstSupportedCodec();
      expect(codec).toBeDefined();
      expect(codec?.supported).toBe(true);
    });
  });

  describe('calculateImageScaling', () => {
    test('should scale wide image correctly', () => {
      // Image is wider than canvas
      const result = calculateImageScaling(200, 100, 100, 100);
      
      expect(result.drawWidth).toBe(100);
      expect(result.drawHeight).toBe(50);
      expect(result.drawX).toBe(0);
      expect(result.drawY).toBe(25);
    });

    test('should scale tall image correctly', () => {
      // Image is taller than canvas
      const result = calculateImageScaling(100, 200, 100, 100);
      
      expect(result.drawWidth).toBe(50);
      expect(result.drawHeight).toBe(100);
      expect(result.drawX).toBe(25);
      expect(result.drawY).toBe(0);
    });

    test('should handle square image and canvas', () => {
      const result = calculateImageScaling(100, 100, 100, 100);
      
      expect(result.drawWidth).toBe(100);
      expect(result.drawHeight).toBe(100);
      expect(result.drawX).toBe(0);
      expect(result.drawY).toBe(0);
    });
  });
}); 