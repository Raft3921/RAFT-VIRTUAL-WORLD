import * as THREE from 'three';
import {planCinematicRail} from './cinematic-rail.js?v=20261015-replay100';
import {createGunEffects} from './gun-effects.js?v=20261014-world96';
import {createCinematicProjectile} from './cinematic-projectile.js?v=20261014-fps94';
import {applyAvatarHitPose,groundAvatarHitPose} from './avatar-hit-pose.js?v=20261014-cinema93';
import {gunEliminationState} from './hit-reaction.js?v=20261014-cinema93';

export function createGunCinematic({scene,camera,get,audio}){
 const stage=new THREE.Group();stage.name='Final shot cinematic';scene.add(stage);stage.visible=false;
 const effects=createGunEffects(stage,{showRadius:false}),clones=new Map(),hidden=[],focus=new THREE.Vector3(),lastSafe=new THREE.Vector3(),up=new THREE.Vector3(0,0,1);
 const timing=[0,3.4,5.6,7.8],hitAt=[.66,.4,.28,.45];
 let data=null,projectile=null,lastCut=-1,impacted=false,savedFov=55,elapsed=0,local=0,cutDuration=3.4,rail=null,cutChanged=false;
 const v=p=>new THREE.Vector3(p.x,p.y,p.z),smooth=t=>THREE.MathUtils.smoothstep(t,0,1);
 function stop(){afterRender();data=null;stage.visible=false;delete document.body.dataset.cinematic;projectile?.dispose();projectile=null;for(const clone of clones.values())clone.root.removeFromParent();clones.clear();camera.fov=savedFov;camera.updateProjectionMatrix();}
 function start(message){if(data?.id===message.id)return;const fov=camera.fov;stop();savedFov=fov;effects.update(5);lastSafe.copy(camera.position);data=message;lastCut=-1;impacted=false;elapsed=0;stage.visible=true;projectile=createCinematicProjectile(message.shot.weapon);stage.add(projectile.root);document.body.dataset.cinematic='true';}
 function cameraOverride(){
  if(!data)return false;const s=get();elapsed=Math.max(0,Math.min(data.duration,s.now-data.startAt));
  const seconds=elapsed/1000,cut=seconds<3.4?0:seconds<5.6?1:seconds<7.8?2:3;cutDuration=cut===0?3.4:2.2;local=Math.min(1,(seconds-timing[cut])/cutDuration);cutChanged=cut!==lastCut;
  if(cutChanged){lastCut=cut;impacted=false;effects.update(5);}
  const hit=v(data.impact.position),origin=v(data.shot.origin),direction=new THREE.Vector3(data.shot.vx,data.shot.vy,data.shot.vz).normalize(),distance=origin.distanceTo(hit);
  const begin=hit.clone().addScaledVector(direction,-Math.min(distance,cut===0?18:12)),flight=Math.min(1,local/hitAt[cut]),travel=1-Math.pow(1-flight,2.1),position=begin.clone().lerp(hit,travel);
  const owner=data.players.find(p=>p.id===data.owner),victim=data.players.find(p=>p.id===data.victims[0]),heading=Math.atan2(direction.x,direction.z),impactAge=Math.max(0,(local-hitAt[cut])*cutDuration),after=smooth((local-hitAt[cut])/(1-hitAt[cut]));
  projectile.root.position.copy(position);projectile.root.quaternion.setFromUnitVectors(up,direction);projectile.root.visible=flight<1;projectile.update(seconds);
  if(flight>=1&&!impacted){impacted=true;effects.impact(hit,data.impact.explosion,data.impact.radius||0);if(cut===0&&s.now-data.startAt<data.duration){if(data.impact.explosion)audio.explosion(hit,s);else audio.shot(hit,s);}}
  function pose(t){
   const f=Math.min(1,t/hitAt[cut]),a=smooth((t-hitAt[cut])/(1-hitAt[cut])),q=smooth(t),target=new THREE.Vector3();
   if(cut===0){target.copy(begin).lerp(hit,1-Math.pow(1-f,2.1)).addScaledVector(direction,.12);return {target,distance:THREE.MathUtils.lerp(2.1,.85,smooth(f))+a*4,elevation:.32+a*1.9,heading:heading+Math.PI*.58+smooth(f)*.65-a*.35,fov:THREE.MathUtils.lerp(42,30,smooth(f))+a*25};}
   if(cut===1&&owner){target.copy(v(owner));target.y+=1.18;target.addScaledVector(direction,q*.65);return {target,distance:5.2-q*2.2,elevation:.55+Math.sin(t*Math.PI)*.55,heading:heading+Math.PI*.9-q*1.05,fov:50-q*12};}
   if(cut===2&&victim){target.copy(v(victim));target.y+=1.2-a*.65;return {target,distance:3.9-q*1.3+a*1.4,elevation:.65+a*.55,heading:heading+Math.PI*.22+q*.9,fov:44+a*9};}
   target.copy(hit).addScaledVector(direction,-.65);target.y=Math.max(.8,target.y);return {target,distance:6+q*Math.max(10,(data.impact.radius||0)*1.55),elevation:2.4+q*7,heading:heading+Math.PI*.6+q*.8,fov:52+q*15};
  }
  if(cutChanged)rail=planCinematicRail(s.world,pose,lastSafe);
  const shotPose=pose(local);focus.copy(shotPose.target);rail.sample(local,lastSafe);camera.position.copy(lastSafe);camera.lookAt(focus);camera.fov=shotPose.fov;
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
 return {start,stop,cameraOverride,beforeRender,afterRender,update(dt){if(data)effects.update(dt*.3);},get active(){return !!data;},get id(){return data?.id;}};
}
