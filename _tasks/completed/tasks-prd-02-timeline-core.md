# Tasks: PRD 02 Timeline Core

> **Parent Document:** [PRD 02 Timeline Core](prd%2002%20timeline%20core.md)  
> **Phase:** 2 of 5  
> **Goal:** Build a functional multi-track timeline with clip arrangement, trimming, splitting, and basic composition

## Relevant Files

- `src/renderer/src/stores/mediaStore.ts` - Extend Zustand store with timeline state (tracks, clips, timeline)
- `src/renderer/src/types/media.ts` - Add timeline-specific types (Track, Clip, Timeline interfaces)
- `src/renderer/src/components/Timeline.tsx` - Main timeline container component
- `src/renderer/src/components/TimelineRuler.tsx` - Timecode ruler with dynamic tick marks
- `src/renderer/src/components/TimelineTrack.tsx` - Single track row component
- `src/renderer/src/components/TimelineClip.tsx` - Individual clip block with thumbnail and handles
- `src/renderer/src/components/Playhead.tsx` - Vertical playhead line with draggable handle
- `src/renderer/src/components/TimelineControls.tsx` - Zoom slider, snap toggle, split/delete buttons
- `src/renderer/src/components/AppShell.tsx` - Update layout to include timeline panel
- `src/renderer/src/components/MediaItem.tsx` - Add drag functionality for timeline drops
- `src/renderer/src/components/PreviewPlayer.tsx` - Integrate with timeline playhead position
- `tailwind.config.js` - Add timeline-specific custom properties and utilities

## Tasks

- [x] 1.0 Timeline State Setup & Tailwind v4.0 Config
  - [x] 1.1 Extend mediaStore.ts with timeline state interfaces (Track, Clip, Timeline)
  - [x] 1.2 Add timeline actions to store (addClip, moveClip, trimClip, splitClip, deleteClip, selectClip, setPlayhead, setZoom, toggleSnap)
  - [x] 1.3 Update types/media.ts with timeline-specific types
  - [x] 1.4 Configure Tailwind v4.0 with @theme directive for timeline custom properties
  - [x] 1.5 Add timeline-specific CSS utilities and spacing variables

- [x] 2.0 Timeline Layout & Ruler
  - [x] 2.1 Create Timeline.tsx container component with CSS Grid layout
  - [x] 2.2 Build TimelineRuler.tsx with dynamic tick marks based on zoom level
  - [x] 2.3 Create TimelineTrack.tsx components for 2 tracks (main video + overlay)
  - [x] 2.4 Add horizontal scroll container for timeline navigation
  - [x] 2.5 Implement track alternating background colors and separators

- [x] 3.0 Clip Rendering
  - [x] 3.1 Build TimelineClip.tsx component with thumbnail background
  - [x] 3.2 Position clips based on start/end times and zoom level
  - [x] 3.3 Implement clip selection state visual feedback
  - [x] 3.4 Add clip name and duration text overlays
  - [x] 3.5 Create clip hover and interaction states

- [x] 4.0 Playhead
  - [x] 4.1 Create Playhead.tsx component with vertical line and draggable handle
  - [x] 4.2 Implement playhead dragging to update timeline.playhead
  - [x] 4.3 Add click-to-position functionality on timeline background
  - [x] 4.4 Style playhead with red line and circular handle
  - [x] 4.5 Ensure playhead extends full height of timeline

- [x] 5.0 Drag & Drop from Library
  - [x] 5.1 Add draggable={true} and onDragStart to MediaItem.tsx
  - [x] 5.2 Implement onDrop handlers in TimelineTrack.tsx
  - [x] 5.3 Calculate drop position from mouse coordinates and zoom level
  - [x] 5.4 Call addClip action with mediaId, trackId, and position
  - [x] 5.5 Add visual feedback during drag operations

- [x] 6.0 Clip Dragging
  - [x] 6.1 Implement onMouseDown/Move/Up for clip repositioning
  - [x] 6.2 Add collision detection to prevent overlaps on same track
  - [x] 6.3 Implement snapping logic with snapPosition function
  - [x] 6.4 Show snap indicators with dashed guide lines
  - [x] 6.5 Handle edge cases (clips at track boundaries)

- [x] 7.0 Trim Handles
  - [x] 7.1 Add edge detection on clip hover with cursor changes
  - [x] 7.2 Implement trim drag handlers for left and right edges
  - [x] 7.3 Constrain trim operations to valid ranges (source media duration)
  - [x] 7.4 Update preview player on trim operations
  - [x] 7.5 Add visual feedback showing trim duration during drag

- [x] 8.0 Split & Delete
  - [x] 8.1 Add Split button to TimelineControls.tsx
  - [x] 8.2 Implement splitClip logic to create two clips from one
  - [x] 8.3 Add Delete button and keyboard handler (Delete key)
  - [x] 8.4 Implement deleteClip logic with lift delete (gap remains)
  - [x] 8.5 Handle edge cases (splitting at clip edges, deleting last clip)

- [x] 9.0 Preview Integration
  - [x] 9.1 Hook up playhead changes to preview updates
  - [x] 9.2 Implement getClipAtPlayhead function to find active clip
  - [x] 9.3 Calculate seek time within source media (offset + playhead - clip.start)
  - [x] 9.4 Handle gaps (no clip at playhead) with blank or last frame
  - [x] 9.5 Update PreviewPlayer.tsx to respond to timeline changes

