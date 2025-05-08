'use client';

import { useState, useEffect } from 'react';
import { FaChevronUp } from 'react-icons/fa';

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const bgColor = process.env.NEXT_PUBLIC_SCROLL_BUTTON_BG_COLOR || '#2563eb';
  const textColor = process.env.NEXT_PUBLIC_SCROLL_BUTTON_TEXT_COLOR || '#ffffff';

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 100);
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const checkMenuState = () => {
      const bodyStyle = document.body.style;
      setIsMenuOpen(
        bodyStyle.overflow === 'hidden' || 
        bodyStyle.position === 'fixed'
      );
    };

    checkMenuState();

    const observer = new MutationObserver(() => {
      checkMenuState();
    });

    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['style'] 
    });

    const intervalId = setInterval(checkMenuState, 300);

    return () => {
      observer.disconnect();
      clearInterval(intervalId);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  return (
    isVisible && !isMenuOpen && (
      <button
        onClick={scrollToTop}
        className="scroll-to-top-btn"
        aria-label="ページトップへスクロール"
        style={{
          backgroundColor: bgColor,
          color: textColor,
        }}
      >
        <FaChevronUp className="icon" />
        <style jsx>{`
          .scroll-to-top-btn {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            width: 3.5rem;
            height: 3.5rem;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            cursor: pointer;
            z-index: 9000;
            border: none;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            opacity: 0.9;
            animation: fadeIn 0.5s ease-in-out;
          }

          .scroll-to-top-btn:hover {
            transform: translateY(-5px);
            box-shadow: 0 7px 14px rgba(0, 0, 0, 0.25);
            opacity: 1;
          }

          .scroll-to-top-btn:active {
            transform: translateY(-2px);
          }

          .icon {
            font-size: 1.2rem;
            animation: pulse 2s infinite;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 0.9;
              transform: translateY(0);
            }
          }

          @keyframes pulse {
            0% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-3px);
            }
            100% {
              transform: translateY(0);
            }
          }
        `}</style>
      </button>
    )
  );
};

export default ScrollToTopButton; 