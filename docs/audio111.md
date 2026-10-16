# Replay impact and match result sound — audio111

A synchronized, spatial impact cue combines a short filtered transient and a low body thump when the replay projectile hits a player. Explosion sound remains on explosive impacts. The cue is emitted once at the existing visual impact timestamp, rather than at the following cut, and is not replayed on the victim camera. It bypasses live-world sound propagation delay to keep the cinematic contact in sync.

Entering the final overview/result cut plays one short outcome cue: rising tones for the viewer's victory, descending tones for defeat, and a neutral suspended sound for spectators or draws. Skipping to this cut also plays the outcome once. Explicit null winners remain draws. Replay audio voices have a separate bounded pool and disconnect on completion; stopping or replacing the replay cancels playing and scheduled cues. Sound generation reuses one short noise buffer and the existing unlocked Web Audio context, with no new asset downloads or server protocol changes.

No tests, runtime checks, browser checks or listening verification were performed, following the user's prior instruction. Publication status is reported separately through deployment metadata.
