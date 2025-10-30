import React from 'react';
import { useTimelineStore } from '../stores/timelineStore';
import { zoomPercentageToPixelsPerSecond, pixelsPerSecondToZoomPercentage } from '../utils/timelineCalculations';
import { ExportButton } from './ExportButton';

interface TimelineControlsProps {
  onFitToContent: () => void;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({ onFitToContent }) => {
  const { timeline, setZoom, toggleSnap, splitClip, deleteClip, selectedClipId, clips } = useTimelineStore();
  
  // Convert current zoom to percentage for display
  const currentZoomPercentage = Math.round(pixelsPerSecondToZoomPercentage(timeline.zoom));

  const handleZoomChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const zoomPercentage = parseInt(event.target.value);
    const pixelsPerSecond = zoomPercentageToPixelsPerSecond(zoomPercentage);
    setZoom(pixelsPerSecond);
  };

  const handleSplit = () => {
    if (selectedClipId) {
      splitClip(selectedClipId, timeline.playhead);
    }
  };

  const handleDelete = () => {
    if (selectedClipId) {
      deleteClip(selectedClipId);
    }
  };

  const selectedClip = clips.find(c => c.id === selectedClipId);
  const canSplit = selectedClip && 
    timeline.playhead > selectedClip.start && 
    timeline.playhead < selectedClip.end;

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 border-b border-gray-300">
      {/* Left Controls */}
      <div className="flex items-center space-x-4">
        {/* Zoom Slider */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Zoom:</label>
          <input
            type="range"
            min="1"
            max="100"
            value={currentZoomPercentage}
            onChange={handleZoomChange}
            className="w-24"
          />
          <span className="text-xs text-gray-600 w-12">
            {currentZoomPercentage}%
          </span>
        </div>

        {/* Snap Toggle */}
        <button
          onClick={toggleSnap}
          className={`px-4 py-2 text-sm rounded flex items-center space-x-2 ${
            timeline.snap
              ? 'bg-slate-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Snap {timeline.snap ? 'ON' : 'OFF'}</span>
        </button>

        {/* Fit to Content Button */}
        <button
          onClick={onFitToContent}
          className="px-4 py-2 text-sm rounded bg-slate-500 text-white hover:bg-slate-600 flex items-center space-x-2"
          title="Fit timeline to show all clips"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          <span>Fit to Content</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2">
        {/* Split Button */}
        <button
          onClick={handleSplit}
          disabled={!canSplit}
          className={`px-4 py-2 text-sm rounded flex items-center space-x-2 ${
            canSplit
              ? 'bg-slate-500 text-white hover:bg-slate-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
          </svg>
          <span>Split</span>
        </button>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          disabled={!selectedClipId}
          className={`px-4 py-2 text-sm rounded flex items-center space-x-2 ${
            selectedClipId
              ? 'bg-slate-500 text-white hover:bg-slate-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Delete</span>
        </button>

        {/* Export Button */}
        <ExportButton />
      </div>
    </div>
  );
};
