import React, { useState, useEffect } from 'react';
import { useRecordingStore } from '../stores/recordingStore';
import { RecordingSettings } from '../types/recording';
import { SourcePicker } from './SourcePicker';
import { DevicePicker } from './DevicePicker';
import { PreviewCanvas } from './PreviewCanvas';
import { RecordingIndicator } from './RecordingIndicator';

export const RecordingPanel: React.FC = () => {
  const {
    isRecordingPanelOpen,
    settings,
    isRecording,
    isPaused,
    selectedSource,
    selectedCamera,
    selectedMicrophone,
    availableCameras,
    availableMicrophones,
    setRecordingPanelOpen,
    setSettings,
    setSelectedSource,
    setSelectedCamera,
    setSelectedMicrophone,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    loadDevices,
    loadSources,
    initializeOutputFolder,
    stagedRecordings,
    processStagedRecordings
  } = useRecordingStore();

  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  useEffect(() => {
    if (isRecordingPanelOpen) {
      loadDevices();
      loadSources();
      initializeOutputFolder();
    } else {
      // Process staged recordings when panel closes
      if (stagedRecordings.length > 0) {
        console.log('🎬 RecordingPanel: Panel closing, processing staged recordings...');
        processStagedRecordings();
      }
    }
  }, [isRecordingPanelOpen, loadDevices, loadSources, initializeOutputFolder, stagedRecordings.length, processStagedRecordings]);

  // Handle auto-selection when recording panel closes (temporarily disabled for debugging)
  // useEffect(() => {
  //   if (!isRecordingPanelOpen && recordingState.status === 'stopped' && recordingState.outputPath) {
  //     // Auto-select the recorded file in the timeline
  //     setTimeout(() => {
  //       try {
  //         // Import the media store and select the recorded file
  //         import('../stores/mediaStore').then(({ useMediaStore }) => {
  //           const mediaStore = useMediaStore.getState();
  //           // Find the media item by path and select it
  //           const mediaItems = mediaStore.media;
  //           const recordedItem = mediaItems.find(item => item.path === recordingState.outputPath);
  //           if (recordedItem) {
  //             mediaStore.selectMedia(recordedItem.id);
  //             console.log('🎬 Auto-selected recorded file:', recordedItem.name);
  //           }
  //         });
  //       } catch (error) {
  //         console.error('Failed to auto-select recorded file:', error);
  //       }
  //     }, 1000); // Small delay to ensure import is complete
  //   }
  // }, [isRecordingPanelOpen, recordingState.status, recordingState.outputPath]);

  const handleToggleChange = (key: keyof Pick<RecordingSettings, 'enableScreen' | 'enableWebcam' | 'enableAudio'>) => {
    setSettings({ [key]: !settings[key] });
  };


  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };


  const handleStopRecording = async () => {
    try {
      console.log('🛑 RecordingPanel: handleStopRecording called');
      await stopRecording();
      console.log('🛑 RecordingPanel: stopRecording completed');
    } catch (error) {
      console.error('🛑 RecordingPanel: Failed to stop recording:', error);
    }
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };


  if (!isRecordingPanelOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Recording</h2>
          <button
            onClick={() => setRecordingPanelOpen(false)}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Recording Controls - Moved to Top */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            {/* Left Side - Save & Close Button */}
            <button
              onClick={() => setRecordingPanelOpen(false)}
              className="px-6 py-3 rounded-lg text-white font-bold shadow-md transition-all duration-200 ease-in-out bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transform hover:scale-105"
            >
              Save & Close
            </button>

          {/* Right Side - Recording Controls */}
          <div className="flex items-center space-x-3">
            <button
                onClick={() => setIsPreviewActive(!isPreviewActive)}
                className={`px-6 py-3 rounded-lg text-white font-bold shadow-md transition-all duration-200 ease-in-out ${
                  isPreviewActive
                    ? 'bg-slate-600 hover:bg-slate-700 active:bg-slate-800 transform hover:scale-105'
                    : 'bg-green-600 hover:bg-green-700 active:bg-green-800 transform hover:scale-105'
                }`}
              >
                {isPreviewActive ? 'Stop Preview' : 'Start Preview'}
              </button>
              
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  disabled={!canStartRecording()}
                  className={`px-6 py-3 rounded-lg text-white font-bold shadow-md transition-all duration-200 ease-in-out ${
                    canStartRecording()
                      ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transform hover:scale-105'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Start Recording
                </button>
              ) : (
                <div className="flex items-center space-x-2 text-gray-600">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse"></div>
                    <span className="text-sm font-medium">Recording in progress...</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Use the controls in the top-right corner
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left Panel - Controls */}
          <div className="w-1/3 p-6 border-r border-gray-200 flex flex-col space-y-6 overflow-y-auto">
            {/* Advanced Settings - Expandable */}
            <div className="space-y-4">
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Recording Settings</span>
                </div>
                <svg 
                  className={`w-4 h-4 text-gray-500 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAdvancedSettings && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  {/* Quality */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                    <select
                      value={settings.quality || 'medium'}
                      onChange={(e) => {
                        const quality = e.target.value as 'high' | 'medium' | 'low';
                        const qualitySettings = {
                          high: { bitrate: 5000000, framerate: 30, resolution: '1080p' as const },
                          medium: { bitrate: 2500000, framerate: 30, resolution: '720p' as const },
                          low: { bitrate: 1000000, framerate: 24, resolution: '480p' as const }
                        };
                        setSettings({ 
                          quality, 
                          ...qualitySettings[quality]
                        });
                      }}
                      className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="high">High (1080p, 5 Mbps, 30 fps)</option>
                      <option value="medium">Medium (720p, 2.5 Mbps, 30 fps)</option>
                      <option value="low">Low (480p, 1 Mbps, 24 fps)</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    {/* Resolution */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Resolution</label>
                      <select
                        value={settings.resolution || '720p'}
                        onChange={(e) => setSettings({ resolution: e.target.value as 'source' | '1080p' | '720p' | '480p' })}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="source">Source</option>
                        <option value="1080p">1080p</option>
                        <option value="720p">720p</option>
                        <option value="480p">480p</option>
                      </select>
                    </div>

                    {/* Bitrate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bitrate</label>
                      <select
                        value={settings.bitrate || 2500000}
                        onChange={(e) => setSettings({ bitrate: parseInt(e.target.value) })}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={1000000}>1 Mbps</option>
                        <option value={2500000}>2.5 Mbps</option>
                        <option value={5000000}>5 Mbps</option>
                        <option value={8000000}>8 Mbps</option>
                      </select>
                    </div>

                    {/* Framerate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Framerate</label>
                      <select
                        value={settings.framerate || 30}
                        onChange={(e) => setSettings({ framerate: parseInt(e.target.value) })}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={24}>24 fps</option>
                        <option value={30}>30 fps</option>
                        <option value={60}>60 fps</option>
                      </select>
                    </div>

                    {/* PiP Settings for Screen + Webcam */}
                    {settings.enableScreen && settings.enableWebcam && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">PiP Position</label>
                          <select
                            value={settings.pipPosition || 'bottom-right'}
                            onChange={(e) => setSettings({ pipPosition: e.target.value as any })}
                            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="top-left">Top Left</option>
                            <option value="top-right">Top Right</option>
                            <option value="bottom-left">Bottom Left</option>
                            <option value="bottom-right">Bottom Right</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">PiP Size</label>
                          <select
                            value={settings.pipSize || 'medium'}
                            onChange={(e) => setSettings({ pipSize: e.target.value as any })}
                            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                          </select>
                        </div>
                      </>
                    )}

                    {/* Output Format */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Output Format</label>
                      <select
                        value={settings.outputFormat || 'webm'}
                        onChange={(e) => setSettings({ outputFormat: e.target.value as 'webm' | 'mp4' })}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="webm">WebM (VP9)</option>
                        <option value="mp4">MP4 (H.264)</option>
                      </select>
                    </div>

                    {/* Output Folder */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Output Folder</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={settings.outputFolder || ''}
                          onChange={(e) => setSettings({ outputFolder: e.target.value })}
                          placeholder="Default: project/media/recordings"
                          className="flex-1 p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            // TODO: Implement folder picker
                            console.log('Folder picker not implemented yet');
                          }}
                          className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
                        >
                          Browse
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Staged Recordings */}
            {stagedRecordings.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Staged Recordings</label>
                  <span className="text-xs text-gray-500">{stagedRecordings.length} pending</span>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {stagedRecordings.map((recording) => (
                    <div key={recording.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-blue-900 truncate">
                            Recording {new Date(recording.timestamp).toLocaleTimeString()}
                          </p>
                          <p className="text-xs text-blue-600">
                            {Math.round(recording.duration / 1000)}s • {(recording.fileSize / 1024 / 1024).toFixed(1)}MB
                          </p>
                        </div>
                        <div className="ml-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  These will be converted to MP4 and imported when you close this panel.
                </p>
              </div>
            )}

            {/* Recording Types - Reordered */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">What to Record</label>
              <div className="space-y-4">
                {/* Webcam - First */}
                <div>
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableWebcam}
                      onChange={() => handleToggleChange('enableWebcam')}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">📹</span>
                        <span className="text-sm font-medium text-gray-900">Webcam</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Record your camera</p>
                    </div>
                  </label>
                  {settings.enableWebcam && (
                    <div className="mt-2 ml-7">
                      <DevicePicker
                        devices={availableCameras}
                        selectedDevice={selectedCamera}
                        onSelect={setSelectedCamera}
                        label="Select Camera"
                        showCamera={true}
                        showMicrophone={false}
                        selectedCamera={selectedCamera}
                        selectedMicrophone={null}
                        onCameraSelect={setSelectedCamera}
                        onMicrophoneSelect={() => {}}
                      />
                    </div>
                  )}
                </div>

                {/* Audio - Second */}
                <div>
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableAudio}
                      onChange={() => handleToggleChange('enableAudio')}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">🎤</span>
                        <span className="text-sm font-medium text-gray-900">Audio</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Record microphone audio</p>
                    </div>
                  </label>
                  {settings.enableAudio && (
                    <div className="mt-2 ml-7">
                      <DevicePicker
                        devices={availableMicrophones}
                        selectedDevice={selectedMicrophone}
                        onSelect={setSelectedMicrophone}
                        label="Select Microphone"
                        showCamera={false}
                        showMicrophone={true}
                        selectedCamera={null}
                        selectedMicrophone={selectedMicrophone}
                        onCameraSelect={() => {}}
                        onMicrophoneSelect={setSelectedMicrophone}
                      />
                    </div>
                  )}
                </div>

                {/* Screen - Third */}
                <div>
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableScreen}
                      onChange={() => handleToggleChange('enableScreen')}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">🖥️</span>
                        <span className="text-sm font-medium text-gray-900">Screen</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Record your screen or window</p>
                    </div>
                  </label>
                  {settings.enableScreen && (
                    <div className="mt-2 ml-7">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => {
                              console.log('Manual refresh sources...');
                              loadSources();
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            Refresh
                          </button>
                        </div>
                        <SourcePicker
                          selectedSource={selectedSource}
                          onSourceSelect={setSelectedSource}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>



          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 p-6 flex flex-col">
            {/* Recording Mode Indicator */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-900 mb-1">Recording Mode:</div>
              <div className="text-xs text-blue-700">
                {settings.enableScreen && settings.enableWebcam ? (
                  <span className="font-semibold">Screen + Webcam (PiP Overlay)</span>
                ) : settings.enableScreen ? (
                  <span>Screen Only</span>
                ) : settings.enableWebcam ? (
                  <span>Webcam Only</span>
                ) : settings.enableAudio ? (
                  <span>Audio Only</span>
                ) : (
                  <span className="text-red-600">No recording type selected</span>
                )}
              </div>
              {settings.enableScreen && settings.enableWebcam && (
                <div className="text-xs text-blue-600 mt-1">
                  PiP Position: {settings.pipPosition || 'bottom-right'} | 
                  Size: {settings.pipSize || 'medium'}
                </div>
              )}
            </div>
            
            <div className="flex-1 min-h-0">
              <PreviewCanvas
                isActive={isPreviewActive}
                enableScreen={settings.enableScreen}
                enableWebcam={settings.enableWebcam}
                enableAudio={settings.enableAudio}
                selectedSource={selectedSource}
                selectedCamera={selectedCamera}
                pipSettings={{
                  position: settings.pipPosition || 'bottom-right',
                  size: settings.pipSize || 'medium',
                  opacity: 1.0,
                  border: true,
                  borderColor: '#ffffff'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <RecordingIndicator
          isPaused={isPaused}
          onPauseResume={handlePauseResume}
          onStop={handleStopRecording}
        />
      )}
    </div>
  );

  function canStartRecording(): boolean {
    // At least one recording type must be enabled
    if (!settings.enableScreen && !settings.enableWebcam && !settings.enableAudio) {
      return false;
    }

    // Check required devices for enabled types
    if (settings.enableScreen && !selectedSource) return false;
    if (settings.enableWebcam && !selectedCamera) return false;
    if (settings.enableAudio && !selectedMicrophone) return false;

    return true;
  }
};
