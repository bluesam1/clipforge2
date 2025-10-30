import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { 
  ExportSettings, 
  TimelineSegment, 
  Clip, 
  Timeline, 
  Track
} from '../../shared/types/export';
import { MediaFile } from '../../shared/types/media';

// Export plan builder functions
export function buildExportPlan(
  _timeline: Timeline,
  clips: Clip[],
  _tracks: Track[],
  media: MediaFile[],
  tempDir: string // Pass the temp directory to ensure all segments are in the same place
): TimelineSegment[] {
  const segments: TimelineSegment[] = [];

  // Sort clips by timeline position from all tracks
  const sortedClips = [...clips]
    .sort((a, b) => a.start - b.start);

  console.log('Building export plan:', {
    totalClips: clips.length,
    allTracksClips: sortedClips.length,
    mediaFiles: media.length,
    trackBreakdown: {
      track1: clips.filter(c => c.trackId === 'track-1').length,
      track2: clips.filter(c => c.trackId === 'track-2').length,
      other: clips.filter(c => !['track-1', 'track-2'].includes(c.trackId)).length
    }
  });

  for (const clip of sortedClips) {
    const mediaFile = media.find((m) => m.id === clip.mediaId);
    if (!mediaFile) {
      console.warn(`Media file not found for clip ${clip.id}`);
      continue;
    }

    // Validate media file exists
    if (!fs.existsSync(mediaFile.path)) {
      console.warn(`Media file does not exist: ${mediaFile.path}`);
      continue;
    }

    // Validate that the clip doesn't exceed the source duration
    const maxDuration = mediaFile.duration - clip.offset;
    const actualDuration = Math.min(clip.duration, maxDuration);

    if (actualDuration <= 0) {
      console.warn(`Clip ${clip.id} has invalid duration, skipping`);
      continue;
    }

    console.log('Adding segment:', {
      clipId: clip.id,
      trackId: clip.trackId,
      inputFile: mediaFile.path,
      startTime: clip.offset,
      duration: actualDuration,
      timelineStart: clip.start
    });

    segments.push({
      inputFile: mediaFile.path,
      startTime: clip.offset, // Trim offset into source
      duration: actualDuration, // Clip duration on timeline
      outputFile: path.join(tempDir, `segment-${clip.trackId}-${clip.id}.mp4`), // Include track ID in filename
      clipId: clip.id,
    });
  }

  console.log('Export plan complete:', { segmentsCount: segments.length });

  return segments;
}

export function buildFFmpegCommands(
  segments: TimelineSegment[],
  settings: ExportSettings,
  outputPath: string,
  tempDir: string,
  clips: Clip[] // Pass clips to understand track relationships
): string[] {
  const commands: string[] = [];
  console.log('Building FFmpeg commands for multi-track export:', {
    segmentsCount: segments.length,
    settings,
    outputPath,
    tempDir,
    clipsCount: clips.length
  });

  // Group segments by track
  const track1Segments = segments.filter(s => s.outputFile.includes('track-1-'));
  const track2Segments = segments.filter(s => s.outputFile.includes('track-2-'));
  
  console.log('Track breakdown:', {
    track1Segments: track1Segments.length,
    track2Segments: track2Segments.length
  });

  // Step 1: Extract each segment (same as before)
  for (const seg of segments) {
    const inputFile = seg.inputFile.replace(/\\/g, '/');
    const outputFile = seg.outputFile.replace(/\\/g, '/');
    
    const command = `"${getFFmpegPath()}" -i "${inputFile}" ` +
      `-ss ${seg.startTime} -t ${seg.duration} ` +
      `-c:v libx264 -c:a aac -avoid_negative_ts make_zero ` +
      `"${outputFile}"`;
    
    console.log('Generated segment command:', command);
    commands.push(command);
  }

  // Step 2: Create multi-track composition command
  const crf = getQualityCRF(settings.quality);
  const fps = settings.fps === 'match-source' ? '' : `-r ${settings.fps}`;

  // Build complex filter for multi-track composition
  const filterComplex = buildMultiTrackFilter(segments, clips, tempDir, settings.resolution);
  
  const finalCommand = `"${getFFmpegPath()}" ${buildInputArguments(segments)} ` +
    `-filter_complex "${filterComplex}" ` +
    `-map "[vout]" -map "[aout]" ` +
    `-c:v libx264 -preset medium -crf ${crf} ` +
    `-c:a aac -b:a 128k -ar 48000 ` +
    `-pix_fmt yuv420p ` +
    `-movflags +faststart ` +
    `${fps} ` +
    `"${outputPath.replace(/\\/g, '/')}"`;

  console.log('Generated multi-track composition command:', finalCommand);
  commands.push(finalCommand);

  return commands;
}

function buildInputArguments(segments: TimelineSegment[]): string {
  // Create unique input arguments for each segment
  const uniqueInputs = new Set(segments.map(s => s.inputFile));
  return Array.from(uniqueInputs)
    .map(input => `-i "${input.replace(/\\/g, '/')}"`)
    .join(' ');
}

