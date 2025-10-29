# Phase 2 PRD: Timeline Core

> **Parent Document:** [High-Level PRD](../_planning/High-Level%20PRD.md)  
> **Phase:** 2 of 5  
> **Depends On:** Phase 1 (Import & Preview)  
> **Goal:** Build a functional multi-track timeline with clip arrangement, trimming, splitting, and basic composition

---

## Overview

This phase introduces the heart of ClipForge: a timeline where users can arrange multiple clips, perform basic edits (trim, split, delete), and see how clips relate to each other temporally. By the end of this phase, users should feel like they're working with a real video editor.

**Success Criteria:** A user can drag clips from the media library onto a timeline, rearrange them, trim their in/out points, split clips at the playhead, delete unwanted clips, zoom the timeline view, and benefit from snap-to-edge behavior. The preview player should show the frame at the playhead position.

---

## User Stories

### Timeline Layout & Navigation

- As a user, I see a **timeline panel** below the preview area with at least **2 tracks** (main video + overlay)
- As a user, I see a **visible playhead** (vertical line) that indicates the current time position
- As a user, I see a **timecode ruler** above the tracks showing seconds/minutes
- As a user, I can **zoom in/out** on the timeline using a slider or keyboard shortcuts to see more/less detail
- As a user, I can **scroll horizontally** when zoomed in to navigate long timelines
- As a user, I can **click anywhere** on the timeline to move the playhead to that position

### Adding Clips to Timeline

- As a user, I can **drag a media item** from the library and **drop it onto a track**
- As a user, the clip appears as a **visual block** on the track with a thumbnail preview
- As a user, I can see the **clip name** and **duration** on the timeline block
- As a user, I can drop clips on **Track 1** (main video) or **Track 2** (overlay/PiP)
- As a user, if I drop a clip where another exists, it either **inserts** (pushing others right) or **replaces** based on modifier key

### Arranging & Selecting Clips

- As a user, I can **click to select** a clip on the timeline (visible selection state)
- As a user, I can **drag a selected clip** left/right to reposition it
- As a user, clips **snap to other clip edges** and the playhead when dragging (with visual snap indicators)
- As a user, I can **toggle snap** on/off with a toolbar button
- As a user, I cannot drag clips to overlap on the same track (they push adjacent clips or prevent the move)

### Trimming Clips

- As a user, I can **hover over clip edges** to see resize handles (cursor changes to ⟷)
- As a user, I can **drag the left edge** to adjust the in-point (trim start)
- As a user, I can **drag the right edge** to adjust the out-point (trim end)
- As a user, trimming is **non-destructive** (original media is unchanged; only timeline clip in/out is modified)
- As a user, I see the **trim duration** displayed as I drag
- As a user, I cannot trim beyond the source media's duration

### Splitting Clips

- As a user, I can **position the playhead** over a clip and press **Split** (or use keyboard shortcut)
- As a user, the clip is **cut into two clips** at the playhead, both remaining on the timeline
- As a user, each resulting clip can be moved, trimmed, or deleted independently

### Deleting Clips

- As a user, I can **select a clip** and press **Delete** button (or keyboard shortcut) to remove it
- As a user, clips to the right of the deleted clip **optionally shift left** to close the gap (ripple delete) or stay in place (lift delete)
  - _Recommendation:_ Default to **lift delete** (gap remains) for simplicity; add ripple as stretch goal

### Timeline Playback Coordination

- As a user, the **preview player** shows the frame at the current playhead position
- As a user, when I **click Play**, the playhead moves forward and the preview updates in real-time
- As a user, playback **stops at the end** of the last clip
- As a user, I can **scrub the playhead** and the preview updates to match

---

## Technical Requirements

### Architecture Components

#### Timeline State (extend Zustand store)

```typescript
interface Track {
  id: string;
  kind: 'video' | 'overlay' | 'audio';
  name: string;
  clips: string[]; // Clip IDs in order
  height: number; // Pixels
  locked: boolean; // Future: prevent edits
}

interface Clip {
  id: string;
  mediaId: string; // Reference to MediaFile
  trackId: string;
  start: number; // Timeline position (seconds)
  end: number; // Timeline position (seconds)
  offset: number; // Trim offset into source media (seconds)
  duration: number; // end - start
  transforms: {
    scale: number;
    x: number;
    y: number;
  };
  volume: number;
}

interface Timeline {
  zoom: number; // Pixels per second
  playhead: number; // Current time (seconds)
  snap: boolean; // Snap enabled
  snapThreshold: number; // Pixels
  totalDuration: number; // Computed from rightmost clip
}

interface AppState {
  // ... existing from Phase 1
  tracks: Track[];
  clips: Clip[];
  timeline: Timeline;
  selectedClipId: string | null;

  // Actions
  addClip: (mediaId: string, trackId: string, position: number) => void;
  moveClip: (clipId: string, newStart: number) => void;
  trimClip: (clipId: string, edge: 'start' | 'end', newValue: number) => void;
  splitClip: (clipId: string, position: number) => void;
  deleteClip: (clipId: string) => void;
  selectClip: (clipId: string) => void;
  setPlayhead: (time: number) => void;
  setZoom: (zoom: number) => void;
  toggleSnap: () => void;
}
```

