# Phase 4 PRD: Recording

> **Parent Document:** [High-Level PRD](../_planning/High-Level%20PRD.md)  
> **Phase:** 4 of 5  
> **Depends On:** Phase 3 (Export Early)  
> **Goal:** Enable screen, webcam, and microphone recording with automatic import to timeline

---

## Overview

This phase transforms ClipForge from an editing tool into a complete content creation platform by adding recording capabilities. Users can capture screen content, webcam footage, and audio directly into their project without needing external tools.

**Success Criteria:** A user can record their screen (full display or window), webcam, and microphone. Recordings automatically appear in the media library and can be added to the timeline for editing and export.

---

## User Stories

### Recording Setup
- As a user, I can click a **"Record"** button to open the recording panel
- As a user, I can choose to record: Screen, Webcam, Screen + Webcam (PiP), or Audio Only
- As a user, I can select which **screen/window** to record from a picker
- As a user, I can select which **camera device** to use
- As a user, I can select which **microphone** to use
- As a user, I see a **preview** of what will be recorded before starting
- As a user, I can test my audio levels before recording

### Recording Process
- As a user, I can click **"Start Recording"** to begin
- As a user, I see a **recording indicator** (elapsed time, red dot)
- As a user, I can **pause/resume** recording *(stretch)*
- As a user, I can click **"Stop Recording"** to finish
- As a user, the recording is automatically saved and appears in my media library
- As a user, I receive a notification that the recording is ready

### Screen + Webcam PiP
- As a user, I can record my screen with webcam overlay in a single take
- As a user, I can choose webcam **position** (corner: top-left, top-right, bottom-left, bottom-right)
- As a user, I can choose webcam **size** (small, medium, large)
- As a user, the PiP layout is baked into the recording for simplicity *(or: recorded as separate tracks - TBD)*

---

## Technical Requirements

### Electron APIs

**Screen Recording:**
```typescript
import { desktopCapturer } from 'electron';

// Get available sources
const sources = await desktopCapturer.getSources({
  types: ['screen', 'window'],
  thumbnailSize: { width: 150, height: 150 }
});

// Display picker to user
// User selects source → get sourceId

// In renderer, use getUserMedia with chromeMediaSourceId
const stream = await navigator.mediaDevices.getUserMedia({
  audio: false,
  video: {
    mandatory: {
      chromeMediaSource: 'desktop',
      chromeMediaSourceId: sourceId
    }
  }
});
```

**Webcam & Microphone:**
```typescript
const webcamStream = await navigator.mediaDevices.getUserMedia({
  video: { deviceId: selectedCameraId },
  audio: false
});

const micStream = await navigator.mediaDevices.getUserMedia({
  video: false,
  audio: { deviceId: selectedMicrophoneId }
});
```

**Device Enumeration:**
```typescript
const devices = await navigator.mediaDevices.enumerateDevices();
const cameras = devices.filter(d => d.kind === 'videoinput');
const microphones = devices.filter(d => d.kind === 'audioinput');
```

### Recording with MediaRecorder

```typescript
interface RecordingState {
  status: 'idle' | 'recording' | 'paused' | 'stopped';
  startTime: number;
  elapsedTime: number;
  outputPath: string;
}

function startRecording(streams: MediaStream[]) {
  // Combine streams
  const combinedStream = new MediaStream();
  streams.forEach(stream => {
    stream.getTracks().forEach(track => combinedStream.addTrack(track));
  });
  
  // Create MediaRecorder
  const recorder = new MediaRecorder(combinedStream, {
    mimeType: 'video/webm; codecs=vp9',
    videoBitsPerSecond: 5000000 // 5 Mbps
  });
  
  const chunks: Blob[] = [];
  
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };
  
  recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Save to project folder
    const outputPath = path.join(projectDir, 'media', `recording-${Date.now()}.webm`);
    fs.writeFileSync(outputPath, buffer);
    
    // Optionally transcode to MP4 for consistency
    await transcodeToMP4(outputPath);
    
    // Import to media library
    await importMedia(outputPath);
  };
  
  recorder.start(1000); // Capture every 1s
  return recorder;
}
```

### Screen + Webcam Compositing

**Option A: Bake PiP during recording (Simpler)**
- Use Canvas to composite screen + webcam in real-time
- Record the composed canvas stream

```typescript
const canvas = document.createElement('canvas');
canvas.width = 1920;
canvas.height = 1080;
const ctx = canvas.getContext('2d');

const screenVideo = document.createElement('video');
screenVideo.srcObject = screenStream;

const webcamVideo = document.createElement('video');
webcamVideo.srcObject = webcamStream;

function drawFrame() {
  // Draw screen
  ctx.drawImage(screenVideo, 0, 0, 1920, 1080);
  
  // Draw webcam PiP (bottom-right, 320x180)
  ctx.drawImage(webcamVideo, 1920 - 320 - 20, 1080 - 180 - 20, 320, 180);
  
  requestAnimationFrame(drawFrame);
}

const canvasStream = canvas.captureStream(30);
const recorder = new MediaRecorder(canvasStream);
```

**Option B: Separate tracks (More flexible)**
- Record screen and webcam as separate files
- Automatically place webcam on Track 2 (overlay) in timeline
- User can reposition/resize in timeline

