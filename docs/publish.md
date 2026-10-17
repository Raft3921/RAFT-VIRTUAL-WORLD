# 一括公開

プロジェクト直下の **`publish.command` をダブルクリック**します。Terminal が開き、途中経過と結果を表示します。終了後は Enter で閉じられます。

このコマンドは、無視対象を除いた**作業ツリーの全変更をまとめてコミット**します。公開したくない編集中の変更がある場合は、先に分けてください。

## 初回に必要なもの

- Node.js 20 以上と npm。
- Git のコミット用ユーザー名・メールと、`origin` へ push できる認証。
- この Cloudflare アカウントの Worker を公開できるログイン。

公開用 Wrangler は `package.json` / lockfile に `4.149.0` を固定しています。未インストールならコマンドが `npm ci` で導入します。Cloudflare のログインが必要な場合は、このフォルダーの Terminal で以下を実行します。

```sh
npm ci
npx wrangler login
```

認証情報をコードや引き継ぎ文書に貼り付ける必要はありません。GitHub Actions の API は公開情報を読みます。API 制限がある場合は、既存の `GH_TOKEN` / `GITHUB_TOKEN` 環境変数も利用できます。値は公開記録に保存しません。

## 自動で行うこと

1. 対象フォルダー、`main`、正しい `origin`、未解決競合がないことを確認し、`origin/main` を fetch。リモートが先行・分岐していれば止まります。自動 merge/rebase/force push はしません。
2. 日本時間の公開番号を発行。`dist/build-info.js`、`release.json`、`index.html`、`sync-protocol.js` のラベルと、変更されたファイル・読み込み元のキャッシュ用クエリを更新。通信プロトコル番号は変更しません。
3. `git add --all`、コミット、`git push origin main`。
4. 固定した Wrangler で `worker/wrangler.jsonc` を公開。Worker の `/version` がそのコミット・公開番号になったことを待ちます。
5. そのコミットの GitHub Pages ワークフローの成功を待ちます。観測された標準の `pages build and deployment` も成功が必要です。
6. 実際に配信された `release.json` の番号を確認し、ゲーム URL を表示します。

ゲームのテスト、構文チェック、検証用ビルド、ブラウザ起動や実機確認は行いません。Worker の公開に必要なバンドル処理と配信メタデータの確認だけを実行します。

公開中は二重起動を防ぎます。Git/Worker/Pages は別サービスなので、一方が成功して他方が失敗する場合があります。**全段階が揃うまでは「公開完了」と表示しません。** 自動的に過去の公開へ戻す処理はありません。

## Terminal で使う場合

```sh
./publish.command --message "変更内容"
```

Enter 待ちをしない実行は以下です。Codex もこれを使います。

```sh
VRS_PUBLISH_NO_PAUSE=1 ./publish.command --message "変更内容"
```

または `npm run publish:world -- --message "変更内容"` でも同じ処理を行います。

## 失敗した場合

Terminal の「失敗段階」を読み、原因を直します。認証不足、push 競合、API 制限、配信待ちの時間切れなどは成功扱いにしません。

既にコミットした現在の内容を、番号を変えずに再公開する場合：

```sh
VRS_PUBLISH_NO_PAUSE=1 ./publish.command --resume
```

`--resume` は作業ツリーが未変更の場合だけ実行できます。ソースも直した場合は通常実行すると、新しい番号・コミットで公開します。リモートが先行している場合は、内容を確認してから通常の Git 手順で取り込んでください。

記録はローカルの以下に残ります（Git 対象外）。

- `.publish/last-attempt.json`：直近の成功/失敗、実行段階、コミット、公開番号。
- `.publish/last-success.json`：全段階が成功した最後の公開。
- `.publish/publish.lock/`：実行中の PID。終了すれば削除され、終了済み PID の古いロックは次回起動で回収します。

Pages の配信構成によりメタデータが `/release.json` または `/dist/release.json` に現れるため、両方を探します。表示される `/dist/` のゲーム URL は、`dist/dist/index.html` の既存の互換リダイレクトも利用します。全参加者で再読み込みしてください。
