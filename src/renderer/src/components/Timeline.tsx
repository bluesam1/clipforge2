import React, { useEffect } from 'react';
import { useMediaStore } from '../stores/mediaStore';
import { useTimelineStore } from '../stores/timelineStore';
import { TimelineRuler } from './TimelineRuler';
import { TimelineTrack } from './TimelineTrack';
import { Playhead } from './Playhead';
import { TimelineControls } from './TimelineControls';
import { calculateFitZoom } from '../utils/timelineCalculations';

export const Timeline: React.FC = () => {
  const { isImporting } = useMediaStore();
  const { tracks, timeline, setPlayhead, setZoom, splitClip, deleteClip, selectedClipId, clips } = useTimelineStore();

  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = x / timeline.zoom;
    setPlayhead(time);
  };

  const handleFitToContent = () => {
    const availableWidth = 800; // Minimum container width
    const optimalZoom = calculateFitZoom(clips, availableWidth);
    setZoom(optimalZoom);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when timeline is focused or no input is focused
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case ' ':
          event.preventDefault();
          // Toggle play/pause (placeholder for future implementation)
          break;
        case 's':
          event.preventDefault();
          if (selectedClipId) {
            splitClip(selectedClipId, timeline.playhead);
          }
          break;
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          if (selectedClipId) {
            deleteClip(selectedClipId);
          }
          break;
        case '+':
        case '=':
          event.preventDefault();
          setZoom(Math.min(1000, timeline.zoom + 10));
          break;
        case '-':
          event.preventDefault();
          setZoom(Math.max(1, timeline.zoom - 10));
          break;
        case 'ArrowLeft':
          event.preventDefault();
          setPlayhead(Math.max(0, timeline.playhead - 0.1));
          break;
        case 'ArrowRight':
          event.preventDefault();
          setPlayhead(timeline.playhead + 0.1);
          break;
        case 'f':
          event.preventDefault();
          handleFitToContent();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [timeline.playhead, timeline.zoom, selectedClipId, setPlayhead, setZoom, splitClip, deleteClip]);

  return (
    <div className="flex flex-col bg-timeline-bg border-t border-gray-300 h-full">
      {/* Timeline Controls */}
      <TimelineControls onFitToContent={handleFitToContent} />
      
      {/* Loading State */}
      {isImporting && (
        <div className="flex items-center justify-center p-4 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center space-x-2 text-yellow-700">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
            <span className="text-sm">Importing media...</span>
          </div>
        </div>
      )}
      
      {/* Timeline Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Track Labels */}
        <div className="flex-shrink-0 w-24 bg-gray-100 border-r border-gray-300 flex flex-col">
          {/* Ruler Label Space */}
          <div className="h-8 border-b border-gray-300 flex-shrink-0"></div>
          
          {/* Track Labels */}
          {tracks.map((track) => (
            <div
              key={track.id}
              className={`h-20 border-b border-gray-300 flex items-center px-2 text-sm font-medium text-gray-700 flex-shrink-0 ${
                track.id === 'track-1' ? 'bg-gray-50' : 'bg-track-alt'
              }`}
            >
              {track.name}
            </div>
          ))}
        </div>
        
        {/* Scrollable Timeline Content */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div
            className="relative cursor-pointer"
            data-timeline-container
            style={{ 
              width: `${Math.max(timeline.totalDuration * timeline.zoom, 1500)}px`,
              minWidth: '100%',
              height: '200px',
              position: 'relative',
              backgroundColor: 'rgba(0,0,0,0.01)' // Force rendering
            }}
            onClick={handleTimelineClick}
          >
            {/* Timeline Ruler */}
            <TimelineRuler />
            
            {/* Tracks */}
            <div className="relative">
              {tracks.map((track) => (
                <TimelineTrack key={track.id} track={track} />
              ))}
            </div>
            
            {/* Playhead */}
            <Playhead />
          </div>
        </div>
      </div>
    </div>
  );
};
