# Remote presentation and frame update repair — network107

The world controller no longer accesses the removed replay hold progress element. That null access threw every frame and aborted effects and other world presentation updates. Replay skip now consumes a continuous 2000 ms pointer hold; pointer release alone and an idle replay cannot skip. The first two replay cuts remain free of HUD. Prone blending and third-person weapon clearance update again.

Remote state sends run at 30 Hz. LAN and Worker initial snapshots and state events carry server timestamps. Avatar loading preserves the received snapshot history, including its clock domain, instead of starting an unstamped buffer after skin creation. Remote crouch, prone, head motion, gestures and melee attack progress share the position playback timeline; damage events retain their immediate response.

Playback uses a 45–125 ms adaptive buffer, gradually adjusted against recent network jitter. The least delayed recent packet estimates the clock offset, with bounded clock slewing and a playback clock that does not rewind. Horizontal interpolation uses bounded velocity tangents; vertical interpolation preserves contact heights. Underflows coast at full speed for 40 ms, then decelerate to rest over 40 ms. Horizontal prediction velocity is limited by observed displacement to avoid coasting into a wall when movement input remains held. New data after underflow blends small corrections; teleport/realm changes and long suspensions reset history. These changes reduce presentation delay; they cannot remove transport latency or indefinite packet loss.

Skin sampling uses a Canvas2D readback context and caches each hand color per avatar, avoiding repeated GPU readbacks on weapon changes.

Validation: no tests, runtime checks or browser verification were run, following the user's prior instruction. Actual multiplayer feel remains unverified. Publication status is tracked separately through deployment metadata.
