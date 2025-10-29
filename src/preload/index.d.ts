import { ElectronAPI } from '@electron-toolkit/preload';
import { IClipForgeAPI } from '../shared/types/media';

declare global {
  interface Window {
    electron: ElectronAPI;
    clipforge: IClipForgeAPI;
  }
}
