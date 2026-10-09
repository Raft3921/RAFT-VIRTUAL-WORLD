import {createWorldChat} from './world-chat.js?v=20261009-chat26';
import {startUpdateNotice} from './update-notice.js?v=20261009-chat26';
import {memberColor} from './housing-data.js';
import * as THREE from 'three';
import { createAvatar } from './avatar.js?v=20261008-light14';
import { createEnvironment } from './environment.js';
import { createWorld } from './world.js?v=20261009-chat26';
import { ARENA,insideArena } from './world-layout.js';
import { SYNC_ENDPOINT } from './sync-config.js';
import { ATTACKS,chargeAttack } from './combat-motion.js';
import { createHit,stepHit,hitShape,proneWeight } from './hit-reaction.js';
import { createCombatEffects } from './combat-effects.js';
import { createBrownProjectiles } from './brown-projectiles.js';
import { SYNC_VERSION } from './game-rules.js?v=20261009-chat26';
import {GYOZA_SKIN,GUEST_SKIN,MAX_PLAYERS,playableSkin} from './player-types.js';
import { cleanCharacter } from './character-store.js';
import { createHousingRenderer } from './housing-renderer.js?v=20261009-portalmode27';
// Versioned URL prevents a previously cached editor module from blocking startup.
import { createHouseEditor } from './house-editor.js?v=20261009-chat26';
import {DOWN_PROTECTION_SECONDS,knocksDown,protectedFromHit} from './combat-policy.js';
import {cleanCycle,dayPhase,clockLabel} from './world-clock.js';
import {createWorldGuide} from './world-guide.js';

