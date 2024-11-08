import React from 'react';

const Loading = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-xl text-gray-800">
      <p>Loading...</p>
      <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin"></div>
    </div>
  );
};

export default Loading;
