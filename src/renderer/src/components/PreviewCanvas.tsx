import React, { useEffect, useRef, useState } from 'react';
import { DesktopCapturerSource, MediaDevice, PiPSettings } from '../types/recording';

interface PreviewCanvasProps {
  isActive: boolean;
  enableScreen: boolean;
  enableWebcam: boolean;
  enableAudio: boolean;
  selectedSource?: DesktopCapturerSource | null;
  selectedCamera?: MediaDevice | null;
  pipSettings?: PiPSettings;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  isActive,
  enableScreen,
  enableWebcam,
  enableAudio,
  selectedSource,
  selectedCamera,
  pipSettings
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isActive) {
      startPreview();
    } else {
      stopPreview();
    }

    return () => {
      stopPreview();
    };
  }, [isActive, enableScreen, enableWebcam, enableAudio, selectedSource, selectedCamera]);

  const startPreview = async () => {
    try {
      setError(null);
      
      if (enableScreen) {
        await startScreenPreview();
      }
      
      if (enableWebcam) {
        await startWebcamPreview();
      }
      
      if (enableAudio && !enableScreen && !enableWebcam) {
        await startAudioPreview();
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError(err instanceof Error ? err.message : 'Preview failed');
    }
  };

  const startScreenPreview = async () => {
    if (!selectedSource) return;

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSource.id,
          }
        } as any
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      throw new Error('Failed to access screen');
    }
  };

  const startWebcamPreview = async () => {
    if (!selectedCamera) return;

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: { exact: selectedCamera.deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 16/9 }
        }
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setWebcamStream(newStream);
      
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = newStream;
        webcamVideoRef.current.play();
      }
    } catch (err) {
      throw new Error('Failed to access camera');
    }
  };

  const startAudioPreview = async () => {
    // For audio-only mode, we don't need visual preview
    // Just show a microphone icon or waveform
  };

  const stopPreview = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const drawFrame = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const webcamVideo = webcamVideoRef.current;
    
    if (!canvas || !isActive) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (enableScreen && video && video.videoWidth > 0) {
      // Draw screen capture
      const aspectRatio = video.videoWidth / video.videoHeight;
      let drawWidth = canvas.width;
      let drawHeight = canvas.height;
      
      if (aspectRatio > canvas.width / canvas.height) {
        drawHeight = canvas.width / aspectRatio;
      } else {
        drawWidth = canvas.height * aspectRatio;
      }
      
      const x = (canvas.width - drawWidth) / 2;
      const y = (canvas.height - drawHeight) / 2;
      
      ctx.drawImage(video, x, y, drawWidth, drawHeight);
    }

    if (enableWebcam && webcamVideo && webcamVideo.videoWidth > 0) {
      // If screen is also enabled, draw webcam as PiP overlay
      if (enableScreen && video) {
        // Draw webcam as PiP overlay
        if (pipSettings) {
          const pipSize = pipSettings.size === 'small' ? 240 : pipSettings.size === 'medium' ? 320 : 480;
          const videoAspectRatio = webcamVideo.videoWidth / webcamVideo.videoHeight;
          const pipHeight = pipSize / videoAspectRatio; // Maintain aspect ratio
          
          let x = 20;
          let y = 20;
          
          if (pipSettings.position.includes('right')) {
            x = canvas.width - pipSize - 20;
          }
          if (pipSettings.position.includes('bottom')) {
            y = canvas.height - pipHeight - 20;
          }
          
          // Draw webcam with border
          if (pipSettings.border) {
            ctx.strokeStyle = pipSettings.borderColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 2, y - 2, pipSize + 4, pipHeight + 4);
          }
          
          ctx.drawImage(webcamVideo, x, y, pipSize, pipHeight);
        }
      } else {
        // Draw webcam as main content
        const videoAspectRatio = webcamVideo.videoWidth / webcamVideo.videoHeight;
        const canvasAspectRatio = canvas.width / canvas.height;
        
        let drawWidth, drawHeight, x, y;
        
        if (videoAspectRatio > canvasAspectRatio) {
          // Video is wider than canvas - fit to width
          drawWidth = canvas.width;
          drawHeight = canvas.width / videoAspectRatio;
          x = 0;
          y = (canvas.height - drawHeight) / 2;
        } else {
          // Video is taller than canvas - fit to height
          drawHeight = canvas.height;
          drawWidth = canvas.height * videoAspectRatio;
          x = (canvas.width - drawWidth) / 2;
          y = 0;
        }
        
        ctx.drawImage(webcamVideo, x, y, drawWidth, drawHeight);
      }
    }

    if (enableAudio && !enableScreen && !enableWebcam) {
      // Draw audio visualization
      ctx.fillStyle = '#4F46E5';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🎤', canvas.width / 2, canvas.height / 2 - 24);
      ctx.font = '16px Arial';
      ctx.fillText('Audio Recording', canvas.width / 2, canvas.height / 2 + 24);
    }

    animationFrameRef.current = requestAnimationFrame(drawFrame);
  };

  useEffect(() => {
    if (isActive) {
      drawFrame();
    }
  }, [isActive, stream, webcamStream, enableScreen, enableWebcam, enableAudio, pipSettings]);

  return (
    <div className="w-full h-full bg-gray-100 rounded-lg overflow-hidden relative">
      {/* Hidden video elements for streams */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="hidden"
      />
      <video
        ref={webcamVideoRef}
        autoPlay
        muted
        playsInline
        className="hidden"
      />
      
      {/* Canvas for rendering */}
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        className="w-full h-full object-contain"
        style={{ background: '#f3f4f6' }}
      />
      
      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-75 text-white">
          <div className="text-center">
            <div className="text-4xl mb-2">⚠️</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}
      
      {/* Inactive state */}
      {!isActive && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">📹</div>
            <div className="text-sm">Preview inactive</div>
            <div className="text-xs mt-1">Click "Start Preview" to begin</div>
          </div>
        </div>
      )}
      
      {/* Recording indicator */}
      {isActive && !error && (
        <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm">
          <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse"></div>
          <span>Preview Active</span>
        </div>
      )}
    </div>
  );
};
