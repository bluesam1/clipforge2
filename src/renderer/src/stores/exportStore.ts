import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { 
  ExportSettings, 
  ExportJob, 
  ExportProgressUpdate, 
  ExportCompleteEvent, 
  ExportErrorEvent,
  DEFAULT_EXPORT_SETTINGS 
} from '../types/export';
import { useMediaStore } from './mediaStore';
import { useTimelineStore } from './timelineStore';

interface ExportState {
  // Export Settings
  settings: ExportSettings;
  
  // Export Job State
  exportJob: ExportJob | null;
  
  // UI State
  isExportDialogOpen: boolean;
  isExportProgressVisible: boolean;
  isExportCompleteVisible: boolean;
  
  // Actions
  openExportDialog: () => void;
  closeExportDialog: () => void;
  updateExportSettings: (settings: Partial<ExportSettings>) => void;
  resetExportSettings: () => void;
  
  // Export Job Management
  startExport: () => void;
  updateExportProgress: (update: ExportProgressUpdate) => void;
  completeExport: (event: ExportCompleteEvent) => void;
  failExport: (event: ExportErrorEvent) => void;
  cancelExport: () => void;
  resetExport: () => void;
  
  // UI Actions
  showExportProgress: () => void;
  hideExportProgress: () => void;
  showExportComplete: () => void;
  hideExportComplete: () => void;
}

// Load settings from localStorage
const loadSettings = (): ExportSettings => {
  try {
    const saved = localStorage.getItem('clipforge-export-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_EXPORT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load export settings:', error);
  }
  return { ...DEFAULT_EXPORT_SETTINGS };
};

// Save settings to localStorage
const saveSettings = (settings: ExportSettings) => {
  try {
    localStorage.setItem('clipforge-export-settings', JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save export settings:', error);
  }
};

export const useExportStore = create<ExportState>((set, get) => ({
  // Initial state
  settings: loadSettings(),
  exportJob: null,
  isExportDialogOpen: false,
  isExportProgressVisible: false,
  isExportCompleteVisible: false,

  // Dialog Actions
  openExportDialog: () => {
    set({ isExportDialogOpen: true });
  },

  closeExportDialog: () => {
    set({ isExportDialogOpen: false });
  },

  // Settings Management
  updateExportSettings: (newSettings: Partial<ExportSettings>) => {
    set((state) => {
      const updatedSettings = { ...state.settings, ...newSettings };
      saveSettings(updatedSettings);
      return { settings: updatedSettings };
    });
  },

  resetExportSettings: () => {
    const defaultSettings = { ...DEFAULT_EXPORT_SETTINGS };
    saveSettings(defaultSettings);
    set({ settings: defaultSettings });
  },

  // Export Job Management
  startExport: async () => {
    const jobId = uuidv4();
    const newJob: ExportJob = {
      id: jobId,
      status: 'preparing',
      progress: 0,
      currentStep: 'Preparing export...',
      estimatedTimeRemaining: 0,
      startTime: Date.now(),
    };

    set({
      exportJob: newJob,
      isExportDialogOpen: false,
      isExportProgressVisible: true,
    });

    try {
      // Get current state from other stores
      const { settings } = get();
      const mediaStore = useMediaStore.getState();
      const timelineStore = useTimelineStore.getState();

      // Call main process to start export
      await window.clipforge.export.start(
        settings,
        timelineStore.timeline,
        timelineStore.clips,
        timelineStore.tracks,
        mediaStore.media
      );
    } catch (error) {
      console.error('Export failed:', error);
      failExport({
        error: error instanceof Error ? error.message : 'Export failed',
        details: error instanceof Error ? error.stack : undefined
      });
    }
  },

  updateExportProgress: (update: ExportProgressUpdate) => {
    set((state) => {
      if (!state.exportJob) return state;

      return {
        exportJob: {
          ...state.exportJob,
          status: 'encoding',
          progress: Math.min(100, Math.max(0, update.percent)),
          currentStep: update.step,
          estimatedTimeRemaining: update.estimatedTimeRemaining || state.exportJob.estimatedTimeRemaining,
        },
      };
    });
  },

  completeExport: (event: ExportCompleteEvent) => {
    set((state) => {
      if (!state.exportJob) return state;

      return {
        exportJob: {
          ...state.exportJob,
          status: 'complete',
          progress: 100,
          currentStep: 'Export complete!',
          outputPath: event.outputPath,
        },
        isExportProgressVisible: false,
        isExportCompleteVisible: true,
      };
    });
  },

  failExport: (event: ExportErrorEvent) => {
    set((state) => {
      if (!state.exportJob) return state;

      return {
        exportJob: {
          ...state.exportJob,
          status: 'error',
          error: event.error,
        },
        isExportProgressVisible: false,
      };
    });
  },

  cancelExport: async () => {
    try {
      // Call main process to cancel export
      await window.clipforge.export.cancel();
    } catch (error) {
      console.error('Error cancelling export:', error);
    }

    set((state) => {
      if (!state.exportJob) return state;

      return {
        exportJob: {
          ...state.exportJob,
          status: 'cancelled',
          currentStep: 'Export cancelled',
        },
        isExportProgressVisible: false,
      };
    });
  },

  resetExport: () => {
    set({
      exportJob: null,
      isExportProgressVisible: false,
      isExportCompleteVisible: false,
      isExportDialogOpen: true, // Open dialog for new export
    });
  },

  // UI Actions
  showExportProgress: () => {
    set({ isExportProgressVisible: true });
  },

  hideExportProgress: () => {
    set({ isExportProgressVisible: false });
  },

  showExportComplete: () => {
    set({ isExportCompleteVisible: true });
  },

  hideExportComplete: () => {
    set({ isExportCompleteVisible: false });
  },
}));

// Set up event listeners for export events
export function setupExportEventListeners() {
  // Listen for export progress updates
  window.clipforge.export.onProgress((data) => {
    useExportStore.getState().updateExportProgress(data);
  });

  // Listen for export completion
  window.clipforge.export.onComplete((data) => {
    useExportStore.getState().completeExport(data);
  });

  // Listen for export errors
  window.clipforge.export.onError((data) => {
    useExportStore.getState().failExport(data);
  });
}
