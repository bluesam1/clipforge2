import React, { useState } from 'react';
import { Clip } from '../types/media';
import { useMediaStore } from '../stores/mediaStore';
import { useTimelineStore } from '../stores/timelineStore';

interface TimelineClipProps {
  clip: Clip;
}

export const TimelineClip: React.FC<TimelineClipProps> = ({ clip }) => {
  const { media } = useMediaStore();
  const { selectedClipId, selectClip, moveClip, trimClip, clips, timeline } = useTimelineStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isTrimming, setIsTrimming] = useState<'start' | 'end' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, startTime: 0 });

  const mediaFile = media.find(m => m.id === clip.mediaId);
  const isSelected = selectedClipId === clip.id;

  const handleMouseDown = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault(); // Prevent timeline click handler
    selectClip(clip.id);
    setIsDragging(true);
    setDragStart({
      x: event.clientX,
      startTime: clip.start,
    });
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (isDragging) {
      const deltaX = event.clientX - dragStart.x;
      const deltaTime = deltaX / timeline.zoom;
      let newStart = Math.max(0, dragStart.startTime + deltaTime);
      
      // Apply snapping if enabled
      if (timeline.snap) {
        newStart = snapPosition(newStart, clip.id, timeline.snapThreshold);
      }
      
      moveClip(clip.id, newStart);
    }
  };

  // Snap position function
  const snapPosition = (position: number, clipId: string, threshold: number = 10): number => {
    if (!timeline.snap) return position;

    const pixelsPerSecond = timeline.zoom;
    const thresholdSeconds = threshold / pixelsPerSecond;

    // Snap targets: playhead, other clip edges
    const targets = [timeline.playhead];
    clips.forEach((c) => {
      if (c.id !== clipId) {
        targets.push(c.start, c.end);
      }
    });

    for (const target of targets) {
      if (Math.abs(position - target) < thresholdSeconds) {
        return target; // Snap to target
      }
    }

    return position; // No snap
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTrimStart = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault(); // Prevent timeline click handler
    setIsTrimming('start');
    setDragStart({
      x: event.clientX,
      startTime: clip.start,
    });
  };

  const handleTrimEnd = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault(); // Prevent timeline click handler
    setIsTrimming('end');
    setDragStart({
      x: event.clientX,
      startTime: clip.end,
    });
  };

  const handleTrimMove = (event: MouseEvent) => {
    if (isTrimming) {
      const deltaX = event.clientX - dragStart.x;
      const deltaTime = deltaX / timeline.zoom;
      if (isTrimming === 'start') {
        const newStart = Math.max(0, dragStart.startTime + deltaTime);
        trimClip(clip.id, newStart, clip.end);
      } else if (isTrimming === 'end') {
        const newEnd = Math.max(clip.start + 0.1, dragStart.startTime + deltaTime);
        trimClip(clip.id, clip.start, newEnd);
      }
    }
  };

  const handleTrimUp = () => {
    setIsTrimming(null);
  };

  // Add global event listeners for dragging and trimming
  React.useEffect(() => {
    if (isDragging || isTrimming) {
      document.addEventListener('mousemove', isDragging ? handleMouseMove : handleTrimMove);
      document.addEventListener('mouseup', isDragging ? handleMouseUp : handleTrimUp);
      return () => {
        document.removeEventListener('mousemove', isDragging ? handleMouseMove : handleTrimMove);
        document.removeEventListener('mouseup', isDragging ? handleMouseUp : handleTrimUp);
      };
    }
    return undefined;
  }, [isDragging, isTrimming]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate trimmed seconds for display
  const getTrimmedSeconds = () => {
    if (!mediaFile) return { startTrim: 0, endTrim: 0 };
    
    const startTrim = clip.offset;
    const endTrim = mediaFile.duration - (clip.offset + clip.duration);
    
    return {
      startTrim: Math.max(0, startTrim),
      endTrim: Math.max(0, endTrim)
    };
  };

  const { startTrim, endTrim } = getTrimmedSeconds();

  // Format trim time as m:ss
  const formatTrimTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`absolute top-1 bottom-1 rounded border-2 transition-all duration-150 ${
        isDragging 
          ? 'cursor-grabbing opacity-70 shadow-lg' 
          : isTrimming
          ? 'cursor-col-resize'
          : 'cursor-grab hover:shadow-md'
      } ${
        isSelected 
          ? 'border-clip-selected bg-blue-100' 
          : 'border-gray-600 bg-gray-200 hover:border-blue-400'
      }`}
      style={{
        left: `${clip.start * timeline.zoom}px`,
        width: `${clip.duration * timeline.zoom}px`,
        minWidth: '40px', // Minimum width for very short clips
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Clip Content */}
      <div className="h-full p-1 flex flex-col justify-between text-xs">
        <div className="font-medium truncate">
          {mediaFile?.name || 'Unknown'}
        </div>
        <div className="text-gray-600">
          {formatDuration(clip.duration)}
        </div>
      </div>

      {/* Trim Indicators */}
      {startTrim > 0 && (
        <div className="absolute left-1 top-1/2 transform -translate-y-1/2 text-red-400 text-[10px] font-medium pointer-events-none">
          -{formatTrimTime(startTrim)}
        </div>
      )}
      {endTrim > 0 && (
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 text-red-400 text-[10px] font-medium pointer-events-none">
          -{formatTrimTime(endTrim)}
        </div>
      )}

      {/* Trim Handles */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-2 transition-colors duration-150 ${
          isTrimming === 'start' 
            ? 'bg-blue-500 bg-opacity-70' 
            : 'bg-transparent hover:bg-blue-500 hover:bg-opacity-50'
        }`}
        onMouseDown={handleTrimStart}
      />
      <div
        className={`absolute right-0 top-0 bottom-0 w-2 transition-colors duration-150 ${
          isTrimming === 'end' 
            ? 'bg-blue-500 bg-opacity-70' 
            : 'bg-transparent hover:bg-blue-500 hover:bg-opacity-50'
        }`}
        onMouseDown={handleTrimEnd}
      />
    </div>
  );
};
