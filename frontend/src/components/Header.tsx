'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useScrollLock } from '@/lib/hooks/useScrollLock';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Super Piccell';
  const { isSignedIn } = useUser();
  const { lockScroll, unlockScroll } = useScrollLock();
  
  const headerBgColor = process.env.NEXT_PUBLIC_HEADER_BG_COLOR || '#0077cc';
  const headerTextColor = process.env.NEXT_PUBLIC_HEADER_TEXT_COLOR || '#ffffff';

  const handleScroll = useCallback(() => {
    // スクロール位置が10px以上なら背景色を不透明に
    setIsScrolled(window.scrollY > 10);
  }, []);
  
  useEffect(() => {
    // 初期表示時にもスクロール位置をチェック
    handleScroll();
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // メニュー表示時にスクロールをロック
  useEffect(() => {
    if (isMenuOpen) {
      lockScroll();
    } else {
      unlockScroll();
    }
    
    return () => {
      // コンポーネントアンマウント時にスクロールを解除
      unlockScroll();
    };
  }, [isMenuOpen, lockScroll, unlockScroll]);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  // Profileリンクのクリックハンドラ
  const handleProfileClick = useCallback(() => {
    closeMenu();
  }, [closeMenu]);

  return (
    <header 
      style={{ 
        backgroundColor: headerBgColor,
        boxShadow: isScrolled ? '0 2px 10px rgba(0, 0, 0, 0.1)' : 'none',
        transition: 'background-color 0.3s, box-shadow 0.3s',
      }} 
      className="p-4 md:p-2 fixed top-0 left-0 w-full z-[10000]"
    >
      <div className="container mx-auto flex justify-between items-center">
        <h1 style={{ color: headerTextColor }} className="text-xl md:text-2xl font-bold truncate">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            {siteName.toUpperCase()}
          </Link>
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
          } transition-transform duration-300 ease-in-out md:static md:transform-none md:bg-transparent md:flex md:flex-row md:items-center md:justify-end md:space-x-6 md:w-auto z-[10001]`}
          onClick={(e) => e.stopPropagation()} // イベント伝播を防止
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
                padding: 0,
                zIndex: 10002
              }}
              aria-label="メニューを閉じる"
            >
              <span style={{ marginTop: '-2px' }}>&times;</span>
            </button>
          )}

          <div className="flex flex-col justify-center items-center h-full md:h-auto md:mt-0 md:flex-row md:space-y-0 space-y-6 text-lg">
            <Link href="/#membership" onClick={closeMenu} className="hover:text-gray-300 transition-colors uppercase block py-2 px-4 w-48 md:w-auto text-center" style={{ color: headerTextColor }}>membership</Link>
            <Link href="/#about" onClick={closeMenu} className="hover:text-gray-300 transition-colors uppercase block py-2 px-4 w-48 md:w-auto text-center" style={{ color: headerTextColor }}>about</Link>
            <Link href="/#character" onClick={closeMenu} className="hover:text-gray-300 transition-colors uppercase block py-2 px-4 w-48 md:w-auto text-center" style={{ color: headerTextColor }}>character</Link>
            <Link href="/#core" onClick={closeMenu} className="hover:text-gray-300 transition-colors uppercase block py-2 px-4 w-48 md:w-auto text-center" style={{ color: headerTextColor }}>core</Link>
            <Link href="/#embryo" onClick={closeMenu} className="hover:text-gray-300 transition-colors uppercase block py-2 px-4 w-48 md:w-auto text-center" style={{ color: headerTextColor }}>embryo</Link>
            <Link href="/#gallery" onClick={closeMenu} className="hover:text-gray-300 transition-colors uppercase block py-2 px-4 w-48 md:w-auto text-center" style={{ color: headerTextColor }}>gallery</Link>
            
            {/* 認証ボタン */}
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:ml-4 mt-4 md:mt-0">
              {!isSignedIn ? (
                <>
                  {/* モバイル表示時は独立ボタン */}
                  <div className="md:hidden flex flex-col space-y-4">
                    <SignInButton mode="modal">
                      <Button variant="outline" className="w-48">
                        Sign In
                      </Button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <Button className="w-48">
                        Sign Up
                      </Button>
                    </SignUpButton>
                  </div>
                  
                  {/* PC表示時は一体型ボタン */}
                  <div className="hidden md:flex overflow-hidden rounded-md">
                    <SignInButton mode="modal">
                      <Button variant="outline" className="rounded-r-none">
                        Sign In
                      </Button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <Button className="rounded-l-none">
                        Sign Up
                      </Button>
                    </SignUpButton>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link 
                    href="/dashboard" 
                    onClick={handleProfileClick}
                  >
                    <Button 
                      variant="default"
                      className="bg-white text-blue-600 hover:bg-gray-100 hover:text-blue-800"
                    >
                      DASHBOARD
                    </Button>
                  </Link>
                  <UserButton 
                    appearance={{
                      elements: {
                        avatarBox: "w-10 h-10",
                        userButtonPopoverCard: "w-[240px]",
                        userButtonPopoverActions: "p-2",
                        userButtonPopoverActionButton: "px-4 py-2 rounded-md hover:bg-gray-100 transition-colors",
                        userButtonPopoverActionButtonText: "text-sm font-medium"
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
