import { promisify } from 'util';
import { exec } from 'child_process';
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
