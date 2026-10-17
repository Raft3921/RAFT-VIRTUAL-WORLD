# Local first-person body framing — bodyview127

The local first-person body receives a temporary pelvis translation toward the horizontal view direction, 0.32 m normally and up to 0.46 m while looking down, scaled by avatar eye height. Prone and slide use smaller offsets. Seated, sleeping, mantling and hands-busy acrobatics retain their original body contacts. ADS progressively removes the offset. A nearby-solid sweep limits forward displacement.

Only the local avatar main-view rendering receives this transform. The avatar root, camera, server state, movement collisions, hitboxes, footprints and remote players remain unchanged. After the main render the pelvis is restored, including its world matrices, before mirror/portal passes and subsequent animation updates. Existing head masking and viewmodel-arm masking remain.

No tests, syntax checks, browser or visual verification were performed, following the user's instruction. Deployment metadata only establishes publication.
