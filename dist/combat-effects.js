import * as THREE from 'three';

// Fixed pools: no geometry, material or particle allocation during combat.
export function createCombatEffects(scene,{mobile=false}={}){
  const limit=mobile?96:192,geometry=new THREE.BoxGeometry(1,1,1);
  const material=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending});
  const mesh=new THREE.InstancedMesh(geometry,material,limit);mesh.name='Fist foot wind and impact sparks';mesh.frustumCulled=false;
  const transform=new THREE.Object3D(),axis=new THREE.Vector3(0,1,0),delta=new THREE.Vector3(),anchor=new THREE.Vector3(),color=new THREE.Color();
  const pool=Array.from({length:limit},()=>({position:new THREE.Vector3(),velocity:new THREE.Vector3(),rotation:new THREE.Quaternion(),life:0,duration:1,width:.03,length:.2,gravity:0,color:new THREE.Color()}));
  const tracks=new WeakMap();let cursor=0;
  for(let i=0;i<limit;i++){transform.scale.setScalar(0);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);}scene.add(mesh);
  function next(){const p=pool[cursor];cursor=(cursor+1)%limit;return p;}
  function wind(from,to,strength){
    delta.subVectors(to,from);const length=delta.length();if(length<.015||length>1.4)return;
    const p=next();p.position.copy(from).addScaledVector(delta,.5);p.rotation.setFromUnitVectors(axis,delta.multiplyScalar(1/length));
    p.velocity.set(0,.05,0);p.duration=.11+strength*.07;p.life=p.duration;p.width=.025+strength*.025;p.length=length+.12;p.gravity=0;p.color.set(strength>.75?'#fff2bb':'#d7ffff');
  }
  function attack(actor,kind,progress,serial,strength,rushing,dt){
    let track=tracks.get(actor);if(!track){track={serial:-1,last:[],valid:false,clock:0};for(let i=0;i<4;i++)track.last.push(new THREE.Vector3());tracks.set(actor,track);}
    const active=progress>.12&&progress<.94&&!rushing;actor.root.updateMatrixWorld(true);
    const kick=[2,3,7,8,9].includes(kind),left=kind===1,rightHand=kind!==1;
    for(let i=0;i<4;i++){
      const leg=i>1,side=i%2?'left':'right',joint=leg?actor.joints.knees[side]:actor.joints.elbows[side];
      anchor.set(0,-.33,leg?.08:0).applyMatrix4(joint.matrixWorld);
      const emitting=active&&(leg?kick:!kick&&(rightHand?side==='right':left&&side==='left')||kind>=10);
      if(emitting&&track.valid&&track.serial===serial)wind(track.last[i],anchor,strength);track.last[i].copy(anchor);
    }
    track.serial=serial;track.valid=active;
  }
  function impact(position,strength=0){
    for(let i=0;i<(mobile?12:22);i++){
      const p=next(),a=i*2.39996,b=(i%5)/4*Math.PI-.5*Math.PI,speed=3+strength*3+Math.random()*2;
      p.position.copy(position);p.velocity.set(Math.cos(a)*Math.cos(b)*speed,Math.sin(b)*speed+1.4,Math.sin(a)*Math.cos(b)*speed);
      delta.copy(p.velocity).normalize();p.rotation.setFromUnitVectors(axis,delta);p.duration=.18+Math.random()*.16;p.life=p.duration;p.width=.025+Math.random()*.025;p.length=.12+Math.random()*.22;p.gravity=8;p.color.set(i%3?'#ffc766':'#fff9dd');
    }
  }
  function update(dt){
    let active=0;
    for(let i=0;i<limit;i++){
      const p=pool[i];if(p.life>0){p.life=Math.max(0,p.life-dt);p.position.addScaledVector(p.velocity,dt);p.velocity.y-=p.gravity*dt;const fade=p.life/p.duration;
        transform.position.copy(p.position);transform.quaternion.copy(p.rotation);transform.scale.set(p.width*fade,p.length*(.35+.65*fade),p.width*fade);color.copy(p.color).multiplyScalar(fade);mesh.setColorAt(i,color);active++;
      }else transform.scale.setScalar(0);
      transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);
    }
    mesh.visible=active>0;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  }
  return {attack,impact,update,mesh,diagnostics:()=>({active:pool.filter(p=>p.life>0).length,limit}),dispose(){mesh.removeFromParent();geometry.dispose();material.dispose();tracks.delete(mesh);}};
}
