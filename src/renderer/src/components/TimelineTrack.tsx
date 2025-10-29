import React from 'react';
import { Track } from '../types/media';
import { useMediaStore } from '../stores/mediaStore';
import { useTimelineStore } from '../stores/timelineStore';
import { TimelineClip } from './TimelineClip';

interface TimelineTrackProps {
  track: Track;
}

export const TimelineTrack: React.FC<TimelineTrackProps> = ({ track }) => {
  const { timeline, addClip, clips } = useTimelineStore();

  // Get clips for this track
  const trackClips = clips.filter(clip => clip.trackId === track.id);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = x / timeline.zoom;
    
    const mediaId = event.dataTransfer.getData('mediaId');
    if (mediaId) {
      // Get media duration for the clip
      const media = useMediaStore.getState().media.find(m => m.id === mediaId);
      const duration = media?.duration || 10; // Default 10 seconds if no duration
      addClip(mediaId, track.id, time, duration);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div
      className={`h-20 border-b border-gray-300 flex items-center relative ${
        track.id === 'track-1' ? 'bg-gray-50' : 'bg-track-alt'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Clips Container - Full Width */}
      <div className="w-full relative h-full">
        {trackClips.map((clip) => (
          <TimelineClip key={clip.id} clip={clip} />
        ))}
      </div>
    </div>
  );
};
