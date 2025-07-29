# 🧪 Testing Documentation

## Overview

This document outlines the comprehensive testing strategy for the Stills-2-Video application, covering unit tests, integration tests, and end-to-end (E2E) tests.

## Test Structure

```
__tests__/
├── components/           # Component unit tests
│   └── ImageToVideoConverter.test.tsx
├── integration/          # Integration tests
│   └── videoGeneration.test.ts
├── e2e/                  # End-to-end tests
│   └── userWorkflows.test.ts
├── browser/              # Browser-specific tests
│   └── videoGeneration.test.ts
├── utils/                # Utility function tests
│   └── imageUtils.test.ts
├── test/                 # Test setup and utilities
│   ├── setup.ts
│   └── testUtils.ts
└── test-images/          # Test assets
    ├── test-image.jpg
    ├── test-image-2.jpg
    ├── test-image-3.jpg
    └── invalid.txt
```

## Test Types

### 1. Unit Tests (Vitest + React Testing Library)

**Purpose**: Test individual components and functions in isolation.

**Coverage**:
- Component rendering
- User interactions
- State changes
- Props validation
- Error handling

**Example**:
```typescript
import { render, screen } from '@testing-library/react';
import { ImageToVideoConverter } from '../ImageToVideoConverter';

test('renders upload zone when no images', () => {
  render(<ImageToVideoConverter />);
  expect(screen.getByTestId('upload-zone')).toBeInTheDocument();
});
```

### 2. Integration Tests (Vitest + React Testing Library)

**Purpose**: Test how multiple components work together.

**Coverage**:
- Complete workflows
- Service interactions
- State management
- Error propagation

**Example**:
```typescript
test('should complete full workflow successfully', async () => {
  // Upload images → Configure settings → Generate video → Download
  // Tests the entire flow from start to finish
});
```

### 3. End-to-End Tests (Playwright)

**Purpose**: Test the application from a user's perspective in a real browser.

**Coverage**:
- Complete user journeys
- Cross-browser compatibility
- Responsive design
- Performance metrics

**Example**:
```typescript
test('should complete full workflow: upload → configure → generate → download', async ({ page }) => {
  await page.goto('/');
  // Test complete user workflow
});
```

## Running Tests

### Unit and Integration Tests

```bash
# Run all tests
npm run test:run

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### End-to-End Tests

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode
npm run test:e2e:headed

# Run E2E tests in debug mode
npm run test:e2e:debug
```

### All Tests

```bash
# Run all tests (unit + integration + E2E)
npm run test:all
```

## Test Coverage

### Current Coverage Targets

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

### Coverage Report

After running `npm run test:coverage`, you can view the detailed coverage report:

1. **Console Output**: Shows summary in terminal
2. **HTML Report**: Open `coverage/index.html` in browser
3. **JSON Report**: Available as `coverage/coverage-summary.json`

## Test Utilities

### Custom Render Function

```typescript
import { render } from '../test/testUtils';

// Automatically wraps components with necessary providers
render(<MyComponent />);
```

### Mock Data

```typescript
import { 
  mockImageFile, 
  mockVideoPreview, 
  createMockFile 
} from '../test/testUtils';

// Use predefined mock data
const testImage = mockImageFile;

// Create custom mock files
const customFile = createMockFile('custom.jpg', 'image/jpeg', 2048);
```

### Async Helpers

```typescript
import { waitForCondition, waitForElementToBeRemoved } from '../test/testUtils';

// Wait for custom conditions
await waitForCondition(() => element.textContent === 'Expected Text');

// Wait for element removal
await waitForElementToBeRemoved(element);
```

## Mocking Strategy

### Service Mocks

```typescript
// Mock video service
vi.mock('../../src/services/videoService', () => ({
  VideoService: {
    generateVideo: vi.fn().mockResolvedValue(mockVideoPreview),
  },
}));
```

### Component Mocks

```typescript
// Mock UI components
vi.mock('../../src/components/ui/UploadZone', () => ({
  UploadZone: ({ onFilesSelected }) => (
    <button onClick={() => onFilesSelected([mockFile])}>
      Browse Files
    </button>
  ),
}));
```

### Browser API Mocks

```typescript
// Mock browser APIs in setup.ts
global.URL.createObjectURL = vi.fn(() => "mocked-url");
global.MediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
}));
```

## E2E Testing with Playwright

### Configuration

