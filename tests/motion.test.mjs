import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createWorld} from '../dist/world.js';
import {ARENA,buildCourse} from '../dist/world-layout.js';
import {ATTACKS,chargeAttack,sampleAttack,sampleCharge} from '../dist/combat-motion.js';
import {createHit,stepHit,hitShape,sampleHit} from '../dist/hit-reaction.js';
import {createCombatEffects} from '../dist/combat-effects.js';
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
const world=createWorld(new THREE.Scene());
assert.equal(new Set(Array.from({length:9},(_,i)=>chargeAttack(i+2))).size,9);
for(let kind=0;kind<ATTACKS.length;kind++)for(let i=0;i<=100;i++){
  const pose=sampleAttack(kind,i/100);assert(Object.values(pose).flat().every(Number.isFinite));assert(pose.weight>=0&&pose.weight<=1);
}
assert(sampleCharge(.9).spread>sampleCharge(.2).spread);
const airborne=sampleHit({phase:'air',elapsed:.8,strength:.8});assert(airborne.tilt<-1,'airborne victim must visibly topple');
for(let i=0;i<600;i++)for(const phase of ['air','down','recover']){
  const pose=sampleHit({phase,elapsed:i/60,downTime:i/60,recovery:i/600,strength:.8});assert(Object.values(pose).flat().every(Number.isFinite));
}
const effectScene=new THREE.Scene(),effects=createCombatEffects(effectScene),fake={root:new THREE.Group(),joints:{elbows:{},knees:{}}};
for(const name of ['elbows','knees'])for(const side of ['left','right']){const joint=new THREE.Group();fake.root.add(joint);fake.joints[name][side]=joint;}
effectScene.add(fake.root);
for(let kind=0;kind<4;kind++){
  effects.attack(fake,kind,.2,kind,0,false,1/60);
  for(const name of ['elbows','knees'])for(const side of ['left','right'])fake.joints[name][side].position.x+=.3;
  effects.attack(fake,kind,.4,kind,0,false,1/60);effects.update(1/60);assert(effects.diagnostics().active>0,'missed punches and kicks need wind');
}
effects.impact(new THREE.Vector3(0,1,0),0);effects.update(1/60);assert(effects.mesh.visible,'normal hits need sparks');
assert(effects.diagnostics().active<=192);effects.update(2);assert.equal(effects.diagnostics().active,0);effects.dispose();
const p=new THREE.Vector3(ARENA.x,.24,ARENA.z),velocity=new THREE.Vector3(35,14,0),hit=createHit(.8),phases=new Set();
let sprang=false,done=false;
for(let i=0;i<1200;i++){
  velocity.y-=18/120;const result=world.move(p,velocity,1/120,{ragdoll:true,insideArena:true,shape:hitShape(hit,-Math.PI/2)});
  const event=stepHit(hit,1/120,result.grounded,velocity);phases.add(hit.phase);
  assert(p.toArray().every(Number.isFinite));assert(p.y>=.24-1e-7,'body must not enter floor');
  if(event==='spring')sprang=true;if(event==='done'){done=true;break;}
}
assert(sprang&&done);assert(phases.has('air')&&phases.has('down')&&phases.has('recover'));
const wallPoint=new THREE.Vector3(8,.16,0),wallVelocity=new THREE.Vector3(30,0,0),down=createHit();down.phase='down';
world.move(wallPoint,wallVelocity,.2,{ragdoll:true,shape:hitShape(down,-Math.PI/2)});
assert(wallPoint.x+2.0<10.8,'lying head / torso must stop before wall');
const falling=world.falling[0];world.update(0,new THREE.Vector3());
const foot=new THREE.Vector3(falling.x,falling.y+falling.h/2+.1,falling.z),fallVelocity=new THREE.Vector3(0,-2,0);
world.move(foot,fallVelocity,.1);world.update(.8,foot);assert(falling.disabled);world.update(4.5,foot);assert(!falling.disabled);assert.equal(falling.y,falling.originY);
const mover=world.moving.find(p=>!p.lift&&!p.forward);let minimum=Infinity,maximum=-Infinity;
for(let i=0;i<80;i++){world.update(i*.1,foot);minimum=Math.min(minimum,mover.z);maximum=Math.max(maximum,mover.z);}assert(maximum-minimum>3.4,'sideways platforms must travel widely');
const pads=buildCourse();for(let i=0;i<594;i+=6)assert(new Set(pads.slice(i+1,i+6).map(p=>p.kind)).size>=4,'mixed obstacles per checkpoint');
console.log('PASS: nine distinct charge tiers, finite combat tracks, hit -> down -> physical kip-up, prone wall/floor collision, timed falling-floor reset, wide movers, mixed courses.');
