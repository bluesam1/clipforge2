# Technical Context: ClipForge

## Technology Stack

### Core Technologies

- **Electron** - Cross-platform desktop app framework
- **React 18** - UI library with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS v4.0** - Utility-first CSS framework with CSS-first configuration
- **Vite** - Fast build tool and development server
- **Zustand** - Lightweight state management

### Media Processing

- **@ffmpeg-installer/ffmpeg** - Video/audio processing and encoding (✅ Implemented)
- **@ffprobe-installer/ffprobe** - Media metadata extraction (✅ Implemented)
- **MediaRecorder API** - Browser-based recording (📋 Phase 4)
- **Web Audio API** - Audio processing and waveform generation (📋 Phase 5)

### Development Tools

- **ESLint** - Code linting and style enforcement
- **Prettier** - Code formatting
- **Electron Builder** - App packaging and distribution
- **Git** - Version control

## Phase 1 Implementation Status

### ✅ Completed Features

#### Media Import System
- **Drag & Drop**: Full-window overlay with file validation
- **File Picker**: Native dialog integration via IPC
- **Format Support**: MP4, MOV, WebM with graceful error handling
- **Metadata Extraction**: FFprobe integration with structured JSON output
- **Thumbnail Generation**: FFmpeg with 1-second timestamp, 320px width

#### Preview Player
- **Video Element**: HTML5 video with custom controls
- **Playback Controls**: Play/pause, seek, volume, mute
- **State Management**: Zustand store with video switching
- **Local File Access**: Custom `clipforge://` protocol for security

#### UI Components
- **Media Library**: Grid layout with thumbnails and metadata
- **Preview Player**: Full-screen video with custom controls
- **Error Handling**: Toast notifications for user feedback
- **Responsive Design**: Tailwind CSS v4.0 with clean styling

### 🔧 Technical Implementation Details

#### Custom Protocol Setup
```typescript
// Main process
protocol.registerFileProtocol('clipforge', (request, callback) => {
  const filePath = request.url.replace('clipforge://', '');
  callback({ path: filePath });
});

// CSP Headers
'Content-Security-Policy': [
  "default-src 'self' 'unsafe-inline' data: blob: clipforge:;",
  "img-src 'self' data: blob: clipforge:;",
  "media-src 'self' data: blob: clipforge:;"
]
```

#### FFmpeg Integration
```typescript
// Metadata extraction with FFprobe
const command = `"${ffprobe.path}" -v quiet -print_format json -show_format -show_streams "${filePath}"`;

// Thumbnail generation with FFmpeg
const command = `"${ffmpeg.path}" -i "${filePath}" -ss ${timestamp} -vframes 1 -vf "scale=320:-1" -f image2 -y "${outputPath}"`;
```

#### State Management Pattern
```typescript
// Video switching with state reset
useEffect(() => {
  setIsPlaying(false);
  setCurrentTime(0);
  setDuration(0);
  setVolume(1);
  setIsMuted(false);
}, [media.id]);
```

## Development Environment

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ or **yarn** 1.22+
- **Git** 2.30+
- **FFmpeg** (bundled with app, but needed for development)

### Project Structure

```
clipforge2/
├── src/
│   ├── main/           # Electron main process
│   │   └── index.ts
│   ├── preload/        # Preload script (IPC bridge)
│   │   ├── index.ts
│   │   └── index.d.ts
│   └── renderer/       # React renderer process
│       ├── index.html
│       └── src/
│           ├── App.tsx
│           ├── components/
│           ├── hooks/
│           ├── stores/
│           └── utils/
├── build/              # Build assets and configs
├── resources/          # App icons and resources
├── _planning/          # Project documentation
├── _tasks/             # Phase-specific PRDs
├── memory-bank/        # Project memory and context
└── package.json
```

### Build Configuration

#### Electron Configuration

```typescript
// electron.vite.config.ts
export default defineConfig({
  main: {
    build: {
      lib: {
        entry: 'src/main/index.ts',
      },
    },
  },
  preload: {
    build: {
      lib: {
        entry: 'src/preload/index.ts',
      },
    },
  },
  renderer: {
    build: {
      lib: {
        entry: 'src/renderer/src/main.tsx',
      },
    },
  },
});
```

#### Tailwind CSS v4.0 Configuration

```css
/* src/renderer/src/index.css */
@import 'tailwindcss';

@theme {
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-secondary: #6b7280;
  --color-timeline-bg: #f8f9fa;
  --color-preview-bg: #1a1a1a;
  --spacing-timeline-track: 5rem;
  --spacing-clip-padding: 0.5rem;
}
```

## Dependencies

### Production Dependencies

```json
{
  "electron": "^28.0.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "zustand": "^4.4.0",
  "uuid": "^9.0.0",
  "electron-store": "^8.1.0",
  "@tailwindcss/vite": "^4.0.0",
  "tailwindcss": "^4.0.0"
}
```

