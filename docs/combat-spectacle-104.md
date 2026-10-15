# Combat spectacle 104

- Normal server-authoritative jump speed 8.4 m/s, gravity 24 m/s²: approximately 1.47 m apex and 0.7 seconds flight. Athletic-course parameters remain separate.
- Shared arm motion responds to acceleration, sprint, jump and landing; scoped motion is restrained. Reload has stronger weapon tilt and insertion/snap accents.
- Bounded pooled particles, shell casings, dropped magazines, footsteps, jump/landing rings, mantle sparks and elimination bursts. Effects expire without scene-node growth.
- Eliminations use a shared 0.85-second flail/collapse followed by ground bounce and settle; eliminated players never enter get-up. Live and replay avatars share poses.
- Finish UI, confetti and audio accents; replay projectile streaks, cut labels, letterbox, impact ring and wider final reveal. Camera remains on collision-checked rails with rotation-only impact movement.

Validation: 62 focused tests passed (combat presentation, mantle, room movement, player physics, tactical, plaza, guns, reload hands, round reset, replay props); Worker dry-run bundle succeeded. Isolated local browser verified movement, firing (30 to 29 rounds), reload, replay cut rendering and no console errors. Full multiplayer/device performance and audio perceptual quality are not measured.

Release: vrs-spectacle104, sync 2026-10-15-vrs-spectacle-104, protocol 3.
