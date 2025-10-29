import React, { useState } from 'react';
import { MediaFile } from '../types/media';
import ConfirmDialog from './ConfirmDialog';

interface MediaItemProps {
  media: MediaFile;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: (id: string) => void;
  onPreview: (id: string) => void;
}

const MediaItem: React.FC<MediaItemProps> = ({ media, isSelected, onSelect, onRemove, onPreview }) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmDialog(true);
  };

  const handleConfirmRemove = () => {
    onRemove(media.id);
    setShowConfirmDialog(false);
  };

  const handleDoubleClick = () => {
    onPreview(media.id);
  };

  return (
    <div
      className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-200 rounded mb-3 overflow-hidden">
        {media.thumbnailPath ? (
          <img
            src={`file:///${media.thumbnailPath?.replace(/\\/g, '/')}`}
            alt={media.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <div className="text-4xl">🎬</div>
          </div>
        )}
      </div>

      {/* Media Info */}
      <div className="space-y-1">
        <div className="flex justify-between items-start">
          <h3 className="font-medium text-sm text-gray-900 truncate flex-1" title={media.name}>
            {media.name}
          </h3>
          <button
            onClick={handleRemove}
            className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Remove media"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          <div>Duration: {formatDuration(media.duration)}</div>
          <div>Resolution: {media.width}×{media.height}</div>
          <div>Size: {formatFileSize(media.size)}</div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Remove Media"
        message={`Are you sure you want to remove "${media.name}" from the library?`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleConfirmRemove}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </div>
  );
};

export default MediaItem;
