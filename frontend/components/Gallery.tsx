'use client';

import { useEffect, useState } from 'react';
import Loading from './Loading';
import { createClient, Asset } from 'contentful';
import Image from 'next/image';

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

  const fetchGalleryImages = async (newSkip: number) => {
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
  };

  useEffect(() => {
    fetchGalleryImages(0);
  }, []);

  const handleScroll = () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 && hasMore && !loading) {
      fetchGalleryImages(skip);
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading, skip]);

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
              className="w-full rounded-lg cursor-pointer"
              onClick={() => setSelectedImage(image)}
            />
          </div>
        ))}
      </div>
      {loading && hasMore && <Loading />}

      {selectedImage && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-white rounded-lg p-8 max-w-xl w-full relative overflow-y-auto max-h-screen"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-600 text-3xl font-bold bg-gray-200 rounded-full"
              onClick={() => setSelectedImage(null)}
              style={{
                cursor: 'pointer',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              &times;
            </button>
            {selectedImage.title && <h3 className="text-2xl font-bold text-center mb-6">{selectedImage.title}</h3>}
            <Image
              src={selectedImage.url}
              alt={selectedImage.title}
              width={500}
              height={500}
              className="w-full rounded-lg mb-4"
            />
            {selectedImage.description && (
              <p className="text-sm text-gray-500 overflow-wrap break-words">
                {selectedImage.description}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Gallery;
