# Player movement — physics101

Ordinary jumps (including Sand Town and mirror-world walking) use an initial
vertical speed of 5.4 m/s and gravity of 24 m/s²: approximately 0.61 m at the apex
and 0.45 seconds airborne. The athletic course retains 7.95 m/s and 15 m/s² so its
599 existing gaps remain reachable. Trampolines, tent launches, flight, combat
impulses and seated activities retain their distinct behavior.

`world-collision.js` owns the swept, subdivided oriented-box/ramp collision solver.
Airborne bodies cannot step onto nearby surfaces; normal landing requires feet
to cross the top while descending. Only supported walking can step up (maximum
28 cm, with head clearance). Ramp sides remain solid. The rendered world and the
DOM-free server world build identical colliders; furniture and reflected avenue
geometry are shared too.

LAN and Worker rooms process ordered movement inputs using `stepPlayer`, own
vertical velocity/contact state and acknowledge accepted input sequences.
Clients predict with the same solver, discard acknowledged inputs, replay the
remaining inputs, and decay a render-only correction offset. Missing input stops
walking while server gravity continues. Movement epochs invalidate old responses
around activity changes/portal travel; gun teleports retain their server serial.
Flight, knockback, attacks and seated/exercise/ride constraints continue through
the existing activity protocols, rather than becoming part of normal walking
input. This is kinematic player physics, not a general rigid-body replacement for
all world objects.

Sync protocol is **3**, release `vrs-physics101`. Publish client and Worker together;
older protocol clients show the existing reload notice. This release is published
as a paired GitHub Pages and Cloudflare Worker update.

## Verification

- 39 targeted tests pass, including every stair-to-roof route, rotated stair-side
  collisions, airborne ledge crossing, fast falls/ceilings, clearance, 20/60/144 FPS
  jump arcs, all 599 course hops, mirror walking, lost-input falling, input replay,
  and two-client LAN acknowledgement/broadcast behavior.
- Worker dry-run bundles successfully; JavaScript syntax and diff checks pass.
- Local browser: entry, walking, jump and landing checked. Walking telemetry showed
  sequence 37 / acknowledgement 34 / 3 pending inputs / zero correction offset.
- Existing `motion.test.mjs` / `world.test.mjs` canvas mocks lack
  `createRadialGradient`; `room.test.mjs:27` has a stale-hit expectation failure.
  Both failure types were reproduced against the unmodified HEAD sources.
  They are separate from the new movement checks. Real-device latency/load testing
  and production Worker behavior remain unverified.
