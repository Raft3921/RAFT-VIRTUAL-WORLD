import * as THREE from 'three';
// All wrists use camera coordinates and unit-scale pivots. The skin/model is
// fixed under that pivot; only the wrist rotates, with -Z pointing at the work.
export function createFirstPersonHands(camera){
 const root=new THREE.Group();root.name='First person wrist rig';camera.add(root);
 const wrists=[new THREE.Group(),new THREE.Group()],aim=new THREE.Vector3(),localPoint=new THREE.Vector3(),forward=new THREE.Vector3(0,0,-1),desired=new THREE.Quaternion(),roll=new THREE.Quaternion(),zAxis=new THREE.Vector3(0,0,1),targets=[new THREE.Vector3(),new THREE.Vector3()];
 const geometry=new THREE.BoxGeometry(.11,.09,.17),material=new THREE.MeshStandardMaterial({color:'#bd9875',roughness:.95});let owner=null,primed=false;
 wrists.forEach((w,i)=>{w.position.set(i?.28:-.28,-.32,-.6);root.add(w);});
 function update(dt,state){
  if(owner!==state.avatar){owner=state.avatar;for(let i=0;i<2;i++){const wrist=wrists[i];wrist.clear();const skin=owner?.createFirstPersonHand?.();if(skin){skin.rotation.y=Math.PI;skin.scale.set(i?1:-1,1,1);skin.position.y=.115;wrist.add(skin);}else wrist.add(new THREE.Mesh(geometry,material));}primed=false;}
  root.visible=state.visible;
  if(!root.visible){primed=false;return;}
  const blend=1-Math.exp(-dt*14),reachAge=Math.max(0,(state.now-state.reachAt)/1000),reach=reachAge<.75?Math.sin(Math.PI*reachAge/.75):0;
  if(state.reachPoint){camera.updateMatrixWorld();localPoint.copy(state.reachPoint);camera.worldToLocal(localPoint);localPoint.set(THREE.MathUtils.clamp(localPoint.x,-.42,.42),THREE.MathUtils.clamp(localPoint.y,-.42,-.09),THREE.MathUtils.clamp(localPoint.z,-.85,-.45));}
  for(let i=0;i<2;i++){
   const wrist=wrists[i],sign=i?1:-1,p=targets[i];p.set(sign*.28,-.32,-.6);aim.set(sign*.23,-.24,-1.25);let angle=sign*.06;
   wrist.visible=!state.cooking||!!state.eating;
   if(state.pc){p.set(sign*.23,-.39,-.72);p.y+=reach*.018*(i?1:-1);aim.set(sign*.23,-.39,-1.3);}
   else if(state.carry){p.set(sign*.17,-.3,-.65);aim.set(sign*.07,-.25,-.95);angle=sign*.14;}
   else if(state.eating){const lift=(1-Math.cos(state.eating.elapsed*Math.PI*1.5))/2;if(i){p.x+=(.09-p.x)*lift;p.y+=(-.1-p.y)*lift;p.z+=(-.38-p.z)*lift;aim.set(.04,-.01,-.75);angle=-.15*lift;}}
   else if(state.brushing){if(i){if(state.reachPoint)p.lerp(localPoint,.7);else p.set(.26,-.23,-.72);aim.set(p.x,p.y+.035,p.z-.45);angle=-.08;}}
   else if(state.reachPoint&&reach>0&&(i||state.motionKind==='instrument')){p.lerp(localPoint,reach*(i?.8:.3));aim.copy(localPoint);aim.z=Math.min(aim.z,p.z-.2);}
   if(state.exercise){p.y+=Math.sin(state.now*.007+i*Math.PI)*.012;}
   if(primed)wrist.position.lerp(p,blend);else wrist.position.copy(p);
   aim.sub(wrist.position).normalize();desired.setFromUnitVectors(forward,aim);roll.setFromAxisAngle(zAxis,angle);desired.multiply(roll);
   if(primed)wrist.quaternion.slerp(desired,blend);else wrist.quaternion.copy(desired);
  }
  primed=true;
 }
 return {root,wrists,update};
}
