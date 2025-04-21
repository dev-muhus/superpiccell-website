'use client';

import React, { useState, useEffect } from 'react';
import { createClient, Asset } from 'contentful';
import Image from 'next/image';
import Loading from './Loading';
import Modal from './Modal';

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
              className="w-full rounded-full cursor-pointer"
              onClick={() => setSelectedCharacter(character)}
            />
          </div>
        ))}
      </div>

      <Modal
        isOpen={selectedCharacter !== null}
        onClose={() => setSelectedCharacter(null)}
        title={selectedCharacter?.name}
      >
        {selectedCharacter && (
          <>
            <Image
              src={selectedCharacter.image}
              alt={selectedCharacter.name}
              width={500}
              height={500}
              className="w-full rounded-lg mb-4"
              priority
            />
            <div>
              <p className="mt-4 text-center">{selectedCharacter.description}</p>
              <p className="mt-4 text-sm text-gray-500 whitespace-pre-line">
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
