# System Patterns: ClipForge

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Electron App                         │
├─────────────────┬─────────────────┬─────────────────────┤
│   Main Process  │   Preload       │   Renderer Process  │
│                 │                 │   (React + TS)      │
├─────────────────┼─────────────────┼─────────────────────┤
│ • App lifecycle │ • IPC bridge    │ • UI Components     │
│ • Window mgmt   │ • Type safety   │ • State management  │
│ • FFmpeg spawn  │ • Security      │ • Timeline engine   │
│ • File I/O      │ • API exposure  │ • Preview player    │
└─────────────────┴─────────────────┴─────────────────────┘
```

### Core Design Principles

#### 1. Security-First Architecture

- **Context Isolation:** Enabled by default, preload script provides secure IPC bridge
- **No Node.js in Renderer:** All file system access through main process
- **Sandboxed Renderer:** Limited API surface, controlled permissions

#### 2. Local-First Data Management

- **Project-Based Storage:** Each project is a folder with structured data
- **No Cloud Dependencies:** All processing happens locally
- **Offline Capable:** Full functionality without internet

#### 3. Performance-Oriented Design

- **Worker Processes:** FFmpeg runs in separate processes
- **Efficient State Management:** Zustand for minimal re-renders
- **Canvas-Based Timeline:** Smooth rendering with many clips
- **Proxy System:** Lightweight previews for large files

## Phase 1 Implementation Patterns

### Media Import & Preview System

#### File Processing Pipeline
```
User Action → File Validation → FFmpeg Processing → State Update → UI Refresh
     ↓              ↓                ↓                ↓            ↓
  Drag/Drop → Format Check → Metadata + Thumbnail → Zustand → React Re-render
```

#### Key Implementation Details

**1. Custom Protocol for Local Files**
- **Problem**: Electron security prevents direct `file://` access
- **Solution**: Custom `clipforge://` protocol with proper CSP headers
- **Pattern**: `protocol.registerFileProtocol()` + HTML meta CSP

**2. FFmpeg Integration**
- **Libraries**: `@ffmpeg-installer/ffmpeg` + `@ffprobe-installer/ffprobe`
- **Pattern**: Async processing with timeout and error handling
- **Metadata**: FFprobe for structured JSON output
- **Thumbnails**: FFmpeg with `-y` flag for non-interactive operation

**3. State Management with Video Switching**
- **Pattern**: Reset playback state when media ID changes
- **Implementation**: `useEffect` with `media.id` dependency
- **Result**: Clean state transitions between videos

**4. Error Handling Strategy**
- **Toast Notifications**: User-friendly error messages
- **Graceful Degradation**: Continue processing other files if one fails
- **Optional Thumbnails**: Import succeeds even if thumbnail generation fails

## Component Architecture

### State Management Pattern

```typescript
// Centralized state with Zustand
interface AppState {
  // Media management
  media: MediaFile[];
  selectedMediaId: string | null;

  // Timeline state
  tracks: Track[];
  clips: Clip[];
  timeline: TimelineState;

  // UI state
  currentPreview: MediaFile | null;
  isRecording: boolean;

  // Actions
  importMedia: (files: File[]) => Promise<void>;
  addClip: (mediaId: string, trackId: string, position: number) => void;
  // ... other actions
}
```

### Component Hierarchy

```
App
├── AppShell
│   ├── MediaLibrary
│   │   ├── MediaItem
│   │   └── ImportButton
│   ├── PreviewPlayer
│   │   ├── VideoPlayer
│   │   └── PlaybackControls
│   ├── Timeline
│   │   ├── TimelineRuler
│   │   ├── TimelineTrack
│   │   │   └── TimelineClip
│   │   └── Playhead
│   └── RecordingPanel
│       ├── SourcePicker
│       ├── DevicePicker
│       └── PreviewCanvas
```

## Data Flow Patterns

### 1. Media Import Flow

```
User Action → DropZone → IPC → Main Process → FFmpeg → Metadata → State Update → UI Render
```

### 2. Timeline Editing Flow

```
User Action → Component → State Action → State Update → Timeline Re-render → Preview Update
```

### 3. Export Flow

```
User Action → Export Dialog → IPC → Main Process → FFmpeg Commands → Progress Updates → Completion
```

## IPC Communication Pattern

### Secure API Surface

```typescript
// Preload exposes only what's needed
interface IClipForgeAPI {
  media: {
    import: (paths: string[]) => Promise<MediaFile[]>;
    remove: (id: string) => Promise<void>;
    getThumbnail: (id: string) => Promise<string>;
  };
  export: {
    start: (settings: ExportSettings) => Promise<void>;
    cancel: () => Promise<void>;
  };
  recording: {
    start: (settings: RecordingSettings) => Promise<void>;
    stop: () => Promise<void>;
  };
}
```

