import test from 'node:test';
import assert from 'node:assert/strict';
import {GunRules} from '../dist/gun-rules.js';
import {weaponById} from '../dist/gun-layout.js';

function fixture(){
 const players=[{id:'owner',x:174,y:0,z:-92},...['near','edge','outside','friend'].map(id=>({id,x:182,y:0,z:-92}))],messages=[],hits=[];
 const rules={entries:()=>players.map(player=>({player})),broadcast:m=>messages.push(m),houses:{snapshots:()=>[]},hit:(owner,victim,damage)=>hits.push({id:victim.id,damage})};
 const gun=new GunRules(rules);gun.phase='active';gun.round=1;
 for(const p of players)gun.members.set(p.id,{id:p.id,team:p.id==='owner'||p.id==='friend'?0:1,damage:0,out:false});
 let resolved=[];gun.resolve=()=>{resolved.push([...gun.members.values()].filter(m=>m.out).map(m=>m.id));};
 return {gun,players,messages,hits,resolved};
}

test('rocket deals two damage to all enemies within the radius, including behind cover',()=>{
 const {gun,players,messages,hits,resolved}=fixture(),radius=weaponById('rocket').radius;
 players.find(p=>p.id==='edge').x+=radius;
 players.find(p=>p.id==='outside').x+=radius+.335;
 // Force a wall impact at the blast center. A second occlusion query would block
 // victims behind the wall; explosions deliberately use distance alone.
 let queries=0;gun.blocked=()=>{queries++;return 0;};
 gun.shots=[{id:'blast',owner:'owner',weapon:'rocket',position:{x:182,y:.9,z:-92},vx:24,vy:0,vz:0,born:1000,lastAt:1000,life:10,round:1}];
 gun.lastTick=1000;gun.tick(1040);
 assert.deepEqual(hits,[{id:'near',damage:2},{id:'edge',damage:2}]);assert.deepEqual(resolved,[[]]);assert.equal(queries,1);
 assert.equal(gun.members.get('near').damage,2);assert.equal(gun.members.get('edge').out,false);
 for(const id of ['owner','outside','friend'])assert.equal(gun.members.get(id).damage,0);
 const impact=messages.find(m=>m.type==='gun-impact');assert.equal(impact.radius,radius);assert.equal(impact.explosion,true);
 assert.equal(messages.filter(m=>m.type==='gun-eliminated').length,0);
 assert.deepEqual(messages.filter(m=>m.type==='gun-damage').map(m=>m.damage),[2,2]);
 assert.deepEqual(messages.filter(m=>m.type==='gun-damage').map(m=>m.remaining),[1,1]);
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
  for(let i=0;i<8;i++)effects.update(.1);
  for(const sprite of scene.children.filter(mesh=>mesh.isSprite&&mesh.visible))assert(sprite.position.distanceTo(position)+sprite.scale.x/Math.SQRT2<=radius+1e-6);
  for(let i=0;i<20;i++)effects.impact(position,true,radius);
  assert.equal(scene.children.length,count);effects.update(3);assert(scene.children.every(mesh=>!mesh.visible));
 }finally{globalThis.document=previousDocument;}
});


test('blast hits a body intersecting the boundary, including crouched players',()=>{
 const {gun,players,messages}=fixture(),radius=weaponById('rocket').radius;
 const near=players.find(p=>p.id==='near');near.x+=radius+.3;near.crouched=true;
 players.find(p=>p.id==='outside').x+=radius+.34;
 gun.blocked=()=>0;gun.shots=[{id:'body-edge',owner:'owner',weapon:'rocket',position:{x:182,y:.6,z:-92},vx:24,vy:0,vz:0,born:1000,lastAt:1000,life:10,round:1}];gun.lastTick=1000;gun.tick(1040);
 assert.equal(gun.members.get('near').damage,2);assert.equal(gun.members.get('outside').damage,0);
 assert.equal(messages.find(m=>m.type==='gun-damage'&&m.playerId==='near').damage,2);
});

