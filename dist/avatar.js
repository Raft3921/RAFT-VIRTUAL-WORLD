import * as THREE from 'three';

const PX = 1 / 16;
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;

// Java 64 × 64 layout, in pixels. The slim arm is 3 × 12 × 4:
// its front/back are THREE pixels wide, but both side faces are FOUR.
// Atlas orientation (including the flipped bottom face) is the same as
// https://github.com/bs-community/skinview3d/blob/master/src/model.ts .
const PARTS = {
  head: { size: [8, 8, 8], base: [0, 0], overlay: [32, 0], inflate: .5 },
  torso: { size: [8, 12, 4], base: [16, 16], overlay: [16, 32], inflate: .25 },
  rightArm: { size: [3, 12, 4], base: [40, 16], overlay: [40, 32], inflate: .25 },
  leftArm: { size: [3, 12, 4], base: [32, 48], overlay: [48, 48], inflate: .25 },
  rightLeg: { size: [4, 12, 4], base: [0, 16], overlay: [0, 32], inflate: .25 },
  leftLeg: { size: [4, 12, 4], base: [16, 48], overlay: [0, 48], inflate: .25 },
};

function faceRects(origin, width, height, depth, start, length) {
  const [u, v] = origin;
  return [
    [u + depth + width, v + depth + start, depth, length], // +X, player left side
    [u, v + depth + start, depth, length], // -X, player right side
    [u + depth, v, width, depth], // top
    [u + depth + width, v, width, depth], // bottom
    [u + depth, v + depth + start, width, length], // +Z, face/front
    [u + depth * 2 + width, v + depth + start, width, length], // back
  ];
}

function skinBox(part, overlay = false, start = 0, length = part.size[1]) {
  const [width, fullHeight, depth] = part.size;
  const pad = overlay ? part.inflate : 0;
  // Keep a joint's touching ends in the same plane. Only the outer ends of
  // a split sleeve/trouser get inflation; this avoids a cuff at every joint.
  const topPad = start === 0 ? pad : 0;
  const bottomPad = start + length === fullHeight ? pad : 0;
  const geometry = new THREE.BoxGeometry(
    (width + pad * 2) * PX,
    (length + topPad + bottomPad) * PX,
    (depth + pad * 2) * PX,
  );
  geometry.translate(0, (topPad - bottomPad) * PX / 2, 0);
  const rects = faceRects(overlay ? part.overlay : part.base, width, fullHeight, depth, start, length);

  // A bent elbow/knee exposes the new cut face. Sample the neighbouring
  // skin row here, never the shoulder cap or a transparent atlas gap.
  if (start > 0) rects[2] = [rects[4][0], rects[4][1], width, 1];
  if (start + length < fullHeight) rects[3] = [rects[4][0], rects[4][1] + length - 1, width, 1];
  const uv = geometry.getAttribute('uv');
  for (let face = 0; face < 6; face++) {
    const [x, y, w, h] = rects[face];
    const left = x / 64, right = (x + w) / 64;
    const top = 1 - y / 64, bottom = 1 - (y + h) / 64;
    // BoxGeometry's bottom face has the opposite V orientation in Java's net.
    const upperV = face === 3 ? bottom : top;
    const lowerV = face === 3 ? top : bottom;
    uv.setXY(face * 4, left, upperV);
    uv.setXY(face * 4 + 1, right, upperV);
    uv.setXY(face * 4 + 2, left, lowerV);
    uv.setXY(face * 4 + 3, right, lowerV);
  }
  geometry.clearGroups(); // one atlas material, not six per-face draw calls
  geometry.userData = { rects, partSize: [...part.size], start, length, overlay };
  return geometry;
}

// A slightly fatter cube at the elbow/knee pivot fills the inner crease
// that two axis-aligned boxes leave when the joint bends.
function jointBox(part, overlay = false) {
  const [width, fullHeight, depth] = part.size;
  const pad = overlay ? part.inflate + .2 : .45;
  const length = 3.4;
  const geometry = new THREE.BoxGeometry(
    (width + pad * 2) * PX,
    length * PX,
    (depth + pad * 2) * PX,
  );
  const start = Math.max(0, Math.round(fullHeight / 2) - 2);
  const rects = faceRects(overlay ? part.overlay : part.base, width, fullHeight, depth, start, 3);
  const uv = geometry.getAttribute('uv');
  for (let face = 0; face < 6; face++) {
    const [x, y, w, h] = rects[face];
    const left = x / 64, right = (x + w) / 64;
    const top = 1 - y / 64, bottom = 1 - (y + h) / 64;
    const upperV = face === 3 ? bottom : top;
    const lowerV = face === 3 ? top : bottom;
    uv.setXY(face * 4, left, upperV);
    uv.setXY(face * 4 + 1, right, upperV);
    uv.setXY(face * 4 + 2, left, lowerV);
    uv.setXY(face * 4 + 3, right, lowerV);
  }
  geometry.clearGroups();
  return geometry;
}

