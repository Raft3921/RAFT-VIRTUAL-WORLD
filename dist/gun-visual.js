import * as THREE from 'three';
import {WEAPON_DIMENSIONS} from './weapon-dimensions.js?v=20261010-mirror-modules66';
const box=new THREE.BoxGeometry(1,1,1),tubeGeometry=new THREE.CylinderGeometry(1,1,1,12),steel=new THREE.MeshStandardMaterial({color:'#59616a',roughness:.43,metalness:.55}),slide=new THREE.MeshStandardMaterial({color:'#77838c',roughness:.3,metalness:.68}),black=new THREE.MeshStandardMaterial({color:'#252c32',roughness:.73,metalness:.2}),rubber=new THREE.MeshStandardMaterial({color:'#11171c',roughness:.93}),wood=new THREE.MeshStandardMaterial({color:'#876242',roughness:.68}),lens=new THREE.MeshBasicMaterial({color:'#93b8c5'});
const flashMaterial=new THREE.MeshBasicMaterial({color:'#ffce69',transparent:true,opacity:.82,depthWrite:false,blending:THREE.AdditiveBlending}),coreMaterial=new THREE.MeshBasicMaterial({color:'#fff4c4',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}),flashGeometry=new THREE.ConeGeometry(.12,.29,6),coreGeometry=new THREE.SphereGeometry(.048,6,4);
export function createGunModel(id){
 const root=new THREE.Group();root.name='handheld-'+id;root.userData.weapon=id;
 const part=(x,y,z,w,h,d,material=steel)=>{const mesh=new THREE.Mesh(box,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);root.add(mesh);return mesh;};
 const tube=(x,y,z,r,length,material=steel)=>{const mesh=new THREE.Mesh(tubeGeometry,material);mesh.position.set(x,y,z);mesh.rotation.x=Math.PI/2;mesh.scale.set(r,length,r);root.add(mesh);return mesh;};
 // A visible trigger grip surrounds the actual hand pivot on every weapon.
 part(0,-.12,0,.115,.24,.14,rubber);for(let i=0;i<4;i++)part(0,-.19+i*.04,-.075,.12,.012,.008,black);
 if(id==='pistol'){
  part(0,.022,.17,.15,.145,.40,slide);part(0,-.07,.14,.14,.065,.31,black);tube(0,.025,.425,.043,.11,black);tube(0,.025,.484,.025,.007,rubber);
  part(-.078,.018,.14,.008,.045,.095,black);for(let i=0;i<5;i++)for(const side of [-1,1])part(side*.078,.038,.017+i*.021,.006,.055,.008,black);
  part(0,.11,-.002,.10,.029,.035,rubber);part(0,.115,.352,.027,.036,.045,rubber);root.userData.reloadPart=part(0,-.24,-.015,.13,.03,.145,steel);
 }else if(id==='rocket'){
  tube(0,.025,.35,.155,1.18,black);tube(0,.025,.98,.17,.12,steel);root.userData.reloadPart=tube(0,.025,-.26,.175,.09,steel);tube(0,.025,1.045,.137,.012,rubber);
  part(.145,.18,.23,.055,.20,.29,steel);part(.145,.28,.25,.07,.025,.18,rubber);part(0,-.075,-.27,.23,.16,.25,rubber);for(let i=0;i<4;i++)tube(0,.025,.12+i*.14,.16,.02,steel);
 }else{
  const sniper=id==='sniper',shotgun=id==='shotgun',tip=WEAPON_DIMENSIONS[id].muzzle[2];
  part(0,.015,.22,.155,.17,.49,steel);part(0,-.015,-.25,.15,.21,.37,shotgun?wood:black);part(0,-.035,-.445,.17,.245,.04,rubber);
  part(0,-.013,.55,.16,.17,.36,shotgun?wood:black);tube(0,.025,(.68+tip)/2,shotgun?.039:.029,tip-.68,steel);tube(0,.025,tip,.048,.055,black);tube(0,.025,tip+.025,.027,.009,rubber);
  for(let i=0;i<6;i++)part(0,.105,.42+i*.04,.17,.013,.012,rubber);
  if(id==='machine'){root.userData.reloadPart=part(0,-.205,.225,.10,.30,.18,black);part(0,-.34,.21,.115,.035,.18,steel);part(.09,.045,.07,.06,.026,.07,steel);part(0,.16,.34,.08,.09,.10,rubber);}
  if(sniper){tube(0,.218,.22,.067,.46,black);tube(0,.218,.454,.079,.038,steel);tube(0,.218,.478,.06,.008,lens);for(const z of [.04,.34])part(0,.135,z,.065,.15,.055,steel);part(.11,.025,.14,.115,.025,.05,steel);root.userData.reloadPart=part(.167,-.015,.14,.045,.085,.055,black);}
  if(shotgun){root.userData.reloadPart=tube(0,-.042,.77,.026,.52,black);for(let i=0;i<5;i++)part(-.08,.02,.085+i*.046,.018,.075,.025,wood);}
 }
 // Open trigger guard instead of a solid box intersecting the firing hand.
 part(0,-.19,.145,.105,.025,.15,steel);part(0,-.13,.21,.105,.12,.025,steel);part(0,-.075,.13,.018,.055,.018,rubber);
 const muzzle=new THREE.Object3D();muzzle.name='barrel muzzle';muzzle.position.fromArray(WEAPON_DIMENSIONS[id]?.muzzle||WEAPON_DIMENSIONS.pistol.muzzle);root.add(muzzle);
 const flash=new THREE.Group(),cone=new THREE.Mesh(flashGeometry,flashMaterial),core=new THREE.Mesh(coreGeometry,coreMaterial);cone.rotation.x=Math.PI/2;cone.position.z=.09;flash.add(cone,core);flash.visible=false;flash.renderOrder=4;muzzle.add(flash);root.userData.muzzle=muzzle;root.userData.flash=flash;root.userData.flashUntil=0;
 if(root.userData.reloadPart)root.userData.reloadBase=root.userData.reloadPart.position.clone();
 return root;
}
export function triggerGunFlash(model,now=performance.now()){if(!model)return;model.userData.flashUntil=now+65;model.userData.flash.visible=true;model.userData.flash.rotation.z=Math.random()*Math.PI;}
export function updateGunFlash(model,now=performance.now()){if(!model)return;const flash=model.userData.flash,remaining=model.userData.flashUntil-now;flash.visible=remaining>0;if(flash.visible)flash.scale.setScalar(.65+remaining/65*.65);}
export function createFiringHand(color='#bd9271',{forearm:showForearm=true}={}){
 const root=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color,roughness:.86});root.name='right firing hand';
 const part=(x,y,z,w,h,d,material)=>{const mesh=new THREE.Mesh(box,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);root.add(mesh);return mesh;};
 part(0,-.115,-.012,.15,.135,.15,skin);part(-.083,-.11,.038,.042,.082,.077,skin);
 for(let i=0;i<3;i++)part(.073,-.077-i*.032,.035,.03,.028,.105,skin);
 // The right forearm extends back toward the camera from the wrapped grip.
 if(showForearm){const forearm=new THREE.Mesh(box,skin);forearm.position.set(.048,-.185,-.235);forearm.rotation.x=-.19;forearm.rotation.y=-.10;forearm.scale.set(.12,.135,.39);root.add(forearm);part(.09,-.24,-.44,.145,.16,.18,black);}return root;
}

export function updateGunReload(model,progress=null){const part=model?.userData.reloadPart;if(!part)return;part.position.copy(model.userData.reloadBase);if(progress===null)return;const t=THREE.MathUtils.clamp(progress,0,1),motion=Math.sin(Math.PI*t),kind=model.userData.weapon;if(kind==='pistol'||kind==='machine')part.position.y-=motion*.28;else if(kind==='sniper')part.position.z-=Math.sin(Math.PI*t*2)*.09;else if(kind==='shotgun')part.position.z-=Math.sin(Math.PI*t*4)*.10;else if(kind==='rocket')part.position.z-=motion*.22;}
