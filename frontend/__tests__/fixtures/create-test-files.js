/**
 * テスト用のサンプルファイルを作成するスクリプト
 */
const fs = require('fs');
const path = require('path');

const FIXTURES_DIR = path.join(__dirname);

// 1x1ピクセルの透明なPNG画像（最小サイズ）
const BASE64_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// 最小の動画ファイル（実際はMP4フォーマットですが、テスト用に小さいサイズで作成）
// 実際のテストでは、内容よりもファイル形式が重要
const MINIMAL_MP4_HEADER = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 
  0x6d, 0x70, 0x34, 0x32, 0x00, 0x00, 0x00, 0x00, 
  0x6d, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6f, 0x6d
]);

// テスト用のディレクトリがなければ作成
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

// テスト用の画像ファイルを作成
function createTestImage() {
  const imagePath = path.join(FIXTURES_DIR, 'sample-image.png');
  const imageData = Buffer.from(BASE64_PNG, 'base64');
  fs.writeFileSync(imagePath, imageData);
  console.log(`テスト用画像ファイルを作成しました: ${imagePath}`);
}

// テスト用の動画ファイルを作成
function createTestVideo() {
  const videoPath = path.join(FIXTURES_DIR, 'sample-video.mp4');
  fs.writeFileSync(videoPath, MINIMAL_MP4_HEADER);
  console.log(`テスト用動画ファイルを作成しました: ${videoPath}`);
}

// ファイルを作成
createTestImage();
createTestVideo();

console.log('テスト用のサンプルファイルを作成しました。'); 