#### Timeline Rendering Engine

**Option A: Canvas-based (Recommended for performance)**

- Use HTML5 Canvas for rendering tracks, clips, ruler
- Benefits: Smooth with many clips, full control over rendering
- Drawbacks: More complex hit-testing, accessibility needs care

**Option B: DOM-based**

- Use CSS Grid or absolute positioning for clips
- Benefits: Easier hit-testing, accessible by default
- Drawbacks: Can stutter with 50+ clips

_Recommendation:_ Start with **DOM-based** for speed of development; switch to Canvas if performance issues arise.

**Components:**

1. `Timeline.tsx` - Container with tracks, ruler, playhead
2. `TimelineRuler.tsx` - Timecode markers (0s, 5s, 10s, etc.)
3. `TimelineTrack.tsx` - Single track row
4. `TimelineClip.tsx` - Individual clip block with thumbnail, drag/trim handles
5. `Playhead.tsx` - Vertical line with draggable head
6. `TimelineControls.tsx` - Zoom slider, snap toggle, split/delete buttons

#### Composition & Preview Integration

**Challenge:** Show the correct frame for the playhead position when multiple clips exist.

**Solution for this phase:**

- On playhead change, determine which clip(s) are "active" at that time
- For single-track: load that clip's video and seek to `offset + (playhead - clip.start)`
- For multi-track (Track 1 + Track 2 overlay): show Track 1 as base; composite Track 2 on top (if using Canvas/WebGL)
  - _Simplified approach:_ Show only Track 1 clip in preview for this phase; defer multi-track composition to Phase 3 (Export) where FFmpeg handles it

```typescript
function getClipAtPlayhead(playhead: number, trackId: string): Clip | null {
  return clips.find(
    (c) => c.trackId === trackId && c.start <= playhead && c.end > playhead
  );
}

function updatePreview(playhead: number) {
  const clip = getClipAtPlayhead(playhead, 'track-1');
  if (!clip) {
    // Show blank or last frame
    return;
  }
  const media = getMediaById(clip.mediaId);
  const seekTime = clip.offset + (playhead - clip.start);
  videoElement.src = media.path;
  videoElement.currentTime = seekTime;
}
```

### Drag & Drop Interaction

**From Media Library to Timeline:**

1. `MediaItem` has `draggable={true}` with `onDragStart` setting `dataTransfer.setData('mediaId', id)`
2. `TimelineTrack` has `onDrop` event that:
   - Gets `mediaId` from dataTransfer
   - Calculates drop position from mouse X coordinate and zoom level
   - Calls `addClip(mediaId, trackId, position)`
   - Snaps position to nearest edge if snap is enabled

**Clip Repositioning:**

1. `TimelineClip` has `onMouseDown` (not draggable attribute, for finer control)
2. Attach `mousemove` listener to calculate delta
3. Update clip.start based on delta and zoom
4. Snap to other clip edges and playhead
5. Prevent overlaps (check collision before applying move)
6. On `mouseup`, finalize position

**Trim Handles:**

1. `TimelineClip` has left/right edge divs (10px wide) with distinct cursor
2. On `mousedown` on handle, enter "trim mode"
3. `mousemove` updates clip.start (left handle) or clip.end (right handle)
4. Constrain: `clip.start >= track.startTime`, `clip.end <= clip.start + sourceMediaDuration - clip.offset`

### Snapping Logic

```typescript
function snapPosition(
  position: number,
  clipId: string, // ID of clip being moved (to ignore self)
  snapThreshold: number = 10 // pixels
): number {
  if (!timeline.snap) return position;

  const pixelsPerSecond = timeline.zoom;
  const thresholdSeconds = snapThreshold / pixelsPerSecond;

  // Snap targets: playhead, other clip edges
  const targets = [timeline.playhead];
  clips.forEach((c) => {
    if (c.id !== clipId) {
      targets.push(c.start, c.end);
    }
  });

  for (const target of targets) {
    if (Math.abs(position - target) < thresholdSeconds) {
      return target; // Snap to target
    }
  }

  return position; // No snap
}
```

