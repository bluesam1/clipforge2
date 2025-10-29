import React from 'react';
import { useExportStore } from '../stores/exportStore';

export const ExportProgress: React.FC = () => {
  const { 
    isExportProgressVisible, 
    exportJob, 
    cancelExport 
  } = useExportStore();

  if (!isExportProgressVisible || !exportJob) return null;

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return 'Calculating...';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    if (mins > 0) {
      return `~${mins}m ${secs}s`;
    } else {
      return `~${secs}s`;
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel the export?')) {
      cancelExport();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[400px] mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Exporting Video...</h3>
          <div className="text-sm text-gray-500">
            {exportJob.status === 'preparing' && 'Preparing...'}
            {exportJob.status === 'encoding' && 'Encoding...'}
          </div>
        </div>

        {/* Progress Content */}
        <div className="space-y-4">
          {/* Current Step */}
          <div className="text-sm text-gray-600">
            {exportJob.currentStep}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-600 to-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${exportJob.progress}%` }}
            />
          </div>

          {/* Progress Percentage */}
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress: {Math.round(exportJob.progress)}%</span>
            {exportJob.estimatedTimeRemaining > 0 && (
              <span>Time remaining: {formatTime(exportJob.estimatedTimeRemaining)}</span>
            )}
          </div>

          {/* Status-specific content */}
          {exportJob.status === 'preparing' && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Analyzing timeline and preparing export...</p>
            </div>
          )}

          {exportJob.status === 'encoding' && (
            <div className="text-center py-4">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
                <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full" style={{ animationDelay: '0.2s' }}></div>
                <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Processing video segments...</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end mt-8">
          <button
            onClick={handleCancel}
            className="px-6 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel Export
          </button>
        </div>
      </div>
    </div>
  );
};
