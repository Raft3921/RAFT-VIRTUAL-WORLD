import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {createGunActionMotion,stepGunActionMotion} from '../dist/gun-action-motion.js';
import {sampleHit,gunEliminationState} from '../dist/hit-reaction.js';
import {createGunEffects} from '../dist/gun-effects.js';

test('weapon motion reacts once to jump and landing, then settles at multiple frame rates',()=>{
 for(const fps of [20,60,144]){const state=createGunActionMotion(),dt=1/fps;stepGunActionMotion(state,{grounded:true,speed:0},dt);
  let pose=stepGunActionMotion(state,{grounded:false,verticalSpeed:8.4,speed:3},dt);assert.equal(pose.event,'jump');assert(pose.y<0);let events=1;
  for(let i=0;i<fps/3;i++){pose=stepGunActionMotion(state,{grounded:false,verticalSpeed:-10,speed:3},dt);if(pose.event)events++;}
  pose=stepGunActionMotion(state,{grounded:true,speed:0},dt);assert.equal(pose.event,'land');assert(pose.land>.4);assert.equal(events,1);
  for(let i=0;i<fps*2;i++)pose=stepGunActionMotion(state,{grounded:true,speed:0},dt);
  assert(Math.abs(pose.x)+Math.abs(pose.y)+Math.abs(pose.pitch)<.001);
 }
});
test('sprinting has larger arm motion than walking while scoped motion is restrained',()=>{
 const sample=(speed,ads=0)=>{const state=createGunActionMotion();let pose;for(let i=0;i<60;i++)pose=stepGunActionMotion(state,{grounded:true,speed,phase:1,strafe:0,ads},1/60);return pose;};
 const walk=sample(2.8),run=sample(6),scoped=sample(6,1);assert(run.sprint>walk.sprint);assert(Math.abs(run.x)>Math.abs(walk.x));assert(Math.abs(scoped.roll)<Math.abs(run.roll)*.2);
});
test('gun eliminations flail, collapse, bounce and stay down without a recovery phase',()=>{
 let previous=null;for(let i=0;i<=300;i++){const state=gunEliminationState(i/100),pose=sampleHit({gunEliminated:state.gunEliminated,phase:state.hitPhase,elapsed:state.hitTime,downTime:state.hitDownTime});
  assert(state.gunEliminated);assert.notEqual(state.hitPhase,'recover');assert(Object.values(pose).flat().every(Number.isFinite));if(previous&&state.hitPhase==='air')assert(Math.abs(pose.tilt-previous.tilt)<.06);previous=pose;
 }
 const end=sampleHit({gunEliminated:true,phase:'air',elapsed:.85}),down=sampleHit({gunEliminated:true,phase:'down',downTime:0});for(const key of ['height','tilt','spread'])assert(Math.abs(end[key]-down[key])<.002);
 assert(sampleHit({gunEliminated:true,phase:'air',elapsed:.45}).spread>.3);assert.equal(gunEliminationState(60).hitPhase,'down');assert(gunEliminationState(.2).hitTime>.1);
});
test('repeated firing, movement, reload and finish effects stay bounded and expire',()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
 try{const scene=new T.Scene(),fx=createGunEffects(scene),p=new T.Vector3(0,0,0),aim=new T.Vector3(0,0,1),count=scene.children.length;
  for(let i=0;i<200;i++){fx.muzzle(p,aim);fx.eject(p,aim,'machine',0);fx.action(i%2?'land':'step',p,1,aim);fx.reload(p,aim,'machine',i%2?'out':'snap',0);if(i%10===0)fx.celebrate(p,true);fx.update(.016);}
  assert.equal(scene.children.length,count);assert(fx.stats.particles<=fx.stats.particleLimit);assert(fx.stats.casings<=fx.stats.casingLimit);assert(fx.stats.waves<=fx.stats.waveLimit);
  fx.update(4);assert.equal(fx.stats.particles+fx.stats.casings+fx.stats.waves,0);assert(scene.children.every(n=>!n.visible));
 }finally{globalThis.document=old;}
});
