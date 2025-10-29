// Export Settings
export interface ExportSettings {
  filename: string;
  outputPath: string;
  resolution: 'source' | '1080p' | '720p' | '4k';
  codec: 'h264' | 'h265';
  quality: 'high' | 'medium' | 'low';
  fps: number | 'match-source';
}

// Timeline Segment for Export Planning
export interface TimelineSegment {
  inputFile: string;
  startTime: number; // Trim start (offset into source)
  duration: number; // Trim duration
  outputFile: string; // Temp file path
  clipId: string; // Reference to original clip
}

// Clip interface (from timeline)
export interface Clip {
  id: string;
  mediaId: string;
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

// Timeline interface
export interface Timeline {
  zoom: number;
  playhead: number;
  snap: boolean;
  snapThreshold: number;
  totalDuration: number;
}

// Track interface
export interface Track {
  id: string;
  kind: 'video' | 'overlay' | 'audio';
  name: string;
  clips: string[]; // Clip IDs in order
  height: number;
  locked: boolean;
}
