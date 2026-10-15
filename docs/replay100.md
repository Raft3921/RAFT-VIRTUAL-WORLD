# Replay and breakable props — replay100

Replay cameras plan and validate a complete rail once per cut. Playback interpolates that rail without frame-by-frame camera candidate switches or emergency teleports. If no continuous route fits, that cut uses a fixed station. Collision safety still applies to positions and connecting segments. Four intentional edit cuts are retained.

Doors have a shared left hinge for the leaf, panels, handles and hinge hardware. The server records the incoming push/shot direction; clients animate a fast opening with hinge drag and a small stop rebound. The open state remains permanent. Window grilles fracture into staggered segments and fall under gravity, bounce once, and settle flat above the floor. Fixed attachment sockets remain. Sword impacts continue to use convex plane cutting.

Animation age uses the server trace timestamp, so late joins see settled objects. Settled fragments are merged into one permanent mesh. Existing trace records remain compatible.

Validation: replay rail continuity and fixed fallback, invariant door hinge, late-join final pose, fragment floor clearance, duplicate trace idempotence; existing gun, hand-motion, plaza and tactical suites. Door and grille rendering checked in a dedicated browser scene. Multiplayer live-match replay appearance has not been manually checked.
