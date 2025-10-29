import { create } from 'zustand';
import { MediaFile } from '../types/media';
import { toast } from '../utils/toast';

interface MediaState {
  // State
  media: MediaFile[];
  selectedMediaId: string | null;
  currentPreview: MediaFile | null;
  isImporting: boolean;
  error: string | null;

  // Actions
  importMedia: (files: File[] | string[]) => Promise<void>;
  selectMedia: (id: string) => void;
  removeMedia: (id: string) => Promise<void>;
  loadPreview: (id: string) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useMediaStore = create<MediaState>((set, get) => ({
  // Initial state
  media: [],
  selectedMediaId: null,
  currentPreview: null,
  isImporting: false,
  error: null,

  // Actions
  importMedia: async (files: File[] | string[]) => {
    console.log('Starting import process with files:', files);
    set({ isImporting: true, error: null });
    
    try {
      let filePaths: string[] = [];
      
      if (files.length > 0 && files[0] instanceof File) {
        // Handle File objects (from drag and drop)
        // Note: In Electron, File objects from drag and drop have a path property
        filePaths = (files as File[]).map(file => (file as any).path);
        console.log('Mapped File objects to paths:', filePaths);
      } else {
        // Handle string paths (from file picker)
        filePaths = files as string[];
        console.log('Using string paths:', filePaths);
      }

      console.log('Calling main process to import media...');
      // Call the main process to import media
      const importedFiles = await window.clipforge.media.import(filePaths);
      console.log('Main process returned:', importedFiles);
      console.log('First imported file path:', importedFiles[0]?.path);
      console.log('First imported file thumbnail:', importedFiles[0]?.thumbnailPath);
      
      set(state => ({
        media: [...state.media, ...importedFiles],
        isImporting: false,
        // Auto-select the first imported file if none is currently selected
        selectedMediaId: state.selectedMediaId || (importedFiles.length > 0 ? importedFiles[0].id : state.selectedMediaId),
      }));
      
      if (importedFiles.length > 0) {
        toast.success(`Successfully imported ${importedFiles.length} file(s)`);
        // Auto-load preview for the first imported file
        console.log('Auto-loading preview for:', importedFiles[0].id);
        get().loadPreview(importedFiles[0].id);
      }
    } catch (error) {
      console.error('Error importing media:', error);
      const errorMessage = `Failed to import media: ${error instanceof Error ? error.message : 'Unknown error'}`;
      set({
        error: errorMessage,
        isImporting: false,
      });
      toast.error(errorMessage);
    }
  },

  selectMedia: (id: string) => {
    set({ selectedMediaId: id });
    // Automatically load preview when selecting media
    get().loadPreview(id);
  },

  removeMedia: async (id: string) => {
    try {
      await window.clipforge.media.remove(id);
      set(state => ({
        media: state.media.filter(media => media.id !== id),
        selectedMediaId: state.selectedMediaId === id ? null : state.selectedMediaId,
        currentPreview: state.currentPreview?.id === id ? null : state.currentPreview,
      }));
      toast.success('Media removed successfully');
    } catch (error) {
      console.error('Error removing media:', error);
      const errorMessage = `Failed to remove media: ${error instanceof Error ? error.message : 'Unknown error'}`;
      set({ error: errorMessage });
      toast.error(errorMessage);
    }
  },

  loadPreview: (id: string) => {
    const media = get().media.find(m => m.id === id);
    console.log('Loading preview for ID:', id, 'Found media:', media);
    if (media) {
      set({ currentPreview: media });
      console.log('Preview loaded:', media.name);
    } else {
      console.log('Media not found for ID:', id);
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));
