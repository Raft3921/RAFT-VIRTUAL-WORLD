# RAFT-VIRTUAL-WORLD

The world menu's 操作 settings save a per-device mirror choice: シームレス physically carries the player through the visible portal, while クラシック stops portal rendering and immediately warps the player to the matching exit. World chat is shared by every player in the room, including the latest on-screen bubble and the saved terminal history.

Minecraft Java skins in a shared 3D studio. The static client is served from `dist/`; online players share one room through a Cloudflare Durable Object WebSocket.

## World controls

A shared server-anchored day runs for ten real minutes by default. Dawn begins dim, the sun rises into a bright midday, sunset warms the sky red, and dark nights reveal a moon and stars. World menu boards toggle the cycle (OFF stays at noon) and save a 1–120-minute day length on the server without resetting the current time when the length changes. Wall clocks and both clock-tower faces use this same game time. Nearby animated furniture remains instanced.

An automatic nighttime flashlight follows the local camera's direction from the player's position and casts no extra shadows. Its preference is saved per player profile/ID, not per skin, so changing character retains it. Guests may change it for their current visit without writing member data. Offline changes are cached and sent when reconnecting.

Day/night transitions retain a constant light/shadow shader layout: flashlight OFF uses zero intensity, and the sun remains registered as a shadow light. Nighttime skips sun shadow-map updates instead of switching material variants. Daytime soft shadows update every rendered frame, restoring smooth player shadows rather than the earlier 15/30 Hz cap.

Street lanterns fade on with night: their lenses glow, pooled ground halos illuminate the road, and nearby avatars receive warm fill. These share one ground-pool draw and spatial shader fill, with no per-lantern point lights or shadow maps. Homes no longer receive a uniform full-room fill. Placed floor lights, sconces, pendants, chandeliers and ceiling lights illuminate from their actual luminous surfaces, with distance falloff and surface-normal shading. Their sources update with placement, movement and removal, stay inside the owning house and share a fixed twelve-source pool nearest the camera without adding shadow maps or shader variants. The studio keeps a reduced neutral fill so subjects remain readable against GB/RB/BB. Both studio roof layers retain their geometry and collision but cast no shadows, including after distance culling. Existing bald-head shader hooks remain intact.

Punch a record machine to play the supplied `昼下がり気分.mp3` (bundled as `dist/audio/afternoon.mp3`); punch it again to stop. Nearby visitors share its playback/stop state and playback position. Music loops through one lazy-loaded stream, with distance attenuation; deleting a playing record machine stops it. Piano strikes advance this shared per-instrument melody: C4, E4, C4, G3, E4, G4, E4, C4, E4, G4, E4, C4, E4, G4, C4, then repeat. Notes retain their key motion and pixel-note effects.

UI text, control labels and images cannot be selected or dragged. A delegated JavaScript guard suppresses long-press context menus, native copy/cut gestures and selection handles, including dynamically created home-design controls. Numeric/text fields retain typing, paste and caret editing; Japanese IME composition is preserved. Explicit share-link copying still uses the Clipboard API. Scrolling panels, sliders, normal taps and the existing pointer-based charge/jump/joystick controls remain in place.

