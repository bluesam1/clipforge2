import React from 'react';

interface ImportButtonProps {
  onImport: () => void;
  isLoading?: boolean;
}

const ImportButton: React.FC<ImportButtonProps> = ({ onImport, isLoading = false }) => {
  return (
    <button
      onClick={onImport}
      disabled={isLoading}
      className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Importing...
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Import Media
        </>
      )}
    </button>
  );
};

export default ImportButton;
