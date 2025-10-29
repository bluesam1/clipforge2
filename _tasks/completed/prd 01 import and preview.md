# Phase 1 PRD: Import & Preview First

> **Parent Document:** [High-Level PRD](../_planning/High-Level%20PRD.md)  
> **Phase:** 1 of 5  
> **Goal:** Establish core media import, library management, and single-clip preview functionality

---

## Overview

This phase lays the foundation for ClipForge by implementing the essential media ingestion and playback capabilities. Users will be able to import video files, see them in a media library, and preview individual clips using a basic video player.

**Success Criteria:** A user can drag-and-drop a video file, see it appear in a media panel with metadata, click it to preview, and control playback (play/pause/scrub).

---

## User Stories

### Import

- As a user, I can **drag-and-drop** MP4, MOV, or WebM files into the app window to import them
- As a user, I can click an **"Import Media"** button to open a file picker and select video files
- As a user, I see a **loading indicator** while files are being processed
- As a user, I receive **clear error messages** if a file cannot be imported (unsupported format, corrupted, etc.)

### Media Library Panel

- As a user, I see all imported media in a **left-side panel** with generous spacing
- As a user, I can see a **thumbnail preview** for each video file
- As a user, I can see **metadata** for each file: filename, duration (MM:SS), resolution (WxH), and file size (MB)
- As a user, I can **select** a media item by clicking it (visible selection state with border/highlight)
- As a user, I can **remove** a media item from the library (with confirmation prompt)

### Preview Player

- As a user, I can **double-click** a media item to load it in the **center preview player**
- As a user, I can **play/pause** the video using a prominent play/pause button
- As a user, I can **scrub** through the video using a seek bar that shows current time and total duration
- As a user, I can see the **current timecode** (MM:SS.ms) as I scrub or play
- As a user, the video **fills the preview area** while maintaining aspect ratio (letterbox/pillarbox as needed)
- As a user, I can adjust **volume** with a slider or mute button

---

## Technical Requirements

### Architecture Components

#### Electron Main Process

- Set up secure IPC handlers for:
  - `media:import` - Accepts file paths, validates formats, extracts metadata
  - `media:remove` - Removes media reference (optionally deletes file from project folder)
  - `media:getThumbnail` - Generates thumbnail using FFmpeg
  - `file:openDialog` - Opens native file picker

#### Preload Bridge

Create typed IPC bridge in `src/preload/index.ts`:

```typescript
interface MediaFile {
  id: string;
  path: string;
  name: string;
  type: 'video' | 'audio';
  duration: number;
  width: number;
  height: number;
  fps: number;
  size: number;
  thumbnailPath?: string;
  hash: string;
  createdAt: string;
}

interface IClipForgeAPI {
  media: {
    import: (paths: string[]) => Promise<MediaFile[]>;
    remove: (id: string) => Promise<void>;
    getThumbnail: (id: string) => Promise<string>;
  };
  file: {
    openDialog: (options: OpenDialogOptions) => Promise<string[] | null>;
  };
}
```

#### Renderer (React)

**State Management** (Zustand recommended for simplicity):

```typescript
interface AppState {
  media: MediaFile[];
  selectedMediaId: string | null;
  currentPreview: MediaFile | null;
  isImporting: boolean;

  // Actions
  importMedia: (files: File[] | string[]) => Promise<void>;
  selectMedia: (id: string) => void;
  removeMedia: (id: string) => Promise<void>;
  loadPreview: (id: string) => void;
}
```

**Components to Build:**

1. `MediaLibrary.tsx` - Left panel container
   - `MediaItem.tsx` - Individual media card with thumbnail and metadata
   - `ImportButton.tsx` - Trigger file picker
   - `DropZone.tsx` - Full-window drop target overlay

2. `PreviewPlayer.tsx` - Center preview container
   - `VideoPlayer.tsx` - HTML5 video element with controls
   - `PlaybackControls.tsx` - Play/pause, seek bar, timecode, volume
   - `PreviewCanvas.tsx` - Container that maintains aspect ratio

3. `AppShell.tsx` - Main layout component (flexbox/CSS Grid)

**Styling (Tailwind CSS v4.0):**