function group(name, parent, x = 0, y = 0, z = 0) {
  const result = new THREE.Group();
  result.name = name;
  result.position.set(x * PX, y * PX, z * PX);
  parent.add(result);
  return result;
}

/**
 * A 2 m Java slim player, front = local +Z, feet = root y=0.
 * Owner controls root.position/rotation. Head lookYaw is relative to the body;
 * positive lookPitch looks down. update receives world speed in metres/sec.
 * All supplied 64x64 skins (and proportionally scaled HD PNGs) share this rig.
 */
export async function createAvatar(url) {
  const texture = await new THREE.TextureLoader().loadAsync(url);
  const image = texture.image;
  if (!image || image.width !== image.height || image.width < 64 || image.width % 64 !== 0) {
    texture.dispose();
    throw new Error('64×64 の Java スキン PNG を選んでください。');
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 1;
  const baseMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: .88, metalness: 0 });
  const overlayMaterial = new THREE.MeshStandardMaterial({
    map: texture, roughness: .88, metalness: 0, alphaTest: .5,
    transparent: false, side: THREE.DoubleSide,
  });
  const geometries = [];
  const meshes = [];
  const root = new THREE.Group();
  root.name = 'java-slim-player';
  const pelvis = group('pelvis', root);
  const torso = group('waist', pelvis, 0, 12);

  function addPart(parent, name, x, y, start = 0, length = PARTS[name].size[1]) {
    const definition = PARTS[name];
    for (const overlay of [false, true]) {
      const geometry = skinBox(definition, overlay, start, length);
      const mesh = new THREE.Mesh(geometry, overlay ? overlayMaterial : baseMaterial);
      mesh.name = `${name}-${start}-${overlay ? 'overlay' : 'base'}`;
      mesh.position.set(x * PX, y * PX, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      geometries.push(geometry);
      meshes.push(mesh);
    }
  }

  function addJoint(parent, name, x = 0, y = 0) {
    const definition = PARTS[name];
    for (const overlay of [false, true]) {
      const geometry = jointBox(definition, overlay);
      const mesh = new THREE.Mesh(geometry, overlay ? overlayMaterial : baseMaterial);
      mesh.name = `${name}-joint-${overlay ? 'overlay' : 'base'}`;
      mesh.position.set(x * PX, y * PX, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      geometries.push(geometry);
      meshes.push(mesh);
    }
  }

  addPart(torso, 'torso', 0, 6);
  const head = group('neck', torso, 0, 12);
  head.rotation.order = 'YXZ';
  addPart(head, 'head', 0, 4);
  const shoulders = {};
  const elbows = {};
  const hips = {};
  const knees = {};
  for (const [side, sign] of [['right', -1], ['left', 1]]) {
    // Java's shoulder is two pixels below the top edge, not at arm centre.
    const shoulder = group(`${side}-shoulder`, torso, sign * 5, 10);
    const elbow = group(`${side}-elbow`, shoulder, sign * .5, -4);
    addPart(shoulder, `${side}Arm`, sign * .5, -1.4, 0, 6);
    addPart(elbow, `${side}Arm`, 0, -2.6, 6, 6);
    addJoint(elbow, `${side}Arm`);
    const hip = group(`${side}-hip`, pelvis, sign * 2, 12);
    const knee = group(`${side}-knee`, hip, 0, -6);
    addPart(hip, `${side}Leg`, 0, -3.4, 0, 6);
    addPart(knee, `${side}Leg`, 0, -2.6, 6, 6);
    addJoint(knee, `${side}Leg`);
    shoulders[side] = shoulder;
    elbows[side] = elbow;
    hips[side] = hip;
    knees[side] = knee;
  }

  let phase = 0;
  let elapsed = 0;
  let motion = 0;
  let running = 0;
  let airborne = 0;
  let flying = 0;
  let ragdollWeight = 0;
  let landing = 0;
  let wasGrounded = true;
  let lastVerticalSpeed = 0;
  let disposed = false;
  const gestures = { none: 0, wave: 0, cheer: 0, pose: 0 };
  const animation = { speed: 0, motion: 0, running: 0, grounded: true, phase: 0, gesture: 'none' };
  root.userData.animation = animation;

  // Two-bone leg solve. Stance soles remain on the ground; the knee bends
  // backwards while the raised foot advances, instead of spinning whole legs.
  function solveLeg(side, footZ, lift, hipHeight, dt) {
    const limbLength = 6 * PX;
    let footY = lift;
    let hipAngle = 0, kneeAngle = 0;
    for (let i = 0; i < 3; i++) {
      const down = hipHeight - footY;
      const distance = clamp(Math.hypot(down, footZ), .1, limbLength * 2);
      kneeAngle = Math.acos(clamp((distance * distance - 2 * limbLength * limbLength) / (2 * limbLength * limbLength), -1, 1));
      hipAngle = Math.atan2(-footZ, down) - kneeAngle / 2;
      // The block-shaped sole has depth; account for its lowest tilted edge.
      footY = lift + Math.abs(Math.sin(hipAngle + kneeAngle)) * 2 * PX;
    }
    hips[side].rotation.x = damp(hips[side].rotation.x, hipAngle, 22, dt);
    knees[side].rotation.x = damp(knees[side].rotation.x, kneeAngle, 22, dt);
  }

  function update(dt, state = {}) {
    if (disposed) return;
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, .06);
    elapsed = Number.isFinite(state.time) ? state.time : elapsed + dt;
    const speed = Math.max(0, Math.abs(state.speed || 0));
    const grounded = state.grounded !== false;
    const verticalSpeed = state.verticalSpeed || 0;
    const moving = clamp(speed / .7, 0, 1);
    motion = damp(motion, moving, moving > motion ? 10 : 13, dt);
    if (speed < .01 && motion < .001) motion = 0;
    running = damp(running, state.run ? 1 : 0, 7, dt);
    airborne = damp(airborne, grounded ? 0 : 1, 13, dt);
    flying = damp(flying, state.flight ? 1 : 0, 8, dt);
    ragdollWeight = damp(ragdollWeight, state.ragdoll ? 1 : 0, state.ragdoll ? 18 : 4, dt);
    if (grounded && !wasGrounded) landing = clamp(Math.abs(lastVerticalSpeed) * .007, .015, .065);
    landing = damp(landing, 0, 11, dt);
    wasGrounded = grounded;
    lastVerticalSpeed = verticalSpeed;
    phase = (phase + dt * speed * TAU / (1.35 + running * .38)) % TAU;
    const stride = (.24 + running * .08) * motion;
    const breathing = Math.sin(elapsed * 1.7);
    const bob = (1 - Math.cos(phase * 2)) * .0055 * motion;
    pelvis.position.y = -.047 * motion + bob - landing;
    torso.rotation.x = damp(torso.rotation.x, motion * (.035 + running * .075) + airborne * .05 + flying * .38, 9, dt);
    torso.rotation.y = Math.sin(phase) * .035 * motion;
    torso.rotation.z = Math.sin(phase) * .012 * motion;
    // Breathing is limited to the upper body so the feet never bounce at rest.
    torso.scale.y = 1 + breathing * .002;
    const hipHeight = 12 * PX + pelvis.position.y;
    for (const [side, offset, sign] of [['right', 0, -1], ['left', Math.PI, 1]]) {
      const legPhase = phase + offset;
      const legSwing = Math.cos(legPhase);
      // +Z is forward. With z = cos(phase), sin > 0 moves the foot
      // backwards relative to the body (planted stance); only lift it on
      // the sin < 0 return stroke, when it travels forward for the next step.
      const lift = Math.pow(Math.max(0, -Math.sin(legPhase)), 1.5) * (.11 + running * .045) * motion;
      if (airborne < .02) {
        solveLeg(side, legSwing * stride, lift, hipHeight, dt);
      } else {
        hips[side].rotation.x = damp(hips[side].rotation.x, -.22 + sign * .10 * motion, 10, dt);
        knees[side].rotation.x = damp(knees[side].rotation.x, .42 + clamp(-verticalSpeed * .035, 0, .22), 10, dt);
      }
      shoulders[side].rotation.set(
        legSwing * (.52 + running * .23) * motion - airborne * .30,
        0,
        sign * (.035 + .015 * breathing) + sign * airborne * .24,
      );
      elbows[side].rotation.set(-.035 - motion * (.16 + running * .56) - Math.max(0, -legSwing) * .18 * motion, 0, 0);
    }
    if (grounded && airborne < .02) {
      // Damped joints lag the target slightly during acceleration. Correct
      // the pelvis from the actual soles so neither foot crosses the ground.
      let lowestSole = Infinity;
      for (const side of ['right', 'left']) {
        const a = hips[side].rotation.x;
        const b = a + knees[side].rotation.x;
        const sole = hipHeight - 6 * PX * (Math.cos(a) + Math.cos(b)) - 2 * PX * Math.abs(Math.sin(b));
        lowestSole = Math.min(lowestSole, sole);
      }
      if (lowestSole < 0) pelvis.position.y -= lowestSole;
    }
    const gestureName = typeof state.gesture === 'number'
      ? ['none', 'wave', 'cheer', 'pose'][state.gesture] || 'none'
      : state.gesture || 'none';
    for (const name of ['wave', 'cheer', 'pose']) gestures[name] = damp(gestures[name], name === gestureName ? 1 : 0, 9, dt);
    function gestureJoint(joint, x, y, z, weight) {
      joint.rotation.x = THREE.MathUtils.lerp(joint.rotation.x, x, weight);
      joint.rotation.y = THREE.MathUtils.lerp(joint.rotation.y, y, weight);
      joint.rotation.z = THREE.MathUtils.lerp(joint.rotation.z, z, weight);
    }
    gestureJoint(shoulders.right, -.2, 0, -2.35, gestures.wave);
    gestureJoint(elbows.right, -.35, .10, Math.sin(elapsed * 7) * .22 - .15, gestures.wave);
    for (const [side, sign] of [['right', -1], ['left', 1]]) {
      gestureJoint(shoulders[side], -.16, 0, sign * 2.55, gestures.cheer);
      gestureJoint(elbows[side], -.22, 0, sign * Math.sin(elapsed * 4) * .08, gestures.cheer);
      gestureJoint(shoulders[side], .07, 0, sign * .28, gestures.pose);
      gestureJoint(elbows[side], -1.1, -sign * .45, 0, gestures.pose);
    }
    const punchCharge = clamp(state.punchCharge || 0, 0, 1);
    const punchSwing = clamp(state.punchSwing || 0, 0, 1);
    if (punchCharge > .001) {
      gestureJoint(shoulders.right, .78 + punchCharge * .5, -.28, .48, punchCharge);
      gestureJoint(elbows.right, -1.78, .18, .08, punchCharge);
      gestureJoint(shoulders.left, .22, .12, .32, punchCharge * .65);
      gestureJoint(hips.right, .1, 0, 0, punchCharge * .3);
    }
    if (punchSwing > .001) {
      const weight = Math.sin(punchSwing * Math.PI);
      gestureJoint(shoulders.right, -1.58, -.2, -.1, weight);
      gestureJoint(elbows.right, -.05, 0, 0, weight);
      gestureJoint(shoulders.left, .42, .08, .22, weight * .65);
    }
    if (flying > .001) {
      for (const [side, sign] of [['right', -1], ['left', 1]]) {
        const stroke = Math.sin(elapsed * 7 + (side === 'left' ? Math.PI : 0));
        gestureJoint(shoulders[side], .78 + stroke * .12, 0, sign * .22, flying);
        gestureJoint(elbows[side], -.48 - Math.max(0, stroke) * .16, 0, sign * .08, flying);
        gestureJoint(hips[side], .35 - stroke * .32, 0, 0, flying);
        gestureJoint(knees[side], .58 + Math.max(0, stroke) * .32, 0, 0, flying);
      }
    }
    if (ragdollWeight > .001) {
      const tumble = Math.sin(elapsed * 12);
      torso.rotation.x += tumble * .38 * ragdollWeight;
      torso.rotation.z += (.48 + Math.cos(elapsed * 8) * .24) * ragdollWeight;
      for (const [side, sign] of [['right', -1], ['left', 1]]) {
        shoulders[side].rotation.x += Math.sin(elapsed * 10 + sign) * .55 * ragdollWeight;
        shoulders[side].rotation.z += sign * 1.05 * ragdollWeight;
        elbows[side].rotation.x += (-.7 + Math.cos(elapsed * 14 + sign) * .35) * ragdollWeight;
        hips[side].rotation.x += (.55 + tumble * .2) * ragdollWeight;
        knees[side].rotation.x += .75 * ragdollWeight;
      }
    }
    head.rotation.y = damp(head.rotation.y, clamp(state.lookYaw || 0, -.95, .95) - torso.rotation.y * .6, 12, dt);
    head.rotation.x = damp(head.rotation.x, clamp(state.lookPitch || 0, -.65, .7) - torso.rotation.x * .65, 12, dt);
    head.rotation.z = -torso.rotation.z * .4;
    Object.assign(animation, { speed, motion, running, grounded, phase, gesture: gestureName });
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    geometries.forEach(geometry => geometry.dispose());
    baseMaterial.dispose();
    overlayMaterial.dispose();
    texture.dispose();
  }

  return {
    root, update, dispose, head,
    joints: { pelvis, torso, head, shoulders, elbows, hips, knees },
    dimensions: { height: 2, eyeHeight: 1.79, armWidth: 3 * PX, armDepth: 4 * PX },
    diagnostics: { model: 'slim', textureSize: image.width, meshes: meshes.length, materialCount: 2, textureCount: 1 },
  };
}
