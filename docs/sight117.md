# Clear aimed weapon and sniper views — sight117

Aimed firearms sit lower and slightly right of center, farther from the eye, with a 12% scale reduction at full aim. The existing reticle and world aim remain centered. The stock and hands no longer need to occupy the target area to align a tall receiver with an iron sight.

Sniper full aim uses the main world camera at 12 degrees with a clean optical aperture and crosshair. Once the view enters the optic, the local weapon rig is hidden and the secondary lens render is skipped. This gives both WebGL and software mode the same unobstructed magnified scene, rather than looking through or clipping a close, opaque model. The physical scope's baked opaque objective plate has also been replaced with separate translucent glass. Partial aim retains the 3D lens where supported. Local avatar hiding during aim now also applies in software mode, preventing the head or body from obscuring the view after moving from third person to the eye. Replay and menu states hide the optic.

Client-only release, preserving hit115 server synchronization and right-mouse/ZL input behavior. No tests, runtime checks or browser verification were performed, following the user's prior instruction.
