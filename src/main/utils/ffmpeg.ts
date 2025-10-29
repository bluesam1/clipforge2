import { promisify } from 'util';
import { exec, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import ffprobe from '@ffprobe-installer/ffprobe';

const execAsync = promisify(exec);

export interface MediaMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  size: number;
  codec: string;
}

export async function extractMetadata(filePath: string): Promise<MediaMetadata> {
  try {
    if (!ffprobe.path) {
      throw new Error('FFprobe not found');
    }
    
    // Use ffprobe for proper metadata extraction
    const command = `"${ffprobe.path}" -v quiet -print_format json -show_format -show_streams "${filePath}"`;
    
    console.log('Running FFprobe command:', command);
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Metadata extraction timeout')), 15000); // 15 second timeout
    });
    
    const execPromise = execAsync(command);
    const { stdout } = await Promise.race([execPromise, timeoutPromise]);
    console.log('FFprobe output:', stdout);
    
    const data = JSON.parse(stdout);
    
    // Find video stream
    const videoStream = data.streams.find((stream: any) => stream.codec_type === 'video');
    if (!videoStream) {
      throw new Error('No video stream found');
    }
    
    // Get file size
    const stats = fs.statSync(filePath);
    
    // Calculate FPS properly
    const fps = (() => {
      const rate = videoStream.r_frame_rate;
      if (typeof rate === 'string' && rate.includes('/')) {
        const [numerator, denominator] = rate.split('/').map(Number);
        return denominator ? numerator / denominator : 30;
      }
      return parseFloat(rate) || 30;
    })();
    
    return {
      duration: parseFloat(data.format.duration) || 0,
      width: videoStream.width || 0,
      height: videoStream.height || 0,
      fps,
      size: stats.size,
      codec: videoStream.codec_name || 'unknown',
    };
  } catch (error) {
    console.error('Error extracting metadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract metadata: ${errorMessage}`);
  }
}

export async function generateThumbnail(
  filePath: string,
  outputPath: string,
  timestamp: number = 1
): Promise<string> {
  try {
    if (!ffmpeg.path) {
      throw new Error('FFmpeg not found');
    }
    
    const command = `"${ffmpeg.path}" -i "${filePath}" -ss ${timestamp} -vframes 1 -vf "scale=320:-1" -f image2 -y "${outputPath}"`;
    console.log('Running FFmpeg thumbnail command:', command);
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Thumbnail generation timeout')), 60000); // 60 second timeout
    });
    
    const execPromise = execAsync(command);
    await Promise.race([execPromise, timeoutPromise]);
    
    console.log('Thumbnail generated successfully:', outputPath);
    return outputPath;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to generate thumbnail: ${errorMessage}`);
  }
}

export function validateVideoFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const supportedFormats = ['.mp4', '.mov', '.webm'];
  return supportedFormats.includes(ext);
}

export function generateFileHash(filePath: string): string {
  const stats = fs.statSync(filePath);
  const fileName = path.basename(filePath, path.extname(filePath));
  return `${fileName}-${stats.size}-${stats.mtime.getTime()}`;
}

// Export execution with progress tracking
export interface ExportProgress {
  percent: number;
  step: string;
  estimatedTimeRemaining?: number;
}

export function executeFFmpeg(
  command: string,
  onProgress: (progress: ExportProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpeg.path) {
      reject(new Error('FFmpeg not found'));
      return;
    }

    // Parse command properly to handle quoted arguments
    const parseCommand = (cmd: string): string[] => {
      const args: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < cmd.length; i++) {
        const char = cmd[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ' ' && !inQuotes) {
          if (current.trim()) {
            args.push(current.trim());
            current = '';
          }
        } else {
          current += char;
        }
      }
      
      if (current.trim()) {
        args.push(current.trim());
      }
      
      return args;
    };

    const allArgs = parseCommand(command);
    const args = allArgs.slice(1); // Remove the executable path
    console.log('Parsed FFmpeg args:', args);
    
    const ffmpegProcess = spawn(ffmpeg.path, args);

    let duration = 0;
    let startTime = Date.now();

    let stderrOutput = '';

    ffmpegProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderrOutput += output;
      console.log('FFmpeg stderr:', output);

      // Parse duration (from initial output)
      const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (durationMatch) {
        duration = parseTimecode(durationMatch[0]);
      }

      // Parse progress (from encoding output)
      const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (timeMatch && duration > 0) {
        const currentTime = parseTimecode(timeMatch[0]);
        const percent = Math.min((currentTime / duration) * 100, 100);
        
        // Calculate estimated time remaining
        const elapsed = (Date.now() - startTime) / 1000;
        const estimatedTimeRemaining = percent > 0 ? (elapsed / percent) * (100 - percent) : 0;

        onProgress({
          percent: Math.round(percent),
          step: 'Encoding video...',
          estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
        });
      }
    });

    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error('FFmpeg command failed:', command);
        console.error('FFmpeg stderr output:', stderrOutput);
        reject(new Error(`FFmpeg exited with code ${code}. Error: ${stderrOutput}`));
      }
    });

    ffmpegProcess.on('error', (error) => {
      reject(new Error(`FFmpeg process error: ${error.message}`));
    });
  });
}

export function parseTimecode(timecodeStr: string): number {
  const match = timecodeStr.match(/(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
  if (!match) return 0;
  
  const [, hours, minutes, seconds] = match;
  return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
}

export function executeFFmpegCommands(
  commands: string[],
  onProgress: (progress: ExportProgress) => void
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        const stepName = i === commands.length - 1 ? 'Final encoding...' : `Processing segment ${i + 1} of ${commands.length - 1}...`;
        
        onProgress({
          percent: (i / commands.length) * 100,
          step: stepName,
        });

        await executeFFmpeg(command, (progress) => {
          onProgress({
            percent: ((i + progress.percent / 100) / commands.length) * 100,
            step: stepName,
            estimatedTimeRemaining: progress.estimatedTimeRemaining,
          });
        });
      }
      
      onProgress({
        percent: 100,
        step: 'Export complete!',
      });
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}
