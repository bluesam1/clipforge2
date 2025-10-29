# ClipForge — High‑Level PRD (Electron)

> **Style guide:** Follow the clean, minimal look/feel of the referenced “Oracle – Online Video Editor” shot on Dribbble: generous spacing, clear visual hierarchy, neutral palette with restrained accents, obvious affordances, and predictable behavior. Controls should do exactly what users expect—no cleverness at the expense of clarity.

---

## 1) Product Overview

ClipForge is a **local‑only desktop video editor** focused on the essential creator loop: **Record → Import → Arrange → Export**. It runs as an **Electron** app with a streamlined, timeline‑centric UI and fast MP4 exports.

### Primary Goals

* Ship a reliable, intuitive editor covering import, simple edits, preview, and export.
* Keep interaction weight low (minimal clicks/menus), matching the style guide’s simplicity.
* Be responsive with ~10+ clips and smooth 30fps preview on typical hardware.

### Non‑Goals (v1)

* No cloud logins/sync/sharing.
* No advanced color grading, multicam, or complex VFX.

---

## 2) Users & Key Jobs

**Creators / Educators / Professionals** who quickly assemble screen recordings, webcam footage, and existing clips into a coherent video with light edits, then export to MP4.

---

## 3) User Stories (High Level)

### Import & Media Library

* As a user, I can drag‑and‑drop MP4/MOV/WebM files or use a file picker to import media.
* As a user, I can see a media panel with thumbnail, duration, resolution, and file size.

### Recording

* As a user, I can record my **screen** (display or window), **webcam**, **mic audio**, and optionally **screen+webcam PiP** directly into the project.
* As a user, recorded clips appear automatically in the media library and can be dropped onto the timeline.

### Timeline Editing

* As a user, I can place clips on a timeline with a visible **playhead**, rearrange by drag‑and‑drop, and **trim** by adjusting in/out handles.
* As a user, I can **split** a clip at the playhead, **delete** clips, **zoom** the timeline, and benefit from **snap‑to** edges.
* As a user, I can use at least **two tracks** (main + overlay/PiP).

### Preview & Playback

* As a user, I can play/pause, scrub anywhere, and see synced audio/video that reflects the current playhead composition.

### Export

* As a user, I can export to **MP4** with **resolution options** (720p, 1080p, or source), see a **progress** indicator, and save locally.
* **Sensible defaults (first‑class):** H.264 (libx264) video + AAC audio in MP4 container; **match source fps** by default; **CBR/VBR auto** target for balanced size/quality; keyframe interval ≈2s; stereo 48 kHz; BT.709 color; filename templating: `<project>-<YYYYMMDD>-<HHmm>.mp4>`.

### Project & Safety

* As a user, I want **auto‑save** of project state and **undo/redo** so I feel safe trying things. *(Stretch but recommended)*

### Keyboard Shortcuts *(Stretch but recommended)*

* Familiar shortcuts for cut/split, delete, play/pause, zoom in/out, and undo/redo.

---

## 4) Scope by Release

### MVP (Desktop, local‑only)

* App launches (Electron), imports MP4/MOV, shows simple timeline & preview, **single‑clip trim**, and **export single clip to MP4 with sensible defaults**. Packaged app for macOS/Windows.

### Full v1

* Recording (screen, webcam, mic, screen+webcam PiP).
* Multi‑clip timeline: arrange, trim, split, delete, **2 tracks**, zoom, snapping.
* Real‑time preview of composed timeline, playback controls, scrubbing.
* Export with resolution options and progress UI, with **sensible defaults** applied by default.
* Quality/perf targets met (see §10).

### Stretch

* Text overlays, transitions, audio fades, filters, export presets, keyboard shortcuts, auto‑save, undo/redo.

---

## 5) UX & Visual Design Notes (High Level)

* **Layout:** Left media panel, center preview, bottom timeline, right contextual inspector (lightweight).
* **Look:** Minimal chrome, large hit‑targets on timeline handles, subtle shadows, clear separators; no dense toolbars.
* **Feedback:** Always show selection state, playhead time, and export progress; inline errors in plain language.
* **Accessibility:** Keyboard operable for core actions; sufficient contrast; visible focus states.

---

## 6) Architecture (Electron, Local‑Only)

### High‑Level Components

* **Electron Main Process**

  * App lifecycle, window creation, secure IPC.
  * Spawns **FFmpeg worker process**(es) for export/transcode.
* **Preload (contextIsolation: true)**

  * Exposes a typed, minimal **IPC bridge** for: file I/O, capture sources, ffmpeg jobs, settings.
* **Renderer (React)**

  * **UI Shell** (media, preview, timeline, inspector)
  * **State** (Redux/Zustand/Jotai): project graph, clips, edits, selection, undo/redo.
  * **Timeline Engine** (Canvas/WebGL or performant DOM): layout, snapping, hit‑testing.
  * **Preview Player**: HTML5 `<video>` with composition controller (see §8 long‑poles).
