import { app, shell, BrowserWindow, ipcMain, dialog, session } from 'electron';
import { join } from 'path';
import * as path from 'path';
import * as fs from 'fs';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { extractMetadata, generateThumbnail, validateVideoFile, generateFileHash } from './utils/ffmpeg';
import { MediaFile } from '../shared/types/media';

// Let's try a simpler approach - just allow file:// URLs

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false, // Allow local file access
      allowRunningInsecureContent: true,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Configure Content Security Policy to allow file:// URLs
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' data: blob: file:;",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval';",
          "style-src 'self' 'unsafe-inline';",
          "img-src 'self' data: blob: file:;",
          "media-src 'self' data: blob: file:;",
          "font-src 'self' data:;",
          "connect-src 'self' ws: wss:;"
        ]
      }
    });
  });

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on('ping', () => console.log('pong'));

  // Media import handler
  ipcMain.handle('media:import', async (_event, filePaths: string[]): Promise<MediaFile[]> => {
    console.log('Starting media import for files:', filePaths);
    const importedFiles: MediaFile[] = [];
    
    for (const filePath of filePaths) {
      try {
        console.log(`Processing file: ${filePath}`);
        
        // Validate file format
        if (!validateVideoFile(filePath)) {
          console.warn(`Unsupported file format: ${filePath}`);
          continue;
        }
        console.log(`File format validated: ${filePath}`);

        // Extract metadata
        console.log(`Extracting metadata for: ${filePath}`);
        const metadata = await extractMetadata(filePath);
        console.log(`Metadata extracted for: ${filePath}`, metadata);
        
        // Generate thumbnail (optional - don't fail import if this fails)
        console.log(`Generating thumbnail for: ${filePath}`);
        const thumbnailDir = join(app.getPath('userData'), 'thumbnails');
        if (!fs.existsSync(thumbnailDir)) {
          fs.mkdirSync(thumbnailDir, { recursive: true });
        }
        
        const fileHash = generateFileHash(filePath);
        const thumbnailPath = join(thumbnailDir, `${fileHash}.jpg`);
        console.log(`Thumbnail path: ${thumbnailPath}`);
        
        let finalThumbnailPath: string | undefined;
        try {
          await generateThumbnail(filePath, thumbnailPath);
          finalThumbnailPath = thumbnailPath;
          console.log(`Thumbnail generated for: ${filePath}`);
        } catch (thumbnailError) {
          console.warn(`Failed to generate thumbnail for ${filePath}:`, thumbnailError);
          // Continue without thumbnail
        }

        // Create MediaFile object
        const mediaFile: MediaFile = {
          id: fileHash,
          path: filePath,
          name: path.basename(filePath),
          type: 'video',
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          fps: metadata.fps,
          size: metadata.size,
          thumbnailPath: finalThumbnailPath,
          hash: fileHash,
          createdAt: new Date().toISOString(),
        };

        importedFiles.push(mediaFile);
        console.log(`Successfully imported: ${filePath}`);
      } catch (error) {
        console.error(`Error importing file ${filePath}:`, error);
        // Continue with other files even if one fails
      }
    }

    console.log(`Import complete. Imported ${importedFiles.length} files.`);
    return importedFiles;
  });

  // Media remove handler
  ipcMain.handle('media:remove', async (_event, mediaId: string): Promise<void> => {
    // For now, just log the removal
    // In a real app, you might want to remove from a database or file
    console.log(`Removing media with ID: ${mediaId}`);
  });

  // Get thumbnail handler
  ipcMain.handle('media:getThumbnail', async (_event, mediaId: string): Promise<string> => {
    const thumbnailPath = join(app.getPath('userData'), 'thumbnails', `${mediaId}.jpg`);
    return fs.existsSync(thumbnailPath) ? thumbnailPath : '';
  });

  // File open dialog handler
  ipcMain.handle('file:openDialog', async (event, options: any): Promise<string[] | null> => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return null;
    
    const result = await dialog.showOpenDialog(window, {
      title: options.title || 'Select Media Files',
      defaultPath: options.defaultPath || app.getPath('home'),
      buttonLabel: options.buttonLabel || 'Select',
      filters: options.filters || [
        { name: 'Video Files', extensions: ['mp4', 'mov', 'webm'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    });

    return result.canceled ? null : result.filePaths;
  });

  // Project save handler
  ipcMain.handle('project:save', async (_event, projectPath: string): Promise<void> => {
    // For now, just log the save
    // In a real app, you would save the project state to a file
    console.log(`Saving project to: ${projectPath}`);
  });

  // Project load handler
  ipcMain.handle('project:load', async (_event, projectPath: string): Promise<MediaFile[]> => {
    // For now, return empty array
    // In a real app, you would load the project state from a file
    console.log(`Loading project from: ${projectPath}`);
    return [];
  });

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
