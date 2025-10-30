import { RecordingSettings, PiPSettings } from '../types/recording';

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function getDefaultRecordingSettings(): RecordingSettings {
  return {
    enableScreen: true,
    enableWebcam: false,
    enableAudio: true,
    resolution: '1080p',
    quality: 'medium',
    bitrate: 2500000,
    framerate: 30,
    pipPosition: 'bottom-right',
    pipSize: 'medium'
  };
}

export function getQualitySettings(quality: string): Partial<RecordingSettings> {
  const qualityMap: Record<string, Partial<RecordingSettings>> = {
    high: {
      bitrate: 5000000,
      framerate: 30,
      resolution: '1080p'
    },
    medium: {
      bitrate: 2500000,
      framerate: 30,
      resolution: '720p'
    },
    low: {
      bitrate: 1000000,
      framerate: 24,
      resolution: '480p'
    }
  };

  return qualityMap[quality] || qualityMap.medium;
}

export function validateRecordingSettings(settings: RecordingSettings): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // At least one recording type must be enabled
  if (!settings.enableScreen && !settings.enableWebcam && !settings.enableAudio) {
    errors.push('At least one recording type must be enabled');
  }

  if (settings.enableScreen && !settings.screenSourceId) {
    errors.push('Screen source is required for screen recording');
  }

  if (settings.enableWebcam && !settings.cameraDeviceId) {
    errors.push('Camera device is required for webcam recording');
  }

  if (settings.enableAudio && !settings.microphoneDeviceId) {
    errors.push('Microphone device is required for audio recording');
  }

  if (settings.bitrate && (settings.bitrate < 100000 || settings.bitrate > 10000000)) {
    errors.push('Bitrate must be between 100kbps and 10Mbps');
  }

  if (settings.framerate && (settings.framerate < 1 || settings.framerate > 60)) {
    errors.push('Framerate must be between 1 and 60 fps');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function generateRecordingFilename(settings: RecordingSettings): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const modes: string[] = [];
  if (settings.enableScreen) modes.push('screen');
  if (settings.enableWebcam) modes.push('webcam');
  if (settings.enableAudio) modes.push('audio');
  const modeString = modes.join('_');
  return `recording_${modeString}_${timestamp}.webm`;
}

export function getPiPSettings(settings: RecordingSettings): PiPSettings {
  return {
    position: settings.pipPosition || 'bottom-right',
    size: settings.pipSize || 'medium',
    opacity: 1.0,
    border: true,
    borderColor: '#ffffff'
  };
}

export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function calculateRecordingSize(bitrate: number, duration: number): number {
  // Convert bitrate from bps to bytes and duration from ms to seconds
  return (bitrate * duration) / (8 * 1000);
}

export function estimateRecordingTime(bitrate: number, availableSpace: number): number {
  // Return estimated recording time in milliseconds
  return (availableSpace * 8 * 1000) / bitrate;
}

export function getSupportedMimeTypes(): string[] {
  const types = [
    'video/webm; codecs=vp9',
    'video/webm; codecs=vp8',
    'video/webm',
    'video/mp4; codecs=h264',
    'video/mp4'
  ];

  return types.filter(type => MediaRecorder.isTypeSupported(type));
}

export function getBestMimeType(): string {
  const supported = getSupportedMimeTypes();
  
  // Prefer VP9 for better compression
  if (supported.includes('video/webm; codecs=vp9')) {
    return 'video/webm; codecs=vp9';
  }
  
  // Fall back to VP8
  if (supported.includes('video/webm; codecs=vp8')) {
    return 'video/webm; codecs=vp8';
  }
  
  // Fall back to basic WebM
  if (supported.includes('video/webm')) {
    return 'video/webm';
  }
  
  // Last resort - MP4
  if (supported.includes('video/mp4; codecs=h264')) {
    return 'video/mp4; codecs=h264';
  }
  
  return 'video/webm';
}

export function createRecordingThumbnail(video: HTMLVideoElement, timestamp: number = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    canvas.width = 320;
    canvas.height = 180;

    video.currentTime = timestamp;
    
    video.addEventListener('seeked', () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataURL = canvas.toDataURL('image/jpeg', 0.8);
      resolve(dataURL);
    }, { once: true });

    video.addEventListener('error', () => {
      reject(new Error('Video error while creating thumbnail'));
    }, { once: true });
  });
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function getDeviceLabel(device: MediaDeviceInfo): string {
  if (device.label) {
    return device.label;
  }
  
  const kind = device.kind === 'videoinput' ? 'Camera' : 'Microphone';
  const id = device.deviceId.slice(0, 8);
  return `${kind} ${id}`;
}

export function isScreenRecordingSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
}

export function isWebcamRecordingSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

export function isAudioRecordingSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

export function checkRecordingPermissions(): Promise<{
  screen: boolean;
  camera: boolean;
  microphone: boolean;
}> {
  return new Promise(async (resolve) => {
    const permissions = {
      screen: false,
      camera: false,
      microphone: false
    };

    try {
      // Check screen recording permission
      if (isScreenRecordingSupported()) {
        try {
          await navigator.mediaDevices.getDisplayMedia({ video: true });
          permissions.screen = true;
        } catch (e) {
          // Permission denied or not supported
        }
      }

      // Check camera permission
      if (isWebcamRecordingSupported()) {
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
          permissions.camera = true;
        } catch (e) {
          // Permission denied or not supported
        }
      }

      // Check microphone permission
      if (isAudioRecordingSupported()) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          permissions.microphone = true;
        } catch (e) {
          // Permission denied or not supported
        }
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    }

    resolve(permissions);
  });
}

// Recording presets inspired by professional video editors
export const RECORDING_PRESETS = {
  'screen-hd': {
    name: 'Screen HD',
    resolution: '1080p' as const,
    quality: 'high' as const,
    bitrate: 5000000,
    framerate: 30
  },
  'screen-sd': {
    name: 'Screen SD',
    resolution: '720p' as const,
    quality: 'medium' as const,
    bitrate: 2500000,
    framerate: 30
  },
  'audio-only': {
    name: 'Audio Only',
    resolution: 'source' as const,
    quality: 'high' as const,
    bitrate: 128000,
    framerate: 0
  },
  'webcam-hd': {
    name: 'Webcam HD',
    resolution: '1080p' as const,
    quality: 'high' as const,
    bitrate: 2000000,
    framerate: 30
  }
} as const;

export type RecordingPreset = keyof typeof RECORDING_PRESETS;
