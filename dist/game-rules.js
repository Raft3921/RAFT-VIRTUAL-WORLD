import { ARENA,insideArena } from './world-layout.js';
import { ATTACKS } from './combat-motion.js';
import { CharacterStore,cleanCharacter } from './character-store.js';
import { GYOZA_SKIN,GUEST_SKIN,playableSkin } from './player-types.js';
import { HousingStore } from './housing-store.js';
import {BROWN_PROJECTILE,projectileAt,segmentBox,projectileWallFraction} from './projectile-motion.js';
import {hitShape} from './hit-reaction.js';
import {HOUSES,houseDescriptor,mirrorRealm,ROOM,furniturePose,FURNITURE_BY_ID} from './housing-data.js';
import {DOWN_PROTECTION_SECONDS,knocksDown,protectedFromHit} from './combat-policy.js';
import {cleanCycle,dayPhase,PIANO_MELODY} from './world-clock.js';
import {furnitureAction} from './furniture-actions.js';
export const SYNC_VERSION='2026-10-09-vrs-mirrors-23';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function cleanState(s,skin,realms){
  if(![s?.x,s?.y,s?.z,s?.yaw].every(Number.isFinite)||s.y<0||s.y>512)return null;
  const realm=mirrorRealm(s.mirrorRealm,realms);if(s.mirrorRealm&&!realm)return null;
  if(realm?Math.abs(s.x-realm.x)>65||Math.abs(s.z-(realm.z-62.5))>42:Math.abs(s.x)>1300||Math.abs(s.z)>1300)return null;
  const n=(key,a,b)=>Number.isFinite(s[key])?clamp(s[key],a,b):0;
  return {mirrorRealm:realm?.key||null,x:s.x,y:s.y,z:s.z,yaw:s.yaw,skin:playableSkin(skin),
    headYaw:n('headYaw',-1,1),headPitch:n('headPitch',-.7,.7),vx:n('vx',-200,200),vy:n('vy',-200,200),vz:n('vz',-200,200),
    speed:n('speed',0,20),verticalSpeed:n('verticalSpeed',-200,200),grounded:s.grounded!==false,flight:s.flight===true,
    ragdoll:s.ragdoll===true,seated:s.seated===true,sleeping:s.sleeping===true&&s.ragdoll!==true,crownEnabled:s.crownEnabled===true,
    attackKind:Math.floor(n('attackKind',0,12)),attackProgress:n('attackProgress',0,1),attackDuration:n('attackDuration',0,2),attackStrength:n('attackStrength',0,1),attackSerial:Math.floor(n('attackSerial',0,1e9)),
    attackRushing:s.attackRushing===true,punchCharge:n('punchCharge',0,1),
    hitPhase:['impact','air','down','recover'].includes(s.hitPhase)?s.hitPhase:'none',hitTime:n('hitTime',0,60),hitDownTime:n('hitDownTime',0,10),hitRecovery:n('hitRecovery',0,1),hitStrength:n('hitStrength',0,1),
    hitSerial:Math.floor(n('hitSerial',0,1e9)),
    gesture:['none','wave','cheer','pose'].includes(s.gesture)?s.gesture:'none'};
}
// A pre-impact state packet must not replace a newly broadcast hit with an
// upright pose. The server owns the serial; the victim echoes it on updates.
export function applyPlayerState(player,state){
  const serial=player.hitSerial||0;
  if(state.hitSerial<serial){for(const key of ['ragdoll','sleeping','seated','hitPhase','hitTime','hitDownTime','hitRecovery','hitStrength','grounded','yaw','vx','vy','vz'])if(player[key]!==undefined)state[key]=player[key];}
  if(Date.now()<(player.impactUntil||0)){
    for(const key of ['x','y','z','yaw','grounded','attackProgress'])state[key]=player[key];
    state.vx=state.vy=state.vz=state.speed=state.verticalSpeed=0;
    if(player.hitPhase==='impact'){state.ragdoll=true;state.hitPhase='impact';}
  }
  state.hitSerial=serial;state.crownEnabled=player.crownEnabled;Object.assign(player,state);
}
export class GameRules{
  constructor(players,broadcast,scores={},save=()=>{},settings={},saveSettings=()=>{},characters={},saveCharacters=()=>{},houses={},saveHouses=()=>{},onAsyncWork=()=>{}){
    this.players=players;this.broadcast=broadcast;this.scores=scores;this.save=save;this.ready=new Map();this.duel=null;this.cooldowns=new Map();this.backdrop='GB';
    settings=settings&&typeof settings==='object'?settings:{};
    const goal=Number(settings.goalDamage);this.settings={...settings,goalDamage:Number.isInteger(goal)&&goal>=1&&goal<=100?goal:11};this.saveSettings=saveSettings;this.settingsQueue=Promise.resolve();
    this.characters=new CharacterStore(characters,scores,saveCharacters,(skin,record)=>this.broadcastCharacter(skin,record),()=>this.broadcast({type:'character-save-error',message:'キャラクターの状態をサーバーに保存できませんでした。'}));
    this.houses=new HousingStore(houses,saveHouses,broadcast);
    this.projectiles=[];this.projectileTimer=null;this.projectileSequence=0;this.onAsyncWork=onAsyncWork;this.projectileFlight=null;this.finishFlight=null;
    this.settings.cycle=cleanCycle(settings.cycle);this.pianoSteps=new Map();this.records=new Map();this.furnitureStates=new Map();this.furnitureSequence=0;
  }
  entries(){return [...this.players.values()];}
  character(skin,profile,enabled=false){return skin===GUEST_SKIN?cleanCharacter():this.characters.get(skin,profile,enabled);}
  broadcastCharacter(skin,record=this.characters.get(skin)){
    for(const entry of this.entries())if(entry.player.skin===skin)Object.assign(entry.player,record);
    this.broadcast({type:'character-state',skin,character:record});
  }
  selectCharacter(entry,value){
    const skin=playableSkin(value,null),p=entry.player;if(skin===null)return false;
    if(p.guest&&skin!==GUEST_SKIN){this.broadcast({type:'character-select-rejected',id:p.id,skin:p.skin,reason:'ゲストは入室中にメンバーへ変更できません'});return false;}
    if(p.skin!==skin&&(this.duel?.ids.includes(p.id)||p.ragdoll)){this.broadcast({type:'character-select-rejected',id:p.id,skin:p.skin});return false;}
    p.skin=skin;p.guest=skin===GUEST_SKIN;Object.assign(p,this.character(skin,p.profile));if(!p.guest)this.broadcastCharacter(skin);this.broadcast({type:'state',player:p});return true;
  }
  inside(p){return insideArena(p);}
  snapshot(){this.pruneRecords();return {type:'world',version:SYNC_VERSION,backdrop:this.backdrop,goalDamage:this.settings.goalDamage,duel:this.duel,cycle:this.settings.cycle,serverNow:Date.now(),records:[...this.records.values()],furnitureStates:[...this.furnitureStates.values()]};}
  flashlightPreference(profile){return this.settings.flashlights?.[profile]!==false;}
  setFlashlight(p,enabled){
    if(p.guest){p.flashlightEnabled=enabled;this.broadcast({type:'flashlight-state',id:p.id,enabled});return;}
    this.settingsQueue=this.settingsQueue.then(async()=>{try{const settings={...this.settings,flashlights:{...this.settings.flashlights,[p.profile]:enabled}};await this.saveSettings(settings);this.settings=settings;for(const entry of this.entries())if(entry.player.profile===p.profile){entry.player.flashlightEnabled=enabled;this.broadcast({type:'flashlight-state',id:entry.player.id,enabled});}}catch{this.broadcast({type:'flashlight-error',id:p.id,message:'懐中電灯の設定を保存できませんでした'});}});return this.settingsQueue;
  }
  setCycle(value){
    const duration=Number(value.duration);if(typeof value.enabled!=='boolean'||!Number.isInteger(duration)||duration<60||duration>7200)return;
    this.settingsQueue=this.settingsQueue.then(async()=>{try{const now=Date.now(),phase=dayPhase(this.settings.cycle,now),cycle={enabled:value.enabled,duration,epoch:now,phase},settings={...this.settings,cycle};await this.saveSettings(settings);this.settings=settings;this.broadcast(this.snapshot());this.broadcast({type:'cycle-saved'});}catch{this.broadcast({type:'cycle-error',message:'昼夜設定をサーバーに保存できませんでした'});}});return this.settingsQueue;
  }
  pruneRecords(){const homes=this.houses.snapshots(),itemAt=(index,id)=>homes[index]?.items.find(i=>i.id===id);for(const [key,record]of this.records)if(!homes[record.index]?.items.some(i=>i.id===record.itemId&&FURNITURE_BY_ID.get(i.t)?.family==='record')){this.records.delete(key);this.broadcast({...record,type:'record-state',playing:false});}for(const [key,state]of this.furnitureStates){const item=itemAt(state.index,state.itemId);if(!item||furnitureAction(FURNITURE_BY_ID.get(item.t)).kind!==state.kind)this.furnitureStates.delete(key);}for(const key of this.pianoSteps.keys()){const divider=key.indexOf(':'),index=key.slice(0,divider),id=key.slice(divider+1);if(!itemAt(index,id))this.pianoSteps.delete(key);}}
  updateSettings(value){
    const goalDamage=Number(value);if(!Number.isInteger(goalDamage)||goalDamage<1||goalDamage>100)return;
    this.settingsQueue=this.settingsQueue.then(async()=>{
      try{const settings={...this.settings,goalDamage};await this.saveSettings(settings);this.settings=settings;this.broadcast(this.snapshot());this.broadcast({type:'settings-saved',goalDamage});}
      catch{this.broadcast({type:'settings-error',message:'設定をサーバーに保存できませんでした。'});}
    });
    return this.settingsQueue;
  }
  cancel(){if(this.duel){this.duel=null;this.ready.clear();this.broadcast({type:'duel-cancel',reason:'プレイヤーが闘技場から離れたため終了しました'});}}
  removed(id){this.ready.delete(id);this.cooldowns.delete(id);if(this.duel?.ids.includes(id))this.cancel();for(const p of this.projectiles.filter(p=>p.owner===id))this.endProjectile(p,'left',p.previous);this.projectiles=this.projectiles.filter(p=>p.owner!==id);this.stopProjectileTimer();}
  state(entry){
    const p=entry.player;
    // One server-owned window per knockdown, never reset by repeat packets.
    // The full flight is also protected so attacks cannot restart a juggle.
    if(p.awaitingDown&&p.ragdoll&&['down','recover'].includes(p.hitPhase)){p.awaitingDown=false;p.protectedUntil=Date.now()+DOWN_PROTECTION_SECONDS*1000;}
    if(!this.duel?.ids.includes(p.id))return;
    p.flight=false;p.seated=false;p.sleeping=false;
    const dx=p.x-ARENA.x,dy=Math.max(0,p.y+.95-.24),dz=p.z-ARENA.z,r=ARENA.radius-.65,d=Math.hypot(dx,dy,dz);
    if(d>r){p.x=ARENA.x+dx/d*r;p.y=Math.max(.24,.24+dy/d*r-.95);p.z=ARENA.z+dz/d*r;const dot=p.vx*dx/d+p.vy*dy/d+p.vz*dz/d;if(dot>0){p.vx-=dot*dx/d;p.vy-=dot*dy/d;p.vz-=dot*dz/d;}}
  }
  prepare(p,now){
    const entrants=this.entries().map(e=>e.player).filter(p=>this.inside(p)&&!protectedFromHit(p,now));if(this.duel||protectedFromHit(p,now)||!this.inside(p)||entrants.length!==2)return false;
    this.ready.set(p.id,now);const other=entrants.find(q=>q.id!==p.id);
    if(now-(this.ready.get(other.id)||0)<=1000){this.duel={ids:[p.id,other.id],damage:{[p.id]:0,[other.id]:0},goalDamage:this.settings.goalDamage,startedAt:now};this.ready.clear();this.broadcast({type:'duel-start',...this.duel});}
    else this.broadcast({type:'duel-ready',id:p.id});return true;
  }
  endProjectile(projectile,reason,position){this.broadcast({type:'projectile-impact',id:projectile.id,owner:projectile.owner,reason,position});}
  stopProjectileTimer(){if(this.projectiles.length||!this.projectileTimer)return;clearInterval(this.projectileTimer);this.projectileTimer=null;this.finishFlight?.();this.finishFlight=null;this.projectileFlight=null;}
  throwBrown(entry,message,now){
    const p=entry.player,serial=Number(message.serial??p.attackSerial);
    if(p.ragdoll||!Number.isInteger(serial)||serial<0||serial<=(entry.lastBrownSerial??-1)||this.projectiles.length>=32)return;
    entry.lastBrownSerial=serial;const vx=Math.sin(p.yaw)*BROWN_PROJECTILE.speed,vz=Math.cos(p.yaw)*BROWN_PROJECTILE.speed;
    const projectile={id:'brown-'+(++this.projectileSequence)+'-'+now,owner:p.id,serial,x:p.x+vx/BROWN_PROJECTILE.speed*.65,y:p.y+.9,z:p.z+vz/BROWN_PROJECTILE.speed*.65,vx,vy:BROWN_PROJECTILE.up,vz,born:now,match:this.duel?.ids.includes(p.id)?this.duel.startedAt:null};
    projectile.previous={x:projectile.x,y:projectile.y,z:projectile.z};this.projectiles.push(projectile);
    this.broadcast({type:'projectile-spawn',projectile:{id:projectile.id,owner:p.id,serial,x:projectile.x,y:projectile.y,z:projectile.z,vx,vy:projectile.vy,vz,born:now}});
    if(!this.projectileTimer){this.projectileFlight=new Promise(resolve=>{this.finishFlight=resolve;});this.projectileTimer=setInterval(()=>this.stepProjectiles(Date.now()),33);}
    return this.projectileFlight;
  }
  stepProjectiles(now){
    const remaining=[],players=this.entries().map(e=>e.player),layouts=this.houses.snapshots();
    for(const projectile of this.projectiles){
      const p=players.find(p=>p.id===projectile.owner),point=projectileAt(projectile,now);
      const currentMatch=p&&this.duel?.ids.includes(p.id)?this.duel.startedAt:null;
      if(!p||projectile.match!==currentMatch){this.endProjectile(projectile,'cancel',point);continue;}
      let first=projectileWallFraction(projectile.previous,point,layouts),reason=first===null?null:'wall',victim=null;
      if(projectile.match!==null&&Math.hypot(point.x-ARENA.x,point.y-.24,point.z-ARENA.z)>ARENA.radius-.35){first=0;reason='wall';}
      for(const q of players){
        if(protectedFromHit(q,now))continue;
        if(q.id===p.id||this.duel?.ids.includes(q.id)&&!this.duel.ids.includes(p.id)||projectile.match!==null&&!this.duel?.ids.includes(q.id))continue;
        const shape=q.ragdoll?hitShape({phase:q.hitPhase,recovery:q.hitRecovery},q.yaw):null,height=Math.min(shape?.height||1.9,q.skin===GYOZA_SKIN?1.42:1.9),offset=shape?.offset||0;
        const fraction=segmentBox(projectile.previous,point,{x:q.x-Math.sin(q.yaw)*offset,y:q.y+height/2,z:q.z-Math.cos(q.yaw)*offset,w:q.skin===GYOZA_SKIN?1.18:shape?shape.width*2:.64,h:height,d:shape?shape.depth*2:.64,yaw:q.yaw},BROWN_PROJECTILE.radius);
        if(fraction!==null&&(first===null||fraction<first)){first=fraction;victim=q;reason='hit';}
      }
      if(first!==null){const position={x:projectile.previous.x+(point.x-projectile.previous.x)*first,y:projectile.previous.y+(point.y-projectile.previous.y)*first,z:projectile.previous.z+(point.z-projectile.previous.z)*first};this.endProjectile(projectile,reason,position);if(victim){const pending=this.hit(p,victim,BROWN_PROJECTILE.damage,now,{projectile});if(pending?.then)this.onAsyncWork(pending);}continue;}
      if(now-projectile.born>=BROWN_PROJECTILE.life*1000){this.endProjectile(projectile,'expired',point);continue;}
      projectile.previous=point;remaining.push(projectile);
    }
    this.projectiles=remaining;this.stopProjectileTimer();
  }
  hit(p,q,level,now,{projectile=null,held=0,kind=p.attackKind||0}={}){
    if(protectedFromHit(q,now))return;
    const knockdown=knocksDown(kind,held,!!projectile);
    const dx=projectile?.vx??q.x-p.x,dz=projectile?.vz??q.z-p.z,d=Math.hypot(dx,dz)||1,range=held<1?8:level*100;
    const fighting=this.duel?.ids.includes(p.id)&&this.duel.ids.includes(q.id);
    const speed=projectile?13:Math.min(fighting?18+level*2.2:84,Math.sqrt(range*18/Math.sin(48*Math.PI/180)));
    const strength=Math.min(1,speed/65),velocity=knockdown?{x:dx/d*speed*Math.cos(24*Math.PI/180),y:Math.min(30,speed*Math.sin(24*Math.PI/180)),z:dz/d*speed*Math.cos(24*Math.PI/180)}:{x:0,y:0,z:0},freeze=knockdown ? .12+(level-1)*.018 : 0;
    if(knockdown){
      p.impactUntil=q.impactUntil=now+freeze*1000;if(!projectile)p.attackProgress=ATTACKS[kind].impact;p.vx=p.vy=p.vz=p.speed=0;
      q.hitSerial=(q.hitSerial||0)+1;q.ragdoll=true;q.awaitingDown=true;q.protectedUntil=0;q.seated=false;q.sleeping=false;q.hitPhase='impact';q.hitTime=0;q.hitDownTime=0;q.hitRecovery=0;q.hitStrength=strength;q.yaw=Math.atan2(-velocity.x,-velocity.z);q.vx=q.vy=q.vz=0;
    }else{
      // No hit-stop, movement lock, impulse or cancelled attack for light taps.
      q.flinchSerial=(q.flinchSerial||0)+1;q.flinchAt=now;q.flinchStrength=strength;
    }
    this.broadcast({type:'punch',knockdown,target:q.id,attacker:p.id,velocity,freeze,hitSerial:q.hitSerial,flinchSerial:q.flinchSerial,strength,targetPosition:{x:q.x,y:q.y,z:q.z},attackerPosition:{x:p.x,y:p.y,z:p.z},damage:fighting?level:0,projectile:!!projectile});
    if(!fighting)return;this.duel.damage[q.id]+=level;this.broadcast({type:'duel-damage',...this.duel});if(this.duel.damage[q.id]<this.duel.goalDamage)return;
    const saved=this.characters.result(p.skin,q.skin);this.broadcast({type:'duel-result',winner:p.id,loser:q.id,practice:p.skin===q.skin,guestMatch:p.guest||q.guest,scores:{[p.id]:p.score,[q.id]:q.score},appearances:{[p.id]:p.appearanceLevel,[q.id]:q.appearanceLevel}});this.duel=null;this.ready.clear();return saved;
  }
  receive(entry,m,now=Date.now()){
    const p=entry.player;
    if(m.type==='piano-play'||m.type==='record-toggle'||m.type==='furniture-hit'){
      if(p.ragdoll||this.duel?.ids.includes(p.id))return;
      const h=houseDescriptor(m.index,this.houses.realms),item=this.houses.snapshots()[m.index]?.items.find(i=>i.id===m.itemId);if(!h||!item)return;
      const definition=FURNITURE_BY_ID.get(item.t),action=furnitureAction(definition),family=action.kind;if(m.type==='piano-play'&&family!=='piano'||m.type==='record-toggle'&&family!=='record'||m.type==='furniture-hit'&&(family==='piano'||family==='record'))return;
      if(now-(entry.lastInstrumentAt??-Infinity)<(['piano','instrument'].includes(family)?55:180))return;
      const pose=furniturePose(item),x=h.x+pose.x*h.front,z=h.z+pose.z*h.front,dx=x-p.x,dz=z-p.z;
      if(Math.hypot(dx,dz)>3.8+Math.min(1,Math.max(definition.w,definition.d)*.25)||Math.abs(p.y+1.05-(ROOM.floor+pose.centerY))>2.7||dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw)<-.2)return;
      entry.lastInstrumentAt=now;const key=h.index+':'+item.id;
      if(family==='record'){const playing=!this.records.has(key),record={type:'record-state',index:h.index,itemId:item.id,playing,startedAt:now};if(playing)this.records.set(key,record);else this.records.delete(key);this.broadcast(record);return;}
      if(family==='piano'||family==='instrument'){const step=this.pianoSteps.get(key)||0,note=PIANO_MELODY[step%PIANO_MELODY.length];this.pianoSteps.set(key,(step+1)%PIANO_MELODY.length);this.broadcast({type:family==='piano'?'piano-play':'instrument-play',index:h.index,itemId:item.id,note,instrument:action.instrument,serial:++this.furnitureSequence,playerId:p.id});return;}
      const previous=this.furnitureStates.get(key),enabled=action.toggle?!(previous?.enabled??action.defaultEnabled):true,event={type:'furniture-event',index:h.index,itemId:item.id,kind:family,enabled,serial:++this.furnitureSequence,playerId:p.id};if(action.toggle)this.furnitureStates.set(key,event);this.broadcast(event);return;
    }
    if(m.type==='flashlight-toggle'&&typeof m.enabled==='boolean')return this.setFlashlight(p,m.enabled);
    if(p.guest&&['housing-op','crown-toggle','checkpoint','duel-settings','backdrop','cycle-settings'].includes(m.type)){
      this.broadcast({type:'guest-denied',id:p.id,message:'ゲストは家・ワールド設定・メンバーの保存データを変更できません'});return;
    }
    if(m.type==='housing-op'){if(this.duel?.ids.includes(p.id)||p.ragdoll){const house=this.houses.snapshots()[m.index];if(house)this.broadcast({type:'house-state',index:m.index,house,requestId:m.requestId,error:'試合・被弾中は家を編集できません'});return;}return Promise.resolve(this.houses.apply(p.skin,m)).then(()=>this.pruneRecords());}
    if(m.type==='character-select'){this.selectCharacter(entry,m.skin);return this.characters.pending;}
    if(m.type==='crown-toggle'&&typeof m.enabled==='boolean')return this.characters.change(p.skin,{crownEnabled:m.enabled});
    if(m.type==='checkpoint')return this.characters.checkpoint(p.skin,m.id);
    if(m.type==='duel-settings')return this.updateSettings(m.goalDamage);
    if(m.type==='cycle-settings')return this.setCycle(m);
    if(m.type==='backdrop'&&['GB','RB','BB'].includes(m.value)){
      // Background controls are available on any world menu, shared by the room.
      this.backdrop=m.value;this.broadcast(this.snapshot());return;
    }
    if(m.type==='ready'){this.prepare(p,now);return;}
    if(m.type!=='swing'||protectedFromHit(p,now)||now-(this.cooldowns.get(p.id)||0)<260)return;
    this.cooldowns.set(p.id,now);
    const throwing=p.skin===GYOZA_SKIN&&Number(m.held)<1&&Number(m.kind??p.attackKind)===3;
    if(this.prepare(p,now)){if(throwing)this.broadcast({type:'projectile-cancel',owner:p.id,serial:m.serial});return;}
    if(throwing)return this.throwBrown(entry,m,now);
    const level=clamp(Math.floor(Number(m.held)||0)+1,1,10);
    const facing={x:Math.sin(p.yaw),z:Math.cos(p.yaw)};
    const targets=this.entries().map(e=>e.player).filter(q=>{
      if(protectedFromHit(q,now))return false;
      if(q.id===p.id||(m.target&&m.target!==q.id))return false;
      if(this.duel?.ids.includes(q.id)&&!this.duel.ids.includes(p.id))return false;
      const dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz);
      return d<=3.6&&Math.abs(q.y-p.y)<2.2&&(m.target||dx*facing.x+dz*facing.z>.1)&&(!this.duel?.ids.includes(p.id)||this.duel.ids.includes(q.id));
    }).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
    const q=targets[0];if(!q)return;
    const kind=clamp(Math.floor(Number(m.kind??p.attackKind)||0),0,ATTACKS.length-1);
    return this.hit(p,q,level,now,{held:Number(m.held)||0,kind});
  }
}
