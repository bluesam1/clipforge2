import React, { useEffect, useState, useRef } from 'react';
import { useRecordingStore } from '../stores/recordingStore';
import { MediaDevice } from '../types/recording';

interface DevicePickerProps {
  devices?: MediaDevice[];
  selectedDevice?: MediaDevice | null;
  onSelect?: (device: MediaDevice) => void;
  label?: string;
  selectedCamera: MediaDevice | null;
  selectedMicrophone: MediaDevice | null;
  onCameraSelect: (camera: MediaDevice | null) => void;
  onMicrophoneSelect: (microphone: MediaDevice | null) => void;
  showCamera: boolean;
  showMicrophone: boolean;
}

// Custom Dropdown Component with Card-Style Options
const CustomDropdown: React.FC<{
  devices: MediaDevice[];
  selectedDevice: MediaDevice | null;
  onSelect: (device: MediaDevice) => void;
  onTest: (device: MediaDevice) => void;
  isLoading: boolean;
  placeholder: string;
  icon: React.ReactNode;
}> = ({ devices, selectedDevice, onSelect, onTest, isLoading, placeholder, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all text-left flex items-center justify-between"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            {icon}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {selectedDevice ? selectedDevice.label : placeholder}
            </div>
            <div className="text-xs text-gray-500">
              {selectedDevice ? selectedDevice.deviceId.slice(0, 8) + '...' : 'Select a device'}
            </div>
          </div>
        </div>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {devices.map((device) => (
            <div
              key={device.deviceId}
              className={`p-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedDevice?.deviceId === device.deviceId ? 'bg-blue-50' : ''
              }`}
              onClick={() => {
                onSelect(device);
                setIsOpen(false);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    {icon}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {device.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {device.deviceId.slice(0, 8)}...
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTest(device);
                  }}
                  disabled={isLoading}
                  className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
          ))}
          {devices.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <div className="text-lg mb-1">🎤</div>
              <div className="text-sm">No devices found</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const DevicePicker: React.FC<DevicePickerProps> = ({
  selectedCamera,
  selectedMicrophone,
  onCameraSelect,
  onMicrophoneSelect,
  showCamera,
  showMicrophone
}) => {
  const { availableCameras, availableMicrophones, loadDevices } = useRecordingStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (availableCameras.length === 0 && availableMicrophones.length === 0) {
      loadDevices();
    }
  }, [availableCameras.length, availableMicrophones.length, loadDevices]);

  const handleCameraSelect = (camera: MediaDevice) => {
    onCameraSelect(camera);
  };

  const handleMicrophoneSelect = (microphone: MediaDevice) => {
    onMicrophoneSelect(microphone);
  };

  const testDevice = async (device: MediaDevice) => {
    try {
      setIsLoading(true);
      console.log('Testing device:', device);
      
      const constraints: MediaStreamConstraints = {};
      if (device.kind === 'videoinput') {
        constraints.video = { deviceId: { exact: device.deviceId } };
      } else {
        constraints.audio = { deviceId: { exact: device.deviceId } };
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Device test successful:', device.label);
      
      // Stop the test stream after a short delay
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        setIsLoading(false);
        console.log('Test stream stopped');
      }, 2000);
    } catch (error) {
      console.error('Device test failed:', error);
      setIsLoading(false);
      alert(`Failed to test ${device.label}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Camera Selection */}
      {showCamera && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Camera</label>
          <CustomDropdown
            devices={availableCameras}
            selectedDevice={selectedCamera}
            onSelect={handleCameraSelect}
            onTest={testDevice}
            isLoading={isLoading}
            placeholder="Select a camera..."
            icon={
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Microphone Selection */}
      {showMicrophone && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Microphone</label>
          <CustomDropdown
            devices={availableMicrophones}
            selectedDevice={selectedMicrophone}
            onSelect={handleMicrophoneSelect}
            onTest={testDevice}
            isLoading={isLoading}
            placeholder="Select a microphone..."
            icon={
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            }
          />
        </div>
      )}
    </div>
  );
};