- Eight spacious, white-walled homes surround the residential avenue. Their timber floors, coloured roof trims and unobstructed entrances have physical collision. There are no floating house-name signs.
- Punch a world menu board to open five short sections: 撮影, 外見, 時間, 対戦 and アスレ. Studio, arena and checkpoint boards open the relevant section first; the tabs remain visible while the selected section scrolls. Background controls (GB/RB/BB), crown toggle, character selection, director settings and online controls remain available. Close with the top-right ×. In free/orbit camera, five clicks within a rolling one-second window resume player control; the punch button accepts the same five-tap gesture. Single clicks, camera drags and cancelled touches do not return to player control. The fifth click only switches modes and does not attack.
- Land on an arena seat to sit; jump to stand. Outside matches ordinary movement can cross the dome, but punch knockback is blocked. During a match both fighters are locked inside the dome, including walking, jumping and knockback. Flight and position resets are disabled until the match ends. Hexes appear only near the player.
- Exactly two players inside the gold combat ring can begin a duel by punching within one second of each other. The ring and server use the same centre and radius. The server awards 1–10 damage per punch; 11 accumulated damage is the default winning threshold. Any world board can change that threshold to an integer from 1–100 and save it on the server. Changes apply to the next match; an ongoing match retains its original threshold. Spectators receive no score changes.
- Each named skin owns its net win/loss score, independent hair/crown progression, appearance switch and highest checkpoint on the server. Choosing that character on another device restores the same state; switching characters does not transfer it. Negative appearance stages gradually remove the head overlay and recolour the upper head using the skin's face pixel at (15,15). Each win restores hair first, then creates and extends the block crown. The crown appearance switch controls both effects: OFF restores the original head appearance without resetting progression or score.
- The climbing athletic course contains 600 colourful platforms, CHECK 1–100, moving pads and red lethal beams. Flight is disabled and jump velocity becomes 1.5×. Falling seven metres below the reached height or hitting a beam returns the player to their checkpoint. Every checkpoint has a menu board with an exit action.
- Leaving the course, resetting position, switching characters or reloading does not clear checkpoint progress. Re-entering starts at that character's saved checkpoint. Checkpoints are saved as they are reached and again when leaving. Active runs are not teleported when another device advances the same character. Local cached progress and offline appearance changes are sent to the server on reconnection.
- Custom skins are locked as a secret coming-soon slot.
- A bottom-right punch button is available on touchpads and touchscreens; hold to charge and release to punch. Drag to look; double-click the scene to opt into mouse pointer lock (Esc releases it).
- Houses and the colosseum occupy separate districts. Four radial seating terraces, four stair aisles and outer columns surround the fighting area. Collision uses each object's orientation, including rotated seating.
- Follow/orbit cameras shorten their boom before walls and roofs; free cameras also sweep against solids. Repeated geometry is instanced in spatial/height chunks with distance and frustum culling. Main world chunks now remain visible to 160 m instead of 115 m; houses render to 145 m on desktop and 120 m on mobile, with their small details visible to 55 m. Distant shadows still stop at the shorter range, and high-altitude grass remains omitted.
- Every climbing checkpoint mixes four or five obstacles: weaving narrow paths, tiny landing pads, wide sideways/forward moving platforms, vertical lifts, rotating red damage bars, sideways projectiles and floors that collapse after being stepped on. CHECK 1 starts at the previous level-20 footing size. Ten-checkpoint gates mark progress. Jump from platform edges and time moving obstacles.
- The interface uses the bundled Japanese pixel font DotGothic16 (its SIL OFL notice is in `dist/fonts/OFL.txt`). World boards are portrait touch terminals.
- Tap attacks chain right punch, left cross, high kick and spinning kick. Each of the ten charge levels changes the stance / released move, adding lunges, flying attacks and shockwaves. The strongest attack physically jumps before its strike.
- Click an opponent to lock them; the punch button otherwise selects a visible opponent in front. Attacks approach quickly with solid collision, stop at striking distance, and repeated taps chain pursuit attacks. Movement input or opening a menu cancels pursuit. Pursuit speed remains capped at ordinary running speed in the athletic zone.
- Finisher and charged hits briefly freeze both fighters at their contact positions, with a small visual shake, then release knockback. Stronger charged hits hold the impact longer. Hit reactions retain damped, loose limb motion before a supine floor pose and physical kip-up. The prone collision volume follows the body's direction; floor clearance follows the actual skin meshes. Server-owned hit serials prevent older standing packets from replacing a new hit. Reactions, charge poses, attack stages, hit sparks and fist/foot wind trails synchronize online. Recovery continues while a menu or background tab is open. Knockback within the dome does not cancel an active duel.
- A fountain plaza, market stalls, walk-in shops, a clock lookout and a garden pavilion connect to the roads around the studio.

## Home design

World boards show the chosen member's saved wins/losses and win rate. New counters start with this update because the old net-score record cannot reconstruct historical match totals; existing score, appearance and checkpoint values are preserved. Member-versus-member and member-versus-guest results count. Guests never receive persistent statistics. Matches between two sessions of the same character remain non-scoring practice.

