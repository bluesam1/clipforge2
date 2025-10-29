# Tasks: PRD 03 Export Early

## Relevant Files

- `src/renderer/src/stores/exportStore.ts` - New Zustand store for export state management
- `src/renderer/src/components/ExportButton.tsx` - Main export trigger button in toolbar
- `src/renderer/src/components/ExportDialog.tsx` - Modal dialog for export configuration
- `src/renderer/src/components/ExportProgress.tsx` - Progress overlay during export
- `src/renderer/src/components/ExportComplete.tsx` - Success notification component
- `src/main/export.ts` - Main process export handlers and FFmpeg integration
- `src/main/utils/exportBuilder.ts` - Export plan and FFmpeg command generation
- `src/preload/index.ts` - Extended IPC bridge for export functionality
- `src/renderer/src/types/export.ts` - TypeScript interfaces for export system
- `src/renderer/src/utils/exportHelpers.ts` - Client-side export utility functions

## Tasks

- [x] 1.0 Export State Management & UI Shell
  - [x] 1.1 Create export types and interfaces in `src/renderer/src/types/export.ts`
  - [x] 1.2 Create Zustand export store in `src/renderer/src/stores/exportStore.ts`
  - [x] 1.3 Add export state to main app state management
  - [x] 1.4 Create basic ExportButton component in toolbar
  - [x] 1.5 Create ExportDialog modal component shell
  - [x] 1.6 Create ExportProgress overlay component shell
  - [x] 1.7 Create ExportComplete notification component shell

- [x] 2.0 Export Plan Builder & FFmpeg Integration
  - [x] 2.1 Create export plan builder in `src/main/utils/exportBuilder.ts`
  - [x] 2.2 Implement buildExportPlan function for timeline analysis
  - [x] 2.3 Implement buildFFmpegCommands function for command generation
  - [x] 2.4 Add resolution scaling logic (source, 1080p, 720p, 4k)
  - [x] 2.5 Add quality preset mapping (High/Medium/Low to CRF values)
  - [x] 2.6 Implement FFmpeg execution with progress parsing
  - [x] 2.7 Add temp file management and cleanup
  - [x] 2.8 Create concat file generation for multi-clip exports

- [x] 3.0 IPC Handlers & Main Process Export Logic
  - [x] 3.1 Extend preload bridge with export API in `src/preload/index.ts`
  - [x] 3.2 Create main process export handlers in `src/main/export.ts`
  - [x] 3.3 Implement export:start IPC handler
  - [x] 3.4 Implement export:cancel IPC handler
  - [x] 3.5 Add export:progress event emission
  - [x] 3.6 Add export:complete event emission
  - [x] 3.7 Add export:error event emission
  - [x] 3.8 Integrate export handlers with main process

- [x] 4.0 Progress Tracking & Error Handling
  - [x] 4.1 Implement FFmpeg progress parsing from stderr
  - [x] 4.2 Add estimated time remaining calculation
  - [x] 4.3 Create progress update system with IPC events
  - [x] 4.4 Implement export cancellation with process cleanup
  - [x] 4.5 Add comprehensive error handling and user-friendly messages
  - [x] 4.6 Create export validation (timeline, files, disk space)
  - [x] 4.7 Add logging system for export operations
  - [x] 4.8 Implement graceful error recovery and retry options

- [x] 5.0 UI Components & User Experience
  - [x] 5.1 Complete ExportDialog with filename, destination, resolution, quality options
  - [x] 5.2 Add folder picker functionality for export destination
  - [x] 5.3 Implement estimated file size calculation and display
  - [x] 5.4 Complete ExportProgress with progress bar, step text, and ETA
  - [x] 5.5 Add cancel confirmation dialog for mid-export cancellation
  - [x] 5.6 Complete ExportComplete with success message and "Show in Folder" button
  - [x] 5.7 Add keyboard shortcuts for export operations
  - [x] 5.8 Implement responsive design and accessibility features
  - [x] 5.9 Add export button state management (disabled when timeline empty)
  - [x] 5.10 Create export settings persistence and defaults