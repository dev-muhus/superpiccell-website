'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient, Asset } from 'contentful';
import Image from 'next/image';
import Loading from './Loading';
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

interface CharacterProps {
  name: string;
  thumbnail: string;
  image: string;
  description?: string;
  profile: string;
}

const Character = () => {
  const [characters, setCharacters] = useState<CharacterProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterProps | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const response = await client.getEntries({
          content_type: process.env.NEXT_PUBLIC_CONTENTFUL_CONTENT_TYPE_CHARACTER as string,
        });
    
        const assetMap: Record<string, string> = {};
        response.includes?.Asset?.forEach((asset: Asset) => {
          assetMap[asset.sys.id] = `https:${asset.fields.file?.url}`;
        });
    
        const items: CharacterProps[] = response.items.map((item) => {
          const fields = item.fields as {
            name?: string;
            thumbnail?: { sys: { id: string } };
            image?: { sys: { id: string } };
            description?: string;
            profile?: string;
          };
    
          const noImagePath: string = "/image/no-image.png";
          return {
            name: fields.name || "Unknown Name",
            thumbnail:
              (fields.thumbnail?.sys?.id && assetMap[fields.thumbnail.sys.id]) ||
              noImagePath,
            image:
              (fields.image?.sys?.id && assetMap[fields.image.sys.id]) ||
              noImagePath,
            description: fields.description || "",
            profile: fields.profile || "No profile available",
          };
        });
    
        setCharacters(items);
      } catch (error) {
        console.error("Failed to fetch characters:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchCharacters();
  }, []);

  // キャラクター選択時の処理
  const handleCharacterSelect = useCallback(async (character: CharacterProps) => {
    try {
      setSelectedCharacter(character);
      setModalLoading(true);
      setShowModal(true);
      
      // 高解像度の画像をプリロード
      await preloadImage(character.image);
      
      // 読み込み完了
      setModalLoading(false);
    } catch (error) {
      console.error("Failed to preload character image:", error);
      // エラーが発生してもモーダルは表示する
      setModalLoading(false);
    }
  }, []);

  // モーダルを閉じる処理
  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    // アニメーション完了後にselectedCharacterをクリア
    setTimeout(() => {
      setSelectedCharacter(null);
    }, 300);
  }, []);

  if (loading) return <Loading />;
  if (error || characters.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {characters.map((character, index) => (
          <div key={index} className="text-center">
            <Image
              src={character.thumbnail}
              alt={character.name}
              width={200}
              height={200}
              className="w-full rounded-full cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => handleCharacterSelect(character)}
            />
          </div>
        ))}
      </div>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={selectedCharacter?.name}
        isLoading={modalLoading}
      >
        {selectedCharacter && (
          <>
            <div className="mb-6">
              <div className="relative mx-auto max-w-lg">
                <ProgressiveImage
                  src={selectedCharacter.image}
                  alt={selectedCharacter.name}
                  width={800}
                  height={800}
                  className="w-full h-auto object-contain rounded-lg shadow-md"
                  priority
                  containerClassName="aspect-square"
                  preload={true}
                />
              </div>
            </div>
            
            {selectedCharacter.description && (
              <p className="text-base sm:text-lg text-center mb-6">{selectedCharacter.description}</p>
            )}
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm sm:text-base text-gray-700 whitespace-pre-line">
                {selectedCharacter.profile.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
              </p>
            </div>
          </>
        )}
      </Modal>
    </>
  );
};

export default Character; 