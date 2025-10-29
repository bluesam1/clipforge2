import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { MediaFile } from '../types/media';

interface VideoPlayerProps {
  media: MediaFile;
}

export interface VideoPlayerRef {
  getVideoElement: () => HTMLVideoElement | null;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ media }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    getVideoElement: () => videoRef.current,
  }));

  useEffect(() => {
    if (!videoRef.current || !media.path) return;
    
    const video = videoRef.current;
    
    // Add error handler to see what's failing
    const handleError = (e: Event) => {
      console.error('Video load error:', e);
      console.error('Video error details:', video.error);
      console.error('Network state:', video.networkState);
      console.error('Ready state:', video.readyState);
    };
    
    const handleLoadedMetadata = () => {
      console.log('Video metadata loaded successfully!');
      console.log('Duration:', video.duration);
    };
    
    video.addEventListener('error', handleError);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    // Convert Windows backslashes to forward slashes for file:// URLs
    const normalizedPath = media.path.replace(/\\/g, '/');
    video.src = `file:///${normalizedPath}`;
    console.log('Video src set to:', `file:///${normalizedPath}`);
    
    return () => {
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [media.path]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <video
        ref={videoRef}
        className="max-w-full max-h-full object-contain"
        preload="auto"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
