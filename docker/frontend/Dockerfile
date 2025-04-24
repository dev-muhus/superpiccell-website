# Node.js 18 LTSバージョンのAlpineイメージを使用
FROM node:18-alpine

# 必要なツールのインストール
RUN apk add --no-cache bash python3 make g++

# 環境変数
ARG PORT
ENV PORT $PORT

# 作業ディレクトリを設定
WORKDIR /frontend

# 依存関係のインストール
COPY frontend/package*.json ./
RUN npm install

# アプリケーションコードをコピー
COPY frontend .

# ポートを公開
EXPOSE ${PORT}

# コンテナを保持するためのtailコマンド
CMD ["npm", "run", "dev"]
