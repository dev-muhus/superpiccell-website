'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Gallery from '../components/Gallery';
import Character from '../components/Character';
import WalletConnector from "../components/WalletConnector";
import MultilineText from '../components/MultilineText';
import { getYouTubeEmbedUrl } from '../lib/utils';
import textContent from '../../content/textContent';
import { FaHome, FaStar, FaHeart, FaUser, FaImages, FaSmile, FaDiscord, FaBook, FaChevronDown } from 'react-icons/fa';

const overlayImageUrl = process.env.NEXT_PUBLIC_HEADER_IMAGE_URL?.startsWith('/') 
  ? process.env.NEXT_PUBLIC_HEADER_IMAGE_URL 
  : process.env.NEXT_PUBLIC_HEADER_IMAGE_URL ? `/${process.env.NEXT_PUBLIC_HEADER_IMAGE_URL}` : null;

const centeredImageUrl = process.env.NEXT_PUBLIC_OVERLAY_IMAGE_URL?.startsWith('/') 
  ? process.env.NEXT_PUBLIC_OVERLAY_IMAGE_URL 
  : process.env.NEXT_PUBLIC_OVERLAY_IMAGE_URL ? `/${process.env.NEXT_PUBLIC_OVERLAY_IMAGE_URL}` : null;

const overlayText = process.env.NEXT_PUBLIC_OVERLAY_TEXT || "Welcome to Super Piccell";

