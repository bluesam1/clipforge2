# Tasks: PRD 04 Recording

> **Parent Document:** [PRD 04 Recording](prd%2004%20recording.md)  
> **Phase:** 4 of 5  
> **Dependencies:** Phase 3 (Export Early) ✅ Complete  
> **Goal:** Enable screen, webcam, and microphone recording with automatic import to timeline

## Relevant Files

- `src/renderer/src/components/RecordingPanel.tsx` - Main recording interface with mode selection and controls
- `src/renderer/src/components/SourcePicker.tsx` - Screen/window selection with thumbnails
- `src/renderer/src/components/DevicePicker.tsx` - Camera/microphone device selection
- `src/renderer/src/components/RecordingIndicator.tsx` - Active recording UI with elapsed time
- `src/renderer/src/components/PreviewCanvas.tsx` - Live preview before recording starts
- `src/renderer/src/stores/recordingStore.ts` - Recording state management with Zustand
- `src/renderer/src/services/RecordingService.ts` - Core recording logic and MediaRecorder integration
- `src/renderer/src/types/recording.ts` - TypeScript interfaces for recording functionality
- `src/main/recording.ts` - Main process recording handlers and IPC
- `src/preload/index.ts` - IPC bridge for recording functionality
- `src/renderer/src/utils/recordingUtils.ts` - Recording utility functions and helpers

## Tasks

- [x] 1.0 Set up recording infrastructure and permissions
  - [x] 1.1 Create recording types and interfaces in `src/renderer/src/types/recording.ts`
  - [x] 1.2 Set up IPC handlers in main process for recording operations
  - [x] 1.3 Add recording API to preload script with proper type safety
  - [x] 1.4 Request necessary permissions (screen, camera, microphone) on app startup
  - [x] 1.5 Handle permission denied scenarios with user-friendly error messages

- [x] 2.0 Implement device enumeration and selection
  - [x] 2.1 Create device enumeration service using `navigator.mediaDevices.enumerateDevices()`
  - [x] 2.2 Implement screen/window source enumeration using Electron's `desktopCapturer`
  - [x] 2.3 Build SourcePicker component with thumbnail grid for screen/window selection
  - [x] 2.4 Build DevicePicker component for camera and microphone selection
  - [x] 2.5 Add device testing functionality (preview before recording)
  - [x] 2.6 Persist device preferences in localStorage for user convenience

- [x] 3.0 Build recording panel UI components
  - [x] 3.1 Create main RecordingPanel component with mode selector (Screen/Webcam/Screen+Webcam/Audio)
  - [x] 3.2 Implement recording mode tabs with clean Tailwind CSS v4.0 styling
  - [x] 3.3 Add recording settings section (resolution, quality, PiP options)
  - [x] 3.4 Create start/stop/pause recording buttons with proper state management
  - [x] 3.5 Build PreviewCanvas component for live preview before recording
  - [x] 3.6 Add recording indicator with elapsed time and stop button
  - [x] 3.7 Integrate RecordingPanel into main AppShell layout

- [x] 4.0 Implement screen recording functionality
  - [x] 4.1 Create screen recording service using `getUserMedia` with `chromeMediaSourceId`
  - [x] 4.2 Implement MediaRecorder with WebM codec and 5 Mbps bitrate
  - [x] 4.3 Add recording state management (idle, recording, paused, stopped)
  - [x] 4.4 Handle recording data chunks and blob creation
  - [x] 4.5 Save recordings to project media folder with timestamp naming
  - [x] 4.6 Add recording duration limits and file size validation

- [x] 5.0 Implement webcam and microphone recording
  - [x] 5.1 Create webcam recording service with device selection
  - [x] 5.2 Implement microphone recording with audio level monitoring
  - [x] 5.3 Add audio-only recording mode for podcast-style content
  - [x] 5.4 Implement audio level meter UI component
  - [x] 5.5 Add microphone testing functionality before recording
  - [x] 5.6 Handle audio/video synchronization in recordings

- [x] 6.0 Add screen + webcam PiP recording (Option B - separate tracks)
  - [x] 6.1 Record screen and webcam as separate MediaStreams
  - [x] 6.2 Implement separate MediaRecorder instances for each stream
  - [x] 6.3 Save screen and webcam recordings as separate files
  - [x] 6.4 Auto-import both recordings to media library
  - [x] 6.5 Add webcam positioning options (corner placement, size)
  - [x] 6.6 Create "Quick PiP Recording" preset that auto-positions webcam overlay
  - [x] 6.7 Add PiP preview in PreviewCanvas component

- [x] 7.0 Integrate recordings with media library auto-import
  - [x] 7.1 Trigger media import after recording completion
  - [x] 7.2 Generate thumbnails for recorded videos using FFmpeg
  - [x] 7.3 Extract metadata for recorded files
  - [x] 7.4 Show success notification when recording is ready
  - [x] 7.5 Optionally auto-add recordings to timeline (user preference)
  - [x] 7.6 Handle recording file cleanup and organization

- [x] 8.0 Add recording controls and progress indicators
  - [x] 8.1 Implement pause/resume recording functionality
  - [x] 8.2 Add recording progress indicator with elapsed time
  - [x] 8.3 Create recording status display (recording, paused, processing)
  - [x] 8.4 Add recording duration limits and warnings
  - [x] 8.5 Implement recording cancellation with cleanup
  - [x] 8.6 Add keyboard shortcuts for recording controls (Space to pause/resume)

- [x] 9.0 Implement recording state management and persistence
  - [x] 9.1 Create recordingStore with Zustand for state management
  - [x] 9.2 Add recording settings persistence to localStorage
  - [x] 9.3 Implement recording history and recent recordings
  - [x] 9.4 Add recording preferences (quality, format, destination)
  - [x] 9.5 Handle recording state restoration on app restart
  - [x] 9.6 Add recording session management and cleanup

- [x] 10.0 Add error handling and user feedback for recording
  - [x] 10.1 Handle recording errors gracefully with user-friendly messages
  - [x] 10.2 Add recording failure recovery and retry mechanisms
  - [x] 10.3 Implement recording quality validation and warnings
  - [x] 10.4 Add recording space monitoring and low disk space warnings
  - [x] 10.5 Create recording troubleshooting guide and help text
  - [x] 10.6 Add recording performance monitoring and optimization
