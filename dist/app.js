import * as THREE from 'three';
import { createAvatar } from './avatar.js';
import { createEnvironment } from './environment.js';
import { createWorld } from './world.js';
import { SYNC_ENDPOINT } from './sync-config.js';

const $ = id => document.getElementById(id);
const clamp = THREE.MathUtils.clamp;
const angleDelta = (a,b) => Math.atan2(Math.sin(b-a),Math.cos(b-a));
const safeRead = key => {try{return localStorage.getItem(key)}catch{return null}};
const safeSave = (key,value) => {try{localStorage.setItem(key,value);return true}catch{return false}};
const skinDefs = [['ウィーク','week.png'],['もろん','moron.png'],['やんさん','やんさん.png'],['ラフト','raft.png'],['ムート','muto.png'],['まい','maiのコピー.png'],['たぬつな','1000001207.png']];
const castOrder=[3,5,6,2,4,1,0];
let selected=clamp(Number(safeRead('raft-studio-character')??3),0,6), inStudio=false, clean=false;
let touch = matchMedia('(pointer:coarse)').matches;
let cameraMode='follow',yaw=0,pitch=-.14,lobbyYaw=.35;
let distance=5.5,fov=55,smoothing=.14,flySpeed=4,moveSpeed=2.8,gesture='none',showCast=false;
let renderer,environment,world,requestId,lastTime=0,time=0,metricsAt=0,fpsFrames=0,fps=60;
let activeQuality=touch?'low':'high',qualityChoice='auto',slowSeconds=0,cleanTimer=0,pendingClean=0;
const PUNCH={maxCharge:10,maxRange:1000,tapRange:8,reach:2.25,radius:1.2,gravity:18,angle:24*Math.PI/180};
const canvas=$('scene'),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1,.05,2600);
const particleLimit=touch?72:144,particleGeometry=new THREE.SphereGeometry(1,5,4),particleMaterial=new THREE.MeshBasicMaterial({color:0xffffff,vertexColors:true,transparent:true,opacity:.82,depthWrite:false,blending:THREE.AdditiveBlending});
const particleMesh=new THREE.InstancedMesh(particleGeometry,particleMaterial,particleLimit),particleTransform=new THREE.Object3D(),particleColor=new THREE.Color();
const particles=Array.from({length:particleLimit},()=>({position:new THREE.Vector3(),velocity:new THREE.Vector3(),color:new THREE.Color(),life:0,duration:1,gravity:0}));
const particleOrigin=new THREE.Vector3();
let particleCursor=0,lastChargeEffectAt=0,lastDashEffectAt=0;
particleMesh.frustumCulled=false;particleMesh.name='Pooled action particles';
for(let index=0;index<particleLimit;index++){particleTransform.scale.setScalar(0);particleTransform.updateMatrix();particleMesh.setMatrixAt(index,particleTransform.matrix)}
scene.add(particleMesh);
camera.rotation.order='YXZ';camera.position.set(1.75,1.9,5.3);
const actors=new Array(8),velocity=new THREE.Vector3(),focus=new THREE.Vector3(),target=new THREE.Vector3(),desired=new THREE.Vector3(),direction=new THREE.Vector3(),right=new THREE.Vector3(),movement=new THREE.Vector3();
const orbitTarget=new THREE.Vector3(),freePosition=new THREE.Vector3();
let verticalSpeed=0,grounded=true,stickId=null,lookId=null,lookX=0,lookY=0,jumpRequested=false;
const bodies=Array.from({length:8},()=>({vel:new THREE.Vector3(),grounded:true,travelRemaining:0,ragdoll:false,landedAt:0}));
let charging=false,chargeTime=0,punchSwing=0,chargeLevelShown=-1,shareTimer=0;
let roomSocket=null,roomCode='',roomSelfId='',lastRoomStateAt=0;
const remoteActors=new Map(),remoteLoading=new Map();
let airWalk=false,lastJumpTapAt=-Infinity,flightAscend=false,flightDescend=false;
const localImpulse=new THREE.Vector3();
let localRagdoll=false,localLandedAt=0;
let crownEnabled=false,crownScore=0,crownMesh=null,athleticCheckpoint=null,athleticActive=false,seated=false,duelReadyAt=0,duelActive=false,duelDamage=0;
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
const cameraDescriptions={follow:'WASDで移動。飛行中はSpaceで上昇、Shiftで下降。画面上の相手を長押しで狙ってパンチ。',first:'WASDで移動、マウスで視線。飛行中はSpaceで上昇、Shiftで下降。相手を長押しでパンチ。',orbit:'プレイヤーはその場に残り、マウスで周囲を回り込みます。ホイールで距離を調整。',free:'プレイヤーを残して撮影。WASDで移動、Spaceで上昇、Shiftで下降/水平加速。'};
function notify(message,duration=3000){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').hidden=true,duration)}
function emitParticles(position,color,count=10,speed=2,gravity=7){for(let index=0;index<count;index++){const particle=particles[particleCursor];particleCursor=(particleCursor+1)%particleLimit;particle.position.copy(position);particle.position.x+=(Math.random()-.5)*.16;particle.position.y+=(Math.random()-.5)*.12;particle.position.z+=(Math.random()-.5)*.16;const angle=Math.random()*Math.PI*2,vertical=Math.random()*1.4-.15;particle.velocity.set(Math.cos(angle)*speed*(.35+Math.random()),vertical*speed,Math.sin(angle)*speed*(.35+Math.random()));particle.color.set(color);particle.duration=.28+Math.random()*.38;particle.life=particle.duration;particle.gravity=gravity}}
function updateParticles(dt){for(let index=0;index<particles.length;index++){const particle=particles[index];if(particle.life>0){particle.life=Math.max(0,particle.life-dt);particle.position.addScaledVector(particle.velocity,dt);particle.velocity.y-=particle.gravity*dt;particle.velocity.multiplyScalar(Math.max(0,1-dt*1.8));const fade=particle.life/particle.duration;particleTransform.position.copy(particle.position);particleTransform.scale.setScalar((.025+fade*.065)*activeParticleScale());particleTransform.updateMatrix();particleMesh.setMatrixAt(index,particleTransform.matrix);particleColor.copy(particle.color).multiplyScalar(.3+fade*.8);particleMesh.setColorAt(index,particleColor)}else{particleTransform.scale.setScalar(0);particleTransform.updateMatrix();particleMesh.setMatrixAt(index,particleTransform.matrix)}}particleMesh.instanceMatrix.needsUpdate=true;if(particleMesh.instanceColor)particleMesh.instanceColor.needsUpdate=true}
function activeParticleScale(){return activeQuality==='low'?.72:1}
function mobileUI(value){touch=value;document.body.dataset.touch=String(touch);$('controlHelp').textContent=touch?'左スティックで移動、画面ドラッグで視点。相手を長押しで狙いパンチ、↑でジャンプ。':'WASD：移動 / Shift：走る / Space：ジャンプ / 相手を左クリック長押しで狙いパンチ / マウス：視点 / Esc：メニュー / F1：マスター';if(touch){$('master').hidden=true;if(cameraMode==='free'||cameraMode==='orbit')setCameraMode('follow')}}
mobileUI(touch);
matchMedia('(pointer:coarse)').addEventListener('change',e=>mobileUI(e.matches));
function clearInput(){keys.clear();stick.x=stick.y=0;stickId=lookId=null;jumpRequested=false;flightAscend=flightDescend=false;cancelCharge();$('stickKnob').style.transform='';clearTimeout(cleanTimer)}
function punchLevel(time){return Math.min(PUNCH.maxCharge,Math.floor(Math.max(0,time)))}
function punchDistance(time){const level=punchLevel(time);return level<=0?PUNCH.tapRange:level*(PUNCH.maxRange/PUNCH.maxCharge)}
function updateChargeHud(){const hud=$('chargeHud');if(!hud)return;const active=charging||punchSwing>0;hud.hidden=!inStudio||paused()||!active&&chargeTime<=0;const t=charging?chargeTime:0;const level=punchLevel(t);hud.dataset.level=String(level);hud.style.setProperty('--charge',String(clamp(t/PUNCH.maxCharge,0,1)));hud.style.setProperty('--charge-color',level>=8?'#ff7048':level>=4?'#ffd45e':'#9ce889');$('chargeFill').style.width=`${clamp(t/PUNCH.maxCharge,0,1)*100}%`;$('chargeLabel').textContent=charging?`溜め ${level} · ${Math.round(punchDistance(t))} m`:'パンチ';if(charging&&level!==chargeLevelShown)chargeLevelShown=level}
function cancelCharge(){charging=false;chargeTime=0;chargeLevelShown=-1;updateChargeHud()}
function updateJumpButton(){$('jumpBtn').textContent=airWalk?'✈':'↑';$('jumpBtn').setAttribute('aria-label',airWalk?'飛行中。連続2回タップで解除':'ジャンプ。連続2回タップで飛行');$('flightControls').hidden=!airWalk}
function requestJump(){
  if(!inStudio||paused()||(cameraMode!=='follow'&&cameraMode!=='first'))return;
  if(seated){seated=false;grounded=true;jumpRequested=true;notify('立ちました');return}
  const now=performance.now();
  if(now-lastJumpTapAt<360){
    if(world?.inAthletic(actors[selected]?.root.position||new THREE.Vector3())){notify('アスレチックゾーンでは飛行できません');lastJumpTapAt=-Infinity;return}
    airWalk=!airWalk;jumpRequested=false;
    if(airWalk){const player=actors[selected]?.root;if(player)player.position.y=Math.max(1.3,player.position.y);verticalSpeed=0;grounded=false;flightAscend=flightDescend=false}
    else if(!grounded)verticalSpeed=0;
    lastJumpTapAt=-Infinity;updateJumpButton();return;
  }
  lastJumpTapAt=now;if(!airWalk&&grounded)jumpRequested=true;
}
function canPunch(){return inStudio&&!paused()&&(cameraMode==='follow'||cameraMode==='first')}
function beginCharge(){if(inStudio&&(cameraMode==='free'||cameraMode==='orbit')){setCameraMode('follow');notify('パンチ操作でプレイヤー操作に戻りました');return}if(!canPunch()||charging||punchSwing>0)return;charging=true;chargeTime=0;chargeLevelShown=-1;updateChargeHud()}
function launchPunch(targetId=null){if(!charging)return;const held=chargeTime;charging=false;chargeLevelShown=-1;punchSwing=.001;applyPunch(held,targetId);particleOrigin.copy(actors[selected]?.root.position||particleOrigin.set(0,0,0));particleOrigin.y+=1.1;emitParticles(particleOrigin,'#fff0b0',10,2.5,1);chargeTime=0;updateChargeHud()}
function applyPunch(held,targetId=null){
  const actor=actors[selected],p=actor?.root;if(!p)return;
  const dist=punchDistance(held),speed=Math.sqrt(dist*PUNCH.gravity/Math.max(1e-4,Math.sin(2*PUNCH.angle)));
  const facing=new THREE.Vector3(Math.sin(p.rotation.y),0,Math.cos(p.rotation.y));
  const origin=p.position.clone();origin.y+=1.05;
  if(world?.boardHit(origin,facing)){openWorldMenu();notify('ワールドメニューボード');return}
  if(world&&Math.hypot(p.position.x-world.arena.center.x,p.position.z-world.arena.center.z)<world.arena.radius-1&&roomSocket?.readyState===WebSocket.OPEN){duelReadyAt=performance.now();roomSocket.send(JSON.stringify({type:'duel-ready'}));notify('対戦準備！ 相手も1秒以内にパンチで開始')}
  const aimedTarget=targetId?remoteActors.get(targetId):null;
  if(aimedTarget){const aimed=aimedTarget.target.clone().sub(origin);aimed.y=0;if(aimed.lengthSq()>.001)facing.copy(aimed.normalize())}
  for(let i=0;i<actors.length;i++){
    if(i===selected||!actors[i]||!actors[i].root.visible)continue;
    const target=actors[i].root.position,to=target.clone().sub(origin);to.y+=.9;
    const along=to.x*facing.x+to.z*facing.z,side=Math.abs(to.x*facing.z-to.z*facing.x);
    if(along<.15||along>PUNCH.reach+1.1||side>PUNCH.radius+.35||Math.hypot(to.x,to.z)>PUNCH.reach+1.35)continue;
    if(targetId)continue;
    const body=bodies[i];body.vel.set(facing.x*speed*Math.cos(PUNCH.angle),speed*Math.sin(PUNCH.angle),facing.z*speed*Math.cos(PUNCH.angle));body.travelRemaining=dist;body.grounded=false;body.ragdoll=true;body.landedAt=0;particleOrigin.copy(actors[i].root.position);particleOrigin.y+=.9;emitParticles(particleOrigin,'#ffe28a',18,3.2,2);
  }
  if(roomSocket?.readyState===WebSocket.OPEN){
    for(const [id,remote] of remoteActors){
      if(targetId&&id!==targetId)continue;
      const to=remote.target.clone().sub(origin);to.y+=.9;
      const along=to.x*facing.x+to.z*facing.z,side=Math.abs(to.x*facing.z-to.z*facing.x);
      if(along<.15||along>PUNCH.reach+1.1||side>PUNCH.radius+.35||Math.hypot(to.x,to.z)>PUNCH.reach+1.35)continue;
      roomSocket.send(JSON.stringify({type:'punch',target:id,damage:duelActive?Math.max(1,punchLevel(held)):0,velocity:{x:facing.x*speed*Math.cos(PUNCH.angle),y:speed*Math.sin(PUNCH.angle),z:facing.z*speed*Math.cos(PUNCH.angle)}}));
      particleOrigin.copy(remote.target);particleOrigin.y+=.9;emitParticles(particleOrigin,'#ffe28a',18,3.2,2);
    }
  }
}
function unlocked(){if(document.pointerLockElement)document.exitPointerLock();clearInput()}
function paused(){return !inStudio||!$('menu').hidden||!$('master').hidden||!$('worldMenu').hidden}
function setClean(value){const wasClean=clean;clearTimeout(pendingClean);pendingClean=0;clean=value;document.body.dataset.clean=String(value);$('menu').hidden=$('master').hidden=true;clearInput();if(wasClean&&!value)notify('操作表示に戻りました',1700)}
function enterClean(){if(pendingClean){clearTimeout(pendingClean);pendingClean=0;$('toast').hidden=true;return}notify(touch?'画面を長押しすると操作表示に戻れます':'H・Escで戻る / F1でマスターモード',2200);$('menu').hidden=$('master').hidden=true;canvas.focus();pendingClean=setTimeout(()=>{pendingClean=0;if(inStudio&&$('menu').hidden&&$('master').hidden)setClean(true)},1500)}
function openMenu(){setClean(false);unlocked();$('master').hidden=true;$('menu').hidden=false;$('resume').focus()}
function openMaster(){if(touch||!inStudio)return;const wasOpen=!$('master').hidden;setClean(false);unlocked();$('menu').hidden=true;$('master').hidden=wasOpen;if(!wasOpen)$('cameraMode').focus();else canvas.focus()}
function setCameraMode(mode){if(!['follow','first','orbit','free'].includes(mode))return;const p=actors[selected]?.root;if(mode==='orbit'&&p)orbitTarget.copy(p.position).add(new THREE.Vector3(0,1.15,0));if(mode==='free'){freePosition.copy(camera.position);camera.getWorldDirection(direction);yaw=Math.atan2(direction.x,direction.z);pitch=Math.asin(clamp(direction.y,-1,1))}cameraMode=mode;$('cameraMode').value=mode;$('cameraHelp').textContent=cameraDescriptions[mode];$('distance').disabled=mode==='first'||mode==='free';clearInput();updateVisibility()}
function updateVisibility(){actors.forEach((a,i)=>{if(a)a.root.visible=(i===selected&&(!inStudio||cameraMode!=='first'))||(inStudio&&showCast&&i!==selected)})}
function setSelected(index){if(!actors[index]){$('actorSelect').value=String(selected);return}selected=index;velocity.set(0,0,0);verticalSpeed=0;grounded=true;bodies[index].vel.set(0,0,0);bodies[index].grounded=true;bodies[index].travelRemaining=0;actors[index].root.position.y=0;safeSave('raft-studio-character',String(index));if(inStudio){setCameraMode('follow');focus.copy(actors[index].root.position).add(new THREE.Vector3(0,1.25,0));yaw=actors[index].root.rotation.y;pitch=-.14}updateCrown();updateSelection();updateVisibility();scheduleShare()}
function updateSelection(){$('selectedName').textContent=skinDefs[selected][0];$('sessionName').textContent=skinDefs[selected][0]+' · Meadow';$('enter').disabled=!actors[selected];$('actorSelect').value=String(selected);document.querySelectorAll('.character').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.index===selected)))}
function updateCrown(){if(crownMesh){crownMesh.removeFromParent();crownMesh=null}const actor=actors[selected];if(!actor||!crownEnabled)return;const crown=new THREE.Group(),gold=new THREE.MeshStandardMaterial({color:'#ffd84f',metalness:.65,roughness:.25});for(let i=0;i<5;i++){const tooth=new THREE.Mesh(new THREE.BoxGeometry(.23,.35+(i%2)*.15,.23),gold);tooth.position.set((i-2)*.25,.18+(i%2)*.07,0);crown.add(tooth)}const band=new THREE.Mesh(new THREE.BoxGeometry(1.35,.19,1.05),gold);band.position.y=-.08;crown.add(band);crown.position.set(0,2.18,0);crown.scale.y=1+Math.max(0,crownScore)*.08;crown.name='victory crown';actor.root.add(crown);crownMesh=crown}
function openWorldMenu(){setClean(false);unlocked();$('menu').hidden=true;$('master').hidden=true;$('worldMenu').hidden=false}
function closeWorldMenu(){$('worldMenu').hidden=true;canvas.focus()}
function placeActors(){actors.forEach((a,i)=>{if(a){if(i===selected){a.root.position.set(0,0,0);a.root.rotation.set(0,0,0)}else{const angle=i*2.399+.4,radius=3.4+(i%3)*.85;a.root.position.set(Math.sin(angle)*radius,0,Math.cos(angle)*radius+1.2);a.root.rotation.set(0,Math.atan2(-a.root.position.x,-a.root.position.z),0)}}bodies[i].vel.set(0,0,0);bodies[i].grounded=true;bodies[i].travelRemaining=0});velocity.set(0,0,0);verticalSpeed=0;grounded=true;airWalk=false;lastJumpTapAt=-Infinity;updateJumpButton();cancelCharge();punchSwing=0}
function enterStudio(){if(!actors[selected])return;const query=shareSource();inStudio=true;showCast=false;$('showCast').checked=false;document.body.dataset.screen='studio';$('lobby').hidden=true;$('hud').hidden=false;placeActors();focus.set(0,1.25,0);const sharedYaw=Number(query.get('yaw')),sharedPitch=Number(query.get('pitch'));yaw=query.has('yaw')&&Number.isFinite(sharedYaw)?angleDelta(0,sharedYaw):0;pitch=query.has('pitch')&&Number.isFinite(sharedPitch)?clamp(sharedPitch,-1.15,1.1):-.14;setCameraMode(query.get('cam')||'follow');updateVisibility();canvas.focus();notify(touch?'左スティックで移動。パンチを長押しで溜め':'左クリック長押しで溜めパンチ / 最大10秒で1km',3500);connectRoom();scheduleShare()}
function returnLobby(){leaveRoom();unlocked();setClean(false);inStudio=false;document.body.dataset.screen='lobby';$('hud').hidden=true;$('lobby').hidden=false;$('menu').hidden=$('master').hidden=true;gesture='none';$('gesture').value='idle';placeActors();updateSelection();updateVisibility();$('enter').focus()}
function makeFace(url,el){const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=c.height=32;c.className='face';c.setAttribute('aria-hidden','true');const q=c.getContext('2d');q.imageSmoothingEnabled=false;const s=img.width/64;q.drawImage(img,8*s,8*s,8*s,8*s,0,0,32,32);q.drawImage(img,40*s,8*s,8*s,8*s,0,0,32,32);el.replaceChildren(c)};img.src=url}
const faces=[],characterButtons=[];
castOrder.forEach(i=>{const [name,file]=skinDefs[i],b=document.createElement('button');b.className='character';b.dataset.index=i;b.setAttribute('aria-label',name+' を選択');b.setAttribute('aria-pressed',String(i===selected));const holder=document.createElement('span');holder.className='face';holder.textContent='＋';faces[i]=holder;characterButtons[i]=b;const label=document.createElement('span');label.textContent=name;b.append(holder,label);b.onclick=()=>setSelected(i);$('characters').append(b);$('actorSelect').add(new Option(name,String(i)));if(file)makeFace('skins/'+file,holder)});
async function replaceSkin(i,url){const actor=await createAvatar(url);const old=actors[i];if(old){actor.root.position.copy(old.root.position);actor.root.rotation.copy(old.root.rotation);scene.remove(old.root);old.dispose()}actors[i]=actor;scene.add(actor.root);makeFace(url,faces[i]);updateSelection();updateVisibility()}
$('enter').onclick=enterStudio;$('menuBtn').onclick=openMenu;$('resume').onclick=()=>{$('menu').hidden=true;clearInput();canvas.focus()};$('changeCharacter').onclick=$('masterCharacter').onclick=returnLobby;
$('openMaster').onclick=openMaster;$('closeMaster').onclick=()=>{$('master').hidden=true;clearInput();canvas.focus()};$('cleanView').onclick=$('cleanMaster').onclick=enterClean;
$('studioBoard').onclick=openWorldMenu;$('closeWorldMenu').onclick=closeWorldMenu;document.querySelectorAll('[data-bg]').forEach(button=>button.onclick=()=>{world?.setBackdrop(button.dataset.bg);notify(`${button.dataset.bg} 背景に切替`)});$('crownToggle').onclick=()=>{crownEnabled=!crownEnabled;updateCrown();$('crownToggle').textContent=`王冠：${crownEnabled?'ON':'OFF'}`};$('stopAthletic').onclick=()=>{athleticActive=false;airWalk=false;updateJumpButton();notify('アスレチックを終了しました')};
$('actorSelect').onchange=e=>setSelected(+e.target.value);$('gesture').onchange=e=>{gesture=e.target.value==='idle'?'none':e.target.value;scheduleShare()};
$('showCast').onchange=e=>{showCast=e.target.checked;updateVisibility();scheduleShare()};$('resetPosition').onclick=()=>{placeActors();notify('位置を戻しました')};$('cameraMode').onchange=e=>{setCameraMode(e.target.value);scheduleShare()};
$('cameraReset').onclick=()=>{yaw=(actors[selected]?.root.rotation.y||0)+Math.PI;pitch=-.08;if(cameraMode==='free'||cameraMode==='first')setCameraMode('orbit');scheduleShare();notify('正面カメラ')};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));document.querySelectorAll('[data-panel]').forEach(x=>x.hidden=x.dataset.panel!==b.dataset.tab)});
function range(id,callback,format){$(id).oninput=e=>{const value=+e.target.value;$(id+'Out').textContent=format(value);callback(value)}}
range('distance',v=>{distance=v;scheduleShare()},v=>v.toFixed(1)+' m');range('fov',v=>{fov=v;camera.fov=v;camera.updateProjectionMatrix();scheduleShare()},v=>v+'°');range('smoothing',v=>{smoothing=v;scheduleShare()},v=>v.toFixed(2)+' s');range('flySpeed',v=>{flySpeed=v;scheduleShare()},v=>v+' m/s');range('moveSpeed',v=>{moveSpeed=v;scheduleShare()},v=>v.toFixed(1)+' m/s');
range('wind',v=>{environment?.setSettings({wind:v});scheduleShare()},v=>v.toFixed(2));range('grassDensity',v=>{environment?.setSettings({grassDensity:v});scheduleShare()},v=>Math.round(v*100)+'%');range('sunHeight',v=>{environment?.setSettings({sunHeight:v});scheduleShare()},v=>v+'°');range('exposure',v=>{environment?.setSettings({exposure:v});scheduleShare()},v=>v.toFixed(2));
function quality(level){activeQuality=level;environment?.setSettings({quality:level});renderer?.setPixelRatio(Math.min(devicePixelRatio,level==='high'?1.75:level==='medium'?1.25:1));resize()}
$('quality').onchange=e=>{qualityChoice=e.target.value;quality(qualityChoice==='auto'?(touch?'medium':'high'):qualityChoice);slowSeconds=0;scheduleShare()};
function look(dx,dy){if(!inStudio){lobbyYaw+=dx*.008;return}if(paused())return;yaw-=dx*(touch?.004:.0025);pitch=clamp(pitch-dy*(touch?.0035:.002),-1.15,1.1);scheduleShare()}
canvas.addEventListener('pointerdown',e=>{canvas.focus();if(e.pointerType==='touch'&&!touch)mobileUI(true);else if(e.pointerType==='mouse'&&touch&&matchMedia('(any-pointer:fine)').matches)mobileUI(false);if(lookId!==null)return;lookId=e.pointerId;lookX=e.clientX;lookY=e.clientY;pointerStart.x=lookX;pointerStart.y=lookY;canvas.setPointerCapture(e.pointerId);if(inStudio&&!paused()&&document.pointerLockElement!==canvas){pointerPunchTarget=remotePlayerAt(e.clientX,e.clientY);if(pointerPunchTarget)beginCharge()}if(clean&&e.pointerType==='touch'){cleanTimer=setTimeout(()=>{setClean(false);lookId=null},650)}});
canvas.addEventListener('pointermove',e=>{if(document.pointerLockElement===canvas){look(e.movementX,e.movementY);return}if(e.pointerId!==lookId)return;const dx=e.clientX-lookX,dy=e.clientY-lookY;lookX=e.clientX;lookY=e.clientY;if(Math.hypot(lookX-pointerStart.x,lookY-pointerStart.y)>8){clearTimeout(cleanTimer);if(pointerPunchTarget){pointerPunchTarget=null;cancelCharge()}}look(dx,dy)});
canvas.addEventListener('pointerup',e=>{if(e.pointerId!==lookId)return;lookId=null;clearTimeout(cleanTimer);const click=Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)<8;if(pointerPunchTarget){const targetId=pointerPunchTarget;pointerPunchTarget=null;if(click)launchPunch(targetId);else cancelCharge();return}if(click&&inStudio&&!paused()&&e.pointerType==='mouse'&&e.button===0&&document.pointerLockElement!==canvas){try{const promise=canvas.requestPointerLock?.();promise?.catch(()=>{})}catch{}}});
canvas.addEventListener('pointercancel',()=>{lookId=null;clearTimeout(cleanTimer);if(pointerPunchTarget){pointerPunchTarget=null;cancelCharge()}});canvas.addEventListener('lostpointercapture',()=>lookId=null);canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('mousedown',e=>{if(e.button!==0||document.pointerLockElement!==canvas)return;e.preventDefault();beginCharge()});
document.addEventListener('mouseup',e=>{if(e.button!==0||document.pointerLockElement!==canvas)return;launchPunch()});
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas)cancelCharge()});
canvas.addEventListener('wheel',e=>{if(inStudio&&!paused()&&(cameraMode==='follow'||cameraMode==='orbit')){e.preventDefault();distance=clamp(distance+e.deltaY*.006,2,18);$('distance').value=distance;$('distanceOut').textContent=distance.toFixed(1)+' m'}},{passive:false});
const joy=$('moveStick');function updateStick(e){let x=(e.clientX-stickCenter.x)/40,y=(e.clientY-stickCenter.y)/40;const length=Math.hypot(x,y);if(length>1){x/=length;y/=length}stick.x=length<.1?0:x;stick.y=length<.1?0:y;$('stickKnob').style.transform=`translate(${x*35}px,${y*35}px)`}
joy.addEventListener('pointerdown',e=>{if(stickId!==null)return;stickId=e.pointerId;const r=joy.getBoundingClientRect();stickCenter.x=r.left+r.width/2;stickCenter.y=r.top+r.height/2;joy.setPointerCapture(e.pointerId);updateStick(e);e.preventDefault()});joy.addEventListener('pointermove',e=>{if(stickId===e.pointerId)updateStick(e)});function releaseStick(e){if(e.pointerId!==stickId)return;stickId=null;stick.x=stick.y=0;$('stickKnob').style.transform=''};['pointerup','pointercancel','lostpointercapture'].forEach(type=>joy.addEventListener(type,releaseStick));$('jumpBtn').onpointerdown=e=>{e.preventDefault();requestJump()};
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat){e.preventDefault();requestJump()}},true);
const punchBtn=$('punchBtn');
punchBtn.onpointerdown=e=>{e.preventDefault();punchBtn.setPointerCapture(e.pointerId);beginCharge()};
['pointerup','pointercancel','lostpointercapture'].forEach(type=>punchBtn.addEventListener(type,()=>launchPunch()));
addEventListener('keydown',e=>{if(e.code==='F1'){e.preventDefault();if(!e.repeat)openMaster();return}if(e.code==='Escape'){e.preventDefault();if(clean){setClean(false);unlocked()}else if(!$('master').hidden){$('master').hidden=true;unlocked();canvas.focus()}else if(!$('menu').hidden){$('menu').hidden=true;clearInput();canvas.focus()}else if(inStudio)openMenu();return}if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.code==='KeyH'&&inStudio&&!e.repeat){e.preventDefault();if(clean)setClean(false);else enterClean();return}if(!inStudio||paused())return;if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat)jumpRequested=true}});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{clearInput();lastTime=0});
function updateRoomStatus(message){$('roomStatus').textContent=message}
function clearRemoteActors(){remoteActors.forEach(entry=>entry.actor.dispose());remoteActors.clear();remoteLoading.clear()}
function removeRemotePlayer(id){remoteLoading.delete(id);const entry=remoteActors.get(id);if(entry){entry.actor.dispose();remoteActors.delete(id)}}
function updateRemotePlayer(player){
  if(!player?.id||player.id===roomSelfId||!roomSocket)return;
  let entry=remoteActors.get(player.id);
  if(entry){entry.target.set(player.x,player.y,player.z);entry.velocity.set(player.vx||0,player.vy||0,player.vz||0);entry.receivedAt=performance.now();entry.yaw=player.yaw;entry.headYaw=player.headYaw;entry.headPitch=player.headPitch;entry.speed=player.speed;entry.grounded=player.grounded;entry.verticalSpeed=player.verticalSpeed;entry.gesture=player.gesture;entry.flight=player.flight;entry.ragdoll=player.ragdoll;return}
  if(remoteLoading.has(player.id)){remoteLoading.set(player.id,player);return}
  remoteLoading.set(player.id,player);
  const loadingSocket=roomSocket,index=Number.isInteger(player.skin)&&player.skin>=0&&player.skin<7?player.skin:3;
  createAvatar(`skins/${skinDefs[index][1]}`).then(actor=>{
    const latest=remoteLoading.get(player.id);
    if(!latest||roomSocket!==loadingSocket){actor.dispose();return}
    remoteLoading.delete(player.id);actor.root.position.set(latest.x,latest.y,latest.z);actor.root.rotation.y=latest.yaw;scene.add(actor.root);
    remoteActors.set(player.id,{actor,target:new THREE.Vector3(latest.x,latest.y,latest.z),velocity:new THREE.Vector3(latest.vx||0,latest.vy||0,latest.vz||0),renderTarget:new THREE.Vector3(),receivedAt:performance.now(),yaw:latest.yaw,headYaw:latest.headYaw,headPitch:latest.headPitch,speed:latest.speed,grounded:latest.grounded,verticalSpeed:latest.verticalSpeed,gesture:latest.gesture,flight:latest.flight,ragdoll:latest.ragdoll});
    updateRoomStatus(`${roomCode} · ${remoteActors.size+1}/8人`);
  }).catch(error=>{remoteLoading.delete(player.id);console.error('remote skin load failed',error)});
}
function handleRoomMessage(socket,event){
  let message;try{message=JSON.parse(event.data)}catch{return}
  if(message.type==='duel-ready'){const p=actors[selected]?.root;if(p&&world&&message.id!==roomSelfId&&performance.now()-duelReadyAt<1000&&Math.hypot(p.position.x-world.arena.center.x,p.position.z-world.arena.center.z)<world.arena.radius-1){duelActive=true;duelDamage=0;notify('タイマン開始！ 合計11ダメージで敗北',3500)}return}
  if(message.type==='duel-result'){if(message.winner===roomSelfId){crownScore++;updateCrown();notify(`勝利！ 王冠が伸びた（${crownScore}勝）`,4000)}else{crownScore--;updateCrown();notify('敗北…王冠が縮みました',4000)}duelActive=false;duelDamage=0;return}
  if(message.type==='punch'){const impulse=message.velocity;if(!impulse||![impulse.x,impulse.y,impulse.z].every(Number.isFinite))return;if(message.target===roomSelfId){if(duelActive&&message.damage>0){duelDamage+=message.damage;notify(`タイマン ${duelDamage} / 11 ダメージ`);if(duelDamage>=11){roomSocket?.send(JSON.stringify({type:'duel-result',winner:message.attacker}));duelActive=false}}localImpulse.set(clamp(impulse.x,-160,160),clamp(impulse.y,-160,160),clamp(impulse.z,-160,160));localRagdoll=true;localLandedAt=0;airWalk=false;updateJumpButton();velocity.set(0,0,0);particleOrigin.copy(actors[selected]?.root.position||particleOrigin.set(0,0,0));particleOrigin.y+=1;emitParticles(particleOrigin,'#fff0b0',24,4,3)}else{const target=remoteActors.get(message.target);if(target){particleOrigin.copy(target.target);particleOrigin.y+=.9;emitParticles(particleOrigin,'#fff0b0',24,4,3)}}return}
  if(message.type==='joined'){
    roomSelfId=message.self.id;const own=actors[selected]?.root;if(own){own.position.set(message.self.x,message.self.y,message.self.z);own.rotation.y=message.self.yaw}
    (message.players||[]).forEach(updateRemotePlayer);updateRoomStatus(`${roomCode} · ${remoteActors.size+remoteLoading.size+1}/8人`);scheduleShare();return;
  }
  if(message.type==='player-joined'||message.type==='state'){updateRemotePlayer(message.player);updateRoomStatus(`${roomCode} · ${remoteActors.size+remoteLoading.size+1}/8人`);return}
  if(message.type==='player-left'){removeRemotePlayer(message.id);updateRoomStatus(`${roomCode} · ${Math.max(1,remoteActors.size+remoteLoading.size+1)}/8人`)}
}
function connectRoom(){
  const code='共通ルーム';
  if(!SYNC_ENDPOINT){updateRoomStatus('同期サーバー未設定');notify('Cloudflare WorkerのURL設定後に接続できます');return}
  const old=roomSocket;roomSocket=null;if(old)old.close();clearRemoteActors();roomSelfId='';roomCode=code;updateRoomStatus(`${code} · 接続中`);
  try{
    const endpoint=new URL(SYNC_ENDPOINT);endpoint.protocol=endpoint.protocol==='https:'?'wss:':endpoint.protocol==='http:'?'ws:':endpoint.protocol;endpoint.searchParams.delete('code');endpoint.searchParams.set('skin',String(selected<7?selected:3));
    const socket=new WebSocket(endpoint);roomSocket=socket;
    socket.addEventListener('open',()=>{if(roomSocket===socket)updateRoomStatus(`${code} · 入室処理中`)});
    socket.addEventListener('message',event=>{if(roomSocket===socket)handleRoomMessage(socket,event)});
    socket.addEventListener('error',()=>{if(roomSocket===socket)updateRoomStatus('接続エラー · URLと公開設定を確認')});
    socket.addEventListener('close',()=>{if(roomSocket!==socket)return;roomSocket=null;roomSelfId='';roomCode='';clearRemoteActors();updateRoomStatus('未接続');scheduleShare()});
  }catch(error){roomSocket=null;roomCode='';updateRoomStatus('接続先URLが正しくありません');console.error(error)}
}
function leaveRoom(){const socket=roomSocket;roomSocket=null;roomSelfId='';roomCode='';clearRemoteActors();if(socket)socket.close(1000,'left room');updateRoomStatus('未接続');scheduleShare()}
$('roomLeave').onclick=leaveRoom;
function bindFlightControl(id,key){const button=$(id);button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);if(key==='ascend')flightAscend=true;else flightDescend=true};const stop=()=>{if(key==='ascend')flightAscend=false;else flightDescend=false};['pointerup','pointercancel','lostpointercapture'].forEach(type=>button.addEventListener(type,stop))}
bindFlightControl('flightUp','ascend');bindFlightControl('flightDown','descend');
function resize(){if(!renderer)return;renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()};addEventListener('resize',resize);visualViewport?.addEventListener('resize',resize);
function tick(now){requestId=requestAnimationFrame(tick);if(document.hidden){lastTime=0;return}const dt=lastTime?Math.min((now-lastTime)/1000,.05):.016;lastTime=now;time+=dt;fpsFrames++;
  if(charging){if(!canPunch())cancelCharge();else{chargeTime=Math.min(PUNCH.maxCharge,chargeTime+dt);updateChargeHud();if(now-lastChargeEffectAt>90){lastChargeEffectAt=now;const chargingActor=actors[selected]?.root;if(chargingActor){particleOrigin.copy(chargingActor.position);particleOrigin.y+=1.42;emitParticles(particleOrigin,chargeTime>8?'#ff825c':'#ffe06a',2,.65,0)}}}}
  if(punchSwing>0){punchSwing+=dt/.26;if(punchSwing>=1)punchSwing=0}
  const actor=actors[selected],p=actor?.root;let speed=0,run=false;
  if(p){
    if(!inStudio){p.position.set(0,0,0);p.rotation.y=lobbyYaw;velocity.set(0,0,0);grounded=true}
    else{
      const enabled=!paused()&&!localRagdoll,mx=enabled?((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+stick.x):0,my=enabled?((keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-stick.y):0;
      direction.set(Math.sin(yaw),0,Math.cos(yaw));right.set(-Math.cos(yaw),0,Math.sin(yaw));movement.copy(direction).multiplyScalar(my).addScaledVector(right,mx);if(movement.length()>1)movement.normalize();run=keys.has('ShiftLeft')||keys.has('ShiftRight')||(touch&&Math.hypot(stick.x,stick.y)>.94);
      if(cameraMode==='free'){
        velocity.set(0,0,0);freePosition.addScaledVector(movement,dt*flySpeed*(run?2.5:1));if(enabled)freePosition.y+=((keys.has('Space')?1:0)-(keys.has('ShiftLeft')||keys.has('ShiftRight')?1:0))*dt*flySpeed;freePosition.y=clamp(freePosition.y,.25,70);
      }else if(cameraMode!=='orbit'){
        movement.multiplyScalar(moveSpeed*(run?1.65:1)*(airWalk?2.4:1));velocity.lerp(movement,1-Math.exp(-dt*(movement.lengthSq()>.01?10:16)));if(velocity.lengthSq()<.00005)velocity.set(0,0,0);p.position.addScaledVector(velocity,dt);world?.resolve(p.position);speed=velocity.length();const radius=Math.hypot(p.position.x,p.position.z);if(radius>180){p.position.x*=180/radius;p.position.z*=180/radius}if(speed>.06||cameraMode==='first'){const facing=cameraMode==='first'?yaw:Math.atan2(velocity.x,velocity.z);p.rotation.y+=angleDelta(p.rotation.y,facing)*(1-Math.exp(-dt*13))}
      }else velocity.set(0,0,0);
      if(world?.inAthletic(p.position)&&airWalk){airWalk=false;verticalSpeed=0;updateJumpButton();notify('アスレチックゾーン：飛行をOFFにしました')}
      if(airWalk){const verticalInput=(flightAscend||keys.has('Space')?1:0)-(flightDescend||keys.has('ShiftLeft')||keys.has('ShiftRight')?1:0);verticalSpeed=verticalInput*moveSpeed*2.4;p.position.y=clamp(p.position.y+verticalSpeed*dt,1.3,80);grounded=false}
      else if(jumpRequested&&enabled&&grounded&&(cameraMode==='follow'||cameraMode==='first')){verticalSpeed=5.3;grounded=false;particleOrigin.copy(p.position);emitParticles(particleOrigin,'#d8e7bc',9,1.5,5)}
      jumpRequested=false;
      if(!localRagdoll&&!airWalk&&!grounded){verticalSpeed-=15*dt;p.position.y+=verticalSpeed*dt;if(p.position.y<=0){const impactSpeed=Math.abs(verticalSpeed);p.position.y=0;verticalSpeed=0;grounded=true;particleOrigin.copy(p.position);emitParticles(particleOrigin,'#d8e7bc',Math.min(20,6+impactSpeed*2),2.4,5)}}
      if(localRagdoll){
        p.position.addScaledVector(localImpulse,dt);localImpulse.y-=PUNCH.gravity*dt;
        if(world){const dx=p.position.x-world.arena.center.x,dz=p.position.z-world.arena.center.z,d=Math.hypot(dx,dz);if(d>world.arena.radius-.55&&d<world.arena.radius+4){p.position.x=world.arena.center.x+dx/d*(world.arena.radius-.55);p.position.z=world.arena.center.z+dz/d*(world.arena.radius-.55);localImpulse.x*=-.28;localImpulse.z*=-.28}}
        if(p.position.y<=0){p.position.y=0;if(localImpulse.y<0)localImpulse.y*=-.12;localImpulse.x*=.68;localImpulse.z*=.68;grounded=true;if(Math.hypot(localImpulse.x,localImpulse.z)<.4&&Math.abs(localImpulse.y)<.65){localImpulse.set(0,0,0);if(!localLandedAt){localLandedAt=now;particleOrigin.copy(p.position);emitParticles(particleOrigin,'#d8e7bc',22,3,5)}}}else{grounded=false;localLandedAt=0}
        if(localLandedAt&&now-localLandedAt>=1000){localRagdoll=false;localLandedAt=0;grounded=true;verticalSpeed=0}
      }
      for(let i=0;i<actors.length;i++){
        if(i===selected||!actors[i])continue;
        const body=bodies[i],root=actors[i].root;
        if(body.grounded&&body.vel.lengthSq()<.0004){if(body.ragdoll){if(!body.landedAt)body.landedAt=now;if(now-body.landedAt>=1000){body.ragdoll=false;body.landedAt=0}}continue}
        body.vel.y-=PUNCH.gravity*dt;
        const stepX=body.vel.x*dt,stepZ=body.vel.z*dt,stepLength=Math.hypot(stepX,stepZ);
        if(stepLength>0){const travel=Math.min(stepLength,body.travelRemaining),scale=travel/stepLength;root.position.x+=stepX*scale;root.position.z+=stepZ*scale;body.travelRemaining-=travel;if(body.travelRemaining<=0)body.vel.x=body.vel.z=0}
        root.position.y+=body.vel.y*dt;
        const fly=Math.hypot(body.vel.x,body.vel.z);
        if(fly>.15)root.rotation.y+=angleDelta(root.rotation.y,Math.atan2(body.vel.x,body.vel.z))*(1-Math.exp(-dt*8));
        if(root.position.y<=0){
          root.position.y=0;
          if(body.vel.y<0){if(body.travelRemaining<=0){body.vel.y=0;body.grounded=true}else body.vel.y*=-.22}
          body.vel.x*=.62;body.vel.z*=.62;
          if(Math.hypot(body.vel.x,body.vel.z)<.45&&Math.abs(body.vel.y)<1.4){body.vel.set(0,0,0);body.grounded=true;if(body.ragdoll&&!body.landedAt){body.landedAt=now;particleOrigin.copy(root.position);emitParticles(particleOrigin,'#d8e7bc',18,2.8,5)}}
        }else body.grounded=false;
      }
    }
    if(inStudio&&world){world.update(time,p.position);const seat=world.seatAt(p.position);if(!seated&&seat&&p.position.y>.35&&!airWalk){p.position.set(seat.x,.55,seat.z);verticalSpeed=0;grounded=true;seated=true;notify('着席しました。ジャンプで立てます')}else if(!seat)seated=false;if(world.inAthletic(p.position)){athleticActive=true;for(const checkpoint of world.athletic.checkpoints)if(Math.hypot(p.position.x-checkpoint.x,p.position.z-checkpoint.z)<2.1)athleticCheckpoint=checkpoint;}}
    if(inStudio&&now-lastDashEffectAt>100){if(airWalk&&speed>.25){lastDashEffectAt=now;particleOrigin.copy(p.position);particleOrigin.y+=.9;particleOrigin.x-=velocity.x*.06;particleOrigin.z-=velocity.z*.06;emitParticles(particleOrigin,'#c9f0ff',2,.45,0)}else if(run&&speed>moveSpeed*1.2){lastDashEffectAt=now;particleOrigin.copy(p.position);emitParticles(particleOrigin,'#d8e7bc',2,.8,5)}}
    for(let i=0;i<actors.length;i++){const a=actors[i];if(!a||(!a.root.visible&&i!==selected))continue;const active=i===selected,body=bodies[i],fly=Math.hypot(body.vel.x,body.vel.z);a.update(dt,{speed:active?speed:fly,run:active&&run,grounded:active?grounded:body.grounded,verticalSpeed:active?verticalSpeed:body.vel.y,flight:active&&airWalk,ragdoll:active?localRagdoll:body.ragdoll,lookYaw:active&&inStudio&&(cameraMode==='follow'||cameraMode==='first')?angleDelta(p.rotation.y,yaw):0,lookPitch:active&&inStudio&&(cameraMode==='follow'||cameraMode==='first')?-pitch:0,gesture:active?gesture:'none',punchCharge:active&&charging?chargeTime/PUNCH.maxCharge:0,punchSwing:active?punchSwing:0,time:time+i*.7})}
    if(!inStudio){
      const portrait=innerWidth<=600&&innerHeight>=580;camera.fov=45;target.set(0,1.08,0);desired.set(3,1.8,5.6);if(portrait){target.y=.22;desired.set(.15,1.4,5.1)}else{target.x=-1.25;desired.set(1.75,1.9,5.3)}camera.position.lerp(desired,1-Math.exp(-dt*7));camera.lookAt(target);camera.updateProjectionMatrix();
    }else{
      if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix()}
      if(cameraMode==='free'){camera.position.copy(freePosition);direction.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));target.copy(camera.position).add(direction);camera.lookAt(target)}
      else if(cameraMode==='first'){camera.position.copy(p.position);camera.position.y+=1.68;direction.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));target.copy(camera.position).add(direction);camera.lookAt(target)}
      else{target.copy(cameraMode==='orbit'?orbitTarget:p.position);if(cameraMode!=='orbit')target.y+=1.24;focus.lerp(target,smoothing<=.001?1:1-Math.exp(-dt/smoothing));const d=distance*(camera.aspect<.8?1.12:1);desired.set(-Math.sin(yaw)*Math.cos(pitch)*d,-Math.sin(pitch)*d,-Math.cos(yaw)*Math.cos(pitch)*d).add(focus);desired.y=Math.max(.2,desired.y);camera.position.copy(desired);camera.lookAt(focus)}
    }
  }
  if(roomSocket?.readyState===WebSocket.OPEN&&p&&inStudio&&!paused()&&now-lastRoomStateAt>=33){lastRoomStateAt=now;roomSocket.send(JSON.stringify({type:'state',state:{x:p.position.x,y:p.position.y,z:p.position.z,yaw:p.rotation.y,headYaw:clamp(angleDelta(p.rotation.y,yaw),-.95,.95),headPitch:clamp(-pitch,-.65,.7),vx:localRagdoll?localImpulse.x:velocity.x,vy:localRagdoll?localImpulse.y:verticalSpeed,vz:localRagdoll?localImpulse.z:velocity.z,skin:selected<7?selected:3,gesture,speed:velocity.length(),grounded,verticalSpeed,flight:airWalk,ragdoll:localRagdoll}}))}
  remoteActors.forEach(remote=>{const prediction=clamp((now-remote.receivedAt)/1000,0,.1);remote.renderTarget.copy(remote.target).addScaledVector(remote.velocity,prediction);remote.actor.root.position.lerp(remote.renderTarget,1-Math.exp(-dt*30));remote.actor.root.rotation.y+=angleDelta(remote.actor.root.rotation.y,remote.yaw)*(1-Math.exp(-dt*30));remote.actor.update(dt,{speed:remote.speed,run:remote.speed>moveSpeed*1.2,grounded:remote.grounded,verticalSpeed:remote.verticalSpeed,flight:remote.flight,ragdoll:remote.ragdoll,lookYaw:remote.headYaw,lookPitch:remote.headPitch,gesture:remote.gesture,time})});
  updateParticles(dt);environment.update(time,inStudio?(cameraMode==='free'?camera.position:p?.position||focus):focus.set(0,0,0));renderer.render(scene,camera);
  if(now-metricsAt>=1000){fps=fpsFrames*1000/Math.max(1,now-metricsAt);fpsFrames=0;metricsAt=now;$('performance').textContent=`${Math.round(fps)} fps · ${activeQuality==='high'?'高画質':activeQuality==='medium'?'標準':'軽量'} · 描画 ${renderer.info.render.calls} 回`;if(qualityChoice==='auto'&&fps<34){slowSeconds++;if(slowSeconds>=5&&activeQuality!=='low'){quality(activeQuality==='high'?'medium':'low');slowSeconds=0}}else slowSeconds=0;
    canvas.dataset.telemetry=JSON.stringify({selected,screen:inStudio?'studio':'lobby',touch,clean,cameraMode,position:p?.position.toArray(),bodyYaw:p?.rotation.y,yaw,pitch,speed,grounded,camera:camera.position.toArray(),room:roomCode,roomPlayers:roomSelfId?remoteActors.size+1:remoteActors.size,remotePositions:[...remoteActors.values()].map(remote=>remote.target.toArray()),fps:Math.round(fps),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,quality:activeQuality});
  }
}
function shareSource(){const query=new URLSearchParams(location.search);const hash=location.hash.replace(/^#/,'');if(hash.includes('='))new URLSearchParams(hash).forEach((value,key)=>{if(!query.has(key))query.set(key,value)});return query}
function currentShare(){const settings=environment?.settings||{};return {c:String(selected),cam:cameraMode,d:distance.toFixed(1),fov:String(fov),smooth:smoothing.toFixed(2),fly:String(flySpeed),move:moveSpeed.toFixed(1),quality:qualityChoice,gesture:gesture==='none'?'idle':gesture,yaw:yaw.toFixed(3),pitch:pitch.toFixed(3),wind:(settings.wind??.45).toFixed(2),grass:(settings.grassDensity??.8).toFixed(2),sun:String(Math.round(settings.sunHeight??50)),exp:(settings.exposure??1).toFixed(2),punch:`${PUNCH.maxCharge},${PUNCH.maxRange}`,cast:showCast?'1':'0'}}
function scheduleShare(){clearTimeout(shareTimer);shareTimer=setTimeout(()=>{const url=new URL(location.href);url.searchParams.delete('room');Object.entries(currentShare()).forEach(([key,value])=>url.searchParams.set(key,value));history.replaceState(null,'',url)},120)}
function applyShare(){
  const query=shareSource();const pick=(key,min,max,fallback)=>{if(!query.has(key))return fallback;const value=Number(query.get(key));return Number.isFinite(value)?clamp(value,min,max):fallback};
  if(query.has('punch')){const [held,range]=query.get('punch').split(',').map(Number);if(held>0)PUNCH.maxCharge=held;if(range>0)PUNCH.maxRange=range}
  const character=clamp(Number(query.get('c')??selected),0,6);if(actors[character])selected=character;
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
  renderer=new THREE.WebGLRenderer({canvas,antialias:!touch,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  environment=createEnvironment(scene,renderer,{mobile:touch});world=createWorld(scene);environment.setSettings({wind:.45,grassDensity:.8,sunHeight:50,exposure:1});quality(activeQuality);
  let loadedCount=0;const skinFailures=[];
  const skinLoads=skinDefs.map(async([name,file],i)=>{if(!file)return;await replaceSkin(i,'skins/'+file)}).map((load,i)=>load.catch(error=>{skinFailures.push({index:i,error})}).finally(()=>{loadedCount++;if(!actors[selected])$('selectedName').textContent=`スキン読込 ${loadedCount}/${skinDefs.length}`}));
  const firstReady=Promise.any(skinLoads.map((load,index)=>load.then(()=>actors[index]?index:Promise.reject(new Error('No avatar')))));
  const preferredReady=skinLoads[selected].then(()=>actors[selected]?selected:new Promise(()=>{}),()=>new Promise(()=>{}));
  const readyIndex=await Promise.race([preferredReady,firstReady,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Skin loading timed out')),10000))]);
  if(!actors[selected])selected=readyIndex;if(!actors[selected])throw Error('スキンを読み込めませんでした。');applyShare();placeActors();updateSelection();updateVisibility();setCameraMode(shareSource().get('cam')||'follow');requestId=requestAnimationFrame(tick);
  Promise.all(skinLoads).then(()=>{skinFailures.forEach(({index,error})=>{$('characters').children[index].disabled=true;console.error('skin load failed',skinDefs[index][0],error)});updateSelection();updateVisibility();if(skinFailures.length)notify('一部のスキンを読み込めませんでした。再登録できます。')});
}catch(error){console.error(error);$('loadError').hidden=false;$('loadError').textContent=`3Dスタジオを開始できませんでした。${error.message||'SafariのWebGL設定を確認してください。'}`}}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(requestId);clearInput();notify('描画が中断されました。復帰を待っています。',8000)});canvas.addEventListener('webglcontextrestored',()=>location.reload());
start();
