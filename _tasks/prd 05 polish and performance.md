# Phase 5 PRD: Polish & Performance

> **Parent Document:** [High-Level PRD](../_planning/High-Level%20PRD.md)  
> **Phase:** 5 of 5  
> **Depends On:** Phase 4 (Recording)  
> **Goal:** Refine UX, optimize performance, add power-user features, and ensure production readiness

---

## Overview

This final phase takes ClipForge from functional to polished. We'll add the features that make the editing experience smooth and professional: thumbnails on timeline clips, proxy generation for large files, auto-save to prevent data loss, keyboard shortcuts for efficiency, and performance optimizations to handle complex projects.

**Success Criteria:** ClipForge feels responsive with 20+ clips, automatically saves work, provides intuitive keyboard shortcuts, and generates helpful visual previews (thumbnails, waveforms) that make editing faster.

---

## User Stories

### Timeline Visuals

- As a user, I see **thumbnail previews** on timeline clips (not just solid colors)
- As a user, I see **waveform visualizations** on clips with audio
- As a user, thumbnails update as I trim clips to show the actual content
- As a user, I can toggle thumbnail/waveform display for performance _(stretch)_

### Proxies for Smooth Playback

- As a user, large or high-res files (4K+) are automatically converted to **lightweight proxies** for preview
- As a user, I see a progress indicator while proxies are being generated
- As a user, playback is smooth even with 10+ clips on the timeline
- As a user, exports still use the **original high-quality files** (proxies only for preview)

### Auto-Save & Safety

- As a user, my project is **automatically saved** every 30 seconds while I work
- As a user, I see a subtle "Saving..." indicator when auto-save happens
- As a user, if the app crashes, I can **recover** my last auto-saved state on restart
- As a user, I can **manually save** using Cmd/Ctrl+S

### Undo/Redo

- As a user, I can **undo** my last action (Cmd/Ctrl+Z)
- As a user, I can **redo** an undone action (Cmd/Ctrl+Shift+Z)
- As a user, undo/redo works for: add/move/trim/split/delete clips, timeline changes
- As a user, I see a subtle indication of what action was undone _(nice-to-have)_

### Keyboard Shortcuts

- As a user, I can use **Space** to play/pause
- As a user, I can use **S** to split clip at playhead
- As a user, I can use **Delete/Backspace** to delete selected clip
- As a user, I can use **Cmd/Ctrl+Z** to undo and **Cmd/Ctrl+Shift+Z** to redo
- As a user, I can use **+/-** to zoom timeline in/out
- As a user, I can use **Arrow keys** to move playhead or select clips
- As a user, I can use **J/K/L** for playback control (reverse/pause/forward) _(stretch)_
- As a user, I can see a **keyboard shortcuts help panel** (Cmd/Ctrl+?)

### Performance Optimizations

- As a user, the timeline remains responsive with 30+ clips
- As a user, dragging and trimming feels smooth (60fps)
- As a user, the app doesn't consume excessive memory (<500MB with typical project)
- As a user, preview playback doesn't stutter on typical hardware
- As a user, the app starts quickly (<5 seconds)

### Additional Polish

- As a user, I see **tooltips** on buttons and controls explaining what they do
- As a user, I can **search/filter** my media library by filename
- As a user, I can **rename** clips in the timeline
- As a user, I see helpful **empty states** when panels are empty (with guidance)
- As a user, errors and warnings are **clear and actionable**
- As a user, the app remembers my **window size/position** between sessions

---

## Technical Requirements

### Timeline Thumbnails

**Generation:**

- On clip add to timeline, generate 5-10 thumbnails across the clip duration
- Use FFmpeg to extract frames at intervals: `ffmpeg -i video.mp4 -vf "fps=1/5" thumbnail-%03d.jpg`
- Store thumbnails in `project.clipforge/thumbnails/<clipId>/`

**Rendering:**

- In `TimelineClip` component, display thumbnails as repeating background or CSS grid
- Update visible thumbnails when clip is trimmed (show correct frames)

