# Feet-on-wall running, wall transfers and lateral flips — wallfloor128

The previous frontal hand-climb action is removed. Dash-jumping onto a wall enters feet-on-wall running: the avatar rotates up to 90 degrees so its local up axis matches the server-derived wall normal. Input toward the wall drives upward surface travel, tangent input drives lateral travel, and combinations produce diagonal movement. A shared sideways body prism and centre offset pass through the existing substepped collision solver; nearby obstructions reject attachment. A wall run lasts up to 2.4 seconds per wall, with cooldowns and six kicks before landing. Jump kicks outward/upward; reaching a different wall permits reattachment. A running-wall jump takes precedence over the existing manual ledge pull-up. Automatic hand-climb-to-mantle is removed. Standard manual ledge mantling remains available outside a wall run.

Grounded predominantly lateral input plus jump starts a direction-matched lateral full rotation with a tucked body and lateral impulse when clearance permits. Backward jump keeps the existing backflip. Sideflips share occupied-hands weapon restrictions. The camera remains level.

Wall normals and action state reach local/remote avatar animation, server hit history, conservative rotated bullet boxes and shooter replay snapshots. A shared quaternion pose maps the body and hitboxes into the wall plane and offsets the feet to the contact surface. Vertical wall speed contributes to run animation. Wall contact dust is placed at the wall foot level.

In first person, prone hides the local avatar body, including during most of the standing-up blend. The separate first-person weapon/hand rig remains visible. Third-person, remote, mirror and portal views keep the full prone body. The local-body framing offset is disabled during wall running to preserve wall contact.

No tests, syntax checks, browser sessions, visual or multiplayer verification were performed, following the user instruction. Publication metadata only establishes deployment.
