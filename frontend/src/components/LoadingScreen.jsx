import React from 'react';

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-white">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-6"></div>
        <h2 className="text-2xl font-bold mb-4">{message}</h2>
        <p className="text-gray-300">Please wait while we process your request...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;