### Timeline Zoom & Pan

- **Zoom:** Multiply `timeline.zoom` (pixels per second) on slider change
  - Range: 10px/s (zoomed out, see whole timeline) to 100px/s (zoomed in, see frames)
  - On zoom, keep playhead centered if possible
- **Pan:** Horizontal scrollbar on timeline container
  - Container width = `timeline.totalDuration * timeline.zoom`

### Keyboard Shortcuts (stretch goal)

- `Space`: Play/Pause
- `S`: Split clip at playhead
- `Delete`/`Backspace`: Delete selected clip
- `+`/`-`: Zoom in/out
- `Arrow Left/Right`: Move playhead by 1 frame
- `Cmd/Ctrl + Z`: Undo _(requires undo system - defer or basic implementation)_

---

## Data Flow

### Adding Clip to Timeline

1. User drags media item → drops on Track 1 at 5.0s
2. `TimelineTrack.onDrop`:
   - Calculate position: `(mouseX - trackOffsetX) / zoom + scrollLeft = 5.0`
   - Apply snap: `snapPosition(5.0)` → maybe 5.0 or 4.98 (snapped to other clip)
3. `addClip(mediaId, 'track-1', 5.0)`:
   - Create new Clip object: `{ id: uuid(), mediaId, trackId: 'track-1', start: 5.0, end: 5.0 + mediaDuration, offset: 0, ... }`
   - Add to state: `clips.push(newClip)`, `tracks[0].clips.push(newClip.id)`
4. UI re-renders → `TimelineClip` component appears

### Splitting Clip

1. User positions playhead at 10.0s over clipA (start: 5.0, end: 15.0)
2. User clicks "Split" button
3. `splitClip('clipA', 10.0)`:
   - Calculate clipA_offset and duration: clipA runs 5.0-10.0, offset stays same
   - Create clipB: start 10.0, end 15.0, offset = clipA.offset + 5.0
   - Update clipA: end = 10.0
   - Insert clipB into track.clips after clipA
4. UI re-renders → two clips visible

### Trimming Clip

1. User hovers over right edge of clipA → cursor changes
2. User drags left by 2 seconds
3. `onMouseMove`:
   - Calculate new end: `clipA.end - 2.0 = 13.0`
   - Validate: `13.0 > clipA.start` ✓, `13.0 <= clipA.start + sourceMediaDuration - clipA.offset` ✓
   - Update state: `trimClip('clipA', 'end', 13.0)`
4. UI re-renders → clipA shorter

### Playhead & Preview Update

1. User drags playhead to 12.0s
2. `setPlayhead(12.0)` → state.timeline.playhead = 12.0
3. Effect hook in `PreviewPlayer` watches playhead:
   ```typescript
   useEffect(() => {
     updatePreview(timeline.playhead);
   }, [timeline.playhead]);
   ```
4. `updatePreview` finds active clip, seeks video element

---

## UI/UX Details

### Layout (updated)

```
┌──────────────────────────────────────────────────────────┐
│ ClipForge                                        [_][□][X] │
├──────────┬────────────────────────────┬──────────────────┤
│          │                            │                  │
│  MEDIA   │        PREVIEW             │   (Inspector)    │
│ LIBRARY  │                            │   placeholder    │
│          │     [Video Player]         │                  │
│ ┌──────┐ │                            │                  │
│ │ [TB] │ │    [▶] ━━●━━━ 🔊 2x       │                  │
│ └──────┘ │    00:12.5 / 01:45         │                  │
├──────────┴────────────────────────────┴──────────────────┤
│ TIMELINE                      [Snap ✓] [─⚊─] [Split] [Del]│
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 0s    5s    10s   15s   20s   25s   30s   35s   40s │ │ ← Ruler
│ ├──────────────────────────────────────────────────────┤ │
│ │ Track 1 ▌ [Clip A  ] [Clip B    ] [Clip C]          │ │ ← Video track
│ ├──────────────────────────────────────────────────────┤ │
│ │ Track 2 ▌           [Overlay 1 ]                     │ │ ← Overlay track
│ └──────────────────────────────────────────────────────┘ │
│         ▲ Playhead (draggable)                           │
└──────────────────────────────────────────────────────────┘
```