Floor-standing seats pair with a table, desk or computer desk only at their closest non-overlapping 25-centimetre grid position: one further step toward that table would overlap it. Their local +Z front and sitting direction face the table on the existing 45-degree rotation grid. Several chairs can pair with one table. Pair IDs and orientation are saved with the normal compact layout; moving either furniture re-evaluates pairing; pulling the chair away releases it for independent rotation and removing the table releases the link. The editor labels the paired table during placement. Existing layouts align on load without relocating or deleting objects; an existing wide seat that cannot turn without collision remains unpaired in its original orientation.

Hair/crown appearance has a saved per-character progression separate from net win/loss score. Losing moves it down to a minimum of -8 (fully bald). Every later win immediately restores one visible stage, even after a much longer losing streak. At stage 0 the original hair and overlay are fully restored; the next win creates the crown, and further wins extend its lower band. Losses reverse the same stages. The appearance toggle still hides both effects without resetting either value, and guest-owned state and same-character practice remain unchanged, while members facing guests gain or lose the normal appearance stage.

Ordinary right/left punches, the third high kick and uncharged airborne taps apply damage and a short shared standing recoil without freezing, launching or cancelling either fighter's movement, charge or combo. Both fighters can exchange attacks concurrently. The fourth normal combo hit connects after the full spin and knocks the opponent down; charged attacks and Gyoza's spin projectile retain their finishing knockback. Knocked-down fighters cannot be hit again during the flight. The server opens a single 1.5-second invulnerability window when it first receives their supine/down state, and repeated state packets cannot reset that window. Melee and projectiles reject protected targets before damage, impulses or score updates. The .48-second down rest and 1.02-second kip-up use the same timing for local practice and shared avatars.

The eighth member is Gyoza, built from the supplied Blockbench JEM and atlas in `dist/models/gyoza/`. Its 18×9×8 head, 8×8×4 torso, 7-pixel arms and 5-pixel legs retain the supplied proportions instead of applying the texture to a standard player. The adapter preserves overlay inflation and per-face UV endpoints, including reversed UV rectangles. Walking, attack, seating, crown/bald appearance, collision size and camera height adapt to the custom rig. The source JEM and texture remain unchanged; the game resolves the texture to the bundled PNG.

Gyoza's fourth normal combo hit (the rotation) throws one brown block clump forward instead of applying an additional melee hit. The server simulates the swept flight, first collision and fixed 2-point arena damage. Throws and impacts broadcast to every player, and joining clients receive active throws. Guests retain no saved results; the member opponent records a normal win/loss. The visual uses a bounded instanced pool; the shooter's immediate preview is reconciled with the server's projectile, and clients never report authoritative damage.

The eight member homes are assigned by character: red = Raft, green = Mai, cyan = Tanutuna, orange = Yansan, grey = Muto, purple = Moron, yellow = Week, brown = Gyoza. Click the portrait HOME terminal in front of your own character's entrance; it opens the right-side design panel directly, not the world menu. Punching these special terminals does not open a menu.

The catalogue contains 310 low-poly block furniture types (62 original plus 248 shape/use variants), divided into floor-standing, wall-mounted and ceiling-hung items. The editor keeps three sections visible at its top: 家具を探す, 配置・編集 and 部屋・視点. The furniture list scrolls independently while its location tabs, name search, type filter and page buttons remain accessible; it creates only 24 thumbnail buttons per page and keeps a bounded thumbnail cache. Choosing a furniture card opens 配置・編集 automatically, and the placement confirmation stays in the fixed footer. Tap the HOME screen or tablet body; a nearby owner's entrance also shows a direct edit button. The terminal's own collision is excluded from its sight check. Select a catalogue item to show a movable preview: green means valid, red shows why placement is blocked. Confirm with the placement button or Enter. Use the 3D arrows or the optional fine-position section for numeric coordinates and 25 cm nudges; use the yellow ring, R or rotation buttons for 45-degree turns (90 degrees for wall items). A short click or tap directly on a placed item rotates it one step; dragging still moves it. A paired chair remains locked toward its table until moved away from the pairing edge. 配置・編集 contains colours, duplication, removal, restoring the last removed item and wall selection; 部屋・視点 contains floor/wallpaper/ceiling finishes and orbit, pan, top view and whole-room framing. Saved placement and removal emit pooled pixel particles. On portrait phones the panel becomes a collapsible bottom sheet; two fingers zoom and pan. Roof and camera-facing walls are cut away locally as the view rotates. Other players see the intact home. Seating supports the same landing-to-sit interaction as the arena.

