import { useEffect, useState } from 'react';

export interface GameControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
}

export const useGameControls = () => {
  const [keys, setKeys] = useState<GameControls>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false
  });
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // keyCodeではなくkeyを使用
      switch(e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          setKeys(keys => ({ ...keys, forward: true }));
          break;
        case 's':
        case 'arrowdown':
          setKeys(keys => ({ ...keys, backward: true }));
          break;
        case 'a':
        case 'arrowleft':
          setKeys(keys => ({ ...keys, left: true }));
          break;
        case 'd':
        case 'arrowright':
          setKeys(keys => ({ ...keys, right: true }));
          break;
        case ' ': // スペースキー
          setKeys(keys => ({ ...keys, jump: true }));
          break;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      switch(e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          setKeys(keys => ({ ...keys, forward: false }));
          break;
        case 's':
        case 'arrowdown':
          setKeys(keys => ({ ...keys, backward: false }));
          break;
        case 'a':
        case 'arrowleft':
          setKeys(keys => ({ ...keys, left: false }));
          break;
        case 'd':
        case 'arrowright':
          setKeys(keys => ({ ...keys, right: false }));
          break;
        case ' ': // スペースキー
          setKeys(keys => ({ ...keys, jump: false }));
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  return keys;
}; 