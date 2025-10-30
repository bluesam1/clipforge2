import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  RecordingSettings, 
  RecordingState, 
  DesktopCapturerSource, 
  MediaDevice, 
  RecordingSession,
  RecordingHistory,
  RecordingError 
} from '../types/recording';
import { RecordingService } from '../services/RecordingService';

interface RecordingStore {
  // Recording state
  recordingState: RecordingState;
  isRecording: boolean;
  isPaused: boolean;
  
  // Settings
  settings: RecordingSettings;
  
  // Available devices and sources
  availableSources: DesktopCapturerSource[];
  availableCameras: MediaDevice[];
  availableMicrophones: MediaDevice[];
  
  // Recording session
  currentSession: RecordingSession | null;
  recordingHistory: RecordingHistory;
  
  // Staged recordings (before conversion and import)
  stagedRecordings: Array<{
    id: string;
    webmPath: string;
    duration: number;
    fileSize: number;
    timestamp: number;
    status: 'staged' | 'processing' | 'completed' | 'failed';
    error?: string;
  }>;
  
  // Service instance
  recordingService: RecordingService | null;
  
  // UI state
  isRecordingPanelOpen: boolean;
  isPreviewActive: boolean;
  selectedSource: DesktopCapturerSource | null;
  selectedCamera: MediaDevice | null;
  selectedMicrophone: MediaDevice | null;
  
  // Error handling
  error: RecordingError | null;
  
  // Actions
  setRecordingState: (state: Partial<RecordingState>) => void;
  setSettings: (settings: Partial<RecordingSettings>) => void;
  setAvailableSources: (sources: DesktopCapturerSource[]) => void;
  setAvailableCameras: (cameras: MediaDevice[]) => void;
  setAvailableMicrophones: (microphones: MediaDevice[]) => void;
  setSelectedSource: (source: DesktopCapturerSource | null) => void;
  setSelectedCamera: (camera: MediaDevice | null) => void;
  setSelectedMicrophone: (microphone: MediaDevice | null) => void;
  setRecordingPanelOpen: (open: boolean) => void;
  setPreviewActive: (active: boolean) => void;
  setError: (error: RecordingError | null) => void;
  
  // Recording actions
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
  
  // Session management
  createSession: (settings: RecordingSettings) => void;
  endSession: (outputPath?: string, duration?: number, fileSize?: number) => void;
  addToHistory: (session: RecordingSession) => void;
  clearHistory: () => void;
  
  // Device management
  loadDevices: () => Promise<void>;
  loadSources: () => Promise<void>;
  saveDevicePreferences: () => void;
  loadDevicePreferences: () => void;
  
  // Output folder management
  initializeOutputFolder: () => Promise<void>;
  setOutputFolder: (folder: string) => void;
  
  // Staged recordings management
  addStagedRecording: (recording: { webmPath: string; duration: number; fileSize: number }) => void;
  clearStagedRecordings: () => void;
  processStagedRecordings: () => Promise<void>;
}

const defaultSettings: RecordingSettings = {
  enableScreen: true,
  enableWebcam: false,
  enableAudio: true,
  resolution: '1080p',
  quality: 'medium',
  bitrate: 2500000,
  framerate: 30,
  pipPosition: 'bottom-right',
  pipSize: 'medium',
  outputFolder: '', // Will be set to default project path
  outputFormat: 'mp4'
};

const defaultRecordingState: RecordingState = {
  status: 'idle',
  startTime: 0,
  elapsedTime: 0
};

const defaultHistory: RecordingHistory = {
  sessions: [],
  recentDevices: {}
};

// Initialize default output folder
const initializeDefaultOutputFolder = async (): Promise<string> => {
  try {
    if (window.clipforge?.recording?.getProjectPath) {
      const projectPath = await window.clipforge.recording.getProjectPath();
      return `${projectPath}/media/recordings`;
    }
  } catch (error) {
    console.error('Failed to get project path:', error);
  }
  return 'recordings'; // Fallback
};