Furniture cannot overlap another object's bounding volume or leave the room. Rugs can go under furniture, while overlapping rugs are rejected. The entrance passage stays clear. The server applies the same grid, placement, catalogue and ownership rules. There is a 64-item limit per home. Only type IDs, grid coordinates, rotation, palette indices and finish IDs are saved: no mesh or texture payloads. Changes autosave to the server and broadcast to all players, with revisions preventing stale simultaneous edits from silently overwriting one another. Editing requires a server connection; the last received layout is cached locally for display. Furniture shares box geometry and pooled materials, is instanced per house/material, and omits distant details and shadows. Dragging updates only the selected item's existing instances, not the whole catalogue or room mesh.

## Server data and updates

The expanded furniture catalogue adds twenty seats, twenty-four tables, twenty storage objects, twelve beds, twenty-eight electronic devices, twenty kitchen/laundry appliances, twenty-four plants/flowers, twenty rugs/cushions, twenty toys/tents/plushies, twenty hobby/instrument objects, twenty light fixtures and twenty wall decorations. IDs denote geometry or use, not palette alternatives. Models use bounded procedural box components and the same instancing/culling as the original catalogue. Fans and plants animate only nearby. Additional light fixtures feed the existing fixed light-source pool; mirrors open per-mirror reversed residential avenues. Beds and seats retain their rest/sit behavior, and chairs pair with tables. Loft/bunk mattresses have matching higher collision and sleeping surfaces.

Small tabletop objects can be lifted on a five-centimetre height grid with the Y gizmo or height input; initial placement tries existing tables before the floor. Their height is saved as a compact integer, with server-side bounds/overlap checks and collision following the raised object. Floor X/Z positions remain on the 25-centimetre grid. Each house still allows 64 placed objects: expanding the catalogue does not automatically add hundreds of meshes to the world. The triangular corner desk now has one closed triangular tabletop, a diagonal front and three supporting legs; its preview and catalogue drawing follow the same shape while placement retains the conservative rectangular envelope.

Approach the studio-front MENU terminal to reveal **ガイドを開く**, or open it from the terminal menu. The scrollable guide groups world zones, controls, filming, home design, arena combat, CHECK 100, day/night furniture and online saves. It has a close button, keyboard focus support and a compact mobile layout.

Punch any instrument to advance that instrument's own position in the same fifteen-note piano melody described above. Guitars, ukulele, violin, harp, drums and keyboards use different synthetic timbres, but the pitch sequence stays the same. The server chooses each next note and broadcasts it with bounded audio voices and pixel notes. Punch a light, fan, appliance or screen to toggle it; doors, lids and curtains open or close. Plants, toys, mirrors, art, beds, clocks, rugs, seats, tables, storage, aquariums, kitchen tools, electronics and hobby props respond with distinct short motions, chimes or coloured particles. Active furniture switches synchronize for everyone in the room and joining players receive their current state. They are transient play state, so the compact saved furniture layout is unchanged; guests may trigger the shared effects without editing the home.

Sleeping rigs now seat the torso's own back depth on the mattress and lift only the thicker head onto the pillow, rather than raising the whole body. Sofa arms/base/back and aquarium water/frame/fish use separated surfaces. Other coincident furniture faces receive a small build-time separation, and thin decorative detail instances do not cast unstable overlapping shadows.

Furniture surface layers retain their designed offsets instead of being clamped onto coincident planes. Placement labels live in the reserved editor footer and do not float over the object. Beds have a three-metre placement envelope and landing on a mattress starts a shared supine rest pose; jump or attack to stand. Old beds expand in place or move to a nearby free grid cell without deleting other saved items. A tightly packed room retains a legacy-size bed until space is freed.

