/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    'postcss-import': {},  // 追加
    'tailwindcss': {},     // 必須
    'autoprefixer': {},    // 必須
  },
};

export default config;