* **Native/Node Services**

  * **Media Processing:** FFmpeg via spawned binary or `fluent-ffmpeg` (Node child_process).
  * **Recording:** Electron `desktopCapturer` + `getUserMedia` for screen; `getUserMedia` for webcam/mic.
* **Filesystem**

  * Local project folder: `/project.clipforge/` with `project.json`, `media/` (originals), `renders/`, optional `proxies/`.

### Packaging & Platform

* `electron-builder` targets macOS & Windows installers.
* No cloud SDKs/services. All processing/storage is local.

---

## 7) Data Model (High Level)

```json
{
  "Project": {
    "id": "string",
    "name": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "settings": {},
    "media": [
      { "id": "m1", "path": "…", "type": "video|audio", "duration": 0,
        "width": 0, "height": 0, "fps": 30, "size": 0, "hash": "…" }
    ],
    "tracks": [
      { "id": "t1", "kind": "video|overlay|audio", "clips": ["c1", "c2"] }
    ],
    "clips": [
      { "id": "c1", "mediaId": "m1", "trackId": "t1",
        "start": 0, "end": 10.5, "offset": 0,
        "transforms": { "scale": 1, "x": 0, "y": 0 },
        "volume": 1.0 }
    ],
    "timeline": { "zoom": 1.0, "playhead": 0, "grid": {"snap": true} },
    "history": { "undo": [], "redo": [] }
  }
}
```

---

## 8) Long‑Pole Items & Streamlined Solutions

1. **Timeline Composition Preview (multi‑clip, trims, splits)**

* **Challenge:** Seamless A/V across cuts while scrubbing/playing.
* **Fast Approach:** For preview, avoid live FFmpeg mixing. Use **segmented playback**: maintain a **play plan** of clip segments; swap the `<video>` source at cut boundaries with precomputed in/out times; cross‑fade audio only if trivial.
* **Upgrade:** Background‑generate **lightweight proxies** (same fps, lower bitrate) to ensure instant seeking; keep originals for export.

2. **Export Stitching & Cuts**

* **Challenge:** Reliable rendering of timeline with trims/splits.
* **Approach:** Use FFmpeg **concat demuxer** with per‑segment **trim** filters, then single encode to MP4 (H.264/AAC). Validate early with single‑clip export (MVP) and scale up.

3. **Cross‑Platform Recording**

* **Challenge:** Permissions and device selection differences.
* **Approach:** Use `desktopCapturer` for source picking, then feed to `getUserMedia`; standard `getUserMedia` for webcam/mic. Provide a **simple picker** (Display 1, Window, Camera list) and fallback to `getDisplayMedia` if needed.

4. **Performance & Memory**

* **Challenge:** UI stutter with many clips; preview hiccups.
* **Approach:** Canvas‑based timeline; **virtualize** clip rendering; throttle drag events; **worker threads** for heavy calc (thumbnailing, waveform); **debounced** auto‑save; keep export in **separate process**.

5. **Undo/Redo & Auto‑save**

* **Challenge:** Consistent, low‑risk editing.
* **Approach:** Centralized state with **command pattern** or immutable diffs; persist small **checkpoints** and last good state on crash. *(Stretch but recommended.)*

---

## 9) Acceptance Criteria (High Level)

* **MVP:** import → preview → trim (single clip) → export MP4 → packaged app.
* **v1 scenarios:**

  * Record 30s screen, add to timeline.
  * Import 3 clips, arrange, trim, split.
  * Export a ~2‑minute multi‑clip video.
  * Use webcam overlay on screen recording.
  * Smoke check on macOS and Windows.

---

## 10) Quality Targets (Non‑Functional)

* **Timeline responsiveness** with 10+ clips.
* **Preview playback:** smooth at **≥30 fps** under normal loads.
* **Export** completes without crashes.
* **App launch** under ~5 seconds.
* **No memory leaks** over 15+ minutes of editing.
* **Reasonable exported file size** vs. quality.

---

## 11) Implementation Plan (High Level)

1. **Import & Preview First** — load/display files; single‑clip player.
2. **Timeline Core** — drag/drop on timeline, trim handles, delete, split, zoom, snap; two tracks.
3. **Export Early** — single‑clip export, then multi‑clip concat; wire progress UI.
4. **Recording** — screen/webcam/mic capture; drop results into media.
5. **Polish & Perf** — thumbnails, basic proxying, autosave, shortcuts (stretch).

---

## 12) Risks & Mitigations

* **OS Permissions (camera/mic/screen):** clear onboarding prompts; settings panel to re‑grant.
* **Codec oddities:** normalize to H.264/AAC internally; transcode edge cases on import/export.
* **Large files:** optional proxies; avoid loading full media into memory; stream reads.
* **User confusion:** keep labels literal; add inline tooltips; keep menus shallow.