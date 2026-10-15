import {sampleGunReload} from './gun-hand-motion.js?v=20261015-spectacle104';
import * as THREE from 'three';
import {WEAPON_DIMENSIONS} from './weapon-dimensions.js?v=20261015-tactics99';
import {cuboidGeometry} from './model-batching.js?v=20261014-fps94';
const steel='#59636e',silver='#88939d',black='#252c32',rubber='#111820',wood='#815539',cache=new Map(),handCache=new Map();
const gunMaterial=new THREE.MeshStandardMaterial({vertexColors:true,metalness:.48,roughness:.39}),skinMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.83}),flashMaterial=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.88,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
const scopeLensGeometry=new THREE.PlaneGeometry(.112,.112),scopeGlass=new THREE.MeshBasicMaterial({color:'#17313d'});
const flashGeometry=cuboidGeometry([{x:0,y:0,z:.065,w:.055,h:.055,d:.13,c:'#fff7d7'},{x:0,y:0,z:.14,w:.1,h:.025,d:.18,c:'#ffbd55',rz:.6},{x:0,y:0,z:.14,w:.025,h:.1,d:.18,c:'#ffd987',rz:.6}]);
function build(id){
 const staticParts=[],reloadParts=[];let target=staticParts;
 if(id==='katana'){
  const add=(x,y,z,w,h,d,c,rz=0)=>staticParts.push({x,y,z,w,h,d,c,rz});
  add(0,.015,-.11,.065,.065,.32,'#25252a');add(0,.015,.065,.17,.13,.018,'#44434a');add(0,.015,.10,.072,.044,.05,'#aaa093');
  for(let i=0;i<9;i++)add(0,.052,-.25+i*.032,.067,.012,.016,i%2?'#6f655b':'#171c24',i%2?.5:-.5);
  const grip=cuboidGeometry(staticParts),vertices=[];
  const ring=i=>{const t=i/16,z=.12+t*1.31,y=.02+t*t*.065,w=i===16?0:.057*(1-t*.43);return [[-w/2,y-.011,z],[w/2,y-.011,z],[w/2,y+.011,z],[-w/2,y+.011,z]];};
  const tri=(a,b,c)=>vertices.push(...a,...b,...c);
  for(let i=0;i<16;i++){const a=ring(i),b=ring(i+1);for(let side=0;side<4;side++){const next=(side+1)%4;tri(a[side],b[side],a[next]);tri(a[next],b[side],b[next]);}}
  const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));blade.computeVertexNormals();
  const bladeColors=[];for(let i=0;i<vertices.length/3;i++)bladeColors.push(.68,.75,.79);blade.setAttribute('color',new THREE.Float32BufferAttribute(bladeColors,3));
  const geometry=new THREE.BufferGeometry();for(const key of ['position','normal','color']){const a=grip.attributes[key].array,b=blade.attributes[key].array,joined=new Float32Array(a.length+b.length);joined.set(a);joined.set(b,a.length);geometry.setAttribute(key,new THREE.BufferAttribute(joined,3));}
  geometry.computeBoundingSphere();geometry.computeBoundingBox();grip.dispose();blade.dispose();return {geometry,reloadGeometry:cuboidGeometry([])};

 }

 const part=(x,y,z,w,h,d,c=steel,rx=0,ry=0,rz=0)=>target.push({x,y,z,w,h,d,c,rx,ry,rz});
 const barrel=(x,y,z,r,length,c=steel)=>{const wall=r*.32;for(const side of [-1,1]){part(x+side*(r-wall/2),y,z,wall,r*2,length,c);part(x,y+side*(r-wall/2),z,r*2-wall*2,wall,length,c);}};
 part(0,-.11,-.015,.11,.22,.13,rubber,-.13);part(0,-.19,.14,.095,.023,.15,steel);part(0,-.13,.21,.095,.12,.023,steel);part(0,-.075,.13,.014,.055,.014,black);
 if(id==='pistol'){
  part(0,.026,.17,.15,.14,.4,steel);part(0,.098,.17,.12,.012,.36,silver);part(0,-.061,.17,.137,.055,.34,black);barrel(0,.025,.427,.042,.105,black);
  for(const side of [-1,1])for(let i=0;i<7;i++)part(side*.078,.037,-.016+i*.022,.008,.066,.008,black);
  part(.078,.053,.255,.012,.064,.09,black);part(.085,-.025,.095,.027,.015,.09,silver);part(0,.12,-.002,.1,.03,.035,rubber);part(0,.123,.35,.022,.028,.033,rubber);part(0,.14,.35,.012,.007,.009,'#dbefe2');
  target=reloadParts;part(0,-.17,-.015,.085,.21,.106,steel);part(0,-.28,-.015,.13,.026,.14,rubber);
 }else if(id==='rocket'){
  barrel(0,.025,.36,.15,1.16,black);barrel(0,.025,.98,.172,.11,steel);
  for(const z of [-.15,.07,.27,.48,.71])barrel(0,.025,z,.158,.025,silver);
  part(0,-.083,-.26,.235,.12,.24,rubber);part(.17,.19,.28,.045,.19,.3,steel);part(.17,.29,.29,.075,.023,.2,black);part(.17,.29,.36,.018,.07,.022,silver);
  target=reloadParts;part(0,.025,-.33,.25,.25,.34,'#566148');part(0,.025,-.52,.19,.19,.08,steel);
 }else{
  const sniper=id==='sniper',shotgun=id==='shotgun',tip=WEAPON_DIMENSIONS[id].muzzle[2];
  part(0,.018,.2,.155,.175,.48,steel);part(0,.11,.12,.15,.016,.47,black);part(0,-.015,-.24,.14,.18,.35,shotgun?wood:black);part(0,-.021,-.44,.18,.235,.045,rubber);
  part(0,.013,.56,.15,.145,.34,shotgun?wood:black);barrel(0,.025,(.68+tip)/2,shotgun?.039:.031,tip-.68,steel);barrel(0,.025,tip,.048,.06,black);
  for(let i=0;i<8;i++)part(0,.105,.36+i*.04,.16,.012,.012,silver);
  for(const side of [-1,1])for(let i=0;i<5;i++)part(side*.079,.027,.44+i*.048,.008,.045,.018,steel);
  if(sniper){barrel(0,.224,.23,.066,.47,black);barrel(0,.224,-.026,.085,.10,rubber);barrel(0,.224,.46,.078,.04,steel);part(0,.224,.485,.103,.103,.008,'#79a5b4');for(const z of [.05,.34])part(0,.14,z,.052,.12,.035,steel);part(.06,.25,.22,.043,.065,.061,silver);target=reloadParts;part(.125,.021,.1,.095,.022,.04,steel);part(.171,-.02,.1,.039,.085,.048,black);}
  else if(shotgun){barrel(0,-.04,.7,.026,.65,black);target=reloadParts;part(0,-.021,.63,.17,.12,.24,wood);for(let i=0;i<5;i++)part(0,-.021,.535+i*.04,.176,.126,.008,black);}
  else{part(.084,.045,.07,.065,.025,.08,silver);part(0,.158,.34,.08,.095,.095,rubber);target=reloadParts;part(0,-.19,.22,.099,.3,.17,black,.1);for(let i=0;i<5;i++)part(.052,-.285+i*.038,.222,.01,.016,.168,steel);part(0,-.35,.21,.118,.029,.186,steel);}
 }
 return {geometry:cuboidGeometry(staticParts),reloadGeometry:cuboidGeometry(reloadParts)};
}
export function createGunModel(id){
 if(!cache.has(id))cache.set(id,build(id));const geometry=cache.get(id),root=new THREE.Group();root.name='handheld-'+id;root.userData.weapon=id;
 const body=new THREE.Mesh(geometry.geometry,gunMaterial),reloadPart=new THREE.Mesh(geometry.reloadGeometry,gunMaterial);body.castShadow=reloadPart.castShadow=true;body.receiveShadow=reloadPart.receiveShadow=true;root.add(body,reloadPart);root.userData.reloadPart=reloadPart;root.userData.reloadBase=new THREE.Vector3();
 const muzzle=new THREE.Object3D();muzzle.name='barrel muzzle';muzzle.position.fromArray(WEAPON_DIMENSIONS[id]?.muzzle||WEAPON_DIMENSIONS.pistol.muzzle);root.add(muzzle);
 const flash=new THREE.Mesh(flashGeometry,flashMaterial);flash.visible=false;flash.renderOrder=4;muzzle.add(flash);root.userData.muzzle=muzzle;root.userData.flash=flash;root.userData.flashUntil=0;if(id==='sniper'){const lens=new THREE.Mesh(scopeLensGeometry,scopeGlass);lens.name='optical ocular lens';lens.position.set(0,.224,-.079);lens.rotation.y=Math.PI;root.add(lens);root.scopeLens=lens;}return root;
}
export function triggerGunFlash(model,now=performance.now()){if(!model)return;model.userData.flashUntil=now+90;model.userData.flash.visible=true;model.userData.flash.rotation.z=Math.random()*Math.PI;}
export function updateGunFlash(model,now=performance.now()){if(!model)return;const remaining=model.userData.flashUntil-now,flash=model.userData.flash;flash.visible=remaining>0;if(flash.visible)flash.scale.setScalar(.85+remaining/90*1.15);}
export function createFiringHand(color='#bd9271',{forearm:showForearm=true,support=false}={}){
 const key=(color?.isColor?color.getHexString():String(color))+showForearm+support;if(!handCache.has(key)){
  const parts=[],skin=new THREE.Color(color),c=skin.getHexString(),shade=skin.clone().multiplyScalar(.82).getHexString(),highlight=skin.clone().multiplyScalar(1.08).getHexString();
  const add=(x,y,z,w,h,d,color=c,rx=0,ry=0,rz=0)=>parts.push({x,y,z,w,h,d,c:'#'+color,rx,ry,rz});
  add(0,-.117,-.02,.125,.122,.115);add(-.052,-.106,.02,.055,.081,.115,highlight,0,.12,-.22);add(.02,-.179,-.047,.10,.065,.092,shade);
  // Three phalanges wrap around the grip; the index finger reaches the trigger.
  for(let i=0;i<4;i++){const y=-.065-i*.029,index=i===0;add(.062,y,.012,.03,.027,index?.105:.068,c,0,index?-.08:-.28);add(.068,y,.062,.029,.026,.04,highlight,0,-.65);add(.041,y,.08,.047,.024,.024,shade,0,-.12);}
  add(-.064,-.063,.004,.038,.038,.066,highlight,.1,-.55,.28);add(-.049,-.05,.05,.038,.035,.042,c,.2,-.35,.18);
  if(showForearm){add(.034,-.2,-.136,.104,.109,.2,c,-.19,-.1);add(.061,-.235,-.33,.13,.14,.245,shade,-.17,-.08);add(.075,-.252,-.465,.155,.17,.115,'242f3b',-.17);}
  handCache.set(key,cuboidGeometry(parts));
 }
 const root=new THREE.Group();root.name=support?'support hand':'right firing hand';root.add(new THREE.Mesh(handCache.get(key),skinMaterial));return root;
}
export function updateGunReload(model,progress=null){
 const part=model?.userData.reloadPart;if(!part)return;
 const pose=sampleGunReload(model.userData.weapon,progress);part.position.fromArray(pose.part);part.rotation.set(...pose.partRotation);
}

const armElbow=new THREE.Vector3(),armVector=new THREE.Vector3(),armCenter=new THREE.Vector3(),armInverse=new THREE.Quaternion(),armUp=new THREE.Vector3(0,1,0),armWorldInverse=new THREE.Matrix4();
export function updateFiringArm(hand,home,frame=null,anchor=null){
 const arm=hand?.userData.forearm;if(!arm)return;
 // Hold the elbow near its original place while the wrist reaches for the gun.
 if(frame&&anchor){hand.updateWorldMatrix(true,false);armElbow.copy(anchor).applyMatrix4(frame.matrixWorld).applyMatrix4(armWorldInverse.copy(hand.matrixWorld).invert());}
 else armElbow.copy(arm.elbow).add(home).sub(hand.position).applyQuaternion(armInverse.copy(hand.quaternion).invert());
 armVector.subVectors(armElbow,arm.wrist);const length=armVector.length();armCenter.copy(armElbow).add(arm.wrist).multiplyScalar(.5);
 for(const mesh of arm.meshes){mesh.position.copy(armCenter);mesh.quaternion.setFromUnitVectors(armUp,armVector.normalize());mesh.scale.y=length/arm.skinLength;}
}
