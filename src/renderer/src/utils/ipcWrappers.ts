// IPC wrapper utilities for main/renderer communication
// This centralizes IPC patterns and provides type-safe wrappers

export interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Generic IPC call wrapper with error handling
 */
export async function ipcCall<T = any>(
  channel: string,
  ...args: any[]
): Promise<IPCResponse<T>> {
  try {
    // Check if we're in an Electron environment
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const result = await (window as any).electronAPI.invoke(channel, ...args);
      return {
        success: true,
        data: result,
      };
    } else {
      console.warn('Electron API not available, using mock response');
      return {
        success: false,
        error: 'Electron API not available',
      };
    }
  } catch (error) {
    console.error(`IPC call failed for channel ${channel}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Media import IPC wrapper
 */
export async function importMedia(filePaths: string[]): Promise<IPCResponse<any[]>> {
  return ipcCall('import-media', filePaths);
}

/**
 * Export video IPC wrapper
 */
export async function exportVideo(
  outputPath: string,
  clips: any[],
  settings: any
): Promise<IPCResponse<string>> {
  return ipcCall('export-video', outputPath, clips, settings);
}

/**
 * Get media metadata IPC wrapper
 */
export async function getMediaMetadata(filePath: string): Promise<IPCResponse<any>> {
  return ipcCall('get-media-metadata', filePath);
}

/**
 * Generate thumbnail IPC wrapper
 */
export async function generateThumbnail(
  filePath: string,
  timestamp: number
): Promise<IPCResponse<string>> {
  return ipcCall('generate-thumbnail', filePath, timestamp);
}

/**
 * Save project IPC wrapper
 */
export async function saveProject(projectData: any): Promise<IPCResponse<void>> {
  return ipcCall('save-project', projectData);
}

/**
 * Load project IPC wrapper
 */
export async function loadProject(projectPath: string): Promise<IPCResponse<any>> {
  return ipcCall('load-project', projectPath);
}

/**
 * Get app version IPC wrapper
 */
export async function getAppVersion(): Promise<IPCResponse<string>> {
  return ipcCall('get-app-version');
}

/**
 * Show save dialog IPC wrapper
 */
export async function showSaveDialog(options: any): Promise<IPCResponse<string | null>> {
  return ipcCall('show-save-dialog', options);
}

/**
 * Show open dialog IPC wrapper
 */
export async function showOpenDialog(options: any): Promise<IPCResponse<string[] | null>> {
  return ipcCall('show-open-dialog', options);
}

/**
 * Show message box IPC wrapper
 */
export async function showMessageBox(options: any): Promise<IPCResponse<number>> {
  return ipcCall('show-message-box', options);
}

/**
 * Utility to handle IPC responses consistently
 */
export function handleIPCResponse<T>(
  response: IPCResponse<T>,
  onSuccess?: (data: T) => void,
  onError?: (error: string) => void
): boolean {
  if (response.success && response.data !== undefined) {
    onSuccess?.(response.data);
    return true;
  } else {
    const error = response.error || 'Unknown error occurred';
    onError?.(error);
    console.error('IPC operation failed:', error);
    return false;
  }
}

/**
 * Utility to create a promise-based IPC call with timeout
 */
export function ipcCallWithTimeout<T = any>(
  channel: string,
  timeoutMs: number = 30000,
  ...args: any[]
): Promise<IPCResponse<T>> {
  return Promise.race([
    ipcCall<T>(channel, ...args),
    new Promise<IPCResponse<T>>((_, reject) =>
      setTimeout(() => {
        reject({
          success: false,
          error: `IPC call timeout after ${timeoutMs}ms`,
        });
      }, timeoutMs)
    ),
  ]);
}
