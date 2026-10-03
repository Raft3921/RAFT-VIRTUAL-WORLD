# RAFT-VIRTUAL-WORLD

Minecraft Java skins in a shared 3D studio. The static client is served from `dist/`; online players share one room through a Cloudflare Durable Object WebSocket.

## Publish the site

1. In the GitHub repository, open **Settings > Pages** and select **GitHub Actions** as the build and deployment source.
2. Push to `main`. `.github/workflows/pages.yml` publishes `dist/`.
3. The Pages workflow writes the deployed Worker URL into `dist/sync-config.js` automatically.

## Deploy room sync

From the repository root, authenticate with Wrangler and deploy the Worker:

```sh
npx wrangler login
npx wrangler deploy --config worker/wrangler.jsonc
```

The Worker uses one shared room with an eight-player limit. Local development allows `http://localhost:4173` and `http://127.0.0.1:4173`; the Pages origin is also allowed.