The Playwright configuration (`playwright.config.ts`) includes:

- **Multiple browsers**: Chrome, Firefox, Safari
- **Mobile testing**: iPhone 12, Pixel 5
- **Parallel execution**: Tests run in parallel for speed
- **Retry logic**: Failed tests retry on CI
- **Video recording**: Failed tests record video
- **Screenshots**: Failed tests take screenshots

### Test Structure

```typescript
test.describe('User Workflows E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=App Title');
  });

  test('should complete workflow', async ({ page }) => {
    // Test implementation
  });
});
```

### Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Wait for elements** instead of arbitrary delays
3. **Test user workflows** not implementation details
4. **Handle async operations** properly
5. **Use page objects** for complex interactions

## Test Data Management

### Test Images

Test images are generated programmatically:

```bash
npm run test:generate-images
```

This creates:
- `test-image.jpg` (100x100 red)
- `test-image-2.jpg` (200x150 blue)
- `test-image-3.jpg` (150x200 green)
- `invalid.txt` (text file for error testing)

### Mock Data Constants

```typescript
export const TEST_CONSTANTS = {
  TIMEOUTS: { SHORT: 1000, MEDIUM: 5000, LONG: 10000 },
  FILE_SIZES: { SMALL: 1024, MEDIUM: 1024 * 1024 },
  VIDEO_DIMENSIONS: { SD: { width: 640, height: 480 } },
};
```

## Continuous Integration

### GitHub Actions

Tests run automatically on:

- **Pull Requests**: All tests must pass
- **Main Branch**: Full test suite + coverage
- **Scheduled**: Daily E2E tests

### Pre-commit Hooks

```bash
# Run before committing
npm run lint
npm run test:run
npm run type-check
```

## Debugging Tests

### Unit/Integration Tests

```bash
# Run specific test file
npm run test:run -- components/ImageToVideoConverter.test.tsx

# Run tests in debug mode
npm run test:run -- --reporter=verbose
```

### E2E Tests

```bash
# Run with browser visible
npm run test:e2e:headed

# Run in debug mode
npm run test:e2e:debug

# Run specific test
npx playwright test userWorkflows.test.ts
```

### Common Issues

1. **Timing Issues**: Use `waitFor` instead of `setTimeout`
2. **Mock Problems**: Ensure mocks are reset in `beforeEach`
3. **Async Operations**: Use proper async/await patterns
4. **Element Selection**: Use reliable selectors (data-testid)

## Performance Testing

### Load Testing

```typescript
test('should handle large image sets efficiently', async ({ page }) => {
  // Upload 50+ images and measure performance
});
```

### Memory Testing

```typescript
test('should clean up resources properly', async ({ page }) => {
  // Verify object URLs are revoked
  // Check memory usage doesn't grow
});
```

## Accessibility Testing

### Automated Checks

```typescript
test('should have proper accessibility attributes', async ({ page }) => {
  await expect(page.locator('input[type="file"]')).toHaveAttribute('aria-label');
});
```

### Manual Testing Checklist

- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] Color contrast meets WCAG standards
- [ ] Focus indicators are visible
- [ ] Alt text for images

## Future Improvements

### Planned Enhancements

1. **Visual Regression Testing**: Compare screenshots
2. **Performance Budgets**: Set limits for bundle size and load times
3. **Contract Testing**: Test API contracts
4. **Load Testing**: Test with realistic data volumes
5. **Security Testing**: Automated security scans

### Test Automation

1. **Auto-generate tests** for new components
2. **Test data factories** for complex scenarios
3. **Parallel test execution** optimization
4. **Test result analytics** and reporting

## Contributing

### Adding New Tests

1. **Unit Tests**: Add to appropriate component directory
2. **Integration Tests**: Add to `integration/` directory
3. **E2E Tests**: Add to `e2e/` directory
4. **Update documentation**: Document new test patterns

### Test Naming Conventions

- **Unit Tests**: `ComponentName.test.tsx`
- **Integration Tests**: `featureName.test.ts`
- **E2E Tests**: `userWorkflows.test.ts`

### Code Review Checklist

- [ ] Tests cover happy path and error cases
- [ ] Tests are independent and repeatable
- [ ] Mock data is realistic
- [ ] Async operations are handled properly
- [ ] Tests follow naming conventions
- [ ] Coverage meets targets

---

This testing strategy ensures the application is reliable, maintainable, and provides a great user experience across all browsers and devices. 