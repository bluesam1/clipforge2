import React, { useRef } from 'react';
import { useMediaStore } from '../stores/mediaStore';
import VideoPlayer, { VideoPlayerRef } from './VideoPlayer';
import PlaybackControls from './PlaybackControls';

const PreviewPlayer: React.FC = () => {
  const { currentPreview } = useMediaStore();
  const videoPlayerRef = useRef<VideoPlayerRef | null>(null);

  return (
    <div className="flex flex-col h-full">
      {/* Video Player Area */}
      <div className="flex-1 flex items-center justify-center bg-black">
        {currentPreview ? (
          <VideoPlayer ref={videoPlayerRef} media={currentPreview} />
        ) : (
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-xl font-medium mb-2">No video selected</p>
            <p className="text-sm">Select a video from the media library to preview</p>
          </div>
        )}
      </div>

      {/* Playback Controls */}
      {currentPreview && (
        <div className="bg-gray-800 p-4">
          <PlaybackControls media={currentPreview} videoRef={videoPlayerRef} />
        </div>
      )}
    </div>
  );
};

export default PreviewPlayer;
