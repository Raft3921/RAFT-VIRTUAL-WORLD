import * as THREE from 'three';
import {createGunEffects} from './gun-effects.js';

// The server reserves a confirmed final hit; this scene presents it before damage commits.
export function createGunCinematic({scene,camera,get,audio}){
 const hud=document.createElement('div');hud.id='gunCinematic';hud.hidden=true;
 hud.innerHTML='<div class="cinema-top"><span>FINAL SHOT</span><small>決着の一撃 · SLOW MOTION</small></div><div class="cinema-bottom"><div><b class="cinema-camera"></b><span class="cinema-caption"></span></div><div class="cinema-cuts"><i></i><i></i><i></i><i></i></div><div class="cinema-track"><i></i></div></div>';
 document.body.append(hud);const label=hud.querySelector('.cinema-camera'),caption=hud.querySelector('.cinema-caption'),progress=hud.querySelector('.cinema-track i'),cuts=[...hud.querySelectorAll('.cinema-cuts i')];
 const stage=new THREE.Group();stage.name='Final shot cinematic';scene.add(stage);
 const effects=createGunEffects(stage),bullet=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:'#fff0ad',toneMapped:false}));stage.add(bullet);stage.visible=false;
 const clones=new Map(),hidden=[],focus=new THREE.Vector3(),desired=new THREE.Vector3(),lastSafe=new THREE.Vector3(),up=new THREE.Vector3(0,0,1);
 let data=null,lastCut=-1,impacted=false,savedFov=55,elapsed=0;
 const v=p=>new THREE.Vector3(p.x,p.y,p.z);
 function stop(){afterRender();data=null;stage.visible=false;hud.hidden=true;delete document.body.dataset.cinematic;for(const root of clones.values())root.removeFromParent();clones.clear();camera.fov=savedFov;camera.updateProjectionMatrix();}
 function start(message){if(data?.id===message.id)return;stop();savedFov=camera.fov;effects.update(5);lastSafe.copy(camera.position);data=message;lastCut=-1;impacted=false;elapsed=0;stage.visible=true;hud.hidden=false;document.body.dataset.cinematic='true';}
 function safeCamera(target,distance,elevation,heading,world){
  let best=null,bestScore=-Infinity;
  for(const lift of [elevation,elevation+2,.7])for(let i=0;i<12;i++){
   const angle=heading+i*Math.PI/6;desired.copy(target).add(new THREE.Vector3(Math.sin(angle)*distance,lift,Math.cos(angle)*distance));
   const point=world.cameraPosition(target,desired,.4),clearance=point.distanceTo(target);
   if(clearance<.65||!world.cameraClear(point,.32))continue;
   const score=Math.min(clearance,distance)*2+Math.cos(angle-heading)*1.8-Math.abs(lift-elevation)*.25;
   if(score>bestScore){bestScore=score;best=point;}
  }
  if(best)lastSafe.copy(best);camera.position.copy(lastSafe);camera.lookAt(target);
 }
 function cameraOverride(){
  if(!data)return false;const s=get();elapsed=Math.max(0,Math.min(data.duration,s.now-data.startAt));
  const seconds=elapsed/1000,cut=seconds<3.4?0:seconds<5.6?1:seconds<7.8?2:3,start=[0,3.4,5.6,7.8][cut],duration=cut===0?3.4:2.2,local=Math.min(1,(seconds-start)/duration);
  if(cut!==lastCut){lastCut=cut;impacted=false;effects.update(5);cuts.forEach((node,i)=>node.classList.toggle('active',i===cut));}
  const hit=v(data.impact.position),origin=v(data.shot.origin),direction=new THREE.Vector3(data.shot.vx,data.shot.vy,data.shot.vz).normalize(),distance=origin.distanceTo(hit);
  const begin=hit.clone().addScaledVector(direction,-Math.min(distance,cut===0?16:10)),travel=Math.min(1,local/.68),position=begin.clone().lerp(hit,travel);
  const owner=data.players.find(p=>p.id===data.owner),victim=data.players.find(p=>p.id===data.victims[0]),heading=Math.atan2(direction.x,direction.z);
  bullet.position.copy(position);bullet.quaternion.setFromUnitVectors(up,direction);bullet.scale.set(data.impact.explosion?.18:.065,data.impact.explosion?.18:.065,data.impact.explosion?.48:.28);bullet.visible=travel<1;
  if(travel>=1&&!impacted){impacted=true;effects.impact(hit,data.impact.explosion,data.impact.radius||0);if(cut===0&&s.now-data.startAt<data.duration){if(data.impact.explosion)audio.explosion(hit,s);else audio.shot(hit,s);}}
  const titles=['01 / 弾道と着弾','02 / PLAYER 1','03 / PLAYER 2','04 / 全体'];label.textContent=titles[cut];caption.textContent=cut===1?'攻撃側':cut===2?'被弾側':cut===3?'決着の瞬間':'命中確定 · 操作ロック';progress.style.width=(elapsed/data.duration*100)+'%';
  if(cut===0){focus.copy(position).addScaledVector(direction,-.35);safeCamera(focus,2.8,1,heading+Math.PI*.58,s.world);camera.fov=48;}
  else if(cut===1&&owner){focus.copy(v(owner)).y+=1.1;safeCamera(focus,4.5,1.1,heading+Math.PI*.75+local*.12,s.world);camera.fov=46;}
  else if(cut===2&&victim){focus.copy(v(victim)).y+=.9;safeCamera(focus,4.2,1.2,heading+Math.PI*.3-local*.12,s.world);camera.fov=48;}
  else{focus.copy(hit).addScaledVector(direction,-.6);focus.y=Math.max(.7,focus.y);safeCamera(focus,Math.min(20,Math.max(10,(data.impact.radius||0)*1.5)),7,heading+Math.PI*.65,s.world);camera.fov=68;}
  camera.updateProjectionMatrix();camera.updateMatrixWorld();return true;
 }
 function beforeRender(){
  if(!data)return;const s=get(),sources=s.cinematicActors||[],local=Math.min(1,(elapsed/1000-[0,3.4,5.6,7.8][Math.max(0,lastCut)])/(lastCut===0?3.4:2.2));
  for(const p of data.players){const source=sources.find(a=>a.id===p.id)?.root;if(!source)continue;let root=clones.get(p.id);if(!root){root=source.clone(true);stage.add(root);clones.set(p.id,root);}root.visible=true;root.position.set(p.x,p.y,p.z);root.rotation.set(0,p.yaw,0);
   if(data.victims.includes(p.id)&&local>.68){const fall=THREE.MathUtils.smoothstep(local,.68,1);root.rotation.z=fall*1.25;root.position.y+=Math.sin(fall*Math.PI)*.25;}
   hidden.push({root:source,visible:source.visible});source.visible=false;
  }
 }
 function afterRender(){for(const item of hidden)item.root.visible=item.visible;hidden.length=0;}
 return {start,stop,cameraOverride,beforeRender,afterRender,update(dt){if(data)effects.update(dt*.22);},get active(){return !!data;},get id(){return data?.id;}};
}
