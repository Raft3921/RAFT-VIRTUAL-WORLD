# RAFT-VIRTUAL-WORLD

Minecraft Java skins in a shared 3D studio. The static client is served from `dist/`; online players share one room through a Cloudflare Durable Object WebSocket.

## World controls

- Eight spacious, white-walled homes surround the residential avenue. Their timber floors, coloured roof trims and unobstructed entrances have physical collision. There are no floating house-name signs.
- Punch a world menu board to open background controls (GB/RB/BB), the crown toggle, character selection, all director settings and online controls. Close with the top-right ×. Punch while using the free/orbit camera to resume player control.
- Land on an arena seat to sit; jump to stand. Outside matches ordinary movement can cross the dome, but punch knockback is blocked. During a match both fighters are locked inside the dome, including walking, jumping and knockback. Flight and position resets are disabled until the match ends. Hexes appear only near the player.
- Exactly two players inside the gold combat ring can begin a duel by punching within one second of each other. The ring and server use the same centre and radius. The server awards 1–10 damage per punch; 11 accumulated damage is the default winning threshold. Any world board can change that threshold to an integer from 1–100 and save it on the server. Changes apply to the next match; an ongoing match retains its original threshold. Spectators receive no score changes.
- Each named skin owns its net win/loss score, crown/bald appearance switch and highest checkpoint on the server. Choosing that character on another device restores the same state; switching characters does not transfer its score or appearance. A positive score enables a block crown whose lower band grows with wins. Negative scores gradually remove the head overlay and recolour the upper head using the skin's face pixel at (15,15). The crown appearance switch controls both the crown and bald effect: OFF restores the original head appearance without resetting the score.
- The climbing athletic course contains 600 colourful platforms, CHECK 1–100, moving pads and red lethal beams. Flight is disabled and jump velocity becomes 1.5×. Falling seven metres below the reached height or hitting a beam returns the player to their checkpoint. Every checkpoint has a menu board with an exit action.
- Leaving the course, resetting position, switching characters or reloading does not clear checkpoint progress. Re-entering starts at that character's saved checkpoint. Checkpoints are saved as they are reached and again when leaving. Active runs are not teleported when another device advances the same character. Local cached progress and offline appearance changes are sent to the server on reconnection.
- Custom skins are locked as a secret coming-soon slot.
- A bottom-right punch button is available on touchpads and touchscreens; hold to charge and release to punch. Drag to look; double-click the scene to opt into mouse pointer lock (Esc releases it).
- Houses and the colosseum occupy separate districts. Four radial seating terraces, four stair aisles and outer columns surround the fighting area. Collision uses each object's orientation, including rotated seating.
- Follow/orbit cameras shorten their boom before walls and roofs; free cameras also sweep against solids. Repeated geometry is instanced in spatial/height chunks with distance and frustum culling; distant shadows and high-altitude grass are omitted.
- Every climbing checkpoint mixes four or five obstacles: weaving narrow paths, tiny landing pads, wide sideways/forward moving platforms, vertical lifts, rotating red damage bars, sideways projectiles and floors that collapse after being stepped on. CHECK 1 starts at the previous level-20 footing size. Ten-checkpoint gates mark progress. Jump from platform edges and time moving obstacles.
- The interface uses the bundled Japanese pixel font DotGothic16 (its SIL OFL notice is in `dist/fonts/OFL.txt`). World boards are portrait touch terminals.
- Tap attacks chain right punch, left cross, high kick and spinning kick. Each of the ten charge levels changes the stance / released move, adding lunges, flying attacks and shockwaves. The strongest attack physically jumps before its strike.
- Click an opponent to lock them; the punch button otherwise selects a visible opponent in front. Attacks approach quickly with solid collision, stop at striking distance, and repeated taps chain pursuit attacks. Movement input or opening a menu cancels pursuit. Pursuit speed remains capped at ordinary running speed in the athletic zone.
- Hits briefly freeze both fighters at their contact positions, with a small visual shake, then release knockback. Stronger charged hits hold the impact longer. Hit reactions retain damped, loose limb motion before a supine floor pose and physical kip-up. The prone collision volume follows the body's direction; floor clearance follows the actual skin meshes. Server-owned hit serials prevent older standing packets from replacing a new hit. Reactions, charge poses, attack stages, hit sparks and fist/foot wind trails synchronize online. Recovery continues while a menu or background tab is open. Knockback within the dome does not cancel an active duel.
- A fountain plaza, market stalls, walk-in shops, a clock lookout and a garden pavilion connect to the roads around the studio.

## Server data and updates

The LAN server stores per-character scores, crown/bald appearance and checkpoints in the ignored `.room-characters.json`, and duel settings in `.room-settings.json`. The Worker retains them as `characters` and `settings` in Durable Object storage. Keep these LAN files when updating the project. The legacy anonymous-score file/key remains untouched: an uninitialized character imports its first joining profile's old score once, without copying it to other characters. Duplicate sessions using the same character share its state; a duel between two copies of the same character leaves its net score unchanged. Restart a running LAN server after updating its code, and reload every player's page. A client/server version mismatch displays an update notice instead of silently using incompatible animation or arena data.

At the user's request, no tests, validation commands or browser verification are performed from the latest settings update onward.

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
