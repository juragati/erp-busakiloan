import React from 'react';

const LoadingOverlay = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center max-w-xs text-center">
        {/* <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-blue-600 mb-3"></div> */}
        
        <div className="flex space-x-2 mb-3 justify-center items-center h-10">
          <div className="h-2.5 w-2.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="h-2.5 w-2.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-2.5 w-2.5 bg-blue-600 rounded-full animate-bounce"></div>
        </div>
        
        <p className="text-base font-medium text-gray-800">Memproses data...</p>
        <p className="text-xs text-gray-400 mt-1">Mohon tunggu sebentar</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;