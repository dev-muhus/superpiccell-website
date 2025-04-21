'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Gallery from '../../components/Gallery';
import Character from '../../components/Character';
import WalletConnector from "../../components/WalletConnector";
import ScrollToTopButton from '../../components/ScrollToTopButton';
import MultilineText from '../../components/MultilineText';
import textContent from '../../content/textContent';
import { FaHome, FaStar, FaHeart, FaUser, FaImages, FaSmile, FaDiscord, FaBook } from 'react-icons/fa';

const overlayImageUrl = process.env.NEXT_PUBLIC_HEADER_IMAGE_URL?.startsWith('/') 
  ? process.env.NEXT_PUBLIC_HEADER_IMAGE_URL 
  : process.env.NEXT_PUBLIC_HEADER_IMAGE_URL ? `/${process.env.NEXT_PUBLIC_HEADER_IMAGE_URL}` : null;

const centeredImageUrl = process.env.NEXT_PUBLIC_OVERLAY_IMAGE_URL?.startsWith('/') 
  ? process.env.NEXT_PUBLIC_OVERLAY_IMAGE_URL 
  : process.env.NEXT_PUBLIC_OVERLAY_IMAGE_URL ? `/${process.env.NEXT_PUBLIC_OVERLAY_IMAGE_URL}` : null;

const overlayText = process.env.NEXT_PUBLIC_OVERLAY_TEXT || "Welcome to Super Piccell";
const headerImageHeight = process.env.NEXT_PUBLIC_HEADER_IMAGE_HEIGHT || "400px";

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
          // 一度表示されたら監視を解除（オプション）
          // observer.unobserve(entry.target);
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

  return (
    <div className={`w-full overflow-x-hidden transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      {overlayImageUrl && (
        <div
          className="header-background"
          style={{ backgroundImage: `url(${overlayImageUrl})`, height: headerImageHeight }}
        >
          {centeredImageUrl && (
            <div className="relative w-full max-w-[300px] mx-auto">
              <Image
                src={centeredImageUrl}
                alt="Overlay Image"
                width={300}
                height={300}
                className="overlay-image"
                priority
              />
            </div>
          )}
          <div className="overlay-text">
            {overlayText}
          </div>
        </div>
      )}

      <main className="container">
        <section id="membership" className="section fade-in-section">
          <h2 className="section-title uppercase">
            membership
            <div className="section-title-icon">
              <div className="section-title-line"></div>
              <FaUser />
              <div className="section-title-line"></div>
            </div>
          </h2>
          <div className="scale-in delay-200">
            <WalletConnector />
          </div>
        </section>

        <section id="about" className="section">
          <h2 className="section-title uppercase fade-in-section">
          about
            <div className="section-title-icon">
              <div className="section-title-line"></div>
              <FaHome />
              <div className="section-title-line"></div>
            </div>
          </h2>
          <p className="mt-4 text-xl slide-in-left delay-100">
            <MultilineText text={textContent.ABOUT_TEXT} />
          </p>
        </section>

        <section id="character" className="section">
          <h2 className="section-title uppercase fade-in-section">
            character
            <div className="section-title-icon">
              <div className="section-title-line"></div>
              <FaSmile />
              <div className="section-title-line"></div>
            </div>
          </h2>
          <div className="fade-in-section delay-200">
            <Character />
          </div>
        </section>

        <section id="core" className="section">
          <h2 className="section-title uppercase fade-in-section">
            core
            <div className="section-title-icon">
              <div className="section-title-line"></div>
              <FaHeart />
              <div className="section-title-line"></div>
            </div>
          </h2>
          <p className="mt-4 text-xl slide-in-right delay-100">
            <MultilineText text={textContent.CORE_TEXT} />
          </p>
          <div className="flex items-center scale-in delay-300">
            <a href="https://super-piccell.gitbook.io/core/" target="_blank" rel="noopener noreferrer">
              <FaBook size={40} color="#5B5B5B" />
            </a>
            <a href="https://discord.com/invite/JgMv8rFcr3" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px' }}>
              <FaDiscord size={40} color="#7289DA" />
            </a>
          </div>
        </section>

        <section id="embryo" className="section">
          <h2 className="section-title uppercase fade-in-section">
          embryo
            <div className="section-title-icon">
              <div className="section-title-line"></div>
              <FaStar />
              <div className="section-title-line"></div>
            </div>
          </h2>
          <p className="mt-4 text-xl slide-in-left delay-100">
            <MultilineText text={textContent.EMBRYO_TEXT} />
          </p>
          <div className="flex items-center scale-in delay-300">
            <a href="https://super-piccell.gitbook.io/embryo/" target="_blank" rel="noopener noreferrer">
              <FaBook size={40} color="#5B5B5B" />
            </a>
            <a href="https://discord.com/invite/xcwpuKXKrp" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px' }}>
              <FaDiscord size={40} color="#7289DA" />
            </a>
          </div>
        </section>

        <section id="gallery" className="section">
          <h2 className="section-title uppercase fade-in-section">
            gallery
            <div className="section-title-icon">
              <div className="section-title-line"></div>
              <FaImages />
              <div className="section-title-line"></div>
            </div>
          </h2>
          <div className="fade-in-section delay-200">
            <Gallery />
          </div>
        </section>

        <ScrollToTopButton />
      </main>
    </div>
  );
} 