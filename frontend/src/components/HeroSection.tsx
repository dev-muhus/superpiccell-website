'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { FaChevronDown } from 'react-icons/fa';
import { useVideoLoader } from '@/hooks/useVideoLoader';

interface HeroSectionProps {
  overlayImageUrl: string | null;
  centeredImageUrl: string | null;
  overlayText: string;
  videoUrl?: string | null;
}

export default function HeroSection({ 
  overlayImageUrl, 
  centeredImageUrl, 
  overlayText,
  videoUrl
}: HeroSectionProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  // Video loader hook
  const { isVideoReady, hasError, videoRef } = useVideoLoader(videoUrl || '');

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Show video when ready and no reduced motion preference
  useEffect(() => {
    console.log('Video state:', { videoUrl, isVideoReady, hasError, prefersReducedMotion });
    if (isVideoReady && !hasError && !prefersReducedMotion) {
      // Small delay for smoother transition
      const timer = setTimeout(() => {
        setShowVideo(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [videoUrl, isVideoReady, hasError, prefersReducedMotion]);

  if (!overlayImageUrl) return null;

  return (
    <div className="header-background relative min-h-screen flex flex-col justify-center items-center pb-16">
      {/* Static image background (always shown initially) */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          showVideo ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          backgroundImage: `url(${overlayImageUrl})`,
          backgroundAttachment: 'scroll',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      {/* Video background (fades in when ready) */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          showVideo ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster={overlayImageUrl}
          aria-label="Super Piccell background video"
        >
          <source src={videoUrl || ''} type="video/mp4" />
          {/* Fallback message for browsers that don't support video */}
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30" aria-hidden="true"></div>
      
      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 sm:px-6 flex flex-col items-center">
        {centeredImageUrl && (
          <div className="mt-16 sm:mt-8 mb-8 w-full max-w-[180px] sm:max-w-xs md:max-w-sm">
            <Image
              src={centeredImageUrl}
              alt="Overlay Image"
              width={300}
              height={300}
              className="w-full h-auto animate-float"
              priority
              sizes="(max-width: 480px) 150px, (max-width: 768px) 200px, 300px"
              quality={90}
            />
          </div>
        )}
        
        <h1 className="text-white text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-6 animate-fadeIn">
          {overlayText}
        </h1>
        
        <div className="mt-8">
          <a 
            href="#membership" 
            className="bg-white/90 hover:bg-white text-blue-600 font-semibold py-3 px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Start Exploring
          </a>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center animate-bounce">
        <a href="#membership" aria-label="Scroll to content">
          <FaChevronDown className="text-white text-3xl" />
        </a>
      </div>
    </div>
  );
}