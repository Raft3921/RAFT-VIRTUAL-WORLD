# Remote motion and replay skip — smooth106

Remote avatars now interpolate a bounded snapshot history against server send timestamps instead of chasing each newly received position with a per-frame velocity prediction. Adaptive playout delay is 90–180 ms; the playback clock adjusts gradually and never rewinds. Position, shortest-arc yaw/head yaw, head pitch, movement speed and jump height share the interpolation timeline. Eighty milliseconds of bounded, decelerating extrapolation covers short underflows; grounded avatars never extrapolate vertically. Teleport serials, realm changes, large displacements and long suspensions discard history. Immediate hit/freeze events also reset the buffer. Authoritative gameplay coordinates remain separate from presentation.

LAN and Worker movement broadcasts, including idle fall updates, include optional server timestamps; no connection protocol change is needed. Older unstamped messages still work.

Replay skip requires one primary pointer held continuously for 2000 ms. Release, cancellation, lost capture, blur, hidden document or another replay clears the hold. Short clicks cannot accumulate; Escape/Space/Enter no longer skip. Touch uses the same rule. A progress bar indicates hold completion.

Validation: 40 related tests passed, including jitter simulations at 30/60/120 fps, timestamped LAN peer broadcasts, authoritative movement/climbing, replay cameras/props and round reset. A browser harness using the actual world-experience controller retained playback after a 150 ms click and skipped after a 2200 ms hold. Separate physical-device multiplayer appearance has not been manually checked. The convex-cut helper imports the vendored Three module so isolated LAN/Worker builds do not depend on a parent-directory installation.
