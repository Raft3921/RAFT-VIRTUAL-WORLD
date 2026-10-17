# Supported town circulation, cover and stable dash view — settlement125

The user supplied a screenshot of stacked unsupported-looking stairs/landings, sparse cover and excessive empty street space, and reports a nauseating rebound when stopping a dash.

New town variants now use a shared supported stairwell recipe. Alternating ramp flights join continuous landings, with foundations, street-to-top piers, an outer wall, landing beams and edge rails. Only the actual top landing connects to the roof; the spare opposite floating roof connector is removed. Terrace approaches use the same assembly. Most buildings are now 5.4–9 m tall, with selected 14.4–21.6 m landmarks on terraces up to 7.2 m, rather than repeating very tall towers throughout. Existing lower passages remain. Mismatched-height diagonal skywalk slabs are removed; only flat matched-height bridges with street-to-deck piers and rails are built.

Gaps between districts and the perimeter receive alternating small two-door rooms, full-height L-shaped walls, roofed refuges and staggered low/full-height cover. Placement rejects overlaps against reserved tower/stair footprints and exit-board approaches. Small rooms use the same detailed door/grille recipe as all four maps. Shared geometry still feeds render, server movement, bullets, prop grouping and spawn search.

Ground movement now follows input direction directly at the shared target speed, retaining the fast sprint ramp and immediate release stop from props124. Direction changes no longer wait for a vector acceleration curve or lose sprint charge through alignment decay. Slide and airborne inertia remain.

The camera no longer adds movement-driven field-of-view changes, walk/run bob, roll or sprint pitch. Camera pitch from action motion is limited to actual airborne/landing response and gun recoil; sub-2 m/s contact changes do not emit landing impulses. Duplicated raw hand bobs are removed. The remaining smaller viewmodel pose uses first-order settling; deceleration cannot add a reverse kick. Armed avatar braking lean is disabled. Classic gun-zone follow mode also removes positional follow lag while healthy. ADS, firing, reload, melee, prone and slide posture behavior remains.

No tests, syntax checks, browser checks, visual previews or multiplayer verification were performed, following the user's earlier instruction. Actual navigation, cover density and comfort remain unverified. props124 deployment was already dispatched when this feedback arrived; settlement125 includes that change and these follow-up revisions.
