#!/bin/zsh
# Finder からも、必ずこのプロジェクトを対象にする。
cd "${0:A:h}" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  print -u2 'Node.js 20 以上をインストールしてから、もう一度実行してください。'
  result=1
else
  node scripts/publish.mjs "$@"
  result=$?
fi
if [[ -t 0 && "${VRS_PUBLISH_NO_PAUSE:-0}" != 1 ]]; then
  print ''
  read '?Enter キーで閉じます…'
fi
exit "$result"
