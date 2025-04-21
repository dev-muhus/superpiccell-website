'use client';

import { useState, useEffect } from 'react';

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
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'style') {
          const bodyStyle = document.body.style;
          setIsMenuOpen(bodyStyle.overflow === 'hidden');
        }
      });
    });

    observer.observe(document.body, { attributes: true });

    return () => observer.disconnect();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    isVisible && !isMenuOpen && (
      <button
        onClick={scrollToTop}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          width: '3.5rem',
          height: '3.5rem',
          backgroundColor: bgColor,
          color: textColor,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
          fontSize: '1rem',
          cursor: 'pointer',
          transition: 'transform 0.2s',
          zIndex: 9000,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        TOP
      </button>
    )
  );
};

export default ScrollToTopButton;
