import Gallery from '../../components/Gallery';
import Character from '../../components/Character';
import WalletConnector from "../../components/WalletConnector";
import ScrollToTopButton from '../../components/ScrollToTopButton';
import MultilineText from '../../components/MultilineText';
import textContent from '../../content/textContent';
import { FaHome, FaStar, FaHeart, FaUser, FaImages, FaSmile, FaDiscord, FaBook } from 'react-icons/fa';

const overlayImageUrl = process.env.NEXT_PUBLIC_HEADER_IMAGE_URL || null;
const centeredImageUrl = process.env.NEXT_PUBLIC_OVERLAY_IMAGE_URL || null;
const overlayText = process.env.NEXT_PUBLIC_OVERLAY_TEXT || "Welcome to Super Piccell";
const headerImageHeight = process.env.NEXT_PUBLIC_HEADER_IMAGE_HEIGHT || "400px";

export default function Home() {
  return (
    <div>
      {overlayImageUrl && (
        <div
          className="header-background"
          style={{ backgroundImage: `url(${overlayImageUrl})`, height: headerImageHeight }}
        >
          {centeredImageUrl && (
            <img
              src={centeredImageUrl}
              alt="Overlay Image"
              className="overlay-image"
            />
          )}
          <div className="overlay-text">
            {overlayText}
          </div>
        </div>
      )}

      <main className="container">
        <section id="membership" className="section">
          <h2 className="section-title">
            MEMBERSHIP
            <div className="section-title-icon">
              <div className="section-title-line"></div>
              <FaUser />
              <div className="section-title-line"></div>
            </div>
          </h2>
          <WalletConnector />
        </section>

        <section id="about" className="section">
          <h2 className="section-title">
            ABOUT
            <div className="section-title-icon">
              <div className="section-title-line"></div>
              <FaHome />
              <div className="section-title-line"></div>
            </div>
          </h2>
          <p className="mt-4">
            <MultilineText text={textContent.ABOUT_TEXT} />
          </p>
        </section>

        <section id="character" className="section">
          <h2 className="section-title">
            CHARACTER
            <div className="section-title-icon">
              <div className="section-title-line"></div>
              <FaSmile />
              <div className="section-title-line"></div>
            </div>
          </h2>
          <Character />
        </section>

        <section id="core" className="section">
          <h2 className="section-title">
            CORE
            <div className="section-title-icon">
              <div className="section-title-line"></div>
              <FaHeart />
              <div className="section-title-line"></div>
            </div>
          </h2>
          <p className="mt-4">
            <MultilineText text={textContent.CORE_TEXT} />
          </p>
          <div className="flex items-center">
            <a href="https://super-piccell.gitbook.io/core/" target="_blank" rel="noopener noreferrer">
              <FaBook size={40} color="#5B5B5B" />
            </a>
            <a href="https://discord.com/invite/JgMv8rFcr3" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px' }}>
              <FaDiscord size={40} color="#7289DA" />
            </a>
          </div>
        </section>

        <section id="embryo" className="section">
          <h2 className="section-title">
            EMBRYO
            <div className="section-title-icon">
              <div className="section-title-line"></div>
              <FaStar />
              <div className="section-title-line"></div>
            </div>
          </h2>
          <p className="mt-4">
            <MultilineText text={textContent.EMBRYO_TEXT} />
          </p>
          <div className="flex items-center">
            <a href="https://super-piccell.gitbook.io/embryo/" target="_blank" rel="noopener noreferrer">
              <FaBook size={40} color="#5B5B5B" />
            </a>
            <a href="https://discord.com/invite/xcwpuKXKrp" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px' }}>
              <FaDiscord size={40} color="#7289DA" />
            </a>
          </div>
        </section>

        <section id="gallery" className="section">
          <h2 className="section-title">
            GALLERY
            <div className="section-title-icon">
              <div className="section-title-line"></div>
              <FaImages />
              <div className="section-title-line"></div>
            </div>
          </h2>
          <Gallery />
        </section>

        <ScrollToTopButton />
      </main>
    </div>
  );
}
