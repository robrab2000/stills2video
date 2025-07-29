import { useRef, useCallback, useState } from 'react';

interface UploadZoneProps {
  onFilesSelected: (files: FileList) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  disabled?: boolean;
}

export function UploadZone({ onFilesSelected, onDrop, onDragOver, disabled = false }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Memoize event handlers for better performance
  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(e.target.files);
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

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
        isDragOver 
          ? 'border-blue-400 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
      } ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      <div className="space-y-4">
        <div className="text-4xl">
          {isDragOver ? '📂' : '📁'}
        </div>
        <div>
          <p className="text-lg font-medium text-gray-900">
            {isDragOver ? 'Drop images here' : 'Drop images here'}
          </p>
          <p className="text-gray-500">
            {isDragOver ? 'Release to upload' : 'or click to browse'}
          </p>
        </div>
        <button
          onClick={handleBrowseClick}
          disabled={disabled}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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