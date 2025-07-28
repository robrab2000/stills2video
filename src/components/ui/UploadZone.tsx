import { useRef } from 'react';

interface UploadZoneProps {
  onFilesSelected: (files: FileList) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  disabled?: boolean;
}

export function UploadZone({ onFilesSelected, onDrop, onDragOver, disabled = false }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(e.target.files);
    }
  };

  return (
    <div
      className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <div className="space-y-4">
        <div className="text-4xl">📁</div>
        <div>
          <p className="text-lg font-medium text-gray-900">Drop images here</p>
          <p className="text-gray-500">or click to browse</p>
        </div>
        <button
          onClick={handleBrowseClick}
          disabled={disabled}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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