### Event-Driven Updates

```typescript
// Main process sends updates to renderer
event.sender.send('export:progress', {
  percent: 45,
  step: 'Processing clip 3',
});
event.sender.send('export:complete', { outputPath: '/path/to/video.mp4' });
```

## File System Patterns

### Project Structure

```
project.clipforge/
├── project.json          # Project metadata and state
├── media/                # Original imported files
│   ├── video1.mp4
│   └── audio1.wav
├── thumbnails/           # Generated thumbnails
│   ├── clip-1/
│   │   ├── thumb-0.jpg
│   │   └── thumb-1.jpg
│   └── clip-2/
├── proxies/              # Lightweight preview files
│   ├── video1-proxy.mp4
│   └── audio1-proxy.wav
├── renders/              # Exported videos
│   └── final-video.mp4
└── logs/                 # Debug and error logs
    └── export-2024-01-15.log
```

### Data Persistence

- **Project State:** JSON file with complete timeline state
- **Media References:** File paths and metadata
- **Auto-save:** Periodic saves to `.autosave.json`
- **Crash Recovery:** Last known good state restoration

## Error Handling Patterns

### 1. Graceful Degradation

```typescript
try {
  await processVideo(file);
} catch (error) {
  if (error.code === 'UNSUPPORTED_FORMAT') {
    showUserFriendlyError('This video format is not supported');
  } else {
    logError(error);
    showGenericError('Something went wrong. Please try again.');
  }
}
```

### 2. User-Friendly Messages

- **Technical errors** → **User-friendly explanations**
- **Error codes** → **Actionable guidance**
- **Logging** → **Debug information for support**

### 3. Recovery Strategies

- **Auto-save** → **Prevent data loss**
- **Validation** → **Catch errors early**
- **Fallbacks** → **Alternative approaches when possible**

## Performance Patterns

### 1. Lazy Loading

- **Thumbnails:** Generate on demand
- **Proxies:** Create when needed
- **Media:** Load metadata first, video on preview

### 2. Debouncing/Throttling

- **Auto-save:** 2-second delay after last change
- **Timeline updates:** 16ms throttling for smooth 60fps
- **Search:** 300ms debounce for media library

### 3. Memory Management

- **Object pooling:** Reuse timeline clip components
- **Cleanup:** Remove event listeners on unmount
- **Limits:** Cap undo/redo stack size

## Testing Patterns

### 1. Unit Testing

- **State management:** Test Zustand actions
- **Utilities:** Test helper functions
- **Components:** Test React components in isolation

### 2. Integration Testing

- **IPC communication:** Test main ↔ renderer
- **File operations:** Test with real files
- **FFmpeg integration:** Test with sample videos

### 3. E2E Testing

- **User workflows:** Complete import → edit → export
- **Cross-platform:** Test on macOS and Windows
- **Performance:** Test with large files and many clips

## Security Patterns

### 1. Input Validation

- **File paths:** Sanitize and validate
- **User input:** Escape and validate
- **IPC messages:** Type-check all data

### 2. Permission Management

- **File access:** Request only when needed
- **Recording:** Handle permissions gracefully
- **System access:** Minimal required permissions

### 3. Data Protection

- **Local storage:** No sensitive data in localStorage
- **Temporary files:** Clean up after use
- **Logs:** No sensitive information in logs

## Extension Patterns

### 1. Plugin Architecture (Future)

```typescript
interface Plugin {
  name: string;
  version: string;
  install: (app: ClipForgeApp) => void;
  uninstall: () => void;
}
```

### 2. Theme System

```typescript
interface Theme {
  name: string;
  colors: ColorPalette;
  spacing: SpacingScale;
  typography: TypographyScale;
}
```

### 3. Export Presets

```typescript
interface ExportPreset {
  name: string;
  settings: ExportSettings;
  description: string;
}
```

## Monitoring and Analytics

### 1. Error Tracking

- **Crash reports:** Automatic collection
- **Error logging:** Detailed error information
- **Performance metrics:** Memory usage, render times

### 2. Usage Analytics (Privacy-Conscious)

- **Feature usage:** Which features are used most
- **Performance data:** Export times, memory usage
- **No personal data:** No video content or personal information

### 3. Update System

- **Version checking:** Check for updates on launch
- **Update notifications:** Inform users of new versions
- **Rollback capability:** Revert to previous version if needed