const $ = id => document.getElementById(id);
const clamp = THREE.MathUtils.clamp;
const angleDelta = (a,b) => Math.atan2(Math.sin(b-a),Math.cos(b-a));
const safeRead = key => {try{return localStorage.getItem(key)}catch{return null}};
const safeSave = (key,value) => {try{localStorage.setItem(key,value);return true}catch{return false}};
const skinDefs = [['ウィーク','week.png'],['もろん','moron.png'],['やんさん','やんさん.png'],['ラフト','raft.png'],['ムート','muto.png'],['まい','maiのコピー.png'],['たぬつな','1000001207.png'],['ギョーザ','gyoza'],['ゲスト',null]];
let gyozaModelPromise=null;
async function playerAvatar(index,url=skinURL(index)){
  if(index!==GYOZA_SKIN)return createAvatar(url);
  gyozaModelPromise??=fetch(new URL('./models/gyoza/gyoza.jem?v=20261008',import.meta.url)).then(response=>{if(!response.ok)throw new Error('ギョーザのモデルを読み込めませんでした');return response.json();});
  return createAvatar(url,{model:await gyozaModelPromise});
}
function actorShape(actor,hit=null,yaw=0){const own=actor.collisionShape;if(!hit)return own?{...own,yaw:actor.root.rotation.y}:null;const shape=hitShape(hit,yaw);return own?{...shape,width:Math.max(shape.width,own.width),height:Math.min(shape.height,own.height)}:shape;}
let whiteSkinURL='';
function skinURL(index){
  if(index===GYOZA_SKIN)return new URL('./models/gyoza/texture.png?v=20261008',import.meta.url).href;
  if(index!==GUEST_SKIN)return 'skins/'+skinDefs[index][1];
  if(!whiteSkinURL){const image=document.createElement('canvas');image.width=image.height=64;const ctx=image.getContext('2d');ctx.fillStyle='#ffffff';for(const [x,y,w,h]of [[0,0,32,16],[16,16,24,16],[40,16,14,16],[32,48,14,16],[0,16,16,16],[16,48,16,16]])ctx.fillRect(x,y,w,h);whiteSkinURL=image.toDataURL('image/png');}
  return whiteSkinURL;
}
const castOrder=[3,5,6,2,4,1,0,GYOZA_SKIN];
const initialCharacter=Number(shareSource().get('c')??safeRead('raft-studio-character')??3);
let selected=playableSkin(initialCharacter), inStudio=false, clean=false;
let guestState=cleanCharacter();
let characterCache={};try{const saved=JSON.parse(safeRead('raft-character-state')||'{}');for(let skin=0;skin<8;skin++)if(saved?.[skin])characterCache[skin]=cleanCharacter(saved[skin]);}catch{}
if(selected!==GUEST_SKIN&&!characterCache[selected])characterCache[selected]=cleanCharacter({crownEnabled:safeRead('raft-crown')==='true'});
let pendingCrown={};try{const pending=JSON.parse(safeRead('raft-character-crown-pending')||'{}');for(let skin=0;skin<8;skin++)if(typeof pending?.[skin]==='boolean')pendingCrown[skin]=pending[skin];}catch{}
let touch = matchMedia('(pointer:coarse)').matches;
let cameraMode='follow',yaw=0,pitch=-.14,lobbyYaw=.35;
const cameraReturnClicks=[];
function cameraReturnMode(){return inStudio&&!paused()&&!housingEditor?.active&&(cameraMode==='free'||cameraMode==='orbit');}
function requestCameraReturn(){
  if(!cameraReturnMode())return;
  const now=performance.now();
  while(cameraReturnClicks.length&&now-cameraReturnClicks[0]>1000)cameraReturnClicks.shift();
  cameraReturnClicks.push(now);
  if(cameraReturnClicks.length<5)return;
  setCameraMode('follow');scheduleShare();notify('5回クリックでプレイヤー操作に戻りました');
}
let distance=5.5,fov=55,smoothing=.14,flySpeed=4,moveSpeed=2.8,gesture='none',showCast=false;
let renderer,environment,world,requestId,lastTime=0,time=0,metricsAt=0,fpsFrames=0,fps=60;
let housingView=null,housingEditor=null,houseCameraState=null,worldChat=null;const updateNotice=startUpdateNotice({endpoint:SYNC_ENDPOINT,version:SYNC_VERSION});
let worldGuide=null;
let activeQuality=touch?'low':'high',qualityChoice='auto',slowSeconds=0,cleanTimer=0,pendingClean=0;
const PUNCH={maxCharge:10,maxRange:1000,tapRange:8,reach:2.25,radius:1.2,gravity:18,angle:24*Math.PI/180};
const canvas=$('scene'),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1,.05,2600);
const combatEffects=createCombatEffects(scene,{mobile:touch});
const particleLimit=touch?72:144,particleGeometry=new THREE.SphereGeometry(1,5,4),particleMaterial=new THREE.MeshBasicMaterial({color:0xffffff,vertexColors:true,transparent:true,opacity:.82,depthWrite:false,blending:THREE.AdditiveBlending});
const particleMesh=new THREE.InstancedMesh(particleGeometry,particleMaterial,particleLimit),particleTransform=new THREE.Object3D(),particleColor=new THREE.Color();
const particles=Array.from({length:particleLimit},()=>({position:new THREE.Vector3(),velocity:new THREE.Vector3(),color:new THREE.Color(),life:0,duration:1,gravity:0}));
const particleOrigin=new THREE.Vector3();
let particleCursor=0,lastChargeEffectAt=0,lastDashEffectAt=0;
particleMesh.frustumCulled=false;particleMesh.name='Pooled action particles';
for(let index=0;index<particleLimit;index++){particleTransform.scale.setScalar(0);particleTransform.updateMatrix();particleMesh.setMatrixAt(index,particleTransform.matrix)}
scene.add(particleMesh);
const shockGeometry=new THREE.RingGeometry(.78,1,12),shocks=[];
for(let i=0;i<6;i++){const mat=new THREE.MeshBasicMaterial({color:'#bdfbe8',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});const mesh=new THREE.Mesh(shockGeometry,mat);mesh.rotation.x=-Math.PI/2;mesh.visible=false;scene.add(mesh);shocks.push({mesh,life:0,power:0});}
function shockwave(position,power){const s=shocks.find(s=>s.life<=0)||shocks[0];s.life=.55;s.power=power;s.mesh.position.copy(position).y+=.06;s.mesh.visible=true;s.mesh.material.color.set(power>.9?'#fff2ab':'#a6fff0');}
function updateShockwaves(dt){for(const s of shocks){if(s.life<=0)continue;s.life-=dt;const t=1-s.life/.55;s.mesh.scale.setScalar(.4+t*(3+s.power*7));s.mesh.material.opacity=Math.max(0,(1-t)*.85);s.mesh.visible=s.life>0;}}
camera.rotation.order='YXZ';camera.position.set(1.75,1.9,5.3);
const actors=new Array(9),velocity=new THREE.Vector3(),focus=new THREE.Vector3(),target=new THREE.Vector3(),desired=new THREE.Vector3(),direction=new THREE.Vector3(),right=new THREE.Vector3(),movement=new THREE.Vector3();
const orbitTarget=new THREE.Vector3(),freePosition=new THREE.Vector3();
let verticalSpeed=0,grounded=true,stickId=null,lookId=null,lookX=0,lookY=0,jumpRequested=false;
const bodies=Array.from({length:9},()=>({vel:new THREE.Vector3(),grounded:true,travelRemaining:0,ragdoll:false,landedAt:0}));
let charging=false,chargeTime=0,punchSwing=0,chargeLevelShown=-1,shareTimer=0;
let attackKind=0,attackStrength=0,attackSerial=0,comboIndex=0,lastComboAt=-Infinity,pendingAttack=null,queuedAttack=null;
let attackDuration=.34,attackYaw=0;
let targetLock=null,attackRushing=false,rushTime=0,chainRemaining=0;
const lockMarker=new THREE.Mesh(new THREE.RingGeometry(.62,.70,16),new THREE.MeshBasicMaterial({color:'#96ffdc',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));lockMarker.rotation.x=-Math.PI/2;lockMarker.visible=false;scene.add(lockMarker);
let roomSocket=null,roomCode='',roomSelfId='',lastRoomStateAt=0,roomFailure='';
const remoteActors=new Map(),remoteLoading=new Map();
let airWalk=false,lastJumpTapAt=-Infinity,flightAscend=false,flightDescend=false;
const localImpulse=new THREE.Vector3();
let localRagdoll=false,localLandedAt=0;
let localHit=null,restoreHitCamera=null;
let localHitSerial=0;
let localImpact=null,backgroundAt=0;
function freezeImpact(duration,strength){
  localImpact={time:0,duration,strength,vertical:verticalSpeed,velocity:velocity.clone()};
  velocity.set(0,0,0);verticalSpeed=0;lastRoomStateAt=0;
}
let crownEnabled=cachedCharacter().crownEnabled,crownScore=cachedCharacter().score,athleticCheckpoint=null,athleticActive=false,seated=false,duelActive=false,duelDamage=0;
let courseAwaitingSave=false;
let standingOn=null,seat=null,seatCooldown=0,sleeping=false,bed=null,knockbackInArena=false,duelIds=[],openBoard=null,athleticPeak=0;
let goalDamage=11,matchGoalDamage=11;
let dayCycle=cleanCycle(),serverOffset=0,flashlightEnabled=safeRead('raft-flashlight-enabled')!=='false',flashlightPending=safeRead('raft-flashlight-pending')==='true',clockHudAt=0;
const serverNow=()=>Date.now()+serverOffset;
// A permanently registered, shadowless light avoids shader variants whenever
// dusk or the preference changes. Intensity zero is the OFF state.
const flashlight=new THREE.SpotLight('#eaf3ff',0,28,Math.PI/7,.65,1.6),flashlightDirection=new THREE.Vector3();flashlight.castShadow=false;scene.add(flashlight,flashlight.target);
function updateClockControls(){$('cycleToggle').textContent='昼夜サイクル：'+(dayCycle.enabled?'ON':'OFF · ずっと昼');$('dayMinutes').value=String(dayCycle.duration/60);$('cycleToggle').disabled=$('dayMinutes').disabled=$('saveDayMinutes').disabled=selected===GUEST_SKIN;$('flashlightToggle').textContent='自動懐中電灯：'+(flashlightEnabled?'ON':'OFF')+'（自分だけの設定）';}
function requestCycle(enabled=dayCycle.enabled){if(selected===GUEST_SKIN)return;const minutes=Number($('dayMinutes').value);if(!Number.isInteger(minutes)||minutes<1||minutes>120){notify('1日の長さは1〜120分の整数にしてください');return;}if(roomSocket?.readyState!==WebSocket.OPEN||!roomSelfId){notify('昼夜設定を保存するにはサーバーに接続してください');return;}$('cycleToggle').disabled=$('saveDayMinutes').disabled=true;roomSocket.send(JSON.stringify({type:'cycle-settings',enabled,duration:minutes*60}));}
const profile=safeRead('raft-world-profile')||(crypto.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const n=Math.floor(Math.random()*16);return (c==='x'?n:(n&3)|8).toString(16);}));safeSave('raft-world-profile',profile);
function cachedCharacter(skin=selected){return skin===GUEST_SKIN?guestState:characterCache[skin]||cleanCharacter();}
function cacheCharacter(skin,value){const record=cleanCharacter(value);record.checkpoint=Math.max(record.checkpoint,cachedCharacter(skin).checkpoint);if(skin===GUEST_SKIN){guestState={...record,score:0,crownEnabled:false};return;}characterCache[skin]=record;safeSave('raft-character-state',JSON.stringify(characterCache));actors[skin]?.setAppearance(record.appearanceLevel,record.crownEnabled);if(skin===selected){crownScore=record.score;crownEnabled=record.crownEnabled;updateCrown();}}
function saveCheckpoint(id){cacheCharacter(selected,{...cachedCharacter(),checkpoint:id});if(selected!==GUEST_SKIN&&roomSocket?.readyState===WebSocket.OPEN&&roomSelfId)roomSocket.send(JSON.stringify({type:'checkpoint',id:cachedCharacter().checkpoint}));}
function receiveCharacter(skin,value){
  if(skin===GUEST_SKIN)return;
  const wanted=pendingCrown[skin];if(wanted!==undefined&&value.crownEnabled===wanted){delete pendingCrown[skin];safeSave('raft-character-crown-pending',JSON.stringify(pendingCrown));}
  cacheCharacter(skin,{...value,crownEnabled:wanted!==undefined?wanted:value.crownEnabled});
  if(skin===selected&&roomSelfId){if(cachedCharacter().checkpoint>(value.checkpoint||1))saveCheckpoint(cachedCharacter().checkpoint);if(wanted!==undefined&&value.crownEnabled!==wanted&&roomSocket?.readyState===WebSocket.OPEN)roomSocket.send(JSON.stringify({type:'crown-toggle',enabled:wanted}));}
}
const physicsVelocity=new THREE.Vector3();
const keys=new Set(),stick={x:0,y:0},stickCenter={x:0,y:0},pointerStart={x:0,y:0};
const punchRaycaster=new THREE.Raycaster(),punchNdc=new THREE.Vector2();
let pointerPunchTarget=null;
function remotePlayerAt(clientX,clientY){
  if(!remoteActors.size)return null;
  const rect=canvas.getBoundingClientRect();punchNdc.set((clientX-rect.left)/rect.width*2-1,-((clientY-rect.top)/rect.height*2-1));camera.updateMatrixWorld();punchRaycaster.setFromCamera(punchNdc,camera);
  let nearestId=null,nearestDistance=Infinity;
  for(const [id,remote] of remoteActors){remote.actor.root.updateMatrixWorld(true);const hit=punchRaycaster.intersectObject(remote.actor.root,true)[0];if(hit&&hit.distance<nearestDistance){nearestId=id;nearestDistance=hit.distance}}
  return nearestId;
}
const cameraDescriptions={follow:'WASDで移動。飛行中はSpaceで上昇、Shiftで下降。画面上の相手を長押しで狙ってパンチ。',first:'WASDで移動、マウスで視線。飛行中はSpaceで上昇、Shiftで下降。相手を長押しでパンチ。',orbit:'プレイヤーはその場に残り、マウスで周囲を回り込みます。ホイールで距離を調整。1秒以内に5回クリックで操作に戻る。',free:'プレイヤーを残して撮影。WASDで移動、Spaceで上昇、Shiftで下降/水平加速。1秒以内に5回クリックで操作に戻る。'};
function notify(message,duration=3000){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').hidden=true,duration)}
function emitParticles(position,color,count=10,speed=2,gravity=7){for(let index=0;index<count;index++){const particle=particles[particleCursor];particleCursor=(particleCursor+1)%particleLimit;particle.position.copy(position);particle.position.x+=(Math.random()-.5)*.16;particle.position.y+=(Math.random()-.5)*.12;particle.position.z+=(Math.random()-.5)*.16;const angle=Math.random()*Math.PI*2,vertical=Math.random()*1.4-.15;particle.velocity.set(Math.cos(angle)*speed*(.35+Math.random()),vertical*speed,Math.sin(angle)*speed*(.35+Math.random()));particle.color.set(color);particle.duration=.28+Math.random()*.38;particle.life=particle.duration;particle.gravity=gravity}}
function updateParticles(dt){for(let index=0;index<particles.length;index++){const particle=particles[index];if(particle.life>0){particle.life=Math.max(0,particle.life-dt);particle.position.addScaledVector(particle.velocity,dt);particle.velocity.y-=particle.gravity*dt;particle.velocity.multiplyScalar(Math.max(0,1-dt*1.8));const fade=particle.life/particle.duration;particleTransform.position.copy(particle.position);particleTransform.scale.setScalar((.025+fade*.065)*activeParticleScale());particleTransform.updateMatrix();particleMesh.setMatrixAt(index,particleTransform.matrix);particleColor.copy(particle.color).multiplyScalar(.3+fade*.8);particleMesh.setColorAt(index,particleColor)}else{particleTransform.scale.setScalar(0);particleTransform.updateMatrix();particleMesh.setMatrixAt(index,particleTransform.matrix)}}particleMesh.instanceMatrix.needsUpdate=true;if(particleMesh.instanceColor)particleMesh.instanceColor.needsUpdate=true}
function activeParticleScale(){return activeQuality==='low'?.72:1}
function mobileUI(value){touch=value;document.body.dataset.touch=String(touch);$('controlHelp').textContent=touch?'左スティックで移動、画面ドラッグで視点。右下の✊を長押しでパンチ、↑でジャンプ。':'WASD：移動 / Shift：走る / Space：ジャンプ / 右下の✊長押し：パンチ / ドラッグ：視点 / ダブルクリック：マウス固定 / Esc：メニュー / F1：マスター';}
mobileUI(touch);
matchMedia('(pointer:coarse)').addEventListener('change',e=>mobileUI(e.matches));
function clearInput(){cameraReturnClicks.length=0;keys.clear();queuedAttack=null;chainRemaining=0;targetLock=null;attackRushing=false;if(pendingAttack)pendingAttack.targetId=null;stick.x=stick.y=0;stickId=lookId=null;jumpRequested=false;flightAscend=flightDescend=false;cancelCharge();$('stickKnob').style.transform='';clearTimeout(cleanTimer)}
function punchLevel(time){return clamp(Math.floor(Math.max(0,time)*10/PUNCH.maxCharge)+1,1,10)}
function punchDistance(time){return time<1?PUNCH.tapRange:punchLevel(time)*(PUNCH.maxRange/10)}
function updateChargeHud(){const hud=$('chargeHud');if(!hud)return;const active=charging||punchSwing>0;hud.hidden=!inStudio||paused()||!active&&chargeTime<=0;const t=charging?chargeTime:0;const level=punchLevel(t);hud.dataset.level=String(level);hud.style.setProperty('--charge',String(clamp(t/PUNCH.maxCharge,0,1)));hud.style.setProperty('--charge-color',level>=8?'#ff7048':level>=4?'#ffd45e':'#9ce889');$('chargeFill').style.width=`${clamp(t/PUNCH.maxCharge,0,1)*100}%`;$('chargeLabel').textContent=charging?`溜め ${level} · ${ATTACKS[chargeAttack(level)].name}`:(selected===GYOZA_SKIN&&attackKind===3?'回転投げ · 2ダメージ':ATTACKS[attackKind].name);if(charging&&level!==chargeLevelShown)chargeLevelShown=level}
function cancelCharge(){charging=false;chargeTime=0;chargeLevelShown=-1;updateChargeHud()}
function updateJumpButton(){$('jumpBtn').textContent=airWalk?'✈':'↑';$('jumpBtn').setAttribute('aria-label',airWalk?'飛行中。連続2回タップで解除':'ジャンプ。連続2回タップで飛行');$('flightControls').hidden=!airWalk&&cameraMode!=='free'}
function requestJump(){
  if(!inStudio||paused()||localRagdoll||!['follow','first'].includes(cameraMode))return;
  if(sleeping){wakeFromBed();seatCooldown=time+1.5;jumpRequested=true;return;}
  if(seated){actors[selected].root.position.y=seat.y;seated=false;seat=null;sleeping=false;bed=null;seatCooldown=time+1;jumpRequested=true;return;}
  if(duelActive){lastJumpTapAt=-Infinity;if(grounded)jumpRequested=true;return;}
  if(athleticActive||world?.inAthletic(actors[selected].root.position)){lastJumpTapAt=-Infinity;if(grounded)jumpRequested=true;return;}
  const now=performance.now();
  if(now-lastJumpTapAt<360){airWalk=!airWalk;jumpRequested=false;verticalSpeed=0;grounded=false;lastJumpTapAt=-Infinity;updateJumpButton();return;}
  lastJumpTapAt=now;if(!airWalk&&grounded)jumpRequested=true;
}

function canPunch(){return inStudio&&!paused()&&!localRagdoll&&!localImpact&&(cameraMode==='follow'||cameraMode==='first')}
function attackTarget(id){if(id?.startsWith('cast:')){const i=Number(id.slice(5)),actor=actors[i];return actor?.root.visible&&!protectedFromHit(bodies[i],time)?actor.root.position:null;}const remote=remoteActors.get(id);return remote&&!remote.ragdoll?remote.target:null;}
function chooseTarget(requested){
  const p=actors[selected].root.position;
  const usable=(id,range)=>{const q=attackTarget(id);return q&&Math.hypot(q.x-p.x,q.z-p.z)<range&&Math.abs(q.y-p.y)<6;};
  if(requested&&usable(requested,24))return requested;
  if(targetLock&&performance.now()-lastComboAt<2200&&usable(targetLock,24))return targetLock;
  let best=null,score=Infinity;const candidates=[...remoteActors.keys(),...actors.flatMap((a,i)=>a&&i!==selected&&a.root.visible?['cast:'+i]:[])];
  for(const id of candidates){if(!usable(id,14))continue;const q=attackTarget(id),dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz),dot=(dx*Math.sin(yaw)+dz*Math.cos(yaw))/Math.max(d,.01);if(dot<.55)continue;
    const from=new THREE.Vector3(p.x,p.y+1.05,p.z),to=new THREE.Vector3(q.x,q.y+1.05,q.z);if(world.cameraPosition(from,to,.06).distanceTo(to)>.2)continue;
    const value=d+(1-dot)*8;if(value<score){score=value;best=id;}
  }return best;
}
function beginCharge(){if(!canPunch()||charging)return;const origin=actors[selected].root.position.clone();origin.y+=1.05;const instrument=housingView?.instrumentHit(origin,new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)));if(instrument?.family==='record')housingView.recordAudio.prepare();charging=true;chargeTime=0;chargeLevelShown=-1;updateChargeHud()}
function startAttack(held,targetId){
  if(!canPunch())return;
  if(sleeping)wakeFromBed();
  const now=performance.now();if(now-lastComboAt>1300)comboIndex=0;
  const interactionOrigin=actors[selected].root.position.clone();interactionOrigin.y+=1.05;
  const playingPiano=!targetId&&housingView?.instrumentHit(interactionOrigin,new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)));
  const musical=playingPiano&&['piano','instrument'].includes(playingPiano.kind);
  if(musical)held=0;
  attackStrength=clamp(held/PUNCH.maxCharge,0,1);attackKind=musical?0:held>=1?chargeAttack(punchLevel(held)):!grounded&&!airWalk?8:comboIndex++%4;
  const spec=ATTACKS[attackKind];attackDuration=musical?.18:spec.duration;attackYaw=yaw;
  const picked=playingPiano?null:chooseTarget(targetId);lastComboAt=now;attackSerial++;punchSwing=.001;pendingAttack={held,targetId,hit:!!musical,jumpStarted:false,musical:!!musical};
  targetLock=picked;pendingAttack.targetId=targetLock;attackRushing=!!targetLock;rushTime=0;
  const p=actors[selected].root,q=attackTarget(targetLock);if(q)attackYaw=Math.atan2(q.x-p.position.x,q.z-p.position.z);p.rotation.y=attackYaw;
  if(seated){p.position.y=seat.y;seated=false;seat=null;sleeping=false;bed=null;seatCooldown=time+2;}
  if(musical)applyPunch(0,null);
  if(spec.jump&&grounded&&!airWalk&&(!q||Math.hypot(q.x-p.position.x,q.z-p.position.z)<2.25)){const jump=Math.min(spec.jump,athleticActive?7.95:10.4);attackDuration*=jump/spec.jump;verticalSpeed=jump;grounded=false;standingOn=null;pendingAttack.jumpStarted=true;}else if(!musical&&!grounded&&!airWalk&&held<1)attackDuration=.58;
  const origin=p.position.clone();origin.y+=1.05;if(!playingPiano&&!world.boardHit(origin,new THREE.Vector3(Math.sin(attackYaw),0,Math.cos(attackYaw)))&&roomSocket?.readyState===WebSocket.OPEN)roomSocket.send(JSON.stringify({type:'ready'}));
}
function launchPunch(targetId=null){if(!charging)return;const held=chargeTime;charging=false;chargeLevelShown=-1;const origin=actors[selected].root.position.clone();origin.y+=1.05;const hit=!targetId&&housingView?.instrumentHit(origin,new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)));if(hit&&['piano','instrument'].includes(hit.kind)){queuedAttack=null;chainRemaining=0;targetLock=null;startAttack(0,null);}else if(punchSwing>0){queuedAttack={held,targetId};if(targetLock&&held<1)chainRemaining=Math.max(chainRemaining,2);}else startAttack(held,targetId);chargeTime=0;updateChargeHud()}
function attackImpact(held,targetId){
  applyPunch(held,targetId);particleOrigin.copy(actors[selected].root.position);particleOrigin.y+=1.1;
  emitParticles(particleOrigin,held>=1?'#a6fff0':'#fff0b0',held>=1?28:8,held>=1?5:2.5,1);
  if(held>=1)shockwave(actors[selected].root.position,attackStrength);
}
function applyPunch(held,targetId=null){
  const actor=actors[selected],p=actor?.root;if(!p)return;
  const dist=punchDistance(held),speed=Math.sqrt(dist*PUNCH.gravity/Math.max(1e-4,Math.sin(2*PUNCH.angle)));
  const facing=new THREE.Vector3(Math.sin(attackYaw),0,Math.cos(attackYaw));
  const origin=p.position.clone();origin.y+=1.05;
  const board=!targetId&&world?.boardHit(origin,facing);if(board){openWorldMenu(board);return;}
  const instrument=!targetId&&housingView?.instrumentHit(origin,facing);if(instrument){if(instrument.kind==='chat'&&(!roomSelfId||roomSocket?.readyState!==WebSocket.OPEN)){worldChat?.open();return;}const message={type:instrument.kind==='record'?'record-toggle':instrument.kind==='piano'?'piano-play':'furniture-hit',index:instrument.index,itemId:instrument.itemId,serial:attackSerial};if(roomSocket?.readyState===WebSocket.OPEN&&roomSelfId)roomSocket.send(JSON.stringify(message));else housingView.interactOffline(message,p.position);return;}
  const throwing=selected===GYOZA_SKIN&&held<1&&attackKind===3;
  if(roomSocket?.readyState===WebSocket.OPEN&&roomSelfId){
    if(throwing)brownProjectiles.launch(p.position,attackYaw,{predicted:true,owner:roomSelfId,serial:attackSerial});
    roomSocket.send(JSON.stringify({type:'swing',target:targetId?.startsWith('cast:')?null:targetId,held:held*10/PUNCH.maxCharge,kind:attackKind,serial:attackSerial}));
  }else if(throwing)brownProjectiles.launch(p.position,attackYaw);
  if(throwing)return;
  const aimedTarget=attackTarget(targetId);
  if(aimedTarget){const aimed=aimedTarget.clone().sub(origin);aimed.y=0;if(aimed.lengthSq()>.001)facing.copy(aimed.normalize())}
  for(let i=0;i<actors.length;i++){
    if(i===selected||!actors[i]||!actors[i].root.visible)continue;
    const target=actors[i].root.position,to=target.clone().sub(origin);to.y+=.9;
    const along=to.x*facing.x+to.z*facing.z,side=Math.abs(to.x*facing.z-to.z*facing.x);
    if(along<.15||along>PUNCH.reach+1.1||side>PUNCH.radius+.35||Math.hypot(to.x,to.z)>PUNCH.reach+1.35)continue;
    if(targetId&&targetId!=='cast:'+i)continue;
    if(protectedFromHit(bodies[i],time))continue;
    if(!knocksDown(attackKind,held)){const body=bodies[i];actors[i].reactHit(body.flinchSerial=(body.flinchSerial||0)+1,.2);particleOrigin.copy(target);particleOrigin.y+=1;combatEffects.impact(particleOrigin,.12);continue;}
    const body=bodies[i],launch=Math.min(speed,84);body.vel.set(facing.x*launch*Math.cos(PUNCH.angle),Math.min(30,launch*Math.sin(PUNCH.angle)),facing.z*launch*Math.cos(PUNCH.angle));body.travelRemaining=dist;body.inArena=Math.hypot(target.x-ARENA.x,target.z-ARENA.z)<ARENA.radius;body.ragdoll=true;body.landedAt=0;body.hit=createHit(launch/65);body.hit.phase='impact';body.impact={time:0,duration:.12+(punchLevel(held)-1)*.018,strength:launch/65};freezeImpact(body.impact.duration,body.impact.strength);actors[i].root.rotation.y=Math.atan2(-facing.x,-facing.z);particleOrigin.copy(actors[i].root.position);particleOrigin.y+=.9;combatEffects.impact(particleOrigin,attackStrength);
  }

}
function unlocked(){if(document.pointerLockElement)document.exitPointerLock();clearInput()}
function paused(){return !inStudio||worldChat?.active||housingEditor?.active||worldGuide?.active||!$('menu').hidden||!$('master').hidden||!$('worldMenu').hidden}
function setClean(value){const wasClean=clean;clearTimeout(pendingClean);pendingClean=0;clean=value;document.body.dataset.clean=String(value);$('menu').hidden=$('master').hidden=$('worldMenu').hidden=true;worldGuide?.close(false);clearInput();if(wasClean&&!value)notify('操作表示に戻りました',1700)}
function enterClean(){if(pendingClean){clearTimeout(pendingClean);pendingClean=0;$('toast').hidden=true;return}notify(touch?'画面を長押しすると操作表示に戻れます':'H・Escで戻る / F1でマスターモード',2200);$('menu').hidden=$('master').hidden=true;canvas.focus();pendingClean=setTimeout(()=>{pendingClean=0;if(inStudio&&$('menu').hidden&&$('master').hidden)setClean(true)},1500)}
function openMenu(){if(housingEditor?.active)housingEditor.close();setClean(false);unlocked();$('worldMenu').hidden=true;$('master').hidden=true;$('menu').hidden=false;$('resume').focus()}
function openMaster(){if(!inStudio)return;if(housingEditor?.active)housingEditor.close();$('worldMenu').hidden=true;const wasOpen=!$('master').hidden;setClean(false);unlocked();$('menu').hidden=true;$('master').hidden=wasOpen;if(!wasOpen)$('cameraMode').focus();else canvas.focus()}
function setCameraMode(mode){if(!['follow','first','orbit','free'].includes(mode))return;const p=actors[selected]?.root;if(mode==='orbit'&&p)orbitTarget.copy(p.position).add(new THREE.Vector3(0,1.15,0));if(mode==='free'){freePosition.copy(camera.position);camera.getWorldDirection(direction);yaw=Math.atan2(direction.x,direction.z);pitch=Math.asin(clamp(direction.y,-1,1))}cameraMode=mode;cameraReturnClicks.length=0;$('cameraMode').value=mode;$('cameraHelp').textContent=cameraDescriptions[mode];$('distance').disabled=mode==='first'||mode==='free';clearInput();updateJumpButton();updateVisibility()}
function updateVisibility(){actors.forEach((a,i)=>{if(a)a.root.visible=(i===selected&&(!inStudio||cameraMode!=='first'))||(inStudio&&showCast&&i!==selected)})}
function wakeFromBed(){if(!sleeping)return;const p=actors[selected]?.root;if(p&&bed){p.position.set(bed.x,bed.y+.04,bed.z);p.rotation.y=bed.yaw;}sleeping=false;bed=null;seatCooldown=time+1.5;velocity.set(0,0,0);verticalSpeed=0;grounded=true;}
function setSelected(index){
  if(!actors[index]){$('actorSelect').value=String(selected);return;}if(index===selected)return;
  if(inStudio&&selected===GUEST_SKIN){$('actorSelect').value=String(selected);notify('ゲストからの変更はキャラクター選択画面に戻ってください');return;}
  if(duelActive||localRagdoll||localImpact){$('actorSelect').value=String(selected);notify('試合・被弾中はキャラクターを変更できません');return;}
  if(housingEditor?.active)housingEditor.close();
  if(athleticCheckpoint)saveCheckpoint(athleticCheckpoint.id);athleticActive=false;athleticCheckpoint=null;athleticPeak=0;courseAwaitingSave=false;standingOn=null;seated=false;seat=null;sleeping=false;bed=null;
  selected=index;velocity.set(0,0,0);verticalSpeed=0;grounded=true;bodies[index].vel.set(0,0,0);bodies[index].grounded=true;bodies[index].travelRemaining=0;actors[index].root.position.y=0;safeSave('raft-studio-character',String(index));
  crownScore=cachedCharacter().score;crownEnabled=cachedCharacter().crownEnabled;
  if(inStudio){setCameraMode('follow');focus.copy(actors[index].root.position).add(new THREE.Vector3(0,1.25,0));yaw=actors[index].root.rotation.y;pitch=-.14;}
  if(roomSocket?.readyState===WebSocket.OPEN&&roomSelfId)roomSocket.send(JSON.stringify({type:'character-select',skin:index}));
  updateCrown();updateSelection();updateVisibility();scheduleShare();
}
function updateSelection(){$('selectedName').textContent=skinDefs[selected][0];$('sessionName').textContent=skinDefs[selected][0]+' · Meadow';$('enter').disabled=!actors[selected];$('actorSelect').value=String(selected);document.querySelectorAll('.character').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.index===selected)))}
function battleRecord(){const {wins,losses}=cachedCharacter(),total=wins+losses;return wins+'勝 '+losses+'敗 · 勝率 '+(total?(wins/total*100).toFixed(1)+'%':'--（今後の試合から集計）');}
function updateCrown(){const guest=selected===GUEST_SKIN;if(guest){crownScore=0;crownEnabled=false;}updateClockControls();$('duelRecord').textContent=guest?'ゲスト · 勝敗の保存なし':battleRecord();actors[selected]?.setAppearance(cachedCharacter().appearanceLevel,crownEnabled);$('crownToggle').disabled=guest;$('saveDuelGoal').disabled=guest;$('duelGoal').disabled=guest;document.querySelectorAll('[data-bg]').forEach(button=>button.disabled=guest);$('crownToggle').textContent=guest?'ゲスト · 王冠・ハゲ表現なし':skinDefs[selected][0]+' · 王冠・ハゲ表現：'+(crownEnabled?'ON':'OFF');}
function updateDuelSettings(){$('duelGoal').value=String(goalDamage);$('duelSettingsStatus').textContent=selected===GUEST_SKIN?'ゲストはワールド設定を変更できません':`現在：${goalDamage}ダメージ · サーバー保存 · 次の試合から反映`;}
function receiveDuel(duel,announce=false){duelIds=duel.ids;duelActive=duelIds.includes(roomSelfId);matchGoalDamage=duel.goalDamage||goalDamage;duelDamage=duel.damage?.[roomSelfId]||0;if(duelActive){airWalk=false;updateJumpButton();}if(announce)notify('タイマン開始！',3500);$('duelHud').hidden=false;$('duelHud').textContent=duelActive?`被ダメージ ${duelDamage} / ${matchGoalDamage} · 試合中はバリア封鎖`:`タイマン観戦中 · ${matchGoalDamage}ダメージで決着`;}
function showWorldMenuTab(name){for(const button of document.querySelectorAll('[data-world-tab]'))button.setAttribute('aria-selected',String(button.dataset.worldTab===name));for(const section of document.querySelectorAll('[data-world-panel]')){section.hidden=section.dataset.worldPanel!==name;if(!section.hidden)section.scrollTop=0;}$('worldMenu').querySelector('.world-menu-content').scrollTop=0;}
function openWorldMenu(board=null){setClean(false);unlocked();openBoard=board;$('menu').hidden=true;$('master').hidden=true;$('worldMenu').hidden=false;$('stopAthletic').disabled=!athleticActive;updateDuelSettings();updateClockControls();$('worldStatus').textContent=`闘技場：2人が1秒以内にパンチで開始 · ${goalDamage}ダメージで勝利`;$('athleticMenuStatus').textContent=athleticActive?'CHECK '+(athleticCheckpoint?.id||1)+' / 100 · ジャンプ力1.5倍':'CHECK 100まで登るコースです。ジャンプ力はゾーン内で1.5倍。';showWorldMenuTab(board?.kind==='checkpoint'||athleticActive?'course':board?.kind==='arena'?'battle':'studio');}
function closeWorldMenu(){$('worldMenu').hidden=true;canvas.focus();}
function respawnCourse(){
  const cp=athleticCheckpoint||world.athletic.checkpoints[0];
  actors[selected].root.position.set(cp.x,cp.y,cp.z);verticalSpeed=0;velocity.set(0,0,0);localImpulse.set(0,0,0);localImpact=null;localHit=null;localRagdoll=false;grounded=true;seated=false;seat=null;sleeping=false;bed=null;standingOn=null;athleticPeak=cp.y;focus.copy(actors[selected].root.position).y+=1.25;notify('CHECK '+cp.id+' から再開');
}
function stopCourse(){if(!athleticActive||duelActive)return;if(athleticCheckpoint)saveCheckpoint(athleticCheckpoint.id);courseAwaitingSave=false;athleticActive=false;athleticCheckpoint=null;athleticPeak=0;seated=false;seat=null;sleeping=false;bed=null;airWalk=false;localImpact=null;localHit=null;localRagdoll=false;localImpulse.set(0,0,0);verticalSpeed=0;velocity.set(0,0,0);actors[selected].root.position.set(world.athletic.exit.x,.16,world.athletic.exit.z);grounded=true;setCameraMode('follow');closeWorldMenu();updateJumpButton();notify('アスレチックを終了 · CHECK '+cachedCharacter().checkpoint+(selected===GUEST_SKIN?'（今回の入室中のみ）':' を保存'));}

