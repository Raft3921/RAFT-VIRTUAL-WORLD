import {parkourPose} from './parkour-pose.js?v=20261017-wallspin133';
import {createCinematicProjectile} from './cinematic-projectile.js?v=20261016-trails110';
import {GUN_ZONE} from './gun-layout.js';
import * as THREE from 'three';
import {planCinematicRail} from './cinematic-rail.js?v=20261016-trails110';
import {createGunEffects} from './gun-effects.js?v=20261017-parkour126';
import {applyAvatarHitPose,groundAvatarHitPose} from './avatar-hit-pose.js?v=20261015-spectacle104';
import {gunEliminationState} from './hit-reaction.js?v=20261016-cinema106';
import {sampleKatanaPose} from './katana-motion.js?v=20261016-cinema106';
import {REPLAY_SHOOT_END,REPLAY_FINAL_AT,REPLAY_DURATION} from './replay-timing.js?v=20261016-cinema106';

export function createGunCinematic({scene,camera,get,audio}){
 const stage=new THREE.Group();stage.name='Three camera match finish';stage.visible=false;scene.add(stage);
 const effects=createGunEffects(stage,{showRadius:false,floorAt:p=>get().world?.floorAt(p,p.y+.05).y??0}),clones=new Map(),hidden=[],focus=new THREE.Vector3(),lastSafe=new THREE.Vector3();
 const fireAt=500,impactAt=REPLAY_SHOOT_END-120,forward=new THREE.Vector3(0,0,1);
 let projectile=null,data=null,lastCut=-1,savedFov=55,elapsed=0,local=0,rail=null,fired=false,impacted=false,landed=false;
 const v=p=>new THREE.Vector3(p.x,p.y,p.z),smooth=t=>THREE.MathUtils.smoothstep(t,0,1);
 const result=()=>document.getElementById('gunCinematicResult');
 function stop(){afterRender();audio.cancelReplay?.();get().world?.setCinematicOverview?.(false);data=null;projectile?.dispose();projectile=null;stage.visible=false;delete document.body.dataset.cinematic;delete document.body.dataset.cinematicCut;delete document.body.dataset.cinematicHit;if(result())result().hidden=true;for(const clone of clones.values())clone.root.removeFromParent();clones.clear();effects.update(5);camera.fov=savedFov;camera.updateProjectionMatrix();}
 function start(message){if(data?.id===message.id)return;const fov=camera.fov;stop();savedFov=fov;data={...message,duration:message.duration||REPLAY_DURATION};lastSafe.copy(camera.position);lastCut=-1;fired=impacted=landed=false;if(message.shot.weapon!=='katana'){projectile=createCinematicProjectile(message.shot.weapon,{subtle:true});projectile.root.visible=false;stage.add(projectile.root);}stage.visible=true;document.body.dataset.cinematic='true';}
 function seekFinal(startAt=get().now-REPLAY_FINAL_AT){if(!data)return;if(get().now-data.startAt<REPLAY_FINAL_AT)data.startAt=startAt;}
 function cameraOverride(){
  if(!data)return false;const s=get();elapsed=THREE.MathUtils.clamp(s.now-data.startAt,0,data.duration);const cut=elapsed<REPLAY_SHOOT_END?0:elapsed<REPLAY_FINAL_AT?1:2;
  const begin=cut===0?0:cut===1?REPLAY_SHOOT_END:REPLAY_FINAL_AT,duration=cut===0?REPLAY_SHOOT_END:cut===1?REPLAY_FINAL_AT-REPLAY_SHOOT_END:data.duration-REPLAY_FINAL_AT;local=THREE.MathUtils.clamp((elapsed-begin)/duration,0,1);
  const changed=cut!==lastCut;if(changed){lastCut=cut;if(cut!==1)effects.update(5);document.body.dataset.cinematicCut=String(cut);s.world?.setCinematicOverview?.(cut===2);if(result())result().hidden=cut!==2;}
  const owner=data.players.find(p=>p.id===data.owner),shooter=data.shot.shooter||owner,victim=data.players.find(p=>p.id===data.victims[0]),hit=v(data.impact.position),direction=new THREE.Vector3(data.shot.vx,data.shot.vy,data.shot.vz).normalize(),heading=Math.atan2(direction.x,direction.z);
  if(cut===0&&!fired&&elapsed>=fireAt){fired=true;if(elapsed<fireAt+650){if(data.shot.weapon==='katana')audio.sword(v(data.shot.origin),s);else audio.shot(v(data.shot.origin),s);effects.muzzle(v(data.shot.origin),direction);effects.eject(v(data.shot.origin),direction,data.shot.weapon,owner?.y||0);}}
  if(cut<2&&!impacted&&elapsed>=impactAt){impacted=true;effects.impact(hit,!!data.impact.explosion,data.impact.radius||0,direction.clone().negate(),data.impact.wall?'stone':'cloth');if(data.impact.explosion)audio.explosion(hit,s);if(!data.impact.wall)audio.replayImpact?.(hit);}
  if(cut===1&&!landed&&(elapsed-impactAt)/1000*.34>=.75){landed=true;for(const id of data.victims){const p=data.players.find(p=>p.id===id);if(p)effects.action('land',v(p),.85,direction);}}
  const origin=v(data.shot.origin),flight=THREE.MathUtils.clamp((elapsed-fireAt)/(impactAt-fireAt),0,1);
  if(projectile){projectile.root.visible=cut===0&&elapsed>=fireAt&&elapsed<impactAt;projectile.root.position.copy(origin).lerp(hit,flight);projectile.root.quaternion.setFromUnitVectors(forward,direction);projectile.update(elapsed/1000);}
  if(cut===2){
   const GUN_ZONE=s.world?.gunZone||{minX:120,maxX:244,minZ:-140,maxZ:-44},xs=data.players.map(p=>p.x),zs=data.players.map(p=>p.z),minX=Math.min(GUN_ZONE.minX,...xs),maxX=Math.max(GUN_ZONE.maxX,...xs),minZ=Math.min(GUN_ZONE.minZ,...zs),maxZ=Math.max(GUN_ZONE.maxZ,...zs),span=Math.max(24,maxZ-minZ+18,(maxX-minX+18)/Math.max(.45,camera.aspect));
   focus.set((minX+maxX)/2,.8,(minZ+maxZ)/2);const height=Math.max(29,span*.5/Math.tan(THREE.MathUtils.degToRad(29))+7),pull=1+smooth(local)*.065;
   camera.position.set(focus.x+span*.055,height*pull,focus.z+span*.08);camera.lookAt(focus);camera.fov=58;
   const member=data.players.find(p=>p.id===s.selfId),winner=data.winner===undefined?data.players.find(p=>p.id===data.owner)?.team:data.winner,node=result();
   if(changed)audio.replayResult?.(winner===null?'draw':member&&Number.isInteger(member.team)?member.team===winner?'win':'lose':'neutral');
   if(node){node.textContent=winner===null?'引き分け':member&&Number.isInteger(member.team)?member.team===winner?'勝利！':'敗北':Number.isInteger(winner)?'TEAM '+String.fromCharCode(65+winner)+' 勝利！':'試合終了';node.dataset.result=winner===null?'draw':member?.team===winner?'win':'lose';}
  }else{
   const subject=cut===0?shooter||victim:victim||owner,subjectPoint=subject?v(subject):hit;
   const pose=t=>{
    if(cut===0){
     const ms=t*REPLAY_SHOOT_END,travel=THREE.MathUtils.clamp((ms-fireAt)/(impactAt-fireAt),0,1),handoff=data.shot.weapon==='katana'?0:smooth((ms-fireAt)/180);
     const portrait=subjectPoint.clone();portrait.y+=subject?.prone?.38:subject?.crouched?.92:1.25;
     const bullet=origin.clone().lerp(hit,travel).addScaledVector(direction,.10);
     return {target:portrait.lerp(bullet,handoff),distance:THREE.MathUtils.lerp(2.8-smooth(ms/fireAt)*.3,data.shot.weapon==='rocket'?1.65:.95,handoff),elevation:THREE.MathUtils.lerp(.4,.20,handoff),heading:THREE.MathUtils.lerp(heading+Math.PI*.42,heading+Math.PI*.76,handoff),fov:THREE.MathUtils.lerp(44,36,handoff)};
    }
    const target=subjectPoint.clone();target.y+=1.10-smooth(t/.65)*.65;
    return {target,distance:3.5+smooth(t)*.20,elevation:.70,heading:heading+Math.PI*.64,fov:48};
   };
   if(changed)rail=planCinematicRail(s.world,pose,lastSafe,cut===0?{clearance:.16,minimumDistance:.35,maximumStep:.65}:{});const shotPose=pose(local);focus.copy(shotPose.target);rail.sample(local,lastSafe);camera.position.copy(lastSafe);camera.lookAt(focus);camera.fov=shotPose.fov;
   const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches,age=Math.max(0,elapsed-fireAt)/1000;if(cut===0&&!reduced)camera.rotateX(Math.exp(-age*7)*Math.sin(age*16)*.008);
   if(cut===1&&!reduced){const hitAge=Math.max(0,(elapsed-impactAt)/1000);if(elapsed>=impactAt)camera.rotateX(Math.exp(-hitAge*9)*Math.sin(hitAge*22)*.003);}
  }
  camera.updateProjectionMatrix();camera.updateMatrixWorld();return true;
 }
 function duplicate(source){
  const root=source.clone(true),base=[],meshes=[],guns=[],flashes=[];root.traverse(node=>{base.push({node,position:node.position.clone(),rotation:node.rotation.clone(),scale:node.scale.clone(),visible:node.visible});if(node.isMesh&&/-(base|overlay)$/.test(node.name))meshes.push(node);if(node.name.startsWith('handheld-'))guns.push(node);if(node.isMesh&&node.parent?.name==='barrel muzzle')flashes.push(node);});
  const joints={pelvis:root.getObjectByName('pelvis'),torso:root.getObjectByName('waist'),head:root.getObjectByName('neck'),shoulders:{},elbows:{},hips:{},knees:{}};
  for(const side of ['right','left'])for(const [key,name]of [['shoulders','shoulder'],['elbows','elbow'],['hips','hip'],['knees','knee']])joints[key][side]=root.getObjectByName(side+'-'+name);
  stage.add(root);return {root,base,joints,meshes,guns,flashes};
 }
 function beforeRender(){
  if(!data)return;const s=get(),sources=s.cinematicActors||[],fallAge=lastCut===2?1.7:elapsed<impactAt?-1:(elapsed-impactAt)/1000*.34;
  for(const p of data.players){const source=sources.find(a=>a.id===p.id)?.root;if(!source)continue;let clone=clones.get(p.id);if(!clone){clone=duplicate(source);clones.set(p.id,clone);}const {root,base,joints,meshes,guns,flashes}=clone;
   for(const pose of base){pose.node.position.copy(pose.position);pose.node.rotation.copy(pose.rotation);pose.node.scale.copy(pose.scale);pose.node.visible=pose.visible;}root.visible=true;root.position.set(p.x,p.y,p.z);root.rotation.set(0,p.yaw,0);if(p.id===data.owner&&lastCut===0&&data.shot.shooter){const pose=data.shot.shooter;root.position.set(pose.x,pose.y,pose.z);root.rotation.y=pose.yaw;
    joints.pelvis.rotation.set(pose.prone?Math.PI/2:0,0,0);joints.pelvis.position.set(0,pose.prone?.24:pose.crouched?-.48:0,0);joints.torso.rotation.set(0,0,0);
    joints.head.rotation.set((pose.headPitch||0)-(pose.prone?Math.PI/2:0),pose.headYaw||0,0);joints.head.position.z=pose.prone?.15:0;
    for(const side of ['left','right']){joints.hips[side].rotation.set(0,0,0);joints.knees[side].rotation.set(pose.prone?.10:pose.crouched?.8:0,0,0);}
    joints.shoulders.right.rotation.x=pose.prone?-2.65:-1.20;joints.elbows.right.rotation.x=pose.prone?-.60:-.22;groundAvatarHitPose(root,joints.pelvis,meshes);const acro=parkourPose(pose);if(acro.weight){joints.pelvis.quaternion.premultiply(new THREE.Quaternion().fromArray(acro.quaternion));joints.pelvis.position.x+=acro.shiftX;joints.pelvis.position.y+=acro.shiftY;joints.pelvis.position.z+=acro.shiftZ;}
   }

   for(const flash of flashes)flash.visible=false;
   if(data.victims.includes(p.id)&&fallAge>=0){applyAvatarHitPose(joints,gunEliminationState(fallAge));for(const gun of guns)gun.visible=false;groundAvatarHitPose(root,joints.pelvis,meshes);}
   else if(p.id===data.owner&&lastCut===0){const age=(elapsed-fireAt)/1000*.3;if(data.shot.weapon==='katana'){const pose=sampleKatanaPose(0,Math.max(0,age));joints.shoulders.right.rotation.set(...pose.shoulder);joints.elbows.right.rotation.set(...pose.elbow);joints.torso.rotation.y+=pose.torso[1];}else if(age>=0){const recoil=Math.exp(-age*15)*Math.sin(age*22)*.10;joints.torso.rotation.x-=recoil*.25;joints.shoulders.right.rotation.x-=recoil;joints.elbows.right.rotation.x-=recoil*.7;for(const flash of flashes){flash.visible=age<.045;flash.scale.setScalar(1.25);};}}
   hidden.push({root:source,visible:source.visible});source.visible=false;
  }
 }
 function afterRender(){for(const item of hidden)item.root.visible=item.visible;hidden.length=0;}
 return {start,stop,seekFinal,cameraOverride,beforeRender,afterRender,update(dt){if(data)effects.update(dt*(lastCut===2?1:.34));},get focus(){return focus;},get final(){return !!data&&lastCut===2;},get active(){return !!data;},get id(){return data?.id;}};
}
