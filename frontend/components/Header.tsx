import React, { useState } from 'react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Super Piccell';

  const headerBgColor = process.env.NEXT_PUBLIC_HEADER_BG_COLOR || '#0077cc';
  const headerTextColor = process.env.NEXT_PUBLIC_HEADER_TEXT_COLOR || '#ffffff';

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
    <header style={{ backgroundColor: headerBgColor }} className="p-4 md:p-2 shadow-lg fixed top-0 left-0 w-full z-50">
      <div className="container mx-auto flex justify-between items-center">
        <h1 style={{ color: headerTextColor }} className="text-2xl font-bold">
          {siteName.toUpperCase()}
        </h1>

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden focus:outline-none"
          style={{ color: headerTextColor }}
        >
          MENU
        </button>

        <nav
          className={`fixed top-0 left-0 w-full h-full bg-gray-900 bg-opacity-75 transform ${
            isMenuOpen ? 'translate-y-0' : '-translate-y-full'
          } transition-transform duration-300 ease-in-out md:static md:transform-none md:bg-transparent md:flex md:flex-row md:items-center md:justify-end md:space-x-4 md:w-auto`}
        >
          {isMenuOpen && (
            <button
              onClick={closeMenu}
              className="absolute top-4 right-4 text-white text-3xl md:hidden bg-gray-700 bg-opacity-80 rounded-full p-2"
              style={{ width: '48px', height: '48px', fontSize: '24px' }}
            >
              &times;
            </button>
          )}

          <div className="container mx-auto mt-16 md:mt-0 flex flex-col items-center space-y-4 md:space-y-0 md:flex-row">
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
