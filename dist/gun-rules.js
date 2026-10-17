import {GunHitTimeline,movingGunHit} from './gun-hit-timeline.js?v=20261017-slide120';
import {REPLAY_FINAL_AT,REPLAY_DURATION} from './replay-timing.js?v=20261016-cinema106';
import {solidExtents,segmentGunSolid} from './gun-solid.js?v=20261015-tactics99';
import {gunDamage,gunHitBox,gunBulletBoxes,gunProjectileRadius} from './gun-posture.js?v=20261017-slide120';
import {GUN_PROP_DEFS} from './gun-map-state.js?v=20261015-tactics99';
import {GUN_SPAWNS,GUN_SOLIDS} from './gun-collision.js?v=20261015-tactics99';
import {gunEliminationState} from './hit-reaction.js?v=20261016-cinema106';
import {fallbackMuzzle} from './weapon-dimensions.js?v=20261015-tactics99';
import {WEAPONS,weaponById,inGunZone,GUN_ENTRY,GUN_EXIT_BOARDS} from './gun-layout.js?v=20261015-tactics99';
import {segmentBox,projectileWallFraction} from './projectile-motion.js?v=20261013-life89b';
import {buildDistrict} from './district.js?v=20261013-life89b';
let district=null;function districtSolids(){if(!district){district=[];buildDistrict({box:(x,y,z,w,h,d,color,solid=true)=>{if(solid)district.push({x,y,z,w,h,d});},board:()=>{},sign:()=>{},seats:[],clockHands:[]});}return district;}
const interpolate=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
export class GunRules{
 constructor(rules){this.rules=rules;this.hitTimeline=new GunHitTimeline();this.members=new Map();this.mode='auto';this.phase='waiting';this.startAt=0;this.round=0;this.shots=[];this.sequence=0;this.marks=[];this.timer=null;this.lastTick=Date.now();this.ammo=new Map();this.nextRoundAt=0;this.preview=null;const life=Number(rules.settings?.gunLife);this.maxLife=Number.isInteger(life)?Math.max(3,Math.min(100,life)):3;this.traces=new Map();this.mapRevision=0;this.charges=new Map();this.slashes=new Map();this.configureSolids();}
 configureSolids(){const rules=this.rules;this.solids=[...GUN_SOLIDS,...(rules.settings?.combatOnly?[]:districtSolids())];this.buckets=new Map();for(const box of this.solids){const extent=solidExtents(box);for(let x=Math.floor((box.x-extent.x)/12);x<=Math.floor((box.x+extent.x)/12);x++)for(let z=Math.floor((box.z-extent.z)/12);z<=Math.floor((box.z+extent.z)/12);z++){const key=x+','+z;if(!this.buckets.has(key))this.buckets.set(key,[]);this.buckets.get(key).push(box);}}}
 impact(message){const now=Date.now();this.marks=this.marks.filter(m=>now-m.at<20000);if(message.wall){this.marks.push({...message,at:now});if(this.marks.length>128)this.marks.shift();}this.send({...message,at:now});}
 players(){return this.rules.entries().map(e=>e.player);}
 send(message){this.rules.broadcast(message);}
 record(p){return this.rules.characters.get(p.skin);}
 economy(p){this.send({type:'gun-inventory',playerId:p.id,character:this.record(p),ammo:this.ammo.get(p.id+':'+p.equippedWeapon)||null});}
 reward(p,{coins=0,weapon=null}={}){const c=this.record(p),weaponWins={...c.weaponWins};if(weapon)weaponWins[weapon]=(weaponWins[weapon]||0)+1;return this.rules.characters.change(p.skin,{coins:c.coins+coins,weaponWins});}
 snapshot(){return {maxLife:this.maxLife,mapRevision:this.mapRevision,traces:[...this.traces.values()],preview:this.preview?.message||null,phase:this.phase,mode:this.mode,startAt:this.startAt,round:this.round,members:[...this.members.values()].map(m=>({id:m.id,team:m.team,damage:m.damage,out:m.out,manual:m.manual,weapon:m.weapon,skin:this.players().find(p=>p.id===m.id)?.skin??8}))};}
 publish(){this.send({type:'gun-battle',battle:this.snapshot()});}
 assign(){if(this.phase==='active'||this.phase==='preview')return;const members=[...this.members.values()],pairs=this.mode==='teams'||this.mode==='auto'&&members.length===4;members.forEach((m,i)=>{if(!m.manual)m.team=pairs?Math.floor(i/Math.ceil(members.length/2)):i;});}
 teleport(p,team){const occupied=this.players().filter(q=>q.id!==p.id&&this.members.has(q.id));let points=GUN_SPAWNS.filter(s=>occupied.every(q=>Math.hypot(q.x-s.x,q.z-s.z)>8));if(!points.length)points=GUN_SPAWNS;const spawn={...points[Math.floor(Math.random()*points.length)],yaw:Math.random()*Math.PI*2};this.move(p,spawn);}
 move(p,position){p.gunTeleportSerial=(p.gunTeleportSerial||0)+1;Object.assign(p,position,{hitSlideBlend:0,sliding:false,slideAir:false,sprintCharge:0,hitProneBlend:0,hitCrouchBlend:0,flight:false,prone:false,crouched:false,seated:false,sleeping:false,ragdoll:false,gunEliminated:false,vx:0,vy:0,vz:0});this.hitTimeline.observe(p,Date.now());this.send({type:'gun-teleport',playerId:p.id,position,serial:p.gunTeleportSerial});}
 atBoard(p){return GUN_EXIT_BOARDS.some(b=>Math.hypot(p.x-b.x,p.z-b.z)<5&&p.y<4);}
 enter(p){if(this.members.has(p.id))return;if(this.phase==='active'||this.phase==='preview'||Math.hypot(p.x-GUN_ENTRY.x,p.z-GUN_ENTRY.z)>6||p.y>4)return;const c=this.record(p),weapon=c.ownedWeapons.includes(p.equippedWeapon)?p.equippedWeapon:c.ownedWeapons.at(-1);if(!weapon){this.send({type:'gun-error',playerId:p.id,message:'武器を持っていないため入場できません。PCのストアで購入してください'});return;}
  if(!this.members.size)this.resetMap();
  const previousWeapon=p.equippedWeapon||null;this.members.set(p.id,{id:p.id,skin:p.skin,team:0,damage:0,out:false,manual:false,weapon,previousWeapon});if(previousWeapon!==weapon){p.equippedWeapon=weapon;this.rules.onAsyncWork(this.rules.characters.change(p.skin,{equippedWeapon:weapon}));}this.economy(p);this.assign();this.teleport(p,this.members.get(p.id).team);this.phase='waiting';this.startAt=this.members.size>=2?Date.now()+3000:0;this.publish();this.ensureTimer();
 }
 state(p){if(p.equippedWeapon!=='katana')this.charges.delete(p.id);const frozen=this.preview?.message.players.find(q=>q.id===p.id);if(frozen){Object.assign(p,frozen,{speed:0,vx:0,vy:0,vz:0,verticalSpeed:0});return;}this.checkReload(p,Date.now());const m=this.members.get(p.id);if(m){if(!inGunZone(p)){if(m.lastPosition)this.move(p,m.lastPosition);else this.teleport(p,m.team);}p.flight=false;p.seated=false;p.sleeping=false;this.ram(p);if(m.wasProne&&!p.prone&&this.solids.some(b=>!this.traces.has(b.gunPropId)&&b.y-b.h/2<p.y+1.8&&b.y+b.h/2>p.y+.05&&Math.abs(p.x-b.x)<b.w/2+.32&&Math.abs(p.z-b.z)<b.d/2+.32))p.prone=true;m.wasProne=!!p.prone;m.lastPosition={x:p.x,y:p.y,z:p.z,yaw:p.yaw};if(m.out&&this.phase==='active'){p.speed=0;Object.assign(p,m.outPosition||m.lastPosition);Object.assign(p,gunEliminationState((Date.now()-(m.outAt||Date.now()))/1000));p.vx=p.vy=p.vz=0;}}else if(inGunZone(p)){this.move(p,{...GUN_ENTRY,z:GUN_ENTRY.z+3});}}
 remove(id,{publish=true,reassign=true}={}){this.charges.delete(id);this.slashes.delete(id);if(this.preview&&this.members.has(id))return;const m=this.members.get(id);if(!m)return;this.members.delete(id);const p=this.players().find(p=>p.id===id);if(p)p.equippedWeapon=m.previousWeapon;this.rules.onAsyncWork(this.rules.characters.change(m.skin,{equippedWeapon:m.previousWeapon}));if(p)this.economy(p);for(const key of this.ammo.keys())if(key.startsWith(id+':'))this.ammo.delete(key);if(this.phase==='active'){this.phase='finished';this.nextRoundAt=Date.now()+8000;this.send({type:'gun-result',winner:null,round:this.round});this.resetMap();}else if(reassign){this.assign();this.startAt=this.members.size>=2?Date.now()+3000:0;}if(publish)this.publish();}
 begin(now){if(this.members.size<2||new Set([...this.members.values()].map(m=>m.team)).size<2){this.startAt=0;this.publish();return;}
  this.resetMap();this.phase='active';this.round++;this.shots=[];this.startAt=0;
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
  this.phase='waiting';this.startAt=0;this.nextRoundAt=0;this.resetMap();this.publish();
 }
 damage(owner,victim,shot,now,{deferResolve=false,previewed=false}={}){
  const attacker=this.members.get(owner.id),target=this.members.get(victim.id),damage=gunDamage(shot.weapon,shot.charge);
  if(inGunZone(owner)||inGunZone(victim)){
   if(this.phase!=='active'||!attacker||!target||attacker.out||target.out||attacker.team===target.team)return;
   target.damage=Math.min(this.maxLife,target.damage+damage);target.out=target.damage>=this.maxLife;if(target.out){this.cancelReload(victim,now);target.outAt=now-(previewed?1800:0);target.outPosition={x:victim.x,y:victim.y,z:victim.z};Object.assign(victim,gunEliminationState(previewed?1.8:0),{vx:0,vy:0,vz:0});const length=Math.hypot(shot.vx||victim.x-owner.x,shot.vz||victim.z-owner.z)||1;this.send({type:'gun-eliminated',settled:previewed,playerId:victim.id,attacker:owner.id,weapon:shot.weapon,position:target.outPosition,direction:{x:(shot.vx||victim.x-owner.x)/length,z:(shot.vz||victim.z-owner.z)/length},at:now});}
  }else if(this.rules.duel?.ids.includes(owner.id)||this.rules.duel?.ids.includes(victim.id))return;
  // Reuse light punch reaction; each pellet scores independently, without stun immunity.
  this.rules.hit(owner,victim,damage,now,{kind:0,held:0});
  this.send({type:'gun-damage',previewed,playerId:victim.id,attacker:owner.id,damage,weapon:shot.weapon,remaining:target?Math.max(0,this.maxLife-target.damage):null});
  if(target&&!deferResolve){this.publish();this.resolve();}
 }
 inBlast(q,point,radius){return gunBulletBoxes(q).some(box=>{const c=Math.cos(box.yaw),s=Math.sin(box.yaw),x=point.x-box.x,z=point.z-box.z,dx=Math.max(0,Math.abs(c*x-s*z)-box.w/2),dz=Math.max(0,Math.abs(s*x+c*z)-box.d/2),dy=Math.max(0,Math.abs(point.y-box.y)-box.h/2);return Math.hypot(dx,dy,dz)<=radius;});}

