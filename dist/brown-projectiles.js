import * as THREE from 'three';
import {BROWN_PROJECTILE,projectileAt} from './projectile-motion.js?v=20261010-free-cook71';

export function createBrownProjectiles(scene,{world=()=>null,targets=()=>[],onLocalHit=()=>{},onImpact=()=>{}}={}){
  const limit=24,parts=[[0,0,0,.31,.28,.32],[-.13,.04,.02,.18,.19,.24],[.12,.06,-.03,.2,.22,.2],[0,.13,.01,.22,.15,.25],[.03,-.1,.04,.24,.12,.23],[-.1,.15,-.06,.1,.08,.09],[.14,-.01,.14,.08,.09,.07]];
  const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshStandardMaterial({roughness:1,color:0xffffff});
  const mesh=new THREE.InstancedMesh(geometry,material,limit*parts.length);mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);
  const slots=new Array(limit).fill(null),transform=new THREE.Object3D(),rotation=new THREE.Quaternion(),angles=new THREE.Euler(),offset=new THREE.Vector3(),start=new THREE.Vector3(),end=new THREE.Vector3(),color=new THREE.Color();
  for(let slot=0;slot<limit;slot++)for(let n=0;n<parts.length;n++)mesh.setColorAt(slot*parts.length+n,color.set(['#7f512f','#9e6840','#b58250','#ad7844','#61402a','#d49e61','#b38355'][n]));
  function spawn(p,local=false){let slot=p.owner&&Number.isInteger(p.serial)?slots.findIndex(s=>s&&s.owner===p.owner&&s.serial===p.serial):-1;const predicted=slot>=0?slots[slot]:null;if(slot<0)slot=slots.findIndex(s=>!s);if(slot<0)return;slots[slot]={...p,local,receivedAt:predicted?.receivedAt??performance.now()-Math.max(0,Math.min(250,Date.now()-p.born)),previous:{x:p.x,y:p.y,z:p.z}};}
  function finish(message){const slot=slots.findIndex(s=>s?.id===message.id);if(slot<0)return;slots[slot]=null;if(message.reason==='hit'||message.reason==='wall')onImpact(message.position);}
  function launch(position,yaw,{predicted=false,owner=null,serial=0}={}){const p={id:'local-'+performance.now(),owner,serial,x:position.x+Math.sin(yaw)*.65,y:position.y+.9,z:position.z+Math.cos(yaw)*.65,vx:Math.sin(yaw)*BROWN_PROJECTILE.speed,vy:BROWN_PROJECTILE.up,vz:Math.cos(yaw)*BROWN_PROJECTILE.speed,born:Date.now()};spawn(p,!predicted);}
  function cancelPrediction(owner,serial){const slot=slots.findIndex(s=>s&&s.owner===owner&&s.serial===serial&&s.id.startsWith('local-'));if(slot>=0)slots[slot]=null;}
  function clear(){slots.fill(null);mesh.visible=false;}
  function update(){
    if(!mesh.visible&&!slots.some(Boolean))return;
    let live=0;const now=performance.now();
    for(let slot=0;slot<limit;slot++){
      let p=slots[slot],point=null,t=0;
      if(p){t=(now-p.receivedAt)/1000;if(t>BROWN_PROJECTILE.life){slots[slot]=null;p=null;}else{point=projectileAt(p,p.born+t*1000);
        if(p.local){start.set(p.previous.x,p.previous.y,p.previous.z);end.set(point.x,point.y,point.z);const blocked=world()?.cameraPosition(start,end,BROWN_PROJECTILE.radius),floor=world()?.floorAt(end,end.y).y??0;let hit=null;const segment=end.clone().sub(start),length=segment.lengthSq();let nearest=Infinity;
          for(const target of targets()){const centre=target.position.clone();centre.y+=target.height*.5;const fraction=length?Math.max(0,Math.min(1,centre.clone().sub(start).dot(segment)/length)):0;const closest=start.clone().addScaledVector(segment,fraction);if(closest.distanceTo(centre)<target.height*.45+BROWN_PROJECTILE.radius&&fraction<nearest){nearest=fraction;hit=target;}}
          if(blocked&&blocked.distanceTo(end)>.02||point.y<=floor+BROWN_PROJECTILE.radius){slots[slot]=null;onImpact(blocked||end);p=null;}
          else if(hit){slots[slot]=null;onLocalHit(hit.index,p);onImpact(point);p=null;}
        }
        if(p)p.previous=point;
      }}
      if(p){live++;angles.set(t*8,Math.atan2(p.vx,p.vz)+t*5,t*4);rotation.setFromEuler(angles);}
      for(let n=0;n<parts.length;n++){if(p){const [x,y,z,w,h,d]=parts[n];offset.set(x,y,z).applyQuaternion(rotation);transform.position.set(point.x,point.y,point.z).add(offset);transform.quaternion.copy(rotation);transform.scale.set(w,h,d);}else transform.scale.setScalar(0);transform.updateMatrix();mesh.setMatrixAt(slot*parts.length+n,transform.matrix);}
    }
    mesh.visible=live>0;mesh.instanceMatrix.needsUpdate=true;
  }
  return {spawn,finish,launch,cancelPrediction,update,clear};
}
