# Combat effects, original text presentation and prone floor contact — effects108

Muzzle flashes, smoke, impact dust, metal sparks, landing dust and replay contact effects are moderately stronger. Existing instanced particle and casing pool limits remain unchanged. Explosions retain their world-space radius. The cinematic shooter recoil is slightly stronger, with a short, reduced-motion-aware impact camera response.

Countdown/start typography and its stepped scale animation return to the pre-cinema106 presentation. HIT/K.O. restore the previous yellow pixel text and scale/fade animation. Victory/defeat/draw restore Japanese labels, large pixel typography, team outcome colors and bordered center-screen treatment, including the third, overview replay cut. The first two replay cuts remain free of HUD and text.

Prone animation incorrectly subtracted standing leg height after rotating the rig around its floor-level root, placing the body underground. Prone pelvis height now starts above ground and uses the actual skinned mesh corner bounds after animation to clear the contact plane. The first-person weapon/arm floor correction no longer leaves penetration behind by capping the required lift at 0.5 m. Authoritative movement and hitboxes are unchanged.

This is a client presentation release; server protocol and network107 movement synchronization remain unchanged. No tests, runtime checks or browser verification were run, following the user's earlier instruction.
