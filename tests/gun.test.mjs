import test from 'node:test';
import assert from 'node:assert/strict';
import {GunRules} from '../dist/gun-rules.js';
import {weaponById} from '../dist/gun-layout.js';

function fixture(){
 const players=[{id:'owner',x:174,y:0,z:-92},...['near','edge','outside','friend'].map(id=>({id,x:182,y:0,z:-92}))],messages=[],hits=[];
 const rules={entries:()=>players.map(player=>({player})),broadcast:m=>messages.push(m),houses:{snapshots:()=>[]},hit:(owner,victim)=>hits.push(victim.id)};
 const gun=new GunRules(rules);gun.phase='active';gun.round=1;
 for(const p of players)gun.members.set(p.id,{id:p.id,team:p.id==='owner'||p.id==='friend'?0:1,damage:0,out:false});
 let resolved=[];gun.resolve=()=>{resolved.push([...gun.members.values()].filter(m=>m.out).map(m=>m.id));};
 return {gun,players,messages,hits,resolved};
}

test('rocket kills all enemies in its radius, including behind cover, before resolving the round',()=>{
 const {gun,players,messages,hits,resolved}=fixture(),radius=weaponById('rocket').radius;
 players.find(p=>p.id==='edge').x+=radius;
 players.find(p=>p.id==='outside').x+=radius+.01;
 // Force a wall impact at the blast center. A second occlusion query would block
 // victims behind the wall; explosions deliberately use distance alone.
 let queries=0;gun.blocked=()=>{queries++;return 0;};
 gun.shots=[{id:'blast',owner:'owner',weapon:'rocket',position:{x:182,y:.9,z:-92},vx:24,vy:0,vz:0,born:1000,lastAt:1000,life:10,round:1}];
 gun.lastTick=1000;gun.tick(1040);
 assert.deepEqual(hits,['near','edge']);assert.deepEqual(resolved,[['near','edge']]);assert.equal(queries,1);
 assert.equal(gun.members.get('near').damage,3);assert.equal(gun.members.get('edge').out,true);
 for(const id of ['owner','outside','friend'])assert.equal(gun.members.get(id).damage,0);
 const impact=messages.find(m=>m.type==='gun-impact');assert.equal(impact.radius,radius);assert.equal(impact.explosion,true);
 assert.equal(messages.filter(m=>m.type==='gun-eliminated').length,2);
 assert.deepEqual(messages.filter(m=>m.type==='gun-damage').map(m=>m.remaining),[0,0]);
});

test('ordinary bullets still take three hits to eliminate an enemy',()=>{
 const {gun,players}=fixture(),owner=players[0],victim=players[1];
 gun.damage(owner,victim,{weapon:'pistol'},1000);assert.equal(gun.members.get(victim.id).damage,1);assert.equal(gun.members.get(victim.id).out,false);
 gun.damage(owner,victim,{weapon:'pistol'},1100);assert.equal(gun.members.get(victim.id).out,false);
 gun.damage(owner,victim,{weapon:'pistol'},1200);assert.equal(gun.members.get(victim.id).out,true);
});

test('explosion shell shows the damage radius and pooled effects expire',async()=>{
 const THREE=await import('../dist/vendor/three.module.js');
 const {readFile}=await import('node:fs/promises');
 const source=(await readFile(new URL('../dist/gun-effects.js',import.meta.url),'utf8')).replace("'three'",JSON.stringify(new URL('../dist/vendor/three.module.js',import.meta.url).href));
 const {createGunEffects}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const previousDocument=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
 try{
  const scene=new THREE.Scene(),effects=createGunEffects(scene),position=new THREE.Vector3(182,.9,-92),radius=weaponById('rocket').radius;
  const count=scene.children.length;effects.impact(position,true,radius);effects.update(.1);
  const blast=scene.children.find(root=>root.isGroup&&root.visible);assert(blast);assert.deepEqual(blast.position.toArray(),position.toArray());assert.deepEqual(blast.children[0].scale.toArray(),[radius,radius,radius]);
  for(let i=0;i<20;i++)effects.impact(position,true,radius);
  assert.equal(scene.children.length,count);effects.update(3);assert(scene.children.every(mesh=>!mesh.visible));
 }finally{globalThis.document=previousDocument;}
});
