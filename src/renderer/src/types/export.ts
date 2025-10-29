// Export Settings
export interface ExportSettings {
  filename: string;
  outputPath: string;
  resolution: 'source' | '1080p' | '720p' | '4k';
  codec: 'h264' | 'h265'; // h264 for MVP
  quality: 'high' | 'medium' | 'low'; // Maps to CRF values
  fps: number | 'match-source';
}

// Export Job State
export interface ExportJob {
  id: string;
  status:
    | 'idle'
    | 'preparing'
    | 'encoding'
    | 'complete'
    | 'error'
    | 'cancelled';
  progress: number; // 0-100
  currentStep: string; // "Processing clip 3 of 7"
  estimatedTimeRemaining: number; // seconds
  error?: string;
  outputPath?: string;
  startTime?: number;
}

// Timeline Segment for Export Planning
export interface TimelineSegment {
  inputFile: string;
  startTime: number; // Trim start (offset into source)
  duration: number; // Trim duration
  outputFile: string; // Temp file path
  clipId: string; // Reference to original clip
}

// Export Progress Update
export interface ExportProgressUpdate {
  step: string;
  percent: number;
  estimatedTimeRemaining?: number;
}

// Export Complete Event
export interface ExportCompleteEvent {
  outputPath: string;
  fileSize: number;
  duration: number;
}

// Export Error Event
export interface ExportErrorEvent {
  error: string;
  code?: string;
  details?: string;
}

// Export Validation Result
export interface ExportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  estimatedFileSize?: number; // bytes
  estimatedDuration?: number; // seconds
}

// Export Preset
export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  settings: ExportSettings;
}

// Default Export Settings
export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  filename: 'ClipForge-Export',
  outputPath: '',
  resolution: 'source',
  codec: 'h264',
  quality: 'high',
  fps: 'match-source',
};

// Export Quality CRF Mapping
export const QUALITY_CRF_MAP: Record<ExportSettings['quality'], number> = {
  high: 20,
  medium: 23,
  low: 26,
};

// Resolution Scale Mapping
export const RESOLUTION_SCALE_MAP: Record<ExportSettings['resolution'], string> = {
  '1080p': '1920:1080',
  '720p': '1280:720',
  '4k': '3840:2160',
  'source': '-1:-1', // No scaling
};

// Export Status Messages
export const EXPORT_STATUS_MESSAGES = {
  idle: 'Ready to export',
  preparing: 'Preparing export...',
  encoding: 'Encoding video...',
  complete: 'Export complete!',
  error: 'Export failed',
  cancelled: 'Export cancelled',
} as const;

// Export File Extensions
export const EXPORT_FILE_EXTENSIONS = {
  h264: '.mp4',
  h265: '.mp4',
} as const;