 applyImpact(owner,victims,shot,impact,now){
  this.impact(impact);
  for(const victim of victims)this.damage(owner,victim,shot,now,{deferResolve:true,previewed:!!impact.previewId});
  this.publish();this.resolve();
 }
 reserveFinalHit(owner,victims,shot,impact,now){
  if(this.phase!=='active'||shot.round!==this.round)return false;
  const attacker=this.members.get(owner.id);if(!attacker||attacker.out)return false;
  const targets=victims.filter(p=>{const m=this.members.get(p.id);return m&&!m.out&&m.team!==attacker.team;});
  const damage=gunDamage(shot.weapon,shot.charge),lethal=new Set(targets.filter(p=>this.members.get(p.id).damage+damage>=this.maxLife).map(p=>p.id));
  if(!lethal.size||new Set([...this.members.values()].filter(m=>!m.out&&!lethal.has(m.id)).map(m=>m.team)).size>1)return false;
  const players=this.players().filter(p=>this.members.has(p.id)).map(p=>({id:p.id,skin:p.skin,team:this.members.get(p.id)?.team,x:p.x,y:p.y,z:p.z,yaw:p.yaw||0,prone:!!p.prone,crouched:!!p.crouched,equippedWeapon:p.equippedWeapon,ragdoll:!!p.ragdoll}));
  const message={type:'gun-preview',id:'final-'+this.round+'-'+shot.id,round:this.round,startAt:now+450,duration:REPLAY_DURATION,winner:attacker.team,owner:owner.id,victims:[...lethal],players,shot:{...shot,position:{...shot.position},origin:{...(shot.origin||shot.position)}},impact};
  if(shot.firingPose)message.shot.shooter={...shot.firingPose};
  for(const p of this.players())if(this.members.has(p.id))this.cancelReload(p,now);
  this.preview={message,owner,targets,shot,impact};this.phase='preview';this.shots=[];
  for(const p of this.players())if(this.members.has(p.id))p.speed=p.vx=p.vy=p.vz=p.verticalSpeed=0;
  this.send(message);this.publish();return true;
 }
 skipPreview(now){const message=this.preview?.message;if(!message||now-message.startAt>=REPLAY_FINAL_AT)return;message.startAt=now-REPLAY_FINAL_AT;this.send({type:'gun-preview-seek',id:message.id,startAt:message.startAt});}
 finishPreview(now){
  const pending=this.preview;if(!pending)return;
  this.preview=null;this.phase='active';
  this.send({type:'gun-preview-end',id:pending.message.id});
  this.applyImpact(pending.owner,pending.targets,pending.shot,{...pending.impact,previewId:pending.message.id},now);
 }
 blocked(a,b,layouts,radius=.025){let first=projectileWallFraction(a,b,layouts,radius);const candidates=new Set(),steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/6));for(let i=0;i<=steps;i++){const point=interpolate(a,b,i/steps);for(const box of this.buckets.get(Math.floor(point.x/12)+','+Math.floor(point.z/12))||[])candidates.add(box);}for(const box of candidates){
   if(this.traces.has(box.gunPropId))continue;
   const extent=solidExtents(box);if(Math.max(a.x,b.x)+radius<box.x-extent.x||Math.min(a.x,b.x)-radius>box.x+extent.x||Math.max(a.z,b.z)+radius<box.z-extent.z||Math.min(a.z,b.z)-radius>box.z+extent.z)continue;
   const f=segmentGunSolid(a,b,box,radius);if(f!==null&&(first===null||f<first))first=f;
  }return first;}
 fire(p,message,now){
  const weapon=weaponById(p.equippedWeapon),c=this.record(p),m=this.members.get(p.id);
  if(!weapon||weapon.melee||!c.ownedWeapons.includes(weapon.id)||p.ragdoll||p.seated||this.rules.duel?.ids.includes(p.id))return;
  if(inGunZone(p)&&(this.phase!=='active'||!m||m.out))return;
  if(this.shots.length+weapon.pellets>96)return;
  this.cancelReload(p,now);
  let ammo=this.ammo.get(p.id+':'+weapon.id);if(!ammo||ammo.weapon!==weapon.id)ammo={weapon:weapon.id,left:weapon.magazine,reloadAt:0,lastAt:0};
  if(ammo.reloadAt||ammo.left<=0||now-ammo.lastAt<weapon.interval)return;
  const aim=message.aim;if(!aim||![aim.x,aim.y,aim.z].every(Number.isFinite))return;const length=Math.hypot(aim.x,aim.y,aim.z);if(length<.9||length>1.1)return;
  ammo.lastAt=now;ammo.left--;this.ammo.set(p.id+':'+weapon.id,ammo);this.economy(p);
  const expected=fallbackMuzzle(p,weapon.id,aim),requested=message.muzzle;
  let origin=requested&&[requested.x,requested.y,requested.z].every(Number.isFinite)&&Math.hypot(requested.x-p.x,requested.z-p.z)<2.3&&requested.y>p.y+(p.prone?.06:.2)&&requested.y<p.y+2.8?{x:requested.x,y:requested.y,z:requested.z}:expected;
  const shoulder={x:p.x-Math.cos(p.yaw)*.3,y:p.y+(p.skin===7?1:1.4)-(p.prone?1.05:p.crouched?.52:0),z:p.z+Math.sin(p.yaw)*.3},fraction=this.blocked(shoulder,origin,(this.rules.settings.combatOnly?{}:this.rules.houses.snapshots()),.02);if(fraction!==null)origin=interpolate(shoulder,origin,fraction);
  for(let i=0;i<weapon.pellets;i++){
   const dx=aim.x/length+(Math.random()-.5)*weapon.spread*2,dy=aim.y/length+(Math.random()-.5)*weapon.spread*2,dz=aim.z/length+(Math.random()-.5)*weapon.spread*2,n=Math.hypot(dx,dy,dz);
   const shot={id:'gun-'+(++this.sequence),owner:p.id,weapon:weapon.id,serial:message.serial,position:{...origin},origin:{...origin},vx:dx/n*weapon.speed,vy:dy/n*weapon.speed,vz:dz/n*weapon.speed,born:now,lastAt:now,life:weapon.range/weapon.speed,round:inGunZone(p)?this.round:null};
   // Keep the firing pose only in server memory until a final-hit replay needs it.
   // Normal projectile broadcasts and late-join shot lists stay compact.
   Object.defineProperty(shot,'viewLags',{value:weapon.radius?new Map():this.hitTimeline.lags(message,now)});
   Object.defineProperty(shot,'firingPose',{value:{x:p.x,y:p.y,z:p.z,yaw:p.yaw||0,headYaw:p.headYaw||0,headPitch:p.headPitch||0,prone:!!p.prone,crouched:!!p.crouched,skin:p.skin,equippedWeapon:weapon.id}});
   this.shots.push(shot);this.send({type:'gun-shot',shot});
  }this.ensureTimer();
 }
 advanceReload(p,now){
  const ammo=this.ammo.get(p.id+':'+p.equippedWeapon),weapon=weaponById(p.equippedWeapon);if(!ammo?.reloadAt||!weapon)return ammo;
  const filled=Math.min(weapon.magazine,ammo.reloadBase+Math.floor(Math.max(0,now-ammo.reloadStart)/ammo.reloadStep)),changed=filled!==ammo.left;
  ammo.left=filled;
  if(now>=ammo.reloadAt){ammo.left=weapon.magazine;ammo.reloadAt=ammo.reloadStart=0;}
  if(changed||!ammo.reloadAt)this.economy(p);return ammo;
 }
 cancelReload(p,now){
  const ammo=this.advanceReload(p,now);if(!ammo?.reloadAt)return;
  ammo.reloadAt=ammo.reloadStart=0;this.send({type:'gun-reload-cancel',playerId:p.id,ammo:{...ammo}});this.economy(p);
 }
 reload(p,now){
  const weapon=weaponById(p.equippedWeapon),ammo=this.ammo.get(p.id+':'+p.equippedWeapon);if(!weapon||weapon.melee||!ammo||ammo.left>=weapon.magazine||p.ragdoll||this.members.get(p.id)?.out||this.preview)return;
  if(ammo.reloadAt){this.cancelReload(p,now);return;}
  ammo.reloadBase=ammo.left;ammo.reloadStep=3250/weapon.magazine;ammo.reloadStart=now;ammo.reloadAt=now+ammo.reloadStep*(weapon.magazine-ammo.left);
  this.send({type:'gun-reload',playerId:p.id,weapon:weapon.id,startAt:now,endAt:ammo.reloadAt});this.economy(p);this.ensureTimer();
 }
 checkReload(p,now){if(p.ragdoll||this.members.get(p.id)?.out)this.cancelReload(p,now);else this.advanceReload(p,now);}
 ensureTimer(){if(this.timer)return;this.lastTick=Date.now();const flight=new Promise(resolve=>this.finish=resolve);this.rules.onAsyncWork(flight);this.timer=setInterval(()=>this.tick(Date.now()),20);}
 tick(now){const dt=Math.min(.2,(now-this.lastTick)/1000);this.lastTick=now;const players=this.players(),layouts=(this.rules.settings.combatOnly?{}:this.rules.houses.snapshots()),remaining=[];
  if(this.preview){if(now>=this.preview.message.startAt+this.preview.message.duration)this.finishPreview(now);return;}
  for(const p of players)this.checkReload(p,now);
  if(this.phase==='waiting'&&this.startAt&&now>=this.startAt)this.begin(now);
  if(this.phase==='finished'&&now>=this.nextRoundAt){this.phase='waiting';this.resetMap();this.assign();this.startAt=this.members.size>=2?now+3000:0;this.publish();}
  for(const shot of this.shots){const owner=players.find(p=>p.id===shot.owner);if(!owner||shot.round!==null&&(this.phase!=='active'||shot.round!==this.round))continue;
   const stepStart=shot.lastAt??shot.born,stepEnd=Math.min(now,shot.born+shot.life*1000),shotDt=Math.max(0,(stepEnd-stepStart)/1000);shot.lastAt=stepEnd;const a=shot.position,b={x:a.x+shot.vx*shotDt,y:a.y+shot.vy*shotDt,z:a.z+shot.vz*shotDt},weapon=weaponById(shot.weapon),radius=gunProjectileRadius(shot.weapon);let first=this.blocked(a,b,layouts,radius),victim=null;
   for(const q of players){if(q.id===owner.id)continue;const own=this.members.get(owner.id),target=this.members.get(q.id);if(shot.round!==null&&(!target||target.out||target.team===own?.team))continue;if(shot.round===null&&inGunZone(q))continue;
    const lag=shot.viewLags?.get(q.id)||0;const fraction=movingGunHit(a,b,q,stepStart-lag,stepEnd-lag,this.hitTimeline,radius);if(fraction!==null&&(first===null||fraction<first)){first=fraction;victim=q;}}
   if(first!==null){
    const point=interpolate(a,b,first),impact={type:'gun-impact',id:shot.id,position:point,explosion:!!weapon.radius,radius:weapon.radius||0,velocity:{x:shot.vx,y:shot.vy,z:shot.vz},wall:!victim};
    const victims=weapon.radius?players.filter(q=>q.id!==owner.id&&this.inBlast(q,point,weapon.radius)):victim?[victim]:[];
    if(this.reserveFinalHit(owner,victims,shot,impact,now)){remaining.length=0;break;}
    if(!victim)this.breakAt(point,shot,now);this.applyImpact(owner,victims,shot,impact,now);continue;
   }
   if(now-shot.born<shot.life*1000){shot.position=b;remaining.push(shot);}
  }this.shots=remaining;
  if(!this.members.size&&!this.shots.length&&![...this.ammo.values()].some(a=>a.reloadAt)){clearInterval(this.timer);this.timer=null;this.finish?.();this.finish=null;}
 }
 resetMap(){
  this.rules.footprints?.clearArena();this.traces.clear();this.marks=[];this.shots=[];this.charges.clear();this.slashes.clear();this.mapRevision++;
  this.send({type:'gun-map',reset:true,mapRevision:this.mapRevision,traces:[]});this.persistMap();
 }
 persistMap(){
  const rules=this.rules;if(!rules.saveSettings)return;
  rules.settingsQueue=(rules.settingsQueue||Promise.resolve()).then(async()=>{const settings={...rules.settings,gunLife:this.maxLife,gunTraces:[]};await rules.saveSettings(settings);rules.settings=settings;}).catch(()=>this.send({type:'gun-map-error',message:'マップの痕跡を保存できませんでした'}));rules.onAsyncWork(rules.settingsQueue);
 }
 changeProp(id,mode,normal=[.65,.75,0],now=Date.now()){
  if(this.phase!=='active'||!GUN_PROP_DEFS.has(id)||this.traces.has(id)&&!(this.traces.get(id).mode==='open'&&mode==='cut'))return false;
  const trace={id,mode,normal,at:now};this.traces.set(id,trace);this.send({type:'gun-map',mapRevision:this.mapRevision,traces:[trace]});return true;
 }
 ram(p){
  if(this.phase!=='active'||this.members.get(p.id)?.out||p.ragdoll)return;
  for(const def of GUN_PROP_DEFS.values()){
   if(this.traces.has(def.id)||def.kind==='crate'||p.y+1.5<def.y-def.h/2||p.y>def.y+def.h/2)continue;
   const dx=Math.abs(p.x-def.x),dz=Math.abs(p.z-def.z);
   if(dx>def.w/2+.58||dz>def.d/2+.58)continue;
   if(def.kind==='door'&&p.speed>1.5||def.kind==='bars'&&!p.grounded&&Math.abs(p.verticalSpeed||0)>1)this.changeProp(def.id,def.kind==='door'?'open':'broken',[Math.sin(p.yaw||0),0,Math.cos(p.yaw||0)]);
  }
 }
 breakAt(point,shot,now){
  for(const def of GUN_PROP_DEFS.values())if(!this.traces.has(def.id)&&Math.abs(point.x-def.x)<=def.w/2+.12&&Math.abs(point.y-def.y)<=def.h/2+.12&&Math.abs(point.z-def.z)<=def.d/2+.12){
   if(def.kind!=='crate')this.changeProp(def.id,def.kind==='door'?'open':'broken',[shot.vx,shot.vy,shot.vz].map(n=>n/(Math.hypot(shot.vx,shot.vy,shot.vz)||1)),now);return;
  }
 }
 slash(p,message,now){
  const started=this.charges.get(p.id);this.charges.delete(p.id);
  const member=this.members.get(p.id);if(p.equippedWeapon!=='katana'||!this.record(p).ownedWeapons.includes('katana')||p.ragdoll||p.seated||this.rules.duel?.ids.includes(p.id)||now-(this.slashes.get(p.id)||-Infinity)<560||inGunZone(p)&&(this.phase!=='active'||!member||member.out))return;
  const aim=message.aim;if(!aim||![aim.x,aim.y,aim.z].every(Number.isFinite))return;const length=Math.hypot(aim.x,aim.y,aim.z);if(length<.9||length>1.1)return;
  this.slashes.set(p.id,now);const charge=started===undefined?0:Math.min(1,Math.max(0,now-started-120)/1600),shot={weapon:'katana',charge},origin={x:p.x,y:p.y+(p.prone?.32:p.crouched?1.15:1.4),z:p.z},layouts=(this.rules.settings.combatOnly?{}:this.rules.houses.snapshots());
  const normal=[Math.cos(p.yaw||0)*.65,.75,-Math.sin(p.yaw||0)*.65];this.send({type:'gun-slash',playerId:p.id,charge,at:now,position:origin,yaw:p.yaw});
  // Ordered contacts: a wall stops the sweep, but cuttable props can split.
  const contacts=[];for(const def of GUN_PROP_DEFS.values()){
   if(this.traces.has(def.id))continue;const end={x:origin.x+aim.x*2.8,y:origin.y+aim.y*2.8,z:origin.z+aim.z*2.8},fraction=segmentBox(origin,end,def,.22);if(fraction!==null)contacts.push({def,fraction,end});
  }
  for(const {def,fraction,end}of contacts.sort((a,b)=>a.fraction-b.fraction)){const obstruction=this.blocked(origin,end,layouts,.02);if(obstruction!==null&&obstruction<fraction-.10)break;this.changeProp(def.id,'cut',normal,now);}
  for(const q of this.players()){
   if(q.id===p.id||!inGunZone(p)&&inGunZone(q))continue;const box=gunHitBox(q),dx=box.x-origin.x,dy=box.y-origin.y,dz=box.z-origin.z,d=Math.hypot(dx,dy,dz);if(d>2.8||d<.01||(dx*aim.x+dy*aim.y+dz*aim.z)/d<.55)continue;
   if(this.blocked(origin,{x:box.x,y:box.y,z:box.z},layouts,.025)!==null)continue;this.damage(p,q,shot,now,{deferResolve:true});
  }this.publish();this.resolve();
 }
 receive(entry,message,now){const p=entry.player,c=this.record(p);if(message.type==='gun-preview-skip'){if(this.preview&&this.members.has(p.id)&&message.id===this.preview.message.id)this.skipPreview(now);return true;}if(this.preview&&this.members.has(p.id))return true;
  if(message.type==='gun-enter'){this.enter(p);return true;}
  if(message.type==='gun-exit'){if(this.members.has(p.id)&&this.atBoard(p)){this.remove(p.id);this.move(p,{...GUN_ENTRY,z:GUN_ENTRY.z+3});}return true;}
  if(message.type==='gun-buy'){const weapon=weaponById(message.weapon),index=WEAPONS.indexOf(weapon);if(!weapon||this.phase==='active'&&this.members.has(p.id))return true;
   const previous=weapon.melee?null:WEAPONS[index-1];if(c.ownedWeapons.includes(weapon.id)||c.coins<weapon.price||previous&&(!c.ownedWeapons.includes(previous.id)||(c.weaponWins[previous.id]||0)<weapon.require)){this.send({type:'gun-error',playerId:p.id,message:'コインまたは前の武器での勝利数が足りません'});return true;}
   this.cancelReload(p,now);this.rules.onAsyncWork(this.rules.characters.change(p.skin,{coins:c.coins-weapon.price,ownedWeapons:[...c.ownedWeapons,weapon.id],equippedWeapon:weapon.id}));p.equippedWeapon=weapon.id;this.economy(p);return true;
  }
  if(message.type==='gun-equip'){if(this.phase==='active'&&this.members.has(p.id))return true;const id=message.weapon;if(id!==null&&!c.ownedWeapons.includes(id))return true;this.cancelReload(p,now);p.equippedWeapon=id;if(!id)this.remove(p.id);this.rules.onAsyncWork(this.rules.characters.change(p.skin,{equippedWeapon:id}));this.economy(p);return true;}
  if(message.type==='gun-reload'){this.reload(p,now);return true;}
  if(message.type==='gun-charge'){if(p.equippedWeapon==='katana'&&!p.ragdoll&&(!inGunZone(p)||this.phase==='active'&&!this.members.get(p.id)?.out)&&!this.charges.has(p.id)){this.charges.set(p.id,now);this.send({type:'gun-charge',playerId:p.id,at:now});}return true;}
  if(message.type==='gun-charge-cancel'){this.charges.delete(p.id);this.send({type:'gun-charge-cancel',playerId:p.id});return true;}
  if(message.type==='gun-slash'){this.slash(p,message,now);return true;}
  if(message.type==='gun-life'){if(['active','preview'].includes(this.phase)||!(this.atBoard(p)||Math.hypot(p.x-GUN_ENTRY.x,p.z-GUN_ENTRY.z)<6))return true;const life=Number(message.life);if(!Number.isInteger(life)||life<3||life>100)return true;this.maxLife=life;this.persistMap();this.publish();return true;}
  if(message.type==='gun-fire'){this.fire(p,message,now);return true;}
  if(message.type==='gun-team'||message.type==='gun-mode'){
   if(this.phase==='active'||!(this.atBoard(p)||!inGunZone(p)&&Math.hypot(p.x-GUN_ENTRY.x,p.z-GUN_ENTRY.z)<6))return true;
   if(message.type==='gun-mode'&&['auto','teams','solo'].includes(message.mode)){this.mode=message.mode;for(const m of this.members.values())m.manual=false;this.assign();}
   if(message.type==='gun-team'){const m=this.members.get(message.member),team=Number(message.team);if(m&&Number.isInteger(team)&&team>=0&&team<Math.max(2,Math.min(9,this.members.size))){m.team=team;m.manual=true;const q=this.players().find(q=>q.id===m.id);if(q)this.teleport(q,team);}}
   this.startAt=this.members.size>=2?now+3000:0;this.publish();return true;
  }return false;
 }
}