export const useRecordingStore = create<RecordingStore>()(
  persist(
    (set, get) => ({
      // Initial state
      recordingState: defaultRecordingState,
      isRecording: false,
      isPaused: false,
      settings: {
        ...defaultSettings,
        outputFolder: '', // Will be initialized on first use
        outputFormat: 'mp4' // Ensure MP4 is the default
      },
      availableSources: [],
      recordingService: null,
      availableCameras: [],
      availableMicrophones: [],
      currentSession: null,
      recordingHistory: defaultHistory,
      stagedRecordings: [],
      isRecordingPanelOpen: false,
      isPreviewActive: false,
      selectedSource: null,
      selectedCamera: null,
      selectedMicrophone: null,
      error: null,

      // State setters
      setRecordingState: (state) => set((store) => ({
        recordingState: { ...store.recordingState, ...state }
      })),

      setSettings: (settings) => set((store) => ({
        settings: { ...store.settings, ...settings }
      })),

      setAvailableSources: (sources) => set({ availableSources: sources }),
      setAvailableCameras: (cameras) => set({ availableCameras: cameras }),
      setAvailableMicrophones: (microphones) => set({ availableMicrophones: microphones }),
      setSelectedSource: (source) => set({ 
        selectedSource: source,
        settings: { ...get().settings, screenSourceId: source?.id }
      }),
      setSelectedCamera: (camera) => set({ 
        selectedCamera: camera,
        settings: { ...get().settings, cameraDeviceId: camera?.deviceId }
      }),
      setSelectedMicrophone: (microphone) => set({ 
        selectedMicrophone: microphone,
        settings: { ...get().settings, microphoneDeviceId: microphone?.deviceId }
      }),
      setRecordingPanelOpen: (open) => set({ isRecordingPanelOpen: open }),
      setPreviewActive: (active) => set({ isPreviewActive: active }),
      setError: (error) => set({ error }),

      // Recording actions
      startRecording: async () => {
        const { settings, createSession } = get();
        
        try {
          // Create recording session
          createSession(settings);
          
          // Create recording service
          const recordingService = new RecordingService(
            (state) => set({ recordingState: state }),
            (error) => set({ error }),
            (progress) => console.log('Recording progress:', progress)
          );
          
          // Start recording
          await recordingService.startRecording(settings);
          
          set({
            recordingService,
            isRecording: true,
            isPaused: false,
            recordingState: {
              status: 'recording',
              startTime: Date.now(),
              elapsedTime: 0
            }
          });
        } catch (error) {
          console.error('Failed to start recording:', error);
          set({ error: { code: 'START_FAILED', message: 'Failed to start recording' } });
        }
      },

      pauseRecording: () => {
        const { recordingService } = get();
        if (recordingService) {
          recordingService.pauseRecording();
        }
        set((store) => ({
          isPaused: true,
          recordingState: {
            ...store.recordingState,
            status: 'paused'
          }
        }));
      },

      resumeRecording: () => {
        const { recordingService } = get();
        if (recordingService) {
          recordingService.resumeRecording();
        }
        set((store) => ({
          isPaused: false,
          recordingState: {
            ...store.recordingState,
            status: 'recording'
          }
        }));
      },

      stopRecording: async () => {
        try {
          console.log('🛑 Store: stopRecording called');
          
          // Get the current recording service instance and settings
          const { recordingService, settings } = get();
          if (!recordingService) {
            throw new Error('No active recording service');
          }
          
          console.log('🛑 Store: Using existing service instance');
          
          console.log('🛑 Store: Calling service.stopRecording()...');
          const result = await recordingService.stopRecording(settings);
          console.log('🛑 Store: Service returned result:', result);
          
          set((store) => ({
            recordingService: null,
            isRecording: false,
            isPaused: false,
            recordingState: {
              ...store.recordingState,
              status: 'stopped',
              elapsedTime: Date.now() - store.recordingState.startTime
            }
          }));
          
          // End session with results
          get().endSession(result.outputPath, result.duration, result.fileSize);
          console.log('🛑 Store: Recording stopped successfully, file saved to:', result.outputPath);
          
          // Add to staging area instead of immediate processing
          get().addStagedRecording({
            webmPath: result.outputPath,
            duration: result.duration,
            fileSize: result.fileSize
          });
        } catch (error) {
          console.error('🛑 Store: Failed to stop recording:', error);
          set({ error: { code: 'STOP_FAILED', message: 'Failed to stop recording' } });
        }
      },

      cancelRecording: () => {
        const { recordingService } = get();
        if (recordingService) {
          recordingService.cancelRecording();
        }
        set((store) => ({
          recordingService: null,
          isRecording: false,
          isPaused: false,
          recordingState: {
            ...store.recordingState,
            status: 'idle',
            startTime: 0,
            elapsedTime: 0
          },
          currentSession: null
        }));
      },

      // Session management
      createSession: (settings) => set({
        currentSession: {
          id: `session-${Date.now()}`,
          settings,
          startTime: Date.now()
        }
      }),

      endSession: (outputPath, duration, fileSize) => set((store) => {
        if (!store.currentSession) return store;
        
        const session: RecordingSession = {
          ...store.currentSession,
          endTime: Date.now(),
          outputPath,
          duration,
          fileSize
        };

        return {
          currentSession: null,
          recordingHistory: {
            ...store.recordingHistory,
            sessions: [session, ...store.recordingHistory.sessions.slice(0, 49)] // Keep last 50
          }
        };
      }),

      addToHistory: (session) => set((store) => ({
        recordingHistory: {
          ...store.recordingHistory,
          sessions: [session, ...store.recordingHistory.sessions.slice(0, 49)]
        }
      })),

      clearHistory: () => set((store) => ({
        recordingHistory: {
          ...store.recordingHistory,
          sessions: []
        }
      })),

      // Device management
      loadDevices: async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const cameras = devices
            .filter(d => d.kind === 'videoinput')
            .map(d => ({
              deviceId: d.deviceId,
              label: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
              kind: d.kind as 'videoinput',
              groupId: d.groupId
            }));
          
          const microphones = devices
            .filter(d => d.kind === 'audioinput')
            .map(d => ({
              deviceId: d.deviceId,
              label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
              kind: d.kind as 'audioinput',
              groupId: d.groupId
            }));

          set({ availableCameras: cameras, availableMicrophones: microphones });
        } catch (error) {
          console.error('Error loading devices:', error);
          set({ error: { code: 'DEVICE_ENUMERATION_FAILED', message: 'Failed to load devices' } });
        }
      },

      loadSources: async () => {
        try {
          if (window.clipforge?.recording?.getSources) {
            const sources = await window.clipforge.recording.getSources();
            console.log('Loaded sources:', sources);
            set({ availableSources: sources });
          } else {
            console.error('Recording API not available');
            set({ error: { code: 'API_NOT_AVAILABLE', message: 'Recording API not available' } });
          }
        } catch (error) {
          console.error('Error loading sources:', error);
          set({ error: { code: 'SOURCE_ENUMERATION_FAILED', message: 'Failed to load screen sources' } });
        }
      },

      saveDevicePreferences: () => {
        const { selectedCamera, selectedMicrophone, selectedSource } = get();
        const preferences = {
          camera: selectedCamera?.deviceId,
          microphone: selectedMicrophone?.deviceId,
          screen: selectedSource?.id
        };
        localStorage.setItem('recording-device-preferences', JSON.stringify(preferences));
      },

      loadDevicePreferences: () => {
        try {
          const stored = localStorage.getItem('recording-device-preferences');
          if (stored) {
            const preferences = JSON.parse(stored);
            const { availableCameras, availableMicrophones, availableSources } = get();
            
            const camera = availableCameras.find(c => c.deviceId === preferences.camera);
            const microphone = availableMicrophones.find(m => m.deviceId === preferences.microphone);
            const source = availableSources.find(s => s.id === preferences.screen);
            
            set({
              selectedCamera: camera || null,
              selectedMicrophone: microphone || null,
              selectedSource: source || null
            });
          }
        } catch (error) {
          console.error('Error loading device preferences:', error);
        }
      },

      // Output folder management
      initializeOutputFolder: async () => {
        const { settings } = get();
        if (!settings.outputFolder) {
          const defaultFolder = await initializeDefaultOutputFolder();
          set({
            settings: {
              ...settings,
              outputFolder: defaultFolder
            }
          });
        }
      },

      setOutputFolder: (folder: string) => {
        const { settings } = get();
        set({
          settings: {
            ...settings,
            outputFolder: folder
          }
        });
      },

      // Staged recordings management
      addStagedRecording: (recording: { webmPath: string; duration: number; fileSize: number }) => {
        console.log('🎬 Store: addStagedRecording called with:', recording);
        const id = `staged-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const stagedRecording = {
          id,
          webmPath: recording.webmPath,
          duration: recording.duration,
          fileSize: recording.fileSize,
          timestamp: Date.now(),
          status: 'staged' as const
        };

        console.log('🎬 Store: Created staged recording object:', stagedRecording);

        set((state) => {
          const newStagedRecordings = [...state.stagedRecordings, stagedRecording];
          console.log('🎬 Store: Updated stagedRecordings array, new length:', newStagedRecordings.length);
          return {
            stagedRecordings: newStagedRecordings
          };
        });

        console.log('🎬 Store: Added staged recording:', stagedRecording);
      },

      clearStagedRecordings: () => {
        set({ stagedRecordings: [] });
        console.log('🎬 Store: Cleared staged recordings');
      },

      processStagedRecordings: async () => {
        console.log('🎬 Store: processStagedRecordings called');
        const { stagedRecordings, settings } = get();
        console.log('🎬 Store: Current stagedRecordings:', stagedRecordings);
        console.log('🎬 Store: Current settings:', settings);
        
        if (stagedRecordings.length === 0) {
          console.log('🎬 Store: No staged recordings to process');
          return;
        }

        console.log('🎬 Store: Processing', stagedRecordings.length, 'staged recordings...');
        
        for (const recording of stagedRecordings) {
          try {
            // Convert to MP4 if requested
            let finalPath = recording.webmPath;
            console.log('🎬 Store: Processing staged recording:', recording.id);
            console.log('🎬 Store: Settings outputFormat:', settings.outputFormat);
            console.log('🎬 Store: ConvertToMP4 available:', !!window.clipforge?.recording?.convertToMP4);
            
            if (settings.outputFormat === 'mp4' && window.clipforge?.recording?.convertToMP4) {
              // Skip conversion for very short recordings (likely corrupted)
              if (recording.duration < 2000) { // Less than 2 seconds
                console.log('🎬 Store: Skipping conversion for short recording (duration:', recording.duration, 'ms)');
                finalPath = recording.webmPath;
              } else {
                const mp4Path = recording.webmPath.replace('.webm', '.mp4');
                console.log('🎬 Store: Converting', recording.webmPath, 'to', mp4Path);
                console.log('🎬 Store: Recording duration:', recording.duration, 'ms, file size:', recording.fileSize, 'bytes');
                
                try {
                  finalPath = await window.clipforge.recording.convertToMP4({
                    inputPath: recording.webmPath,
                    outputPath: mp4Path,
                    quality: settings.quality || 'medium'
                  });
                  console.log('🎬 Store: Conversion complete:', finalPath);
                } catch (conversionError) {
                  console.error('🎬 Store: MP4 conversion failed, using original WebM file:', conversionError);
                  console.log('🎬 Store: Continuing with WebM file:', recording.webmPath);
                  // Keep the original WebM path if conversion fails
                  finalPath = recording.webmPath;
                }
              }
            } else {
              console.log('🎬 Store: Skipping conversion - outputFormat:', settings.outputFormat, 'convertToMP4 available:', !!window.clipforge?.recording?.convertToMP4);
            }

            // Import to media library using the media store
            console.log('🎬 Store: Importing', finalPath, 'to media library');
            // Import the media store dynamically to avoid circular dependency
            const { useMediaStore } = await import('./mediaStore');
            const mediaStore = useMediaStore.getState();
            await mediaStore.importMedia([finalPath]);
            console.log('🎬 Store: Import complete');
          } catch (error) {
            console.error('🎬 Store: Failed to process staged recording:', recording.id, error);
          }
        }

        // Clear staged recordings after processing
        get().clearStagedRecordings();
        console.log('🎬 Store: All staged recordings processed');
      }
    }),
    {
      name: 'recording-store',
      partialize: (state) => ({
        settings: state.settings,
        recordingHistory: state.recordingHistory
      }),
      onRehydrateStorage: () => (state) => {
        // Ensure outputFormat is set to 'mp4' if it's undefined (migration for existing data)
        if (state && state.settings && state.settings.outputFormat === undefined) {
          state.settings.outputFormat = 'mp4';
        }
      }
    }
  )
);
