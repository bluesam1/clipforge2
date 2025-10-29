import { Clip, Track, Timeline } from '../types/media';

/**
 * Calculate the position of a clip on the timeline in pixels
 */
export function calculateClipPosition(clip: Clip, timeline: Timeline): { left: number; width: number } {
  const left = clip.start * timeline.zoom;
  const width = clip.duration * timeline.zoom;
  return { left, width };
}

/**
 * Calculate the playhead position in pixels
 */
export function calculatePlayheadPosition(playhead: number, timeline: Timeline): number {
  return playhead * timeline.zoom;
}

/**
 * Convert pixel position to time on timeline
 */
export function pixelToTime(pixel: number, timeline: Timeline): number {
  return pixel / timeline.zoom;
}

/**
 * Convert time to pixel position on timeline
 */
export function timeToPixel(time: number, timeline: Timeline): number {
  return time * timeline.zoom;
}

/**
 * Get the active clip at a specific time on the timeline
 * Prioritizes track-1, then track-2
 */
export function getActiveClipAtTime(
  clips: Clip[], 
  _tracks: Track[], 
  time: number
): Clip | null {
  // First check track-1 (main video track)
  const track1Clip = clips.find(clip => 
    clip.trackId === 'track-1' && 
    clip.start <= time && 
    clip.end > time
  );
  
  if (track1Clip) {
    return track1Clip;
  }
  
  // If no clip on track-1, check track-2 (overlay track)
  const track2Clip = clips.find(clip => 
    clip.trackId === 'track-2' && 
    clip.start <= time && 
    clip.end > time
  );
  
  return track2Clip || null;
}

/**
 * Get clips for a specific track at a specific time
 */
export function getClipsForTrackAtTime(
  clips: Clip[], 
  trackId: string, 
  time: number
): Clip[] {
  return clips.filter(clip => 
    clip.trackId === trackId && 
    clip.start <= time && 
    clip.end > time
  );
}

/**
 * Calculate the total duration of the timeline based on clips
 */
export function calculateTotalDuration(clips: Clip[]): number {
  if (clips.length === 0) return 0;
  
  return Math.max(...clips.map(clip => clip.end));
}

/**
 * Calculate zoom level to fit all content in available width
 */
export function calculateFitZoom(clips: Clip[], availableWidth: number): number {
  const totalDuration = calculateTotalDuration(clips);
  if (totalDuration === 0) return 50; // Default pixels per second
  
  const requiredPixelsPerSecond = availableWidth / totalDuration;
  
  // Return the pixels per second directly, not a percentage
  return Math.max(1, Math.min(1000, requiredPixelsPerSecond));
}

/**
 * Snap a time value to grid if snapping is enabled
 */
export function snapTime(
  time: number, 
  timeline: Timeline, 
  snapInterval: number = 1
): number {
  if (!timeline.snap) return time;
  
  const snappedTime = Math.round(time / snapInterval) * snapInterval;
  const difference = Math.abs(time - snappedTime);
  
  // Only snap if within threshold
  if (difference <= timeline.snapThreshold / timeline.zoom) {
    return snappedTime;
  }
  
  return time;
}

/**
 * Calculate the expected video time for a clip at a given timeline position
 */
export function calculateVideoTime(
  clip: Clip, 
  timelineTime: number
): number {
  return clip.offset + (timelineTime - clip.start);
}

/**
 * Calculate timeline time from video time for a clip
 */
export function calculateTimelineTime(
  clip: Clip, 
  videoTime: number
): number {
  return clip.start + (videoTime - clip.offset);
}

/**
 * Check if a clip is currently active at the given time
 */
export function isClipActive(clip: Clip, time: number): boolean {
  return time >= clip.start && time < clip.end;
}

/**
 * Get the next clip after the current one
 */
export function getNextClip(clips: Clip[], currentClip: Clip): Clip | null {
  const trackClips = clips
    .filter(clip => clip.trackId === currentClip.trackId)
    .sort((a, b) => a.start - b.start);
  
  const currentIndex = trackClips.findIndex(clip => clip.id === currentClip.id);
  
  if (currentIndex === -1 || currentIndex >= trackClips.length - 1) {
    return null;
  }
  
  return trackClips[currentIndex + 1];
}

/**
 * Check if a time position is within a clip's bounds
 */
export function isTimeInClip(clip: Clip, time: number): boolean {
  return time >= clip.start && time <= clip.end;
}

/**
 * Convert zoom percentage to pixels per second using exponential scaling.
 * 1% = 1px/s, 100% = 1000px/s
 */
export function zoomPercentageToPixelsPerSecond(percentage: number): number {
  const minPixelsPerSecond = 1;
  const maxPixelsPerSecond = 1000;
  const clampedPercentage = Math.max(1, Math.min(100, percentage));
  
  // Exponential scaling: 1 * (1000/1)^(percentage/100)
  return minPixelsPerSecond * Math.pow(maxPixelsPerSecond / minPixelsPerSecond, clampedPercentage / 100);
}

/**
 * Convert pixels per second to zoom percentage using inverse exponential scaling.
 */
export function pixelsPerSecondToZoomPercentage(pixelsPerSecond: number): number {
  const minPixelsPerSecond = 1;
  const maxPixelsPerSecond = 1000;
  const clampedPixels = Math.max(minPixelsPerSecond, Math.min(maxPixelsPerSecond, pixelsPerSecond));
  
  // Inverse exponential: 100 * log(pixelsPerSecond/1) / log(1000/1)
  return 100 * Math.log(clampedPixels / minPixelsPerSecond) / Math.log(maxPixelsPerSecond / minPixelsPerSecond);
}
