'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useScrollLock } from '@/lib/hooks/useScrollLock';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Super Piccell';
  const { isSignedIn, isLoaded } = useUser();
  const { lockScroll, unlockScroll } = useScrollLock();
  
  const headerBgColor = process.env.NEXT_PUBLIC_HEADER_BG_COLOR || '#0077cc';
  const headerTextColor = process.env.NEXT_PUBLIC_HEADER_TEXT_COLOR || '#ffffff';

  // スクロール位置の検出
  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 10);
  }, []);
  
  // 画面の向きを検出
  const checkOrientation = useCallback(() => {
    // window.innerWidth > window.innerHeightで横向きを検出
    const landscape = window.innerWidth > window.innerHeight;
    setIsLandscape(landscape);
  }, []);

  useEffect(() => {
    // 初期表示時に状態をチェック
    handleScroll();
    checkOrientation();
    
    // イベントリスナーの設定
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      // クリーンアップ
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [handleScroll, checkOrientation]);

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

        {/* PC表示時のナビゲーション - 横向きでない場合に表示 */}
        {!isLandscape && (
          <div className="hidden md:flex md:items-center md:space-x-6">
            <Link href="/#membership" className="hover:text-gray-300 transition-colors uppercase text-center" style={{ color: headerTextColor }}>membership</Link>
            <Link href="/#about" className="hover:text-gray-300 transition-colors uppercase text-center" style={{ color: headerTextColor }}>about</Link>
            <Link href="/#character" className="hover:text-gray-300 transition-colors uppercase text-center" style={{ color: headerTextColor }}>character</Link>
            <Link href="/#core" className="hover:text-gray-300 transition-colors uppercase text-center" style={{ color: headerTextColor }}>core</Link>
            <Link href="/#embryo" className="hover:text-gray-300 transition-colors uppercase text-center" style={{ color: headerTextColor }}>embryo</Link>
            <Link href="/#gallery" className="hover:text-gray-300 transition-colors uppercase text-center" style={{ color: headerTextColor }}>gallery</Link>
            
            {/* PC表示・通常向きの認証ボタン */}
            {!isLoaded ? (
              // ローディング表示
              <div className="ml-4 flex items-center space-x-3">
                <div className="w-[120px] h-10 bg-gray-200 animate-pulse rounded-md"></div>
                <div className="w-10 h-10 bg-gray-200 animate-pulse rounded-full"></div>
              </div>
            ) : !isSignedIn ? (
              // 未ログイン時の表示
              <div className="ml-4 flex overflow-hidden rounded-md">
                <SignInButton mode="modal">
                  <Button variant="outline" className="rounded-r-none h-10">
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button className="rounded-l-none h-10">
                    Sign Up
                  </Button>
                </SignUpButton>
              </div>
            ) : (
              // ログイン済みの表示
              <div className="ml-4 flex items-center space-x-3">
                <Link href="/dashboard" onClick={handleProfileClick}>
                  <Button 
                    variant="default"
                    className="bg-white text-blue-600 hover:bg-gray-100 hover:text-blue-800 h-10"
                  >
                    DASHBOARD
                  </Button>
                </Link>
                <div className="h-10 flex items-center">
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
              </div>
            )}
          </div>
        )}

        {/* モバイル・横向き用メニューボタン */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`${isLandscape ? '' : 'md:hidden'} focus:outline-none uppercase font-bold px-2 py-1`}
          style={{ color: headerTextColor }}
          aria-label="メニューを開く"
        >
          MENU
        </button>

        {/* メニューモーダル */}
        <div 
          className={`fixed inset-0 bg-gray-900 bg-opacity-90 transform transition-transform duration-300 ease-in-out z-[10001] ${
            isMenuOpen ? 'translate-y-0' : '-translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 閉じるボタン - スタイル修正 */}
          {isMenuOpen && (
            <button
              onClick={closeMenu}
              className="absolute top-4 right-4 text-white bg-gray-700 bg-opacity-80 rounded-full flex items-center justify-center"
              style={{ 
                width: '40px', 
                height: '40px', 
                padding: 0,
                zIndex: 10002
              }}
              aria-label="メニューを閉じる"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="feather feather-x"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}

          {/* メニュー内容 - スクロール可能なコンテナ (パディング調整) */}
          <div className="menu-container h-full overflow-y-auto">
            <div className="flex flex-col items-center justify-start pt-16 pb-24">
              <Link href="/#membership" onClick={closeMenu} className="menu-link hover:text-gray-300 transition-colors uppercase block py-2 px-4 w-48 text-center text-white">membership</Link>
              <Link href="/#about" onClick={closeMenu} className="menu-link hover:text-gray-300 transition-colors uppercase block py-2 px-4 w-48 text-center text-white">about</Link>
              <Link href="/#character" onClick={closeMenu} className="menu-link hover:text-gray-300 transition-colors uppercase block py-2 px-4 w-48 text-center text-white">character</Link>
              <Link href="/#core" onClick={closeMenu} className="menu-link hover:text-gray-300 transition-colors uppercase block py-2 px-4 w-48 text-center text-white">core</Link>
              <Link href="/#embryo" onClick={closeMenu} className="menu-link hover:text-gray-300 transition-colors uppercase block py-2 px-4 w-48 text-center text-white">embryo</Link>
              <Link href="/#gallery" onClick={closeMenu} className="menu-link hover:text-gray-300 transition-colors uppercase block py-2 px-4 w-48 text-center text-white">gallery</Link>
              
              {/* 認証ボタン */}
              <div className="flex flex-col items-center space-y-4 mt-4">
                {!isLoaded ? (
                  // ログイン状態確認中のスケルトンローディング
                  <div className="flex items-center space-x-3">
                    <div className="w-[120px] h-10 bg-gray-200 animate-pulse rounded-md"></div>
                    <div className="w-10 h-10 bg-gray-200 animate-pulse rounded-full"></div>
                  </div>
                ) : !isSignedIn ? (
                  <>
                    <SignInButton mode="modal">
                      <Button variant="outline" className="w-48 h-10">
                        Sign In
                      </Button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <Button className="w-48 h-10">
                        Sign Up
                      </Button>
                    </SignUpButton>
                  </>
                ) : (
                  <div className="flex flex-col items-center space-y-4">
                    <Link 
                      href="/dashboard" 
                      onClick={handleProfileClick}
                    >
                      <Button 
                        variant="default"
                        className="bg-white text-blue-600 hover:bg-gray-100 hover:text-blue-800 h-10 w-48"
                      >
                        DASHBOARD
                      </Button>
                    </Link>
                    <div className="h-10 flex items-center">
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* グローバルスタイル */}
      <style jsx global>{`
        /* メニューコンテナの基本スタイル */
        .menu-container {
          display: flex;
          flex-direction: column;
          padding: 0;
        }
        
        /* メニューリンクの間隔 */
        .menu-link {
          margin-bottom: 0.75rem;
        }
        
        /* 縦表示時のスタイル */
        @media (orientation: portrait) {
          .menu-container > div {
            padding-top: 3.5rem;
            padding-bottom: 6rem;
          }
        }
        
        /* 横表示時のスタイル */
        @media (orientation: landscape) {
          .menu-container > div {
            padding-top: 1rem;
            padding-bottom: 4rem;
          }
          
          /* スクロールバーのスタイリング */
          .menu-container::-webkit-scrollbar {
            width: 8px;
          }
          
          .menu-container::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
          }
          
          .menu-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
          }
          
          .menu-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
          }
        }
      `}</style>
    </header>
  );
};

export default Header;
