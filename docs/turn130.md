# Complete rotations, rotating camera and automatic ledges — turn130

Flip state previously cleared on early ground contact, stance changes and frontal wall attachment, and retiring remote action clocks were blended into the next action's duration. Shared movement now preserves every front/back/side/double-slide flip until its duration completes, including early landing and released movement. During an active rotation, new jumps and stance changes wait until it finishes; wall actions cannot replace the rotation. Physical collisions and stopping still apply.

Remote interpolation and hit-history sampling keep action duration/side with the chosen action serial and advance its retiring age within its own duration, instead of shrinking the duration toward zero. Camera motion uses the same pitch/roll phase and unwrapped full-turn angles for complete 360/720 degree movement. A monotonic local camera clock completes a turn despite a backwards network clock correction. Teleport, replay and invalid player-state transitions reset camera motion. Wall running banks the camera toward the contact normal and settles out smoothly. Logical mouse/controller heading and movement commands are unchanged.

The contextual parkour HUD module, update calls and CSS are removed. Combat-menu operation instructions remain, updated for rotating camera and automatic ledges. HIT and other combat UI are unchanged.

Shared physics now attempts the existing full-body clearance-checked mantle automatically when airborne, not prone/sliding, not stopped and within the forward ledge reach. No additional Space press is needed. An unfinished flip takes priority; once it finishes, a ledge still in reach can catch automatically. This is derived on both authoritative server and client prediction, without introducing a client-supplied ledge target.

No tests, syntax checks, browser sessions or visual/multiplayer verification were performed, following the user instruction. Deployment and release metadata establish publication only.
