import { ipcMain, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { 
  buildExportPlan, 
  buildFFmpegCommands, 
  cleanupTempFiles, 
  validateExportSettings,
  estimateFileSize,
  getTempDir
} from './utils/exportBuilder';
import { executeFFmpegCommands } from './utils/ffmpeg';
import { ExportSettings, Timeline, Clip, Track, MediaFile } from '../shared/types/export';

// Store current export process for cancellation
let currentExportProcess: any = null;
let currentTempDir: string | null = null;

export function setupExportHandlers(): void {
  // Export start handler
  ipcMain.handle('export:start', async (
    event, 
    settings: ExportSettings, 
    timeline: Timeline, 
    clips: Clip[], 
    tracks: Track[], 
    media: MediaFile[]
  ) => {
    try {
      console.log('Starting export process...');
      
      // Validate export settings
      const validation = validateExportSettings(settings);
      if (!validation.isValid) {
        event.sender.send('export:error', {
          error: 'Invalid export settings',
          details: validation.errors.join(', ')
        });
        return;
      }

      // Validate timeline has clips
      if (clips.length === 0) {
        event.sender.send('export:error', {
          error: 'Cannot export empty timeline',
          details: 'Add clips to the timeline before exporting'
        });
        return;
      }

      // Validate all media files exist
      const missingFiles = media.filter(m => !fs.existsSync(m.path));
      if (missingFiles.length > 0) {
        event.sender.send('export:error', {
          error: 'Missing media files',
          details: `The following files are missing: ${missingFiles.map(m => m.name).join(', ')}`
        });
        return;
      }

      // Create temp directory first
      currentTempDir = getTempDir();
      
      // Build export plan
      const segments = buildExportPlan(timeline, clips, tracks, media, currentTempDir);
      if (segments.length === 0) {
        event.sender.send('export:error', {
          error: 'No valid segments to export',
          details: 'All clips appear to be invalid or empty'
        });
        return;
      }

      // Generate output path
      const outputDir = settings.outputPath || path.join(require('os').homedir(), 'Videos', 'ClipForge');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `${settings.filename}-${timestamp}.mp4`;
      const outputPath = path.join(outputDir, filename);

      // Build FFmpeg commands
      const commands = buildFFmpegCommands(segments, settings, outputPath, currentTempDir, clips);
      
      // Execute export with progress tracking
      await executeFFmpegCommands(commands, (progress) => {
        event.sender.send('export:progress', {
          step: progress.step,
          percent: progress.percent,
          estimatedTimeRemaining: progress.estimatedTimeRemaining
        });
      });

      // Verify output file exists and get its size
      if (!fs.existsSync(outputPath)) {
        throw new Error('Export failed: Output file was not created');
      }

      const stats = fs.statSync(outputPath);
      const fileSize = stats.size;
      const duration = timeline.totalDuration;

      // Clean up temp files
      if (currentTempDir) {
        cleanupTempFiles(currentTempDir);
        currentTempDir = null;
      }

      // Send completion event
      event.sender.send('export:complete', {
        outputPath,
        fileSize,
        duration
      });

      console.log('Export completed successfully:', outputPath);

    } catch (error) {
      console.error('Export failed:', error);
      
      // Clean up temp files on error
      if (currentTempDir) {
        cleanupTempFiles(currentTempDir);
        currentTempDir = null;
      }

      event.sender.send('export:error', {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Export cancel handler
  ipcMain.handle('export:cancel', async () => {
    try {
      console.log('Cancelling export...');
      
      // Kill current FFmpeg process if running
      if (currentExportProcess) {
        currentExportProcess.kill('SIGTERM');
        currentExportProcess = null;
      }

      // Clean up temp files
      if (currentTempDir) {
        cleanupTempFiles(currentTempDir);
        currentTempDir = null;
      }

      console.log('Export cancelled');
    } catch (error) {
      console.error('Error cancelling export:', error);
    }
  });
}

// Helper function to get all browser windows for broadcasting events
function getAllWindows(): BrowserWindow[] {
  return BrowserWindow.getAllWindows();
}

// Export event broadcasting functions
export function broadcastExportProgress(data: { step: string; percent: number; estimatedTimeRemaining?: number }): void {
  getAllWindows().forEach(window => {
    window.webContents.send('export:progress', data);
  });
}

export function broadcastExportComplete(data: { outputPath: string; fileSize: number; duration: number }): void {
  getAllWindows().forEach(window => {
    window.webContents.send('export:complete', data);
  });
}

export function broadcastExportError(data: { error: string; code?: string; details?: string }): void {
  getAllWindows().forEach(window => {
    window.webContents.send('export:error', data);
  });
}
