import * as THREE from 'three';
import {createGunEffects} from './gun-effects.js?v=20261014-world96';
import {createCinematicProjectile} from './cinematic-projectile.js?v=20261014-fps94';
import {applyAvatarHitPose,groundAvatarHitPose} from './avatar-hit-pose.js?v=20261014-cinema93';
import {gunEliminationState} from './hit-reaction.js?v=20261014-cinema93';

export function createGunCinematic({scene,camera,get,audio}){
 const stage=new THREE.Group();stage.name='Final shot cinematic';scene.add(stage);stage.visible=false;
 const effects=createGunEffects(stage,{showRadius:false}),clones=new Map(),hidden=[],focus=new THREE.Vector3(),desired=new THREE.Vector3(),lastSafe=new THREE.Vector3(),up=new THREE.Vector3(0,0,1);
 const timing=[0,3.4,5.6,7.8],hitAt=[.66,.4,.28,.45];
 let data=null,projectile=null,lastCut=-1,impacted=false,savedFov=55,elapsed=0,local=0,cutDuration=3.4,frameDt=.016,cutChanged=false;
 const v=p=>new THREE.Vector3(p.x,p.y,p.z),smooth=t=>THREE.MathUtils.smoothstep(t,0,1);
 function stop(){afterRender();data=null;stage.visible=false;delete document.body.dataset.cinematic;projectile?.dispose();projectile=null;for(const clone of clones.values())clone.root.removeFromParent();clones.clear();camera.fov=savedFov;camera.updateProjectionMatrix();}
 function start(message){if(data?.id===message.id)return;const fov=camera.fov;stop();savedFov=fov;effects.update(5);lastSafe.copy(camera.position);data=message;lastCut=-1;impacted=false;elapsed=0;stage.visible=true;projectile=createCinematicProjectile(message.shot.weapon);stage.add(projectile.root);document.body.dataset.cinematic='true';}
 function safeCamera(target,distance,elevation,heading,world){
  let best=null,bestScore=-Infinity;
  for(const lift of [elevation,elevation+1.8,.5])for(let i=0;i<12;i++){
   const angle=heading+i*Math.PI/6;desired.copy(target).add(new THREE.Vector3(Math.sin(angle)*distance,lift,Math.cos(angle)*distance));
   const point=world.cameraPosition(target,desired,.35),clearance=point.distanceTo(target);
   if(clearance<.5||!world.cameraClear(point,.28))continue;
   const score=Math.min(clearance,distance)*2+Math.cos(angle-heading)*2-Math.abs(lift-elevation)*.35-(cutChanged?0:Math.min(3,point.distanceTo(lastSafe))*.12);
   if(score>bestScore){bestScore=score;best=point;}
  }
  if(best){
   if(cutChanged)lastSafe.copy(best);
   else{const smoothPoint=lastSafe.clone().lerp(best,1-Math.exp(-frameDt*14)),path=world.cameraPosition(lastSafe,smoothPoint,.35),sight=world.cameraPosition(target,path,.35);if(world.cameraClear(path,.28)&&sight.distanceTo(path)<.04)lastSafe.copy(path);else lastSafe.copy(best);}
  }
  camera.position.copy(lastSafe);camera.lookAt(target);
 }
 function cameraOverride(){
  if(!data)return false;const s=get();elapsed=Math.max(0,Math.min(data.duration,s.now-data.startAt));
  const seconds=elapsed/1000,cut=seconds<3.4?0:seconds<5.6?1:seconds<7.8?2:3;cutDuration=cut===0?3.4:2.2;local=Math.min(1,(seconds-timing[cut])/cutDuration);cutChanged=cut!==lastCut;
  if(cutChanged){lastCut=cut;impacted=false;effects.update(5);}
  const hit=v(data.impact.position),origin=v(data.shot.origin),direction=new THREE.Vector3(data.shot.vx,data.shot.vy,data.shot.vz).normalize(),distance=origin.distanceTo(hit);
  const begin=hit.clone().addScaledVector(direction,-Math.min(distance,cut===0?18:12)),flight=Math.min(1,local/hitAt[cut]),travel=1-Math.pow(1-flight,2.1),position=begin.clone().lerp(hit,travel);
  const owner=data.players.find(p=>p.id===data.owner),victim=data.players.find(p=>p.id===data.victims[0]),heading=Math.atan2(direction.x,direction.z),impactAge=Math.max(0,(local-hitAt[cut])*cutDuration),after=smooth((local-hitAt[cut])/(1-hitAt[cut]));
  projectile.root.position.copy(position);projectile.root.quaternion.setFromUnitVectors(up,direction);projectile.root.visible=flight<1;projectile.update(seconds);
  if(flight>=1&&!impacted){impacted=true;effects.impact(hit,data.impact.explosion,data.impact.radius||0);if(cut===0&&s.now-data.startAt<data.duration){if(data.impact.explosion)audio.explosion(hit,s);else audio.shot(hit,s);}}
  if(cut===0){
   focus.copy(position).addScaledVector(direction,.12);safeCamera(focus,THREE.MathUtils.lerp(2.1,.85,smooth(flight))+after*4,.32+after*1.9,heading+Math.PI*.58+smooth(flight)*.65-after*.35,s.world);camera.fov=THREE.MathUtils.lerp(42,30,smooth(flight))+after*25;
  }else if(cut===1&&owner){
   focus.copy(v(owner));focus.y+=1.18;focus.addScaledVector(direction,smooth(local)*.65);safeCamera(focus,5.2-smooth(local)*2.2,.55+Math.sin(local*Math.PI)*.55,heading+Math.PI*.9-smooth(local)*1.05,s.world);camera.fov=50-smooth(local)*12;
  }else if(cut===2&&victim){
   focus.copy(v(victim));focus.y+=1.2-after*.65;safeCamera(focus,3.9-smooth(local)*1.3+after*1.4,.65+after*.55,heading+Math.PI*.22+smooth(local)*.9,s.world);camera.fov=44+after*9;
  }else{
   focus.copy(hit).addScaledVector(direction,-.65);focus.y=Math.max(.8,focus.y);const span=Math.max(10,(data.impact.radius||0)*1.55);safeCamera(focus,6+smooth(local)*span,2.4+smooth(local)*7,heading+Math.PI*.6+smooth(local)*.8,s.world);camera.fov=52+smooth(local)*15;
  }
  // Rotation-only impact movement keeps the camera's collision clearance intact.
  const shake=impacted?Math.exp(-impactAge*9)*.012:0;camera.rotateX(Math.sin(impactAge*49)*shake);camera.rotateZ(Math.sin(local*Math.PI)*(cut===0?-.035:.018)+Math.sin(impactAge*37)*shake);
  camera.updateProjectionMatrix();camera.updateMatrixWorld();return true;
 }
 function duplicate(source){
  const root=source.clone(true),base=[],meshes=[],guns=[];root.traverse(node=>{
   base.push({node,position:node.position.clone(),rotation:node.rotation.clone(),scale:node.scale.clone(),visible:node.visible});if(node.isMesh&&/-(base|overlay)$/.test(node.name))meshes.push(node);if(node.name.startsWith('handheld-'))guns.push(node);
  });
  const joints={pelvis:root.getObjectByName('pelvis'),torso:root.getObjectByName('waist'),head:root.getObjectByName('neck'),shoulders:{},elbows:{},hips:{},knees:{}};
  for(const side of ['right','left'])for(const [key,name]of [['shoulders','shoulder'],['elbows','elbow'],['hips','hip'],['knees','knee']])joints[key][side]=root.getObjectByName(side+'-'+name);
  stage.add(root);return {root,base,joints,meshes,guns};
 }
 function beforeRender(){
  if(!data)return;const s=get(),sources=s.cinematicActors||[],age=(local-hitAt[Math.max(0,lastCut)])*cutDuration*.65;
  for(const p of data.players){const source=sources.find(a=>a.id===p.id)?.root;if(!source)continue;let clone=clones.get(p.id);if(!clone){clone=duplicate(source);clones.set(p.id,clone);}const {root,base,joints,meshes,guns}=clone;
   for(const pose of base){pose.node.position.copy(pose.position);pose.node.rotation.copy(pose.rotation);pose.node.scale.copy(pose.scale);pose.node.visible=pose.visible;}root.visible=true;root.position.set(p.x,p.y,p.z);root.rotation.set(0,p.yaw,0);
   if(data.victims.includes(p.id)&&age>=0){applyAvatarHitPose(joints,gunEliminationState(age));for(const gun of guns)gun.visible=false;groundAvatarHitPose(root,joints.pelvis,meshes);}
   else if(p.id===data.owner){const recoil=Math.exp(-local*cutDuration*9)*Math.sin(local*cutDuration*20)*.055;joints.torso.rotation.x-=recoil;}
   hidden.push({root:source,visible:source.visible});source.visible=false;
  }
 }
 function afterRender(){for(const item of hidden)item.root.visible=item.visible;hidden.length=0;}
 return {start,stop,cameraOverride,beforeRender,afterRender,update(dt){frameDt=Math.min(.05,Math.max(.001,dt));if(data)effects.update(dt*.3);},get active(){return !!data;},get id(){return data?.id;}};
}
