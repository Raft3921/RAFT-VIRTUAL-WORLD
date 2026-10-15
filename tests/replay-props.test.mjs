import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {planCinematicRail} from '../dist/cinematic-rail.js';
import {createGunMapVisual,doorAngle} from '../dist/gun-map-visual.js';

test('a replay rail is selected once and has continuous wall-safe playback',()=>{
 let queries=0;
 const world={cameraClear:p=>Math.abs(p.x)<2&&p.y>.1,cameraPosition(a,b){queries++;const p=b.clone();p.x=Math.max(-1.6,Math.min(1.6,p.x));return p;}};
 const pose=t=>({target:new THREE.Vector3(0,1,t*5),distance:3,elevation:.6,heading:t*1.2});
 const rail=planCinematicRail(world,pose,new THREE.Vector3(0,2,0)),planned=queries,previous=rail.sample(0,new THREE.Vector3()).clone();
 for(let i=1;i<=600;i++){const p=rail.sample(i/600,new THREE.Vector3());assert(world.cameraClear(p));assert(p.distanceTo(previous)<.15);previous.copy(p);}
 assert.equal(queries,planned,'no obstacle searches or camera side changes during playback');
});
test('obstructed moving shots fall back to a fixed station',()=>{
 const world={cameraClear:p=>p.y>.1,cameraPosition(a,b){return a.distanceTo(b)>.8?a.clone().lerp(b,.1):a.clone();}};
 const rail=planCinematicRail(world,t=>({target:new THREE.Vector3(t*20,1,0),distance:3,elevation:.4,heading:0}),new THREE.Vector3(0,2,0));
 assert(rail.points.every(p=>p.distanceTo(rail.points[0])<1e-9));
});
function fixture(kind){
 const root=new THREE.Group(),mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'#665544'}),1);root.add(mesh);
 const b={x:2,y:1.5,z:3,w:kind==='door'?2:.055,h:2.6,d:.12,mesh,instance:0,gunPropId:'test',gunPropKind:kind,gunBounds:{x:2,y:1.5,z:3,w:kind==='door'?2:.18,h:2.6,d:.12}};
 return {root,mesh,b,visual:createGunMapVisual(root,[b])};
}
test('door pivots about the hinge and settles permanently; joins use the same final angle',()=>{
 const {visual,mesh}=fixture('door'),at=10000;
 visual.apply([{id:'test',mode:'open',normal:[0,0,1],at}],at);
 const matrix=new THREE.Matrix4(),edge=new THREE.Vector3();
 for(const age of [0,.1,.3,.55,1,3]){visual.update(at+age*1000);mesh.getMatrixAt(0,matrix);edge.set(-.5,0,0).applyMatrix4(matrix);assert(Math.abs(edge.x-1)<1e-6);assert(Math.abs(edge.z-3)<1e-6);}
 const late=fixture('door');late.visual.apply([{id:'test',mode:'open',normal:[0,0,1],at}],at+30000);const other=new THREE.Matrix4();late.mesh.getMatrixAt(0,other);assert(matrix.elements.every((n,i)=>Math.abs(n-other.elements[i])<1e-6));assert(Math.abs(doorAngle(0))<1e-9);
});
test('broken bars fall to the floor and are baked without replaying for late joins',()=>{
 const {root,visual,b}=fixture('bars'),at=10000;visual.apply([{id:'test',mode:'broken',normal:[1,0,0],at}],at);assert(b.disabled);assert(root.children.length>2);
 visual.update(at+3000);assert.equal(root.children.length,2);const debris=root.children.find(c=>c.name==='permanent cut traces');assert(debris.visible);debris.geometry.computeBoundingBox();assert(debris.geometry.boundingBox.min.y>=.1199);
 const count=debris.geometry.attributes.position.count;visual.apply([{id:'test',mode:'broken',normal:[1,0,0],at}],at+4000);assert.equal(debris.geometry.attributes.position.count,count);
});
test('all four replay cuts run with finite transforms and only plan at cut boundaries',async()=>{
 const {createGunCinematic}=await import('../dist/gun-cinematic.js');
 globalThis.document={body:{dataset:{}},createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
 let queries=0,now=0;const camera=new THREE.PerspectiveCamera(55,1,.1,1000),scene=new THREE.Scene(),world={cameraClear:()=>true,cameraPosition:(a,b)=>{queries++;return b.clone();}};
 const cinematic=createGunCinematic({scene,camera,get:()=>({now,world}),audio:{shot(){},explosion(){}}});
 cinematic.start({id:'test',startAt:0,duration:10000,shot:{weapon:'sniper',origin:{x:0,y:1,z:0},vx:0,vy:0,vz:1},impact:{position:{x:0,y:1,z:15}},owner:'a',victims:['b'],players:[{id:'a',x:0,y:0,z:0},{id:'b',x:0,y:0,z:15}]});
 for(const start of [0,3400,5600,7800]){now=start;assert(cinematic.cameraOverride());const count=queries;
  for(let dt=16;dt<2100;dt+=16){now=start+dt;cinematic.update(.016);cinematic.cameraOverride();assert(camera.position.toArray().every(Number.isFinite));assert(camera.quaternion.toArray().every(Number.isFinite));}
  assert.equal(queries,count);
 }
 cinematic.stop();assert.equal(camera.fov,55);assert(!cinematic.active);
});
