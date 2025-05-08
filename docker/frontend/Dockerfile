# Node.js 18 LTSバージョンのAlpineイメージを使用
FROM node:18-alpine

# 必要なツールのインストール
RUN apk add --no-cache bash python3 make g++ curl

# ngrokのインストール
RUN curl -Lo ngrok.zip https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.zip && \
    unzip ngrok.zip -d /usr/local/bin && \
    rm ngrok.zip

# wait-for-itスクリプトのインストール
RUN curl -Lo /usr/local/bin/wait-for-it.sh \
    https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh && \
    chmod +x /usr/local/bin/wait-for-it.sh

# 環境変数
ARG PORT
ENV PORT $PORT

# 作業ディレクトリを設定
WORKDIR /frontend

# 依存関係のインストール
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

# アプリケーションコードをコピー
COPY frontend .

# ポートを公開
EXPOSE ${PORT}

# DB待機してから起動
CMD ["bash", "-c", "/usr/local/bin/wait-for-it.sh test-db:5432 -- npm run dev"]
