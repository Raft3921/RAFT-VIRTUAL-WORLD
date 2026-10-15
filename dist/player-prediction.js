import {cloneMantle} from './player-mantle.js?v=20261015-mantle103';
import * as THREE from './vendor/three.module.js';
import {stepPlayer} from './player-physics.js?v=20261015-mantle103';
export class PlayerPrediction{
 constructor(){this.epoch=1;this.seq=0;this.ack=0;this.pending=[];this.active=false;this.mantle=null;this.offset=new THREE.Vector3();this.last=null;this.resetPending=false;}
 reset(){this.epoch++;this.seq=0;this.ack=0;this.pending=[];this.active=false;this.mantle=null;this.last=null;this.offset.set(0,0,0);}
 step(world,body,input,connected){
  if(this.last&&body.p.distanceToSquared(this.last)>.0625){this.reset();this.resetPending=true;}
  if(!this.active&&!this.resetPending){this.epoch++;this.seq=0;this.ack=0;this.pending=[];this.active=true;}
  body.mantle=this.mantle;const result=stepPlayer(world,body,input);this.mantle=body.mantle;this.last=body.p.clone();
  if(connected&&this.active){this.pending.push({...input,seq:++this.seq});if(this.pending.length>120){this.reset();this.resetPending=true;}}
  return result;
 }
 packet(){const packet={active:this.active&&!this.resetPending,epoch:this.epoch,inputs:this.pending.slice(0,16)};if(this.resetPending)this.resetPending=false;return packet;}
 reconcile(world,body,m,teleport){
  if(!this.active||m.epoch!==this.epoch||m.teleport!==teleport||!Number.isSafeInteger(m.seq)||m.seq>this.seq||m.seq<this.ack||![m.x,m.y,m.z,m.vy].every(Number.isFinite))return false;
  this.ack=m.seq;const previous=body.p.clone();this.pending=this.pending.filter(i=>i.seq>m.seq);body.p.set(m.x,m.y,m.z);body.vy=m.vy;body.grounded=m.grounded;body.mantle=cloneMantle(m.mantle);body.standingOn=m.grounded?world.floorAt(body.p,body.p.y+.04).body:null;
  for(const input of this.pending)stepPlayer(world,body,input);
  this.mantle=body.mantle;this.offset.add(previous.sub(body.p));if(this.offset.length()>1)this.offset.setLength(1);this.last=body.p.clone();return true;
 }
}
