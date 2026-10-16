# Combat-only world mode 105

The existing world menu has a shared, durable `combatOnly` toggle (default OFF). A member can switch modes while no players are enrolled in a gun match or duel. Successful changes relocate players, rebuild server physics and make current clients reload and re-enter with the same character. Failed persistence leaves the current mode intact. Guests cannot change this world setting.

Before generating the client world, `/world-mode` reads the room's authoritative setting. The joined/world messages also carry it to reconcile races and reconnects. ON builds only the gun town, its entry desktop and a separate reusable world menu at (110, -86). All joins start outside the gun zone, around (107, -89), facing the entrance. Saved normal-world/mirror positions are retained and ignored in this mode.

ON skips studio/houses/district/colosseum/course generation, grass generation, housing/mirror/map/cooking/living/playground module loading and construction, background cast preloads and projectile updates unrelated to guns. Server optional stores are lazy, compact snapshots omit their payloads, non-combat activity messages are ignored, cooking timers/alarms are stopped or gated, and movement skips housing geometry synchronization. Bullet and player collision geometry both omit other districts. Existing saved layouts and records remain available when OFF.

Validation: 68 focused tests passed, including mode persistence failures, guest/battle guards, absent optional systems, preserved combat prop IDs, both directions of server geometry rebuilding and two live LAN websocket clients receiving the switch. Static collision bodies fall from 4,696 to 2,003 (about 57%). Browser ON/OFF checks confirmed all five optional client systems absent with grass count 0 on ON, entrance spawn, and restored systems on OFF, without console errors. These are resource counts, not a measured FPS improvement or a multi-device benchmark. Worker dry-run bundle passed.

Release: vrs-combatonly105, sync 2026-10-16-vrs-combatonly-105, protocol 3.
