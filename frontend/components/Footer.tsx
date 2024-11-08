import React from 'react';

const Footer = () => {
  const footerBgColor = process.env.NEXT_PUBLIC_FOOTER_BG_COLOR || '#333';
  const footerTextColor = process.env.NEXT_PUBLIC_FOOTER_TEXT_COLOR || '#ffffff';
  const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE || 'Super Piccell';

  return (
    <footer style={{ backgroundColor: footerBgColor, color: footerTextColor }} className="py-4">
      <p className="text-center">
        Copyright &copy; {siteTitle} {new Date().getFullYear()}
      </p>
    </footer>
  );
};

export default Footer;
