export interface RecordingSettings {
  enableScreen: boolean;
  enableWebcam: boolean;
  enableAudio: boolean;
  screenSourceId?: string;
  cameraDeviceId?: string;
  microphoneDeviceId?: string;
  pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  pipSize?: 'small' | 'medium' | 'large';
  resolution?: 'source' | '1080p' | '720p' | '480p';
  quality?: 'high' | 'medium' | 'low';
  bitrate?: number;
  framerate?: number;
  outputFolder?: string;
  outputFormat?: 'webm' | 'mp4';
}

export interface RecordingState {
  status: 'idle' | 'recording' | 'paused' | 'stopped' | 'processing';
  startTime: number;
  elapsedTime: number;
  outputPath?: string;
  error?: string;
}

export interface DesktopCapturerSource {
  id: string;
  name: string;
  thumbnail: string;
  type: 'screen' | 'window';
}

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'videoinput' | 'audioinput';
  groupId?: string;
}

export interface RecordingSession {
  id: string;
  settings: RecordingSettings;
  startTime: number;
  endTime?: number;
  outputPath?: string;
  duration?: number;
  fileSize?: number;
}

export interface RecordingHistory {
  sessions: RecordingSession[];
  recentDevices: {
    camera?: string;
    microphone?: string;
    screen?: string;
  };
}

export interface RecordingError {
  code: string;
  message: string;
  details?: string;
}

export interface RecordingProgress {
  percent: number;
  step: string;
  estimatedTimeRemaining?: number;
}

export interface PiPSettings {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size: 'small' | 'medium' | 'large';
  opacity: number;
  border: boolean;
  borderColor: string;
}

export interface RecordingQuality {
  name: string;
  resolution: string;
  bitrate: number;
  framerate: number;
  description: string;
}

export const RECORDING_QUALITIES: RecordingQuality[] = [
  {
    name: 'High',
    resolution: '1080p',
    bitrate: 5000000,
    framerate: 30,
    description: 'Best quality, larger file size'
  },
  {
    name: 'Medium',
    resolution: '720p',
    bitrate: 2500000,
    framerate: 30,
    description: 'Good quality, balanced file size'
  },
  {
    name: 'Low',
    resolution: '480p',
    bitrate: 1000000,
    framerate: 24,
    description: 'Smaller file size, lower quality'
  }
];

export const PIP_SIZES = {
  small: { width: 240, height: 135 },
  medium: { width: 320, height: 180 },
  large: { width: 480, height: 270 }
};

export const PIP_POSITIONS = {
  'top-left': { x: 20, y: 20 },
  'top-right': { x: -340, y: 20 },
  'bottom-left': { x: 20, y: -200 },
  'bottom-right': { x: -340, y: -200 }
};
