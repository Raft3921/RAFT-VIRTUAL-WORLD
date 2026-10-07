import { ARENA,insideArena } from './world-layout.js';
import { ATTACKS } from './combat-motion.js';
import { CharacterStore,characterIndex } from './character-store.js';
export const SYNC_VERSION='2026-10-07-characters-4';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function cleanState(s,skin){
  if(![s?.x,s?.y,s?.z,s?.yaw].every(Number.isFinite)||Math.abs(s.x)>1300||Math.abs(s.z)>1300||s.y<0||s.y>512)return null;
  const n=(key,a,b)=>Number.isFinite(s[key])?clamp(s[key],a,b):0;
  return {x:s.x,y:s.y,z:s.z,yaw:s.yaw,skin:Number.isInteger(skin)&&skin>=0&&skin<7?skin:3,
    headYaw:n('headYaw',-1,1),headPitch:n('headPitch',-.7,.7),vx:n('vx',-200,200),vy:n('vy',-200,200),vz:n('vz',-200,200),
    speed:n('speed',0,20),verticalSpeed:n('verticalSpeed',-200,200),grounded:s.grounded!==false,flight:s.flight===true,
    ragdoll:s.ragdoll===true,seated:s.seated===true,crownEnabled:s.crownEnabled===true,
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
  if(state.hitSerial<serial){for(const key of ['ragdoll','hitPhase','hitTime','hitDownTime','hitRecovery','hitStrength','grounded','yaw','vx','vy','vz'])if(player[key]!==undefined)state[key]=player[key];}
  if(Date.now()<(player.impactUntil||0)){
    for(const key of ['x','y','z','yaw','grounded','attackProgress'])state[key]=player[key];
    state.vx=state.vy=state.vz=state.speed=state.verticalSpeed=0;
    if(player.hitPhase==='impact'){state.ragdoll=true;state.hitPhase='impact';}
  }
  state.hitSerial=serial;state.crownEnabled=player.crownEnabled;Object.assign(player,state);
}
export class GameRules{
  constructor(players,broadcast,scores={},save=()=>{},settings={},saveSettings=()=>{},characters={},saveCharacters=()=>{}){
    this.players=players;this.broadcast=broadcast;this.scores=scores;this.save=save;this.ready=new Map();this.duel=null;this.cooldowns=new Map();this.backdrop='GB';
    settings=settings&&typeof settings==='object'?settings:{};
    const goal=Number(settings.goalDamage);this.settings={...settings,goalDamage:Number.isInteger(goal)&&goal>=1&&goal<=100?goal:11};this.saveSettings=saveSettings;this.settingsQueue=Promise.resolve();
    this.characters=new CharacterStore(characters,scores,saveCharacters,(skin,record)=>this.broadcastCharacter(skin,record),()=>this.broadcast({type:'character-save-error',message:'キャラクターの状態をサーバーに保存できませんでした。'}));
  }
  entries(){return [...this.players.values()];}
  character(skin,profile,enabled=false){return this.characters.get(skin,profile,enabled);}
  broadcastCharacter(skin,record=this.characters.get(skin)){
    for(const entry of this.entries())if(entry.player.skin===skin)Object.assign(entry.player,record);
    this.broadcast({type:'character-state',skin,character:record});
  }
  selectCharacter(entry,value){
    const skin=characterIndex(value),p=entry.player;if(skin===null)return false;
    if(p.skin!==skin&&(this.duel?.ids.includes(p.id)||p.ragdoll)){this.broadcast({type:'character-select-rejected',id:p.id,skin:p.skin});return false;}
    p.skin=skin;Object.assign(p,this.character(skin,p.profile));this.broadcastCharacter(skin);this.broadcast({type:'state',player:p});return true;
  }
  inside(p){return insideArena(p);}
  snapshot(){return {type:'world',version:SYNC_VERSION,backdrop:this.backdrop,goalDamage:this.settings.goalDamage,duel:this.duel};}
  updateSettings(value){
    const goalDamage=Number(value);if(!Number.isInteger(goalDamage)||goalDamage<1||goalDamage>100)return;
    this.settingsQueue=this.settingsQueue.then(async()=>{
      try{const settings={...this.settings,goalDamage};await this.saveSettings(settings);this.settings=settings;this.broadcast(this.snapshot());this.broadcast({type:'settings-saved',goalDamage});}
      catch{this.broadcast({type:'settings-error',message:'設定をサーバーに保存できませんでした。'});}
    });
    return this.settingsQueue;
  }
  cancel(){if(this.duel){this.duel=null;this.ready.clear();this.broadcast({type:'duel-cancel',reason:'プレイヤーが闘技場から離れたため終了しました'});}}
  removed(id){this.ready.delete(id);this.cooldowns.delete(id);if(this.duel?.ids.includes(id))this.cancel();}
  state(entry){
    const p=entry.player;if(!this.duel?.ids.includes(p.id))return;
    p.flight=false;p.seated=false;
    const dx=p.x-ARENA.x,dy=Math.max(0,p.y+.95-.24),dz=p.z-ARENA.z,r=ARENA.radius-.65,d=Math.hypot(dx,dy,dz);
    if(d>r){p.x=ARENA.x+dx/d*r;p.y=Math.max(.24,.24+dy/d*r-.95);p.z=ARENA.z+dz/d*r;const dot=p.vx*dx/d+p.vy*dy/d+p.vz*dz/d;if(dot>0){p.vx-=dot*dx/d;p.vy-=dot*dy/d;p.vz-=dot*dz/d;}}
  }
  prepare(p,now){
    const entrants=this.entries().map(e=>e.player).filter(p=>this.inside(p));if(this.duel||!this.inside(p)||entrants.length!==2)return false;
    this.ready.set(p.id,now);const other=entrants.find(q=>q.id!==p.id);
    if(now-(this.ready.get(other.id)||0)<=1000){this.duel={ids:[p.id,other.id],damage:{[p.id]:0,[other.id]:0},goalDamage:this.settings.goalDamage,startedAt:now};this.ready.clear();this.broadcast({type:'duel-start',...this.duel});}
    else this.broadcast({type:'duel-ready',id:p.id});return true;
  }
  receive(entry,m,now=Date.now()){
    const p=entry.player;
    if(m.type==='character-select'){this.selectCharacter(entry,m.skin);return this.characters.pending;}
    if(m.type==='crown-toggle'&&typeof m.enabled==='boolean')return this.characters.change(p.skin,{crownEnabled:m.enabled});
    if(m.type==='checkpoint')return this.characters.checkpoint(p.skin,m.id);
    if(m.type==='duel-settings')return this.updateSettings(m.goalDamage);
    if(m.type==='backdrop'&&['GB','RB','BB'].includes(m.value)){
      // Background controls are available on any world menu, shared by the room.
      this.backdrop=m.value;this.broadcast(this.snapshot());return;
    }
    if(m.type==='ready'){this.prepare(p,now);return;}
    if(m.type!=='swing'||now-(this.cooldowns.get(p.id)||0)<260)return;
    this.cooldowns.set(p.id,now);
    if(this.prepare(p,now))return;
    const level=clamp(Math.floor(Number(m.held)||0)+1,1,10);
    const facing={x:Math.sin(p.yaw),z:Math.cos(p.yaw)};
    const targets=this.entries().map(e=>e.player).filter(q=>{
      if(q.id===p.id||(m.target&&m.target!==q.id))return false;
      if(this.duel?.ids.includes(q.id)&&!this.duel.ids.includes(p.id))return false;
      const dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz);
      return d<=3.6&&Math.abs(q.y-p.y)<2.2&&(m.target||dx*facing.x+dz*facing.z>.1)&&(!this.duel?.ids.includes(p.id)||this.duel.ids.includes(q.id));
    }).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
    const q=targets[0];if(!q)return;
    const d=Math.hypot(q.x-p.x,q.z-p.z)||1,range=Number(m.held)<1?8:level*100;
    const fighting=this.duel?.ids.includes(p.id)&&this.duel.ids.includes(q.id);
    const speed=Math.min(fighting?18+level*2.2:84,Math.sqrt(range*18/Math.sin(48*Math.PI/180)));
    const velocity={x:(q.x-p.x)/d*speed*Math.cos(24*Math.PI/180),y:Math.min(30,speed*Math.sin(24*Math.PI/180)),z:(q.z-p.z)/d*speed*Math.cos(24*Math.PI/180)};
    const freeze=.12+(level-1)*.018;
    p.impactUntil=q.impactUntil=now+freeze*1000;
    p.attackProgress=ATTACKS[p.attackKind||0].impact;
    p.vx=p.vy=p.vz=p.speed=0;
    q.hitSerial=(q.hitSerial||0)+1;q.ragdoll=true;q.hitPhase='impact';q.hitTime=0;q.hitDownTime=0;q.hitRecovery=0;q.hitStrength=Math.min(1,speed/65);q.yaw=Math.atan2(-velocity.x,-velocity.z);q.vx=q.vy=q.vz=0;
    this.broadcast({type:'punch',target:q.id,attacker:p.id,velocity,freeze,hitSerial:q.hitSerial,strength:q.hitStrength,targetPosition:{x:q.x,y:q.y,z:q.z},attackerPosition:{x:p.x,y:p.y,z:p.z},damage:fighting?level:0});
    if(!fighting)return;
    this.duel.damage[q.id]+=level;
    this.broadcast({type:'duel-damage',...this.duel});
    if(this.duel.damage[q.id]<this.duel.goalDamage)return;
    const saved=this.characters.result(p.skin,q.skin);
    this.broadcast({type:'duel-result',winner:p.id,loser:q.id,scores:{[p.id]:p.score,[q.id]:q.score}});
    this.duel=null;this.ready.clear();
    return saved;
  }
}
