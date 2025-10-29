# Phase 3 PRD: Export Early

> **Parent Document:** [High-Level PRD](../_planning/High-Level%20PRD.md)  
> **Phase:** 3 of 5  
> **Depends On:** Phase 2 (Timeline Core)  
> **Goal:** Implement reliable FFmpeg-based export that stitches timeline clips into a single MP4 with sensible defaults

---

## Overview

This phase transforms ClipForge from a preview tool into a functional video editor by adding the critical export capability. Users will be able to render their timeline composition to a high-quality MP4 file with industry-standard encoding (H.264 + AAC), see export progress, and choose output resolution.

**Success Criteria:** A user with a multi-clip timeline can click "Export," see a progress indicator, and receive a playable MP4 file that accurately reflects their timeline arrangement (clips in order, trims respected, gaps handled correctly).

---

## User Stories

### Export Configuration

- As a user, I can click an **"Export"** button prominently placed in the UI
- As a user, I see an **export dialog** with sensible defaults pre-filled:
  - Output filename: `<project-name>-<YYYYMMDD>-<HHmm>.mp4`
  - Resolution: Match source (default), 1080p, or 720p
  - Destination folder: Last used or system Videos folder
- As a user, I can **change the filename** and **choose a different folder**
- As a user, I can see an **estimated file size** based on duration and settings _(nice-to-have)_
- As a user, I can **cancel** the export before starting

### Export Process

