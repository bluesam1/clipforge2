import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Track, Clip, Timeline } from '../types/media';
import { calculateTotalDuration } from '../utils/timelineCalculations';

interface TimelineState {
  // Timeline data
  tracks: Track[];
  clips: Clip[];
  timeline: Timeline;
  selectedClipId: string | null;
  
  // Actions
  addClip: (mediaId: string, trackId: string, start: number, duration: number, offset?: number) => void;
  moveClip: (clipId: string, newStart: number, newTrackId?: string) => void;
  trimClip: (clipId: string, newStart: number, newEnd: number) => void;
  splitClip: (clipId: string, splitTime: number) => void;
  deleteClip: (clipId: string) => void;
  selectClip: (clipId: string | null) => void;
  setPlayhead: (playhead: number) => void;
  setZoom: (zoom: number) => void;
  toggleSnap: () => void;
  setSnapThreshold: (threshold: number) => void;
  updateTotalDuration: () => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  // Initial state
  tracks: [
    {
      id: 'track-1',
      kind: 'video',
      name: 'Track 1',
      clips: [],
      height: 80,
      locked: false,
    },
    {
      id: 'track-2',
      kind: 'overlay',
      name: 'Track 2',
      clips: [],
      height: 80,
      locked: false,
    },
  ],
  clips: [],
  timeline: {
    zoom: 50, // 50 pixels per second
    playhead: 0,
    snap: true,
    snapThreshold: 10, // 10 pixels
    totalDuration: 0,
  },
  selectedClipId: null,

  // Actions
  addClip: (mediaId: string, trackId: string, start: number, duration: number, offset: number = 0) => {
    const clipId = uuidv4();
    const newClip: Clip = {
      id: clipId,
      mediaId,
      trackId,
      start,
      end: start + duration,
      offset,
      duration,
      transforms: {
        scale: 1,
        x: 0,
        y: 0,
      },
      volume: 1,
    };

    console.log('🎬 ADDING CLIP:', {
      clipId,
      mediaId,
      trackId,
      start,
      duration,
      end: newClip.end
    });

    set((state) => {
      const newClips = [...state.clips, newClip];
      const newTracks = state.tracks.map(track => 
        track.id === trackId 
          ? { ...track, clips: [...track.clips, clipId] }
          : track
      );
      
      const totalDuration = calculateTotalDuration(newClips);
      
      return {
        clips: newClips,
        tracks: newTracks,
        timeline: {
          ...state.timeline,
          totalDuration,
        },
      };
    });
  },

  moveClip: (clipId: string, newStart: number, newTrackId?: string) => {
    set((state) => {
      const clip = state.clips.find(c => c.id === clipId);
      if (!clip) return state;

      const duration = clip.end - clip.start;
      const newEnd = newStart + duration;
      const targetTrackId = newTrackId || clip.trackId;

      const updatedClips = state.clips.map(c =>
        c.id === clipId
          ? { ...c, start: newStart, end: newEnd, trackId: targetTrackId }
          : c
      );

      // Update track clips arrays
      const newTracks = state.tracks.map(track => {
        if (track.id === clip.trackId) {
          // Remove from old track
          return { ...track, clips: track.clips.filter(id => id !== clipId) };
        } else if (track.id === targetTrackId) {
          // Add to new track
          return { ...track, clips: [...track.clips, clipId] };
        }
        return track;
      });

      const totalDuration = calculateTotalDuration(updatedClips);

      return {
        clips: updatedClips,
        tracks: newTracks,
        timeline: {
          ...state.timeline,
          totalDuration,
        },
      };
    });
  },

  trimClip: (clipId: string, newStart: number, newEnd: number) => {
    set((state) => {
      const updatedClips = state.clips.map(clip =>
        clip.id === clipId
          ? {
              ...clip,
              start: newStart,
              end: newEnd,
              duration: newEnd - newStart,
            }
          : clip
      );

      const totalDuration = calculateTotalDuration(updatedClips);

      return {
        clips: updatedClips,
        timeline: {
          ...state.timeline,
          totalDuration,
        },
      };
    });
  },

  splitClip: (clipId: string, splitTime: number) => {
    set((state) => {
      const clip = state.clips.find(c => c.id === clipId);
      if (!clip) return state;

      const firstClip: Clip = {
        ...clip,
        end: splitTime,
        duration: splitTime - clip.start,
      };

      const secondClip: Clip = {
        ...clip,
        id: uuidv4(),
        start: splitTime,
        duration: clip.end - splitTime,
        offset: clip.offset + (splitTime - clip.start),
      };

      const updatedClips = state.clips.map(c =>
        c.id === clipId ? firstClip : c
      );
      updatedClips.push(secondClip);

      // Update track clips array
      const newTracks = state.tracks.map(track =>
        track.id === clip.trackId
          ? { ...track, clips: [...track.clips, secondClip.id] }
          : track
      );

      const totalDuration = calculateTotalDuration(updatedClips);

      return {
        clips: updatedClips,
        tracks: newTracks,
        timeline: {
          ...state.timeline,
          totalDuration,
        },
      };
    });
  },

  deleteClip: (clipId: string) => {
    set((state) => {
      const clip = state.clips.find(c => c.id === clipId);
      if (!clip) return state;

      const updatedClips = state.clips.filter(c => c.id !== clipId);
      const newTracks = state.tracks.map(track =>
        track.id === clip.trackId
          ? { ...track, clips: track.clips.filter(id => id !== clipId) }
          : track
      );

      const totalDuration = calculateTotalDuration(updatedClips);

      return {
        clips: updatedClips,
        tracks: newTracks,
        timeline: {
          ...state.timeline,
          totalDuration,
        },
        selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
      };
    });
  },

  selectClip: (clipId: string | null) => {
    set({ selectedClipId: clipId });
  },

  setPlayhead: (playhead: number) => {
    set((state) => ({
      timeline: {
        ...state.timeline,
        playhead: Math.max(0, playhead),
      },
    }));
  },

  setZoom: (zoom: number) => {
    set((state) => ({
      timeline: {
        ...state.timeline,
        zoom: Math.max(1, Math.min(1000, zoom)),
      },
    }));
  },

  toggleSnap: () => {
    set((state) => ({
      timeline: {
        ...state.timeline,
        snap: !state.timeline.snap,
      },
    }));
  },

  setSnapThreshold: (threshold: number) => {
    set((state) => ({
      timeline: {
        ...state.timeline,
        snapThreshold: Math.max(1, threshold),
      },
    }));
  },

  updateTotalDuration: () => {
    set((state) => {
      const totalDuration = calculateTotalDuration(state.clips);
      return {
        timeline: {
          ...state.timeline,
          totalDuration,
        },
      };
    });
  },
}));
