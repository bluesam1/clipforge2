import React, { useState, useEffect } from 'react';
import { useRecordingStore } from '../stores/recordingStore';
import { formatDuration } from '../utils/recordingUtils';

interface RecordingIndicatorProps {
  isPaused: boolean;
  onPauseResume: () => void;
  onStop: () => void;
}

export const RecordingIndicator: React.FC<RecordingIndicatorProps> = ({
  isPaused,
  onPauseResume,
  onStop
}) => {
  const { recordingState } = useRecordingStore();
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (recordingState.status === 'recording' && !isPaused) {
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - recordingState.startTime);
      }, 100);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [recordingState.status, recordingState.startTime, isPaused]);

  const handlePauseResume = () => {
    onPauseResume();
  };

  const handleStop = () => {
    console.log('🛑 RecordingIndicator: Stop button clicked');
    onStop();
  };

  return (
    <div className="fixed top-4 right-4 bg-slate-700 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-3">
      {/* Recording dot */}
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-400' : 'bg-red-400 animate-pulse'}`}></div>
        <span className="text-sm font-medium">
          {isPaused ? 'PAUSED' : 'RECORDING'}
        </span>
      </div>

      {/* Elapsed time */}
      <div className="text-sm font-mono">
        {formatDuration(elapsedTime)}
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handlePauseResume}
          className="p-1 hover:bg-slate-600 rounded transition-colors"
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          )}
        </button>

        <button
          onClick={handleStop}
          className="p-1 hover:bg-slate-600 rounded transition-colors"
          title="Stop Recording"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h12v12H6z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};