- As a user, when I click "Start Export," the app begins rendering in the background
- As a user, I see a **progress bar** showing percentage complete and estimated time remaining
- As a user, I can see **current operation** (e.g., "Processing clip 2 of 5...")
- As a user, I can **cancel** the export mid-process (with confirmation)
- As a user, the app remains responsive during export (doesn't freeze)
- As a user, I receive a **notification** when export completes successfully
- As a user, I can click "Show in Folder" to reveal the exported file

### Export Quality (Sensible Defaults)

- As a user, my exported video uses **H.264 (libx264)** codec for compatibility
- As a user, audio is encoded as **AAC** at 48kHz stereo
- As a user, the frame rate **matches my source media** by default
- As a user, the bitrate is automatically chosen for **balanced size/quality** (CBR/VBR auto)
- As a user, color space is **BT.709** (standard for HD video)
- As a user, keyframes are placed every ~2 seconds for seekability

### Error Handling

- As a user, if export fails, I see a **clear error message** explaining what went wrong
- As a user, I can view a **log file** if I need to troubleshoot or report a bug
- As a user, if I try to export an empty timeline, I'm warned before the process starts

---

## Technical Requirements

### Architecture Components

#### Export State (extend Zustand store)

```typescript
interface ExportSettings {
  filename: string;
  outputPath: string;
  resolution: 'source' | '1080p' | '720p' | '4k';
  codec: 'h264' | 'h265'; // h264 for MVP
  quality: 'high' | 'medium' | 'low'; // Maps to CRF values
  fps: number | 'match-source';
}

interface ExportJob {
  id: string;
  status:
    | 'idle'
    | 'preparing'
    | 'encoding'
    | 'complete'
    | 'error'
    | 'cancelled';
  progress: number; // 0-100
  currentStep: string; // "Processing clip 3 of 7"
  estimatedTimeRemaining: number; // seconds
  error?: string;
  outputPath?: string;
  startTime?: number;
}

interface AppState {
  // ... existing
  exportSettings: ExportSettings;
  exportJob: ExportJob | null;

  // Actions
  openExportDialog: () => void;
  updateExportSettings: (settings: Partial<ExportSettings>) => void;
  startExport: () => Promise<void>;
  cancelExport: () => void;
}
```

#### FFmpeg Export Pipeline

**High-Level Process:**

1. **Preparation:** Analyze timeline, generate FFmpeg command(s)
2. **Encoding:** Execute FFmpeg in separate process, stream progress
3. **Finalization:** Verify output, clean up temp files, notify user

**Approaches:**

**Option A: Simple Concat (Recommended for MVP)**

- For each clip on timeline, use FFmpeg to extract the trimmed segment to a temp file
- Concatenate all temp files using FFmpeg concat demuxer
- Single final encode to output

```bash
# Step 1: Extract segments (one per clip)
ffmpeg -i clip1.mp4 -ss 00:00:02 -to 00:00:08 -c copy temp1.mp4
ffmpeg -i clip2.mp4 -ss 00:00:00 -to 00:00:05 -c copy temp2.mp4

# Step 2: Create concat file
# file 'temp1.mp4'
# file 'temp2.mp4'

# Step 3: Concatenate and encode
ffmpeg -f concat -safe 0 -i concat.txt \
  -c:v libx264 -preset medium -crf 23 \
  -c:a aac -b:a 128k \
  -pix_fmt yuv420p \
  -movflags +faststart \
  output.mp4
```

**Option B: Complex Filter (Single Pass)**

- Build a single FFmpeg command with complex filter graph
- More efficient but harder to debug

_Recommendation:_ Use **Option A** (Simple Concat) for reliability and debuggability.

#### Export Command Builder

```typescript
interface TimelineSegment {
  inputFile: string;
  startTime: number; // Trim start (offset into source)
  duration: number; // Trim duration
  outputFile: string; // Temp file path
}

function buildExportPlan(
  timeline: Timeline,
  clips: Clip[],
  media: MediaFile[]
): TimelineSegment[] {
  const segments: TimelineSegment[] = [];

  // Sort clips by timeline position
  const sortedClips = [...clips]
    .filter((c) => c.trackId === 'track-1') // Main track only for MVP
    .sort((a, b) => a.start - b.start);

  for (const clip of sortedClips) {
    const mediaFile = media.find((m) => m.id === clip.mediaId);
    if (!mediaFile) continue;

    segments.push({
      inputFile: mediaFile.path,
      startTime: clip.offset, // Trim offset into source
      duration: clip.end - clip.start, // Clip duration on timeline
      outputFile: path.join(tempDir, `segment-${clip.id}.mp4`),
    });
  }

  return segments;
}

function buildFFmpegCommands(
  segments: TimelineSegment[],
  settings: ExportSettings,
  outputPath: string
): string[] {
  const commands: string[] = [];

  // Step 1: Extract each segment
  for (const seg of segments) {
    commands.push(
      `ffmpeg -i "${seg.inputFile}" ` +
        `-ss ${seg.startTime} -t ${seg.duration} ` +
        `-c copy "${seg.outputFile}"`
    );
  }

  // Step 2: Create concat file
  const concatFilePath = path.join(tempDir, 'concat.txt');
  const concatContent = segments
    .map((s) => `file '${s.outputFile}'`)
    .join('\n');
  fs.writeFileSync(concatFilePath, concatContent);

  // Step 3: Final encode
  const resolution = getResolutionScale(settings.resolution);
  const crf =
    settings.quality === 'high' ? 20 : settings.quality === 'medium' ? 23 : 26;

  commands.push(
    `ffmpeg -f concat -safe 0 -i "${concatFilePath}" ` +
      `-vf "scale=${resolution}" ` +
      `-c:v libx264 -preset medium -crf ${crf} ` +
      `-c:a aac -b:a 128k -ar 48000 ` +
      `-pix_fmt yuv420p ` +
      `-movflags +faststart ` +
      `"${outputPath}"`
  );

  return commands;
}

function getResolutionScale(resolution: string): string {
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
```

#### FFmpeg Execution & Progress

**Spawn FFmpeg in separate process:**

```typescript
import { spawn } from 'child_process';

function executeFFmpeg(
  command: string,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = command.split(' ').slice(1); // Remove 'ffmpeg'
    const ffmpeg = spawn('ffmpeg', args);

    let duration = 0;

    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();

      // Parse duration (from initial output)
      const durationMatch = output.match(
        /Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/
      );
      if (durationMatch) {
        duration = parseTimecode(durationMatch[0]);
      }

      // Parse progress (from encoding output)
      const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (timeMatch && duration > 0) {
        const currentTime = parseTimecode(timeMatch[0]);
        const percent = (currentTime / duration) * 100;
        onProgress(Math.min(percent, 100));
      }
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on('error', reject);
  });
}

function parseTimecode(str: string): number {
  const match = str.match(/(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
}
```

#### IPC Handlers (Main Process)

```typescript
// src/main/export.ts
ipcMain.handle(
  'export:start',
  async (event, exportSettings, timeline, clips, media) => {
    try {
      const segments = buildExportPlan(timeline, clips, media);
      const commands = buildFFmpegCommands(
        segments,
        exportSettings,
        exportSettings.outputPath
      );

      for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        event.sender.send('export:progress', {
          step: `Processing ${i + 1} of ${commands.length}`,
          percent: (i / commands.length) * 100,
        });

        await executeFFmpeg(cmd, (percent) => {
          event.sender.send('export:progress', {
            step: `Processing ${i + 1} of ${commands.length}`,
            percent: ((i + percent / 100) / commands.length) * 100,
          });
        });
      }

      event.sender.send('export:complete', {
        outputPath: exportSettings.outputPath,
      });
    } catch (error) {
      event.sender.send('export:error', { error: error.message });
    }
  }
);

ipcMain.handle('export:cancel', async () => {
  // Kill FFmpeg process
  if (currentFFmpegProcess) {
    currentFFmpegProcess.kill('SIGTERM');
  }
});
```

#### Preload Bridge (extend)

```typescript
interface IClipForgeAPI {
  // ... existing
  export: {
    start: (
      settings: ExportSettings,
      timeline: Timeline,
      clips: Clip[],
      media: MediaFile[]
    ) => Promise<void>;
    cancel: () => Promise<void>;
    onProgress: (
      callback: (data: { step: string; percent: number }) => void
    ) => void;
    onComplete: (callback: (data: { outputPath: string }) => void) => void;
    onError: (callback: (data: { error: string }) => void) => void;
  };
}
```

### UI Components

1. **ExportDialog.tsx** - Modal dialog with settings
   - Filename input
   - Folder picker button
   - Resolution dropdown
   - Quality dropdown (High/Medium/Low)
   - Estimated file size (nice-to-have)
   - Start Export / Cancel buttons

2. **ExportProgress.tsx** - Progress overlay
   - Progress bar (0-100%)
   - Current step text ("Processing clip 3 of 7")
   - Estimated time remaining
   - Cancel button (with confirmation)

3. **ExportComplete.tsx** - Success notification
   - Checkmark icon
   - "Export complete!" message
   - "Show in Folder" button
   - "Export Another" button
   - Close button

4. **ExportButton.tsx** - Main export trigger
   - Prominent button in top toolbar
   - Disabled if timeline is empty
   - Shows tooltip: "Export your video to MP4"

### Validation & Error Handling

**Pre-Export Validation:**

- Timeline has at least one clip
- All media files still exist on disk
- Output path is writable
- Sufficient disk space (estimate: timeline duration × 10 MB/min)

**Error Scenarios:**

- FFmpeg not found → "Export failed: FFmpeg not installed"
- Media file missing → "Cannot export: [filename] not found. Please re-import."
- Disk full → "Export failed: Insufficient disk space"
- Codec error → "Export failed: [technical details]. Please check logs."
- User cancels → "Export cancelled by user"

**Logging:**
Store FFmpeg output in `project.clipforge/logs/export-<timestamp>.log` for debugging.

---

## Data Flow

### Export Flow (End-to-End)

1. **User clicks "Export" button**
   - App opens ExportDialog with pre-filled defaults
2. **User configures settings, clicks "Start Export"**
   - Validate timeline and settings
   - Send to main process: `window.clipforge.export.start(settings, timeline, clips, media)`
3. **Main process prepares export**
   - Build export plan (segments)
   - Create temp directory
   - Generate FFmpeg commands
   - Update status: "Preparing..."
4. **Main process executes FFmpeg commands**
   - For each segment:
     - Run FFmpeg extract command
     - Parse stderr for progress
     - Send progress updates via IPC
   - Create concat file
   - Run final encode command
   - Parse stderr for overall progress
5. **FFmpeg completes**
   - Verify output file exists and is valid (> 0 bytes)
   - Clean up temp files
   - Send completion event: `export:complete`
6. **Renderer shows success**
   - Close progress overlay
   - Show ExportComplete notification
   - Enable "Show in Folder" button

### Progress Updates

```typescript
// Renderer listens for progress
window.clipforge.export.onProgress(({ step, percent }) => {
  setExportJob((prev) => ({
    ...prev,
    status: 'encoding',
    currentStep: step,
    progress: percent,
    estimatedTimeRemaining: calculateETA(percent, elapsedTime),
  }));
});

function calculateETA(percent: number, elapsed: number): number {
  if (percent === 0) return 0;
  const totalEstimated = (elapsed / percent) * 100;
  return totalEstimated - elapsed;
}
```

---

## UI/UX Details

### Export Dialog (Modal)

```
┌───────────────────────────────────────────────┐
│  Export Video                            [X]  │
├───────────────────────────────────────────────┤
│                                               │
│  Filename:                                    │
│  [ClipForge-Project-20251029-1430.mp4______]  │
│                                               │
│  Destination:                                 │
│  [C:\Users\Sam\Videos\ClipForge\__] [Browse]  │
│                                               │
│  Resolution:                                  │
│  [Match Source ▼]  ←  1080p, 720p, 4k        │
│                                               │
│  Quality:                                     │
│  [High ▼]  ←  High (CRF 20), Medium, Low     │
│                                               │
│  Duration: 2:34  |  Est. Size: ~380 MB       │
│                                               │
│              [Cancel]  [Start Export]         │
└───────────────────────────────────────────────┘
```

### Export Progress (Overlay)

```
┌───────────────────────────────────────────────┐
│  Exporting Video...                           │
├───────────────────────────────────────────────┤
│                                               │
│  Processing clip 3 of 7                       │
│                                               │
│  ████████████████████░░░░░░░░░░░░  62%       │
│                                               │
│  Time remaining: ~1 minute                    │
│                                               │
│                     [Cancel Export]           │
└───────────────────────────────────────────────┘
```

### Export Complete (Toast Notification)

```
┌───────────────────────────────────────────┐
│  ✓ Export Complete!                  [X] │
├───────────────────────────────────────────┤
│  Your video is ready.                     │
│                                           │
│  [Show in Folder]  [Export Another]       │
└───────────────────────────────────────────┘
```

### Visual Design (Tailwind CSS v4.0)

- Modal dialogs: `fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm` (centered, backdrop blur)
- Dialog container: `w-[500px] bg-white rounded-lg shadow-xl` (500px wide, subtle shadow)
- Progress bar: `h-2 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full` (Blue gradient, 8px height, rounded)
- Buttons: Primary `bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded` (Start Export), Secondary `bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded` (Cancel)
- Notifications: `fixed top-4 right-4 transform transition-transform duration-300` (Slide in from top-right, auto-dismiss after 10s)

**Custom Tailwind v4.0 Configuration:**

```css
@theme {
  --color-export-primary: #2563eb;
  --color-export-primary-hover: #1d4ed8;
  --color-export-secondary: #6b7280;
  --color-export-secondary-hover: #4b5563;
  --spacing-dialog-width: 31.25rem; /* 500px */
  --spacing-progress-height: 0.5rem; /* 8px */
}
```

---

## Acceptance Criteria

### Must Have

- [ ] User can open export dialog from toolbar button
- [ ] Export dialog shows filename, destination, resolution, quality options
- [ ] User can change filename and destination folder
- [ ] Clicking "Start Export" begins export process
- [ ] Progress overlay shows percentage and current step
- [ ] Export produces a valid MP4 file
- [ ] Exported video matches timeline arrangement (clips in order)
- [ ] Trim points are respected (correct in/out points)
- [ ] Multiple clips are stitched together seamlessly (no gaps or glitches)
- [ ] Export completes without crashing
- [ ] User receives notification on completion
- [ ] "Show in Folder" button opens file location
- [ ] Cancel button stops export mid-process
- [ ] Errors show clear messages
- [ ] App remains responsive during export (doesn't freeze)

### Nice to Have

- [ ] Estimated file size shown in dialog
- [ ] Estimated time remaining updates during export
- [ ] Export queue (export multiple videos sequentially)
- [ ] Export presets (YouTube, Instagram, etc.)
- [ ] Hardware acceleration (NVENC, VideoToolbox)
- [ ] Export timeline selection (not entire timeline)
- [ ] Export in background (minimize to tray)

---

## Testing Plan

### Manual Testing

1. **Single Clip Export:**
   - Import one video, add to timeline, export
   - Verify output plays correctly, matches source quality
2. **Multi-Clip Export:**
   - Import 3 videos, arrange on timeline, export
   - Verify clips are in correct order, transitions are seamless
3. **Trimmed Clips:**
   - Add clip, trim both ends, export
   - Verify output only contains trimmed section
4. **Split Clips:**
   - Add clip, split in middle, delete one half, export
   - Verify output contains only remaining half
5. **Resolution Options:**
   - Export same timeline as 1080p, 720p, source
   - Verify output resolutions are correct
6. **Progress Tracking:**
   - Export long video (5+ minutes)
   - Verify progress updates smoothly, ETA is reasonable
7. **Cancel Export:**
   - Start export, click Cancel after 30%
   - Verify process stops, no output file or partial file
8. **Error Handling:**
   - Export with missing media file → verify error message
   - Export to read-only folder → verify error message
   - Export with full disk → verify error message

### Automated Testing (if time permits)

```typescript
describe('Export', () => {
  it('should generate correct FFmpeg commands for single clip', () => {
    const segments = buildExportPlan(timeline, clips, media);
    const commands = buildFFmpegCommands(segments, settings, output);
    expect(commands).toContain('-c:v libx264');
    expect(commands).toContain('-c:a aac');
  });

  it('should respect trim points', () => {
    const clip = { start: 5, end: 10, offset: 2, duration: 5 };
    const segment = buildSegmentFromClip(clip);
    expect(segment.startTime).toBe(2);
    expect(segment.duration).toBe(5);
  });
});
```

### Edge Cases

- Empty timeline
- Single frame clip
- Very long timeline (>1 hour)
- Mixed resolutions (1080p + 720p clips)
- Mixed frame rates (30fps + 60fps)
- Audio-only clips _(defer to later phase)_
- Clips with transparency _(defer)_
- Export to external drive (slow I/O)

---

## Performance Targets

- **Export speed:** Faster than 1x (e.g., 10-minute video exports in <10 minutes on typical hardware)
- **Memory usage:** <500MB during export (FFmpeg runs in separate process)
- **UI responsiveness:** No freezing; progress updates every 0.5s
- **File size:** ~50-100 MB per 10 minutes at 1080p high quality (CRF 20)

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

---

## Implementation Steps

1. **Export State & UI Shell** (0.5 day)
   - Add export state to Zustand store
   - Create ExportButton component in toolbar
   - Build ExportDialog modal (settings form)
   - Build ExportProgress overlay
   - Build ExportComplete notification

2. **Export Plan Builder** (0.5 day)
   - Implement buildExportPlan function
   - Implement buildFFmpegCommands function
   - Add resolution scaling logic
   - Add quality (CRF) mapping

3. **FFmpeg Integration** (1 day)
   - Implement executeFFmpeg function with progress parsing
   - Handle FFmpeg output (stdout/stderr)
   - Add error handling and logging
   - Test with sample videos

4. **IPC Handlers** (0.5 day)
   - Add export:start handler in main process
   - Add export:cancel handler
   - Implement IPC events: export:progress, export:complete, export:error
   - Extend preload bridge

5. **Temp File Management** (0.5 day)
   - Create temp directory for segments
   - Generate concat file
   - Clean up temp files after export
   - Handle cleanup on cancel or error

6. **Validation & Pre-Flight Checks** (0.5 day)
   - Validate timeline has clips
   - Check all media files exist
   - Check output path is writable
   - Estimate disk space needs

7. **Progress & ETA** (0.5 day)
   - Parse FFmpeg progress from stderr
   - Calculate percentage complete
   - Calculate estimated time remaining
   - Send progress updates via IPC

8. **Error Handling** (0.5 day)
   - Catch FFmpeg errors
   - Display user-friendly error messages
   - Write logs to project folder
   - Add "View Logs" button in error dialog

9. **Testing & Polish** (1 day)
   - Test all scenarios (single, multi, trimmed, split)
   - Test all resolution/quality options
   - Test cancel functionality
   - Test error cases
   - Refine UI animations and feedback
   - Fix bugs

**Total Estimate:** ~5.5 days

---

## Open Questions

- [ ] Should we support custom FFmpeg parameters for power users?
  - _Recommendation:_ Not in MVP; add "Advanced" section in future
- [ ] Should exported files be added back to media library automatically?
  - _Recommendation:_ No for MVP; user can manually import if needed
- [ ] How do we handle gaps in timeline (time between clips)?
  - _Recommendation:_ Option 1: Insert black frames (default), Option 2: Skip gaps (trim output)
- [ ] Should we support exporting specific tracks only?
  - _Recommendation:_ Not in MVP; export all visible tracks
- [ ] Do we need export history/log?
  - _Recommendation:_ Nice-to-have; show last 10 exports in a panel

---

## Success Metrics

- 95%+ of exports complete successfully (no errors)
- Export speed is faster than 0.8x realtime on average hardware
- Users can export a 3-clip timeline on first try without confusion
- Exported videos play correctly in VLC, QuickTime, and web browsers
- No memory leaks during export (stable memory usage)

---

## Next Phase Preview

**Phase 4: Recording** will add content creation capabilities:

- Screen recording (display or window)
- Webcam recording
- Microphone audio recording
- Screen + webcam PiP (picture-in-picture) recording
- Recorded clips automatically added to media library and timeline
