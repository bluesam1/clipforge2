import React from 'react';
import { useExportStore } from '../stores/exportStore';

export const ExportComplete: React.FC = () => {
  const { 
    isExportCompleteVisible, 
    exportJob, 
    hideExportComplete, 
    resetExport 
  } = useExportStore();

  if (!isExportCompleteVisible || !exportJob) return null;

  const handleShowInFolder = () => {
    if (exportJob.outputPath) {
      // Use our custom API to show the file in the system file manager
      window.clipforge.file.showItemInFolder(exportJob.outputPath);
    }
  };

  const handleExportAnother = () => {
    resetExport();
    // The resetExport function will now open the export dialog
  };

  const handleClose = () => {
    hideExportComplete();
    resetExport();
  };


  return (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-6 w-80 z-50 transform transition-transform duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Export Complete!</h3>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        <p className="text-gray-600 text-sm">
          Your video has been successfully exported and is ready to use.
        </p>

        {/* File Info */}
        {exportJob.outputPath && (
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-sm text-gray-600">
              <div className="font-medium text-gray-900 mb-1">File Location:</div>
              <div className="truncate" title={exportJob.outputPath}>
                {exportJob.outputPath.split('/').pop() || exportJob.outputPath}
              </div>
            </div>
          </div>
        )}

        {/* Success Stats */}
        <div className="flex justify-between text-sm text-gray-500">
          <span>Status: Complete</span>
          <span>Progress: 100%</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-2 mt-6">
        <button
          onClick={handleShowInFolder}
          className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          Show in Folder
        </button>
        <button
          onClick={handleExportAnother}
          className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          Export Again
        </button>
      </div>

      {/* Auto-dismiss timer */}
      <div className="mt-4">
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div className="bg-green-500 h-1 rounded-full animate-pulse" style={{ width: '100%' }} />
        </div>
        <p className="text-xs text-gray-500 mt-1 text-center">
          This notification will auto-dismiss in 10 seconds
        </p>
      </div>
    </div>
  );
};