```typescript
function generateClipThumbnails(
  mediaPath: string,
  clipId: string,
  count: number = 10
): Promise<string[]> {
  const outputDir = path.join(projectDir, 'thumbnails', clipId);
  fs.mkdirSync(outputDir, { recursive: true });

  const interval = duration / count;
  const thumbnailPaths: string[] = [];

  for (let i = 0; i < count; i++) {
    const timestamp = i * interval;
    const outputPath = path.join(outputDir, `thumb-${i}.jpg`);

    await execFFmpeg([
      '-ss',
      timestamp.toString(),
      '-i',
      mediaPath,
      '-vframes',
      '1',
      '-vf',
      'scale=160:-1',
      outputPath,
    ]);

    thumbnailPaths.push(outputPath);
  }

  return thumbnailPaths;
}
```

### Waveform Generation

**Using Web Audio API:**

```typescript
async function generateWaveform(audioPath: string): Promise<number[]> {
  const audioBuffer = await loadAudioBuffer(audioPath);
  const channelData = audioBuffer.getChannelData(0); // Mono or first channel
  const samples = 1000; // Number of waveform points
  const blockSize = Math.floor(channelData.length / samples);
  const waveform: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = i * blockSize;
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[start + j]);
    }
    waveform.push(sum / blockSize);
  }

  return waveform;
}
```

**Rendering:**

- Display waveform as SVG or Canvas overlay on timeline clip
- Update waveform section shown when clip is trimmed

### Proxy Generation

**When to Generate:**

- Automatically for files >1080p or >500MB
- Or on user request ("Generate Proxies" button)

**Proxy Specs:**

- Resolution: 720p (or half of source)
- Codec: H.264, CRF 28 (lower quality, smaller file)
- Same frame rate as source

```bash
ffmpeg -i source-4k.mp4 \
  -vf scale=1280:720 \
  -c:v libx264 -crf 28 -preset fast \
  -c:a aac -b:a 128k \
  proxy-720p.mp4
```

**State Management:**

```typescript
interface MediaFile {
  // ... existing
  proxyPath?: string;
  proxyStatus: 'none' | 'generating' | 'ready' | 'error';
}

// Use proxy for preview if available, original for export
function getPreviewPath(media: MediaFile): string {
  return media.proxyStatus === 'ready' && media.proxyPath
    ? media.proxyPath
    : media.path;
}
```

### Auto-Save System

**Implementation:**

```typescript
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

let autoSaveTimeout: NodeJS.Timeout;
let isDirty = false; // Track if changes have been made

function markDirty() {
  isDirty = true;
  scheduleAutoSave();
}

function scheduleAutoSave() {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(async () => {
    if (isDirty) {
      await saveProject();
      isDirty = false;
    }
  }, AUTO_SAVE_INTERVAL);
}

// Call markDirty() whenever state changes
store.subscribe((state, prevState) => {
  if (hasChanges(state, prevState)) {
    markDirty();
  }
});
```

**Crash Recovery:**

- On app start, check for `project.clipforge/.autosave.json`
- If found and newer than `project.json`, prompt: "Recover unsaved changes?"
- If yes, load autosave; if no, delete autosave and load normal project

### Undo/Redo System

**Command Pattern:**

```typescript
interface Command {
  execute: () => void;
  undo: () => void;
  description: string;
}

class History {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxSize = 50;

  execute(command: Command) {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo stack on new action

    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
  }

  undo() {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
    }
  }

  redo() {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
    }
  }
}

// Example: AddClipCommand
class AddClipCommand implements Command {
  constructor(
    private clip: Clip,
    private store: Store
  ) {}

  execute() {
    this.store.clips.push(this.clip);
  }

  undo() {
    const index = this.store.clips.findIndex((c) => c.id === this.clip.id);
    this.store.clips.splice(index, 1);
  }

  description = 'Add Clip';
}
```

### Keyboard Shortcuts

