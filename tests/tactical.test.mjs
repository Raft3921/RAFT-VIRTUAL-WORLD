import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createWorld} from '../dist/world.js';
import {GunRules} from '../dist/gun-rules.js';
import {GUN_PROP_DEFS} from '../dist/gun-map-state.js';
import {gunDamage,gunHitBox,proneShape} from '../dist/gun-posture.js';
import {stepSwing} from '../dist/plaza-play-shared.js';
import {cutConvexGeometry,convexGeometryVolume} from '../dist/convex-cut.js';
import {GUN_GRAVITY,GUN_JUMP_SPEED,tentBounceSpeed} from '../dist/gun-locomotion.js';
import {bounceSpeed} from '../dist/plaza-surfaces.js';
import {sampleKatanaPose} from '../dist/katana-motion.js';
const context=new Proxy({measureText:t=>({width:t.length*8}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]??(()=>{})});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
const world=createWorld(new THREE.Scene());
function fixture(){const messages=[],hits=[],players=[{id:'a',skin:0,x:182,y:.12,z:-90,equippedWeapon:'katana',grounded:true},{id:'b',skin:1,x:182,y:.12,z:-88,grounded:true}],saved=[];
 const rules={settings:{},settingsQueue:Promise.resolve(),saveSettings:async s=>saved.push(s),onAsyncWork(){},entries:()=>players.map(player=>({player})),broadcast:m=>messages.push(m),characters:{get:()=>({ownedWeapons:['pistol','machine','sniper','rocket','katana']})},houses:{snapshots:()=>[]},hit:(a,b,damage)=>hits.push(damage)};
 const gun=new GunRules(rules);gun.phase='active';gun.members.set('a',{id:'a',team:0,damage:0});gun.members.set('b',{id:'b',team:1,damage:0});gun.resolve=()=>{};return {gun,players,messages,hits,saved,rules};}