### Visual Design (Tailwind CSS v4.0)

**Timeline Ruler:**

- Major ticks every 5 seconds (labeled): 0s, 5s, 10s...
- Minor ticks every 1 second (unlabeled)
- Background: `bg-gray-100` (light gray)

**Tracks:**

- Height: `h-20` (80px each)
- Background: alternating `bg-gray-50` and `bg-gray-100`
- Separator lines between tracks: `border-b border-gray-300`

**Clips:**

- Background: gradient with thumbnail preview repeated/cropped
- Border: `border-2 border-gray-600` (selected: `border-3 border-blue-600`)
- Border-radius: `rounded`
- Text overlay: clip name (top-left), duration (bottom-right)
- Trim handles: `w-2` (8px wide) vertical bars on edges (hover: `bg-blue-500`)

**Playhead:**

- Vertical line: `w-0.5 bg-red-500` (2px solid red)
- Top handle: draggable circle/triangle `w-4 h-4` (16px)
- Extends full height of timeline

**Snap Indicators:**

- When snapping, show dashed guide line `border-dashed border-blue-600` at snap target
- Flash briefly on snap with `animate-pulse`

**Interaction States:**

- Hover over clip: `shadow-md border-blue-400`
- Dragging clip: `opacity-70 cursor-grabbing`
- Trimming: `cursor-col-resize` or `cursor-ew-resize`
- Disabled drag (overlap prevented): `cursor-not-allowed`

**Custom Tailwind v4.0 Configuration:**

```css
@theme {
  --color-timeline-bg: #f8f9fa;
  --color-track-alt: #f1f3f4;
  --color-clip-selected: #2563eb;
  --color-playhead: #ef4444;
  --spacing-timeline-track: 5rem; /* 80px */
  --spacing-clip-padding: 0.5rem;
}
```

### Accessibility

- Timeline clips have `role="button"` and `aria-label="Clip A, 5 seconds, from 10s to 15s"`
- Playhead is keyboard-focusable and arrow keys move it
- Toolbar buttons have clear labels and keyboard access

---

## Acceptance Criteria

### Must Have

- [ ] User can drag a media item from library onto Track 1, and it appears as a clip
- [ ] User can drag a clip left/right to reposition it
- [ ] User can trim a clip by dragging its left or right edge
- [ ] User can split a clip at the playhead position (button click)
- [ ] User can delete a selected clip (button or keyboard)
- [ ] Timeline has 2 tracks (main + overlay)
- [ ] Playhead is visible and draggable
- [ ] Clicking on timeline moves playhead to that position
- [ ] Preview player shows the frame at the playhead (for Track 1 clips)
- [ ] Timeline ruler displays timecodes
- [ ] Zoom slider changes timeline scale (see more/less time)
- [ ] Clips snap to each other and playhead when snap is enabled
- [ ] Snap toggle button works
- [ ] Clips cannot overlap on the same track

### Nice to Have

- [ ] Horizontal scrolling works smoothly when zoomed in
- [ ] Keyboard shortcuts (Space, S, Delete, +/-, arrows)
- [ ] Ripple delete (closing gaps)
- [ ] Multi-select clips (Shift+click)
- [ ] Undo/Redo for timeline operations
- [ ] Clip thumbnails update as you trim
- [ ] Waveform visualization on clips with audio

---

## Testing Plan

### Manual Testing

1. **Adding Clips:**
   - Drag media to Track 1 → verify appears at correct position
   - Drag media to Track 2 → verify appears on overlay track
   - Drop clip on top of existing clip → verify behavior (insert or prevent)

2. **Arranging:**
   - Click clip → verify selection state
   - Drag clip right → verify moves, snaps to other clip edge
   - Try to drag clip to overlap → verify prevented or ripple-shifts

3. **Trimming:**
   - Hover over clip edge → verify cursor change
   - Drag left edge → verify in-point changes, preview updates
   - Drag right edge → verify out-point changes
   - Try to trim beyond source duration → verify prevented

4. **Splitting:**
   - Position playhead mid-clip → click Split → verify two clips
   - Split at clip edge → verify no-op or error message
   - Split without playhead on clip → verify error or disabled button

5. **Deleting:**
   - Select clip → press Delete → verify removed
   - Delete with gap → verify gap remains (lift delete)

6. **Playhead & Preview:**
   - Drag playhead → verify preview updates to correct frame
   - Playhead over clip boundary → verify switches clips
   - Click Play → verify playhead moves, preview plays
   - Playhead over gap → verify blank or last frame

