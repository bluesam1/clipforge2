import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { IClipForgeAPI } from '../shared/types/media';

// Custom APIs for renderer
const api: IClipForgeAPI = {
  media: {
    import: (paths: string[]) => ipcRenderer.invoke('media:import', paths),
    remove: (id: string) => ipcRenderer.invoke('media:remove', id),
    getThumbnail: (id: string) => ipcRenderer.invoke('media:getThumbnail', id),
  },
  file: {
    openDialog: (options: any) => ipcRenderer.invoke('file:openDialog', options),
    saveDialog: (options: any) => ipcRenderer.invoke('file:saveDialog', options),
    getVideosPath: () => ipcRenderer.invoke('file:getVideosPath'),
    showItemInFolder: (path: string) => ipcRenderer.invoke('file:showItemInFolder', path),
  },
  project: {
    save: (projectPath: string) => ipcRenderer.invoke('project:save', projectPath),
    load: (projectPath: string) => ipcRenderer.invoke('project:load', projectPath),
  },
  export: {
    start: (settings: any, timeline: any, clips: any[], tracks: any[], media: any[]) => 
      ipcRenderer.invoke('export:start', settings, timeline, clips, tracks, media),
    cancel: () => ipcRenderer.invoke('export:cancel'),
    onProgress: (callback: (data: { step: string; percent: number; estimatedTimeRemaining?: number }) => void) => {
      ipcRenderer.on('export:progress', (_, data) => callback(data));
    },
    onComplete: (callback: (data: { outputPath: string; fileSize: number; duration: number }) => void) => {
      ipcRenderer.on('export:complete', (_, data) => callback(data));
    },
    onError: (callback: (data: { error: string; code?: string; details?: string }) => void) => {
      ipcRenderer.on('export:error', (_, data) => callback(data));
    },
  },
  recording: {
    getSources: async () => {
      console.log('Preload: Getting sources...');
      try {
        const sources = await ipcRenderer.invoke('recording:getSources');
        console.log('Preload: Sources received:', sources);
        return sources;
      } catch (error) {
        console.error('Preload: Error getting sources:', error);
        throw error;
      }
    },
    saveFile: (data: { buffer: string; filename: string }) => ipcRenderer.invoke('recording:saveFile', data) as Promise<string>,
      convertToMP4: (data: { inputPath: string; outputPath: string; quality?: string }) => ipcRenderer.invoke('recording:convertToMP4', data) as Promise<string>,
    getProjectPath: () => ipcRenderer.invoke('recording:getProjectPath') as Promise<string>,
    requestPermissions: () => ipcRenderer.invoke('recording:requestPermissions') as Promise<boolean>,
  },
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('clipforge', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.clipforge = api;
}
