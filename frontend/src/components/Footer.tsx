'use client';

import React from 'react';
import { FaTwitter, FaInstagram, FaDiscord, FaYoutube } from 'react-icons/fa';

const Footer = () => {
  const footerBgColor = process.env.NEXT_PUBLIC_FOOTER_BG_COLOR || '#333';
  const footerTextColor = process.env.NEXT_PUBLIC_FOOTER_TEXT_COLOR || '#ffffff';
  const copyrightBgColor = process.env.NEXT_PUBLIC_COPYRIGHT_BG_COLOR || '#222';
  const copyrightTextColor = process.env.NEXT_PUBLIC_COPYRIGHT_TEXT_COLOR || '#aaaaaa';
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Super Piccell';

  return (
    <>
      <footer style={{ backgroundColor: footerBgColor, color: footerTextColor }} className="py-4">
        <div className="social-icons">
          <div className="flex justify-center space-x-6">
            <a
              href="https://x.com/superpiccell"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
              className="text-gray-500 hover:text-blue-500 transition-colors"
            >
              <FaTwitter size={32} />
            </a>
            <a
              href="https://www.instagram.com/superpiccell/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-gray-500 hover:text-pink-500 transition-colors"
            >
              <FaInstagram size={32} />
            </a>
            <a
              href="https://discord.com/invite/JgMv8rFcr3"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
              className="text-gray-500 hover:text-purple-500 transition-colors"
            >
              <FaDiscord size={32} />
            </a>
            <a
              href="https://www.youtube.com/channel/UCU3CoMtN1_5DyGXTefVuLRQ"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="text-gray-500 hover:text-red-500 transition-colors"
            >
              <FaYoutube size={32} />
            </a>
          </div>
        </div>
      </footer>

      <div
        className="copyright py-2 text-center"
        style={{ backgroundColor: copyrightBgColor, color: copyrightTextColor }}
      >
        <p className="text-center">
          Copyright &copy; {siteName} {new Date().getFullYear()}
        </p>
      </div>
    </>
  );
};

export default Footer; 