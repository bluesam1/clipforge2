import React from 'react';
import MediaLibrary from './MediaLibrary';
import PreviewPlayer from './PreviewPlayer';
import { Timeline } from './Timeline';
import ToastContainer from './Toast';

const AppShell: React.FC = () => {
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Top Panel - Preview Player */}
      <div className="flex-1 bg-gray-900 flex min-h-0">
        {/* Left Panel - Media Library */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full min-h-0">
          <MediaLibrary />
        </div>

        {/* Center Panel - Preview Player */}
        <div className="flex-1 bg-gray-900 flex flex-col min-h-0">
          <PreviewPlayer />
        </div>

        {/* Right Panel - Inspector (Placeholder) */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full min-h-0">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inspector</h3>
            <div className="text-gray-500 text-sm">
              <p>Media properties and settings will appear here.</p>
              <p className="mt-2">This panel will be implemented in Phase 2.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel - Timeline */}
      <div className="flex-shrink-0" style={{ height: '240px' }}>
        <Timeline />
      </div>

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
};

export default AppShell;
