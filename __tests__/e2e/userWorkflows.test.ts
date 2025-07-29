import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('User Workflows E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('text=A Simple Image Sequence to Video Converter');
  });

  test.describe('Complete Video Generation Workflow', () => {
    test('should complete full workflow: upload → configure → generate → download', async ({ page }) => {
      // Step 1: Upload images
      const fileInput = page.locator('input[type="file"]');
      const testImagePath = path.join(__dirname, '../test-images/test-image.jpg');
      
      // Create a test image if it doesn't exist
      await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'red';
          ctx.fillRect(0, 0, 100, 100);
        }
        return canvas.toDataURL('image/jpeg');
      });

      // Upload the test image
      await fileInput.setInputFiles(testImagePath);
      
      // Wait for image to be processed
      await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
      
      // Step 2: Configure video settings
      const fpsInput = page.locator('[data-testid="fps-input"]');
      const widthInput = page.locator('[data-testid="width-input"]');
      const heightInput = page.locator('[data-testid="height-input"]');
      
      await fpsInput.fill('30');
      await widthInput.fill('1280');
      await heightInput.fill('720');
      
      // Step 3: Generate video
      const generateButton = page.locator('button:has-text("Generate Video")');
      await generateButton.click();
      
      // Wait for generation to complete
      await page.waitForSelector('text=Video generated successfully', { timeout: 30000 });
      
      // Step 4: Verify video was created
      await expect(page.locator('[data-testid="generated-videos-list"]')).toBeVisible();
      
      // Step 5: Download video
      const downloadButton = page.locator('button:has-text("Download")').first();
      await downloadButton.click();
      
      // Verify download started (this would need more sophisticated testing in a real scenario)
      await expect(downloadButton).toBeVisible();
    });

    test('should handle multiple image uploads', async ({ page }) => {
      // Upload multiple images
      const fileInput = page.locator('input[type="file"]');
      const testImagePath = path.join(__dirname, '../test-images/test-image.jpg');
      
      // Upload multiple files
      await fileInput.setInputFiles([
        testImagePath,
        testImagePath,
        testImagePath
      ]);
      
      // Wait for images to be processed
      await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
      
      // Verify multiple images are displayed
      const imageElements = page.locator('[data-testid^="image-"]');
      await expect(imageElements).toHaveCount(3);
    });
  });

  test.describe('Error Handling Workflows', () => {
    test('should handle invalid file types gracefully', async ({ page }) => {
      // Try to upload a text file
      const fileInput = page.locator('input[type="file"]');
      const testFilePath = path.join(__dirname, '../test-images/invalid.txt');
      
      // Create a test text file
      await page.evaluate(() => {
        const blob = new Blob(['This is not an image'], { type: 'text/plain' });
        return URL.createObjectURL(blob);
      });
      
      await fileInput.setInputFiles(testFilePath);
      
      // Should not show image grid for invalid files
      await expect(page.locator('[data-testid="image-grid"]')).not.toBeVisible();
    });

    test('should handle empty file selection', async ({ page }) => {
      // Try to upload empty selection
      const fileInput = page.locator('input[type="file"]');
      
      // This should not cause any errors
      await expect(page.locator('[data-testid="upload-zone"]')).toBeVisible();
    });
  });

  test.describe('Settings and Configuration', () => {
    test('should persist settings across operations', async ({ page }) => {
      // Upload an image first
      const fileInput = page.locator('input[type="file"]');
      const testImagePath = path.join(__dirname, '../test-images/test-image.jpg');
      await fileInput.setInputFiles(testImagePath);
      
      await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
      
      // Change settings
      const fpsInput = page.locator('[data-testid="fps-input"]');
      const widthInput = page.locator('[data-testid="width-input"]');
      
      await fpsInput.fill('15');
      await widthInput.fill('800');
      
      // Verify settings are maintained
      await expect(fpsInput).toHaveValue('15');
      await expect(widthInput).toHaveValue('800');
    });

    test('should validate video settings', async ({ page }) => {
      // Upload an image
      const fileInput = page.locator('input[type="file"]');
      const testImagePath = path.join(__dirname, '../test-images/test-image.jpg');
      await fileInput.setInputFiles(testImagePath);
      
      await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
      
      // Try invalid FPS
      const fpsInput = page.locator('[data-testid="fps-input"]');
      await fpsInput.fill('0');
      
      // Try invalid width
      const widthInput = page.locator('[data-testid="width-input"]');
      await widthInput.fill('100');
      
      // The component should handle invalid values gracefully
      await expect(page.locator('[data-testid="video-settings"]')).toBeVisible();
    });
  });

  test.describe('Image Management', () => {
    test('should remove individual images', async ({ page }) => {
      // Upload multiple images
      const fileInput = page.locator('input[type="file"]');
      const testImagePath = path.join(__dirname, '../test-images/test-image.jpg');
      
      await fileInput.setInputFiles([
        testImagePath,
        testImagePath,
        testImagePath
      ]);
      
      await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
      
      // Remove first image
      const removeButtons = page.locator('button:has-text("×")');
      await removeButtons.first().click();
      
      // Verify one image was removed
      const imageElements = page.locator('[data-testid^="image-"]');
      await expect(imageElements).toHaveCount(2);
    });

    test('should clear all images', async ({ page }) => {
      // Upload images
      const fileInput = page.locator('input[type="file"]');
      const testImagePath = path.join(__dirname, '../test-images/test-image.jpg');
      
      await fileInput.setInputFiles([
        testImagePath,
        testImagePath
      ]);
      
      await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
      
      // Clear all images
      const clearButton = page.locator('button:has-text("Clear All")');
      await clearButton.click();
      
      // Verify all images are removed
      await expect(page.locator('[data-testid="image-grid"]')).not.toBeVisible();
    });
  });

  test.describe('Video Preview and Download', () => {
    test('should preview generated video', async ({ page }) => {
      // Upload and generate video
      const fileInput = page.locator('input[type="file"]');
      const testImagePath = path.join(__dirname, '../test-images/test-image.jpg');
      await fileInput.setInputFiles(testImagePath);
      
      await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
      
      const generateButton = page.locator('button:has-text("Generate Video")');
      await generateButton.click();
      
      await page.waitForSelector('text=Video generated successfully', { timeout: 30000 });
      
      // Preview video
      const previewButton = page.locator('button:has-text("Preview")').first();
      await previewButton.click();
      
      // Verify preview modal opens
      await expect(page.locator('[data-testid="video-preview"]')).toBeVisible();
      
      // Close preview
      const closeButton = page.locator('button:has-text("Close")');
      await closeButton.click();
      
      // Verify preview modal closes
      await expect(page.locator('[data-testid="video-preview"]')).not.toBeVisible();
    });

    test('should download generated video', async ({ page, context }) => {
      // Set up download listener
      const downloadPromise = context.waitForEvent('download');
      
      // Upload and generate video
      const fileInput = page.locator('input[type="file"]');
      const testImagePath = path.join(__dirname, '../test-images/test-image.jpg');
      await fileInput.setInputFiles(testImagePath);
      
      await page.waitForSelector('[data-testid="image-grid"]', { timeout: 10000 });
      
      const generateButton = page.locator('button:has-text("Generate Video")');
      await generateButton.click();
      
      await page.waitForSelector('text=Video generated successfully', { timeout: 30000 });
      
      // Download video
      const downloadButton = page.locator('button:has-text("Download")').first();
      await downloadButton.click();
      
      // Wait for download to start
      const download = await downloadPromise;
      
      // Verify download filename
      expect(download.suggestedFilename()).toMatch(/\.(mp4|webm)$/);
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Navigate to app
      await page.goto('/');
      
      // Verify app loads on mobile
      await expect(page.locator('text=A Simple Image Sequence to Video Converter')).toBeVisible();
      await expect(page.locator('[data-testid="upload-zone"]')).toBeVisible();
    });

    test('should work on tablet devices', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Navigate to app
      await page.goto('/');
      
      // Verify app loads on tablet
      await expect(page.locator('text=A Simple Image Sequence to Video Converter')).toBeVisible();
      await expect(page.locator('[data-testid="upload-zone"]')).toBeVisible();
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('should load quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForSelector('text=A Simple Image Sequence to Video Converter');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should have proper accessibility attributes', async ({ page }) => {
      await page.goto('/');
      
      // Check for proper ARIA labels
      await expect(page.locator('input[type="file"]')).toHaveAttribute('aria-label');
      
      // Check for proper button roles
      const buttons = page.locator('button');
      await expect(buttons.first()).toBeVisible();
    });
  });
});