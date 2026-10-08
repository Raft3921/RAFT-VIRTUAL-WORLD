# RAFT-VIRTUAL-WORLD

Minecraft Java skins in a shared 3D studio. The static client is served from `dist/`; online players share one room through a Cloudflare Durable Object WebSocket.

## World controls

UI text, control labels and images cannot be selected or dragged. A delegated JavaScript guard suppresses long-press context menus, native copy/cut gestures and selection handles, including dynamically created home-design controls. Numeric/text fields retain typing, paste and caret editing; Japanese IME composition is preserved. Explicit share-link copying still uses the Clipboard API. Scrolling panels, sliders, normal taps and the existing pointer-based charge/jump/joystick controls remain in place.

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
- Finisher and charged hits briefly freeze both fighters at their contact positions, with a small visual shake, then release knockback. Stronger charged hits hold the impact longer. Hit reactions retain damped, loose limb motion before a supine floor pose and physical kip-up. The prone collision volume follows the body's direction; floor clearance follows the actual skin meshes. Server-owned hit serials prevent older standing packets from replacing a new hit. Reactions, charge poses, attack stages, hit sparks and fist/foot wind trails synchronize online. Recovery continues while a menu or background tab is open. Knockback within the dome does not cancel an active duel.
- A fountain plaza, market stalls, walk-in shops, a clock lookout and a garden pavilion connect to the roads around the studio.

## Home design

Ordinary right/left punches, the third high kick and uncharged airborne taps apply damage and a short shared standing recoil without freezing, launching or cancelling either fighter's movement, charge or combo. Both fighters can exchange attacks concurrently. The fourth normal combo hit connects after the full spin and knocks the opponent down; charged attacks and Gyoza's spin projectile retain their finishing knockback. Knocked-down fighters cannot be hit again during the flight. The server opens a single 1.5-second invulnerability window when it first receives their supine/down state, and repeated state packets cannot reset that window. Melee and projectiles reject protected targets before damage, impulses or score updates. The .48-second down rest and 1.02-second kip-up use the same timing for local practice and shared avatars.

The eighth member is Gyoza, built from the supplied Blockbench JEM and atlas in `dist/models/gyoza/`. Its 18×9×8 head, 8×8×4 torso, 7-pixel arms and 5-pixel legs retain the supplied proportions instead of applying the texture to a standard player. The adapter preserves overlay inflation and per-face UV endpoints, including reversed UV rectangles. Walking, attack, seating, crown/bald appearance, collision size and camera height adapt to the custom rig. The source JEM and texture remain unchanged; the game resolves the texture to the bundled PNG.

Gyoza's fourth normal combo hit (the rotation) throws one brown block clump forward instead of applying an additional melee hit. The server simulates the swept flight, first collision and fixed 2-point arena damage. Throws and impacts broadcast to every player, and joining clients receive active throws. Guest practice matches still change no saved scores. The visual uses a bounded instanced pool; the shooter's immediate preview is reconciled with the server's projectile, and clients never report authoritative damage.

The eight member homes are assigned by character: red = Raft, green = Mai, cyan = Tanutuna, orange = Yansan, grey = Muto, purple = Moron, yellow = Week, brown = Gyoza. Click the portrait HOME terminal in front of your own character's entrance; it opens the right-side design panel directly, not the world menu. Punching these special terminals does not open a menu.

The catalogue contains 62 low-poly block furniture types, divided into floor-standing, wall-mounted and ceiling-hung items. Tap the HOME screen or tablet body; a nearby owner's entrance also shows a direct edit button. The terminal's own collision is excluded from its sight check. Select a catalogue item to show a movable preview: green means valid, red shows why placement is blocked. Confirm with the placement button or Enter. Use the 3D arrows, numeric coordinates or 25 cm nudge buttons to move; use the yellow ring, R or rotation buttons for 45-degree turns (90 degrees for wall items). The panel supports colours, duplication, removal, restoring the last removed item, wall selection, floor/wallpaper/ceiling finishes. Saved placement and removal emit pooled pixel particles. Camera tools provide orbit, pan, top view and framing the whole room. On portrait phones the panel becomes a collapsible bottom sheet; two fingers zoom and pan. Roof and camera-facing walls are cut away locally as the view rotates. Other players see the intact home. Seating supports the same landing-to-sit interaction as the arena.

