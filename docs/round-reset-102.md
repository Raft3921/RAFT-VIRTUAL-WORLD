# Round reset and jump tuning — round102

Ordinary jumps now launch at 6.2 m/s under the existing 24 m/s² gravity:
approximately 80 cm high and 0.52 seconds airborne. Athletic-course parameters
are unchanged; all 599 hops still pass.

Sand Town destruction is scoped to the current match. Legacy saved destruction
is ignored when a room starts. First entry, successful round start, return to
waiting after a result, and aborted matches clear the server's prop traces and
old marks. Waiting players cannot damage props. Saved life settings remain intact;
saved prop traces are cleared instead of recording the current match's damage.

Reset events and authoritative battle snapshots restore the client's closed-door
and intact-grille instance transforms and collision. They also remove falling
fragments, baked debris and old bullet marks. A client that misses the explicit
reset still restores removed damage from the next complete snapshot.

Release: `vrs-round102`, protocol 3. Client and Worker are published together.
Validation: 50 targeted tests pass, including round start/end/abort, old-save
handling, server collision restoration, door transforms, animated/baked fragment
cleanup, late snapshots, jump arcs, LAN movement and athletic routes. Worker
bundling, syntax and diff checks pass. No physical-device performance test was run.
