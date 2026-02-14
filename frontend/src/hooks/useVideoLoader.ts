import { useState, useEffect, useRef } from 'react';

interface UseVideoLoaderReturn {
  isVideoReady: boolean;
  hasError: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
}

/**
 * Custom hook to manage video loading state
 * Detects when video is ready to play and handles errors
 */
export function useVideoLoader(videoSrc: string): UseVideoLoaderReturn {
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    // Reset states when video source changes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsVideoReady(false);
    setHasError(false);

    const handleCanPlayThrough = () => {
      console.log('Video ready to play:', videoSrc);
      setIsVideoReady(true);
      setHasError(false);
    };

    const handleError = () => {
      console.error('Video failed to load:', videoSrc);
      setHasError(true);
      setIsVideoReady(false);
    };

    const handleLoadedData = () => {
      console.log('Video loaded data:', videoSrc);
    };

    // Add event listeners
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('error', handleError);
    video.addEventListener('loadeddata', handleLoadedData);

    // Check if video is already ready (cached)
    if (video.readyState >= 4) {
      handleCanPlayThrough();
    }

    // Start loading the video
    video.load();

    // Cleanup
    return () => {
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [videoSrc]);

  return {
    isVideoReady,
    hasError,
    videoRef,
  };
}