*Recommendation:* **Option B** for flexibility, but add "Quick PiP Recording" preset that auto-positions overlay.

### State Management (extend Zustand)

```typescript
interface RecordingSettings {
  mode: 'screen' | 'webcam' | 'screen-webcam' | 'audio';
  screenSourceId?: string;
  cameraDeviceId?: string;
  microphoneDeviceId?: string;
  pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  pipSize?: 'small' | 'medium' | 'large';
}

interface AppState {
  // ... existing
  recordingSettings: RecordingSettings;
  recordingState: RecordingState;
  availableSources: DesktopCapturerSource[];
  availableCameras: MediaDeviceInfo[];
  availableMicrophones: MediaDeviceInfo[];
  
  // Actions
  openRecordingPanel: () => void;
  updateRecordingSettings: (settings: Partial<RecordingSettings>) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
}
```

---

## UI Components (Tailwind CSS v4.0)

1. **RecordingPanel.tsx** - Main recording interface
   - Mode selector: `flex space-x-2` (Screen / Webcam / Screen+Webcam / Audio)
   - Device/source pickers: `grid grid-cols-2 gap-4`
   - Preview area: `aspect-video bg-gray-900 rounded-lg overflow-hidden`
   - Start/Stop/Pause buttons: `bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium`
   - Settings: `space-y-4` (resolution, bitrate, PiP options)

2. **SourcePicker.tsx** - Screen/window selection
   - Grid: `grid grid-cols-2 gap-4` of available screens/windows with thumbnails
   - Selected source: `ring-2 ring-blue-500 ring-offset-2`

3. **DevicePicker.tsx** - Camera/mic dropdown
   - Dropdown: `w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500`
   - List of devices with friendly names
   - Test button: `bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded`

4. **RecordingIndicator.tsx** - Active recording UI
   - Container: `fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2`
   - Red dot: `w-3 h-3 bg-red-300 rounded-full animate-pulse`
   - Elapsed time: `font-mono text-sm` (MM:SS)
   - Stop button: `bg-red-800 hover:bg-red-900 px-3 py-1 rounded text-xs`

5. **PreviewCanvas.tsx** - Live preview before recording
   - Container: `w-full h-full bg-gray-900 rounded-lg overflow-hidden`
   - Shows what will be captured
   - For PiP mode: `relative` with webcam overlay positioned absolutely

**Custom Tailwind v4.0 Configuration:**
```css
@theme {
  --color-recording-active: #dc2626;
  --color-recording-hover: #b91c1c;
  --color-preview-bg: #111827;
  --spacing-recording-indicator: 1rem;
  --spacing-device-grid: 1rem;
}
```

---

## Acceptance Criteria

### Must Have
- [ ] User can select a screen/window from picker and start recording
- [ ] User can select a webcam and start recording
- [ ] User can select a microphone for audio
- [ ] Recordings save to project folder automatically
- [ ] Recordings appear in media library after stopping
- [ ] Recording indicator shows elapsed time
- [ ] Stop button ends recording cleanly
- [ ] Permissions are requested correctly (screen, camera, mic)
- [ ] Recordings are playable (WebM or MP4)

### Nice to Have
- [ ] Screen + Webcam PiP recording in one take
- [ ] Pause/resume recording
- [ ] Countdown before recording starts (3, 2, 1)
- [ ] Audio level meter during recording
- [ ] Hotkey to start/stop recording (global)
- [ ] Recording quality presets (High/Medium/Low)

---

## Dependencies

### npm Packages
```json
{
  "dependencies": {
    "zustand": "^4.x", // State management
    "uuid": "^9.x",    // ID generation
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

1. **Permissions & Device Enumeration** (0.5 day)
   - Request screen/camera/mic permissions
   - Implement device enumeration
   - Handle permission denied errors

2. **Source Picker UI** (0.5 day)
   - Build SourcePicker for screen/window selection
   - Integrate desktopCapturer
   - Display thumbnails

3. **Recording State & Controls** (1 day)
   - Implement recording state management
   - Build RecordingPanel UI
   - Wire up Start/Stop buttons
   - Add recording indicator

4. **MediaRecorder Integration** (1 day)
   - Implement screen recording with getUserMedia
   - Implement webcam recording
   - Implement audio recording
   - Save recordings to files

5. **Screen + Webcam PiP** (1 day) *(stretch)*
   - Canvas compositing
   - PiP positioning/sizing options
   - Record composed stream

6. **Auto-Import to Library** (0.5 day)
   - Trigger import after recording stops
   - Add to timeline automatically (optional)
   - Show notification

7. **Testing & Polish** (1 day)
   - Test all recording modes
   - Test on macOS and Windows
   - Handle edge cases (no camera, no mic, permission denied)
   - Refine UI

**Total Estimate:** ~5.5 days

---

## Success Metrics

- User can complete first screen recording in <60 seconds
- Recordings are high quality (no dropped frames, clear audio)
- 95%+ of recordings save successfully
- Permissions flow is clear and not confusing

---

## Next Phase Preview

**Phase 5: Polish & Performance** will add final touches:
- Thumbnail generation for timeline clips
- Proxy generation for smooth playback
- Auto-save project state
- Keyboard shortcuts
- Performance optimizations
- Bug fixes and UX refinements

