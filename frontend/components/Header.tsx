'use client';

import React, { useState, useEffect } from 'react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Super Piccell';

  const headerBgColor = process.env.NEXT_PUBLIC_HEADER_BG_COLOR || '#0077cc';
  const headerTextColor = process.env.NEXT_PUBLIC_HEADER_TEXT_COLOR || '#ffffff';

  useEffect(() => {
    const handleScroll = () => {
      // スクロール位置が10px以上なら背景色を不透明に
      setIsScrolled(window.scrollY > 10);
    };
    
    // 初期表示時にもスクロール位置をチェック
    handleScroll();
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // メニュー表示時にbodyのスクロールを無効化
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  const smoothScroll = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, targetId: string) => {
    e.preventDefault();

    const target = document.getElementById(targetId);
    if (target) {
      const headerHeight = document.querySelector('header')?.clientHeight || 0;
      const offsetTop = target.offsetTop - headerHeight - 20;

      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth',
      });

      closeMenu();
    }
  };

  return (
    <header 
      style={{ 
        backgroundColor: headerBgColor,
        boxShadow: isScrolled ? '0 2px 10px rgba(0, 0, 0, 0.1)' : 'none',
        transition: 'background-color 0.3s, box-shadow 0.3s',
      }} 
      className="p-4 md:p-2 fixed top-0 left-0 w-full z-[9000]"
    >
      <div className="container mx-auto flex justify-between items-center">
        <h1 style={{ color: headerTextColor }} className="text-xl md:text-2xl font-bold truncate">
          {siteName.toUpperCase()}
        </h1>

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden focus:outline-none uppercase font-bold px-2 py-1"
          style={{ color: headerTextColor }}
          aria-label="メニューを開く"
        >
          MENU
        </button>

        <nav
          className={`fixed top-0 left-0 w-full h-full bg-gray-900 bg-opacity-90 transform ${
            isMenuOpen ? 'translate-y-0' : '-translate-y-full'
          } transition-transform duration-300 ease-in-out md:static md:transform-none md:bg-transparent md:flex md:flex-row md:items-center md:justify-end md:space-x-4 md:w-auto z-[9999]`}
        >
          {isMenuOpen && (
            <button
              onClick={closeMenu}
              className="absolute top-4 right-4 text-white md:hidden bg-gray-700 bg-opacity-80 rounded-full flex items-center justify-center"
              style={{ 
                width: '48px', 
                height: '48px', 
                fontSize: '28px',
                lineHeight: '0', 
                padding: 0
              }}
              aria-label="メニューを閉じる"
            >
              <span style={{ marginTop: '-2px' }}>&times;</span>
            </button>
          )}

          <div className="flex flex-col justify-center items-center h-full md:h-auto md:mt-0 md:flex-row md:space-y-0 space-y-6 text-lg">
            <a href="#membership" onClick={(e) => smoothScroll(e, 'membership')} className="hover:text-gray-300 transition-colors uppercase" style={{ color: headerTextColor }}>membership</a>
            <a href="#about" onClick={(e) => smoothScroll(e, 'about')} className="hover:text-gray-300 transition-colors uppercase" style={{ color: headerTextColor }}>about</a>
            <a href="#character" onClick={(e) => smoothScroll(e, 'character')} className="hover:text-gray-300 transition-colors uppercase" style={{ color: headerTextColor }}>character</a>
            <a href="#core" onClick={(e) => smoothScroll(e, 'core')} className="hover:text-gray-300 transition-colors uppercase" style={{ color: headerTextColor }}>core</a>
            <a href="#embryo" onClick={(e) => smoothScroll(e, 'embryo')} className="hover:text-gray-300 transition-colors uppercase" style={{ color: headerTextColor }}>embryo</a>
            <a href="#gallery" onClick={(e) => smoothScroll(e, 'gallery')} className="hover:text-gray-300 transition-colors uppercase" style={{ color: headerTextColor }}>gallery</a>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
