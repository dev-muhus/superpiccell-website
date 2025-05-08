'use client';

import { useEffect, useState, useCallback } from 'react';
import Loading from './Loading';
import { createClient, Asset } from 'contentful';
import Image from 'next/image';
import Modal from './Modal';
import ProgressiveImage from './ProgressiveImage';
import { preloadImage } from '@/lib/utils';

if (!process.env.NEXT_PUBLIC_CONTENTFUL_SPACE_ID || !process.env.NEXT_PUBLIC_CONTENTFUL_ACCESS_TOKEN) {
  throw new Error("Missing required Contentful environment variables.");
}

const client = createClient({
  space: process.env.NEXT_PUBLIC_CONTENTFUL_SPACE_ID as string,
  accessToken: process.env.NEXT_PUBLIC_CONTENTFUL_ACCESS_TOKEN as string,
});

type ImageData = {
  title: string;
  url: string;
  description?: string;
};

const Gallery = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const hasMore = images.length < total;

  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchGalleryImages = useCallback(async (newSkip: number) => {
    setLoading(true);
    try {
      const response = await client.getEntries({
        content_type: process.env.NEXT_PUBLIC_CONTENTFUL_CONTENT_TYPE_GALLERY,
        include: 1,
        limit,
        skip: newSkip,
      });
      const assets = (response.includes?.Asset || []) as Asset[];
      const newImages: ImageData[] = assets
        .map((asset: Asset) => ({
          title: asset.fields.title as string,
          url: asset.fields.file ? `https:${asset.fields.file.url}` : '',
          description: asset.fields.description as string || '',
        }))
        .filter((image) => image.url);

      setImages((prevImages) => [...prevImages, ...newImages]);
      setSkip(newSkip + limit);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch gallery images:', error);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGalleryImages(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = useCallback(() => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 && hasMore && !loading) {
      fetchGalleryImages(skip);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, skip]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // 画像選択時の処理
  const handleImageSelect = useCallback(async (image: ImageData) => {
    try {
      setSelectedImage(image);
      setModalLoading(true);
      setShowModal(true);
      
      // 高解像度の画像をプリロード
      await preloadImage(image.url);
      
      // 読み込み完了
      setModalLoading(false);
    } catch (error) {
      console.error("Failed to preload gallery image:", error);
      // エラーが発生してもモーダルは表示する
      setModalLoading(false);
    }
  }, []);

  // モーダルを閉じる処理
  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    // アニメーション完了後にselectedImageをクリア
    setTimeout(() => {
      setSelectedImage(null);
    }, 300);
  }, []);

  if (loading && images.length === 0) return <Loading />;
  if (hasError || images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {images.map((image, index) => (
          <div key={index} className="text-center">
            <Image
              src={image.url}
              alt={image.title}
              width={200}
              height={200}
              className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => handleImageSelect(image)}
            />
          </div>
        ))}
      </div>
      {loading && hasMore && <Loading />}

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={selectedImage?.title}
        isLoading={modalLoading}
      >
        {selectedImage && (
          <>
            <div className="flex justify-center">
              <div className="relative w-full">
                <ProgressiveImage
                  src={selectedImage.url}
                  alt={selectedImage.title}
                  width={1200}
                  height={900}
                  className="w-full h-auto max-h-[65vh] object-contain rounded-lg shadow-md"
                  priority
                  containerClassName="flex justify-center"
                  preload={true}
                />
              </div>
            </div>
            
            {selectedImage.description && (
              <div className="mt-4 sm:mt-6 bg-gray-50 p-3 sm:p-4 rounded-lg">
                <p className="text-sm sm:text-base text-gray-700 overflow-wrap break-words">
                  {selectedImage.description}
                </p>
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
};

export default Gallery; 