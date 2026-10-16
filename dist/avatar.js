import {createWeaponClearance} from './weapon-clearance.js?v=20261016-effects108';
import {createGunActionMotion,stepGunActionMotion} from './gun-action-motion.js?v=20261016-cinema106';
import {sampleKatanaPose} from './katana-motion.js?v=20261016-cinema106';
import {sampleGunReload,shotHandKick} from './gun-hand-motion.js?v=20261016-cinema106';
import {createGunModel,createFiringHand,triggerGunFlash,updateGunFlash,updateGunReload} from './gun-visual.js?v=20261016-effects108';
import * as THREE from 'three';
import {withLocalLighting} from './local-lighting.js?v=20261014-world96';
import { sampleAttack,sampleCharge } from './combat-motion.js?v=20261013-life89b';
import {applyAvatarHitPose,groundAvatarHitPose} from './avatar-hit-pose.js?v=20261015-spectacle104';
import { jemAvatarDefinition } from './jem-avatar.js?v=20261014-cinema93';

const swordGhostMaterials=[];
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

const avatarGeometryCache=new Map();
function skinBox(part,overlay=false,start=0,length=part.size[1]){const key='skin:'+JSON.stringify([part,overlay,start,length]);if(!avatarGeometryCache.has(key)){const geometry=makeSkinBox(part,overlay,start,length);geometry.userData.avatarShared=true;avatarGeometryCache.set(key,geometry);}return avatarGeometryCache.get(key);}
function makeSkinBox(part, overlay = false, start = 0, length = part.size[1]) {
  const [width, fullHeight, depth] = part.size;
  const pad = overlay ? part.inflate : 0;
  // Keep a joint's touching ends in the same plane. Only the outer ends of
  // a split sleeve/trouser get inflation; this avoids a cuff at every joint.
  const seamInset=overlay&&part.baseBox&&part.size[1]<8 ? .012 : 0;
  const topPad = start === 0 ? pad : -seamInset;
  const bottomPad = start + length === fullHeight ? pad : -seamInset;
  const geometry = new THREE.BoxGeometry(
    (width + pad * 2) * PX,
    (length + topPad + bottomPad) * PX,
    (depth + pad * 2) * PX,
  );
  geometry.translate(0, (topPad - bottomPad) * PX / 2, 0);
  const rects = faceRects(overlay ? part.overlay : part.base, width, fullHeight, depth, start, length);
  const box=overlay?part.overlayBox:part.baseBox;
  // Face UV endpoints may run backwards: preserve the supplied orientation.
  if(box&&!box.textureOffset){
    for(const [face,key]of ['uvWest','uvEast','uvUp','uvDown','uvNorth','uvSouth'].entries()){
      const value=box[key];if(!value)continue;const [u1,v1,u2,v2]=value;
      const side=face===0||face===1||face===4||face===5;
      rects[face]=[u1,side?v1+(v2-v1)*start/fullHeight:v1,u2-u1,side?(v2-v1)*length/fullHeight:v2-v1];
    }
  }

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
function jointBox(part,overlay=false){const key='joint:'+JSON.stringify([part,overlay]);if(!avatarGeometryCache.has(key)){const geometry=makeJointBox(part,overlay);geometry.userData.avatarShared=true;avatarGeometryCache.set(key,geometry);}return avatarGeometryCache.get(key);}
function makeJointBox(part, overlay = false) {
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
export async function createAvatar(url,{model=null}={}) {
  const custom=model?jemAvatarDefinition(model):null,parts=custom?.parts||PARTS;
  const legHeight=custom?.legHeight||12,bodyBottom=custom?.bodyBottom||12,bodyHeight=custom?.bodyHeight||12;
  const legHalf=legHeight/2,armHalf=parts.leftArm.size[1]/2,motionScale=legHeight/12;
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
  const skinCanvas=document.createElement('canvas');skinCanvas.width=image.width;skinCanvas.height=image.height;
  const skinContext=skinCanvas.getContext('2d',{willReadFrequently:true});skinContext.drawImage(image,0,0);
  const front=faceRects(parts.head.base,...parts.head.size,0,parts.head.size[1])[4];
  const pixel=skinContext.getImageData(Math.floor((front[0]+front[2]-1)*image.width/64),Math.floor((front[1]+front[3]-1)*image.height/64),1,1).data;
  const skinColor=new THREE.Color().setRGB(pixel[0]/255,pixel[1]/255,pixel[2]/255,THREE.SRGBColorSpace);
  const bald={value:0},headMaterials=[];
  const geometries = [];
  const meshes = [];
  const root = new THREE.Group();
  root.name = custom?'gyoza-jem-player':'java-slim-player';
  const pelvis = group('pelvis', root);
  const torso = group('waist', pelvis, 0, bodyBottom);

  function addPart(parent, name, x, y, start = 0, length = parts[name].size[1]) {
    const definition = parts[name];
    for (const overlay of [false, true]) {
      const geometry = skinBox(definition, overlay, start, length);
      let partMaterial=overlay?overlayMaterial:baseMaterial;
      if(name==='head'){
        partMaterial=partMaterial.clone();headMaterials.push(partMaterial);
        partMaterial.onBeforeCompile=shader=>{
          shader.uniforms.uBald=bald;shader.uniforms.uSkinColor={value:skinColor};
          shader.vertexShader='varying float vHeadY;\n'+shader.vertexShader;
          shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvHeadY=position.y;');
          shader.fragmentShader='varying float vHeadY; uniform float uBald; uniform vec3 uSkinColor;\n'+shader.fragmentShader;
          const height=(definition.size[1]+(overlay?definition.inflate*2:0))*PX;
          shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
            '#include <color_fragment>\n'+(overlay?`if(uBald>0. && vHeadY > ${(height/2).toFixed(6)}-uBald*${height.toFixed(6)}) discard;`:`if(uBald>0. && vHeadY > ${(height/2).toFixed(6)}-uBald*${height.toFixed(6)}) diffuseColor.rgb=uSkinColor;`));
        };
        partMaterial.customProgramCacheKey=()=>`bald-${overlay}-${definition.size[1]}`;
      }
      const mesh = new THREE.Mesh(geometry, partMaterial);
      mesh.name = `${name}-${start}-${overlay ? 'overlay' : 'base'}`;
      mesh.position.set(x * PX, y * PX, 0);
      mesh.updateMatrix();mesh.matrixAutoUpdate=false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      geometries.push(geometry);
      meshes.push(mesh);
    }
  }

  function addJoint(parent, name, x = 0, y = 0) {
    const definition = parts[name];
    for (const overlay of [false, true]) {
      const geometry = custom?skinBox(definition,overlay,definition.size[1]*.4,definition.size[1]*.2):jointBox(definition,overlay);
      const mesh = new THREE.Mesh(geometry, overlay ? overlayMaterial : baseMaterial);
      mesh.name = `${name}-joint-${overlay ? 'overlay' : 'base'}`;
      mesh.position.set(x * PX, y * PX, 0);
      mesh.updateMatrix();mesh.matrixAutoUpdate=false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      geometries.push(geometry);
      meshes.push(mesh);
    }
  }

  addPart(torso, 'torso', 0, bodyHeight/2);
  const head = group('neck', torso, 0, custom?custom.headBottom-bodyBottom:12);
  head.rotation.order = 'YXZ';
  addPart(head, 'head', 0, parts.head.size[1]/2);
  const shoulders = {};
  const elbows = {};
  const hips = {};
  const knees = {};
  for (const [side, sign] of [['right', -1], ['left', 1]]) {
    // Java's shoulder is two pixels below the top edge, not at arm centre.
    const arm=parts[`${side}Arm`],leg=parts[`${side}Leg`];
    const shoulder = group(`${side}-shoulder`, torso, custom?arm.pivot[0]:sign*5,custom?arm.top-bodyBottom:10);
    const elbow = group(`${side}-elbow`, shoulder,custom?arm.center[0]-arm.pivot[0]:sign*.5,custom?-armHalf:-4);
    addPart(shoulder, `${side}Arm`,custom?arm.center[0]-arm.pivot[0]:sign*.5,custom?-armHalf/2:-1.4,0,armHalf);
    addPart(elbow, `${side}Arm`,0,custom?-armHalf/2:-2.6,armHalf,armHalf);
    // The short JEM limbs already meet at their split ends. An additional
    // atlas-covered joint cube overlaps both halves and produces striped cuffs.
    if(!custom)addJoint(elbow, `${side}Arm`);
    const hip = group(`${side}-hip`, pelvis,custom?leg.center[0]:sign*2,legHeight);
    const knee = group(`${side}-knee`, hip,0,-legHalf);
    addPart(hip, `${side}Leg`,0,custom?-legHalf/2:-3.4,0,legHalf);
    addPart(knee, `${side}Leg`,0,custom?-legHalf/2:-2.6,legHalf,legHalf);
    if(!custom)addJoint(knee, `${side}Leg`);
    shoulders[side] = shoulder;
    elbows[side] = elbow;
    hips[side] = hip;
    knees[side] = knee;
  }

  const crown=new THREE.Group();crown.name='block crown';head.add(crown);
  const gold=new THREE.MeshStandardMaterial({color:'#f9c744',metalness:.45,roughness:.35}),crownGeometry=new THREE.BoxGeometry(1,1,1);
  const crownBand=[];
  const crownX=parts.head.size[0]*PX/2+.03,crownZ=parts.head.size[2]*PX/2+.03,crownFloor=parts.head.size[1]*PX+.01;
  for(const [x,z,w,d] of [[0,-crownZ,crownX*2+.06,.055],[0,crownZ,crownX*2+.06,.055],[-crownX,0,.055,crownZ*2-.05],[crownX,0,.055,crownZ*2-.05]]){
    const b=new THREE.Mesh(crownGeometry,gold);b.position.set(x,.56,z);b.scale.set(w,.12,d);crown.add(b);crownBand.push(b);
  }
  const crownTips=[];
  for(let i=0;i<12;i++){const side=Math.floor(i/3),offset=(i%3-1)*(side<2?crownX:crownZ)*.78;
    const t=new THREE.Mesh(crownGeometry,gold);t.position.set(side<2?offset:(side===2?-crownX:crownX),crownFloor+.19,side<2?(side===0?-crownZ:crownZ):offset);t.scale.set(.09,.14,.09);crown.add(t);crownTips.push(t);
  }
  let appearanceKey='';
  function setAppearance(score=0,enabled=false){
    const key=score+':'+enabled;if(key===appearanceKey)return;appearanceKey=key;
    bald.value=enabled?clamp(-score/8,0,1):0;crown.visible=enabled&&score>0;
    const height=.12+Math.max(0,score-1)*.045;
    crownBand.forEach(b=>{b.position.y=crownFloor+height/2;b.scale.y=height;b.updateMatrix();b.matrixAutoUpdate=false;});
    crownTips.forEach(t=>{t.position.y=crownFloor+height+.07;t.updateMatrix();t.matrixAutoUpdate=false;});
  }
  setAppearance();
  let sitWeight=0,sleepWeight=0,flinchStart=-Infinity,flinchStrength=0,flinchSerial=0;
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
  let previousSpeed=0,braking=0,crouchBlend=0,mantleBlend=0;
  const gunActionState=createGunActionMotion();let gunActionPose={pitch:0,yaw:0,roll:0,jump:0,land:0};
  let previousAttack=0,entryPose=null;
  for(const mesh of meshes)mesh.geometry.computeBoundingBox();
  const gestures = { none: 0, wave: 0, cheer: 0, pose: 0 };
  const animation = { speed: 0, motion: 0, running: 0, grounded: true, phase: 0, gesture: 'none' };
  root.userData.animation = animation;

  // Two-bone leg solve. Stance soles remain on the ground; the knee bends
  // backwards while the raised foot advances, instead of spinning whole legs.
  function solveLeg(side, footZ, lift, hipHeight, dt) {
    const limbLength = legHalf * PX;
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

  const handColors=new Map();
  function createSkinnedFiringHand({forearm=false,side='right',weapon='pistol'}={}){
    const arm=parts[side+'Arm']||parts.rightArm,full=arm.size[1],length=full/2,start=full-length;
    let color=handColors.get(side);
    if(!color){const handRect=faceRects(arm.base,...arm.size,Math.max(0,full-2),2)[4],factor=image.width/64;
    const handPixel=skinContext.getImageData(Math.min(image.width-1,Math.max(0,Math.floor((handRect[0]+handRect[2]*.5)*factor))),Math.min(image.height-1,Math.max(0,Math.floor((handRect[1]+1)*factor))),1,1).data;
    color=new THREE.Color().setRGB(handPixel[0]/255,handPixel[1]/255,handPixel[2]/255,THREE.SRGBColorSpace);handColors.set(side,color);}
    const root=new THREE.Group(),grip=createFiringHand(color,{forearm:false,support:side==='left'});
    root.name=side+' textured firing arm';if(side==='left')grip.scale.x=-1;root.add(grip);
    if(forearm){
      // The sleeve uses this character's actual left/right arm atlas, including its overlay.
      const wrist=new THREE.Vector3(0,-.17,-.065),elbow=new THREE.Vector3(side==='right'?-.22:.29,side==='right'?-.31:-.32,side==='right'?-.53:weapon==='pistol'?-.49:-.73),vector=elbow.clone().sub(wrist),center=wrist.clone().add(elbow).multiplyScalar(.5);
      const sleeves=[];root.userData.forearm={wrist,elbow,meshes:sleeves,skinLength:length*PX};
      for(const overlay of [false,true]){const geometry=skinBox(arm,overlay,start,length),mesh=new THREE.Mesh(geometry,overlay?overlayMaterial:baseMaterial);mesh.name=side+' character sleeve '+(overlay?'overlay':'base');mesh.position.copy(center);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vector.clone().normalize());mesh.scale.set(.117/(arm.size[0]*PX),vector.length()/(length*PX),.125/(arm.size[2]*PX));root.add(mesh);sleeves.push(mesh);}
    }
    return root;
  }

  const weaponGrip=new THREE.Group(),gunInverse=new THREE.Quaternion(),gunAim=new THREE.Quaternion();weaponGrip.name='right hand weapon grip';weaponGrip.position.set(0,-armHalf*PX+.04,0);elbows.right.add(weaponGrip);
  const weaponClearance=createWeaponClearance(),weaponAnchor=new THREE.Vector3();
  let gunModel=null,gunGhosts=[],gunId=null,gunShotAt=-Infinity,gunChargeAt=null,gunReload=null;const gunEuler=new THREE.Euler(0,0,0,'YXZ');
  function update(dt, state = {}) {
    if (disposed) return;
    if(state.punchSwing>0&&previousAttack===0){entryPose={y:pelvis.position.y,rotation:pelvis.rotation.clone(),torso:torso.rotation.clone(),joints:{}};for(const side of ['right','left'])for(const [name,list]of [['shoulder',shoulders],['elbow',elbows],['hip',hips],['knee',knees]])entryPose.joints[side+name]=list[side].rotation.clone();}
    previousAttack=state.punchSwing||0;
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, .06);
    elapsed = Number.isFinite(state.time) ? state.time : elapsed + dt;
    const speed = Math.max(0, Math.abs(state.speed || 0));
    const grounded = state.grounded !== false;
    const verticalSpeed = state.verticalSpeed || 0;
    const moving = clamp(speed / .7, 0, 1);
    motion = damp(motion, moving, moving > motion ? 16 : 24, dt);
    if (speed < .01 && motion < .001) motion = 0;
    running = damp(running, state.run ? 1 : 0, 7, dt);
    airborne = damp(airborne, grounded ? 0 : 1, 13, dt);
    flying = damp(flying, state.flight ? 1 : 0, 8, dt);
    ragdollWeight = damp(ragdollWeight, state.ragdoll ? 1 : 0, state.ragdoll ? 18 : 4, dt);
    if (grounded && !wasGrounded) landing = clamp(Math.abs(lastVerticalSpeed) * .007, .015, .065);
    landing = damp(landing, 0, 11, dt);
    wasGrounded = grounded;
    lastVerticalSpeed = verticalSpeed;
    phase = (phase + dt * Math.min(speed,6.5) * TAU / ((1.35 + running * .38)*motionScale)) % TAU;
    crouchBlend=damp(crouchBlend,state.crouched&&!state.ragdoll&&!state.seated&&!state.sleeping?1:0,12,dt);
    const stride = (.24 + running * .08) * motion*motionScale*(1-crouchBlend*.52);
    const breathing = Math.sin(elapsed * 1.7);
    const bob = (1 - Math.cos(phase * 2)) * .0055 * motion;
    braking=damp(braking,clamp((previousSpeed-speed)*1.6,0,.16),18,dt);previousSpeed=speed;
    pelvis.position.set(0,(-.085 * motion + bob - landing - (crouchBlend*.48))*motionScale,0);
    pelvis.rotation.set(0,0,0);pelvis.position.z=-crouchBlend*.13*motionScale;
    torso.rotation.x = damp(torso.rotation.x, motion * (.07 + running * .10) + (crouchBlend*.19) - braking + airborne * .05 + flying * .38, 16, dt);
    torso.rotation.y = Math.sin(phase) * .035 * motion;
    torso.rotation.z = Math.sin(phase) * .012 * motion;
    // Breathing is limited to the upper body so the feet never bounce at rest.
    torso.scale.y = 1 + breathing * .002;
    gunActionPose=stepGunActionMotion(gunActionState,{grounded,verticalSpeed,speed,phase,mantling:state.mantling},dt);
    const hipHeight = legHeight * PX + pelvis.position.y;
    for (const [side, offset, sign] of [['right', 0, -1], ['left', Math.PI, 1]]) {
      hips[side].position.x=damp(hips[side].position.x,(custom?parts[`${side}Leg`].center[0]*PX:sign*.125)+sign*(.045*motion+.018*crouchBlend),16,dt);
      hips[side].rotation.y=0;hips[side].rotation.z=sign*.12*motion*(1-airborne);knees[side].rotation.y=knees[side].rotation.z=0;
      const legPhase = phase + offset;
      const legSwing = Math.cos(legPhase);
      // +Z is forward. With z = cos(phase), sin > 0 moves the foot
      // backwards relative to the body (planted stance); only lift it on
      // the sin < 0 return stroke, when it travels forward for the next step.
      const lift = Math.pow(Math.max(0, -Math.sin(legPhase)), 1.5) * (.11 + running * .045) * motion;
      if (airborne < .02) {
        solveLeg(side,legSwing*stride+crouchBlend*.13*motionScale,lift*(1-crouchBlend*.45),hipHeight,dt);
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
        const sole = hipHeight - legHalf * PX * (Math.cos(a) + Math.cos(b)) - 2 * PX * Math.abs(Math.sin(b));
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
      const pose=sampleCharge(punchCharge,elapsed),w=pose.weight;
      for(const side of ['right','left']){const sign=side==='left'?1:-1;gestureJoint(shoulders[side],...pose[side+'Shoulder'],w);gestureJoint(elbows[side],...pose[side+'Elbow'],w);gestureJoint(hips[side],pose.hip,0,sign*pose.spread,w);gestureJoint(knees[side],pose.knee,0,0,w);}
      pelvis.position.y=THREE.MathUtils.lerp(pelvis.position.y,pose.drop*motionScale,w);torso.rotation.y=pose.twist*w;
    }
    if (punchSwing > .001) {
      const pose=sampleAttack(state.attackKind||0,punchSwing),w=pose.weight;
      pelvis.position.y=THREE.MathUtils.lerp(pelvis.position.y,pose.drop*motionScale,w);pelvis.rotation.y=state.attackRushing?0:pose.spin;
      torso.rotation.x=THREE.MathUtils.lerp(torso.rotation.x,pose.lean,w);torso.rotation.y=THREE.MathUtils.lerp(torso.rotation.y,pose.twist,w);
      for(const side of ['right','left'])for(const [suffix,joints] of [['Shoulder',shoulders],['Elbow',elbows],['Hip',hips],['Knee',knees]]){if(state.attackRushing&&(suffix==='Hip'||suffix==='Knee'))continue;gestureJoint(joints[side],...pose[side+suffix],w);}
      if(!state.attackRushing)for(const side of ['right','left'])hips[side].rotation.z+=(side==='left'?1:-1)*(pose.spread||.12)*w;
      if(entryPose&&punchSwing<.14){const u=punchSwing/.14,blend=1-u*u*(3-2*u);pelvis.position.y=THREE.MathUtils.lerp(pelvis.position.y,entryPose.y,blend);torso.rotation.x=THREE.MathUtils.lerp(torso.rotation.x,entryPose.torso.x,blend);torso.rotation.y=THREE.MathUtils.lerp(torso.rotation.y,entryPose.torso.y,blend);for(const side of ['right','left'])for(const [name,list]of [['shoulder',shoulders],['elbow',elbows],['hip',hips],['knee',knees]]){const r=entryPose.joints[side+name];gestureJoint(list[side],r.x,r.y,r.z,blend);}}
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
    const flinchAge=elapsed-flinchStart;
    if(!state.ragdoll&&flinchAge>=0&&flinchAge<.24){const recoil=Math.sin(Math.PI*flinchAge/.24)*(.5+flinchStrength*.5);torso.rotation.x-=recoil*.13;torso.rotation.z+=recoil*.035*(flinchSerial%2?1:-1);pelvis.position.z-=recoil*.025;}
    if(state.ragdoll)applyAvatarHitPose({pelvis,torso,head,shoulders,elbows,hips,knees},state);
    sitWeight=damp(sitWeight,state.seated?1:0,12,dt);
    if(sitWeight>.001){
      pelvis.position.y=THREE.MathUtils.lerp(pelvis.position.y,-.34*motionScale,sitWeight);
      torso.rotation.x=THREE.MathUtils.lerp(torso.rotation.x,.04,sitWeight);
      for(const side of ['left','right']){
        gestureJoint(hips[side],-Math.PI/2,0,0,sitWeight);
        gestureJoint(knees[side],Math.PI/2,0,0,sitWeight);
        gestureJoint(shoulders[side],-.2,0,0,sitWeight);
        gestureJoint(elbows[side],-.55,0,0,sitWeight);
      }
    }
    sleepWeight=damp(sleepWeight,state.sleeping&&!state.ragdoll?1:0,14,dt);
    if(sleepWeight>.001){
      pelvis.rotation.x=THREE.MathUtils.lerp(pelvis.rotation.x,-Math.PI/2,sleepWeight);
      pelvis.rotation.y*=1-sleepWeight;pelvis.rotation.z*=1-sleepWeight;
      const backDepth=(parts.torso.size[2]/2+parts.torso.inflate)*PX;
      pelvis.position.y=THREE.MathUtils.lerp(pelvis.position.y,backDepth+.004,sleepWeight);
      torso.rotation.x*=1-sleepWeight;torso.rotation.y*=1-sleepWeight;torso.rotation.z*=1-sleepWeight;
      for(const [side,sign]of [['left',1],['right',-1]]){
        gestureJoint(hips[side],0,0,sign*.045,sleepWeight);gestureJoint(knees[side],0,0,0,sleepWeight);
        gestureJoint(shoulders[side],0,0,sign*.12,sleepWeight);gestureJoint(elbows[side],-.08,0,0,sleepWeight);
      }
    }
    // A thicker block head rests on the pillow independently of the back.
    // Lifting the whole rig to clear the head makes the torso hover above bed.
    const pillowLift=Math.max(0,(parts.head.size[2]/2+parts.head.inflate-parts.torso.size[2]/2-parts.torso.inflate)*PX)+.075;
    head.position.z=damp(head.position.z,pillowLift*sleepWeight,14,dt);
    if(state.impactDuration>0&&state.impactTime<state.impactDuration){
      const t=state.impactTime,u=t/state.impactDuration,amount=(.012+.035*(state.impactStrength||0))*Math.sin(Math.PI*u);
      pelvis.position.x+=Math.sin(t*155)*amount;pelvis.position.z+=Math.sin(t*119+.8)*amount;pelvis.rotation.z+=Math.sin(t*142)*amount*.4;
    }
    if(state.prone&&!state.ragdoll&&!state.sleeping&&!state.seated){
      // Rotating around the floor-level pelvis already lays the standing rig down.
      // Subtracting standing leg height here buried the entire prone body.
      pelvis.position.y=.24;pelvis.position.z=0;pelvis.rotation.set(Math.PI/2,0,0);
      torso.rotation.set(0,Math.sin(phase)*.025*motion,0);
      for(const [side,sign]of [['right',-1],['left',1]]){
       hips[side].rotation.set(Math.sin(phase+sign)*.10*motion,0,sign*.10);knees[side].rotation.set(.10+Math.max(0,Math.sin(phase+sign))*.22*motion,0,0);
       shoulders[side].rotation.set(-2.6+Math.sin(phase+sign)*.18*motion,0,sign*.12);elbows[side].rotation.set(-.45,0,0);
      }
    }
    if(gunId!==state.equippedWeapon){gunReload=null;gunChargeAt=null;gunShotAt=-Infinity;gunId=state.equippedWeapon;gunModel?.removeFromParent();for(const ghost of gunGhosts)ghost.removeFromParent();gunGhosts=[];gunModel=gunId?createGunModel(gunId):null;if(gunModel){weaponGrip.add(gunModel);const grip=createSkinnedFiringHand();if(gunId==='katana')grip.rotation.x=Math.PI/2;gunModel.add(grip);if(gunId==='katana')gunGhosts=swordGhostMaterials.map(material=>{const mesh=new THREE.Mesh(gunModel.children[0].geometry,material);mesh.visible=false;weaponGrip.add(mesh);return mesh;});}}
    for(const ghost of gunGhosts)ghost.visible=false;
    if(gunModel){gunModel.visible=!state.ragdoll&&!state.sleeping&&!state.seated;if(gunModel.visible){
      const aim=clamp(-(state.lookPitch||0),-.75,.75),look=clamp(state.lookYaw||0,-.85,.85),now=performance.now(),kick=shotHandKick(gunId,(now-gunShotAt)/1000);
      if(gunReload&&(gunReload.weapon!==gunId||now-gunReload.start>=gunReload.duration))gunReload=null;
      const progress=gunReload?clamp((now-gunReload.start)/gunReload.duration,0,1):null,reload=sampleGunReload(gunId,progress);
      shoulders.right.rotation.set(-1.20-aim*.82+reload.weight*.28-kick*.12,look*.55,-.035+reload.roll*.45);elbows.right.rotation.set(-.22-reload.weight*.4-kick*.16,0,0);
      // The world avatar holds the gun with its right hand. Keep the left arm's
      // normal idle/walk pose; the separate first-person rig has its own grip.
      torso.rotation.y=.015;torso.rotation.z=Math.sin(phase)*.006*motion;
      if(gunId==='katana'){const pose=sampleKatanaPose(gunChargeAt===null?0:(now-gunChargeAt)/1000,(now-gunShotAt)/1000);shoulders.right.rotation.set(...pose.shoulder);shoulders.right.rotation.x-=aim*.65;shoulders.right.rotation.y+=look*.5;elbows.right.rotation.set(...pose.elbow);torso.rotation.x+=pose.torso[0];torso.rotation.y+=pose.torso[1];torso.rotation.z+=pose.torso[2];}
      if(state.prone){const crawl=Math.sin(phase)*motion;shoulders.right.rotation.x=-2.65-aim*.28+reload.weight*.25+crawl*.04;elbows.right.rotation.x=-.60-reload.weight*.35;}
      shoulders.right.rotation.x+=gunActionPose.pitch*.8;shoulders.right.rotation.y+=gunActionPose.yaw;shoulders.right.rotation.z+=gunActionPose.roll;elbows.right.rotation.x-=gunActionPose.land*.12+gunActionPose.jump*.10;
      gunInverse.copy(pelvis.quaternion).multiply(torso.quaternion).multiply(shoulders.right.quaternion).multiply(elbows.right.quaternion).invert();gunEuler.set(-aim-kick*.11+reload.tilt,look,reload.roll,'YXZ');
      if(gunId==='katana'){const pose=sampleKatanaPose(gunChargeAt===null?0:(now-gunChargeAt)/1000,(now-gunShotAt)/1000);gunEuler.x+=pose.rotation[0];gunEuler.y+=pose.rotation[1];gunEuler.z+=pose.rotation[2];}
      gunAim.setFromEuler(gunEuler);updateGunReload(gunModel,progress);
      gunModel.quaternion.copy(gunInverse).multiply(gunAim);gunModel.position.set(0,.115,.025).applyQuaternion(gunModel.quaternion);updateGunFlash(gunModel);
      for(let i=0;i<gunGhosts.length;i++){const ghost=gunGhosts[i],age=(now-gunShotAt)/1000-(i+1)*.018;ghost.visible=age>=0&&age<.16;
       if(ghost.visible){const pose=sampleKatanaPose(0,age);gunEuler.set(-aim+pose.rotation[0],look+pose.rotation[1],pose.rotation[2],'YXZ');gunAim.setFromEuler(gunEuler);ghost.quaternion.copy(gunInverse).multiply(gunAim);ghost.position.set(0,.115,.025).applyQuaternion(ghost.quaternion);}
      }
    }}
    mantleBlend=damp(mantleBlend,state.mantling&&!state.ragdoll&&!state.seated&&!state.sleeping?1:0,18,dt);
    if(mantleBlend>.001){
      torso.rotation.x=THREE.MathUtils.lerp(torso.rotation.x,.22,mantleBlend);
      for(const [side,sign]of [['right',-1],['left',1]]){
        gestureJoint(shoulders[side],-2.65,0,sign*.12,mantleBlend);gestureJoint(elbows[side],-.65,0,0,mantleBlend);
        gestureJoint(hips[side],-.72,0,sign*.08,mantleBlend);gestureJoint(knees[side],1.05,0,0,mantleBlend);
      }
      if(gunModel&&mantleBlend>.1)gunModel.visible=false;
    }
    // Keep the supporting foot planted after the combat pose has been blended.
    if(!state.prone&&grounded&&airborne<.02&&sitWeight<.01&&sleepWeight<.01&&ragdollWeight<.01){
      let sole=Infinity;for(const side of ['right','left']){const a=hips[side].rotation.x,b=a+knees[side].rotation.x,z=hips[side].rotation.z;const y=legHeight*PX+pelvis.position.y-(legHalf*PX*Math.cos(a)+legHalf*PX*Math.cos(b))*Math.cos(z)-.125*Math.abs(Math.sin(b));sole=Math.min(sole,y);}
      if(sole<0)pelvis.position.y-=sole;
    }
    if(state.ragdoll&&grounded)groundAvatarHitPose(root,pelvis,meshes);
    head.rotation.y = damp(head.rotation.y, state.ragdoll||state.sleeping?0:clamp(state.lookYaw || 0, -.95, .95) - torso.rotation.y * .6, 12, dt);
    head.rotation.x = damp(head.rotation.x, state.ragdoll||state.sleeping?0:clamp(state.lookPitch || 0, -.65, .7) - torso.rotation.x * .65, 12, dt);
    head.rotation.z = -torso.rotation.z * .4;
    if(state.prone&&!state.ragdoll&&!state.sleeping&&!state.seated)groundAvatarHitPose(root,pelvis,meshes);
    Object.assign(animation, { speed, motion, running, grounded, phase, prone:!!state.prone,crouched:!!state.crouched,gesture: gestureName,mantling:mantleBlend>.1 });
  }

  function applyPlayPose(pose){
    if(disposed||!pose)return;const kind=pose.kind,phase=pose.phase||0,wave=Math.sin(phase*7),seated=['swing','seesaw','spring','slide'].includes(kind);
    pelvis.rotation.set(0,0,0);pelvis.position.z=-crouchBlend*.13*motionScale;torso.rotation.set(0,0,0);pelvis.position.y=(kind==='slide'?-legHeight*PX:seated?-.34*motionScale:0);
    for(const [side,sign]of [['left',1],['right',-1]]){
      hips[side].rotation.set(seated?-Math.PI/2:0,0,sign*.035);knees[side].rotation.set(seated?Math.PI/2:.08,0,0);shoulders[side].rotation.set(-.45,0,sign*.12);elbows[side].rotation.set(-.25,0,0);
      if(kind==='swing'){pelvis.rotation.x=pose.angle||0;shoulders[side].rotation.set(-1.7,0,sign*.18);elbows[side].rotation.x=-.8;hips[side].rotation.x=-1.25+(pose.angle||0)*.25;knees[side].rotation.x=.9-(pose.angle||0)*.3;torso.rotation.x=-(pose.angle||0)*.5;}
      else if(kind==='seesaw'){shoulders[side].rotation.x=-1.2;elbows[side].rotation.x=-.7;hips[side].rotation.x=pose.lift?-.65:-1.4;knees[side].rotation.x=pose.lift?.2:1.3;}
      else if(kind==='spring'){shoulders[side].rotation.x=-1.35;elbows[side].rotation.x=-.55;torso.rotation.x=(pose.input||0)*Math.min(.4,(pose.charge||0)*.18);torso.rotation.z=-(pose.inputX||0)*Math.min(.3,(pose.charge||0)*.14);}
      else if(kind==='monkey'||kind==='zipline'){shoulders[side].rotation.set(-3.05+(kind==='monkey'?sign*wave*.28:.04),0,sign*.06);elbows[side].rotation.x=kind==='monkey'?-.12-Math.max(0,sign*wave)*.5:-.15;hips[side].rotation.x=sign*wave*(kind==='monkey'?.3:.18);knees[side].rotation.x=.4+Math.max(0,sign*wave)*.25;torso.rotation.z=wave*.05;}
      else if(kind==='climb'){shoulders[side].rotation.x=-2.55+sign*wave*.5;elbows[side].rotation.x=-.3-Math.max(0,sign*wave)*.7;hips[side].rotation.x=-.6-sign*wave*.5;knees[side].rotation.x=.65+Math.max(0,sign*wave)*.75;torso.rotation.x=.15;}
      else if(kind==='slide'){hips[side].rotation.x=-Math.PI/2;knees[side].rotation.x=.16;shoulders[side].rotation.set(-.8,0,sign*.6);torso.rotation.x=-.15;}
      else if(kind==='trampoline'){const tuck=Math.max(0,Math.sin(phase*5));hips[side].rotation.x=-tuck*.7;knees[side].rotation.x=tuck;shoulders[side].rotation.set(-.3-tuck*.8,0,sign*(.4+tuck*.35));}
      else if(kind==='carousel'){shoulders[side].rotation.x=-1.25;elbows[side].rotation.x=-.35;knees[side].rotation.x=.14;torso.rotation.z=(pose.angle||0)*.005;}
      else if(kind==='launch'){shoulders[side].rotation.set(-.5-wave*.15,0,sign*1);hips[side].rotation.x=-.3-sign*wave*.2;knees[side].rotation.x=.6;torso.rotation.x=-.18;}
    }
    if(gunModel)gunModel.visible=false;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;weaponClearance.dispose();
    root.removeFromParent();
    geometries.forEach(geometry => {if(!geometry.userData.avatarShared)geometry.dispose();});
    baseMaterial.dispose();
    overlayMaterial.dispose();
    texture.dispose();headMaterials.forEach(m=>m.dispose());crownGeometry.dispose();gold.dispose();
  }

  root.traverse(object=>{if(object.isMesh)withLocalLighting(object.material);});
  return {
    animation,
    root, update, applyPlayPose, dispose, head, setAppearance,gripColor:skinColor,createFirstPersonHand:options=>createSkinnedFiringHand({forearm:true,...options}),
    constrainWeapon(world,dt){if(!gunModel?.visible)return;weaponAnchor.copy(root.position);weaponAnchor.y+=animation.prone?.39:(custom?(custom.headBottom+parts.head.size[1]*.5)*PX:1.68)-(animation.crouched?.52:0);const contact=weaponClearance.update(world,weaponAnchor,gunModel,dt);if(contact>.001){shoulders.right.rotation.x+=contact*.20;elbows.right.rotation.x-=contact*.65;gunModel.rotateX(contact*(animation.prone?.08:.40));gunModel.rotateY(contact*(animation.prone?.35:0));root.updateMatrixWorld(true);}},
    getGunMuzzle(target=new THREE.Vector3()){if(!gunModel?.visible)return null;root.updateMatrixWorld(true);return gunModel.userData.muzzle.getWorldPosition(target);},chargeGun(active){gunChargeAt=active?performance.now():null;},fireGun(){gunShotAt=performance.now();gunChargeAt=null;gunReload=null;if(gunId!=='katana')triggerGunFlash(gunModel);},reloadGun(event){gunReload=event?{weapon:event.weapon,duration:event.duration,start:performance.now()-(event.age||0)}:null;},
    reactHit(serial,strength=.2,age=0){if(!Number.isFinite(serial)||serial<=flinchSerial)return;flinchSerial=serial;if(age>=.24)return;flinchStart=elapsed-Math.max(0,age);flinchStrength=clamp(strength,0,1);},
    resetHitReaction(){flinchSerial=0;flinchStart=-Infinity;},
    eyeHeight:custom?(custom.headBottom+parts.head.size[1]*.5)*PX:1.68,
    focusHeight:custom?(custom.headBottom+parts.head.size[1]*.25)*PX:1.24,
    seatOffset:legHeight*PX-.34*motionScale,
    collisionShape:custom?{height:custom.totalHeight*PX+.05,width:parts.head.size[0]*PX/2+.03,depth:parts.head.size[2]*PX/2+.03}:null,
    joints: { pelvis, torso, head, shoulders, elbows, hips, knees },
    dimensions: { height: 2, eyeHeight: 1.79, armWidth: 3 * PX, armDepth: 4 * PX },
    diagnostics: { model: 'slim', textureSize: image.width, meshes: meshes.length, materialCount: 2, textureCount: 1 },
  };
}
