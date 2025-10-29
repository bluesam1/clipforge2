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
          className={`px-3 py-1 text-sm rounded ${
            timeline.snap
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Snap {timeline.snap ? 'ON' : 'OFF'}
        </button>

        {/* Fit to Content Button */}
        <button
          onClick={onFitToContent}
          className="px-3 py-1 text-sm rounded bg-green-500 text-white hover:bg-green-600"
          title="Fit timeline to show all clips"
        >
          Fit to Content
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2">
        {/* Split Button */}
        <button
          onClick={handleSplit}
          disabled={!canSplit}
          className={`px-3 py-1 text-sm rounded ${
            canSplit
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Split
        </button>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          disabled={!selectedClipId}
          className={`px-3 py-1 text-sm rounded ${
            selectedClipId
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Delete
        </button>

        {/* Export Button */}
        <ExportButton />
      </div>
    </div>
  );
};
