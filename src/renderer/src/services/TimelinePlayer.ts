import { Clip, Timeline } from '../types/media';

export interface VideoPlayerRef {
  getVideoElement: () => HTMLVideoElement | null;
}

export class TimelinePlayer {
  private videoElements: Map<string, HTMLVideoElement> = new Map();
  private isManualSeek = false;
  private lastUpdateTime = 0;
  private lastTimelinePlayhead = 0;
  private onPlayheadUpdate?: (playhead: number) => void;
  private onClipEnd?: (clipId: string) => void;

  constructor() {
    this.isManualSeek = false;
    this.lastUpdateTime = 0;
    this.lastTimelinePlayhead = 0;
  }

  /**
   * Set the video element reference for a specific track
   */
  setVideoElement(videoElement: HTMLVideoElement | null, trackId: string = 'primary') {
    if (videoElement) {
      this.videoElements.set(trackId, videoElement);
    } else {
      this.videoElements.delete(trackId);
    }
  }

  /**
   * Get the primary video element (for backward compatibility)
   */
  getPrimaryVideoElement(): HTMLVideoElement | null {
    return this.videoElements.get('primary') || this.videoElements.get('track-1') || null;
  }

  /**
   * Set callback for playhead updates
   */
  setPlayheadUpdateCallback(callback: (playhead: number) => void) {
    this.onPlayheadUpdate = callback;
  }

  /**
   * Set callback for clip end events
   */
  setClipEndCallback(callback: (clipId: string) => void) {
    this.onClipEnd = callback;
  }

  /**
   * Sync video to timeline position
   */
  syncVideoToTimeline(activeClip: Clip | null, timeline: Timeline) {
    if (!activeClip) {
      console.log('🎬 SYNC SKIPPED - No active clip');
      return;
    }
    
    const videoElement = this.videoElements.get(activeClip.trackId);
    if (!videoElement) {
      console.log('🎬 SYNC SKIPPED - No video element for track', activeClip.trackId);
      return;
    }
    
    const expectedTime = activeClip.offset + (timeline.playhead - activeClip.start);
    const currentTime = videoElement.currentTime;
    const difference = Math.abs(currentTime - expectedTime);
    
    console.log('🎬 VIDEO SYNC (Service):', {
      activeClip: activeClip.id,
      trackId: activeClip.trackId,
      clipStart: activeClip.start,
      clipEnd: activeClip.end,
      clipOffset: activeClip.offset,
      playhead: timeline.playhead,
      currentTime,
      expectedTime,
      difference,
      readyState: videoElement.readyState,
      duration: videoElement.duration,
      isNaN: isNaN(videoElement.duration),
      calculation: `${activeClip.offset} + (${timeline.playhead} - ${activeClip.start}) = ${expectedTime}`
    });
    
    // Only sync if video is ready and difference is significant
    if (!isNaN(videoElement.duration) && videoElement.readyState >= 1 && difference > 1.0) {
      console.log('🎬 PERFORMING SYNC (Service):', { from: currentTime, to: expectedTime });
      videoElement.currentTime = expectedTime;
    } else {
      console.log('🎬 SYNC SKIPPED (Service):', {
        reason: !isNaN(videoElement.duration) ? 
          (videoElement.readyState < 1 ? 'not ready' : 'difference too small') : 
          'invalid duration'
      });
    }
  }

  /**
   * Handle manual playhead changes (user dragging/clicking)
   */
  handleManualSeek(playhead: number, activeClip: Clip | null, timeline: Timeline) {
    // Check if this is a significant playhead jump (> 1 second)
    const playheadJump = Math.abs(playhead - this.lastTimelinePlayhead);
    this.lastTimelinePlayhead = playhead;
    
    // Skip if this is a small change (normal playback)
    if (playheadJump < 1.0) {
      return;
    }
    
    console.log('🎯 MANUAL SEEK DETECTED:', {
      playheadJump,
      activeClip: activeClip?.id
    });
    
    this.isManualSeek = true;
    this.syncVideoToTimeline(activeClip, timeline);
    
    // Reset flag after a short delay
    setTimeout(() => {
      this.isManualSeek = false;
      console.log('🎯 MANUAL SEEK COMPLETE');
    }, 200);
  }

  /**
   * Handle video time updates and update timeline accordingly
   */
  handleVideoTimeUpdate(activeClip: Clip | null) {
    if (!activeClip) return;

    const videoElement = this.videoElements.get(activeClip.trackId);
    if (!videoElement) return;

    // Don't update if we just did a manual seek
    if (this.isManualSeek) {
      console.log('🎬 BLOCKED - manual seek in progress');
      return;
    }

    // Debounce updates
    const now = Date.now();
    if (now - this.lastUpdateTime < 50) {
      return;
    }
    this.lastUpdateTime = now;

    // Convert video time to timeline time
    // For trimmed clips: timelineTime = clipStart + (videoTime - clipOffset)
    const timelineTime = activeClip.start + (videoElement.currentTime - activeClip.offset);
    
    console.log('🎬 VIDEO → TIMELINE SYNC:', {
      videoTime: videoElement.currentTime,
      timelineTime,
      clipId: activeClip.id,
      trackId: activeClip.trackId,
      clipStart: activeClip.start,
      clipEnd: activeClip.end,
      clipOffset: activeClip.offset,
      calculation: `${activeClip.start} + (${videoElement.currentTime} - ${activeClip.offset}) = ${timelineTime}`
    });
    
    // Check if we've reached the end of the clip
    if (timelineTime >= activeClip.end) {
      console.log('🏁 CLIP ENDED - advancing to next:', {
        clipId: activeClip.id,
        clipEnd: activeClip.end,
        timelineTime
      });
      
      // Always advance the playhead, even if there's a gap
      if (this.onPlayheadUpdate) {
        this.onPlayheadUpdate(timelineTime);
      }
      
      // Notify that this clip ended (for potential next clip detection)
      if (this.onClipEnd) {
        this.onClipEnd(activeClip.id);
      }
    } else {
      if (this.onPlayheadUpdate) {
        this.onPlayheadUpdate(timelineTime);
      }
    }
  }

  /**
   * Set up video event listeners
   */
  setupVideoListeners(activeClip: Clip | null) {
    // Clean up existing listeners first
    this.cleanupVideoListeners();

    if (!activeClip) {
      console.log('🎬 NO ACTIVE CLIP for timeupdate listener');
      return;
    }

    const videoElement = this.videoElements.get(activeClip.trackId);
    if (!videoElement) {
      console.log('🎬 NO VIDEO ELEMENT for track', activeClip.trackId);
      return;
    }

    const handleTimeUpdate = () => {
      this.handleVideoTimeUpdate(activeClip);
    };

    console.log('🎬 ADDING timeupdate listener for track', activeClip.trackId);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    
    // Store the cleanup function
    this.currentCleanup = () => {
      console.log('🎬 REMOVING timeupdate listener for track', activeClip.trackId);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
    
    return this.currentCleanup;
  }

  private currentCleanup?: () => void;

  /**
   * Clean up video event listeners
   */
  private cleanupVideoListeners() {
    if (this.currentCleanup) {
      this.currentCleanup();
      this.currentCleanup = undefined;
    }
  }

  /**
   * Check if a manual seek is currently in progress
   */
  isManualSeekInProgress(): boolean {
    return this.isManualSeek;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.cleanupVideoListeners();
    this.videoElements.clear();
    this.isManualSeek = false;
    this.lastUpdateTime = 0;
    this.lastTimelinePlayhead = 0;
    this.onPlayheadUpdate = undefined;
    this.onClipEnd = undefined;
  }
}