test('swing can complete a full rotation by pumping, without a hard angle clamp',()=>{
 const state={angle:0,angularVelocity:0};let peak=0;
 for(let i=0;i<60*60;i++){stepSwing(state,state.angularVelocity>=0?1:-1,1/60,2.15);peak=Math.max(peak,Math.abs(state.angle));}
 assert(peak>Math.PI*2);assert(Math.abs(state.angularVelocity)<=6.8);
});
test('crawl passages admit a prone body and reject standing or crouching',()=>{
 for(const [x,z]of [[172,-123],[192,-64],[215,-84]]){const p=new THREE.Vector3(x,.11,z);assert(world.canStand(p,proneShape()));assert(!world.canStand(p,{width:.32,depth:.32,height:1.8}));assert(!world.canStand(p,{width:.32,depth:.32,height:1.28}));}
 const p=new THREE.Vector3(172,.11,-123);
 const v=new THREE.Vector3(0,0,.7);p.z=-124.6;for(let i=0;i<400;i++){v.set(0,-.1,.7);world.move(p,v,1/120,{shape:proneShape()});}assert(p.z>-122.5);
});
test('window clearance is tall enough for a player after breaking its bars',()=>{
 const def=GUN_PROP_DEFS.get('window-0--1--1');world.gunMap.apply([{id:def.id,mode:'broken',normal:[.65,.75,0]}]);assert(world.canStand(new THREE.Vector3(def.x,.69,def.z),{width:.32,depth:.32,height:1.8}));
});
test('every stair route reaches its roof, including switchback landings and parapet exits',()=>{
 const stairs=world.bodies.filter(b=>b.gunStairRoof);assert(stairs.length>=20);
 const walk=(p,target)=>{const v=new THREE.Vector3();for(let i=0;i<5000;i++){const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);if(d<.035)return;v.x=dx/d*1.8;v.z=dz/d*1.8;v.y-=GUN_GRAVITY/120;world.move(p,v,1/120,{shape:{width:.30,depth:.30,height:1.8}});}assert.fail(`route blocked ${p.toArray()} target ${JSON.stringify(target)}`);};
 for(const first of stairs.filter(b=>b.ramp.back===0)){
  const roof=first.gunStairRoof,p=new THREE.Vector3(first.x,.12,first.z-first.d/2-.7),south=roof.z+roof.d/2+.55,north=roof.z-roof.d/2-.55;
  walk(p,{x:first.x,z:south});
  let end=south;
  if(roof.high){const second=stairs.find(b=>b.gunStairRoof.x===roof.x&&b.gunStairRoof.z===roof.z&&b.ramp.back>0);assert(second);walk(p,{x:second.x,z:south});walk(p,{x:second.x,z:north});end=north;}
  const entry=roof.x+roof.side*(roof.w/2-.5);walk(p,{x:entry,z:end});walk(p,{x:entry,z:roof.z+(roof.high?-1:1)*(roof.d/2-.8)});
  assert(Math.abs(p.y-roof.y)<.2,`roof landing ${roof.x},${roof.z} ${p.toArray()} wanted ${roof.y}`);
 }
});
test('gun-zone jumping has a ballistic apex and tent height is three times trampoline height',()=>{
 const apex=GUN_JUMP_SPEED**2/(2*GUN_GRAVITY);assert(apex>.75&&apex<.85);
 let y=0,v=GUN_JUMP_SPEED,max=0;for(let i=0;i<400;i++){v-=GUN_GRAVITY/240;y+=v/240;max=Math.max(max,y);}assert(Math.abs(max-apex)<.025);
 for(const incoming of [-2,-8,-20]){const trampoline=bounceSpeed(incoming)**2/(2*GUN_GRAVITY),tent=tentBounceSpeed(incoming)**2/(2*GUN_GRAVITY);assert(Math.abs(tent/trampoline-3)<1e-10);}
 assert(world.bodies.filter(b=>b.gunTent).length>=18);
});
test('fractional weapon damage and a 100-life battle use the configured maximum',()=>{
 assert.equal(gunDamage('machine'),.5);assert.equal(gunDamage('sniper'),1.5);assert.equal(gunDamage('rocket'),2);assert.equal(gunDamage('katana'),1);assert.equal(gunDamage('katana',1),5);
 const {gun,players,messages}=fixture();gun.maxLife=100;
 for(const weapon of ['machine','sniper','rocket'])gun.damage(players[0],players[1],{weapon},1000);
 assert.equal(gun.members.get('b').damage,4);assert.equal(messages.filter(m=>m.type==='gun-damage').at(-1).remaining,96);
 assert.equal(gunHitBox({...players[1],prone:true}).h,.48);
});
test('life settings reject active-round, remote-board and out-of-range changes',async()=>{
 const {gun,players,rules,saved}=fixture(),p=players[0];gun.receive({player:p},{type:'gun-life',life:100},1000);assert.equal(gun.maxLife,3);
 gun.phase='waiting';p.x=113;p.z=-92;
 for(const life of [2,101,3.5])gun.receive({player:p},{type:'gun-life',life},1100);assert.equal(gun.maxLife,3);
 gun.receive({player:p},{type:'gun-life',life:100},1200);await rules.settingsQueue;assert.equal(gun.maxLife,100);assert.equal(saved.at(-1).gunLife,100);
});
test('broken doors and bars are shared during a round and not restored after server restart',async()=>{
 const {gun,rules,messages,saved}=fixture(),id='door-0-1';assert(gun.changeProp(id,'open'));assert(!gun.changeProp(id,'open'));await rules.settingsQueue;
 assert.equal(messages.filter(m=>m.type==='gun-map').length,1);const restored=new GunRules({...rules,settings:{gunTraces:[...gun.traces.values()]}});assert.equal(restored.traces.size,0);assert.equal(restored.snapshot().traces.length,0);
});
test('katana damage comes from server-measured charge; one release cannot hit twice',()=>{
 const {gun,players,hits}=fixture();gun.maxLife=100;gun.blocked=()=>null;const p=players[0],aim={x:0,y:0,z:1};
 gun.receive({player:p},{type:'gun-charge'},1000);gun.slash(p,{aim,damage:1000},2720);assert.deepEqual(hits,[5]);gun.slash(p,{aim,damage:1000},2750);assert.equal(hits.length,1);
 gun.slash(p,{aim,damage:1000},3400);assert.deepEqual(hits,[5,1]);
});
test('convex sword cuts preserve total volume and produce two closed pieces',()=>{
 const geometry=new THREE.BoxGeometry(2,2,2),parts=cutConvexGeometry(geometry,new THREE.Vector3(),new THREE.Vector3(.65,.75,0));assert.equal(parts.length,2);assert(Math.abs(parts.reduce((n,p)=>n+p.volume,0)-8)<1e-5);
 for(const p of parts){assert(convexGeometryVolume(p.geometry,true)>0);p.geometry.dispose();}geometry.dispose();
 const before=sampleKatanaPose(0,.02),after=sampleKatanaPose(0,.09);assert(Math.abs(after.rotation[2]-before.rotation[2])>1);assert(!sampleKatanaPose(0,1).active);
});