Nearby fans, air-conditioner louvers, clocks, plants, curtains, aquarium fish and records animate by updating existing instances. Piano punches play bounded Web Audio notes and pixel-note particles for nearby listeners in the same room; the struck key also moves briefly. Mirrors are perspective-correct portal windows. The nearest visible entrance renders the connected space directly into the main framebuffer through a stencil opening and oblique clipping, without offscreen textures. Each real-world house + mirror ID owns a separate reversed residential avenue. House depth, facades, entrances and the street reverse across Z; interior furniture is initially empty. The source mirror appears at its reversed position and returns to its real-world counterpart. Other houses on that avenue also have passages to their real-world mirrors (or an entrance passage if they have no mirror). Street ends and gaps are black and blocked. Each mirror-world home has a member-colour HOME board and the same owner-only furniture/finish editor, with layouts saved separately from real-world homes. Removed source mirrors retain a safe return to the appropriate home's entrance. Realm slots and layouts persist in the same LAN/Worker housing storage. Wall-mounted planters, curtains, speakers, vents, wider art/shelves, hanging plants, mobiles, projectors and wider pendant lights join the catalogue. Gyoza's short JEM limbs omit the overlapping auxiliary joint cubes and inset their internal overlay caps.

Guest is the ninth selection card, after Gyoza, with a plain white skin. Rooms support up to nine connected players. Guests can move, film, use seating, run the course and participate in practice matches, but cannot edit homes, studio backgrounds, duel settings or member appearance/progress. The server rejects those writes and prevents an admitted guest from selecting a member during that connection. Matches against a guest count toward the member's wins, losses, score and hair/crown progression, while the guest remains unchanged. Guest checkpoints stay in memory for the current visit only, and no guest record is created in persistent character data.

The LAN server stores per-character scores, hair/crown progression, appearance switches and checkpoints in the ignored `.room-characters.json`, duel/day-cycle settings and individual flashlight preferences in `.room-settings.json`, and home layouts in `.room-houses.json`. The Worker retains them as `characters`, `settings` and `houses` in Durable Object storage. Existing character records derive their initial appearance stage from their score, capped at fully bald (-8), without resetting that score. Keep these LAN files when updating the project. The legacy anonymous-score file/key remains untouched: an uninitialized character imports its first joining profile's old score once, without copying it to other characters. Duplicate sessions using the same character share its state; a duel between two copies of the same character leaves its net score unchanged. Restart a running LAN server after updating its code, and reload every player's page. A client/server version mismatch displays an update notice instead of silently using incompatible animation or arena data.

User instruction reaffirmed on 2026-10-09: do not perform any tests, validation commands, runtime checks or browser verification from now on. Git commits/pushes and server deployments are authorized without those checks. During the 2026-10-09 VRS addition, before this instruction was found, syntax checks ran and the legacy world test stopped at its duel-completion assertion (line 51). No subsequent validation or browser verification was performed.

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

## VRS additions · 2026-10-09

The menu board's 操作 tab includes a 0.20–3.00× mouse sensitivity slider, saved on this device and applied to both drag look and pointer lock. Member selection cards and face backgrounds use the same palette as their homes; Gyoza follows the same visual rules.

Aimed piano/instrument taps always animate a right straight and sound immediately. Repeated taps restart that animation without waiting for combat combo recovery; holding and releasing on an instrument also uses the right straight. The room authority allows musical events every 55 ms while non-musical furniture keeps its 180 ms throttle. Normal combat retains its existing combo.

Restart the room server and reload client pages together to use sync version `2026-10-09-vrs-mirrors-23`. Existing home/character save files are retained. Browser play and multiplayer acceptance for this addition remain unverified.

## Mirror entrances and black void · 2026-10-09

The mirror world contains only the eight houses, their home-design boards, furniture and connecting roads. Grass, meadow terrain, sky and coloured fog are excluded both when inside and when viewing that world through an entrance. Empty space is an infinite black background, with no enclosing mesh and no black wall meshes. A single invisible outer boundary surrounds the entire neighbourhood and does not obstruct views of other houses.

Mirror entrances use direct stencil rendering into the main framebuffer at screen resolution. There are no offscreen render textures or per-mirror texture pools. Only the nearest entrance actually visible within 14 metres gets one additional view; looking away or moving outside that approach range does not load or draw its realm. Gateway transforms update only after furniture changes.

