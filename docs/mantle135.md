# Reliable wall-to-roof and narrow-wall mantling — mantle135

The prior mantle search only cast in the camera heading and required the entire character footprint to fit inside a top surface. Near a high wall it also rejected useful edges because their elevation angle was below the camera gaze; projecting roof caps blocked its mandatory straight vertical lift. These source conditions made wall-to-roof transitions and thin-wall catches difficult.

The search now also casts inward along the currently contacted wall normal while wall-running, so looking/running along the wall can still find its roof. Close and wall-contact candidates do not require a precise camera pitch. The supported rise window becomes 0.08 m to min(2.35 m, standing height + 0.35 m), and edge distance is at most 1.05 m. Narrow solid tops at least 0.14 m across can be straddled by centring the feet on a small supported strip; the entire standing body must still have free space above the target. Ramps, disabled, moving and falling/bouncy surfaces retain their prior exclusions.

If the ordinary lift-then-pull route is blocked, the planner tries bounded retreats of 0.14–0.56 m before lifting clear of a projecting roof cap, with a maximum retreat-to-target span of 1.65 m. Every retreat, lift and pull segment is checked against standing-body collision. The animation follows the selected smooth three-phase route, rechecking support and per-step clearance. Invalid routes remain rejected; there is no teleport through the overhang. Retreat waypoints are cloned in prediction and sent with the existing authoritative mantle state.

At a reachable roof edge the automatic mantle takes priority even if jump is pressed during wall running. Away from a valid ledge the normal wall kick still runs. Existing full-flip completion priority remains. Both Worker/LAN and client prediction use the same planner and path. Camera rotation and transient action HUD remain absent.

No tests, syntax checks, browser sessions or visual/multiplayer verification were performed, following the user instruction. Publication metadata establishes deployment only.