Furniture cannot overlap another object's bounding volume or leave the room. Rugs can go under furniture, while overlapping rugs are rejected. The entrance passage stays clear. The server applies the same grid, placement, catalogue and ownership rules. There is a 64-item limit per home. Only type IDs, grid coordinates, rotation, palette indices and finish IDs are saved: no mesh or texture payloads. Changes autosave to the server and broadcast to all players, with revisions preventing stale simultaneous edits from silently overwriting one another. Editing requires a server connection; the last received layout is cached locally for display. Furniture shares box geometry and pooled materials, is instanced per house/material, and omits distant details and shadows. Dragging updates only the selected item's existing instances, not the whole catalogue or room mesh.

## Server data and updates

Sleeping rigs now seat the torso's own back depth on the mattress and lift only the thicker head onto the pillow, rather than raising the whole body. Sofa arms/base/back and aquarium water/frame/fish use separated surfaces. Other coincident furniture faces receive a small build-time separation, and thin decorative detail instances do not cast unstable overlapping shadows.

Furniture surface layers retain their designed offsets instead of being clamped onto coincident planes. Placement labels live in the reserved editor footer and do not float over the object. Beds have a three-metre placement envelope and landing on a mattress starts a shared supine rest pose; jump or attack to stand. Old beds expand in place or move to a nearby free grid cell without deleting other saved items. A tightly packed room retains a legacy-size bed until space is freed.

Nearby fans, air-conditioner louvers, clocks, plants, curtains, aquarium fish and records animate by updating existing instances. Piano punches play bounded Web Audio notes and pixel-note particles for nearby listeners in the same room; the struck key also moves briefly. Mirrors activate only within five metres of the player and twelve metres of the camera. Only the nearest mirror uses a shared self-only reflection target (128×128 on desktop, 96×96 on mobile), refreshed at most every .35/.5 seconds. It reuses the player's current skin/pose meshes and renders no world, grass, furniture or shadows. Wall-mounted planters, curtains, speakers, vents, wider art/shelves, hanging plants, mobiles, projectors and wider pendant lights join the catalogue. Gyoza's short JEM limbs omit the overlapping auxiliary joint cubes and inset their internal overlay caps.

Guest is the ninth selection card, after Gyoza, with a plain white skin. Rooms support up to nine connected players. Guests can move, film, use seating, run the course and participate in practice matches, but cannot edit homes, studio backgrounds, duel settings or member appearance/progress. The server rejects those writes and prevents an admitted guest from selecting a member during that connection. Matches involving a guest never change either player's saved score. Guest checkpoints stay in memory for the current visit only, and no guest record is created in persistent character data.

The LAN server stores per-character scores, crown/bald appearance and checkpoints in the ignored `.room-characters.json`, duel settings in `.room-settings.json`, and home layouts in `.room-houses.json`. The Worker retains them as `characters`, `settings` and `houses` in Durable Object storage. Keep these LAN files when updating the project. The legacy anonymous-score file/key remains untouched: an uninitialized character imports its first joining profile's old score once, without copying it to other characters. Duplicate sessions using the same character share its state; a duel between two copies of the same character leaves its net score unchanged. Restart a running LAN server after updating its code, and reload every player's page. A client/server version mismatch displays an update notice instead of silently using incompatible animation or arena data.

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

The Worker uses one shared room with an nine-player limit. Local development allows `http://localhost:4173` and `http://127.0.0.1:4173`; the Pages origin is also allowed.

## Play over LAN

Install dependencies once, then start the LAN host:

```sh
npm install
npm run lan
```

On macOS, you can also double-click `start-lan.command` to install dependencies if needed and start the server in Terminal.

Open the printed `http://<LAN-IP>:4173/` address on each device on the same Wi-Fi/LAN. Keep the host running and allow inbound TCP port 4173 through its firewall. LAN clients connect directly to the host instead of relaying movement through Cloudflare. Internet visitors continue using the published Pages URL.
