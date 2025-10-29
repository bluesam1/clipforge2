# Tasks: PRD 01 Import and Preview

> **Based on:** [PRD 01 Import and Preview](prd%2001%20import%20and%20preview.md)  
> **Phase:** 1 of 5  
> **Duration:** ~4.5 days

## Relevant Files

- `src/main/index.ts` - Electron main process with IPC handlers for media operations
- `src/preload/index.ts` - Typed IPC bridge between main and renderer processes
- `src/preload/index.d.ts` - TypeScript definitions for the IPC API
- `src/renderer/src/App.tsx` - Main React application component
- `src/renderer/src/components/AppShell.tsx` - Main layout component with three-panel design
- `src/renderer/src/components/MediaLibrary.tsx` - Left panel for media library display
- `src/renderer/src/components/MediaItem.tsx` - Individual media item component with thumbnail and metadata
- `src/renderer/src/components/DropZone.tsx` - Drag-and-drop overlay component
- `src/renderer/src/components/ImportButton.tsx` - File picker trigger button
- `src/renderer/src/components/PreviewPlayer.tsx` - Center preview container
- `src/renderer/src/components/VideoPlayer.tsx` - HTML5 video element wrapper
- `src/renderer/src/components/PlaybackControls.tsx` - Video playback controls (play/pause, seek, volume)
- `src/renderer/src/stores/mediaStore.ts` - Zustand store for media library state management
- `src/renderer/src/types/media.ts` - TypeScript interfaces for MediaFile and related types
- `src/main/utils/ffmpeg.ts` - FFmpeg/FFprobe integration utilities for metadata extraction and thumbnails
- `src/renderer/src/utils/toast.ts` - Toast notification system for user feedback
- `src/renderer/src/index.css` - Tailwind CSS v4.0 configuration and custom styles
- `package.json` - Dependencies including @ffmpeg-installer/ffmpeg, @ffprobe-installer/ffprobe and Tailwind CSS v4.0
- `electron.vite.config.ts` - Vite configuration for Electron build process

## Tasks

- [x] 1.0 Set up development environment and project structure
  - [x] 1.1 Initialize Electron + React + TypeScript project with Vite
  - [x] 1.2 Configure Tailwind CSS v4.0 with CSS-first configuration
  - [x] 1.3 Install and configure ffmpeg-static dependency
  - [x] 1.4 Set up ESLint and Prettier for code quality
  - [x] 1.5 Configure Electron Builder for packaging
  - [x] 1.6 Test development server and build process
- [x] 2.0 Implement IPC communication and main process handlers
  - [x] 2.1 Create typed IPC bridge in preload script with IClipForgeAPI interface
  - [x] 2.2 Implement media:import handler for file validation and metadata extraction
  - [x] 2.3 Implement media:remove handler for removing media from library
  - [x] 2.4 Implement media:getThumbnail handler for thumbnail generation
  - [x] 2.5 Implement file:openDialog handler for native file picker
  - [x] 2.6 Implement project:save and project:load handlers for persistence
  - [x] 2.7 Add comprehensive error handling and logging
- [x] 3.0 Create state management and core UI components
  - [x] 3.1 Set up Zustand store with MediaFile interface and state structure
  - [x] 3.2 Implement store actions: importMedia, selectMedia, removeMedia, loadPreview
  - [x] 3.3 Create AppShell component with three-panel CSS Grid layout
  - [x] 3.4 Add Tailwind v4.0 styling following Oracle Video Editor design principles
  - [x] 3.5 Implement responsive design for different window sizes
- [x] 4.0 Build media library interface with import functionality
  - [x] 4.1 Create MediaLibrary component container with proper layout
  - [x] 4.2 Build MediaItem component with thumbnail, metadata display, and selection states
  - [x] 4.3 Create DropZone overlay component with drag-and-drop file handling
  - [x] 4.4 Build ImportButton component with file picker integration
  - [x] 4.5 Implement empty state with large drop zone and instructions
  - [x] 4.6 Add hover effects and visual feedback for all interaction states
- [x] 5.0 Implement preview player with playback controls
  - [x] 5.1 Create PreviewPlayer component container with dark background
  - [x] 5.2 Build VideoPlayer component with HTML5 video element and aspect ratio maintenance
  - [x] 5.3 Create PlaybackControls component with play/pause, seek bar, and timecode display
  - [x] 5.4 Add volume control and mute functionality
  - [x] 5.5 Implement keyboard shortcuts (Space for play/pause, arrow keys for scrubbing)
  - [x] 5.6 Add video loading states and error handling
- [x] 6.0 Integrate FFmpeg for metadata extraction and thumbnail generation
  - [x] 6.1 Create FFmpeg utility functions for metadata extraction using ffprobe
  - [x] 6.2 Implement thumbnail generation with proper scaling and format conversion
  - [x] 6.3 Add file format validation for MP4, MOV, and WebM files
  - [x] 6.4 Implement error handling for unsupported formats and corrupted files
  - [x] 6.5 Add progress callbacks for long-running FFmpeg operations
  - [x] 6.6 Optimize thumbnail generation performance and caching
- [x] 7.0 Add project persistence and error handling
  - [x] 7.1 Implement project save functionality with user-selectable folder location
  - [x] 7.2 Add project load functionality to restore media library state
  - [x] 7.3 Create toast notification system for user feedback
  - [x] 7.4 Add confirmation dialogs for destructive actions (remove media)
  - [x] 7.5 Implement comprehensive error handling throughout the application
  - [x] 7.6 Add loading states and progress indicators for all async operations
  - [x] 7.7 Conduct manual testing against all acceptance criteria