function placeActors(){housingView?.portals.reset();courseAwaitingSave=false;athleticActive=false;athleticCheckpoint=null;seated=false;seat=null;sleeping=false;bed=null;standingOn=null;localImpact=null;localRagdoll=false;localHit=null;restoreHitCamera=null;localImpulse.set(0,0,0);actors.forEach((a,i)=>{if(a){a.resetHitReaction();bodies[i].flinchSerial=0;bodies[i].protectedUntil=0;if(i===selected){a.root.position.set(0,0,0);a.root.rotation.set(0,0,0)}else{const angle=i*2.399+.4,radius=3.4+(i%3)*.85;a.root.position.set(Math.sin(angle)*radius,0,Math.cos(angle)*radius+1.2);a.root.rotation.set(0,Math.atan2(-a.root.position.x,-a.root.position.z),0)}}if(a&&world)a.root.position.y=world.floorAt(a.root.position,.5).y;bodies[i].vel.set(0,0,0);bodies[i].grounded=true;bodies[i].ragdoll=false;bodies[i].hit=null;bodies[i].travelRemaining=0});velocity.set(0,0,0);verticalSpeed=0;grounded=true;airWalk=false;lastJumpTapAt=-Infinity;updateJumpButton();cancelCharge();punchSwing=0;pendingAttack=null;queuedAttack=null;comboIndex=0;attackRushing=false;chainRemaining=0;targetLock=null}
function enterStudio(){if(!actors[selected])return;const query=shareSource();inStudio=true;showCast=false;$('showCast').checked=false;document.body.dataset.screen='studio';$('lobby').hidden=true;$('hud').hidden=false;placeActors();focus.set(0,1.25,0);const sharedYaw=Number(query.get('yaw')),sharedPitch=Number(query.get('pitch'));yaw=query.has('yaw')&&Number.isFinite(sharedYaw)?angleDelta(0,sharedYaw):0;pitch=query.has('pitch')&&Number.isFinite(sharedPitch)?clamp(sharedPitch,-1.15,1.1):-.14;setCameraMode(query.get('cam')||'follow');updateVisibility();canvas.focus();notify(touch?'左スティックで移動。パンチを長押しで溜め':'ドラッグで視点 / 右下の✊を長押しで溜めパンチ',3500);connectRoom();scheduleShare()}
function returnLobby(){if(worldChat?.active)worldChat.close();leaveRoom();if(selected===GUEST_SKIN)guestState=cleanCharacter();unlocked();setClean(false);inStudio=false;document.body.dataset.screen='lobby';$('hud').hidden=true;$('lobby').hidden=false;$('menu').hidden=$('master').hidden=$('worldMenu').hidden=true;gesture='none';$('gesture').value='idle';placeActors();updateSelection();updateVisibility();$('enter').focus()}
function makeFace(url,el){const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=c.height=32;c.className='face';c.setAttribute('aria-hidden','true');const q=c.getContext('2d');q.imageSmoothingEnabled=false;const s=img.width/64;if(url.includes('models/gyoza/')){q.drawImage(img,8*s,8*s,18*s,9*s,0,8,32,16);q.drawImage(img,20*s,55*s,18*s,9*s,0,8,32,16);}else{q.drawImage(img,8*s,8*s,8*s,8*s,0,0,32,32);q.drawImage(img,40*s,8*s,8*s,8*s,0,0,32,32);}el.replaceChildren(c)};img.src=url}
const faces=[],characterButtons=[];
castOrder.forEach(i=>{const [name,file]=skinDefs[i],b=document.createElement('button');b.className='character';b.style.setProperty('--member-color',memberColor(i));b.dataset.index=i;b.setAttribute('aria-label',name+' を選択');b.setAttribute('aria-pressed',String(i===selected));const holder=document.createElement('span');holder.className='face';holder.textContent='＋';faces[i]=holder;characterButtons[i]=b;const label=document.createElement('span');label.textContent=name;b.append(holder,label);b.onclick=()=>setSelected(i);$('characters').append(b);$('actorSelect').add(new Option(name,String(i)));if(file)makeFace(skinURL(i),holder)});
const guestButton=document.createElement('button');guestButton.className='character guest-character';guestButton.dataset.index=String(GUEST_SKIN);guestButton.setAttribute('aria-label','ゲスト · 保存データを変更しない白いキャラクター');const guestFace=document.createElement('span');guestFace.className='face';const guestLabel=document.createElement('span');guestLabel.textContent='ゲスト';guestButton.append(guestFace,guestLabel);guestButton.onclick=()=>setSelected(GUEST_SKIN);$('characters').append(guestButton);faces[GUEST_SKIN]=guestFace;characterButtons[GUEST_SKIN]=guestButton;$('actorSelect').add(new Option('ゲスト（保存なし）',String(GUEST_SKIN)));makeFace(skinURL(GUEST_SKIN),guestFace);
async function replaceSkin(i,url){const actor=await playerAvatar(i,url);const old=actors[i];if(old){actor.root.position.copy(old.root.position);actor.root.rotation.copy(old.root.rotation);scene.remove(old.root);old.dispose()}actors[i]=actor;const appearance=cachedCharacter(i);actor.setAppearance(appearance.appearanceLevel,appearance.crownEnabled);scene.add(actor.root);makeFace(url,faces[i]);updateSelection();updateVisibility()}
worldChat=createWorldChat({names:skinDefs.map(s=>s[0]),skinURL,makeFace,getSelfId:()=>roomSelfId,isConnected:()=>roomSocket?.readyState===WebSocket.OPEN&&!!roomSelfId,send:message=>roomSocket.send(JSON.stringify(message)),onOpen(){if(housingEditor?.active)housingEditor.close();worldGuide?.close(false);setClean(false);unlocked();punchSwing=0;pendingAttack=null;queuedAttack=null;},onClose(){clearInput();canvas.focus();}});
$('enter').onclick=enterStudio;$('resume').onclick=()=>{$('menu').hidden=true;clearInput();canvas.focus()};$('changeCharacter').onclick=$('masterCharacter').onclick=returnLobby;
$('openMaster').onclick=openMaster;$('closeMaster').onclick=()=>{$('master').hidden=true;clearInput();canvas.focus()};$('cleanView').onclick=$('cleanMaster').onclick=enterClean;
$('studioBoard').onclick=()=>openWorldMenu();$('closeWorldMenu').onclick=closeWorldMenu;
for(const button of document.querySelectorAll('[data-world-tab]'))button.onclick=()=>showWorldMenuTab(button.dataset.worldTab);
$('boardGuide').onclick=()=>worldGuide?.open();
document.querySelectorAll('[data-bg]').forEach(button=>button.onclick=()=>{if(selected===GUEST_SKIN)return;const value=button.dataset.bg;world.setBackdrop(value);if(roomSocket?.readyState===WebSocket.OPEN)roomSocket.send(JSON.stringify({type:'backdrop',value}));notify(value+' 背景に切替');});
$('crownToggle').onclick=()=>{if(selected===GUEST_SKIN)return;cacheCharacter(selected,{...cachedCharacter(),crownEnabled:!crownEnabled});pendingCrown[selected]=crownEnabled;safeSave('raft-character-crown-pending',JSON.stringify(pendingCrown));if(roomSocket?.readyState===WebSocket.OPEN&&roomSelfId)roomSocket.send(JSON.stringify({type:'crown-toggle',enabled:crownEnabled}));};
$('saveDuelGoal').onclick=()=>{if(selected===GUEST_SKIN)return;const value=Number($('duelGoal').value);if(!Number.isInteger(value)||value<1||value>100){notify('合計ダメージは1〜100の整数にしてください');return;}if(roomSocket?.readyState!==WebSocket.OPEN||!roomSelfId){notify('設定を保存するにはサーバーに接続してください');return;}$('saveDuelGoal').disabled=true;$('duelSettingsStatus').textContent='サーバーに保存中…';roomSocket.send(JSON.stringify({type:'duel-settings',goalDamage:value}));};
$('stopAthletic').onclick=stopCourse;
$('cycleToggle').onclick=()=>requestCycle(!dayCycle.enabled);$('saveDayMinutes').onclick=()=>requestCycle();
$('flashlightToggle').onclick=()=>{flashlightEnabled=!flashlightEnabled;if(selected!==GUEST_SKIN){flashlightPending=true;safeSave('raft-flashlight-enabled',String(flashlightEnabled));safeSave('raft-flashlight-pending','true');}updateClockControls();if(roomSocket?.readyState===WebSocket.OPEN&&roomSelfId)roomSocket.send(JSON.stringify({type:'flashlight-toggle',enabled:flashlightEnabled}));};
$('boardSession').onclick=()=>{closeWorldMenu();openMenu();};
$('boardMaster').onclick=()=>{closeWorldMenu();openMaster();};