function buildMultiTrackFilter(segments: TimelineSegment[], clips: Clip[], _tempDir: string, resolution: ExportSettings['resolution']): string {
  // This is a simplified version - in a real implementation, you'd need to:
  // 1. Calculate the total timeline duration
  // 2. Create proper timing for each clip
  // 3. Handle overlapping clips correctly
  // 4. Mix audio from multiple tracks
  
  const totalDuration = Math.max(...clips.map(c => c.start + c.duration));
  console.log('Building multi-track filter for duration:', totalDuration);
  
  // Create a mapping of input files to input indices
  const uniqueInputs = Array.from(new Set(segments.map(s => s.inputFile)));
  console.log('Unique input files:', uniqueInputs);
  
  // For now, create a simple filter that processes clips in timeline order
  // This is a placeholder - the real implementation would be much more complex
  const filters: string[] = [];
  
  // Add video composition filters
  segments.forEach((seg, index) => {
    // Find the correct input index for this segment's input file
    const inputIndex = uniqueInputs.indexOf(seg.inputFile);
    const trackId = seg.outputFile.includes('track-1-') ? '1' : '2';
    
    console.log(`Segment ${index}: inputFile=${seg.inputFile}, inputIndex=${inputIndex}, trackId=${trackId}`);
    
    if (index === 0) {
      // First segment - start the composition
      filters.push(`[${inputIndex}:v]trim=start=${seg.startTime}:duration=${seg.duration},setpts=PTS-STARTPTS[v${index}]`);
      filters.push(`[${inputIndex}:a]atrim=start=${seg.startTime}:duration=${seg.duration},asetpts=PTS-STARTPTS[a${index}]`);
    } else {
      // Subsequent segments - need to handle timing and composition
      filters.push(`[${inputIndex}:v]trim=start=${seg.startTime}:duration=${seg.duration},setpts=PTS-STARTPTS[v${index}]`);
      filters.push(`[${inputIndex}:a]atrim=start=${seg.startTime}:duration=${seg.duration},asetpts=PTS-STARTPTS[a${index}]`);
    }
  });
  
  // Add final composition with scaling
  if (segments.length > 0) {
    // For now, just concatenate - this needs to be much more sophisticated
    const videoInputs = segments.map((_, i) => `[v${i}]`).join('');
    const audioInputs = segments.map((_, i) => `[a${i}]`).join('');
    
    // Add scaling to the video output
    const scaleFilter = getResolutionScale(resolution);
    filters.push(`${videoInputs}concat=n=${segments.length}:v=1:a=0[concat_v]`);
    filters.push(`[concat_v]scale=${scaleFilter}[vout]`);
    filters.push(`${audioInputs}concat=n=${segments.length}:v=0:a=1[aout]`);
  }
  
  return filters.join('; ');
}

export function getResolutionScale(resolution: ExportSettings['resolution']): string {
  switch (resolution) {
    case '1080p':
      return '1920:1080';
    case '720p':
      return '1280:720';
    case '4k':
      return '3840:2160';
    case 'source':
    default:
      return '-1:-1'; // No scaling
  }
}

export function getQualityCRF(quality: ExportSettings['quality']): number {
  switch (quality) {
    case 'high':
      return 20;
    case 'medium':
      return 23;
    case 'low':
      return 26;
    default:
      return 23;
  }
}

export function getTempDir(): string {
  const tempDir = path.join(os.tmpdir(), 'clipforge-export', uuidv4());
  
  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  return tempDir;
}

export function cleanupTempFiles(tempDir: string): void {
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`Cleaned up temp directory: ${tempDir}`);
    }
  } catch (error) {
    console.error(`Error cleaning up temp directory ${tempDir}:`, error);
  }
}

export function getFFmpegPath(): string {
  if (!ffmpeg.path) {
    throw new Error('FFmpeg not found');
  }
  
  // Test if FFmpeg is accessible
  try {
    const { execSync } = require('child_process');
    execSync(`"${ffmpeg.path}" -version`, { timeout: 5000 });
    console.log('FFmpeg version check passed');
  } catch (error) {
    console.error('FFmpeg version check failed:', error);
    throw new Error(`FFmpeg not accessible: ${error}`);
  }
  
  return ffmpeg.path;
}

export function validateExportSettings(settings: ExportSettings): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!settings.filename.trim()) {
    errors.push('Filename is required');
  }

  if (!settings.outputPath.trim()) {
    errors.push('Output path is required');
  }

  if (!settings.filename.match(/^[a-zA-Z0-9._-]+$/)) {
    errors.push('Filename contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function estimateFileSize(
  duration: number,
  settings: ExportSettings
): number {
  // Rough estimation based on quality and resolution
  const baseSizePerMinute = 50; // MB at 1080p medium quality
  
  const qualityMultiplier = (() => {
    switch (settings.quality) {
      case 'high': return 1.2;
      case 'medium': return 1.0;
      case 'low': return 0.5;
      default: return 1.0;
    }
  })();

  const resolutionMultiplier = (() => {
    switch (settings.resolution) {
      case '4k': return 4.0;
      case '1080p': return 1.0;
      case '720p': return 0.5;
      case 'source': return 1.0; // Assume 1080p for estimation
      default: return 1.0;
    }
  })();

  const estimatedSize = (duration / 60) * baseSizePerMinute * qualityMultiplier * resolutionMultiplier;
  return Math.round(estimatedSize * 1024 * 1024); // Convert to bytes
}
