import React, { useCallback } from 'react';
import { useMediaStore } from '../stores/mediaStore';
import MediaItem from './MediaItem';
import ImportButton from './ImportButton';
import DropZone from './DropZone';

const MediaLibrary: React.FC = () => {
  const { media, selectedMediaId, isImporting, error, importMedia, selectMedia, removeMedia, loadPreview, clearError } = useMediaStore();

  const handleFileSelect = useCallback(async (files: File[]) => {
    await importMedia(files);
  }, [importMedia]);

  const handleFilePicker = useCallback(async () => {
    try {
      console.log('Opening file picker...');
      const filePaths = await window.clipforge.file.openDialog({
        title: 'Select Media Files',
        filters: [
          { name: 'Video Files', extensions: ['mp4', 'mov', 'webm'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      
      console.log('File picker returned:', filePaths);
      if (filePaths) {
        console.log('Calling importMedia with file paths:', filePaths);
        await importMedia(filePaths);
      }
    } catch (error) {
      console.error('Error opening file picker:', error);
    }
  }, [importMedia]);

  return (
    <div className="flex flex-col h-full min-h-0 max-h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Media Library</h2>
        <ImportButton onImport={handleFilePicker} isLoading={isImporting} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex-shrink-0 mx-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex justify-between items-start">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={clearError}
              className="ml-2 text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Media Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0 max-h-full scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {media.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="text-6xl mb-4">📁</div>
            <p className="text-lg font-medium mb-2">No media imported</p>
            <p className="text-sm text-center">
              Drag and drop video files here or click the Import button
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 pb-4">
            {media.map((item) => (
              <MediaItem
                key={item.id}
                media={item}
                isSelected={selectedMediaId === item.id}
                onSelect={() => selectMedia(item.id)}
                onRemove={removeMedia}
                onPreview={loadPreview}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drop Zone Overlay */}
      <DropZone onFilesSelected={handleFileSelect} />
    </div>
  );
};

export default MediaLibrary;
