# Project Brief: ClipForge

## Project Overview
ClipForge is a **local-only desktop video editor** built with Electron, focused on the essential creator workflow: **Record → Import → Arrange → Export**. The application provides a streamlined, timeline-centric UI for quick video editing with fast MP4 exports.

## Core Mission
Create a reliable, intuitive video editor that covers the fundamental editing workflow without the complexity of professional tools. Target users are creators, educators, and professionals who need to quickly assemble screen recordings, webcam footage, and existing clips into coherent videos.

## Key Requirements
- **Local-only operation** - No cloud dependencies, all processing happens on the user's machine
- **Electron-based** - Cross-platform desktop application (macOS & Windows)
- **Timeline-centric UI** - Clean, minimal interface following Oracle Online Video Editor design principles
- **Essential workflow** - Import media, arrange on timeline, trim/split clips, export to MP4
- **Recording capabilities** - Screen, webcam, and microphone recording built-in
- **Performance targets** - Responsive with 10+ clips, smooth 30fps preview

## Style Guide
Follow the clean, minimal aesthetic of the referenced "Oracle – Online Video Editor" design:
- Generous spacing (16-24px gaps)
- Clear visual hierarchy
- Neutral palette with restrained blue accents
- Obvious affordances and predictable behavior
- No cleverness at the expense of clarity

## Technology Stack
- **Frontend:** React + TypeScript + Tailwind CSS v4.0
- **Desktop:** Electron with contextIsolation enabled
- **Media Processing:** FFmpeg for video/audio processing
- **State Management:** Zustand
- **Build Tool:** Vite with Electron Builder

## Success Criteria
- User can complete full workflow (record → import → edit → export) in under 5 minutes
- App feels responsive with 20+ clips on timeline
- Exported videos are high-quality MP4s with sensible defaults
- No crashes during normal usage
- Intuitive enough for first-time users

## Project Status
**Current Phase:** Planning Complete
- High-Level PRD completed
- 5 detailed phase-specific PRDs created
- Technology stack defined
- Ready to begin Phase 1: Import & Preview

## Next Steps
1. Set up development environment
2. Initialize Electron + React + Tailwind v4.0 project
3. Begin Phase 1 implementation (Import & Preview)