### Development Dependencies

```json
{
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0",
  "@types/node": "^20.0.0",
  "@types/uuid": "^9.0.0",
  "@vitejs/plugin-react": "^4.0.0",
  "electron-builder": "^24.0.0",
  "eslint": "^8.0.0",
  "prettier": "^3.0.0",
  "typescript": "^5.0.0",
  "vite": "^5.0.0"
}
```

## Platform Support

### Target Platforms

- **macOS** 10.15+ (Catalina and later)
- **Windows** 10+ (64-bit)
- **Linux** (Ubuntu 20.04+, future consideration)

### Platform-Specific Considerations

#### macOS

- **Code signing** required for distribution
- **Notarization** required for Gatekeeper
- **Sandboxing** considerations for App Store
- **Universal binary** support (Intel + Apple Silicon)

#### Windows

- **Code signing** recommended for distribution
- **Windows Defender** compatibility
- **MSI installer** for enterprise deployment
- **Auto-updater** integration

## Performance Requirements

### Memory Usage

- **Base app:** < 200MB
- **With 10 clips:** < 500MB
- **During export:** < 1GB (temporary)

### CPU Usage

- **Idle:** < 5% CPU
- **Preview playback:** < 30% CPU
- **Export:** < 80% CPU (user can continue working)

### Storage Requirements

- **App size:** < 200MB
- **Project files:** Variable (depends on media)
- **Temp files:** Cleaned up automatically

### Network Requirements

- **Offline operation:** Full functionality without internet
- **Updates:** Optional, check on launch
- **No cloud dependencies:** All processing local

## Security Considerations

### Electron Security

- **Context Isolation:** Enabled
- **Node Integration:** Disabled in renderer
- **Sandbox:** Enabled for renderer
- **CSP:** Content Security Policy enabled

### File System Security

- **Path validation:** Sanitize all file paths
- **Permission checks:** Verify file access before operations
- **Sandboxed access:** Use Electron APIs for file operations

### Data Privacy

- **Local storage only:** No data sent to external servers
- **No telemetry:** No usage data collection (optional opt-in)
- **Encrypted storage:** Sensitive data encrypted at rest

## Development Workflow

### Getting Started

```bash
# Clone repository
git clone <repository-url>
cd clipforge2

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Package for distribution
npm run dist
```

### Development Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "electron:dev": "electron .",
    "electron:build": "electron-builder",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write src"
  }
}
```

### Code Quality

- **TypeScript strict mode:** Enabled
- **ESLint rules:** Enforced via CI/CD
- **Prettier formatting:** Automatic on save
- **Husky hooks:** Pre-commit linting and formatting

## Testing Strategy

### Unit Testing

- **Jest** for unit tests
- **React Testing Library** for component tests
- **Coverage target:** 80%+

### Integration Testing

- **Playwright** for E2E tests
- **Test scenarios:** Complete user workflows
- **Cross-platform testing:** macOS and Windows

### Performance Testing

- **Lighthouse** for performance metrics
- **Memory profiling:** Chrome DevTools
- **Load testing:** Large files and many clips

## Deployment and Distribution

### Build Process

1. **Type checking:** TypeScript compilation
2. **Linting:** ESLint validation
3. **Testing:** Unit and integration tests
4. **Building:** Vite build process
5. **Packaging:** Electron Builder
6. **Signing:** Code signing (macOS/Windows)
7. **Notarization:** macOS notarization

### Distribution Channels

- **GitHub Releases:** Direct download
- **Website:** Official download page
- **Future:** App stores (Mac App Store, Microsoft Store)

### Update Mechanism

- **Auto-updater:** Electron auto-updater
- **Manual updates:** Download from website
- **Version checking:** On app launch
- **Rollback:** Previous version restoration

## Monitoring and Debugging

### Error Tracking

- **Crash reporting:** Electron crash reporter
- **Error logging:** Local log files
- **User feedback:** In-app feedback system

### Performance Monitoring

- **Memory usage:** Track memory consumption
- **CPU usage:** Monitor performance impact
- **Export times:** Track processing performance

### Debug Tools

- **Chrome DevTools:** Renderer process debugging
- **Node.js debugging:** Main process debugging
- **FFmpeg logging:** Media processing logs

## Future Technical Considerations

### Scalability

- **Plugin system:** Extensible architecture
- **Multi-threading:** Worker threads for heavy operations
- **GPU acceleration:** Hardware-accelerated encoding

### Modern Web Standards

- **WebAssembly:** FFmpeg.wasm for better performance
- **Web Workers:** Background processing
- **Service Workers:** Offline capabilities

### Cloud Integration (Optional)

- **Sync service:** Optional cloud backup
- **Collaboration:** Multi-user editing
- **AI features:** Automated editing assistance
