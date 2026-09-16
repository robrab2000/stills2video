import { render, screen } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { ImageToVideoConverter } from '../../src/components/ImageToVideoConverter';
import { AppProvider } from '../../src/contexts/AppContext';

vi.mock('next/image', () => ({
  default: (props: { alt?: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt ?? ''} src={typeof props.src === 'string' ? props.src : ''} />
  ),
}));

vi.mock('../../src/services/videoService', () => ({
  VideoService: {
    generateVideo: vi.fn().mockResolvedValue({
      id: 'test-video-1',
      blob: new Blob(['test'], { type: 'video/mp4' }),
      thumbnail: 'data:image/png;base64,test',
      duration: 2.5,
      size: 1024,
      timestamp: Date.now(),
    }),
  },
}));

vi.mock('../../src/services/fileService', () => ({
  FileService: {
    processFileList: vi.fn().mockReturnValue({ images: [], errors: [] }),
    cleanupUrls: vi.fn(),
    downloadVideo: vi.fn(),
  },
}));

vi.mock('../../src/hooks/useImageManager', () => ({
  useImageManager: vi.fn().mockReturnValue({
    handleFileSelect: vi.fn(),
    handleDrop: vi.fn(),
    handleDragOver: vi.fn(),
    handleRemoveImage: vi.fn(),
    handleClearAllImages: vi.fn(),
    handleSortOptionChange: vi.fn(),
    handleDragOverItem: vi.fn(),
  }),
}));

vi.mock('../../src/hooks/useVideoGenerator', () => ({
  useVideoGenerator: vi.fn().mockReturnValue({
    generateVideo: vi.fn(),
    canvasRef: { current: null },
  }),
}));

vi.mock('../../src/hooks/useVideoCodecs', () => ({
  useVideoCodecs: vi.fn().mockReturnValue({
    selectedCodec: 'video/mp4;codecs=h264',
    setSelectedCodec: vi.fn(),
    videoCodecs: [
      { name: 'H.264 (MP4)', mimeType: 'video/mp4;codecs=h264', extension: 'mp4', supported: true },
    ],
  }),
}));

vi.mock('../../src/lib/ffmpegUtils', () => ({
  shouldEnableFFmpegMultithreading: vi.fn().mockReturnValue(false),
  isMultithreadingAvailable: vi.fn().mockReturnValue(false),
}));

vi.mock('../../src/components/ui/UploadZone', () => ({
  UploadZone: ({ disabled }: { disabled?: boolean }) => (
    <div data-testid="upload-zone">
      <button disabled={disabled}>Browse Files</button>
    </div>
  ),
}));

vi.mock('../../src/components/ui/ImageGrid', () => ({
  ImageGrid: () => <div data-testid="image-grid" />,
}));

vi.mock('../../src/components/ui/VirtualImageGrid', () => ({
  VirtualImageGrid: () => <div data-testid="virtual-image-grid" />,
}));

vi.mock('../../src/components/ui/VideoSettings', () => ({
  VideoSettings: () => <div data-testid="video-settings" />,
}));

vi.mock('../../src/components/ui/LazyVideoPreview', () => ({
  LazyVideoPreview: () => null,
}));

vi.mock('../../src/components/ui/GeneratedVideosList', () => ({
  GeneratedVideosList: () => <div data-testid="generated-videos-list" />,
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('ImageToVideoConverter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders upload zone when no images', () => {
    render(
      <TestWrapper>
        <ImageToVideoConverter />
      </TestWrapper>
    );

    expect(screen.getByTestId('upload-zone')).toBeInTheDocument();
  });

  test('renders brand and empty-state copy', () => {
    render(
      <TestWrapper>
        <ImageToVideoConverter />
      </TestWrapper>
    );

    expect(screen.getByRole('heading', { name: 'Stills-2-Video' })).toBeInTheDocument();
    expect(screen.getByText('Drop stills. Export video. All in your browser.')).toBeInTheDocument();
    expect(screen.getByText(/Encoding happens in your browser/i)).toBeInTheDocument();
  });

  test('hides sequence and export panels until images are added', () => {
    render(
      <TestWrapper>
        <ImageToVideoConverter />
      </TestWrapper>
    );

    expect(screen.queryByTestId('image-grid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('video-settings')).not.toBeInTheDocument();
    expect(screen.queryByTestId('generated-videos-list')).not.toBeInTheDocument();
  });
});
