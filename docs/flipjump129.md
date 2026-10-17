# Recessed local body, forward flips and double-flip slide launch — flipjump129

The earlier local first-person body shift was in the wrong direction. Its render-only displacement now moves backward from the horizontal viewing direction: 0.28 m normally, up to 0.36 m when looking down, with a smaller 0.18 m slide displacement and existing avatar-size/ADS/solid constraints. No root, camera, networking, collision, remote or mirror/portal transform is changed. Prone body hiding and wall-contact framing rules remain.

Predominantly forward grounded input plus jump starts one forward somersault if standing clearance permits. Its hands/arms and knees tuck with the existing quaternion body rotation. Forward flips can transfer into wall running on contact so the forward dash-jump wall action remains available.

A shared slide jump generates an internal slideJump flag from the actual grounded slide state. This takes priority over ordinary directional flips, keeps horizontal slide momentum and returns a sqrt(2) jump-speed multiplier to shared physics. Because jump height is proportional to speed squared, its unobstructed apex is twice the ordinary jump height, rather than four times. The two-forward-rotation action lasts 96% of its calculated same-height flight time (2 * launch speed / gravity); landing clears it early if necessary. Existing substepped collision still stops the launch at ceilings. Only the shared physics decision can produce the enhanced jump; no client-supplied multiplier or slideJump flag is accepted.

Forward and double-slide flips use occupied-hand weapon restrictions and the same body/tuck transforms in remote animation and bullet boxes. Existing action snapshot, prediction acknowledgement and replay pose channels carry the new action kinds. The camera stays level. The combat menu and contextual hint describe both actions.

No tests, syntax checks, browser sessions, previews or multiplayer/visual verification were performed, following the user instruction. Deployment metadata establishes publication only.
