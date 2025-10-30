import { RecordingSettings, RecordingState, RecordingError } from '../types/recording';

export class RecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;
  private stopPiPCompositing: (() => void) | null = null;
  private onStateChange?: (state: RecordingState) => void;
  private onError?: (error: RecordingError) => void;
  private onProgress?: (progress: { percent: number; step: string }) => void;

  constructor(
    onStateChange?: (state: RecordingState) => void,
    onError?: (error: RecordingError) => void,
    onProgress?: (progress: { percent: number; step: string }) => void
  ) {
    this.onStateChange = onStateChange;
    this.onError = onError;
    this.onProgress = onProgress;
  }

  async startRecording(settings: RecordingSettings): Promise<void> {
    try {
      console.log('🎬 Service: startRecording called with settings:', settings);
      this.onProgress?.({ percent: 10, step: 'Setting up recording...' });
      
      // Get media stream based on recording mode
      this.mediaStream = await this.getMediaStream(settings);
      console.log('🎬 Service: Media stream obtained:', this.mediaStream);
      
      this.onProgress?.({ percent: 30, step: 'Configuring recorder...' });
      
      // Configure MediaRecorder
      const options = this.getMediaRecorderOptions(settings);
      console.log('🎬 Service: MediaRecorder options:', options);
      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
      console.log('🎬 Service: MediaRecorder created:', this.mediaRecorder);
      console.log('🎬 Service: MediaRecorder state:', this.mediaRecorder.state);
      
      // Set up event handlers
      this.setupMediaRecorderHandlers();
      
      this.onProgress?.({ percent: 50, step: 'Starting recording...' });
      
      // Start recording
      console.log('🎬 Service: Starting MediaRecorder...');
      this.startTime = Date.now(); // Set start time before starting
      this.mediaRecorder.start(1000); // Capture every 1 second
      
      this.onStateChange?.({
        status: 'recording',
        startTime: this.startTime,
        elapsedTime: 0
      });
      
      this.onProgress?.({ percent: 100, step: 'Recording started' });
      console.log('🎬 Service: Recording started successfully');
      
    } catch (error) {
      console.error('🎬 Service: Error starting recording:', error);
      this.onError?.({
        code: 'RECORDING_START_FAILED',
        message: 'Failed to start recording',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.onStateChange?.({
        status: 'paused',
        startTime: this.startTime,
        elapsedTime: Date.now() - this.startTime
      });
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.onStateChange?.({
        status: 'recording',
        startTime: this.startTime,
        elapsedTime: Date.now() - this.startTime
      });
    }
  }

  async stopRecording(_settings?: RecordingSettings): Promise<{ outputPath: string; duration: number; fileSize: number }> {
    console.log('🛑 Service: stopRecording called');
    console.log('🛑 Service: Current mediaRecorder:', this.mediaRecorder);
    console.log('🛑 Service: Current mediaStream:', this.mediaStream);
    console.log('🛑 Service: Current chunks length:', this.chunks.length);
    console.log('🛑 Service: Service instance ID:', this.constructor.name + '_' + Math.random().toString(36).substr(2, 9));
    
    // Stop PiP compositing animation immediately when stop is called
    if (this.stopPiPCompositing) {
      console.log('🛑 Service: Stopping PiP compositing animation immediately');
      this.stopPiPCompositing();
      this.stopPiPCompositing = null;
    }
    
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        console.error('🛑 Service: No active recording - mediaRecorder is null');
        console.error('🛑 Service: This might indicate the recording was never started or was already stopped');
        console.error('🛑 Service: Attempting to check if we have a valid mediaStream to recreate mediaRecorder...');
        console.error('🛑 Service: mediaStream exists:', !!this.mediaStream);
        console.error('🛑 Service: mediaStream active:', this.mediaStream?.active);
        console.error('🛑 Service: mediaStream tracks:', this.mediaStream?.getTracks().length);
        
        // If we have a mediaStream but no mediaRecorder, try to recreate it
        if (this.mediaStream && this.mediaStream.active) {
          console.log('🛑 Service: Found active mediaStream, recreating mediaRecorder...');
          try {
            const options = this.getMediaRecorderOptions(_settings || { enableScreen: false, enableWebcam: false, enableAudio: true });
            this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
            this.setupMediaRecorderHandlers();
            console.log('🛑 Service: Successfully recreated mediaRecorder');
          } catch (recreateError) {
            console.error('🛑 Service: Failed to recreate mediaRecorder:', recreateError);
            reject(new Error('No active recording and failed to recreate'));
            return;
          }
        } else {
          console.error('🛑 Service: Cannot recreate mediaRecorder - mediaStream is null or inactive');
          console.error('🛑 Service: mediaStream null:', !this.mediaStream);
          console.error('🛑 Service: mediaStream inactive:', this.mediaStream && !this.mediaStream.active);
          reject(new Error('No active recording'));
          return;
        }
      }

      console.log('🛑 Service: MediaRecorder state:', this.mediaRecorder.state);
      console.log('🛑 Service: Chunks collected:', this.chunks.length);

            this.mediaRecorder.onstop = async () => {
              try {
                console.log('🛑 Service: onstop event fired');
                
                // Stop PiP compositing animation if it exists
                if (this.stopPiPCompositing) {
                  console.log('🛑 Service: Stopping PiP compositing animation');
                  this.stopPiPCompositing();
                  this.stopPiPCompositing = null;
                }
                
                this.onProgress?.({ percent: 20, step: 'Processing recording...' });
          
            // Create blob from chunks with appropriate MIME type
            console.log('🛑 Service: Creating blob from', this.chunks.length, 'chunks');
            const mimeType = _settings?.enableWebcam || _settings?.enableScreen 
              ? 'video/webm;codecs=vp9,opus' 
              : 'audio/webm;codecs=opus';
            const recordingBlob = new Blob(this.chunks, { type: mimeType });
            console.log('🛑 Service: Blob created, size:', recordingBlob.size);

            const arrayBuffer = await recordingBlob.arrayBuffer();
            console.log('🛑 Service: ArrayBuffer created, size:', arrayBuffer.byteLength);

            this.onProgress?.({ percent: 50, step: 'Saving file...' });
          
            // Generate filename based on recording type
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            let filename: string;
            
            if (_settings?.enableScreen && _settings?.enableWebcam) {
              filename = `screen-webcam-recording-${timestamp}.webm`;
            } else if (_settings?.enableScreen) {
              filename = `screen-recording-${timestamp}.webm`;
            } else if (_settings?.enableWebcam) {
              filename = `webcam-recording-${timestamp}.webm`;
            } else {
              filename = `audio-recording-${timestamp}.webm`;
            }
            console.log('🛑 Service: Generated filename:', filename);
          
          // TEST 2: Try IPC file saving + MP4 conversion
          console.log('🛑 Service: TEST 2 - Trying IPC file saving + MP4 conversion');
          
          if (window.clipforge?.recording?.saveFile) {
            console.log('🛑 Service: Converting ArrayBuffer to base64...');
            // Use a more efficient base64 conversion for large files
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = '';
            const chunkSize = 8192; // Process in chunks to avoid stack overflow
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
              const chunk = uint8Array.subarray(i, i + chunkSize);
              binary += String.fromCharCode.apply(null, Array.from(chunk));
            }
            const base64 = btoa(binary);
            console.log('🛑 Service: Base64 conversion complete, length:', base64.length);
            
            console.log('🛑 Service: Calling saveFile with base64 data...');
            const outputPath = await window.clipforge.recording.saveFile({
              buffer: base64,
              filename
            });
            console.log('🛑 Service: File saved via IPC to:', outputPath);
            
            this.onProgress?.({ percent: 80, step: 'Converting to MP4...' });
            
            // TEST: Try MP4 conversion
            let mp4Path = outputPath;
            if (_settings?.outputFormat === 'mp4' && window.clipforge?.recording?.convertToMP4) {
              try {
                const mp4OutputPath = outputPath.replace('.webm', '.mp4');
                
                console.log('🛑 Service: Converting WebM to MP4...');
                mp4Path = await window.clipforge.recording.convertToMP4({
                  inputPath: outputPath,
                  outputPath: mp4OutputPath,
                  quality: _settings?.quality || 'medium'
                });
                console.log('🛑 Service: MP4 conversion complete:', mp4Path);
              } catch (conversionError) {
                console.error('🛑 Service: MP4 conversion failed:', conversionError);
                // Continue with WebM file if conversion fails
              }
            }
            
            this.onProgress?.({ percent: 100, step: 'Recording complete' });
            
            const result = {
              outputPath: mp4Path,
              duration: Date.now() - this.startTime,
              fileSize: arrayBuffer.byteLength
            };
            console.log('🛑 Service: Resolving with result:', result);
            this.mediaRecorder = null; // Set to null after processing is complete
            this.cleanup(); // Cleanup after processing is complete
            resolve(result);
          } else {
              console.error('🛑 Service: Recording API not available, falling back to download');
              // Fallback to download if IPC fails
              const downloadBlob = new Blob(this.chunks, { type: 'audio/webm' });
            const url = URL.createObjectURL(downloadBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
              const result = {
                outputPath: `Downloaded: ${filename}`,
                duration: Date.now() - this.startTime,
                fileSize: arrayBuffer.byteLength
              };
              this.mediaRecorder = null; // Set to null after processing is complete
              this.cleanup(); // Cleanup after processing is complete
              resolve(result);
          }
        } catch (error) {
          console.error('🛑 Service: Error in onstop:', error);
          this.mediaRecorder = null; // Set to null on error too
          this.cleanup(); // Cleanup on error too
          this.onError?.({
            code: 'RECORDING_PROCESS_FAILED',
            message: 'Failed to process recording',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
          reject(error);
        }
      };

        console.log('🛑 Service: Calling mediaRecorder.stop()');
        this.mediaRecorder.stop();
        // Don't cleanup until after onstop event fires
    });
  }

  cancelRecording(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
    this.cleanup();
    this.onStateChange?.({
      status: 'idle',
      startTime: 0,
      elapsedTime: 0
    });
  }

  private async getMediaStream(settings: RecordingSettings): Promise<MediaStream> {
    console.log('🎬 Service: Building media stream constraints for:', {
      enableScreen: settings.enableScreen,
      enableWebcam: settings.enableWebcam,
      enableAudio: settings.enableAudio,
      screenSourceId: settings.screenSourceId,
      cameraDeviceId: settings.cameraDeviceId,
      microphoneDeviceId: settings.microphoneDeviceId
    });

    // If screen sharing is enabled, get screen capture first
    if (settings.enableScreen) {
      console.log('🎬 Service: Screen sharing enabled, getting screen capture stream...');
      console.log('🎬 Service: Screen source ID:', settings.screenSourceId);
      return this.getScreenCaptureStream(settings);
    }

    const constraints: MediaStreamConstraints = {};

    // Add audio constraints if enabled
    if (settings.enableAudio) {
      constraints.audio = {
        deviceId: settings.microphoneDeviceId ? { exact: settings.microphoneDeviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };
    }

    // Add video constraints if webcam is enabled
    if (settings.enableWebcam) {
      constraints.video = {
        deviceId: settings.cameraDeviceId ? { exact: settings.cameraDeviceId } : undefined,
        width: { ideal: 640, max: 1280 }, // Conservative resolution
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 15, max: 30 }, // Conservative framerate
        facingMode: 'user'
      };
    }

    console.log('🎬 Service: Calling getUserMedia with constraints:', constraints);

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('🎬 Service: Got stream:', stream);
      console.log('🎬 Service: Video tracks:', stream.getVideoTracks().length);
      console.log('🎬 Service: Audio tracks:', stream.getAudioTracks().length);

      // Log track details for debugging
      stream.getVideoTracks().forEach((track, index) => {
        console.log(`🎬 Service: Video track ${index}:`, {
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          settings: track.getSettings()
        });
      });

      stream.getAudioTracks().forEach((track, index) => {
        console.log(`🎬 Service: Audio track ${index}:`, {
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          settings: track.getSettings()
        });
      });

      return stream;
    } catch (error) {
      console.error('🎬 Service: Failed to get media stream with constraints:', error);

      // Fallback to audio-only if video fails
      if (settings.enableWebcam && settings.enableAudio) {
        console.log('🎬 Service: Trying audio-only fallback...');
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: settings.microphoneDeviceId ? { exact: settings.microphoneDeviceId } : undefined,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          console.log('🎬 Service: Got audio-only stream as fallback');
          return audioOnlyStream;
        } catch (fallbackError) {
          console.error('🎬 Service: Audio-only fallback also failed:', fallbackError);
          throw new Error(`Failed to get media stream: ${error instanceof Error ? error.message : String(error)}. Audio fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
        }
      } else {
        throw error;
      }
    }
  }

  private async getScreenCaptureStream(settings: RecordingSettings): Promise<MediaStream> {
    console.log('🎬 Service: Getting screen capture stream for source:', settings.screenSourceId);
    console.log('🎬 Service: Checking if getDisplayMedia is available:', !!navigator.mediaDevices.getDisplayMedia);

    try {
      // First try the standard getDisplayMedia API
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        console.log('🎬 Service: Trying getDisplayMedia API...');
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: settings.enableAudio
          });
          console.log('🎬 Service: getDisplayMedia successful');
          
          // Log video track details
          screenStream.getVideoTracks().forEach((track, index) => {
            console.log(`🎬 Service: Screen video track ${index}:`, {
              label: track.label,
              enabled: track.enabled,
              muted: track.muted,
              settings: track.getSettings()
            });
          });

          // If we also need webcam, create PiP composite stream
          if (settings.enableWebcam) {
            console.log('🎬 Service: Both screen and webcam enabled, creating PiP composite stream...');
            console.log('🎬 Service: Settings for PiP:', {
              enableScreen: settings.enableScreen,
              enableWebcam: settings.enableWebcam,
              pipPosition: settings.pipPosition,
              pipSize: settings.pipSize,
              cameraDeviceId: settings.cameraDeviceId
            });
            return this.createPiPCompositeStream(screenStream, settings);
          }

          return screenStream;
        } catch (getDisplayMediaError) {
          console.log('🎬 Service: getDisplayMedia failed:', getDisplayMediaError);
        }
      }

      // Fallback: Use Electron's desktopCapturer API via IPC
      console.log('🎬 Service: Falling back to Electron desktopCapturer API...');
      if (window.clipforge?.recording?.getSources) {
        const sources = await window.clipforge.recording.getSources();
        console.log('🎬 Service: Available sources:', sources);
        
        if (sources.length === 0) {
          throw new Error('No screen sources available');
        }

        // Use the first screen source or the one specified in settings
        const sourceId = settings.screenSourceId || sources[0].id;
        const source = sources.find(s => s.id === sourceId) || sources[0];
        
        console.log('🎬 Service: Using source:', source);
        
        // Create a MediaStream from the desktopCapturer source
        const screenStream = await navigator.mediaDevices.getUserMedia({
          video: {
            // @ts-ignore - Electron specific constraint
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: source.id,
              minWidth: 1280,
              maxWidth: 1920,
              minHeight: 720,
              maxHeight: 1080
            }
          },
          audio: settings.enableAudio ? {
            // @ts-ignore - Electron specific constraint
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: source.id
            }
          } : false
        });
        
        console.log('🎬 Service: Electron desktopCapturer successful');
        
        // Log video track details
        screenStream.getVideoTracks().forEach((track, index) => {
          console.log(`🎬 Service: Screen video track ${index}:`, {
            label: track.label,
            enabled: track.enabled,
            muted: track.muted,
            settings: track.getSettings()
          });
        });

        // If we also need webcam, create PiP composite stream
        if (settings.enableWebcam) {
          console.log('🎬 Service: Both screen and webcam enabled, creating PiP composite stream...');
          console.log('🎬 Service: Settings for PiP:', {
            enableScreen: settings.enableScreen,
            enableWebcam: settings.enableWebcam,
            pipPosition: settings.pipPosition,
            pipSize: settings.pipSize,
            cameraDeviceId: settings.cameraDeviceId
          });
          return this.createPiPCompositeStream(screenStream, settings);
        }

        return screenStream;
      } else {
        throw new Error('Neither getDisplayMedia nor desktopCapturer available');
      }
    } catch (error) {
      console.error('🎬 Service: Failed to get screen capture stream:', error);
      console.error('🎬 Service: Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      console.error('🎬 Service: Full error object:', JSON.stringify(error, null, 2));
      
      // Fallback to webcam recording if screen capture fails
      console.log('🎬 Service: Screen capture failed, falling back to webcam recording...');
      return this.getWebcamFallbackStream(settings);
    }
  }

  private async createPiPCompositeStream(screenStream: MediaStream, settings: RecordingSettings): Promise<MediaStream> {
    console.log('🎬 Service: Creating PiP composite stream...');
    console.log('🎬 Service: Screen stream tracks:', {
      video: screenStream.getVideoTracks().length,
      audio: screenStream.getAudioTracks().length,
      videoTrack: screenStream.getVideoTracks()[0]?.label
    });
    
    let webcamStream: MediaStream;
    try {
      // Get webcam stream
      webcamStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: settings.cameraDeviceId ? { exact: settings.cameraDeviceId } : undefined,
          width: { ideal: 320, max: 640 }, // Small webcam for PiP
          height: { ideal: 240, max: 480 },
          frameRate: { ideal: 15, max: 30 }
        }
      });

      console.log('🎬 Service: Got webcam stream for PiP:', webcamStream);
      console.log('🎬 Service: Webcam stream tracks:', {
        video: webcamStream.getVideoTracks().length,
        audio: webcamStream.getAudioTracks().length,
        videoTrack: webcamStream.getVideoTracks()[0]?.label
      });
    } catch (webcamError) {
      console.error('🎬 Service: Failed to get webcam stream for PiP:', webcamError);
      const errorMessage = webcamError instanceof Error ? webcamError.message : String(webcamError);
      throw new Error(`Failed to get webcam stream for PiP: ${errorMessage}`);
    }

    // Create canvas for compositing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context for PiP compositing');
    }

    // Set canvas size to match screen stream
    const screenVideo = document.createElement('video');
    screenVideo.srcObject = screenStream;
    screenVideo.muted = true;
    screenVideo.play();

    const webcamVideo = document.createElement('video');
    webcamVideo.srcObject = webcamStream;
    webcamVideo.muted = true;
    webcamVideo.play();

    // Wait for video metadata to load
    await new Promise((resolve) => {
      screenVideo.addEventListener('loadedmetadata', resolve);
    });

    // Also wait for webcam metadata
    await new Promise((resolve) => {
      webcamVideo.addEventListener('loadedmetadata', resolve);
    });

    canvas.width = screenVideo.videoWidth;
    canvas.height = screenVideo.videoHeight;

    console.log('🎬 Service: Canvas size set to:', canvas.width, 'x', canvas.height);
    console.log('🎬 Service: Screen video dimensions:', screenVideo.videoWidth, 'x', screenVideo.videoHeight);
    console.log('🎬 Service: Webcam video dimensions:', webcamVideo.videoWidth, 'x', webcamVideo.videoHeight);

    // Get PiP settings
    const pipSize = settings.pipSize === 'small' ? 240 : settings.pipSize === 'medium' ? 320 : 480;
    const pipPosition = settings.pipPosition || 'bottom-right';

    // Calculate PiP position
    let pipX = 20;
    let pipY = 20;

    if (pipPosition.includes('right')) {
      pipX = canvas.width - pipSize - 20;
    }
    if (pipPosition.includes('bottom')) {
      pipY = canvas.height - pipSize - 20;
    }

    console.log('🎬 Service: PiP settings:', {
      size: pipSize,
      position: pipPosition,
      x: pipX,
      y: pipY
    });

    // Create composite stream from canvas
    const compositeStream = canvas.captureStream(30); // 30 FPS

    console.log('🎬 Service: Canvas stream created:', compositeStream);
    console.log('🎬 Service: Canvas stream tracks:', {
      video: compositeStream.getVideoTracks().length,
      audio: compositeStream.getAudioTracks().length
    });

    // Add audio tracks (prefer screen audio if available, otherwise webcam)
    const audioTracks = screenStream.getAudioTracks().length > 0 
      ? screenStream.getAudioTracks() 
      : webcamStream.getAudioTracks();
    
    audioTracks.forEach(track => {
      compositeStream.addTrack(track);
    });

    console.log('🎬 Service: Added audio tracks, final stream tracks:', {
      video: compositeStream.getVideoTracks().length,
      audio: compositeStream.getAudioTracks().length
    });

    // Start compositing loop
    let frameCount = 0;
    let animationId: number | null = null;
    
    const drawFrame = () => {
      frameCount++;
      
      if (screenVideo.videoWidth > 0 && webcamVideo.videoWidth > 0) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw screen video as background
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        
        // Draw webcam as PiP overlay
        const webcamAspectRatio = webcamVideo.videoWidth / webcamVideo.videoHeight;
        const pipHeight = pipSize / webcamAspectRatio;
        
        // Draw border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(pipX - 2, pipY - 2, pipSize + 4, pipHeight + 4);
        
        // Draw webcam video
        ctx.drawImage(webcamVideo, pipX, pipY, pipSize, pipHeight);
        
        // Log every 30 frames (1 second at 30fps)
        if (frameCount % 30 === 0) {
          console.log('🎬 Service: PiP compositing frame', frameCount, {
            screenVideo: { width: screenVideo.videoWidth, height: screenVideo.videoHeight },
            webcamVideo: { width: webcamVideo.videoWidth, height: webcamVideo.videoHeight },
            canvas: { width: canvas.width, height: canvas.height },
            pipPosition: { x: pipX, y: pipY, size: pipSize, height: pipHeight }
          });
        }
      } else {
        console.log('🎬 Service: Videos not ready yet:', {
          screenVideo: { width: screenVideo.videoWidth, height: screenVideo.videoHeight },
          webcamVideo: { width: webcamVideo.videoWidth, height: webcamVideo.videoHeight }
        });
      }
      
      animationId = requestAnimationFrame(drawFrame);
    };

    // Start the compositing loop
    drawFrame();
    
    // Store cleanup function to stop animation
    this.stopPiPCompositing = () => {
      if (animationId !== null) {
        console.log('🎬 Service: Stopping PiP compositing animation');
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    };

    console.log('🎬 Service: PiP composite stream created:', compositeStream);
    console.log('🎬 Service: Composite video tracks:', compositeStream.getVideoTracks().length);
    console.log('🎬 Service: Composite audio tracks:', compositeStream.getAudioTracks().length);

    return compositeStream;
  }

  private async getWebcamFallbackStream(settings: RecordingSettings): Promise<MediaStream> {
    console.log('🎬 Service: Using webcam fallback for screen recording');
    
    const constraints: MediaStreamConstraints = {};

    // Add audio constraints if enabled
    if (settings.enableAudio) {
      constraints.audio = {
        deviceId: settings.microphoneDeviceId ? { exact: settings.microphoneDeviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };
    }

    // Add video constraints (webcam instead of screen)
    constraints.video = {
      deviceId: settings.cameraDeviceId ? { exact: settings.cameraDeviceId } : undefined,
      width: { ideal: 1280, max: 1920 }, // Higher resolution for webcam fallback
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 15, max: 30 },
      facingMode: 'user'
    };

    console.log('🎬 Service: Fallback constraints:', constraints);

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('🎬 Service: Got fallback webcam stream:', stream);
      console.log('🎬 Service: Fallback video tracks:', stream.getVideoTracks().length);
      console.log('🎬 Service: Fallback audio tracks:', stream.getAudioTracks().length);
      return stream;
    } catch (error) {
      console.error('🎬 Service: Fallback webcam stream also failed:', error);
      throw new Error(`Screen capture not supported and webcam fallback failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private getMediaRecorderOptions(settings: RecordingSettings): MediaRecorderOptions {
    console.log('🎬 Service: Building MediaRecorder options for:', {
      enableScreen: settings.enableScreen,
      enableWebcam: settings.enableWebcam,
      enableAudio: settings.enableAudio
    });

    // Determine the appropriate MIME type based on what we're recording
    let mimeType = 'video/webm;codecs=vp9,opus'; // Default for video + audio
    
    if (settings.enableWebcam && !settings.enableAudio) {
      mimeType = 'video/webm;codecs=vp9'; // Video only
    } else if (!settings.enableWebcam && settings.enableAudio) {
      mimeType = 'audio/webm;codecs=opus'; // Audio only
    }

    // Check if the browser supports our preferred MIME type
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      console.warn('🎬 Service: Preferred MIME type not supported:', mimeType);
      
      // Fallback options
      const fallbackTypes = [
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'audio/webm;codecs=opus',
        'audio/webm'
      ];
      
      for (const fallbackType of fallbackTypes) {
        if (MediaRecorder.isTypeSupported(fallbackType)) {
          mimeType = fallbackType;
          console.log('🎬 Service: Using fallback MIME type:', mimeType);
          break;
        }
      }
    }

    const options: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond: settings.enableWebcam ? 1000000 : undefined, // Conservative bitrate
      audioBitsPerSecond: settings.enableAudio ? 128000 : undefined
    };

    console.log('🎬 Service: MediaRecorder options:', options);
    return options;
  }

  private setupMediaRecorderHandlers(): void {
    if (!this.mediaRecorder) return;

    console.log('🎬 Service: Setting up MediaRecorder handlers');

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
        console.log('🎬 Service: Data chunk received, size:', event.data.size, 'Total chunks:', this.chunks.length);
      }
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('🎬 Service: MediaRecorder error:', event);
      this.onError?.({
        code: 'MEDIARECORDER_ERROR',
        message: 'Recording error occurred',
        details: event.toString()
      });
    };
  }


  private cleanup(): void {
    console.log('🎬 Service: Starting cleanup...');
    console.log('🎬 Service: Cleanup - mediaRecorder before:', this.mediaRecorder);
    console.log('🎬 Service: Cleanup - mediaStream before:', this.mediaStream);

    if (this.mediaStream) {
      try {
        // Stop PiP compositing animation if it exists
        if (this.stopPiPCompositing) {
          console.log('🎬 Service: Stopping PiP compositing animation in cleanup');
          this.stopPiPCompositing();
          this.stopPiPCompositing = null;
        }
        
        this.mediaStream.getTracks().forEach(track => {
          track.stop();
          console.log('🎬 Service: Stopped track:', track.kind);
        });
      } catch (error) {
        console.error('🎬 Service: Error stopping tracks:', error);
      }
      this.mediaStream = null;
    }
    
    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state === 'recording') {
          console.log('🎬 Service: Stopping mediaRecorder in cleanup...');
          this.mediaRecorder.stop();
        }
      } catch (error) {
        console.error('🎬 Service: Error stopping media recorder:', error);
      }
      // Don't set mediaRecorder to null here - let the onstop handler do it
      // this.mediaRecorder = null;
    }
    
    this.chunks = [];
    console.log('🎬 Service: Cleanup complete - mediaRecorder after:', this.mediaRecorder);
  }

  // Static method to get available devices
  static async getAvailableDevices(): Promise<{ cameras: MediaDeviceInfo[]; microphones: MediaDeviceInfo[] }> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        cameras: devices.filter(d => d.kind === 'videoinput'),
        microphones: devices.filter(d => d.kind === 'audioinput')
      };
    } catch (error) {
      console.error('Error getting devices:', error);
      throw error;
    }
  }

  // Static method to test device
  static async testDevice(deviceId: string, kind: 'videoinput' | 'audioinput'): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {};
    
    if (kind === 'videoinput') {
      constraints.video = { deviceId: { exact: deviceId } };
    } else {
      constraints.audio = { deviceId: { exact: deviceId } };
    }

    return await navigator.mediaDevices.getUserMedia(constraints);
  }
}
