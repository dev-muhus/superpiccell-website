'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image, { ImageProps } from 'next/image';
import { preloadImage } from '@/lib/utils';

interface ProgressiveImageProps extends Omit<ImageProps, 'src' | 'alt'> {
  src: string;
  alt: string;
  placeholderSrc?: string;
  containerClassName?: string;
  onLoad?: () => void;
  preload?: boolean;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  placeholderSrc = '/image/no-image.png',
  containerClassName = '',
  className,
  onLoad,
  preload = false,
  ...rest
}) => {
  const [mainImgLoaded, setMainImgLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadImage = useCallback(async () => {
    if (!src) {
      setError(true);
      setLoading(false);
      return;
    }

    try {
      await preloadImage(src);
      setMainImgLoaded(true);
      setLoading(false);
      if (onLoad) onLoad();
    } catch (err) {
      console.error('Image load error:', err);
      setError(true);
      setLoading(false);
    }
  }, [src, onLoad]);

  useEffect(() => {
    if (preload) {
      loadImage();
    } else {
      // プリロードが無効の場合は表示されたときに読み込む
      const img = new globalThis.Image();
      img.src = src;
      
      img.onload = () => {
        setMainImgLoaded(true);
        setLoading(false);
        if (onLoad) onLoad();
      };
      
      img.onerror = () => {
        setError(true);
        setLoading(false);
      };
      
      return () => {
        img.onload = null;
        img.onerror = null;
      };
    }
  }, [src, onLoad, preload, loadImage]);

  return (
    <div className={`relative ${containerClassName}`}>
      {/* 常にプレースホルダー画像を表示 */}
      <Image
        src={placeholderSrc}
        alt={alt}
        className={`${className || ''} transition-all duration-500 absolute inset-0 ${
          mainImgLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        {...rest}
      />
      
      {/* メイン画像 - 読み込み完了後に表示 */}
      {mainImgLoaded && (
        <Image
          src={src}
          alt={alt}
          className={`${className || ''} transition-all duration-500 opacity-100`}
          {...rest}
        />
      )}
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-[1px] z-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      )}
      
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
          <p className="text-sm text-red-500 font-medium px-2 py-1 bg-white/80 rounded">
            画像の読み込みに失敗しました
          </p>
        </div>
      )}
    </div>
  );
};

export default ProgressiveImage; 