// 環境変数からプロジェクト動画URLを取得
const projectVideoUrl = process.env.NEXT_PUBLIC_PROJECT_VIDEO_URL || "";

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    
    // Intersection Observer を使って要素が表示されたらアニメーション効果を適用
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, observerOptions);

    // アニメーション対象の要素を監視
    document.querySelectorAll('.fade-in-section, .slide-in-left, .slide-in-right, .scale-in').forEach(el => {
      observer.observe(el);
    });

    return () => {
      // コンポーネントのアンマウント時にオブザーバーを解除
      observer.disconnect();
    };
  }, []);

  // YouTube埋め込みURLの取得
  const embedUrl = getYouTubeEmbedUrl(projectVideoUrl);

  return (
    <div className={`w-full transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      {/* ヒーローセクション */}
      {overlayImageUrl && (
        <div
          className="header-background relative min-h-screen flex flex-col justify-center items-center pb-16"
          style={{ 
            backgroundImage: `url(${overlayImageUrl})`,
            backgroundAttachment: 'scroll',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-black/30" aria-hidden="true"></div>
          
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
          
          <div className="absolute bottom-8 left-0 right-0 flex justify-center animate-bounce">
            <a href="#membership" aria-label="Scroll to content">
              <FaChevronDown className="text-white text-3xl" />
            </a>
          </div>
        </div>
      )}

      <main className="bg-white">
        {/* メンバーシップセクション */}
        <section id="membership" className="py-24 relative">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 uppercase fade-in-section">
                Membership
              </h2>
              <div className="flex items-center justify-center mb-6 fade-in-section">
                <div className="w-16 h-1 bg-blue-600 rounded-full"></div>
                <div className="mx-3"><FaUser className="text-blue-600 text-xl" /></div>
                <div className="w-16 h-1 bg-blue-600 rounded-full"></div>
              </div>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto fade-in-section delay-100">
                Connect your wallet to access exclusive content and join our community.
              </p>
            </div>
            
            <div className="max-w-3xl mx-auto scale-in delay-200">
              <WalletConnector />
            </div>
          </div>
        </section>

        {/* Aboutセクション */}
        <section id="about" className="py-24 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 uppercase fade-in-section">
                About
              </h2>
              <div className="flex items-center justify-center mb-6 fade-in-section">
                <div className="w-16 h-1 bg-blue-600 rounded-full"></div>
                <div className="mx-3"><FaHome className="text-blue-600 text-xl" /></div>
                <div className="w-16 h-1 bg-blue-600 rounded-full"></div>
              </div>
            </div>
            
            <div className="max-w-4xl mx-auto slide-in-left delay-100">
              <div className="bg-white p-8 rounded-xl shadow-lg">
                <p className="text-lg leading-relaxed text-gray-700 mb-8">
                  <MultilineText text={textContent.ABOUT_TEXT} />
                </p>
                
                {/* YouTube動画の埋め込み */}
                {embedUrl && (
                  <div>
                    <div className="video-container max-w-3xl mx-auto rounded-lg overflow-hidden shadow-lg">
                      <iframe
                        src={embedUrl}
                        title="SuperPiccellコアプロジェクト概要"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      ></iframe>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* キャラクターセクション */}
        <section id="character" className="py-24">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 uppercase fade-in-section">
                Character
              </h2>
              <div className="flex items-center justify-center mb-6 fade-in-section">
                <div className="w-16 h-1 bg-blue-600 rounded-full"></div>
                <div className="mx-3"><FaSmile className="text-blue-600 text-xl" /></div>
                <div className="w-16 h-1 bg-blue-600 rounded-full"></div>
              </div>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto fade-in-section delay-100">
                Meet the characters from the Super Piccell universe.
              </p>
            </div>
            
            <div className="fade-in-section delay-200">
              <Character />
            </div>
          </div>
        </section>

        {/* Coreセクション */}
        <section id="core" className="py-24 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 uppercase fade-in-section">
                Core
              </h2>
              <div className="flex items-center justify-center mb-6 fade-in-section">
                <div className="w-16 h-1 bg-blue-600 rounded-full"></div>
                <div className="mx-3"><FaHeart className="text-blue-600 text-xl" /></div>
                <div className="w-16 h-1 bg-blue-600 rounded-full"></div>
              </div>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <div className="bg-white p-8 rounded-xl shadow-lg slide-in-right delay-100">
                <p className="text-lg leading-relaxed text-gray-700 mb-8">
                  <MultilineText text={textContent.CORE_TEXT} />
                </p>
                
                <div className="flex items-center justify-center mt-8 space-x-6 scale-in delay-300">
                  <a 
                    href="https://super-piccell.gitbook.io/core/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center transition-transform hover:scale-110"
                  >
                    <FaBook size={40} className="text-gray-600 mb-2" />
                    <span className="text-sm font-medium">Documentation</span>
                  </a>
                  <a 
                    href="https://discord.com/invite/JgMv8rFcr3" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center transition-transform hover:scale-110"
                  >
                    <FaDiscord size={40} className="text-[#7289DA] mb-2" />
                    <span className="text-sm font-medium">Join Discord</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Embryoセクション */}
        <section id="embryo" className="py-24">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 uppercase fade-in-section">
                Embryo
              </h2>
              <div className="flex items-center justify-center mb-6 fade-in-section">
                <div className="w-16 h-1 bg-blue-600 rounded-full"></div>
                <div className="mx-3"><FaStar className="text-blue-600 text-xl" /></div>
                <div className="w-16 h-1 bg-blue-600 rounded-full"></div>
              </div>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <div className="bg-white p-8 rounded-xl shadow-lg slide-in-left delay-100">
                <p className="text-lg leading-relaxed text-gray-700 mb-8">
                  <MultilineText text={textContent.EMBRYO_TEXT} />
                </p>
                
                <div className="flex items-center justify-center mt-8 space-x-6 scale-in delay-300">
                  <a 
                    href="https://super-piccell.gitbook.io/embryo/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center transition-transform hover:scale-110"
                  >
                    <FaBook size={40} className="text-gray-600 mb-2" />
                    <span className="text-sm font-medium">Documentation</span>
                  </a>
                  <a 
                    href="https://discord.com/invite/xcwpuKXKrp" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center transition-transform hover:scale-110"
                  >
                    <FaDiscord size={40} className="text-[#7289DA] mb-2" />
                    <span className="text-sm font-medium">Join Discord</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ギャラリーセクション */}
        <section id="gallery" className="py-24 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 uppercase fade-in-section">
                Gallery
              </h2>
              <div className="flex items-center justify-center mb-6 fade-in-section">
                <div className="w-16 h-1 bg-blue-600 rounded-full"></div>
                <div className="mx-3"><FaImages className="text-blue-600 text-xl" /></div>
                <div className="w-16 h-1 bg-blue-600 rounded-full"></div>
              </div>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto fade-in-section delay-100">
                Explore our collection of images and artwork.
              </p>
            </div>
            
            <div className="fade-in-section delay-200">
              <Gallery />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
} 