- Use **Tailwind CSS v4.0** for all styling and component design
- Follow style guide: generous spacing (16-24px gaps), neutral palette (grays/whites), restrained blue accent
- Media items: 160px thumbnails with 8px padding, subtle shadow on hover
- Preview area: dark background (#1a1a1a) to highlight video content
- Controls: 44px min height for touch targets
- Leverage Tailwind v4.0 utilities for responsive design, hover states, and consistent spacing
- Use CSS-first configuration with `@theme` and `@utility` directives for custom styling
- Take advantage of v4.0's high-performance engine and modern CSS features like `color-mix()`

### Media Processing (FFmpeg)

**Metadata Extraction:**

```bash
ffprobe -v quiet -print_format json -show_format -show_streams "input.mp4"
```

Parse JSON response for: duration, width, height, fps, codec info

**Thumbnail Generation:**

```bash
ffmpeg -i "input.mp4" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" "thumbnail.jpg"
```

Store thumbnails in `project.clipforge/thumbnails/`

**File Validation:**

- Accept: MP4 (H.264/H.265), MOV (H.264), WebM (VP8/VP9)
- Reject gracefully with clear error: "Unsupported format. Please use MP4, MOV, or WebM files."

### Project Structure

Set up initial project folder structure:

```
project.clipforge/
  project.json          # Project metadata and state
  media/                # Imported original files (symlinks or copies)
  thumbnails/           # Generated thumbnails
  renders/              # (future: exports)
  proxies/              # (future: optimized playback files)
```

**project.json** (initial schema):

```json
{
  "id": "uuid-v4",
  "name": "Untitled Project",
  "createdAt": "2025-10-29T10:00:00.000Z",
  "updatedAt": "2025-10-29T10:00:00.000Z",
  "media": [],
  "settings": {
    "lastOpenedPath": ""
  }
}
```

---

## Data Flow

### Import Flow

1. User drags files → `DropZone` detects `drop` event
2. Extract file paths → Call `window.clipforge.media.import(paths)`
3. Main process:
   - Validate file format
   - Run FFprobe for metadata
   - Generate thumbnail (FFmpeg)
   - Create MediaFile object
   - Save to project.json
   - Return MediaFile to renderer
4. Renderer updates store → Media appears in library

### Preview Flow

1. User double-clicks media item → `loadPreview(id)` action
2. Update state: `currentPreview = media.find(m => m.id === id)`
3. `VideoPlayer` component receives new `src` prop (local file path)
4. HTML5 video loads and displays
5. Playback controls interact with video element API

---

## UI/UX Details

### Layout

```
┌─────────────────────────────────────────────────────┐
│ ClipForge                                    [_][□][X] │
├──────────┬──────────────────────────┬────────────────┤
│          │                          │                │
│  MEDIA   │       PREVIEW            │   (Inspector)  │
│ LIBRARY  │                          │   placeholder  │
│          │   ┌──────────────┐       │                │
│ [Import] │   │              │       │                │
│          │   │    Video     │       │                │
│ ┌──────┐ │   │   Player     │       │                │
│ │ [TB] │ │   │              │       │                │
│ │video1│ │   └──────────────┘       │                │
│ └──────┘ │   [▶] ━━━●━━━━━ 🔊       │                │
│          │   00:45 / 02:30          │                │
│ ┌──────┐ │                          │                │
│ │ [TB] │ │                          │                │
│ │video2│ │                          │                │
│ └──────┘ │                          │                │
│          │                          │                │
└──────────┴──────────────────────────┴────────────────┘
```

### Interaction States

- **Hover:** Media items show subtle shadow + 2px border (accent blue)
- **Selected:** 3px border (accent blue), background tint
- **Loading:** Spinner overlay on media item
- **Error:** Red icon + tooltip with error message
- **Empty state:** "Drag & drop videos here or click Import" with large icon

### Keyboard Support (stretch)

- `Space`: Play/pause preview
- `Delete`: Remove selected media (with confirmation)
- `Arrow keys`: Scrub video (left/right) or select media (up/down)

---

## Acceptance Criteria

### Must Have

- [ ] User can drag-and-drop a single MP4 file into the app
- [ ] File appears in media library with thumbnail, filename, duration, resolution, file size
- [ ] User can click "Import" button to open file picker and select multiple files
- [ ] User can double-click a media item to load it in preview player
- [ ] Preview player plays/pauses video with button click
- [ ] Seek bar allows scrubbing to any point in the video
- [ ] Current time and total duration are displayed
- [ ] User can remove a media item (with confirmation)
- [ ] Unsupported file formats show clear error message
- [ ] App remembers media library between sessions (persisted to project.json)

### Nice to Have

- [ ] Volume control and mute button
- [ ] Playback speed control (0.5x, 1x, 2x)
- [ ] Media items sortable by name, date, duration
- [ ] Search/filter media library
- [ ] Thumbnail scrubbing (hover over thumbnail to preview different frames)

---

## Testing Plan

### Manual Testing

1. **Import Flow:**
   - Drag single file → verify appears in library
   - Import button with multiple files → verify all appear
   - Try unsupported format (e.g., .avi) → verify error message
   - Import very large file (>1GB) → verify no crash, reasonable wait time

2. **Media Library:**
   - Verify thumbnail accuracy (not black frame)
   - Verify metadata accuracy (compare with system properties)
   - Select item → verify visual feedback
   - Remove item → verify confirmation prompt → verify disappears

3. **Preview Player:**
   - Play/pause → verify smooth playback
   - Scrub → verify frame updates and timecode
   - Load different file → verify previous stops and new loads
   - Test with various codecs (H.264, H.265, VP9)

4. **Persistence:**
   - Import media → close app → reopen → verify media still in library
   - Verify project.json contains correct data

### Edge Cases

- Empty library state
- Corrupted video file
- File deleted from disk but still in library
- Multiple rapid imports
- Preview while importing

---

## Performance Targets

- **Import speed:** <5s for a 100MB file (metadata + thumbnail)
- **Thumbnail generation:** <2s per file
- **UI responsiveness:** No dropped frames during interaction
- **Memory:** <200MB with 10 imported files
- **Startup:** App launches in <5s with existing project

---

## Dependencies

### npm Packages

```json
{
  "dependencies": {
    "zustand": "^4.x", // State management
    "uuid": "^9.x", // ID generation
    "electron-store": "^8.x", // Simple persistence (optional, or use fs directly)
    "@tailwindcss/vite": "^4.0.0", // Tailwind CSS v4.0 Vite plugin
    "tailwindcss": "^4.0.0" // CSS framework v4.0
  },
  "devDependencies": {
    "@types/node": "^20.x" // Node.js types
  }
}
```

### External Binaries

- **FFmpeg** (static build bundled with app)
- **FFprobe** (included with FFmpeg)

Download from: https://ffmpeg.org/download.html or use `ffmpeg-static` npm package

---

## Implementation Steps

1. **Setup Electron IPC & Tailwind v4.0** (0.5 day)
   - Create typed preload bridge
   - Implement media:import handler in main process
   - Add file validation and FFprobe integration
   - Configure Tailwind CSS v4.0 with CSS-first configuration using `@theme` directive
   - Set up custom color palette and spacing matching style guide

2. **Media Library UI** (1 day)
   - Build MediaLibrary container with CSS Grid layout
   - Create MediaItem component
   - Implement DropZone overlay
   - Wire up Import button

3. **FFmpeg Integration** (0.5 day)
   - Integrate ffmpeg-static or bundled binary
   - Implement thumbnail generation
   - Implement metadata extraction
   - Handle errors gracefully

4. **Preview Player** (1 day)
   - Build VideoPlayer component (HTML5 video)
   - Create PlaybackControls with seek bar
   - Implement timecode display
   - Add volume controls

5. **State Management** (0.5 day)
   - Set up Zustand store
   - Implement actions: importMedia, selectMedia, removeMedia, loadPreview
   - Wire up persistence to project.json

6. **Polish & Testing** (1 day)
   - Implement all interaction states (hover, selected, loading, error)
   - Add empty states
   - Add confirmation dialogs
   - Manual testing against acceptance criteria
   - Fix bugs

**Total Estimate:** ~4.5 days

---

## Open Questions

- [ ] Should imported files be **copied** into project folder or just **referenced** by path?
  - _Recommendation:_ Reference by path for MVP, add "consolidate media" feature later
- [ ] Should we support audio-only files in this phase?
  - _Recommendation:_ No, defer to later phase
- [ ] What happens if user imports same file twice?
  - _Recommendation:_ Check hash, show "already imported" message

---

## Success Metrics

- User can complete import → preview flow in <30 seconds on first try
- No crashes during 20 consecutive import operations
- FFprobe/FFmpeg operations complete without errors for 95%+ of test files
- UI feels responsive (no perceived lag) with up to 20 imported files

---

## Next Phase Preview

**Phase 2: Timeline Core** will build upon this foundation by:

- Adding a timeline panel below preview
- Enabling drag-and-drop from media library to timeline
- Implementing clip positioning, trimming, splitting
- Starting multi-clip composition (preview will still play single clip at playhead position)