Crossing the mirror plane preserves position relative to the opening, direction and momentum. There is no preset arrival location, camera reset or transition toast. A follow camera stays on its own side until it crosses, allowing the actor to walk through the opening. Collision is opened only at the entrance within a thin wall.

No tests, validation commands, runtime checks or browser verification were performed, as instructed.

## Mirror exits, updates and saved world chat · 2026-10-09

The mirror-world furniture catalogue excludes all mirror types, and the server rejects attempts to place, duplicate or move mirror furniture there. Old mirror-world mirror furniture is removed on load; the permanent return entrances stay. Return entrances copy the complete frame, stand, glass shape and colour of their real-world mirror, and follow that mirror's edits.

Portal masks retain their aperture when it enters the camera's near plane; the follow-camera handoff occurs exactly at the plane. Ill-conditioned clipping is skipped and entrance selection has hysteresis to avoid rapid switching between adjacent mirrors. The rendering remains a single extra direct stencil view, without mirror textures.

Punch a computer, desktop PC, laptop, tablet or server computer to open world chat. New messages show one face-and-speech-bubble notice at the top of the ordinary view. The terminal has the recent history, an older-history button and scroll loading for all saved messages, plus a 400-character input. Enter sends; Shift+Enter adds a line. Guests may chat. Senders are identified by the server's current character; text is displayed as plain text. Sending requires a nearby computer and is limited to one message per second.

LAN chat is an append-only ignored `.room-chat.jsonl` file. Cloudflare saves each message separately under a `chat:` storage key, so the complete history is retained without an ever-growing single storage value. The client requests history in pages of 100 messages.

GitHub Pages stamps each published artifact with its Git commit ID. Clients read the published release manifest and the sync server's release endpoint once per minute and upon returning to the page. Changed releases display the persistent notice: **更新したけん、ページを再読み込みしよう！**, with a reload button. Future Worker deployments should set `DEPLOYMENT_REVISION` to a unique commit-plus-deployment stamp, and the LAN server exposes a unique startup stamp. These requests implement player notifications; no external tests or runtime verification are performed.

Current sync version: `2026-10-09-vrs-chat-26`. No tests, validation commands, browser verification or gameplay checks were performed for this update.


## 2026-10-10 · PC, Raft Coins and Sand Town

MENU boards now open through a proximity button. The boards outside homes are ordinary MENU boards; the home editor is available at the owner's entrance only. Shared chat opens from the coin HUD, MENU, or the PC desktop, without a PC-distance restriction. PC desktops contain Chat, Web (the published VRS embedded inside VRS, with a two-level nesting limit), and Store.

Named characters start with 1 Raft Coin. Prices are pistol 1, machine gun 3, sniper 5, shotgun 7, rocket launcher 10. The next weapons require 1 pistol win, 5 machine-gun wins, 10 sniper wins, and 15 shotgun wins in Sand Town. Store purchases, equipment, coins and weapon wins use the existing durable character store. New course stages, arena victories and Sand Town victories award coins; furniture rewards use the permanent maximum number of simultaneously placed pieces, one coin per five, so removing/replacing pieces does not farm rewards. The final checkpoint includes the last stage.

Sand Town is east of the plaza, bounded by x=120…244 and z=-140…-44: 11,904 square metres, more than 30 existing home footprints. It has 24 traversable building shells, exterior stairs, roofs, bridges, internal cover and alleys. Wall and projectile geometry are shared by client and server. It forbids flying and forces first person. Equipped entrants receive automatic team assignments; 4 players default to 2 vs 2, other counts default to individual teams. Team icons on dedicated boards can be selected and moved before the automatic 15-second start. The alternate modes are individual and two-team. Three hits eliminate a player; the last surviving team wins. Disconnecting or leaving cancels a round without farming a victory. Defeated players can use a spectator camera until the next round.

