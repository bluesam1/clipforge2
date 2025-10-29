import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { MediaFile, Track, Clip, Timeline } from '../types/media';
import { toast } from '../utils/toast';

interface MediaState {
  // State
  media: MediaFile[];
  selectedMediaId: string | null;
  currentPreview: MediaFile | null;
  isImporting: boolean;
  error: string | null;

  // Timeline State
  tracks: Track[];
  clips: Clip[];
  timeline: Timeline;
  selectedClipId: string | null;

  // Actions
  importMedia: (files: File[] | string[]) => Promise<void>;
  selectMedia: (id: string) => void;
  removeMedia: (id: string) => Promise<void>;
  loadPreview: (id: string) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Timeline Actions
  addClip: (mediaId: string, trackId: string, position: number) => void;
  moveClip: (clipId: string, newStart: number) => void;
  trimClip: (clipId: string, edge: 'start' | 'end', newValue: number) => void;
  splitClip: (clipId: string, position: number) => void;
  deleteClip: (clipId: string) => void;
  selectClip: (clipId: string) => void;
  setPlayhead: (time: number) => void;
  setZoom: (zoom: number) => void;
  toggleSnap: () => void;
}

export const useMediaStore = create<MediaState>((set, get) => ({
  // Initial state
  media: [],
  selectedMediaId: null,
  currentPreview: null,
  isImporting: false,
  error: null,

  // Timeline initial state
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
    playhead: 2, // Start at 2 seconds for visibility (100px)
    snap: true,
    snapThreshold: 10, // 10 pixels
    totalDuration: 0,
  },
  selectedClipId: null,

  // Actions
  importMedia: async (files: File[] | string[]) => {
    console.log('Starting import process with files:', files);
    set({ isImporting: true, error: null });
    
    try {
      let filePaths: string[] = [];
      
      if (files.length > 0 && files[0] instanceof File) {
        // Handle File objects (from drag and drop)
        // Note: In Electron, File objects from drag and drop have a path property
        filePaths = (files as File[]).map(file => (file as any).path);
        console.log('Mapped File objects to paths:', filePaths);
      } else {
        // Handle string paths (from file picker)
        filePaths = files as string[];
        console.log('Using string paths:', filePaths);
      }

      console.log('Calling main process to import media...');
      // Call the main process to import media
      const importedFiles = await window.clipforge.media.import(filePaths);
      console.log('Main process returned:', importedFiles);
      console.log('First imported file path:', importedFiles[0]?.path);
      console.log('First imported file thumbnail:', importedFiles[0]?.thumbnailPath);
      
      set(state => ({
        media: [...state.media, ...importedFiles],
        isImporting: false,
        // Auto-select the first imported file if none is currently selected
        selectedMediaId: state.selectedMediaId || (importedFiles.length > 0 ? importedFiles[0].id : state.selectedMediaId),
      }));
      
      if (importedFiles.length > 0) {
        toast.success(`Successfully imported ${importedFiles.length} file(s)`);
        // Auto-load preview for the first imported file
        console.log('Auto-loading preview for:', importedFiles[0].id);
        get().loadPreview(importedFiles[0].id);
      }
    } catch (error) {
      console.error('Error importing media:', error);
      const errorMessage = `Failed to import media: ${error instanceof Error ? error.message : 'Unknown error'}`;
      set({
        error: errorMessage,
        isImporting: false,
      });
      toast.error(errorMessage);
    }
  },

  selectMedia: (id: string) => {
    set({ selectedMediaId: id });
    // Automatically load preview when selecting media
    get().loadPreview(id);
  },

  removeMedia: async (id: string) => {
    try {
      await window.clipforge.media.remove(id);
      set(state => ({
        media: state.media.filter(media => media.id !== id),
        selectedMediaId: state.selectedMediaId === id ? null : state.selectedMediaId,
        currentPreview: state.currentPreview?.id === id ? null : state.currentPreview,
      }));
      toast.success('Media removed successfully');
    } catch (error) {
      console.error('Error removing media:', error);
      const errorMessage = `Failed to remove media: ${error instanceof Error ? error.message : 'Unknown error'}`;
      set({ error: errorMessage });
      toast.error(errorMessage);
    }
  },

  loadPreview: (id: string) => {
    const media = get().media.find(m => m.id === id);
    console.log('Loading preview for ID:', id, 'Found media:', media);
    if (media) {
      set({ currentPreview: media });
      console.log('Preview loaded:', media.name);
    } else {
      console.log('Media not found for ID:', id);
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  // Timeline Actions
  addClip: (mediaId: string, trackId: string, position: number) => {
    const media = get().media.find(m => m.id === mediaId);
    if (!media) return;

    const clipId = uuidv4();
    const duration = media.duration || 10; // Default 10 seconds if no duration
    
    const newClip: Clip = {
      id: clipId,
      mediaId,
      trackId,
      start: position,
      end: position + duration,
      offset: 0,
      duration,
      transforms: {
        scale: 1,
        x: 0,
        y: 0,
      },
      volume: 1,
    };

    set(state => {
      const updatedClips = [...state.clips, newClip];
      const maxEnd = Math.max(...updatedClips.map(clip => clip.end));
      
      return {
        clips: updatedClips,
        tracks: state.tracks.map(track =>
          track.id === trackId
            ? { ...track, clips: [...track.clips, clipId] }
            : track
        ),
        timeline: {
          ...state.timeline,
          totalDuration: Math.max(maxEnd, 10), // Minimum 10 seconds
        },
      };
    });
  },

  moveClip: (clipId: string, newStart: number) => {
    set(state => {
      const updatedClips = state.clips.map(clip =>
        clip.id === clipId
          ? {
              ...clip,
              start: newStart,
              end: newStart + clip.duration,
            }
          : clip
      );
      const maxEnd = Math.max(...updatedClips.map(clip => clip.end));
      
      return {
        clips: updatedClips,
        timeline: {
          ...state.timeline,
          totalDuration: Math.max(maxEnd, 10),
        },
      };
    });
  },

  trimClip: (clipId: string, edge: 'start' | 'end', newValue: number) => {
    set(state => {
      const clip = state.clips.find(c => c.id === clipId);
      if (!clip) return state;

      const media = state.media.find(m => m.id === clip.mediaId);
      if (!media) return state;

      const maxDuration = (media.duration || 10) - clip.offset;
      const minDuration = 0.1; // Minimum 0.1 seconds

      let updatedClip = { ...clip };

      if (edge === 'start') {
        const newDuration = clip.end - newValue;
        if (newDuration >= minDuration && newDuration <= maxDuration) {
          updatedClip = {
            ...clip,
            start: newValue,
            duration: newDuration,
            offset: clip.offset + (clip.start - newValue),
          };
        }
      } else {
        const newDuration = newValue - clip.start;
        if (newDuration >= minDuration && newDuration <= maxDuration) {
          updatedClip = {
            ...clip,
            end: newValue,
            duration: newDuration,
          };
        }
      }

      const updatedClips = state.clips.map(c => (c.id === clipId ? updatedClip : c));
      const maxEnd = Math.max(...updatedClips.map(clip => clip.end));
      
      return {
        ...state,
        clips: updatedClips,
        timeline: {
          ...state.timeline,
          totalDuration: Math.max(maxEnd, 10),
        },
      };
    });
  },

  splitClip: (clipId: string, position: number) => {
    set(state => {
      const clip = state.clips.find(c => c.id === clipId);
      if (!clip || position <= clip.start || position >= clip.end) return state;

      const splitOffset = clip.offset + (position - clip.start);
      const firstClipDuration = position - clip.start;
      const secondClipDuration = clip.end - position;

      const firstClip: Clip = {
        ...clip,
        end: position,
        duration: firstClipDuration,
      };

      const secondClip: Clip = {
        ...clip,
        id: uuidv4(),
        start: position,
        end: clip.end,
        offset: splitOffset,
        duration: secondClipDuration,
      };

      const track = state.tracks.find(t => t.id === clip.trackId);
      if (!track) return state;

      const clipIndex = track.clips.indexOf(clipId);
      const newClips = [...track.clips];
      newClips.splice(clipIndex + 1, 0, secondClip.id);

      const updatedClips = state.clips.map(c => (c.id === clipId ? firstClip : c)).concat(secondClip);
      const maxEnd = Math.max(...updatedClips.map(clip => clip.end));
      
      return {
        ...state,
        clips: updatedClips,
        tracks: state.tracks.map(t =>
          t.id === clip.trackId
            ? { ...t, clips: newClips }
            : t
        ),
        timeline: {
          ...state.timeline,
          totalDuration: Math.max(maxEnd, 10),
        },
      };
    });
  },

  deleteClip: (clipId: string) => {
    set(state => {
      const clip = state.clips.find(c => c.id === clipId);
      if (!clip) return state;

      const updatedClips = state.clips.filter(c => c.id !== clipId);
      const maxEnd = updatedClips.length > 0 ? Math.max(...updatedClips.map(clip => clip.end)) : 10;
      
      return {
        ...state,
        clips: updatedClips,
        tracks: state.tracks.map(track =>
          track.id === clip.trackId
            ? { ...track, clips: track.clips.filter(id => id !== clipId) }
            : track
        ),
        selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
        timeline: {
          ...state.timeline,
          totalDuration: Math.max(maxEnd, 10),
        },
      };
    });
  },

  selectClip: (clipId: string) => {
    set({ selectedClipId: clipId });
  },

  setPlayhead: (time: number) => {
    set(state => ({
      timeline: { ...state.timeline, playhead: Math.max(0, time) },
    }));
  },

  setZoom: (zoom: number) => {
    set(state => ({
      timeline: { ...state.timeline, zoom: Math.max(10, Math.min(100, zoom)) },
    }));
  },

  toggleSnap: () => {
    set(state => ({
      timeline: { ...state.timeline, snap: !state.timeline.snap },
    }));
  },
}));