$('actorSelect').onchange=e=>setSelected(+e.target.value);$('gesture').onchange=e=>{gesture=e.target.value==='idle'?'none':e.target.value;scheduleShare()};
$('showCast').onchange=e=>{showCast=e.target.checked;updateVisibility();scheduleShare()};$('resetPosition').onclick=()=>{if(duelActive){notify('試合中は位置をリセットできません');return;}placeActors();notify('位置を戻しました')};$('cameraMode').onchange=e=>{setCameraMode(e.target.value);scheduleShare()};
$('cameraReset').onclick=()=>{yaw=(actors[selected]?.root.rotation.y||0)+Math.PI;pitch=-.08;if(cameraMode==='free'||cameraMode==='first')setCameraMode('orbit');scheduleShare();notify('正面カメラ')};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));document.querySelectorAll('[data-panel]').forEach(x=>x.hidden=x.dataset.panel!==b.dataset.tab)});
function range(id,callback,format){$(id).oninput=e=>{const value=+e.target.value;$(id+'Out').textContent=format(value);callback(value)}}
range('distance',v=>{distance=v;scheduleShare()},v=>v.toFixed(1)+' m');range('fov',v=>{fov=v;camera.fov=v;camera.updateProjectionMatrix();scheduleShare()},v=>v+'°');range('smoothing',v=>{smoothing=v;scheduleShare()},v=>v.toFixed(2)+' s');range('flySpeed',v=>{flySpeed=v;scheduleShare()},v=>v+' m/s');range('moveSpeed',v=>{moveSpeed=v;scheduleShare()},v=>v.toFixed(1)+' m/s');
range('wind',v=>{environment?.setSettings({wind:v});scheduleShare()},v=>v.toFixed(2));range('grassDensity',v=>{environment?.setSettings({grassDensity:v});scheduleShare()},v=>Math.round(v*100)+'%');range('sunHeight',v=>{environment?.setSettings({sunHeight:v});scheduleShare()},v=>v+'°');range('exposure',v=>{environment?.setSettings({exposure:v});scheduleShare()},v=>v.toFixed(2));
function quality(level){activeQuality=level;environment?.setSettings({quality:level});renderer?.setPixelRatio(Math.min(devicePixelRatio,level==='high'?1.75:level==='medium'?1.25:1));resize()}
$('quality').onchange=e=>{qualityChoice=e.target.value;quality(qualityChoice==='auto'?(touch?'medium':'high'):qualityChoice);slowSeconds=0;scheduleShare()};
let mouseSensitivity=Number(safeRead('vrs-mouse-sensitivity')||1);if(!Number.isFinite(mouseSensitivity))mouseSensitivity=1;mouseSensitivity=clamp(mouseSensitivity,.2,3);
$('mouseSensitivity').value=String(mouseSensitivity);$('mouseSensitivityOut').textContent=mouseSensitivity.toFixed(2)+'×';$('mouseSensitivity').oninput=e=>{mouseSensitivity=Number(e.target.value);$('mouseSensitivityOut').textContent=mouseSensitivity.toFixed(2)+'×';safeSave('vrs-mouse-sensitivity',String(mouseSensitivity));};
let mirrorTravelMode=safeRead('vrs-mirror-travel-mode')==='classic'?'classic':'seamless';
$('mirrorTravelMode').value=mirrorTravelMode;$('mirrorTravelMode').onchange=e=>{mirrorTravelMode=e.target.value==='classic'?'classic':'seamless';safeSave('vrs-mirror-travel-mode',mirrorTravelMode);housingView?.portals.setTravelMode(mirrorTravelMode);notify(mirrorTravelMode==='classic'?'鏡をクラシック移動にしました':'鏡をシームレス移動にしました');};
function look(dx,dy){if(!inStudio){lobbyYaw+=dx*.008;return}if(paused())return;yaw-=dx*(touch?.004:.0025*mouseSensitivity);pitch=clamp(pitch-dy*(touch?.0035:.002*mouseSensitivity),-1.15,1.1);scheduleShare()}
canvas.addEventListener('pointerdown',e=>{canvas.focus();if(housingEditor?.active){housingEditor.pointerDown(e);return;}if(inStudio&&!paused()&&!localRagdoll&&!duelActive&&housingEditor?.clickBoard(e))return;if(e.pointerType==='touch'&&!touch)mobileUI(true);else if(e.pointerType==='mouse'&&touch&&matchMedia('(any-pointer:fine)').matches)mobileUI(false);if(lookId!==null)return;lookId=e.pointerId;lookX=e.clientX;lookY=e.clientY;pointerStart.x=lookX;pointerStart.y=lookY;try{if(document.pointerLockElement!==canvas)canvas.setPointerCapture(e.pointerId);}catch{}if(inStudio&&!paused()&&document.pointerLockElement!==canvas){pointerPunchTarget=remotePlayerAt(e.clientX,e.clientY);if(e.button===0||e.pointerType==='touch')beginCharge()}if(clean&&e.pointerType==='touch'){cleanTimer=setTimeout(()=>{setClean(false);lookId=null},650)}});
canvas.addEventListener('pointermove',e=>{if(housingEditor?.pointerMove(e))return;if(document.pointerLockElement===canvas){look(e.movementX,e.movementY);return}if(e.pointerId!==lookId)return;const dx=e.clientX-lookX,dy=e.clientY-lookY;lookX=e.clientX;lookY=e.clientY;if(Math.hypot(lookX-pointerStart.x,lookY-pointerStart.y)>8){clearTimeout(cleanTimer);pointerPunchTarget=null;cancelCharge()}look(dx,dy)});
canvas.addEventListener('pointerup',e=>{if(housingEditor?.pointerUp(e))return;if(e.pointerId!==lookId)return;lookId=null;clearTimeout(cleanTimer);if(document.pointerLockElement===canvas)return;const click=Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)<8;if(cameraReturnMode()){pointerPunchTarget=null;if(click&&(e.button===0||e.pointerType==='touch'))requestCameraReturn();return;}if(pointerPunchTarget){const targetId=pointerPunchTarget;pointerPunchTarget=null;if(click)launchPunch(targetId);else cancelCharge();return}if(charging){if(click)launchPunch();else cancelCharge();}});
canvas.addEventListener('pointercancel',e=>{if(housingEditor?.pointerUp(e,true))return;lookId=null;clearTimeout(cleanTimer);if(pointerPunchTarget){pointerPunchTarget=null;cancelCharge()}});canvas.addEventListener('lostpointercapture',()=>lookId=null);canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('mousedown',e=>{if(e.button!==0||document.pointerLockElement!==canvas)return;e.preventDefault();beginCharge()});
document.addEventListener('mouseup',e=>{if(e.button!==0||document.pointerLockElement!==canvas)return;if(cameraReturnMode()){requestCameraReturn();return;}launchPunch()});
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas)cancelCharge()});
canvas.addEventListener('wheel',e=>{if(housingEditor?.wheel(e))return;if(inStudio&&!paused()&&(cameraMode==='follow'||cameraMode==='orbit')){e.preventDefault();distance=clamp(distance+e.deltaY*.006,2,18);$('distance').value=distance;$('distanceOut').textContent=distance.toFixed(1)+' m'}},{passive:false});
// Pointer lock is opt-in: keep the cursor available for the trackpad punch button.
canvas.addEventListener('dblclick',()=>{if(inStudio&&!paused()&&!touch){try{canvas.requestPointerLock?.()?.catch(()=>{});}catch{}}});
const joy=$('moveStick');function updateStick(e){let x=(e.clientX-stickCenter.x)/40,y=(e.clientY-stickCenter.y)/40;const length=Math.hypot(x,y);if(length>1){x/=length;y/=length}stick.x=length<.1?0:x;stick.y=length<.1?0:y;$('stickKnob').style.transform=`translate(${x*35}px,${y*35}px)`}
joy.addEventListener('pointerdown',e=>{if(stickId!==null)return;stickId=e.pointerId;const r=joy.getBoundingClientRect();stickCenter.x=r.left+r.width/2;stickCenter.y=r.top+r.height/2;joy.setPointerCapture(e.pointerId);updateStick(e);e.preventDefault()});joy.addEventListener('pointermove',e=>{if(stickId===e.pointerId)updateStick(e)});function releaseStick(e){if(e.pointerId!==stickId)return;stickId=null;stick.x=stick.y=0;$('stickKnob').style.transform=''};['pointerup','pointercancel','lostpointercapture'].forEach(type=>joy.addEventListener(type,releaseStick));$('jumpBtn').onpointerdown=e=>{e.preventDefault();requestJump()};
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){e.preventDefault();requestJump()}},true);
const punchBtn=$('punchBtn');
punchBtn.onpointerdown=e=>{e.preventDefault();punchBtn.setPointerCapture(e.pointerId);beginCharge()};
['pointerup','pointercancel','lostpointercapture'].forEach(type=>punchBtn.addEventListener(type,()=>{if(cameraReturnMode()){if(type==='pointerup')requestCameraReturn();return;}launchPunch();}));
addEventListener('keydown',e=>{if(worldChat?.key(e))return;if(housingEditor?.key(e))return;if(e.code==='F1'){e.preventDefault();if(!e.repeat)openMaster();return}if(e.code==='Escape'){e.preventDefault();if(worldGuide?.active){worldGuide.close()}else if(clean){setClean(false);unlocked()}else if(!$('worldMenu').hidden){closeWorldMenu()}else if(!$('master').hidden){$('master').hidden=true;unlocked();canvas.focus()}else if(!$('menu').hidden){$('menu').hidden=true;clearInput();canvas.focus()}else if(inStudio)openMenu();return}if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.code==='KeyH'&&inStudio&&!e.repeat){e.preventDefault();if(clean)setClean(false);else enterClean();return}if(!inStudio||paused())return;if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code)}});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{clearInput();lastTime=0});
function updateRoomStatus(message){$('roomStatus').textContent=message}
const brownProjectiles=createBrownProjectiles(scene,{world:()=>world,targets:()=>actors.flatMap((actor,index)=>actor&&index!==selected&&actor.root.visible&&!protectedFromHit(bodies[index],time)?[{index,position:actor.root.position,height:actor.collisionShape?.height||1.9}]:[]),onLocalHit:(index,shot)=>{const body=bodies[index];if(protectedFromHit(body,time))return;body.vel.set(shot.vx*.8,4,shot.vz*.8);body.ragdoll=true;body.hit=createHit(.2);body.grounded=false;body.inArena=insideArena(actors[index].root.position);actors[index].root.rotation.y=Math.atan2(-shot.vx,-shot.vz);},onImpact:position=>{particleOrigin.set(position.x,position.y,position.z);emitParticles(particleOrigin,'#ad7844',10,2,5);}});
function clearRemoteActors(){remoteActors.forEach(entry=>entry.actor.dispose());remoteActors.clear();remoteLoading.clear();brownProjectiles.clear();housingView?.recordAudio.clear();housingView?.hydrateFurnitureStates([])}
function removeRemotePlayer(id){remoteLoading.delete(id);const entry=remoteActors.get(id);if(entry){entry.actor.dispose();remoteActors.delete(id)}}
function updateRemotePlayer(player){
  if(!player?.id||player.id===roomSelfId||!roomSocket)return;
  let entry=remoteActors.get(player.id);
  if(entry&&entry.skin!==player.skin){removeRemotePlayer(player.id);entry=null;}
  if(entry){if((player.hitSerial||0)<(entry.hitSerial||0)){player={...player,ragdoll:entry.ragdoll,sleeping:entry.sleeping,hitPhase:entry.hitPhase,hitTime:entry.hitTime,hitDownTime:entry.hitDownTime,hitRecovery:entry.hitRecovery,hitStrength:entry.hitStrength,hitSerial:entry.hitSerial};}entry.actor.reactHit(player.flinchSerial,player.flinchStrength,Math.max(0,(Date.now()-(player.flinchAt||0))/1000));entry.hitSerial=player.hitSerial||0;entry.target.set(player.x,player.y,player.z);if(entry.actor.root.position.distanceToSquared(entry.target)>900)entry.actor.root.position.copy(entry.target);entry.velocity.set(player.vx||0,player.vy||0,player.vz||0);entry.receivedAt=performance.now();entry.yaw=player.yaw;entry.headYaw=player.headYaw;entry.headPitch=player.headPitch;entry.speed=player.speed;entry.grounded=player.grounded;entry.verticalSpeed=player.verticalSpeed;entry.gesture=player.gesture;entry.flight=player.flight;entry.ragdoll=player.ragdoll;entry.seated=player.seated;entry.sleeping=player.sleeping;entry.crownEnabled=player.crownEnabled;entry.attackRushing=player.attackRushing;entry.punchCharge=player.punchCharge;entry.attackDuration=player.attackDuration;entry.hitPhase=player.hitPhase;entry.hitTime=player.hitTime;entry.hitDownTime=player.hitDownTime;entry.hitRecovery=player.hitRecovery;entry.hitStrength=player.hitStrength;entry.attackKind=player.attackKind||0;entry.attackProgress=player.attackProgress||0;entry.attackStrength=player.attackStrength||0;entry.attackSerial=player.attackSerial||0;entry.appearanceLevel=player.appearanceLevel??Math.max(-8,player.score||0);entry.actor.setAppearance(entry.appearanceLevel,player.crownEnabled);return}
  if(remoteLoading.has(player.id)){remoteLoading.set(player.id,player);return}
  remoteLoading.set(player.id,player);
  const loadingSocket=roomSocket,index=playableSkin(player.skin);
  playerAvatar(index).then(actor=>{
    const latest=remoteLoading.get(player.id);
    if(!latest||roomSocket!==loadingSocket){actor.dispose();return}
    remoteLoading.delete(player.id);actor.root.position.set(latest.x,latest.y,latest.z);actor.root.rotation.y=latest.yaw;scene.add(actor.root);
    actor.reactHit(latest.flinchSerial,latest.flinchStrength,Math.max(0,(Date.now()-(latest.flinchAt||0))/1000));actor.setAppearance(latest.appearanceLevel??Math.max(-8,latest.score||0),latest.crownEnabled);
    remoteActors.set(player.id,{actor,appearanceLevel:latest.appearanceLevel??Math.max(-8,latest.score||0),hitSerial:latest.hitSerial||0,punchCharge:latest.punchCharge||0,attackRushing:latest.attackRushing,attackDuration:latest.attackDuration,hitPhase:latest.hitPhase,hitTime:latest.hitTime,hitDownTime:latest.hitDownTime,hitRecovery:latest.hitRecovery,hitStrength:latest.hitStrength,attackKind:latest.attackKind||0,attackProgress:latest.attackProgress||0,attackStrength:latest.attackStrength||0,attackSerial:latest.attackSerial||0,effectSerial:0,skin:latest.skin,seated:latest.seated,sleeping:latest.sleeping,crownEnabled:latest.crownEnabled,target:new THREE.Vector3(latest.x,latest.y,latest.z),velocity:new THREE.Vector3(latest.vx||0,latest.vy||0,latest.vz||0),renderTarget:new THREE.Vector3(),receivedAt:performance.now(),yaw:latest.yaw,headYaw:latest.headYaw,headPitch:latest.headPitch,speed:latest.speed,grounded:latest.grounded,verticalSpeed:latest.verticalSpeed,gesture:latest.gesture,flight:latest.flight,ragdoll:latest.ragdoll});
    updateRoomStatus(`${roomCode} · ${remoteActors.size+1}/${MAX_PLAYERS}人`);
  }).catch(error=>{remoteLoading.delete(player.id);console.error('remote skin load failed',error)});
}
function handleRoomMessage(socket,event){
  let message;try{message=JSON.parse(event.data)}catch{return}
  if(worldChat?.receive(message))return;
  if(message.type==='server-update'){updateNotice.show();return;}
  if(message.type==='projectile-spawn'){brownProjectiles.spawn(message.projectile);return;}
  if(message.type==='projectile-impact'){brownProjectiles.finish(message);return;}
  if(message.type==='projectile-cancel'){brownProjectiles.cancelPrediction(message.owner,message.serial);return;}
  if(message.type==='guest-denied'){if(message.id===roomSelfId)notify(message.message);return;}
  if(message.type==='house-state'){housingEditor?.receive(message);return;}
  if(message.type==='piano-play'||message.type==='instrument-play'){housingView?.playInstrument(message,actors[selected]?.root.position);return;}
  if(message.type==='furniture-event'){housingView?.receiveFurnitureEvent(message,actors[selected]?.root.position);return;}
  if(message.type==='record-state'){housingView?.recordAudio.receive(message);return;}
  if(message.type==='world'){if(message.version&&message.version!==SYNC_VERSION)updateNotice.show();world?.setBackdrop(message.backdrop);if(message.cycle){dayCycle=cleanCycle(message.cycle);if(Number.isFinite(message.serverNow))serverOffset=message.serverNow-Date.now();updateClockControls();}if(message.records)housingView?.recordAudio.hydrate(message.records);if(message.furnitureStates)housingView?.hydrateFurnitureStates(message.furnitureStates);if(Number.isInteger(message.goalDamage)){goalDamage=message.goalDamage;updateDuelSettings();}if(message.duel)receiveDuel(message.duel);return;}
  if(message.type==='cycle-saved'){updateClockControls();notify('昼夜設定をサーバーに保存しました');return;}
  if(message.type==='cycle-error'){updateClockControls();notify(message.message);return;}
  if(message.type==='flashlight-state'&&message.id===roomSelfId){flashlightEnabled=message.enabled;flashlightPending=false;if(selected!==GUEST_SKIN){safeSave('raft-flashlight-enabled',String(flashlightEnabled));safeSave('raft-flashlight-pending','false');}updateClockControls();return;}
  if(message.type==='flashlight-error'&&message.id===roomSelfId){notify(message.message);return;}
  if(message.type==='character-state'){const skin=Number(message.skin);if(Number.isInteger(skin)&&skin>=0&&skin<8){receiveCharacter(skin,message.character);for(const remote of remoteActors.values())if(remote.skin===skin){remote.crownEnabled=message.character.crownEnabled;remote.appearanceLevel=message.character.appearanceLevel??Math.max(-8,message.character.score||0);remote.actor.setAppearance(remote.appearanceLevel,remote.crownEnabled);}}return;}
  if(message.type==='character-save-error'){notify(message.message,8000);return;}
  if(message.type==='character-select-rejected'&&message.id===roomSelfId){selected=message.skin;crownScore=cachedCharacter().score;crownEnabled=cachedCharacter().crownEnabled;updateSelection();updateVisibility();updateCrown();notify(message.reason||'試合・被弾中はキャラクターを変更できません');return;}
  if(message.type==='settings-saved'){goalDamage=message.goalDamage;updateDuelSettings();$('saveDuelGoal').disabled=selected===GUEST_SKIN;notify(`次の試合：${goalDamage}ダメージ · サーバーに保存しました`);return;}
  if(message.type==='settings-error'){$('saveDuelGoal').disabled=false;$('duelSettingsStatus').textContent=message.message;notify(message.message);return;}
  if(message.type==='duel-ready'){if(message.id===roomSelfId)notify('準備OK · 相手も1秒以内にパンチ');return;}
  if(message.type==='duel-start'){receiveDuel(message,true);return;}
  if(message.type==='duel-damage'){receiveDuel(message);return;}
  if(message.type==='duel-cancel'){duelActive=false;duelIds=[];$('duelHud').hidden=true;notify(message.reason);return;}
  if(message.type==='duel-result'){
    for(const [id,score]of Object.entries(message.scores)){if(id===roomSelfId){crownScore=score;updateCrown();}else{const r=remoteActors.get(id);if(r)r.actor.setAppearance(message.appearances?.[id]??r.appearanceLevel??Math.max(-8,score),r.crownEnabled);}}
    if(message.practice)notify('練習試合が終了 · 同じキャラクター同士のため記録変更なし',4000);else if(message.winner===roomSelfId)notify(selected===GUEST_SKIN?'勝利！ ゲストの記録は変更なし':'勝利！ '+battleRecord()+' · スコア '+crownScore,4500);else if(message.loser===roomSelfId)notify(selected===GUEST_SKIN?'敗北 · ゲストの記録は変更なし':'敗北 · '+battleRecord()+' · スコア '+crownScore,4500);else notify('タイマン決着！',3000);
    duelActive=false;duelIds=[];$('duelHud').hidden=true;return;
  }
  if(message.type==='punch'){
    const impulse=message.velocity;if(!impulse||![impulse.x,impulse.y,impulse.z].every(Number.isFinite))return;
    if(message.knockdown===false){
      const target=message.target===roomSelfId?actors[selected]:remoteActors.get(message.target)?.actor;
      if(target){target.reactHit(message.flinchSerial,message.strength);particleOrigin.copy(target.root.position);particleOrigin.y+=1;combatEffects.impact(particleOrigin,.12);}
      return;
    }
    if(message.attacker===roomSelfId){targetLock=null;attackRushing=false;chainRemaining=0;}
    const freeze=clamp(message.freeze||.12,.06,.4),strength=message.strength??Math.min(1,Math.hypot(impulse.x,impulse.y,impulse.z)/65);
    for(const [id,position]of [[message.target,message.targetPosition],[message.attacker,message.attackerPosition]]){
      const r=remoteActors.get(id);if(r){if(position){r.target.set(position.x,position.y,position.z);r.actor.root.position.copy(r.target);}r.impact={start:performance.now(),duration:freeze,strength};r.velocity.set(0,0,0);r.receivedAt=performance.now();}
      if(id===roomSelfId){if(position)actors[selected].root.position.set(position.x,position.y,position.z);freezeImpact(freeze,strength);}
    }
    const remote=remoteActors.get(message.target);if(remote){remote.ragdoll=true;remote.sleeping=false;remote.seated=false;remote.hitPhase='impact';remote.hitTime=0;remote.hitDownTime=0;remote.hitRecovery=0;remote.hitStrength=strength;remote.hitSerial=message.hitSerial||0;remote.yaw=Math.atan2(-impulse.x,-impulse.z);remote.receivedAt=performance.now();particleOrigin.copy(remote.actor.root.position);particleOrigin.y+=1;combatEffects.impact(particleOrigin,remote.hitStrength);}
    if(message.target===roomSelfId){
      if(housingEditor?.active)housingEditor.close();
      localHitSerial=message.hitSerial??localHitSerial;
      const p=actors[selected].root;knockbackInArena=Math.hypot(p.position.x-ARENA.x,p.position.z-ARENA.z)<ARENA.radius;
      seated=false;seat=null;sleeping=false;bed=null;seatCooldown=time+2;pendingAttack=null;queuedAttack=null;punchSwing=0;cancelCharge();localImpulse.set(clamp(impulse.x,-84,84),clamp(impulse.y,-30,30),clamp(impulse.z,-84,84));localRagdoll=true;localLandedAt=0;localHit=createHit(localImpulse.length()/65);localHit.phase='impact';p.rotation.y=Math.atan2(-impulse.x,-impulse.z);if(cameraMode==='first'){restoreHitCamera='first';setCameraMode('follow');}airWalk=false;updateJumpButton();velocity.set(0,0,0);
      particleOrigin.copy(p.position);particleOrigin.y+=1;combatEffects.impact(particleOrigin,localHit.strength);
    }return;
  }
  if(message.type==='joined'){
    if(message.version!==SYNC_VERSION){updateNotice.show();roomFailure='ページと同期サーバーの版が一致しません';notify('ページと同期サーバーの版が違います。サーバーを更新・再起動し、ページを再読み込みしてください。',12000);roomSocket?.close(1000,'update server');updateRoomStatus(roomFailure);return;}
    roomSelfId=message.self.id;actors[selected]?.resetHitReaction();localHitSerial=message.self.hitSerial||0;if(flashlightPending&&selected!==GUEST_SKIN)roomSocket.send(JSON.stringify({type:'flashlight-toggle',enabled:flashlightEnabled}));else flashlightEnabled=message.self.flashlightEnabled!==false;updateClockControls();
    housingEditor?.hydrate(message.houses);worldChat?.hydrate(message.chat);
    for(const projectile of message.projectiles||[])brownProjectiles.spawn(projectile);
    for(const [skin,record]of Object.entries(message.characters||{}))receiveCharacter(Number(skin),record);receiveCharacter(selected,message.self);
    const own=actors[selected]?.root;if(own){own.position.set(message.self.x,message.self.y,message.self.z);own.rotation.y=message.self.yaw}
    if(athleticActive&&courseAwaitingSave){athleticCheckpoint=world.athletic.checkpoints[cachedCharacter().checkpoint-1];respawnCourse();}courseAwaitingSave=false;
    (message.players||[]).forEach(updateRemotePlayer);updateRoomStatus(`${roomCode} · ${remoteActors.size+remoteLoading.size+1}/${MAX_PLAYERS}人`);scheduleShare();return;
  }
  if(message.type==='player-joined'||message.type==='state'){updateRemotePlayer(message.player);updateRoomStatus(`${roomCode} · ${remoteActors.size+remoteLoading.size+1}/${MAX_PLAYERS}人`);return}
  if(message.type==='player-left'){removeRemotePlayer(message.id);updateRoomStatus(`${roomCode} · ${Math.max(1,remoteActors.size+remoteLoading.size+1)}/${MAX_PLAYERS}人`)}
}
function connectRoom(){
  const code='共通ルーム';roomFailure='';
  if(!SYNC_ENDPOINT){updateRoomStatus('同期サーバー未設定');notify('Cloudflare WorkerのURL設定後に接続できます');return}
  const old=roomSocket;roomSocket=null;if(old)old.close();clearRemoteActors();roomSelfId='';roomCode=code;updateRoomStatus(`${code} · 接続中`);
  try{
    const endpoint=new URL(SYNC_ENDPOINT);endpoint.protocol=endpoint.protocol==='https:'?'wss:':endpoint.protocol==='http:'?'ws:':endpoint.protocol;endpoint.searchParams.delete('code');endpoint.searchParams.set('skin',String(selected));endpoint.searchParams.set('profile',profile);endpoint.searchParams.set('crown',crownEnabled?'1':'0');
    const socket=new WebSocket(endpoint);roomSocket=socket;
    socket.addEventListener('open',()=>{if(roomSocket===socket)updateRoomStatus(`${code} · 入室処理中`)});
    socket.addEventListener('message',event=>{if(roomSocket===socket)handleRoomMessage(socket,event)});
    socket.addEventListener('error',()=>{if(roomSocket===socket)updateRoomStatus('接続エラー · URLと公開設定を確認')});
    socket.addEventListener('close',()=>{if(roomSocket!==socket)return;housingEditor?.disconnected();worldChat?.disconnected();roomSocket=null;roomSelfId='';roomCode='';clearRemoteActors();updateRoomStatus(roomFailure||'未接続');scheduleShare()});
  }catch(error){roomSocket=null;roomCode='';updateRoomStatus('接続先URLが正しくありません');console.error(error)}
}
function leaveRoom(){if(housingEditor?.active)housingEditor.close();housingEditor?.disconnected();duelActive=false;duelIds=[];$('duelHud').hidden=true;const socket=roomSocket;roomSocket=null;roomSelfId='';roomCode='';clearRemoteActors();if(socket)socket.close(1000,'left room');updateRoomStatus('未接続');scheduleShare()}
$('roomLeave').onclick=leaveRoom;
function bindFlightControl(id,key){const button=$(id);button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);if(key==='ascend')flightAscend=true;else flightDescend=true};const stop=()=>{if(key==='ascend')flightAscend=false;else flightDescend=false};['pointerup','pointercancel','lostpointercapture'].forEach(type=>button.addEventListener(type,stop))}
bindFlightControl('flightUp','ascend');bindFlightControl('flightDown','descend');
function resize(){if(!renderer)return;renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()};addEventListener('resize',resize);visualViewport?.addEventListener('resize',resize);
function tick(now,backgroundDt=0){if(!backgroundDt)requestId=requestAnimationFrame(tick);if(document.hidden&&!backgroundDt){lastTime=0;return}const dt=backgroundDt||(lastTime?Math.min((now-lastTime)/1000,.05):.016);lastTime=now;time+=dt;fpsFrames++;
  const portalStart=actors[selected]?.root.position.clone();
  housingEditor?.update(dt,inStudio&&!paused()&&!localRagdoll&&!duelActive);
  worldGuide?.update(actors[selected]?.root.position,inStudio&&!paused()&&!clean&&!localRagdoll&&!duelActive&&!athleticActive&&['follow','first'].includes(cameraMode));
  if(localImpact){localImpact.time+=dt;if(localImpact.time>=localImpact.duration){verticalSpeed=localImpact.vertical;velocity.copy(localImpact.velocity);localImpact=null;if(localHit?.phase==='impact'){localHit.phase='air';localHit.elapsed=0;grounded=false;}}}
  for(const body of bodies)if(body.impact){body.impact.time+=dt;if(body.impact.time>=body.impact.duration){body.impact=null;body.hit.phase='air';body.hit.elapsed=0;body.grounded=false;}}
  if(charging){if(!canPunch())cancelCharge();else{chargeTime=Math.min(PUNCH.maxCharge,chargeTime+dt);updateChargeHud();if(now-lastChargeEffectAt>90){lastChargeEffectAt=now;const chargingActor=actors[selected]?.root;if(chargingActor){particleOrigin.copy(chargingActor.position);particleOrigin.y+=1.42;emitParticles(particleOrigin,chargeTime>8?'#ff825c':'#ffe06a',2,.65,0)}}}}
  if(punchSwing>0&&!localImpact){
    const q=attackTarget(targetLock),p=actors[selected].root.position;
    if(attackRushing){rushTime+=dt;if(!q||rushTime>2.4){attackRushing=false;if(rushTime>2.4){targetLock=null;chainRemaining=0;pendingAttack.targetId=null;}}else{const distance=Math.hypot(q.x-p.x,q.z-p.z);attackRushing=distance>2.25||Math.abs(q.y-p.y)>1.9;}}
    const spec=ATTACKS[attackKind];if(!attackRushing&&spec.jump&&pendingAttack&&!pendingAttack.jumpStarted&&grounded&&!airWalk){const jump=Math.min(spec.jump,athleticActive?7.95:10.4);attackDuration=spec.duration*jump/spec.jump;verticalSpeed=jump;grounded=false;standingOn=null;pendingAttack.jumpStarted=true;punchSwing=.001;}
    punchSwing=attackRushing?Math.min(.18,punchSwing+dt/attackDuration):punchSwing+dt/attackDuration;
    if(pendingAttack&&!pendingAttack.hit&&punchSwing>=spec.impact){pendingAttack.hit=true;if(!paused()&&!localRagdoll)attackImpact(pendingAttack.held,pendingAttack.targetId);}
    if(punchSwing>=1){punchSwing=0;pendingAttack=null;attackRushing=false;if(queuedAttack){const next=queuedAttack;queuedAttack=null;startAttack(next.held,next.targetId);}else if(chainRemaining>0&&attackTarget(targetLock)){chainRemaining--;startAttack(0,targetLock);}updateChargeHud();}
  }
  const actor=actors[selected],p=actor?.root;let speed=0,run=false;
  if(p){
    if(!inStudio){p.position.set(0,0,0);p.rotation.y=lobbyYaw;velocity.set(0,0,0);grounded=true}
    else{
      world.update(time,p.position,dayPhase(dayCycle,serverNow()));
      const enabled=!paused()&&!localRagdoll&&!localImpact;
      const mx=enabled?((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+stick.x):0;
      const my=enabled?((keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-stick.y):0;
      direction.set(Math.sin(yaw),0,Math.cos(yaw));right.set(-Math.cos(yaw),0,Math.sin(yaw));
      movement.copy(direction).multiplyScalar(my).addScaledVector(right,mx);if(movement.length()>1)movement.normalize();
      run=keys.has('ShiftLeft')||keys.has('ShiftRight')||(touch&&Math.hypot(stick.x,stick.y)>.94);
      if(world.inAthletic(p.position)&&!athleticActive){
        athleticActive=true;courseAwaitingSave=!roomSelfId;athleticCheckpoint=world.athletic.checkpoints[cachedCharacter().checkpoint-1];airWalk=false;verticalSpeed=0;grounded=false;athleticPeak=p.position.y;updateJumpButton();
        if(athleticCheckpoint.id>1||p.position.y>athleticCheckpoint.y+5)respawnCourse();else notify('アスレチック開始 · CHECK 1 · ジャンプ力1.5倍');
      }
      if(athleticActive&&airWalk){airWalk=false;updateJumpButton();}
      if((!paused()||localRagdoll)&&!localImpact){
        if(cameraMode==='free'){
          desired.copy(freePosition).addScaledVector(movement,dt*flySpeed*(run?2.5:1));desired.y=clamp(desired.y+((flightAscend||keys.has('Space')?1:0)-(flightDescend||keys.has('ShiftLeft')||keys.has('ShiftRight')?1:0))*dt*flySpeed,.25,510);freePosition.copy(world.cameraPosition(freePosition,desired));
        }else if(cameraMode!=='orbit'&&!seated&&!sleeping){
          if(targetLock&&movement.lengthSq()>.16){attackRushing=false;targetLock=null;chainRemaining=0;if(pendingAttack)pendingAttack.targetId=null;}
          const attacking=punchSwing>0;movement.multiplyScalar(moveSpeed*(run?1.65:1)*(airWalk?2.4:1)*(attacking?.25:charging?.6:1));velocity.lerp(movement,1-Math.exp(-dt*(movement.lengthSq()<.01?26:18)));
          const q=attackTarget(targetLock);if(attacking&&q){const dx=q.x-p.position.x,dz=q.z-p.position.z,d=Math.hypot(dx,dz);attackYaw=Math.atan2(dx,dz);p.rotation.y+=angleDelta(p.rotation.y,attackYaw)*(1-Math.exp(-dt*24));if(attackRushing&&d>1.95){const rush=Math.min(athleticActive?moveSpeed*1.65:18,Math.max(0,(d-1.85)/dt*.7));velocity.set(dx/d*rush,0,dz/d*rush);}else velocity.set(0,0,0);if(attackRushing&&grounded&&q.y-p.position.y>1.0){verticalSpeed=athleticActive?7.95:7.3;grounded=false;standingOn=null;}}
        }else velocity.set(0,0,0);
        if(sleeping){
          const current=world.bedById(bed?.id);if(!current){wakeFromBed();}else{bed=current;const offset=(actors[selected].collisionShape?.height||2)*.45;p.position.set(bed.x+Math.sin(bed.yaw)*offset,bed.y,bed.z+Math.cos(bed.yaw)*offset);p.rotation.y=bed.yaw;verticalSpeed=0;velocity.set(0,0,0);grounded=true;airWalk=false;jumpRequested=false;}
        }else if(seated){
          p.position.set(seat.x,seat.y-actors[selected].seatOffset,seat.z);p.rotation.y=seat.yaw;verticalSpeed=0;grounded=true;
        }else{
          const oldY=p.position.y;
          if(standingOn&&grounded&&!standingOn.disabled){p.position.x+=standingOn.deltaX||0;p.position.y+=standingOn.deltaY||0;p.position.z+=standingOn.deltaZ||0;}
          if(jumpRequested&&enabled&&grounded){verticalSpeed=5.3*(athleticActive?1.5:1);grounded=false;standingOn=null;}
          jumpRequested=false;
          const dash=ATTACKS[attackKind].dash||0;if(!targetLock&&punchSwing>.08&&punchSwing<.60&&dash&&!localRagdoll){const forward=Math.min(dash,athleticActive?moveSpeed*1.65:6)*Math.sin((punchSwing-.08)/.52*Math.PI);velocity.x=Math.sin(attackYaw)*forward+movement.x*.25;velocity.z=Math.cos(attackYaw)*forward+movement.z*.25;}
          if(airWalk){
            verticalSpeed=((flightAscend||keys.has('Space')?1:0)-(flightDescend||keys.has('ShiftLeft')||keys.has('ShiftRight')?1:0))*moveSpeed*2.4;
            physicsVelocity.set(velocity.x,verticalSpeed,velocity.z);world.move(p.position,physicsVelocity,dt,{lockedInArena:duelActive,shape:actorShape(actors[selected])});p.position.y=clamp(p.position.y,0,510);grounded=false;
          }else{
            if(localRagdoll){localImpulse.y-=PUNCH.gravity*dt;physicsVelocity.copy(localImpulse);}
            else{verticalSpeed-=15*dt;physicsVelocity.set(velocity.x,verticalSpeed,velocity.z);}
            const result=world.move(p.position,physicsVelocity,dt,{ragdoll:localRagdoll,insideArena:knockbackInArena,lockedInArena:duelActive,shape:actorShape(actors[selected],localRagdoll?localHit:null,p.rotation.y)});
            grounded=result.grounded;standingOn=result.body;verticalSpeed=physicsVelocity.y;
            if(localRagdoll){
              localImpulse.copy(physicsVelocity);
              const event=stepHit(localHit,dt,grounded,localImpulse);if(event==='spring'){grounded=false;standingOn=null;}else if(event==='done'){localRagdoll=false;localHit=null;localImpulse.set(0,0,0);if(restoreHitCamera){setCameraMode(restoreHitCamera);restoreHitCamera=null;}}
            }
            if(!localRagdoll&&time>seatCooldown){
              const sleepingBed=punchSwing===0?world.bedAt(p.position,oldY,verticalSpeed):null,found=sleepingBed?null:world.seatAt(p.position,oldY,verticalSpeed);
              if(sleepingBed){sleeping=true;bed=sleepingBed;seated=false;seat=null;velocity.set(0,0,0);verticalSpeed=0;standingOn=null;grounded=true;const offset=(actors[selected].collisionShape?.height||2)*.45;p.position.set(bed.x+Math.sin(bed.yaw)*offset,bed.y,bed.z+Math.cos(bed.yaw)*offset);p.rotation.y=bed.yaw;if(cameraMode==='first')setCameraMode('follow');notify('ベッドで休憩 · ジャンプで起きる');}
              else if(found){seated=true;seat=found;velocity.set(0,0,0);p.position.set(seat.x,seat.y-actors[selected].seatOffset,seat.z);notify('着席 · ジャンプで立つ');}
            }
          }
          speed=velocity.length();
          if(speed>.06&&!localRagdoll&&punchSwing===0){const facing=cameraMode==='first'?yaw:Math.atan2(velocity.x,velocity.z);p.rotation.y+=angleDelta(p.rotation.y,facing)*(1-Math.exp(-dt*13));}
          if(athleticActive){
            const cp=grounded?world.checkpointAt(p.position):null;
            if(cp&&cp.id>(athleticCheckpoint?.id||0)){athleticCheckpoint=cp;saveCheckpoint(cp.id);notify(cp.id===100?'CHECK 100！ クリア！':'CHECK '+cp.id+' / 100');}
            athleticPeak=Math.max(athleticPeak,p.position.y);
            if(world.lethal(p.position)||p.position.y<Math.max(athleticCheckpoint?.y||0,athleticPeak)-7)respawnCourse();
          }
        }
        for(let i=0;i<actors.length;i++){
          if(i===selected||!actors[i]||!actors[i].root.visible)continue;
          const body=bodies[i];if(!body.ragdoll)continue;
          if(body.impact)continue;
          body.vel.y-=18*dt;
          const result=world.move(actors[i].root.position,body.vel,dt,{ragdoll:true,insideArena:body.inArena,shape:actorShape(actors[i],body.hit,actors[i].root.rotation.y)});
          body.grounded=result.grounded;const previousPhase=body.hit?.phase,event=stepHit(body.hit,dt,body.grounded,body.vel);if(previousPhase==='air'&&body.hit?.phase==='down')body.protectedUntil=time+DOWN_PROTECTION_SECONDS;if(event==='spring')body.grounded=false;else if(event==='done'){body.ragdoll=false;body.hit=null;}
        }
      }
    }
    if(inStudio&&!paused()&&!localRagdoll&&!localImpact&&!duelActive&&!athleticActive&&!seated&&!sleeping&&!charging&&punchSwing===0&&['follow','first'].includes(cameraMode)){
      const travel=housingView?.portals.step(p.position,movement,actor.collisionShape?.height||1.9,time,portalStart);
      if(travel){p.position.copy(travel.position);if(travel.classic){const yawShift=angleDelta(p.rotation.y,travel.yaw);p.rotation.y=travel.yaw;yaw+=yawShift;velocity.set(0,0,0);localImpulse.set(0,0,0);movement.set(0,0,0);focus.copy(p.position);freePosition.copy(p.position);orbitTarget.copy(p.position);}else{p.rotation.y+=travel.yawDelta;yaw+=travel.yawDelta;velocity.applyMatrix3(travel.rotation);localImpulse.applyMatrix3(travel.rotation);movement.applyMatrix3(travel.rotation);focus.applyMatrix4(travel.matrix);camera.position.applyMatrix4(travel.matrix);freePosition.applyMatrix4(travel.matrix);orbitTarget.applyMatrix4(travel.matrix);}standingOn=null;targetLock=null;attackRushing=false;chainRemaining=0;queuedAttack=null;lastRoomStateAt=0;}
    }
    if(inStudio&&now-lastDashEffectAt>100){if(airWalk&&speed>.25){lastDashEffectAt=now;particleOrigin.copy(p.position);particleOrigin.y+=.9;particleOrigin.x-=velocity.x*.06;particleOrigin.z-=velocity.z*.06;emitParticles(particleOrigin,'#c9f0ff',2,.45,0)}else if(run&&speed>moveSpeed*1.2){lastDashEffectAt=now;particleOrigin.copy(p.position);emitParticles(particleOrigin,'#d8e7bc',2,.8,5)}}
    for(let i=0;i<actors.length;i++){const a=actors[i];if(!a||(!a.root.visible&&i!==selected))continue;const active=i===selected,body=bodies[i],fly=Math.hypot(body.vel.x,body.vel.z);a.update((active?localImpact:body.impact)?0:dt,{impactTime:(active?localImpact:body.impact)?.time||0,impactDuration:(active?localImpact:body.impact)?.duration||0,impactStrength:(active?localImpact:body.impact)?.strength||0,seated:active&&seated,sleeping:active&&sleeping,speed:active?speed:fly,run:active&&(run||attackRushing),grounded:active?grounded:body.grounded,verticalSpeed:active?verticalSpeed:body.vel.y,flight:active&&airWalk,ragdoll:active?localRagdoll:body.ragdoll,hitPhase:(active?localHit:body.hit)?.phase,hitTime:(active?localHit:body.hit)?.elapsed,hitDownTime:(active?localHit:body.hit)?.downTime,hitRecovery:(active?localHit:body.hit)?.recovery,hitStrength:(active?localHit:body.hit)?.strength,lookYaw:active&&punchSwing===0&&inStudio&&(cameraMode==='follow'||cameraMode==='first')?angleDelta(p.rotation.y,yaw):0,lookPitch:active&&inStudio&&(cameraMode==='follow'||cameraMode==='first')?-pitch:0,gesture:active?gesture:'none',attackRushing:active&&attackRushing,attackKind:active?attackKind:0,punchCharge:active&&charging&&punchSwing===0?chargeTime/PUNCH.maxCharge:0,punchSwing:active?punchSwing:0,time:time+i*.7})}
    if(housingEditor?.active){housingEditor.updateCamera(dt);}
    else if(!inStudio){
      const portrait=innerWidth<=600&&innerHeight>=580;camera.fov=45;target.set(0,1.08,0);desired.set(3,1.8,5.6);if(portrait){target.y=.22;desired.set(.15,1.4,5.1)}else{target.x=-1.25;desired.set(1.75,1.9,5.3)}camera.position.lerp(desired,1-Math.exp(-dt*7));camera.lookAt(target);camera.updateProjectionMatrix();
    }else{
      if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix()}
      if(cameraMode==='free'){camera.position.copy(freePosition);direction.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));target.copy(camera.position).add(direction);camera.lookAt(target)}
      else if(cameraMode==='first'){camera.position.copy(p.position);camera.position.y+=actors[selected].eyeHeight;direction.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));target.copy(camera.position).add(direction);camera.lookAt(target)}
      else{target.copy(cameraMode==='orbit'?orbitTarget:p.position);if(cameraMode!=='orbit'){const prone=proneWeight(localHit);if(sleeping&&bed){target.set(bed.x,bed.y+.4,bed.z);}else target.y+=actors[selected].focusHeight-prone*.85;target.x-=Math.sin(p.rotation.y)*prone*.7;target.z-=Math.cos(p.rotation.y)*prone*.7;}focus.lerp(target,smoothing<=.001?1:1-Math.exp(-dt/(localRagdoll?Math.min(.055,smoothing):smoothing)));focus.copy(world.cameraPosition(target,focus,.12));const d=distance*(camera.aspect<.8?1.12:1);desired.set(-Math.sin(yaw)*Math.cos(pitch)*d,-Math.sin(pitch)*d,-Math.cos(yaw)*Math.cos(pitch)*d).add(focus);desired.y=Math.max(.2,desired.y);camera.position.copy(world.cameraPosition(focus,desired));camera.lookAt(focus)}
    }
  }
  if(inStudio&&!housingEditor?.active)housingView?.portals.adjustCamera(camera);
  if(roomSocket?.readyState===WebSocket.OPEN&&p&&inStudio&&now-lastRoomStateAt>=33){lastRoomStateAt=now;roomSocket.send(JSON.stringify({type:'state',state:{mirrorRealm:housingView?.portals.realm||null,x:p.position.x,y:p.position.y,z:p.position.z,yaw:p.rotation.y,headYaw:clamp(angleDelta(p.rotation.y,yaw),-.95,.95),headPitch:clamp(-pitch,-.65,.7),vx:localImpact?0:localRagdoll?localImpulse.x:velocity.x,vy:localImpact?0:localRagdoll?localImpulse.y:verticalSpeed,vz:localImpact?0:localRagdoll?localImpulse.z:velocity.z,skin:playableSkin(selected),gesture,speed:velocity.length(),grounded,verticalSpeed,flight:airWalk,ragdoll:localRagdoll,seated,sleeping,crownEnabled,hitSerial:localHitSerial,hitPhase:localHit?.phase||'none',hitTime:localHit?.elapsed||0,hitDownTime:localHit?.downTime||0,hitRecovery:localHit?.recovery||0,hitStrength:localHit?.strength||0,punchCharge:charging?chargeTime/PUNCH.maxCharge:0,attackDuration,attackRushing,attackKind,attackProgress:punchSwing,attackStrength,attackSerial}}))}
  if(document.hidden)return;
  if(p&&inStudio&&!duelIds.length){const own={x:p.position.x,y:p.position.y,z:p.position.z,flight:airWalk,seated};const inRing=insideArena(own);$('duelHud').hidden=!inRing;if(inRing){const count=1+[...remoteActors.values()].filter(r=>insideArena({x:r.target.x,y:r.target.y,z:r.target.z,flight:r.flight,seated:r.seated})).length;$('duelHud').textContent=count===2?'対戦エリア · 2人 · 1秒以内に両者パンチで開始':`対戦エリア · ${count}人 / 2人で開始 · 金色の輪の内側`;}}
  remoteActors.forEach(remote=>{
    if(remote.impact&&(now-remote.impact.start)/1000>=remote.impact.duration)remote.impact=null;
    const impactTime=remote.impact?(now-remote.impact.start)/1000:0;
    const prediction=remote.impact?0:clamp((now-remote.receivedAt)/1000,0,.1);
    remote.renderTarget.copy(remote.target).addScaledVector(remote.velocity,prediction);
    remote.actor.root.position.lerp(remote.renderTarget,1-Math.exp(-dt*30));remote.actor.root.rotation.y+=angleDelta(remote.actor.root.rotation.y,remote.yaw)*(1-Math.exp(-dt*30));
    remote.actor.root.visible=inStudio&&remote.actor.root.position.distanceToSquared(camera.position)<8100;if(!remote.actor.root.visible)return;
    const spec=ATTACKS[remote.attackKind||0],progress=remote.attackProgress?remote.attackProgress+prediction/(remote.attackDuration||spec.duration):0;
    if(progress>=spec.impact&&remote.effectSerial!==remote.attackSerial){remote.effectSerial=remote.attackSerial;if(remote.attackStrength>=.1)shockwave(remote.actor.root.position,remote.attackStrength);}
    remote.actor.update(remote.impact?0:dt,{punchCharge:remote.punchCharge,impactTime,impactDuration:remote.impact?.duration||0,impactStrength:remote.impact?.strength||0,attackRushing:remote.attackRushing,attackKind:remote.attackKind,punchSwing:progress<1?progress:0,seated:remote.seated,sleeping:remote.sleeping,speed:remote.speed,run:remote.speed>moveSpeed*1.2,grounded:remote.grounded,verticalSpeed:remote.verticalSpeed,flight:remote.flight,ragdoll:remote.ragdoll,hitPhase:remote.hitPhase,hitTime:remote.hitTime+prediction,hitDownTime:(remote.hitDownTime||0)+(remote.hitPhase==='down'?prediction:0),hitRecovery:remote.hitRecovery+(remote.hitPhase==='recover'?prediction/1.02:0),hitStrength:remote.hitStrength,lookYaw:remote.headYaw,lookPitch:remote.headPitch,gesture:remote.gesture,time});
    combatEffects.attack(remote.actor,remote.attackKind,remote.ragdoll?0:progress,remote.attackSerial,remote.attackStrength,remote.attackRushing,dt);
  });
  const locked=attackTarget(targetLock),showLock=locked&&p&&inStudio&&!clean&&performance.now()-lastComboAt<3000;lockMarker.visible=!!showLock;if(showLock){lockMarker.position.copy(locked).y+=.04;const index=targetLock.startsWith('cast:')?Number(targetLock.slice(5)):remoteActors.get(targetLock)?.skin;$('targetHud').textContent='LOCK ON · '+(skinDefs[index]?.[0]||'PLAYER')+' · '+p.position.distanceTo(locked).toFixed(1)+'m';}$('targetHud').hidden=!showLock;
  if(p&&inStudio)combatEffects.attack(actors[selected],attackKind,localRagdoll?0:punchSwing,attackSerial,attackStrength,attackRushing,dt);
  combatEffects.update(dt);brownProjectiles.update();updateParticles(dt);updateShockwaves(dt);world.cull(camera.position);housingView?.cull(camera.position,touch);const phase=dayPhase(dayCycle,serverNow());environment.update(time,inStudio?(cameraMode==='free'?camera.position:p?.position||focus):focus.set(0,0,0),phase);world.setNight(environment.settings.night);housingView?.update(dt,time,camera,renderer,inStudio?p?.position:null,touch,actors[selected]?.root,phase,serverNow);flashlight.intensity=inStudio&&flashlightEnabled&&p?38*(environment.settings.night||0):0;if(flashlight.intensity>0&&p){camera.getWorldDirection(flashlightDirection);flashlight.position.copy(p.position).y+=actors[selected].eyeHeight-.12;flashlight.position.addScaledVector(flashlightDirection,.35);flashlight.target.position.copy(flashlight.position).addScaledVector(flashlightDirection,20);}if(now-clockHudAt>200&&!$('worldMenu').hidden){clockHudAt=now;$('gameClock').textContent='ゲーム内時刻 '+clockLabel(phase)+' · '+(dayCycle.enabled?'1日 '+dayCycle.duration/60+'分':'ずっと昼');}renderer.render(scene,camera);if(inStudio&&!housingEditor?.active)housingView?.portals.renderViews(renderer,camera,{mobile:touch,roots:[actors[selected]?.root,...[...remoteActors.values()].map(remote=>remote.actor.root)]});
  if(now-metricsAt>=1000){fps=fpsFrames*1000/Math.max(1,now-metricsAt);fpsFrames=0;metricsAt=now;$('performance').textContent=`${Math.round(fps)} fps · ${activeQuality==='high'?'高画質':activeQuality==='medium'?'標準':'軽量'} · 描画 ${renderer.info.render.calls} 回`;if(qualityChoice==='auto'&&fps<34){slowSeconds++;if(slowSeconds>=5&&activeQuality!=='low'){quality(activeQuality==='high'?'medium':'low');slowSeconds=0}}else slowSeconds=0;
    canvas.dataset.telemetry=JSON.stringify({selected,screen:inStudio?'studio':'lobby',touch,clean,cameraMode,athleticActive,checkpoint:athleticCheckpoint?.id,seated,duelActive,duelDamage,hitPhase:localHit?.phase||'none',hitRecovery:localHit?.recovery||0,attackRushing,targetLock,chainRemaining,attackKind,attackProgress:punchSwing,attackSerial,attackStrength,crownScore,crownEnabled,position:p?.position.toArray(),bodyYaw:p?.rotation.y,yaw,pitch,speed,grounded,camera:camera.position.toArray(),room:roomCode,roomPlayers:roomSelfId?remoteActors.size+1:remoteActors.size,remotePositions:[...remoteActors.values()].map(remote=>remote.target.toArray()),fps:Math.round(fps),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,quality:activeQuality});
  }
}
function shareSource(){const query=new URLSearchParams(location.search);const hash=location.hash.replace(/^#/,'');if(hash.includes('='))new URLSearchParams(hash).forEach((value,key)=>{if(!query.has(key))query.set(key,value)});return query}
function currentShare(){const settings=environment?.settings||{};return {c:String(selected),cam:cameraMode,d:distance.toFixed(1),fov:String(fov),smooth:smoothing.toFixed(2),fly:String(flySpeed),move:moveSpeed.toFixed(1),quality:qualityChoice,gesture:gesture==='none'?'idle':gesture,yaw:yaw.toFixed(3),pitch:pitch.toFixed(3),wind:(settings.wind??.45).toFixed(2),grass:(settings.grassDensity??.8).toFixed(2),sun:String(Math.round(settings.sunHeight??50)),exp:(settings.exposure??1).toFixed(2),punch:`${PUNCH.maxCharge},${PUNCH.maxRange}`,cast:showCast?'1':'0'}}
function scheduleShare(){clearTimeout(shareTimer);shareTimer=setTimeout(()=>{const url=new URL(location.href);url.searchParams.delete('room');Object.entries(currentShare()).forEach(([key,value])=>url.searchParams.set(key,value));history.replaceState(null,'',url)},120)}
function applyShare(){
  const query=shareSource();const pick=(key,min,max,fallback)=>{if(!query.has(key))return fallback;const value=Number(query.get(key));return Number.isFinite(value)?clamp(value,min,max):fallback};
  if(query.has('punch')){const [held,range]=query.get('punch').split(',').map(Number);if(held>0)PUNCH.maxCharge=clamp(held,1,10);if(range>0)PUNCH.maxRange=clamp(range,1,1000)}
  const character=playableSkin(query.get('c')??selected);if(actors[character])selected=character;
  distance=pick('d',2,18,distance);fov=pick('fov',25,90,fov);camera.fov=fov;camera.updateProjectionMatrix();
  smoothing=pick('smooth',0,.4,smoothing);flySpeed=pick('fly',1,12,flySpeed);moveSpeed=pick('move',1,4.5,moveSpeed);pitch=pick('pitch',-1.15,1.1,pitch);const sharedYaw=Number(query.get('yaw'));if(Number.isFinite(sharedYaw))yaw=angleDelta(0,sharedYaw);
  $('distance').value=distance;$('distanceOut').textContent=distance.toFixed(1)+' m';$('fov').value=fov;$('fovOut').textContent=fov+'°';$('smoothing').value=smoothing;$('smoothingOut').textContent=smoothing.toFixed(2)+' s';$('flySpeed').value=flySpeed;$('flySpeedOut').textContent=flySpeed+' m/s';$('moveSpeed').value=moveSpeed;$('moveSpeedOut').textContent=moveSpeed.toFixed(1)+' m/s';
  if(['auto','low','medium','high'].includes(query.get('quality'))){qualityChoice=query.get('quality');$('quality').value=qualityChoice;quality(qualityChoice==='auto'?(touch?'medium':'high'):qualityChoice)}
  if(['idle','wave','cheer'].includes(query.get('gesture'))){const sharedGesture=query.get('gesture');gesture=sharedGesture==='idle'?'none':sharedGesture;$('gesture').value=sharedGesture}
  if(query.has('cam'))setCameraMode(query.get('cam'));
  if(query.has('cast')){showCast=query.get('cast')!=='0';$('showCast').checked=showCast}
  const wind=pick('wind',0,2,.45),grass=pick('grass',.15,1,.8),sun=pick('sun',8,82,50),exposure=pick('exp',.65,1.6,1);
  environment.setSettings({wind,grassDensity:grass,sunHeight:sun,exposure});
  $('wind').value=wind;$('windOut').textContent=wind.toFixed(2);$('grassDensity').value=grass;$('grassDensityOut').textContent=Math.round(grass*100)+'%';$('sunHeight').value=sun;$('sunHeightOut').textContent=sun+'°';$('exposure').value=exposure;$('exposureOut').textContent=exposure.toFixed(2);
  updateSelection();updateVisibility();
}
 $('shareLink').onclick=async()=>{scheduleShare();try{const url=new URL(location.href);url.searchParams.delete('room');Object.entries(currentShare()).forEach(([key,value])=>url.searchParams.set(key,value));await navigator.clipboard.writeText(url.toString());notify(roomCode?'同じルームに参加するリンクをコピーしました':'撮影パラメーター付きリンクをコピーしました')}catch{notify('リンクをコピーできませんでした')}};
async function start(){try{
  const probe=document.createElement('canvas');
  if(!probe.getContext('webgl2')){
    if(!probe.getContext('webgl'))throw new Error('この端末ではWebGLを利用できません。iOSとSafariを更新してください。');
    activeQuality='low';qualityChoice='low';$('quality').value='low';notify('WebGL2非対応のため軽量画質で起動します',5000);
  }
  renderer=new THREE.WebGLRenderer({canvas,stencil:true,antialias:!touch,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  environment=createEnvironment(scene,renderer,{mobile:touch});await document.fonts.load('16px DotGothic16').catch(()=>{});world=createWorld(scene);environment.setSettings({wind:.45,grassDensity:.8,sunHeight:50,exposure:1});quality(activeQuality);
  housingView=createHousingRenderer(scene,world,{environment});
  housingView.portals.setTravelMode(mirrorTravelMode);
  worldGuide=createWorldGuide({world,onOpen(){setClean(false);unlocked();punchSwing=0;pendingAttack=null;clearInput();},onClose(){clearInput();canvas.focus();},isAllowed:()=>inStudio&&!paused()&&!localRagdoll&&!duelActive});
  housingEditor=createHouseEditor({scene,camera,canvas,world,view:housingView,getSkin:()=>selected,getPlayer:()=>actors[selected]?.root.position,isConnected:()=>roomSocket?.readyState===WebSocket.OPEN&&!!roomSelfId,send:message=>roomSocket.send(JSON.stringify(message)),notify,
    onOpen(){houseCameraState={mode:cameraMode,yaw,pitch,distance,free:freePosition.clone()};setClean(false);unlocked();punchSwing=0;pendingAttack=null;setCameraMode('free');},
    onClose(){if(houseCameraState){const saved=houseCameraState;houseCameraState=null;setCameraMode(saved.mode);yaw=saved.yaw;pitch=saved.pitch;distance=saved.distance;if(saved.mode==='free')freePosition.copy(saved.free);}clearInput();canvas.focus();}
  });
  let loadedCount=0;const skinFailures=[];
  const skinLoads=skinDefs.map(async([name,file],i)=>{await replaceSkin(i,skinURL(i))}).map((load,i)=>load.catch(error=>{skinFailures.push({index:i,error})}).finally(()=>{loadedCount++;if(!actors[selected])$('selectedName').textContent=`スキン読込 ${loadedCount}/9`}));
  const firstReady=Promise.any(skinLoads.map((load,index)=>load.then(()=>actors[index]?index:Promise.reject(new Error('No avatar')))));
  const preferredReady=skinLoads[selected].then(()=>actors[selected]?selected:firstReady,()=>firstReady);
  const readyIndex=await Promise.race([preferredReady,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Skin loading timed out')),10000))]);
  if(!actors[selected])selected=readyIndex;if(!actors[selected])throw Error('スキンを読み込めませんでした。');applyShare();crownScore=cachedCharacter().score;crownEnabled=cachedCharacter().crownEnabled;updateCrown();placeActors();updateSelection();updateVisibility();setCameraMode(shareSource().get('cam')||'follow');requestId=requestAnimationFrame(tick);
  Promise.all(skinLoads).then(()=>{skinFailures.forEach(({index,error})=>{characterButtons[index].disabled=true;console.error('skin load failed',skinDefs[index][0],error)});updateSelection();updateVisibility();if(skinFailures.length)notify('一部のスキンを読み込めませんでした。')});
}catch(error){console.error(error);$('loadError').hidden=false;$('loadError').textContent=`3Dスタジオを開始できませんでした。${error.message||'SafariのWebGL設定を確認してください。'}`}}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(requestId);clearInput();notify('描画が中断されました。復帰を待っています。',8000)});canvas.addEventListener('webglcontextrestored',()=>location.reload());
start();
// Browsers throttle hidden tabs. Advance only an in-progress impact/recovery
// in bounded physics steps so a spectator does not see a frozen upright body.
setInterval(()=>{const now=performance.now();if(!document.hidden){backgroundAt=0;return;}const elapsed=backgroundAt?clamp((now-backgroundAt)/1000,0,2):.05;backgroundAt=now;if(!localRagdoll&&!localImpact&&punchSwing===0)return;for(let left=elapsed;left>0;left-=.05)tick(now-left*1000,Math.min(.05,left));},50);