- [x] 10.0 Zoom & Toolbar
  - [x] 10.1 Create TimelineControls.tsx component
  - [x] 10.2 Add zoom slider that updates timeline.zoom (10px/s to 100px/s)
  - [x] 10.3 Add snap toggle button with visual state
  - [x] 10.4 Wire up all toolbar buttons to their respective actions
  - [x] 10.5 Implement zoom behavior (keep playhead centered when possible)

- [x] 11.0 Polish & Testing
  - [x] 11.1 Refine interaction states (hover, dragging, trimming)
  - [x] 11.2 Add loading states and error handling
  - [x] 11.3 Test all acceptance criteria from PRD
  - [x] 11.4 Fix bugs and performance issues
  - [x] 11.5 Add keyboard shortcuts (Space, S, Delete, +/-, arrows, F for fit)
  - [x] 11.6 Fix horizontal scrolling and add "Fit to Content" functionality
  - [x] 11.7 Fix media library vertical scrolling and layout issues
  - [x] 11.8 Fix timeline being pushed out of view by too many media items
  - [x] 11.9 Fix timeline showing only 1 track and missing horizontal scrollbars
  - [x] 11.10 Fix track labels to be fixed on left side with timeline content starting at 0s
  - [x] 11.11 Fix Track 2 visibility issue and improve timeline layout
  - [x] 11.12 Fix missing playhead visibility and positioning
  - [x] 11.13 Connect playhead to video playback for synchronized timeline updates
  - [x] 11.14 Fix video playback sputtering caused by feedback loop in playhead synchronization
  - [x] 11.15 Re-enable playhead movement during video playback with proper feedback loop prevention
  - [x] 11.16 Create robust, always-visible playhead with multiple visibility safeguards
  - [x] 11.17 Clean up playhead styling to look professional while maintaining robustness
  - [x] 11.18 Fix sputtering by using video 'seeked' event instead of timeout for sync flag management
  - [x] 11.19 Add threshold-based seeking to prevent unnecessary video seeks during normal playback
  - [x] 11.20 Completely disable video-to-timeline sync to eliminate sputtering, keep only timeline-to-video sync
  - [x] 11.21 Re-enable video-to-timeline sync with smart seeking detection and debouncing to prevent sputtering
  - [x] 11.22 Fix sputtering by only seeking when timeline/video difference exceeds 0.5 seconds threshold
  - [x] 11.23 Fix preview to show timeline clips (Track 1 and Track 2) instead of only selected media
  - [x] 11.24 Auto-advance playhead to next clip when current clip ends
  - [x] 11.25 Fix clip transitions to maintain playhead position instead of resetting to clip start
  - [x] 11.26 Fix sputtering by removing timeline-to-video sync effect (feedback loop elimination)
  - [x] 11.27 Fix video pausing after clip transition by resuming playback automatically
  - [x] 11.28 Re-add manual playhead seeking with 1-second threshold to prevent feedback loop
  - [x] 11.29 Fix playhead not coordinating with preview by using 'seeked' event instead of setTimeout
  - [x] 11.30 Simplify seeking logic by using isManualSeek flag with shorter timeout to prevent blocking
  - [x] 11.31 Fix top-most clip not playing by moving clip change detection to video source change effect
  - [x] 11.32 Implement dual video element approach for true multi-track preview with synchronized playback
  - [x] 11.33 Add debugging and auto-sync for Track 2 video to fix 0s duration issue
  - [x] 11.34 Fix video sync timing by checking readyState and duration validity before seeking
  - [x] 11.35 Add comprehensive debugging for Track 2 video loading and media source issues
  - [x] 11.36 Fix PlaybackControls video reference and timeupdate listener timing issues

- [x] 12.0 Architectural Improvements - Service Layer
  - [x] 12.1 Extract TimelinePlayer service - Move video sync logic from PreviewPlayer component to dedicated service
  - [x] 12.2 Create services directory structure - Add src/renderer/src/services/ folder with proper organization
  - [x] 12.3 Implement TimelinePlayer service class - Handle video synchronization, seeking, and timeline updates
  - [x] 12.4 Create utils directory - Add src/renderer/src/utils/ for timeline calculations and helper functions
  - [x] 12.5 Extract timeline calculations to utils - Move complex math logic out of components

- [x] 13.0 State Management Refactoring
  - [x] 13.1 Separate timeline state from mediaStore - Create dedicated timelineStore.ts
  - [x] 13.2 Refactor PreviewPlayer to use TimelinePlayer service - Remove direct video sync logic from component
  - [x] 13.3 Create IPC wrappers utility - Centralize main/renderer communication patterns
  - [x] 13.4 Implement proper service integration - Connect services to Zustand stores
  - [x] 13.5 Add error handling to TimelinePlayer service - Robust error handling for video operations

- [x] 14.0 Multi-Track Preview Implementation
  - [x] 14.1 Fix TimelineTrack clips source - Use timelineStore instead of mediaStore
  - [x] 14.2 Implement true multi-track preview - Show both Track 1 and Track 2 simultaneously
  - [x] 14.3 Enhance TimelinePlayer service - Support multiple video elements per track
  - [x] 14.4 Add proper track layering - Track 2 as background, Track 1 as foreground
  - [x] 14.5 Update video synchronization - Sync each track independently
  - [x] 14.6 Fix multi-track synchronization - Ensure both videos sync when playhead moves
  - [x] 14.7 Add direct video sync - Direct synchronization for both tracks on playhead changes