7. **Zoom & Pan:**
   - Zoom in → verify timeline expands, ruler updates
   - Zoom out → verify fits more timeline
   - Scroll horizontally when zoomed in → verify smooth

8. **Snap:**
   - Enable snap → drag clip near playhead → verify snaps
   - Disable snap → drag clip → verify no snap
   - Snap indicator appears briefly

### Edge Cases

- Empty timeline (no clips)
- Single clip on timeline
- 20+ clips on timeline (performance)
- Very short clip (<0.5s)
- Clip trimmed to 0.1s (minimum duration)
- Zoomed all the way in/out
- Timeline duration > 1 hour

---

## Performance Targets

- **Timeline rendering:** 60fps during zoom/pan with 20 clips
- **Clip dragging:** No lag, smooth cursor tracking
- **Playhead scrubbing:** <50ms latency for preview update
- **Memory:** <50MB additional (beyond Phase 1) for timeline state
- **Zoom operations:** <100ms to re-render

---

## Implementation Steps

1. **Timeline State Setup & Tailwind v4.0 Config** (0.5 day)
   - Extend Zustand store with tracks, clips, timeline
   - Implement actions: addClip, moveClip, trimClip, splitClip, deleteClip, selectClip, setPlayhead, setZoom
   - Configure Tailwind v4.0 with CSS-first configuration using `@theme` directive
   - Set up timeline-specific custom properties and utilities

2. **Timeline Layout & Ruler** (1 day)
   - Build Timeline container with CSS Grid or Flexbox
   - Create TimelineRuler with dynamic tick marks based on zoom
   - Create TimelineTrack components (2 tracks)
   - Add horizontal scroll container

3. **Clip Rendering** (1 day)
   - Build TimelineClip component with thumbnail background
   - Position clips based on start/end and zoom
   - Implement selection state visual
   - Add clip name and duration text overlays

4. **Playhead** (0.5 day)
   - Create Playhead component (vertical line + handle)
   - Make draggable (update timeline.playhead on drag)
   - Add click-to-position on timeline background

5. **Drag & Drop from Library** (0.5 day)
   - Add drop handlers to TimelineTrack
   - Calculate drop position from mouse coordinates
   - Call addClip action

6. **Clip Dragging** (1 day)
   - Implement onMouseDown/Move/Up for clip repositioning
   - Add collision detection (prevent overlaps)
   - Implement snapping logic
   - Show snap indicators

7. **Trim Handles** (1 day)
   - Add edge detection on clip hover
   - Implement trim drag handlers
   - Constrain trim to valid ranges
   - Update preview on trim

8. **Split & Delete** (0.5 day)
   - Add Split button in toolbar
   - Implement splitClip logic (create two clips from one)
   - Add Delete button and keyboard handler
   - Implement deleteClip logic

9. **Preview Integration** (0.5 day)
   - Hook up playhead changes to preview updates
   - Implement getClipAtPlayhead function
   - Calculate seek time within source media
   - Handle gaps (no clip at playhead)

10. **Zoom & Toolbar** (0.5 day)
    - Create TimelineControls component
    - Add zoom slider (updates timeline.zoom)
    - Add snap toggle
    - Wire up buttons

11. **Polish & Testing** (1 day)
    - Refine interaction states (hover, dragging, trimming)
    - Add loading states
    - Test all acceptance criteria
    - Fix bugs

**Total Estimate:** ~8 days

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

## Open Questions

- [ ] Should we support "magnetic timeline" where clips auto-attach to each other?
  - _Recommendation:_ Yes, as default behavior (no gaps unless intentional)
- [ ] How do we handle very short clips (<1s) visually?
  - _Recommendation:_ Minimum width of 40px regardless of zoom; show ellipsis for name
- [ ] Should trimming update the preview in real-time or only on release?
  - _Recommendation:_ Real-time for better feedback, but may require debouncing
- [ ] Do we allow negative timeline positions?
  - _Recommendation:_ No, timeline starts at 0s

---

## Success Metrics

- User can arrange 5 clips on timeline in <2 minutes on first try
- Trimming a clip feels responsive (<100ms feedback)
- No crashes with 30 clips on timeline
- Playhead scrubbing feels smooth (no stuttering)

---

## Next Phase Preview

**Phase 3: Export Early** will build upon this timeline by:

- Implementing FFmpeg-based export that stitches together all timeline clips
- Handling trims, splits, and gaps in the export process
- Adding resolution options and progress UI
- Validating the timeline composition produces correct output
