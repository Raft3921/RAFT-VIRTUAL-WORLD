# Airborne ledge climb — mantle103

While jumping, face a ledge and press jump again (Space or the touch jump button).
A reachable ledge takes priority over the existing flight double-tap. The player
lifts and pulls onto it over approximately 0.45–0.66 seconds. Empty-air jump
presses do not generate another jump in the walking simulation.

The server finds the target from view direction and its own geometry. It checks
hand reach (within 0.95 m horizontally and at most 2.15 m above the feet), a landing
surface large enough for the collision shape, and clearance for the entire body
along a lift-then-pull path. Locked arena and mirror movement bounds are respected.
The path is rechecked during the climb; disappearing support or a new obstruction
cancels the climb. Moving, collapsing, ramp and bounce surfaces are excluded.

Climb progress is included in movement acknowledgements and replayed with pending
inputs. Server-owned animation state is broadcast to peers. Avatars reach with
both arms and tuck their knees; guns are lowered/hidden while climbing.

Release `vrs-mantle103`, compatible protocol 3. Validation: 58 targeted tests pass,
including blocked/rotated ledges, reach/depth limits, support loss, 20/60/144 FPS
motion, server target validation and acknowledgement replay. Worker bundle,
syntax and diff checks pass. A temporary local browser fixture verified a full
jump/re-press/climb onto a 2 m block with server acknowledgement, grounded height
2 m, zero correction and no browser errors. The fixture is not shipped. Actual
mobile-device control and production latency/load remain unverified.
