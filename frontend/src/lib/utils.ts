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
 * YouTubeのURLからビデオIDを抽出する関数
 * @param url YouTubeのURL（youtu.beやyoutube.comなど様々な形式に対応）
 * @returns string - 抽出されたビデオID、無効なURLの場合は空文字
 */
export function extractYouTubeVideoId(url: string): string {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
}

/**
 * YouTubeの埋め込み用URLを生成する関数
 * @param url YouTubeの動画URL
 * @param options オプション（autoplay, controls, loopなど）
 * @returns string - 埋め込み用のURL、無効なURLの場合は空文字
 */
export function getYouTubeEmbedUrl(url: string, options?: { autoplay?: boolean }): string {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return '';
  
  let embedUrl = `https://www.youtube.com/embed/${videoId}`;
  
  // オプションの処理
  if (options) {
    const params = new URLSearchParams();
    if (options.autoplay) params.append('autoplay', '1');
    
    if (params.toString()) {
      embedUrl += `?${params.toString()}`;
    }
  }
  
  return embedUrl;
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

/**
 * ユーザー名からハッシュ値を生成する関数
 * @param username ユーザー名
 * @returns number - ハッシュ値（正の整数）
 */
export function hashUsername(username: string): number {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * ハッシュ値から色コードを生成する関数
 * @param hash ハッシュ値
 * @returns string - HSL形式の色コード
 */
export function generateColorFromHash(hash: number): string {
  // 明るく鮮やかな色となるよう、HSL色空間を使用
  // 色相（0-360）はハッシュから直接生成
  const hue = hash % 360;
  // 彩度は70-90%で固定（鮮やかな色にするため）
  const saturation = 70 + (hash % 20);
  // 明度は50-65%で固定（暗すぎず明るすぎない色にするため）
  const lightness = 50 + (hash % 15);
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * ユーザー名からグラデーション背景スタイルを生成する関数
 * @param username ユーザー名
 * @returns React.CSSProperties - CSSスタイルオブジェクト
 */
export function generateProfileBackgroundStyle(username: string): React.CSSProperties {
  const hash = hashUsername(username);
  const mainColor = generateColorFromHash(hash);
  // 2つ目の色は少し明るめに
  const secondColor = generateColorFromHash(hash + 40);
  
  return {
    background: `linear-gradient(135deg, ${mainColor} 0%, ${secondColor} 100%)`,
  };
} 