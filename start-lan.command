#!/bin/zsh
set -e

cd "${0:A:h}"

if [[ ! -d node_modules/ws ]]; then
  echo "LANサーバーの依存関係をインストールします..."
  npm install
fi

npm run lan