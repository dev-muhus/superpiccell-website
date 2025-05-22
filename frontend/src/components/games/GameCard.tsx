import Link from 'next/link';
import Image from 'next/image';
import { FaPlay, FaLock } from 'react-icons/fa';
import { GameConfig } from '@/lib/games/config';

interface GameCardProps {
  game: GameConfig;
}

export function GameCard({ game }: GameCardProps) {
  const isAvailable = !game.isComingSoon;
  
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-lg transition-transform hover:shadow-xl">
      <div className="relative">
        <div className="w-full h-48 relative">
          <Image 
            src={game.thumbnail} 
            alt={game.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        </div>
        {game.isNew && (
          <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            NEW
          </span>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-xl font-bold mb-2">{game.title}</h3>
        <p className="text-gray-600 text-sm mb-4">{game.description}</p>
        
        {isAvailable ? (
          <Link 
            href={`/dashboard/games/${game.id}`}
            className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors flex items-center justify-center"
          >
            <FaPlay className="mr-2" />
            プレイする
          </Link>
        ) : (
          <button
            disabled
            className="w-full text-center bg-gray-400 text-white py-2 px-4 rounded cursor-not-allowed flex items-center justify-center"
          >
            <FaLock className="mr-2" />
            準備中
          </button>
        )}
      </div>
    </div>
  );
} 