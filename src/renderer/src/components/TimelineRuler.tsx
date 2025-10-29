import React from 'react';
import { useTimelineStore } from '../stores/timelineStore';

export const TimelineRuler: React.FC = () => {
  const { timeline } = useTimelineStore();

  // Calculate tick marks based on zoom level with intelligent intervals
  const getTickMarks = () => {
    const ticks: Array<{
      time: number;
      x: number;
      isMajor: boolean;
      label: string | null;
    }> = [];
    const pixelsPerSecond = timeline.zoom;
    const totalDuration = Math.max(timeline.totalDuration, 10); // Minimum 10 seconds
    
    // Intelligent tick interval calculation based on zoom level
    let majorTickInterval: number;
    let minorTickInterval: number;
    
    if (pixelsPerSecond < 2) {
      // Very zoomed out - show minutes
      majorTickInterval = 60; // 1 minute
      minorTickInterval = 30; // 30 seconds
    } else if (pixelsPerSecond < 5) {
      // Zoomed out - show 30 second intervals
      majorTickInterval = 30; // 30 seconds
      minorTickInterval = 10; // 10 seconds
    } else if (pixelsPerSecond < 10) {
      // Moderately zoomed out - show 10 second intervals
      majorTickInterval = 10; // 10 seconds
      minorTickInterval = 2; // 2 seconds
    } else if (pixelsPerSecond < 20) {
      // Normal zoom - show 5 second intervals
      majorTickInterval = 5; // 5 seconds
      minorTickInterval = 1; // 1 second
    } else if (pixelsPerSecond < 50) {
      // Zoomed in - show 2 second intervals
      majorTickInterval = 2; // 2 seconds
      minorTickInterval = 0.5; // 0.5 seconds
    } else if (pixelsPerSecond < 100) {
      // Very zoomed in - show 1 second intervals
      majorTickInterval = 1; // 1 second
      minorTickInterval = 0.2; // 0.2 seconds
    } else {
      // Extremely zoomed in - show 0.5 second intervals
      majorTickInterval = 0.5; // 0.5 seconds
      minorTickInterval = 0.1; // 0.1 seconds
    }
    
    for (let time = 0; time <= totalDuration; time += minorTickInterval) {
      const isMajor = Math.abs(time % majorTickInterval) < 0.001; // Use small epsilon for floating point comparison
      const x = time * pixelsPerSecond;
      
      ticks.push({
        time,
        x,
        isMajor,
        label: isMajor ? formatTime(time) : null,
      });
    }

    return ticks;
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const ticks = getTickMarks();

  return (
    <div className="relative h-8 bg-gray-100 border-b border-gray-300 flex-shrink-0">
      {ticks.map((tick, index) => (
        <div key={index}>
          {/* Tick line */}
          <div
            className={`absolute top-0 w-px bg-gray-400 ${
              tick.isMajor ? 'h-6' : 'h-3'
            }`}
            style={{ left: `${tick.x}px` }}
          />
          
          {/* Time label */}
          {tick.label && (
            <div
              className="absolute top-1 text-xs text-gray-600 font-mono"
              style={{ left: `${tick.x + 2}px` }}
            >
              {tick.label}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
