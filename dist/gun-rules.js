import {fallbackMuzzle} from './weapon-dimensions.js';
import {WEAPONS,weaponById,inGunZone,GUN_SPAWNS,GUN_SOLIDS,GUN_ENTRY,GUN_EXIT_BOARDS} from './gun-layout.js';
import {segmentBox,projectileWallFraction} from './projectile-motion.js';
import {buildDistrict} from './district.js';
const district=[];buildDistrict({box:(x,y,z,w,h,d,color,solid=true)=>{if(solid)district.push({x,y,z,w,h,d});},board:()=>{},sign:()=>{},seats:[],clockHands:[]});
const interpolate=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
export class GunRules{
 constructor(rules){this.rules=rules;this.members=new Map();this.mode='auto';this.phase='waiting';this.startAt=0;this.round=0;this.shots=[];this.sequence=0;this.marks=[];this.timer=null;this.lastTick=Date.now();this.ammo=new Map();this.nextRoundAt=0;this.solids=[...GUN_SOLIDS,...district];this.buckets=new Map();for(const box of this.solids){for(let x=Math.floor((box.x-box.w/2)/12);x<=Math.floor((box.x+box.w/2)/12);x++)for(let z=Math.floor((box.z-box.d/2)/12);z<=Math.floor((box.z+box.d/2)/12);z++){const key=x+','+z;if(!this.buckets.has(key))this.buckets.set(key,[]);this.buckets.get(key).push(box);}}}
 impact(message){const now=Date.now();this.marks=this.marks.filter(m=>now-m.at<20000);if(message.wall){this.marks.push({...message,at:now});if(this.marks.length>128)this.marks.shift();}this.send({...message,at:now});}
 players(){return this.rules.entries().map(e=>e.player);}
 send(message){this.rules.broadcast(message);}
 record(p){return this.rules.characters.get(p.skin);}
 economy(p){this.send({type:'gun-inventory',playerId:p.id,character:this.record(p),ammo:this.ammo.get(p.id+':'+p.equippedWeapon)||null});}
 reward(p,{coins=0,weapon=null}={}){if(p.guest)return;const c=this.record(p),weaponWins={...c.weaponWins};if(weapon)weaponWins[weapon]=(weaponWins[weapon]||0)+1;return this.rules.characters.change(p.skin,{coins:c.coins+coins,weaponWins});}
 snapshot(){return {phase:this.phase,mode:this.mode,startAt:this.startAt,round:this.round,members:[...this.members.values()].map(m=>({id:m.id,team:m.team,damage:m.damage,out:m.out,manual:m.manual,weapon:m.weapon,skin:this.players().find(p=>p.id===m.id)?.skin??8}))};}
 publish(){this.send({type:'gun-battle',battle:this.snapshot()});}
 assign(){if(this.phase==='active')return;const members=[...this.members.values()],pairs=this.mode==='teams'||this.mode==='auto'&&members.length===4;members.forEach((m,i)=>{if(!m.manual)m.team=pairs?Math.floor(i/Math.ceil(members.length/2)):i;});}
 teleport(p,team){const occupied=this.players().filter(q=>q.id!==p.id&&this.members.has(q.id));let points=GUN_SPAWNS.filter(s=>occupied.every(q=>Math.hypot(q.x-s.x,q.z-s.z)>8));if(!points.length)points=GUN_SPAWNS;const spawn={...points[Math.floor(Math.random()*points.length)],yaw:Math.random()*Math.PI*2};this.move(p,spawn);}
 move(p,position){p.gunTeleportSerial=(p.gunTeleportSerial||0)+1;Object.assign(p,position,{flight:false,seated:false,sleeping:false,ragdoll:false,vx:0,vy:0,vz:0});this.send({type:'gun-teleport',playerId:p.id,position,serial:p.gunTeleportSerial});}
 atBoard(p){return GUN_EXIT_BOARDS.some(b=>Math.hypot(p.x-b.x,p.z-b.z)<5&&p.y<4);}
 enter(p){if(this.members.has(p.id))return;if(this.phase==='active'||Math.hypot(p.x-GUN_ENTRY.x,p.z-GUN_ENTRY.z)>6||p.y>4)return;const c=this.record(p),weapon=c.ownedWeapons.includes(p.equippedWeapon)?p.equippedWeapon:c.ownedWeapons.at(-1);if(!weapon){this.send({type:'gun-error',playerId:p.id,message:'銃を持っていないため入場できません。PCのストアで購入してください'});return;}
  const previousWeapon=p.equippedWeapon||null;this.members.set(p.id,{id:p.id,skin:p.skin,team:0,damage:0,out:false,manual:false,weapon,previousWeapon});if(previousWeapon!==weapon){p.equippedWeapon=weapon;this.rules.onAsyncWork(this.rules.characters.change(p.skin,{equippedWeapon:weapon}));}this.economy(p);this.assign();this.teleport(p,this.members.get(p.id).team);this.phase='waiting';this.startAt=this.members.size>=2?Date.now()+3000:0;this.publish();this.ensureTimer();
 }
 state(p){const m=this.members.get(p.id);if(m){if(!inGunZone(p)){if(m.lastPosition)this.move(p,m.lastPosition);else this.teleport(p,m.team);}p.flight=false;p.seated=false;p.sleeping=false;m.lastPosition={x:p.x,y:p.y,z:p.z,yaw:p.yaw};if(m.out&&this.phase==='active'){p.speed=0;Object.assign(p,m.outPosition||m.lastPosition);p.vx=p.vy=p.vz=0;}}else if(inGunZone(p)){this.move(p,{...GUN_ENTRY,z:GUN_ENTRY.z+3});}}
 remove(id,{publish=true,reassign=true}={}){const m=this.members.get(id);if(!m)return;this.members.delete(id);const p=this.players().find(p=>p.id===id);if(p)p.equippedWeapon=m.previousWeapon;this.rules.onAsyncWork(this.rules.characters.change(m.skin,{equippedWeapon:m.previousWeapon}));if(p)this.economy(p);for(const key of this.ammo.keys())if(key.startsWith(id+':'))this.ammo.delete(key);if(this.phase==='active'){this.phase='finished';this.nextRoundAt=Date.now()+8000;this.send({type:'gun-result',winner:null,round:this.round});}else if(reassign){this.assign();this.startAt=this.members.size>=2?Date.now()+3000:0;}if(publish)this.publish();}
 begin(now){if(this.members.size<2||new Set([...this.members.values()].map(m=>m.team)).size<2){this.startAt=0;this.publish();return;}
  this.phase='active';this.round++;this.shots=[];this.startAt=0;
  for(const m of this.members.values()){const p=this.players().find(p=>p.id===m.id);if(!p)continue;m.damage=0;m.out=false;m.weapon=p.equippedWeapon||'pistol';this.teleport(p,m.team);for(const key of this.ammo.keys())if(key.startsWith(p.id+':'))this.ammo.delete(key);this.economy(p);}
  this.publish();
 }
 resolve(){if(this.phase!=='active')return;const alive=[...this.members.values()].filter(m=>!m.out),teams=new Set(alive.map(m=>m.team));if(teams.size>1)return;
  const winner=alive[0]?.team??null;this.phase='finished';this.nextRoundAt=Date.now()+12000;const rewarded=new Set();
  for(const m of this.members.values()){const p=this.players().find(p=>p.id===m.id);if(p&&m.team===winner&&!rewarded.has(p.skin)){rewarded.add(p.skin);this.rules.onAsyncWork(Promise.resolve(this.reward(p,{coins:1,weapon:m.weapon})));}}
  this.send({type:'gun-result',winner,round:this.round});
  // Finish rewards first, then restore every participant's entry equipment.
  const participants=[...this.members.values()];this.shots=[];
  participants.forEach((m,index)=>{const p=this.players().find(p=>p.id===m.id);this.remove(m.id,{publish:false,reassign:false});if(p)this.move(p,{...GUN_ENTRY,x:GUN_ENTRY.x-2+(index%3)*1.3,z:GUN_ENTRY.z+3+Math.floor(index/3)*1.5});});
  this.phase='waiting';this.startAt=0;this.nextRoundAt=0;this.publish();
 }
 damage(owner,victim,shot,now){
  const attacker=this.members.get(owner.id),target=this.members.get(victim.id);
  if(inGunZone(owner)||inGunZone(victim)){
   if(this.phase!=='active'||!attacker||!target||attacker.out||target.out||attacker.team===target.team)return;
   target.damage++;target.out=target.damage>=3;if(target.out)target.outPosition={x:victim.x,y:victim.y,z:victim.z};
  }else if(this.rules.duel?.ids.includes(owner.id)||this.rules.duel?.ids.includes(victim.id))return;
  // Reuse light punch reaction; each pellet scores independently, without stun immunity.
  this.rules.hit(owner,victim,1,now,{kind:0,held:0});
  this.send({type:'gun-damage',playerId:victim.id,remaining:target?Math.max(0,3-target.damage):null});
  if(target){this.publish();this.resolve();}
 }
 blocked(a,b,layouts,radius=.025){let first=projectileWallFraction(a,b,layouts,radius);const candidates=new Set(),steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/6));for(let i=0;i<=steps;i++){const point=interpolate(a,b,i/steps);for(const box of this.buckets.get(Math.floor(point.x/12)+','+Math.floor(point.z/12))||[])candidates.add(box);}for(const box of candidates){
   if(Math.max(a.x,b.x)+radius<box.x-box.w/2||Math.min(a.x,b.x)-radius>box.x+box.w/2||Math.max(a.z,b.z)+radius<box.z-box.d/2||Math.min(a.z,b.z)-radius>box.z+box.d/2)continue;
   const f=segmentBox(a,b,box,radius);if(f!==null&&(first===null||f<first))first=f;
  }return first;}
 fire(p,message,now){
  const weapon=weaponById(p.equippedWeapon),c=this.record(p),m=this.members.get(p.id);
  if(!weapon||!c.ownedWeapons.includes(weapon.id)||p.ragdoll||p.seated||this.rules.duel?.ids.includes(p.id))return;
  if(inGunZone(p)&&(this.phase!=='active'||!m||m.out))return;
  if(this.shots.length+weapon.pellets>96)return;
  let ammo=this.ammo.get(p.id+':'+weapon.id);if(!ammo||ammo.weapon!==weapon.id)ammo={weapon:weapon.id,left:weapon.magazine,reloadAt:0,lastAt:0};
  if(ammo.reloadAt&&now>=ammo.reloadAt){ammo.left=weapon.magazine;ammo.reloadAt=0;}
  if(ammo.reloadAt||now-ammo.lastAt<weapon.interval)return;
  const aim=message.aim;if(!aim||![aim.x,aim.y,aim.z].every(Number.isFinite))return;const length=Math.hypot(aim.x,aim.y,aim.z);if(length<.9||length>1.1)return;
  ammo.lastAt=now;ammo.left--;if(!ammo.left)ammo.reloadAt=now+5000;this.ammo.set(p.id+':'+weapon.id,ammo);this.economy(p);
  const expected=fallbackMuzzle(p,weapon.id,aim),requested=message.muzzle;
  let origin=requested&&[requested.x,requested.y,requested.z].every(Number.isFinite)&&Math.hypot(requested.x-p.x,requested.z-p.z)<2.3&&requested.y>p.y+.2&&requested.y<p.y+2.8?{x:requested.x,y:requested.y,z:requested.z}:expected;
  const shoulder={x:p.x-Math.cos(p.yaw)*.3,y:p.y+(p.skin===7?1:1.4),z:p.z+Math.sin(p.yaw)*.3},fraction=this.blocked(shoulder,origin,this.rules.houses.snapshots(),.02);if(fraction!==null)origin=interpolate(shoulder,origin,fraction);
  for(let i=0;i<weapon.pellets;i++){
   const dx=aim.x/length+(Math.random()-.5)*weapon.spread*2,dy=aim.y/length+(Math.random()-.5)*weapon.spread*2,dz=aim.z/length+(Math.random()-.5)*weapon.spread*2,n=Math.hypot(dx,dy,dz);
   const shot={id:'gun-'+(++this.sequence),owner:p.id,weapon:weapon.id,serial:message.serial,position:{...origin},origin:{...origin},vx:dx/n*weapon.speed,vy:dy/n*weapon.speed,vz:dz/n*weapon.speed,born:now,lastAt:now,life:weapon.range/weapon.speed,round:inGunZone(p)?this.round:null};this.shots.push(shot);this.send({type:'gun-shot',shot});
  }this.ensureTimer();
 }
 ensureTimer(){if(this.timer)return;this.lastTick=Date.now();const flight=new Promise(resolve=>this.finish=resolve);this.rules.onAsyncWork(flight);this.timer=setInterval(()=>this.tick(Date.now()),40);}
 tick(now){const dt=Math.min(.2,(now-this.lastTick)/1000);this.lastTick=now;const players=this.players(),layouts=this.rules.houses.snapshots(),remaining=[];
  if(this.phase==='waiting'&&this.startAt&&now>=this.startAt)this.begin(now);
  if(this.phase==='finished'&&now>=this.nextRoundAt){this.phase='waiting';this.assign();this.startAt=this.members.size>=2?now+3000:0;this.publish();}
  for(const shot of this.shots){const owner=players.find(p=>p.id===shot.owner);if(!owner||shot.round!==null&&(this.phase!=='active'||shot.round!==this.round))continue;
   const shotDt=Math.max(0,Math.min(.2,(now-(shot.lastAt||shot.born))/1000,shot.life-((shot.lastAt||shot.born)-shot.born)/1000));shot.lastAt=now;const a=shot.position,b={x:a.x+shot.vx*shotDt,y:a.y+shot.vy*shotDt,z:a.z+shot.vz*shotDt},weapon=weaponById(shot.weapon),radius=weapon.radius ? .18 : .025;let first=this.blocked(a,b,layouts,radius),victim=null;
   for(const q of players){if(q.id===owner.id)continue;const own=this.members.get(owner.id),target=this.members.get(q.id);if(shot.round!==null&&(!target||target.out||target.team===own?.team))continue;if(shot.round===null&&inGunZone(q))continue;
    const fraction=segmentBox(a,b,{x:q.x,y:q.y+.9,z:q.z,w:.65,h:1.8,d:.65},radius);if(fraction!==null&&(first===null||fraction<first)){first=fraction;victim=q;}}
   if(first!==null){const point=interpolate(a,b,first);this.impact({type:'gun-impact',id:shot.id,position:point,explosion:!!weapon.radius,velocity:{x:shot.vx,y:shot.vy,z:shot.vz},wall:!victim});
    if(weapon.radius){for(const q of players){if(q.id===owner.id)continue;const center={x:q.x,y:q.y+.9,z:q.z};if(Math.hypot(center.x-point.x,center.y-point.y,center.z-point.z)>weapon.radius)continue;
      const direction={x:center.x-point.x,y:center.y-point.y,z:center.z-point.z},size=Math.hypot(direction.x,direction.y,direction.z)||1,from={x:point.x+direction.x/size*.25,y:point.y+direction.y/size*.25,z:point.z+direction.z/size*.25};if(this.blocked(from,center,layouts,.01)===null)this.damage(owner,q,shot,now);}}
    else if(victim)this.damage(owner,victim,shot,now);continue;
   }
   if(now-shot.born<shot.life*1000){shot.position=b;remaining.push(shot);}
  }this.shots=remaining;
  if(!this.members.size&&!this.shots.length){clearInterval(this.timer);this.timer=null;this.finish?.();this.finish=null;}
 }
 receive(entry,message,now){const p=entry.player,c=this.record(p);
  if(message.type==='gun-enter'){this.enter(p);return true;}
  if(message.type==='gun-exit'){if(this.members.has(p.id)&&this.atBoard(p)){this.remove(p.id);this.move(p,{...GUN_ENTRY,z:GUN_ENTRY.z+3});}return true;}
  if(message.type==='gun-buy'){const weapon=weaponById(message.weapon),index=WEAPONS.indexOf(weapon);if(p.guest||!weapon||this.phase==='active'&&this.members.has(p.id))return true;
   const previous=WEAPONS[index-1];if(c.ownedWeapons.includes(weapon.id)||c.coins<weapon.price||previous&&(!c.ownedWeapons.includes(previous.id)||(c.weaponWins[previous.id]||0)<weapon.require)){this.send({type:'gun-error',playerId:p.id,message:'コインまたは前の武器での勝利数が足りません'});return true;}
   this.rules.onAsyncWork(this.rules.characters.change(p.skin,{coins:c.coins-weapon.price,ownedWeapons:[...c.ownedWeapons,weapon.id],equippedWeapon:weapon.id}));p.equippedWeapon=weapon.id;this.economy(p);return true;
  }
  if(message.type==='gun-equip'){if(this.phase==='active'&&this.members.has(p.id))return true;const id=message.weapon;if(id!==null&&!c.ownedWeapons.includes(id))return true;p.equippedWeapon=id;if(!id)this.remove(p.id);this.rules.onAsyncWork(this.rules.characters.change(p.skin,{equippedWeapon:id}));this.economy(p);return true;}
  if(message.type==='gun-fire'){this.fire(p,message,now);return true;}
  if(message.type==='gun-team'||message.type==='gun-mode'){
   if(this.phase==='active'||!(this.atBoard(p)||!inGunZone(p)&&Math.hypot(p.x-GUN_ENTRY.x,p.z-GUN_ENTRY.z)<6))return true;
   if(message.type==='gun-mode'&&['auto','teams','solo'].includes(message.mode)){this.mode=message.mode;for(const m of this.members.values())m.manual=false;this.assign();}
   if(message.type==='gun-team'){const m=this.members.get(message.member),team=Number(message.team);if(m&&Number.isInteger(team)&&team>=0&&team<Math.max(2,Math.min(9,this.members.size))){m.team=team;m.manual=true;const q=this.players().find(q=>q.id===m.id);if(q)this.teleport(q,team);}}
   this.startAt=this.members.size>=2?now+3000:0;this.publish();return true;
  }return false;
 }
}
