import { ipcMain, desktopCapturer } from 'electron';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import path from 'path';
import { app } from 'electron';

// Audio-only conversion parameters for WebM to MP4

export interface RecordingIPC {
  'recording:getSources': () => Promise<Electron.DesktopCapturerSource[]>;
  'recording:saveFile': (data: { buffer: ArrayBuffer; filename: string }) => Promise<string>;
  'recording:convertToMP4': (data: { inputPath: string; outputPath: string; quality?: string }) => Promise<string>;
  'recording:getProjectPath': () => Promise<string>;
  'recording:requestPermissions': () => Promise<boolean>;
}

export function setupRecordingIPC() {
  // Get available screen/window sources
  ipcMain.handle('recording:getSources', async () => {
    try {
      console.log('Getting desktop sources...');
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 150, height: 150 }
      });
      console.log('Found sources:', sources.length);
      
      // Convert thumbnails to data URLs
      const processedSources = sources.map(source => ({
        ...source,
        thumbnail: source.thumbnail.toDataURL()
      }));
      
      console.log('Processed sources with thumbnails:', processedSources.length);
      return processedSources;
    } catch (error) {
      console.error('Error getting desktop sources:', error);
      throw error;
    }
  });

  // Save recording file to project media folder
  ipcMain.handle('recording:saveFile', async (_event, data: { buffer: string; filename: string }) => {
    try {
      console.log('🎬 Main: saveFile called with filename:', data.filename);
      console.log('🎬 Main: Buffer length:', data.buffer.length);
      
      const projectPath = await getProjectPath();
      const recordingsDir = path.join(projectPath, 'media', 'recordings');
      
      // Ensure recordings directory exists
      await fs.mkdir(recordingsDir, { recursive: true });
      
      const filePath = path.join(recordingsDir, data.filename);
      console.log('🎬 Main: Writing file to:', filePath);
      
      // Convert base64 string to Buffer for Node.js file system
      const buffer = Buffer.from(data.buffer, 'base64');
      console.log('🎬 Main: Buffer size after conversion:', buffer.length);
      
      await fs.writeFile(filePath, buffer);
      console.log('🎬 Main: File written successfully');
      
      return filePath;
    } catch (error) {
      console.error('Error saving recording file:', error);
      throw error;
    }
  });

  // Convert WebM to MP4 using FFmpeg with improved error handling and progress tracking
  ipcMain.handle('recording:convertToMP4', async (_event, data: { inputPath: string; outputPath: string; quality?: string }) => {
    try {
      const { spawn } = require('child_process');
      const ffmpeg = require('@ffmpeg-installer/ffmpeg');
      
      console.log('🎬 Main: Starting WebM to MP4 conversion');
      console.log('🎬 Main: Input:', data.inputPath);
      console.log('🎬 Main: Output:', data.outputPath);
      console.log('🎬 Main: Quality:', data.quality || 'medium');
      
      // Check if input file exists and has content
      try {
        const stats = await fs.stat(data.inputPath);
        console.log('🎬 Main: Input file size:', stats.size, 'bytes');
        if (stats.size === 0) {
          throw new Error('Input file is empty');
        }
        if (stats.size < 1000) {
          console.log('🎬 Main: Warning: Input file is very small, conversion may fail');
        }
      } catch (fileError) {
        console.error('🎬 Main: Input file check failed:', fileError);
        throw new Error(`Input file error: ${fileError}`);
      }
      
      return new Promise((resolve, reject) => {
        // Audio-only conversion parameters
        const ffmpegProcess = spawn(ffmpeg.path, [
          '-i', data.inputPath,
          '-c:a', 'aac', // Audio codec
          '-b:a', '128k', // Audio bitrate
          '-ac', '2', // Stereo
          '-ar', '44100', // Sample rate
          '-movflags', '+faststart', // Optimize for streaming
          '-y', // Overwrite output file
          data.outputPath
        ]);

        let errorOutput = '';
        let progressOutput = '';

        // Track progress from stderr (FFmpeg outputs progress info there)
        ffmpegProcess.stderr.on('data', (data: Buffer) => {
          const output = data.toString();
          errorOutput += output;
          progressOutput += output;
          
          // Parse progress information
          const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
          if (timeMatch) {
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const seconds = parseInt(timeMatch[3]);
            const centiseconds = parseInt(timeMatch[4]);
            const totalSeconds = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
            console.log(`🎬 Main: Conversion progress: ${totalSeconds.toFixed(1)}s`);
          }
        });

        // Handle stdout for additional info
        ffmpegProcess.stdout.on('data', (data: Buffer) => {
          console.log('🎬 Main: FFmpeg stdout:', data.toString());
        });

        ffmpegProcess.on('close', (code: number) => {
          if (code === 0) {
            console.log('🎬 Main: Successfully converted WebM to MP4:', data.outputPath);
            
            // Verify output file exists and has content
            try {
              const stats = fsSync.statSync(data.outputPath);
              if (stats.size === 0) {
                throw new Error('Output file is empty');
              }
              console.log('🎬 Main: Output file verified, size:', stats.size, 'bytes');
            } catch (verifyError) {
              console.error('🎬 Main: Output file verification failed:', verifyError);
              reject(new Error(`Output file verification failed: ${verifyError}`));
              return;
            }
            
            // Clean up the original WebM file
            try {
              fsSync.unlinkSync(data.inputPath);
              console.log('🎬 Main: Cleaned up original WebM file:', data.inputPath);
            } catch (cleanupError) {
              console.warn('🎬 Main: Failed to clean up WebM file:', cleanupError);
              // Don't fail the conversion if cleanup fails
            }
            resolve(data.outputPath);
          } else {
            console.error('🎬 Main: FFmpeg conversion failed with code:', code);
            console.error('🎬 Main: Error output:', errorOutput);
            reject(new Error(`FFmpeg conversion failed with code ${code}: ${errorOutput}`));
          }
        });

        ffmpegProcess.on('error', (error: Error) => {
          console.error('🎬 Main: FFmpeg process error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('🎬 Main: Error converting WebM to MP4:', error);
      throw error;
    }
  });

  // Get project path for recordings
  ipcMain.handle('recording:getProjectPath', async () => {
    return getProjectPath();
  });

  // Request recording permissions
  ipcMain.handle('recording:requestPermissions', async () => {
    try {
      // For Electron, permissions are handled by the system
      // This is mainly for validation and user feedback
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  });
}

async function getProjectPath(): Promise<string> {
  // Get the user's documents folder or create a default project folder
  const documentsPath = app.getPath('documents');
  const projectPath = path.join(documentsPath, 'ClipForge', 'recordings');
  
  // Ensure the directory exists
  await fs.mkdir(projectPath, { recursive: true });
  
  return projectPath;
}

export function cleanupRecordingIPC() {
  ipcMain.removeAllListeners('recording:getSources');
  ipcMain.removeAllListeners('recording:saveFile');
  ipcMain.removeAllListeners('recording:getProjectPath');
  ipcMain.removeAllListeners('recording:requestPermissions');
}
