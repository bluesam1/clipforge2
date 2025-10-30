import React, { useState, useEffect } from 'react';
import { useExportStore } from '../stores/exportStore';
import { useTimelineStore } from '../stores/timelineStore';
import { ExportSettings, QUALITY_CRF_MAP } from '../types/export';

export const ExportDialog: React.FC = () => {
  const { 
    isExportDialogOpen, 
    settings, 
    updateExportSettings, 
    closeExportDialog, 
    startExport,
    exportJob
  } = useExportStore();
  
  const { timeline, clips } = useTimelineStore();
  
  const [localSettings, setLocalSettings] = useState<ExportSettings>(settings);
  const [estimatedFileSize, setEstimatedFileSize] = useState<number>(0);

  // Update local settings when store settings change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Set up default values when dialog opens
  useEffect(() => {
    if (isExportDialogOpen) {
      // Set default output path if not already set
      if (!localSettings.outputPath) {
        window.clipforge.file.getVideosPath().then((defaultPath) => {
          setLocalSettings((prev) => ({ ...prev, outputPath: defaultPath }));
        });
      }
      // Generate default filename
      if (!localSettings.filename || localSettings.filename === 'ClipForge-Export') {
        const now = new Date();
        const date = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
        const time = now.toTimeString().slice(0, 5).replace(/:/g, ''); // HHmm
        setLocalSettings((prev) => ({ ...prev, filename: `ClipForge-Export-${date}-${time}.mp4` }));
      }
    }
  }, [isExportDialogOpen, localSettings.outputPath, localSettings.filename]);

  // Calculate estimated file size based on duration and settings
  useEffect(() => {
    const duration = timeline.totalDuration;
    if (duration > 0) {
      // Rough estimation: ~50-100 MB per 10 minutes at 1080p high quality
      const baseSizePerMinute = 50; // MB
      const qualityMultiplier = localSettings.quality === 'high' ? 1.2 : localSettings.quality === 'medium' ? 0.8 : 0.5;
      const resolutionMultiplier = localSettings.resolution === '4k' ? 4 : localSettings.resolution === '1080p' ? 1 : localSettings.resolution === '720p' ? 0.5 : 1;
      
      const estimatedSize = (duration / 60) * baseSizePerMinute * qualityMultiplier * resolutionMultiplier;
      setEstimatedFileSize(Math.round(estimatedSize));
    }
  }, [timeline.totalDuration, localSettings.quality, localSettings.resolution]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isExportDialogOpen) return;
      
      // Escape key to close dialog
      if (event.key === 'Escape') {
        closeExportDialog();
      }
      
      // Ctrl/Cmd + Enter to start export
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (clips.length > 0 && localSettings.filename && localSettings.outputPath) {
          handleStartExport();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExportDialogOpen, closeExportDialog, clips.length, localSettings.filename, localSettings.outputPath]);

  const handleInputChange = (field: keyof ExportSettings, value: string | number) => {
    setLocalSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBrowseFile = async () => {
    try {
      const result = await window.clipforge.file.saveDialog({
        title: 'Save Video As',
        defaultPath: localSettings.outputPath ? `${localSettings.outputPath}/${localSettings.filename}` : '',
        buttonLabel: 'Save',
        filters: [
          { name: 'MP4 Video', extensions: ['mp4'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result) {
        const fullPath = result;
        const pathParts = fullPath.split(/[\\/]/);
        const filename = pathParts[pathParts.length - 1];
        const outputPath = fullPath.substring(0, fullPath.lastIndexOf(pathParts[pathParts.length - 1]) - 1);
        
        // Ensure filename has .mp4 extension
        const finalFilename = filename.endsWith('.mp4') ? filename : `${filename}.mp4`;
        
        setLocalSettings(prev => ({
          ...prev,
          filename: finalFilename,
          outputPath: outputPath
        }));
      }
    } catch (error) {
      console.error('Error opening save dialog:', error);
    }
  };

  const handleStartExport = () => {
    updateExportSettings(localSettings);
    startExport();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (mb: number): string => {
    if (mb < 1024) {
      return `~${mb} MB`;
    } else {
      return `~${(mb / 1024).toFixed(1)} GB`;
    }
  };

  if (!isExportDialogOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
    >
      <div className="bg-white rounded-lg p-6 w-[500px] max-w-[90vw] mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 id="export-dialog-title" className="text-xl font-semibold text-gray-900">Export Video</h3>
          <button
            onClick={closeExportDialog}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close export dialog"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* File Path */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Save As
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={localSettings.outputPath ? `${localSettings.outputPath}/${localSettings.filename}` : 'Choose location and filename...'}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                placeholder="Choose location and filename..."
              />
              <button
                onClick={handleBrowseFile}
                className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span>Browse</span>
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Choose where to save your exported video file
            </p>
          </div>

          {/* Resolution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resolution
            </label>
            <select
              value={localSettings.resolution}
              onChange={(e) => handleInputChange('resolution', e.target.value as ExportSettings['resolution'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="source">Match Source</option>
              <option value="1080p">1080p (1920×1080)</option>
              <option value="720p">720p (1280×720)</option>
              <option value="4k">4K (3840×2160)</option>
            </select>
          </div>

          {/* Quality */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quality
            </label>
            <select
              value={localSettings.quality}
              onChange={(e) => handleInputChange('quality', e.target.value as ExportSettings['quality'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="high">High (CRF {QUALITY_CRF_MAP.high})</option>
              <option value="medium">Medium (CRF {QUALITY_CRF_MAP.medium})</option>
              <option value="low">Low (CRF {QUALITY_CRF_MAP.low})</option>
            </select>
          </div>

          {/* Duration and File Size Info */}
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Duration: {formatDuration(timeline.totalDuration)}</span>
              <span>Est. Size: {formatFileSize(estimatedFileSize)}</span>
            </div>
          </div>
        </div>

        {/* Validation Messages */}
        {clips.length === 0 && (
          <div className="text-red-500 text-sm">
            Please add clips to the timeline before exporting.
          </div>
        )}
        {clips.length > 0 && (!localSettings.filename || !localSettings.outputPath) && (
          <div className="text-red-500 text-sm">
            Please choose a location and filename for your export.
          </div>
        )}
        
        {/* Export Error Display */}
        {exportJob?.status === 'error' && exportJob.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Export Failed</h3>
                <div className="mt-1 text-sm text-red-700">
                  <p>{exportJob.error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-8">
          <button
            onClick={closeExportDialog}
            className="px-6 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          {exportJob?.status === 'error' ? (
            <button
              onClick={handleStartExport}
              disabled={clips.length === 0 || !localSettings.filename || !localSettings.outputPath}
              className={`px-6 py-2 rounded-md transition-colors ${
                clips.length === 0 || !localSettings.filename || !localSettings.outputPath
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-slate-600 text-white hover:bg-slate-700'
              }`}
            >
              Retry Export
            </button>
          ) : (
            <button
              onClick={handleStartExport}
              disabled={clips.length === 0 || !localSettings.filename || !localSettings.outputPath}
              className={`px-6 py-2 rounded-md transition-colors ${
                clips.length === 0 || !localSettings.filename || !localSettings.outputPath
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-slate-600 text-white hover:bg-slate-700'
              }`}
            >
              Start Export
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
