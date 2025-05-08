import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * クラス名をマージするユーティリティ関数
 * clsxとtailwind-mergeを組み合わせて使いやすくしたもの
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 指定されたURLの画像をプリロードする関数
 * @param src 画像のURL
 * @returns Promise<HTMLImageElement> - 読み込まれた画像要素
 */
export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('Invalid image source'));
      return;
    }

    const img = new Image();
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    
    img.src = src;
  });
}

/**
 * 複数の画像を並行してプリロードする関数
 * @param sources 画像URLの配列
 * @returns Promise<HTMLImageElement[]> - 読み込まれた画像要素の配列
 */
export function preloadImages(sources: string[]): Promise<HTMLImageElement[]> {
  const validSources = sources.filter(src => !!src);
  return Promise.all(validSources.map(src => preloadImage(src)));
}

/**
 * 特定の要素が表示領域内に入っているかチェックする関数
 * @param element チェック対象のHTML要素
 * @returns boolean - 要素が表示領域内にあればtrue
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
} 