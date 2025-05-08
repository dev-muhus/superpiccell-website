'use client';

import React from 'react';
import Image from 'next/image';
import { FaFilePdf, FaFileAlt, FaFileAudio, FaFileVideo, FaFileArchive, FaFileCode } from 'react-icons/fa';

interface ContentRendererProps {
  text: string;
  className?: string;
}

const ContentRenderer: React.FC<ContentRendererProps> = ({ text, className = '' }) => {
  return (
    <div className={`content-wrapper ${className}`}>
      <div className="content-inner w-full overflow-hidden">
        {renderContent(text)}
      </div>
      <style jsx>{`
        .content-wrapper {
          position: relative;
          padding: 0.5rem 0;
          width: 100%;
          overflow-wrap: break-word;
          word-wrap: break-word;
          word-break: break-word;
        }
        .content-inner {
          position: relative;
          z-index: 2;
        }
      `}</style>
    </div>
  );
};

// コンテンツを解析してレンダリング
const renderContent = (text: string): React.ReactNode => {
  if (!text) return null;
  
  return (
    <>
      {text.split('\n').map((line, lineIndex) => (
        <React.Fragment key={lineIndex}>
          {renderLineWithLinks(line)}
          {lineIndex < text.split('\n').length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
};

// 1行のテキストからリンクを検出して処理
const renderLineWithLinks = (line: string): React.ReactNode[] => {
  if (!line) return [];
  
  // URLを検出する正規表現
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // 結果を保持する配列
  const result: React.ReactNode[] = [];
  
  // URLを含まない場合はテキストをそのまま返す
  if (!line.match(urlRegex)) {
    return [<span key="text-only">{line}</span>];
  }
  
  // テキストの開始位置
  let lastIndex = 0;
  
  // URLを検索して処理
  let match;
  let matchIndex = 0;
  
  while ((match = urlRegex.exec(line)) !== null) {
    const url = match[0];
    const matchStart = match.index;
    const matchEnd = matchStart + url.length;
    
    // URL前のテキスト部分があれば追加
    if (matchStart > lastIndex) {
      const textBefore = line.substring(lastIndex, matchStart);
      result.push(<span key={`text-${matchIndex}-before`}>{textBefore}</span>);
    }
    
    // URLをリンクとして追加
    try {
      result.push(
        <span className="link-wrapper" key={`link-${matchIndex}`} onClick={(e) => e.stopPropagation()}>
          <LinkRenderer url={url} />
        </span>
      );
    } catch {
      // URL処理でエラーが発生した場合は通常のテキストとして表示
      result.push(<span key={`text-error-${matchIndex}`}>{url}</span>);
    }
    
    // 次の検索開始位置を更新
    lastIndex = matchEnd;
    matchIndex++;
  }
  
  // 最後のURL以降のテキスト部分があれば追加
  if (lastIndex < line.length) {
    const textAfter = line.substring(lastIndex);
    result.push(<span key={`text-${matchIndex}-after`}>{textAfter}</span>);
  }
  
  return result;
};

// リンクをレンダリングするサブコンポーネント
const LinkRenderer: React.FC<{ url: string }> = ({ url }) => {
  // URLからファイルタイプを判別
  const getFileType = (url: string): string => {
    // URL末尾またはクエリパラメータ前の拡張子を抽出
    const extension = url.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase();
    if (!extension) return 'unknown';
    return extension;
  };

  const fileType = getFileType(url);
  
  // 画像の場合
  if (/^(jpg|jpeg|png|gif|webp|svg)$/i.test(fileType)) {
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="block my-2 relative z-10 max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-md overflow-hidden max-w-full" style={{ maxWidth: '100%', maxHeight: '300px' }}>
          <Image
            src={url}
            alt="画像"
            width={300}
            height={200}
            className="object-contain max-h-[300px] max-w-full"
            unoptimized={true}
            onError={(e) => {
              // 画像読み込みエラー時は通常のリンクとして表示
              const imgElement = e.currentTarget;
              imgElement.style.display = 'none';
              
              // 親要素にエラーメッセージを表示
              const parent = imgElement.parentElement;
              if (parent) {
                const errorText = document.createElement('div');
                errorText.className = 'text-red-500 text-sm py-2';
                errorText.textContent = '画像の読み込みに失敗しました';
                parent.appendChild(errorText);
              }
            }}
          />
        </div>
      </a>
    );
  }
  
  // PDFの場合
  else if (fileType === 'pdf') {
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="inline-flex items-center text-blue-500 bg-blue-50 rounded-md px-3 py-2 my-1 hover:bg-blue-100 transition-colors z-10 break-all max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <FaFilePdf className="mr-2 flex-shrink-0" />
        <span className="underline truncate">{decodeURIComponent(url.split('/').pop() || 'PDF文書')}</span>
      </a>
    );
  }
  
  // 音声ファイルの場合
  else if (/^(mp3|wav|ogg|m4a)$/i.test(fileType)) {
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="inline-flex items-center text-purple-500 bg-purple-50 rounded-md px-3 py-2 my-1 hover:bg-purple-100 transition-colors z-10 break-all max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <FaFileAudio className="mr-2 flex-shrink-0" />
        <span className="underline truncate">{decodeURIComponent(url.split('/').pop() || '音声ファイル')}</span>
      </a>
    );
  }
  
  // 動画ファイルの場合
  else if (/^(mp4|webm|avi|mov|wmv)$/i.test(fileType)) {
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="inline-flex items-center text-red-500 bg-red-50 rounded-md px-3 py-2 my-1 hover:bg-red-100 transition-colors z-10 break-all max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <FaFileVideo className="mr-2 flex-shrink-0" />
        <span className="underline truncate">{decodeURIComponent(url.split('/').pop() || '動画ファイル')}</span>
      </a>
    );
  }
  
  // コードや開発関連ファイル
  else if (/^(js|ts|jsx|tsx|py|java|php|html|css|json|xml)$/i.test(fileType)) {
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="inline-flex items-center text-green-500 bg-green-50 rounded-md px-3 py-2 my-1 hover:bg-green-100 transition-colors z-10 break-all max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <FaFileCode className="mr-2 flex-shrink-0" />
        <span className="underline truncate">{decodeURIComponent(url.split('/').pop() || 'コードファイル')}</span>
      </a>
    );
  }
  
  // 圧縮ファイル
  else if (/^(zip|rar|tar|gz|7z)$/i.test(fileType)) {
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="inline-flex items-center text-orange-500 bg-orange-50 rounded-md px-3 py-2 my-1 hover:bg-orange-100 transition-colors z-10 break-all max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <FaFileArchive className="mr-2 flex-shrink-0" />
        <span className="underline truncate">{decodeURIComponent(url.split('/').pop() || '圧縮ファイル')}</span>
      </a>
    );
  }
  
  // HTMLファイルの特別な処理
  else if (fileType === 'html') {
    const fileName = decodeURIComponent(url.split('/').pop() || 'HTMLファイル');
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="inline-flex items-center text-blue-500 bg-blue-50 rounded-md px-3 py-2 my-1 hover:bg-blue-100 transition-colors z-10 break-all max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <FaFileAlt className="mr-2 flex-shrink-0" />
        <span className="underline truncate">{fileName}</span>
      </a>
    );
  }
  
  // その他のファイルや一般的なURL
  else {
    // URLからファイル名部分を抽出
    const fileName = decodeURIComponent(url.split('/').pop() || url);
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-blue-500 underline inline-block relative z-10 break-all max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {fileName}
      </a>
    );
  }
};

export default ContentRenderer; 