Bullets use server-owned continuous segment collision at 25 Hz, 260–560 m/s; shotgun shells emit four separately scored pellets. Rockets travel at 24 m/s and explode with a 6 m radius; walls occlude splash. Each hit scores one and uses the existing light-punch reaction. Magazines are 12 / 30 / 5 / 8 / 1 respectively. Exhausting a magazine locks that weapon for 5 seconds; reserves are unlimited. Machine guns fire while held, and sniper hold/drag/release scopes, aims, and fires. Equipment is locked during a round. Outside Sand Town armed players use a right-shoulder aiming camera. In-town players use first person, with a weapon/arm model, recoil, sway, muzzle particles and generated shot audio. Up to 96 projectiles and 128 impact marks render in two reusable instance pools; marks last 20 seconds. Static town geometry uses spatially culled material batches; server town collision uses a spatial grid.

Turn on a television, then sit on a nearby chair or sofa facing it, to watch an existing full-screen world camera. There are 3 arena and 5 town viewpoints with narrow translucent side arrows. Only venues with active matches are selectable when either venue is playing; all cameras are available when neither is playing. Jumping stands up and returns to the usual view. The spectator view reuses the main renderer without an extra video render target.

Player positions persist per browser profile on the server and locally. Embedded VRS sessions use separate profiles so they do not replace the outer session's position. Mirror realm identity is restored with position. Sync version: `2026-10-10-vrs-guns-30`. No tests, validation commands, runtime checks or browser acceptance were performed, per the user's standing instruction. Deployment is performed directly; actual device behavior remains unverified.


## 2026-10-10 · Pixel UI and Raft-face coin rewards

Economy HUD, PC desktop, store, team panel, combat labels and spectator controls now share DotGothic16, squared borders, the established blue/green palette and stepped shadows. The coin icon is a shared 32-pixel gold atlas minted directly from `skins/raft.png` (Java head front and transparent hat overlay), also used on store prices and balances. Confirmed positive server balance changes emit a targeted `coin-award` event; initial hydration, reconnects and purchases do not trigger rewards. Up to four reusable 3D coins spin toward the HUD with a pool of 32 star particles and a stepped gain notification. Effects use the existing camera and renderer, shared geometry/materials, no extra render pass and no lights. Sync version is `2026-10-10-vrs-coins-31`. No tests, validation commands, runtime checks or browser verification were performed, as requested.


## 2026-10-10 · Right-hand weapon grip and spatial interaction prompts

Weapons now attach to the right hand's grip below the elbow, with forearm orientation compensated so the barrel follows the aim while the left arm remains lowered. The third-person camera moved to the same anatomical right side; first-person weapons include one wrapped hand and forearm, with a more visible receiver and distinct detailed pistol, machine gun, sniper, shotgun and launcher geometry. Model-local muzzle anchors drive warm muzzle flashes, local firing feedback, predicted visual shots and bounded, wall-checked server shot origins. Ordinary projectile speeds are now 1500 / 1900 / 2600 / 1600 m/s respectively; rockets retain their deliberately slow 24 m/s trajectory. Continuous segment collision remains authoritative, with per-projectile elapsed time and range bounds, plus a reusable pool of brief tracers. Recoil originates from the held gun.

The opening prompts for menu/team boards, computers, TV power and home customization now use a depth-tested pixel billboard in the actual world instead of a screen-positioned HTML button. Its geometry handles clicks/taps, and E activates the nearby prompt. Labels are occluded by solid world geometry and follow the camera while staying at their object's world location. The old floating home and guide prompt overlays are hidden. Full menu contents retain the existing readable modal panels. Sync version: `2026-10-10-vrs-grip-32`. No tests, validation commands, runtime checks or browser verification were performed, per the user's standing instruction.


## 2026-10-10 · Sand Town fortress and district remodel

Grass now excludes the entire Sand Town footprint, a four-metre perimeter buffer and the western approach road, after wind deformation so no blades survive the mask. Ground colour blends into a sandy desert apron around the town. The outer enclosure uses continuous 18-metre-high, 2.8-metre-thick walls, buttresses, plinths, crenellated caps, four corner towers and a clearly framed western gateway. The gate sign faces visitors approaching from the west.

The uniform 24-building grid was replaced with 18 varied, traversable building shells across market, courtyard, roof and alley districts. They have genuine window openings, offset doorways, shaded porches, restrained cloth accents, interior hiding nooks, varied roof heights, four stepped rooftop bridges, exterior stairs with rises below the 28-cm movement step limit, low maze walls, stacked crates, market stalls, a dry fountain and direction signs. Team spawning pads remain clear. Every solid is still emitted by the shared builder for both movement and server projectile collision, while purely decorative cloth/trim remains non-solid and avoids shadows. Geometry continues to use the existing material/spatial instance batches; there are no new lights, render passes or external assets. Sync version: `2026-10-10-vrs-sandtown-33`. No tests, validation commands, runtime checks or browser verification were performed, per the user's standing instruction.


