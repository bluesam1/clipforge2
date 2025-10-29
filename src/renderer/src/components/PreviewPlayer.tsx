import React, { useRef, useEffect, useMemo } from 'react';
import { useMediaStore } from '../stores/mediaStore';
import { useTimelineStore } from '../stores/timelineStore';
import VideoPlayer, { VideoPlayerRef } from './VideoPlayer';
import { TimelinePlayer } from '../services/TimelinePlayer';
import { getClipsForTrackAtTime } from '../utils/timelineCalculations';

// Custom PlaybackControls for multi-track preview
const MultiTrackPlaybackControls: React.FC<{
  media: any;
  track1VideoRef: React.RefObject<VideoPlayerRef | null>;
  track2VideoRef: React.RefObject<VideoPlayerRef | null>;
  isPlaying: boolean;
  onPlayPause: () => void;
}> = ({ media, track1VideoRef, track2VideoRef, isPlaying, onPlayPause }) => {
  const handlePlayPause = () => {
    const track1Element = track1VideoRef.current?.getVideoElement();
    const track2Element = track2VideoRef.current?.getVideoElement();
    
    if (isPlaying) {
      // Pause both videos
      if (track1Element) track1Element.pause();
      if (track2Element) track2Element.pause();
    } else {
      // Play both videos
      if (track1Element) track1Element.play().catch(console.error);
      if (track2Element) track2Element.play().catch(console.error);
    }
    onPlayPause();
  };

  const handleVolumeChange = (volume: number) => {
    const track1Element = track1VideoRef.current?.getVideoElement();
    const track2Element = track2VideoRef.current?.getVideoElement();
    
    if (track1Element) {
      track1Element.volume = volume;
    }
    if (track2Element) {
      track2Element.volume = volume;
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={handlePlayPause}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-300">Volume:</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          defaultValue="1"
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
          className="w-20"
        />
      </div>
      
      <div className="text-sm text-gray-300">
        {media?.name || 'No media selected'}
      </div>
    </div>
  );
};

const PreviewPlayer: React.FC = () => {
  const { currentPreview, media } = useMediaStore();
  const { clips, timeline, setPlayhead } = useTimelineStore();
  const track1VideoRef = useRef<VideoPlayerRef | null>(null);
  const track2VideoRef = useRef<VideoPlayerRef | null>(null);
  const timelinePlayerRef = useRef<TimelinePlayer | null>(null);

  // Initialize TimelinePlayer service
  useEffect(() => {
    timelinePlayerRef.current = new TimelinePlayer();
    
            // Set up callbacks
            timelinePlayerRef.current.setPlayheadUpdateCallback(setPlayhead);
            timelinePlayerRef.current.setClipEndCallback((clipId) => {
              // Auto-advance to next clip when current one ends
              const currentClip = clips.find(c => c.id === clipId);
              if (currentClip) {
                // Advance playhead to the exact end of the clip
                setPlayhead(currentClip.end);
                console.log('🎬 CLIP ENDED - advancing to exact end:', {
                  clipId,
                  clipEnd: currentClip.end,
                  newPlayhead: currentClip.end
                });
              }
            });

    return () => {
      timelinePlayerRef.current?.cleanup();
    };
  }, [setPlayhead, clips]);

  // Get clips for each track at current time
  const trackClips = useMemo(() => {
    const track1Clips = getClipsForTrackAtTime(clips, 'track-1', timeline.playhead);
    const track2Clips = getClipsForTrackAtTime(clips, 'track-2', timeline.playhead);
    
    console.log('🎬 TRACK CLIPS CALCULATION:', {
      playhead: timeline.playhead,
      totalClips: clips.length,
      track1Clips: track1Clips.length,
      track2Clips: track2Clips.length,
      track1ClipIds: track1Clips.map(c => c.id),
      track2ClipIds: track2Clips.map(c => c.id),
      allClips: clips.map(c => ({ id: c.id, trackId: c.trackId, start: c.start, end: c.end, offset: c.offset }))
    });
    
    const result = {
      track1: track1Clips[0] || null, // Take first clip if multiple
      track2: track2Clips[0] || null,
    };
    
    console.log('🎬 SELECTED CLIPS:', {
      track1: result.track1 ? { 
        id: result.track1.id, 
        start: result.track1.start, 
        end: result.track1.end, 
        offset: result.track1.offset,
        duration: result.track1.duration
      } : null,
      track2: result.track2 ? { 
        id: result.track2.id, 
        start: result.track2.start, 
        end: result.track2.end, 
        offset: result.track2.offset,
        duration: result.track2.duration
      } : null
    });
    
    // Log when a new clip becomes active
    if (result.track1) {
      console.log('🎬 TRACK 1 CLIP ACTIVE:', {
        clipId: result.track1.id,
        playhead: timeline.playhead,
        clipStart: result.track1.start,
        clipEnd: result.track1.end,
        clipOffset: result.track1.offset,
        expectedVideoTime: result.track1.offset + (timeline.playhead - result.track1.start),
        isWithinClip: timeline.playhead >= result.track1.start && timeline.playhead < result.track1.end
      });
    }
    
    if (result.track2) {
      console.log('🎬 TRACK 2 CLIP ACTIVE:', {
        clipId: result.track2.id,
        playhead: timeline.playhead,
        clipStart: result.track2.start,
        clipEnd: result.track2.end,
        clipOffset: result.track2.offset,
        expectedVideoTime: result.track2.offset + (timeline.playhead - result.track2.start),
        isWithinClip: timeline.playhead >= result.track2.start && timeline.playhead < result.track2.end
      });
    }
    
    return result;
  }, [clips, timeline.playhead]);

  // Get media for each track
  const trackMedia = useMemo(() => {
    return {
      track1: trackClips.track1 ? media.find(m => m.id === trackClips.track1!.mediaId) : null,
      track2: trackClips.track2 ? media.find(m => m.id === trackClips.track2!.mediaId) : null,
    };
  }, [trackClips, media]);

  // Determine primary media for controls (prioritize track 1)
  const primaryMedia = trackMedia.track1 || trackMedia.track2 || currentPreview;

  // Create a unified playback state for controls
  const [isPlaying, setIsPlaying] = React.useState(false);
  
  // Effect to track unified playback state
  useEffect(() => {
    const track1Element = track1VideoRef.current?.getVideoElement();
    const track2Element = track2VideoRef.current?.getVideoElement();
    
    const updatePlaybackState = () => {
      // If Track 1 is active, use its state
      if (track1Element && trackClips.track1) {
        setIsPlaying(!track1Element.paused);
      }
      // Otherwise use Track 2 state
      else if (track2Element && trackClips.track2) {
        setIsPlaying(!track2Element.paused);
      }
    };

    // Listen to both videos for state changes
    if (track1Element) {
      track1Element.addEventListener('play', updatePlaybackState);
      track1Element.addEventListener('pause', updatePlaybackState);
    }
    if (track2Element) {
      track2Element.addEventListener('play', updatePlaybackState);
      track2Element.addEventListener('pause', updatePlaybackState);
    }

    // Initial state update
    updatePlaybackState();

    return () => {
      if (track1Element) {
        track1Element.removeEventListener('play', updatePlaybackState);
        track1Element.removeEventListener('pause', updatePlaybackState);
      }
      if (track2Element) {
        track2Element.removeEventListener('play', updatePlaybackState);
        track2Element.removeEventListener('pause', updatePlaybackState);
      }
    };
  }, [trackClips.track1, trackClips.track2]);
  
  // Set video element references in TimelinePlayer service
  useEffect(() => {
    const track1Element = track1VideoRef.current?.getVideoElement();
    const track2Element = track2VideoRef.current?.getVideoElement();
    
    console.log('🎬 VIDEO ELEMENT SETUP:', {
      track1Element: !!track1Element,
      track2Element: !!track2Element,
      track1Media: trackMedia.track1?.name,
      track2Media: trackMedia.track2?.name,
      track1Ready: track1Element?.readyState,
      track2Ready: track2Element?.readyState
    });
    
    if (timelinePlayerRef.current) {
      // Set up video elements for each track
      if (track1Element) {
        console.log('🎬 SETTING TRACK 1 VIDEO ELEMENT');
        timelinePlayerRef.current.setVideoElement(track1Element, 'track-1');
      }
      if (track2Element) {
        console.log('🎬 SETTING TRACK 2 VIDEO ELEMENT');
        timelinePlayerRef.current.setVideoElement(track2Element, 'track-2');
      }
    }
  }, [trackMedia.track1, trackMedia.track2]); // Depend on media changes

  // Track playhead changes to detect manual seeks
  const lastPlayheadRef = useRef(timeline.playhead);
  const lastVideoUpdateRef = useRef(Date.now());

  // Handle manual playhead changes and sync all videos - with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (timelinePlayerRef.current) {
        const currentPlayhead = timeline.playhead;
        const lastPlayhead = lastPlayheadRef.current;
        const timeDifference = Math.abs(currentPlayhead - lastPlayhead);
        const timeSinceLastVideoUpdate = Date.now() - lastVideoUpdateRef.current;
        
        console.log('🎬 PLAYHEAD CHANGE DETECTED:', {
          currentPlayhead,
          lastPlayhead,
          timeDifference,
          timeSinceLastVideoUpdate,
          isManualSeek: timelinePlayerRef.current.isManualSeekInProgress()
        });
        
        // Use the service's manual seek detection
        const activeClip = trackClips.track1 || trackClips.track2;
        timelinePlayerRef.current.handleManualSeek(timeline.playhead, activeClip, timeline);
        
        // Check if this is a manual seek (significant jump and no recent video updates)
        const isManualSeek = timeDifference > 0.5 && timeSinceLastVideoUpdate > 200;
        
        if (isManualSeek) {
          console.log('🎬 MANUAL SEEK DETECTED - Pausing playback');
          
          // Pause both videos
          const track1Element = track1VideoRef.current?.getVideoElement();
          const track2Element = track2VideoRef.current?.getVideoElement();
          
          if (track1Element && !track1Element.paused) {
            console.log('🎬 PAUSING TRACK 1 - Manual seek detected');
            track1Element.pause();
          }
          if (track2Element && !track2Element.paused) {
            console.log('🎬 PAUSING TRACK 2 - Manual seek detected');
            track2Element.pause();
          }
          
          // Update playback state
          setIsPlaying(false);
        }
        
        // Update last playhead position
        lastPlayheadRef.current = currentPlayhead;
        
        // Sync both videos to their correct positions
        if (trackClips.track1) {
          console.log('🎬 SYNCING TRACK 1 VIDEO');
          timelinePlayerRef.current.syncVideoToTimeline(trackClips.track1, timeline);
        }
        if (trackClips.track2) {
          console.log('🎬 SYNCING TRACK 2 VIDEO');
          timelinePlayerRef.current.syncVideoToTimeline(trackClips.track2, timeline);
        }
      }
    }, 50); // Debounce sync calls

    return () => clearTimeout(timeoutId);
  }, [timeline.playhead]); // Only depend on playhead

  // Sync videos when clips change
  useEffect(() => {
    if (timelinePlayerRef.current) {
      console.log('🎬 CLIP CHANGE SYNC TRIGGERED:', {
        playhead: timeline.playhead,
        track1Clip: trackClips.track1 ? {
          id: trackClips.track1.id,
          start: trackClips.track1.start,
          end: trackClips.track1.end,
          offset: trackClips.track1.offset,
          expectedVideoTime: trackClips.track1.offset + (timeline.playhead - trackClips.track1.start)
        } : null,
        track2Clip: trackClips.track2 ? {
          id: trackClips.track2.id,
          start: trackClips.track2.start,
          end: trackClips.track2.end,
          offset: trackClips.track2.offset,
          expectedVideoTime: trackClips.track2.offset + (timeline.playhead - trackClips.track2.start)
        } : null
      });
      
      // Small delay to ensure video elements are ready
      const timeoutId = setTimeout(() => {
        if (trackClips.track1) {
          console.log('🎬 SYNCING TRACK 1 ON CLIP CHANGE');
          timelinePlayerRef.current?.syncVideoToTimeline(trackClips.track1, timeline);
        }
        if (trackClips.track2) {
          console.log('🎬 SYNCING TRACK 2 ON CLIP CHANGE');
          timelinePlayerRef.current?.syncVideoToTimeline(trackClips.track2, timeline);
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [trackClips, timeline]);

  // Effect to handle automatic clip start when playhead enters a new clip
  useEffect(() => {
    if (!timelinePlayerRef.current) return;
    
    // Check if we just entered a new clip
    const track1Element = track1VideoRef.current?.getVideoElement();
    const track2Element = track2VideoRef.current?.getVideoElement();
    
    if (trackClips.track1 && track1Element) {
      const expectedVideoTime = trackClips.track1.offset + (timeline.playhead - trackClips.track1.start);
      const currentVideoTime = track1Element.currentTime;
      const timeDiff = Math.abs(expectedVideoTime - currentVideoTime);
      
      console.log('🎬 AUTOMATIC CLIP START CHECK - TRACK 1:', {
        clipId: trackClips.track1.id,
        playhead: timeline.playhead,
        clipStart: trackClips.track1.start,
        clipEnd: trackClips.track1.end,
        clipOffset: trackClips.track1.offset,
        expectedVideoTime,
        currentVideoTime,
        timeDiff,
        needsSync: timeDiff > 0.5
      });
      
      // If the video is significantly out of sync, force a sync
      if (timeDiff > 0.5) {
        console.log('🎬 FORCING SYNC FOR TRACK 1 - Large time difference detected');
        // Directly set the video time instead of using the service sync
        track1Element.currentTime = expectedVideoTime;
        console.log('🎬 DIRECT VIDEO SEEK:', { from: currentVideoTime, to: expectedVideoTime });
      }
    }
    
    if (trackClips.track2 && track2Element) {
      const expectedVideoTime = trackClips.track2.offset + (timeline.playhead - trackClips.track2.start);
      const currentVideoTime = track2Element.currentTime;
      const timeDiff = Math.abs(expectedVideoTime - currentVideoTime);
      
      console.log('🎬 AUTOMATIC CLIP START CHECK - TRACK 2:', {
        clipId: trackClips.track2.id,
        playhead: timeline.playhead,
        clipStart: trackClips.track2.start,
        clipEnd: trackClips.track2.end,
        clipOffset: trackClips.track2.offset,
        expectedVideoTime,
        currentVideoTime,
        timeDiff,
        needsSync: timeDiff > 0.5
      });
      
      // If the video is significantly out of sync, force a sync
      if (timeDiff > 0.5) {
        console.log('🎬 FORCING SYNC FOR TRACK 2 - Large time difference detected');
        // Directly set the video time instead of using the service sync
        track2Element.currentTime = expectedVideoTime;
        console.log('🎬 DIRECT VIDEO SEEK:', { from: currentVideoTime, to: expectedVideoTime });
      }
    }
  }, [trackClips.track1?.id, trackClips.track2?.id, timeline.playhead]);

  // Set up video event listeners for the primary track - only when clips change significantly
  useEffect(() => {
    if (!timelinePlayerRef.current) return;

    const activeClip = trackClips.track1 || trackClips.track2;
    const cleanup = timelinePlayerRef.current.setupVideoListeners(activeClip);
    
    // Override the video time update to track when video updates happen
    const track1Element = track1VideoRef.current?.getVideoElement();
    const track2Element = track2VideoRef.current?.getVideoElement();
    
    const handleVideoTimeUpdate = () => {
      lastVideoUpdateRef.current = Date.now();
    };
    
    if (track1Element) {
      track1Element.addEventListener('timeupdate', handleVideoTimeUpdate);
    }
    if (track2Element) {
      track2Element.addEventListener('timeupdate', handleVideoTimeUpdate);
    }
    
    return () => {
      cleanup?.();
      if (track1Element) {
        track1Element.removeEventListener('timeupdate', handleVideoTimeUpdate);
      }
      if (track2Element) {
        track2Element.removeEventListener('timeupdate', handleVideoTimeUpdate);
      }
    };
  }, [trackClips.track1?.id, trackClips.track2?.id]); // Only depend on clip IDs, not the entire clips object

  // Effect to handle Track 1 video playback when it becomes ready
  useEffect(() => {
    const track1Element = track1VideoRef.current?.getVideoElement();
    const track2Element = track2VideoRef.current?.getVideoElement();
    
    if (track1Element && trackClips.track1 && trackMedia.track1) {
      const handleLoadedMetadata = () => {
        console.log('🎬 TRACK 1 VIDEO READY - Starting playback');
        
        // Calculate the correct video time for this trimmed clip
        const expectedVideoTime = trackClips.track1.offset + (timeline.playhead - trackClips.track1.start);
        console.log('🎬 TRACK 1 SYNC CALCULATION:', {
          clipStart: trackClips.track1.start,
          clipOffset: trackClips.track1.offset,
          playhead: timeline.playhead,
          expectedVideoTime,
          currentVideoTime: track1Element.currentTime
        });
        
        // Immediately seek to the correct position
        track1Element.currentTime = expectedVideoTime;
        
        // Check if Track 2 is playing to sync playback state
        const shouldPlay = track2Element ? !track2Element.paused : true;
        
        if (shouldPlay) {
          console.log('🎬 STARTING TRACK 1 PLAYBACK');
          track1Element.play().catch((error) => {
            console.error('🎬 TRACK 1 PLAY ERROR:', error);
          });
        } else {
          console.log('🎬 TRACK 1 PAUSED (synced with Track 2)');
          track1Element.pause();
        }
      };

      // Also handle canplay event for smoother transitions
      const handleCanPlay = () => {
        console.log('🎬 TRACK 1 CAN PLAY - Ensuring smooth playback');
        console.log('🎬 CLIP DETAILS:', {
          clipId: trackClips.track1.id,
          clipStart: trackClips.track1.start,
          clipEnd: trackClips.track1.end,
          clipOffset: trackClips.track1.offset,
          currentPlayhead: timeline.playhead,
          expectedVideoTime: trackClips.track1.offset + (timeline.playhead - trackClips.track1.start)
        });
        
        // Ensure video is ready for smooth playback
        if (track2Element && !track2Element.paused) {
          track1Element.play().catch(console.error);
        }
      };

      track1Element.addEventListener('loadedmetadata', handleLoadedMetadata);
      track1Element.addEventListener('canplay', handleCanPlay);
      
      return () => {
        track1Element.removeEventListener('loadedmetadata', handleLoadedMetadata);
        track1Element.removeEventListener('canplay', handleCanPlay);
      };
    }
    return undefined;
  }, [trackClips.track1, trackMedia.track1, timeline.playhead]);

  // Effect to sync playback state between both videos
  useEffect(() => {
    const track1Element = track1VideoRef.current?.getVideoElement();
    const track2Element = track2VideoRef.current?.getVideoElement();
    
    if (track1Element && track2Element) {
      const syncPlayback = () => {
        // If Track 1 is playing, make sure Track 2 is also playing
        if (!track1Element.paused && track2Element.paused) {
          console.log('🎬 SYNCING: Starting Track 2 playback');
          track2Element.play().catch(console.error);
        }
        // If Track 1 is paused, make sure Track 2 is also paused
        else if (track1Element.paused && !track2Element.paused) {
          console.log('🎬 SYNCING: Pausing Track 2');
          track2Element.pause();
        }
      };

      // Listen for play/pause events on Track 1
      track1Element.addEventListener('play', syncPlayback);
      track1Element.addEventListener('pause', syncPlayback);
      
      return () => {
        track1Element.removeEventListener('play', syncPlayback);
        track1Element.removeEventListener('pause', syncPlayback);
      };
    }
    return undefined;
  }, [trackClips.track1, trackClips.track2]);

  // Effect to handle continuous playback through gaps
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    // Only run continuous playback if we're currently playing but no clips are active
    if (isPlaying && !trackClips.track1 && !trackClips.track2) {
      console.log('🎬 CONTINUOUS PLAYBACK - advancing through gap');
      
      intervalId = setInterval(() => {
        // Get current playhead from timeline store
        const currentPlayhead = timeline.playhead;
        const newPlayhead = currentPlayhead + 0.05; // Advance by 0.05 seconds (50ms)
        console.log('🎬 GAP PLAYBACK:', { from: currentPlayhead, to: newPlayhead });
        setPlayhead(newPlayhead);
      }, 50); // Update every 50ms for smoother playback
    } else if (!isPlaying) {
      // Stop continuous playback if not playing
      console.log('🎬 CONTINUOUS PLAYBACK STOPPED - Not playing');
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPlaying, trackClips.track1, trackClips.track2, setPlayhead, timeline.playhead]);

  return (
    <div className="flex flex-col h-full">
      {/* Video Player Area - Multi-Track Preview */}
      <div className="flex-1 flex items-center justify-center bg-black relative">
        {/* Track 2 Video (Background/Overlay) */}
        {trackMedia.track2 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-white text-xs absolute top-2 left-2 z-20 bg-black bg-opacity-50 px-2 py-1 rounded">
              Track 2: {trackMedia.track2.name}
            </div>
            <VideoPlayer key={`track2-${trackMedia.track2.id}`} ref={track2VideoRef} media={trackMedia.track2} />
          </div>
        )}
        
        {/* Track 1 Video (Foreground/Main) */}
        {trackMedia.track1 && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="text-white text-xs absolute top-2 right-2 z-30 bg-black bg-opacity-50 px-2 py-1 rounded">
              Track 1: {trackMedia.track1.name}
            </div>
            <VideoPlayer key={`track1-${trackMedia.track1.id}`} ref={track1VideoRef} media={trackMedia.track1} />
          </div>
        )}
        
                {/* Blank black screen when no clips are active */}
                {!trackMedia.track1 && !trackMedia.track2 && (
                  <div className="w-full h-full bg-black flex items-center justify-center">
                    {/* Empty black screen - no content */}
          </div>
        )}
      </div>

      {/* Playback Controls */}
              {primaryMedia && (
        <div className="bg-gray-800 p-4">
                  <MultiTrackPlaybackControls 
                    media={primaryMedia}
                    track1VideoRef={track1VideoRef}
                    track2VideoRef={track2VideoRef}
                    isPlaying={isPlaying}
                    onPlayPause={() => setIsPlaying(!isPlaying)}
                  />
        </div>
      )}
    </div>
  );
};

export default PreviewPlayer;
