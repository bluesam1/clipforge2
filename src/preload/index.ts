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
  },
  project: {
    save: (projectPath: string) => ipcRenderer.invoke('project:save', projectPath),
    load: (projectPath: string) => ipcRenderer.invoke('project:load', projectPath),
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