## 2026-10-10 · Desktop pointer lock, skinned first-person arm, zone exit

A desktop left click on the scene now prioritises acquiring pointer lock, consuming that first click without charging, firing or counting a camera-return click. DOM controls, editable panels and ray-hit 3D interaction buttons retain their own input. Mouse input after acquisition aims and attacks normally; Esc still releases the lock. Touch controls retain their prior interaction. The double-click-only locking gesture was removed.

The first-person firing hand and forearm now use the selected avatar's actual right-arm atlas UVs, original nearest-filtered skin texture, base material and overlay sleeve material, including custom/JEM skin mappings. Switching character or replacing its skin rebuilds the view arm even when the equipped weapon remains the same. Leaving Sand Town releases its forced first-person camera and restores follow mode. This is a client change; the server protocol remains `2026-10-10-vrs-sandtown-33`. No tests, validation commands, runtime checks or browser verification were performed, per the standing user instruction.


### 2026-10-10 · 砂の街 / ボディカム視点
- 銃撃戦は外の専用ボードから入場し、内側の四隅のボードから退出・チーム設定。物理的な入口を閉じ、外壁と同じ素材の屋根と、白い曇り空に見える内側を追加。
- 固定のチーム台と文字看板を撤去。外周の空き地にも迷路を追加し、共有の当たり判定から選んだ空き地点へランダム配置。壁の模様は面の大きさに合わせて繰り返す。
- 購入済みの銃があれば入場時に自動装備し、退出時に入場前の装備へ戻す。未購入では入場不可。
- 小さな白い円の照準。一人称では操作以外の通常HUDを隠し、魚眼・周辺減光・歩行に同期した揺れ・軽い3サンプルの方向ブラーを追加。追加描画は横1280pxを上限とする単一画面パス。
- 指定の銃声MP3と2種類の足音WAVを使用。足音はキャラクターの接地中の歩行位相で左右交互に鳴らし、同時音源数を制限。
- ユーザーの指定により、テスト・検証コマンド・ブラウザでの動作確認は実施していない。


### 2026-10-10 · 銃の保持・共有演出
- 一人称の銃を縮小し、カメラから離す。上下を保った照準方向、反動、接地歩行に同期した揺れ、視点変更の慣性を追加。
- 他プレイヤーの銃口の煙と光、弾道、着弾を共有。20秒の弾痕は上限128件で途中入場にも引き継ぐ。
- 銃声にHRTF方向音、距離減衰、伝播遅延、遮蔽物のローパスと小さな残響を追加。音源上限12。
- 煙・火球・爆発煙は48枚の再利用スプライト。スコープはCSSのレンズ縁と目盛りで描き、スコープ中は魚眼を解除。
- ユーザーの継続指定によりテスト・動作検証は実施していない。


### 2026-10-10 · 銃撃戦への入場直後の退出を修正
- ボードからの移動とラウンド開始の移動に連番を付け、クライアントが次の位置更新で返す。移動前に送信済みの古い座標はサーバーの新しい座標を上書きしない。
- 参加中にゾーン外の座標が届いても自動退出扱いにせず、最後の有効な位置へ戻す。退出は四隅のボード、またはオンライン切断で行う。
- 参加者ごとに移動の連番を保持し、2人以上の入場で相互の参加状態を失わないようにする。
- 継続指定によりテスト・ブラウザでの動作検証は実施していない。


### 2026-10-10 · 銃撃戦の開始表示と残り被弾数
- 2人以上そろったらサーバー時刻に同期した3秒の大きなカウントダウンを表示し、試合開始時に「スタート」を表示。1人に減ったら開始を取り消す。
- 一人称でも左上に小さく「あと3発 / あと2発 / あと1発 / 脱落」を表示。残り1発で表示色を変える。
- 継続指定によりテスト・動作検証は実施していない。
