# RAFT-VIRTUAL-WORLD

Minecraft Java skins in a shared 3D studio. The static client is served from `dist/`; online players share one room through a Cloudflare Durable Object WebSocket.

## Publish the site

1. In the GitHub repository, open **Settings > Pages** and select **GitHub Actions** as the build and deployment source.
2. Push to `main`. `.github/workflows/pages.yml` publishes `dist/`.
3. Open the published URL. Public internet hosts connect through the Cloudflare Worker automatically.

## Deploy room sync

From the repository root, authenticate with Wrangler and deploy the Worker:

```sh
npx wrangler login
npx wrangler deploy --config worker/wrangler.jsonc
```

The Worker uses one shared room with an eight-player limit. Local development allows `http://localhost:4173` and `http://127.0.0.1:4173`; the Pages origin is also allowed.

## Play over LAN

Install dependencies once, then start the LAN host:

```sh
npm install
npm run lan
```

On macOS, you can also double-click `start-lan.command` to install dependencies if needed and start the server in Terminal.

Open the printed `http://<LAN-IP>:4173/` address on each device on the same Wi-Fi/LAN. Keep the host running and allow inbound TCP port 4173 through its firewall. LAN clients connect directly to the host instead of relaying movement through Cloudflare. Internet visitors continue using the published Pages URL.
