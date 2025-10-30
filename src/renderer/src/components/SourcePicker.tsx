import React, { useEffect, useState } from 'react';
import { useRecordingStore } from '../stores/recordingStore';
import { DesktopCapturerSource } from '../types/recording';

interface SourcePickerProps {
  selectedSource: DesktopCapturerSource | null;
  onSourceSelect: (source: DesktopCapturerSource | null) => void;
}

export const SourcePicker: React.FC<SourcePickerProps> = ({
  selectedSource,
  onSourceSelect
}) => {
  const { availableSources, loadSources, error } = useRecordingStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (availableSources.length === 0) {
      setIsLoading(true);
      loadSources().finally(() => setIsLoading(false));
    }
  }, [availableSources.length, loadSources]);

  const handleSourceSelect = (source: DesktopCapturerSource) => {
    onSourceSelect(source);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Screen/Window</label>
        <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Loading sources...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Screen/Window</label>
      <div className="grid grid-cols-2 gap-3">
        {availableSources.map((source) => (
          <button
            key={source.id}
            onClick={() => handleSourceSelect(source)}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              selectedSource?.id === source.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="aspect-video bg-gray-100 rounded mb-2 overflow-hidden">
              {source.thumbnail ? (
                <img
                  src={source.thumbnail}
                  alt={source.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Failed to load thumbnail for', source.name);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="text-xs font-medium text-gray-900 truncate">
              {source.name}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {source.type}
            </div>
          </button>
        ))}
      </div>
      {availableSources.length === 0 && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🖥️</div>
          <div className="text-sm">No sources available</div>
          {error && (
            <div className="text-xs text-red-500 mt-2">
              Error: {error.message}
            </div>
          )}
          <button
            onClick={() => {
              setIsLoading(true);
              loadSources().finally(() => setIsLoading(false));
            }}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
};