**Global Listener:**

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const isMac = navigator.platform.indexOf('Mac') === 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    // Space: Play/Pause
    if (e.code === 'Space' && !isInputFocused()) {
      e.preventDefault();
      togglePlayback();
    }

    // S: Split
    if (e.code === 'KeyS' && !modifier && !isInputFocused()) {
      e.preventDefault();
      splitAtPlayhead();
    }

    // Delete/Backspace: Delete clip
    if ((e.code === 'Delete' || e.code === 'Backspace') && !isInputFocused()) {
      e.preventDefault();
      deleteSelectedClip();
    }

    // Cmd/Ctrl+Z: Undo
    if (modifier && e.code === 'KeyZ' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }

    // Cmd/Ctrl+Shift+Z: Redo
    if (modifier && e.code === 'KeyZ' && e.shiftKey) {
      e.preventDefault();
      redo();
    }

    // +/-: Zoom
    if (e.code === 'Equal' || e.code === 'Minus') {
      e.preventDefault();
      adjustZoom(e.code === 'Equal' ? 1.2 : 0.8);
    }

    // Arrow keys: Move playhead or selection
    if (e.code.startsWith('Arrow')) {
      e.preventDefault();
      handleArrowKey(e.code);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);

function isInputFocused(): boolean {
  const active = document.activeElement;
  return active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA';
}
```

**Shortcuts Panel:**
Create `KeyboardShortcutsDialog.tsx` that shows all available shortcuts in a modal.

### Performance Optimizations

**1. Timeline Virtualization:**

- Only render clips visible in viewport
- Use `react-window` or custom virtualization

**2. Debounce/Throttle:**

- Throttle drag events (every 16ms / 60fps)
- Debounce auto-save (wait 2s after last change)
- Debounce search/filter (300ms)

**3. Web Workers:**

- Move heavy computations to workers:
  - Thumbnail generation coordination
  - Waveform processing
  - Timeline calculations

**4. Memoization:**

- Use `React.memo` for components that re-render often
- Use `useMemo` for expensive calculations
- Use `useCallback` for stable function references

**5. Lazy Loading:**

- Load thumbnails on demand (not all at once)
- Lazy load media metadata (paginate large libraries)

**6. Memory Management:**

- Clean up old thumbnails periodically
- Revoke object URLs when no longer needed
- Limit undo/redo stack size

---

## UI Components (Tailwind CSS v4.0)

1. **KeyboardShortcutsDialog.tsx** - Help panel
   - Container: `fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50`
   - Dialog: `w-[600px] max-h-[80vh] bg-white rounded-lg shadow-xl overflow-hidden`
   - Grid: `grid grid-cols-2 gap-4` of shortcuts grouped by category
   - Search: `w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500`

2. **SaveIndicator.tsx** - Auto-save status
   - Container: `fixed top-4 right-4 text-sm text-gray-600 flex items-center space-x-2`
   - Text: "All changes saved" or "Saving..." with `animate-pulse`
   - Icon: `w-4 h-4` checkmark or spinner

3. **ThumbnailStrip.tsx** - Timeline clip thumbnails
   - Container: `flex overflow-hidden rounded` with thumbnails as background
   - Thumbnail: `w-8 h-6 object-cover` (32x24px) repeated across clip width
   - Update on trim with `transition-all duration-200`

4. **WaveformOverlay.tsx** - Audio waveform
   - Container: `absolute inset-0 pointer-events-none`
   - SVG: `w-full h-full` with waveform path
   - Colors: `stroke-blue-500 fill-blue-500/20` for positive, `stroke-red-500 fill-red-500/20` for negative

5. **ProxyStatusIndicator.tsx** - Proxy generation progress
   - Container: `absolute top-2 right-2 bg-black/75 text-white px-2 py-1 rounded text-xs`
   - Progress bar: `w-16 h-1 bg-gray-600 rounded-full overflow-hidden`
   - Progress fill: `h-full bg-blue-500 transition-all duration-300`

**Custom Tailwind v4.0 Configuration:**

```css
@theme {
  --color-save-indicator: #6b7280;
  --color-shortcuts-bg: #ffffff;
  --color-thumbnail-bg: #f3f4f6;
  --color-waveform-positive: #3b82f6;
  --color-waveform-negative: #ef4444;
  --spacing-thumbnail-size: 2rem; /* 32px */
  --spacing-shortcuts-dialog: 37.5rem; /* 600px */
}
```

---

## Acceptance Criteria

### Must Have

- [ ] Timeline clips show thumbnail previews
- [ ] Auto-save runs every 30 seconds
- [ ] Crash recovery offers to restore last auto-save
- [ ] Undo/Redo works for all major operations (add, move, trim, split, delete)
- [ ] Keyboard shortcuts work: Space, S, Delete, Cmd/Ctrl+Z, +/-
- [ ] Keyboard shortcuts help panel accessible via Cmd/Ctrl+?
- [ ] Timeline remains responsive with 20+ clips (no lag)
- [ ] Memory usage stays reasonable (<500MB typical project)
- [ ] App starts in <5 seconds

### Nice to Have

- [ ] Waveform visualization on audio clips
- [ ] Proxy generation for large files (auto or manual)
- [ ] J/K/L playback shortcuts
- [ ] Search/filter media library
- [ ] Rename clips in timeline
- [ ] Tooltips on all buttons
- [ ] Empty state guidance
- [ ] Window size/position persistence
- [ ] Export presets (YouTube, Instagram)
- [ ] Batch thumbnail generation

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

1. **Timeline Thumbnails** (1 day)
   - Implement thumbnail generation with FFmpeg
   - Store thumbnails in project folder
   - Render thumbnails in TimelineClip component
   - Update thumbnails on trim

2. **Auto-Save System** (0.5 day)
   - Implement auto-save timer and dirty tracking
   - Save to `.autosave.json`
   - Add SaveIndicator UI
   - Implement crash recovery prompt

3. **Undo/Redo** (1 day)
   - Implement History class with command pattern
   - Create command classes for all operations
   - Integrate with Zustand store
   - Add undo/redo UI buttons
   - Wire up keyboard shortcuts

4. **Keyboard Shortcuts** (0.5 day)
   - Implement global keyboard listener
   - Add all shortcuts: Space, S, Delete, Cmd+Z, etc.
   - Create KeyboardShortcutsDialog
   - Add "?" trigger to open dialog

5. **Waveform Generation** (1 day) _(stretch)_
   - Implement waveform generation with Web Audio API
   - Cache waveforms
   - Create WaveformOverlay component
   - Render on timeline clips

6. **Proxy Generation** (1 day) _(stretch)_
   - Detect large/high-res files
   - Implement proxy generation with FFmpeg
   - Update MediaFile with proxy status
   - Use proxies for preview, originals for export
   - Show progress indicator

7. **Performance Optimizations** (1 day)
   - Add timeline virtualization
   - Throttle drag events
   - Memoize expensive components
   - Profile and optimize hot paths

8. **Polish & UX Refinements** (1 day)
   - Add tooltips to all buttons
   - Improve empty states
   - Add media library search
   - Refine error messages
   - Test accessibility (keyboard navigation, focus states)

9. **Testing & Bug Fixes** (1 day)
   - Comprehensive testing of all features
   - Performance testing with large projects
   - Memory leak testing
   - Cross-platform testing (macOS, Windows)
   - Fix critical bugs

**Total Estimate:** ~7 days (5 days for must-haves, 2 days for nice-to-haves)

---

## Success Metrics

- Timeline feels smooth (60fps) with 30+ clips
- Auto-save successfully prevents data loss in crash scenarios
- Users discover and use keyboard shortcuts (reduce mouse actions)
- Memory usage remains stable over 30+ minutes of editing
- App startup time <5s on typical hardware
- Users report ClipForge feels "polished" and "professional"

---

## Final Polish Checklist

- [ ] All buttons have tooltips
- [ ] All empty states have helpful guidance
- [ ] All error messages are clear and actionable
- [ ] Loading states are shown for async operations
- [ ] Focus states are visible for keyboard navigation
- [ ] App icon is high quality
- [ ] About dialog with version info
- [ ] Check for updates on launch _(optional)_
- [ ] Analytics opt-in for crash reporting _(optional, privacy-conscious)_
- [ ] User documentation / getting started guide _(README or in-app)_

---

## Conclusion

With Phase 5 complete, ClipForge is a fully-featured, polished desktop video editor that covers the core creator workflow: Record → Import → Arrange → Export. The app is fast, reliable, and intuitive, ready for real-world use by creators, educators, and professionals.

**Next Steps:**

- User testing and feedback gathering
- Marketing materials (website, demo videos)
- Distribution (app store submissions, website downloads)
- Roadmap for v2 features (transitions, text overlays, audio mixing, color grading)
