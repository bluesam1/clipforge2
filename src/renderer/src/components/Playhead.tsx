import React, { useState } from 'react';
import { useTimelineStore } from '../stores/timelineStore';

export const Playhead: React.FC = () => {
  const { timeline, setPlayhead } = useTimelineStore();
  const [isDragging, setIsDragging] = useState(false);

  // BULLETPROOF positioning - multiple fallbacks
  const playheadPosition = Math.max(timeline.playhead || 0, 0);
  const zoom = Math.max(timeline.zoom || 50, 1); // Minimum zoom
  const leftPosition = playheadPosition * zoom; // Allow 0s position
  
  // Force visibility - if position is invalid, use fallback
  const finalLeftPosition = isNaN(leftPosition) || leftPosition < 0 ? 50 : leftPosition;

  const handleMouseDown = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (isDragging) {
      // Get the timeline container to calculate position
      const timelineContainer = document.querySelector('[data-timeline-container]');
      if (timelineContainer) {
        const rect = timelineContainer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const time = x / timeline.zoom;
        setPlayhead(time);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging]);

  // DEBUG: Force visibility with multiple elements
  console.log('Playhead DEBUG:', {
    playhead: timeline.playhead,
    zoom: timeline.zoom,
    leftPosition,
    finalLeftPosition,
    isDragging
  });

  return (
    <>
      {/* BULLETPROOF Playhead - Multiple layers for visibility */}
      
      {/* Layer 1: Main playhead line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
        style={{ 
          left: `${finalLeftPosition}px`,
          zIndex: 9999,
          backgroundColor: 'red',
          minWidth: '2px'
        }}
      />
      
      {/* Layer 2: Backup playhead line */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-red-600 pointer-events-none"
        style={{ 
          left: `${finalLeftPosition - 1}px`,
          zIndex: 9998,
          backgroundColor: 'darkred',
          minWidth: '2px'
        }}
      />
      
      {/* Layer 3: Handle - Centered */}
      <div
        className="absolute -top-2 w-4 h-4 bg-red-500 rounded-full cursor-grab active:cursor-grabbing pointer-events-auto"
        style={{
          left: `${finalLeftPosition - 8}px`, // Center the 16px handle (8px offset)
          zIndex: 10000,
          backgroundColor: 'red',
          border: '1px solid white'
        }}
        onMouseDown={handleMouseDown}
      />
      
      {/* Layer 4: Emergency visibility indicator */}
      <div
        className="fixed top-2 right-2 w-3 h-3 bg-red-500 rounded-full"
        style={{ zIndex: 10001 }}
        title={`Playhead at ${finalLeftPosition}px`}
      />
    </>
  );
};
