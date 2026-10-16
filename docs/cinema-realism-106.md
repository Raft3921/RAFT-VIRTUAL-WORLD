# Combat presentation 106

The requested direction replaces arcade rings, confetti, glowing sword copies and oversized result panels with contact dust, short muzzle flashes, directed fragments, subdued smoke, physical casing/magazine motion and quieter body settling. HIT is retained after the user's correction, with small typography and a short fade. Gun impacts no longer trigger the generic punch flash. Reload tilt and jump/landing hand impulses are tuned for weight rather than exaggerated displacement.

Katana motion uses an upper-left guard, accelerating diagonal cut toward the lower right, follow-through and recovery. The shared pose includes shoulder, elbow, torso and first-person elbow anchors. Prone remains visible, with a low crawl pose, closer elbows, floor clearance and weapon contact handling.

First- and third-person weapons have contact material planes for the nearest wall and floor, plus an animated close-ready posture. The first-person rig lifts above floor contact; firing origins are clipped to the safe side of obstacles. Local material clipping stays depth-tested, including skins and weapon parts. Cloned contact materials are released on weapon changes/avatar disposal.

Replay timing is shared with the server: shooter at 0–2.4 s (shot sound/flash at 120 ms), target collapse at 2.4–5.8 s, whole-zone overhead at 5.8–9.4 s. The first two shots contain no HTML HUD, labels, hit text or skip prompt. Only a restrained result caption appears in the last shot. A skip seeks all participants to the overhead shot and leaves 3.6 s for the result; it does not immediately end the preview. The overview temporarily cuts away high horizontal roofs, keeps the entire zone framed across aspect ratios, and changes culling/shadow focus for the high camera. Roofs and shadow framing restore on exit. The normal post-replay result panel is suppressed to avoid a duplicate reveal. Authoritative elimination after the preview starts already settled, so the fall, damage flash and impact effects do not replay when the camera returns.

No tests, syntax checks, runtime launches or browser validation were run, as requested. Deployment is separate from gameplay validation; visual quality and interaction results are unverified in this revision.

Release: vrs-cinema106, sync 2026-10-16-vrs-cinema-106, protocol 3.
