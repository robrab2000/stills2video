import { useRef, useCallback, useState } from 'react';

interface UploadZoneProps {
  onFilesSelected: (files: FileList) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  disabled?: boolean;
  compact?: boolean;
}

function UploadIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className="mx-auto"
    >
      <rect
        x="6"
        y="10"
        width="28"
        height="20"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
        className={active ? 'text-accent' : 'text-ink-muted'}
      />
      <path
        d="M20 16v10M15.5 20.5 20 16l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={active ? 'text-accent' : 'text-ink-muted'}
      />
    </svg>
  );
}

export function UploadZone({
  onFilesSelected,
  onDrop,
  onDragOver,
  disabled = false,
  compact = false,
}: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(e.target.files);
      e.target.value = '';
    }
  }, [onFilesSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    setIsDragOver(false);
    onDrop(e);
  }, [onDrop]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
    onDragOver(e);
  }, [onDragOver]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBrowseClick();
    }
  }, [disabled, handleBrowseClick]);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Drop images here or browse files"
      aria-disabled={disabled}
      className={`text-center transition-all duration-200 outline-none ${
        compact ? 'rounded-lg border border-dashed p-4' : 'rounded-xl border-2 border-dashed p-10 md:p-14'
      } ${
        isDragOver
          ? 'drop-active border-accent bg-accent/5'
          : 'border-line hover:border-ink-muted'
      } ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper`}
      data-testid="upload-zone"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onClick={disabled ? undefined : handleBrowseClick}
      onKeyDown={handleKeyDown}
    >
      <div className={compact ? 'space-y-2' : 'space-y-4'}>
        <UploadIcon active={isDragOver} />
        <div>
          <p className={`font-display font-semibold text-ink ${compact ? 'text-base' : 'text-xl'}`}>
            {isDragOver ? 'Release to add stills' : 'Drop images here'}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {isDragOver ? 'Images stay on your device' : 'or click to browse — JPG, PNG, WebP, and more'}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleBrowseClick();
          }}
          disabled={disabled}
          className="btn-primary"
        >
          Browse Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
