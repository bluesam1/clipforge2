export interface MediaFile {
  id: string;
  path: string;
  name: string;
  type: 'video' | 'audio';
  duration: number;
  width: number;
  height: number;
  fps: number;
  size: number;
  thumbnailPath?: string;
  hash: string;
  createdAt: string;
}

export interface IClipForgeAPI {
  media: {
    import: (paths: string[]) => Promise<MediaFile[]>;
    remove: (id: string) => Promise<void>;
    getThumbnail: (id: string) => Promise<string>;
  };
  file: {
    openDialog: (options: Electron.OpenDialogOptions) => Promise<string[] | null>;
  };
  project: {
    save: (projectPath: string) => Promise<void>;
    load: (projectPath: string) => Promise<MediaFile[]>;
  };
  export: {
    start: (settings: any, timeline: any, clips: any[], tracks: any[], media: MediaFile[]) => Promise<void>;
    cancel: () => Promise<void>;
    onProgress: (callback: (data: { step: string; percent: number; estimatedTimeRemaining?: number }) => void) => void;
    onComplete: (callback: (data: { outputPath: string; fileSize: number; duration: number }) => void) => void;
    onError: (callback: (data: { error: string; code?: string; details?: string }) => void) => void;
  };
}
