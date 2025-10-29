// Re-export from shared types
export type { MediaFile, IClipForgeAPI } from '../../../shared/types/media';

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles' | 'createDirectory' | 'promptToCreate' | 'noResolveAliases' | 'treatPackageAsDirectory' | 'dontAddToRecent'>;
}

// Timeline-specific types
export interface Track {
  id: string;
  kind: 'video' | 'overlay' | 'audio';
  name: string;
  clips: string[]; // Clip IDs in order
  height: number; // Pixels
  locked: boolean; // Future: prevent edits
}

export interface Clip {
  id: string;
  mediaId: string; // Reference to MediaFile
  trackId: string;
  start: number; // Timeline position (seconds)
  end: number; // Timeline position (seconds)
  offset: number; // Trim offset into source media (seconds)
  duration: number; // end - start
  transforms: {
    scale: number;
    x: number;
    y: number;
  };
  volume: number;
}

export interface Timeline {
  zoom: number; // Pixels per second
  playhead: number; // Current time (seconds)
  snap: boolean; // Snap enabled
  snapThreshold: number; // Pixels
  totalDuration: number; // Computed from rightmost clip
}