import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { createWorld } from '../dist/world.js';
import { buildCourse, ARENA } from '../dist/world-layout.js';
import { GameRules,cleanState } from '../dist/game-rules.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
const world=createWorld(new THREE.Scene()),pads=buildCourse();
assert.equal(pads.length,600);assert.deepEqual(pads.filter(p=>p.checkpoint).map(p=>p.checkpoint),Array.from({length:100},(_,i)=>i+1));
assert.equal(world.boards.filter(b=>b.kind==='checkpoint').length,100);
assert(pads.at(-1).y>200);assert(world.moving.length>50);assert(world.hazards.length>30);
// Numerically follow every hop, with ordinary walking speed and the 1.5x jump.
// Hold position on landing so this checks the actual collision surface, not just a formula.
for(let i=1;i<pads.length;i++){
  const a=pads[i-1],b=pads[i],p=new THREE.Vector3(a.x,a.y,a.z),dir=new THREE.Vector3(b.x-a.x,0,b.z-a.z).normalize();
  p.addScaledVector(dir,(Math.abs(dir.x)>.5?a.w:a.d)/2-.08);
  const vel=new THREE.Vector3(dir.x*2.8,7.95,dir.z*2.8);let landed=false;
  for(let n=0;n<150;n++){
    vel.y-=15/120;
    vel.x=dir.x*2.8;vel.z=dir.z*2.8;
    if(Math.hypot(p.x-b.x,p.z-b.z)<.13){vel.x=0;vel.z=0;}
    const r=world.move(p,vel,1/120);
    if(r.grounded&&p.y>=b.y-.02&&p.y<=b.y+.51&&Math.hypot(p.x-b.x,p.z-b.z)<b.size/2+.4){landed=true;break;}
  }
  assert(landed,'unreachable hop '+i+' position='+p.toArray()+' target='+[b.x,b.y,b.z]);
}
let p=new THREE.Vector3(0,.17,0),v=new THREE.Vector3(0,0,-30);
for(let n=0;n<60;n++)world.move(p,v,1/60);
assert(p.z>-8.5,'studio back wall must block');
p.set(0,5,0);v.set(0,30,0);world.move(p,v,.1);assert(p.y<5.2,'ceiling collision');
p.set(ARENA.x+ARENA.radius-1,.24,ARENA.z);v.set(180,120,0);
world.move(p,v,.05,{ragdoll:true,insideArena:true});
assert(Math.hypot(p.x-ARENA.x,p.y+.95-.24,p.z-ARENA.z)<ARENA.radius-.64,'dome stops fast knockback');
p.set(ARENA.x+ARENA.radius-1,.24,ARENA.z);v.set(30,0,0);world.move(p,v,.06);assert(p.x>ARENA.x+ARENA.radius,'walking can cross dome');
const camera=world.cameraPosition(new THREE.Vector3(0,2,0),new THREE.Vector3(0,2,-20));assert(camera.z>-8.52&&camera.z<-8,'camera stops in front of wall');
const houseCamera=world.cameraPosition(new THREE.Vector3(39,2,45),new THREE.Vector3(60,2,45));assert(houseCamera.x<46.5,'house wall blocks camera');
assert(ARENA.x-33>47+20,'colosseum separated from homes');
assert(world.seats.length>200);assert(world.falling.length>50);assert(world.balls.length>30);assert(pads.some(p=>p.d<1.1));
world.cull(new THREE.Vector3(0,2,0));assert(world.chunks.some(c=>!c.visible),'far chunks culled');
assert(cleanState({x:0,y:250,z:0,yaw:0},3));assert(!cleanState({x:0,y:513,z:0,yaw:0},3));
const messages=[],entries=new Map(),scores={},rules=new GameRules(entries,m=>messages.push(m),scores);
const visibleBoundary=world.group.children.find(m=>m.name==='Duel start boundary');
assert.equal(visibleBoundary.position.x,ARENA.x);assert.equal(visibleBoundary.position.z,ARENA.z);assert.equal(visibleBoundary.geometry.parameters.outerRadius,ARENA.fightRadius);
for(let i=0;i<32;i++){const a=i*Math.PI/16;assert(rules.inside({x:ARENA.x+Math.sin(a)*(ARENA.fightRadius-.01),y:.24,z:ARENA.z+Math.cos(a)*(ARENA.fightRadius-.01)}));assert(!rules.inside({x:ARENA.x+Math.sin(a)*(ARENA.fightRadius+.01),y:.24,z:ARENA.z+Math.cos(a)*(ARENA.fightRadius+.01)}));}
assert(!rules.inside({x:55,y:.24,z:-18}),'old arena coordinates cannot start a duel');
const player=(id,x=ARENA.x,z=ARENA.z)=>({player:{id,profile:id,x,y:.24,z,yaw:0,score:0}});
const one=player('one'),two=player('two',ARENA.x,ARENA.z+2),spectator=player('spectator',0,0);
entries.set(1,one);entries.set(2,two);entries.set(3,spectator);
rules.receive(one,{type:'swing',held:0},10000);rules.receive(two,{type:'swing',held:0},10999);
assert(rules.duel);assert.deepEqual(new Set(rules.duel.ids),new Set(['one','two']));
rules.receive(one,{type:'swing',held:9,target:'two'},11300);assert.equal(rules.duel.damage.two,10);
rules.receive(one,{type:'swing',held:0,target:'two'},11600);assert.equal(rules.duel,null);
assert.equal(one.player.score,1);assert.equal(two.player.score,-1);assert.equal(spectator.player.score,0);
rules.receive(one,{type:'swing'},13000);rules.receive(two,{type:'swing'},14001);assert.equal(rules.duel,null,'1 second limit');
rules.receive(one,{type:'swing'},14400);assert(rules.duel);rules.removed('two');assert.equal(rules.duel,null);
console.log('PASS: 599 actual-physics jumps, 100 checkpoints, walls/ceiling/dome, walking pass-through, 1s handshake, 10+1 damage, spectator safety, disconnect cancellation.');