test('real round resolution eliminates every blast victim before awarding the win',()=>{
 const {gun,players,messages}=fixture();
 gun.resolve=GunRules.prototype.resolve;
 for(const p of players){p.skin=players.indexOf(p);const m=gun.members.get(p.id);if(m.team===1)m.damage=1;m.skin=p.skin;m.weapon='rocket';m.previousWeapon='pistol';}
 gun.rules.characters={get:()=>({coins:0,weaponWins:{}}),change:()=>Promise.resolve()};gun.rules.onAsyncWork=()=>{};
 gun.blocked=()=>0;gun.shots=[{id:'round-end',owner:'owner',weapon:'rocket',position:{x:182,y:.9,z:-92},vx:24,vy:0,vz:0,born:1000,lastAt:1000,life:10,round:1}];gun.lastTick=1000;gun.tick(1040);
 assert.equal(gun.phase,'preview');gun.finishPreview(16000);
 assert.equal(messages.filter(m=>m.type==='gun-eliminated').length,3);
 const resultIndex=messages.findIndex(m=>m.type==='gun-result');
 assert(messages.slice(0,resultIndex).filter(m=>m.type==='gun-damage').every(m=>m.damage===2&&m.remaining===0));
 assert.equal(messages[resultIndex].winner,0);assert.equal(gun.phase,'waiting');assert.equal(gun.members.size,0);
});

test('rocket impact uses the supplied explosion audio with strong positional playback',async()=>{
 const THREE=await import('../dist/vendor/three.module.js'),{readFile}=await import('node:fs/promises');
 const source=(await readFile(new URL('../dist/world-audio.js',import.meta.url),'utf8')).replace("'three'",JSON.stringify(new URL('../dist/vendor/three.module.js',import.meta.url).href));
 const {createWorldAudio}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const original={window:globalThis.window,fetch:globalThis.fetch,addEventListener:globalThis.addEventListener},listeners={},sources=[],gains=[],panners=[],urls=[];
 const node=()=>({connect(other){return other;},disconnect(){},stop(){}});
 class Context{
  state='running';currentTime=0;
  resume(){}decodeAudioData(buffer){return Promise.resolve({sample:new Uint8Array(buffer)[0]});}
  createDelay(){return {...node(),delayTime:{value:0}};}
  createGain(){const gain={...node(),gain:{value:0}};gains.push(gain);return gain;}
  createBiquadFilter(){return {...node(),frequency:{value:0}};}
  createPanner(){const panner={...node(),setPosition(){}};panners.push(panner);return panner;}
  createBufferSource(){const sound={...node(),start(at){this.startedAt=at;}};sources.push(sound);return sound;}
 }
 globalThis.window={AudioContext:Context};globalThis.addEventListener=(name,fn)=>listeners[name]=fn;
 globalThis.fetch=async url=>{const index=urls.length;urls.push(String(url));return {arrayBuffer:async()=>new Uint8Array([index]).buffer};};
 try{
  // Preserve relative audio URLs when loading the module from a data URL.
  const fileSource=source.replace("new URL('./audio/'+name,import.meta.url)","new URL('./audio/'+name,"+JSON.stringify(new URL('../dist/world-audio.js',import.meta.url).href)+")");
  const {createWorldAudio:factory}=await import('data:text/javascript;base64,'+Buffer.from(fileSource).toString('base64'));
  const camera=new THREE.PerspectiveCamera(),audio=factory(camera);await listeners.pointerdown();
  audio.explosion(new THREE.Vector3(12,0,0),{world:{cameraPosition:()=>new THREE.Vector3()}});await new Promise(resolve=>setImmediate(resolve));
  assert(urls[4].endsWith('/audio/rocket-explosion.mp3'));assert.equal(sources.at(-1).buffer.sample,4);
  assert.equal(gains.at(-1).gain.value,.8);assert.equal(panners.at(-1).refDistance,24);assert.equal(panners.at(-1).maxDistance,320);
  assert.equal(sources.at(-1).startedAt,12/343);
 }finally{Object.assign(globalThis,original);}
});
