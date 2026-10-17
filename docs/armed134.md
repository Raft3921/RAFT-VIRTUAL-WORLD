# Firearm actions throughout the world — armed134

A shared combatMovementEnabled predicate enables the existing combat locomotion inside the selected gun zone as before, or anywhere with an equipped firearm. The server checks its authoritative equippedWeapon rather than trusting the client's action flag. Katana-only equipment outside the zone retains the previous ordinary movement behavior. The shared movement step no longer independently rejects positions outside the gun zone, so crossing its border while armed retains action state.

The client uses the same predicate for prediction, airborne jump presses, prone/slide ownership, and stable classic follow behavior. Armed midair jumps go to wall actions rather than double-tap flight activation. Existing flight can still be exited. In houses, Shift becomes sprint while armed rather than the ordinary indoor crouch shortcut. Armed course movement also uses the shared action path. Duel, cooking, exercise, seating, sleep, flight and ragdoll retain their activity rules; server cooking/exercise busy checks are evaluated once per packet. Missing or inactive ordinary armed movement is held authoritatively, while outside-zone special activity transitions keep their existing path. The combat-menu operation guide explains outside-zone firearm availability.

Existing jump/flip, wall run, double-strength wallspin, slide and slide-jump implementations are reused unchanged. Camera rotation remains absent, and the existing anatomical hit geometry and low-buffer synchronization remain.

No tests, syntax checks, browser sessions or device/multiplayer/visual verification were performed, following the user instruction. Deployment metadata establishes publication only.
