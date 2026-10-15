import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleGunReload,supportGrip,shotHandKick,stepGunSway} from '../dist/gun-hand-motion.js';
const weapons=['pistol','machine','sniper','shotgun','rocket'];
test('every reload returns to the grip continuously, with no non-finite transforms',()=>{
 for(const id of weapons){
  const idle=sampleGunReload(id);
  for(const t of [0,1])assert.deepEqual(sampleGunReload(id,t),idle);
  let previous=sampleGunReload(id,0);
  for(let i=1;i<=1000;i++){
   const pose=sampleGunReload(id,i/1000);
   for(const key of ['hand','rotation','part','partRotation'])for(let j=0;j<3;j++){
    assert(Number.isFinite(pose[key][j]));assert(Math.abs(pose[key][j]-previous[key][j])<.025,`${id} ${key} discontinuity at ${i}`);
   }
   previous=pose;
  }
  assert(Math.hypot(...sampleGunReload(id,.42).hand.map((v,i)=>v-supportGrip(id)[i]))>.15);
 }
});
test('the support hand follows magazines, bolt, pump and rocket through their working strokes',()=>{
 for(const id of ['pistol','machine'])for(const t of [.22,.27,.32,.60,.65,.69]){
  const pose=sampleGunReload(id,t);assert(Math.abs(pose.hand[1]-(-.17+pose.part[1]))<1e-10);
 }
 for(const t of [.28,.36,.46,.55,.66,.74,.82]){
  const pose=sampleGunReload('sniper',t);assert(Math.abs(pose.hand[2]-(.1+pose.part[2]))<1e-10);
 }
 for(const t of [.62,.7,.76,.83,.89]){
  const pose=sampleGunReload('shotgun',t);assert(Math.abs(pose.hand[2]-(.42+pose.part[2]))<1e-10);
 }
 for(const t of [.24,.32,.42,.58,.7,.8]){
  const pose=sampleGunReload('rocket',t);assert(Math.abs(pose.hand[2]-(-.4+pose.part[2]))<1e-10);
 }
});
test('look sway responds on both axes and settles at different frame rates',()=>{
 const endpoints=[];
 for(const fps of [30,60,144]){
  let x=0,y=0;
  for(let i=0;i<fps;i++)[x,y]=stepGunSway(x,y,.4/fps,-.3/fps,1/fps);
  assert(x<-.006&&y>.003);endpoints.push([x,y]);
  for(let i=0;i<fps;i++)[x,y]=stepGunSway(x,y,0,0,1/fps);
  assert(Math.abs(x)<1e-6&&Math.abs(y)<1e-6);
 }
 assert(Math.abs(endpoints[0][0]-endpoints[2][0])<1e-8);
});
test('recoil kicks quickly and recovers; heavier weapons move more',()=>{
 for(const id of weapons){assert.equal(shotHandKick(id,-1),0);assert.equal(shotHandKick(id,0),0);assert(shotHandKick(id,.025)>.3);assert(shotHandKick(id,.3)<.02);assert.equal(shotHandKick(id,.7),0);}
 assert(shotHandKick('rocket',.04)>shotHandKick('machine',.04));
});
test('textured forearms keep their elbow anchored as the hand moves and rotates',async()=>{
 const THREE=await import('../dist/vendor/three.module.js'),{readFile}=await import('node:fs/promises');
 const threeURL=new URL('../dist/vendor/three.module.js',import.meta.url).href;
 const data=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
 const batching=data((await readFile(new URL('../dist/model-batching.js',import.meta.url),'utf8')).replace("'three'",JSON.stringify(threeURL)));
 let source=await readFile(new URL('../dist/gun-visual.js',import.meta.url),'utf8');
 source=source.replace("'three'",JSON.stringify(threeURL)).replace(/'\.\/model-batching.js[^']*'/,JSON.stringify(batching));
 for(const name of ['weapon-dimensions','gun-hand-motion'])source=source.replace(new RegExp("'\\./"+name+".js[^']*'"),JSON.stringify(new URL('../dist/'+name+'.js',import.meta.url).href));
 const {updateFiringArm,createGunModel,updateGunReload}=await import(data(source));
 for(const id of weapons){
  const model=createGunModel(id),home=new THREE.Vector3(...supportGrip(id)),hand=new THREE.Group(),wrist=new THREE.Vector3(0,-.17,-.065),elbow=new THREE.Vector3(.29,-.32,-.73),meshes=[new THREE.Object3D(),new THREE.Object3D()];
  hand.add(...meshes);hand.userData.forearm={wrist,elbow,meshes,skinLength:.375};
  for(const t of [0,.22,.42,.55,.76,1]){
   const pose=sampleGunReload(id,t);hand.position.fromArray(pose.hand);hand.rotation.set(...pose.rotation);updateFiringArm(hand,home);hand.updateMatrixWorld(true);updateGunReload(model,t);
   assert.deepEqual(model.userData.reloadPart.position.toArray(),pose.part);
   for(const mesh of meshes){
    const tip=new THREE.Vector3(0,.375/2,0).applyMatrix4(mesh.matrixWorld),anchor=elbow.clone().add(home);
    assert(tip.distanceTo(anchor)<1e-10,`${id} elbow at ${t}`);
    const start=new THREE.Vector3(0,-.375/2,0).applyMatrix4(mesh.matrixWorld),grip=wrist.clone().applyMatrix4(hand.matrixWorld);
    assert(start.distanceTo(grip)<1e-10);
   }
  }
 }
 const camera=new THREE.Group(),rig=new THREE.Group(),hand=new THREE.Group(),wrist=new THREE.Vector3(0,-.17,-.065),mesh=new THREE.Object3D(),anchor=new THREE.Vector3(.32,-.46,-.03);camera.add(rig);rig.add(hand);hand.add(mesh);hand.userData.forearm={wrist,elbow:new THREE.Vector3(),meshes:[mesh],skinLength:.375};
 camera.rotation.set(.2,.7,-.04);rig.position.set(.26,-.24,-.63);
 for(const angle of [-1.75,-.95,.30]){rig.rotation.set(angle,.3,-.4);hand.rotation.x=Math.PI/2;updateFiringArm(hand,new THREE.Vector3(),camera,anchor);camera.updateMatrixWorld(true);const endpoint=new THREE.Vector3(0,.375/2,0).applyMatrix4(mesh.matrixWorld),bodyAnchor=anchor.clone().applyMatrix4(camera.matrixWorld);assert(endpoint.distanceTo(bodyAnchor)<1e-9,'sword swing must keep the elbow at the body');}

});
