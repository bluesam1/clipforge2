import React from 'react';
import { useExportStore } from '../stores/exportStore';
import { useTimelineStore } from '../stores/timelineStore';

export const ExportButton: React.FC = () => {
  const { openExportDialog } = useExportStore();
  const { clips } = useTimelineStore();

  // Check if timeline has clips to enable/disable export
  const hasClips = clips.length > 0;

  const handleExportClick = () => {
    if (hasClips) {
      openExportDialog();
    }
  };

  return (
    <button
      onClick={handleExportClick}
      disabled={!hasClips}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        hasClips
          ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
      }`}
      title={hasClips ? 'Export your video to MP4' : 'Add clips to timeline to enable export'}
    >
      <div className="flex items-center space-x-2">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span>Export</span>
      </div>
    </button>
  );
};
