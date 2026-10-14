import * as THREE from 'three';
export function createGunEffects(scene){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d'),gradient=c.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,.9)');gradient.addColorStop(.35,'rgba(255,255,255,.55)');gradient.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=gradient;c.fillRect(0,0,64,64);const texture=new THREE.CanvasTexture(canvas);
 const pool=Array.from({length:144},()=>{const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}),mesh=new THREE.Sprite(material);mesh.visible=false;scene.add(mesh);return {mesh,life:0,total:1,velocity:new THREE.Vector3(),size:1,fire:false,center:new THREE.Vector3(),radius:0};});let cursor=0,blastCursor=0;
 // Reuse a bounded pool of blasts. The stationary shell is the authoritative radius;
 // the expanding ring and fireball are visual animation only.
 const shellGeometry=new THREE.SphereGeometry(1,24,12),ringGeometry=new THREE.RingGeometry(.965,1,64);
 const blasts=Array.from({length:8},()=>{
  const root=new THREE.Group(),shell=new THREE.Mesh(shellGeometry,new THREE.MeshBasicMaterial({color:'#ff9c32',wireframe:true,transparent:true,opacity:.4,depthWrite:false})),ring=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:'#fff0a3',side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending})),boundary=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:'#ffb347',side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false}));
  ring.rotation.x=boundary.rotation.x=-Math.PI/2;root.add(shell,ring,boundary);root.visible=false;scene.add(root);return {root,shell,ring,boundary,life:0,radius:12};
 });
 function puff(position,velocity,size,life,fire=false,radius=0,center=position){const p=pool[cursor++%pool.length];p.mesh.position.copy(position);p.velocity.copy(velocity);p.life=p.total=life;p.size=size;p.fire=fire;p.radius=radius;p.center.copy(center);p.mesh.material.color.set(fire?'#ffbd61':'#68615a');p.mesh.material.blending=fire?THREE.AdditiveBlending:THREE.NormalBlending;p.mesh.visible=true;}
 return {
  muzzle(position,aim){for(let i=0;i<3;i++)puff(position,new THREE.Vector3((Math.random()-.5)*.17,.25+Math.random()*.12,(Math.random()-.5)*.17).addScaledVector(aim,.25),.09,.45+Math.random()*.3);},
  impact(position,explosion,radius=12){
   if(!explosion){for(let i=0;i<2;i++)puff(position,new THREE.Vector3((Math.random()-.5)*.35,.25,(Math.random()-.5)*.35),.1,.4);return;}
   const blast=blasts[blastCursor++%blasts.length];blast.root.position.copy(position);blast.radius=radius;blast.life=1.25;blast.shell.scale.setScalar(radius);blast.boundary.scale.setScalar(radius);blast.ring.scale.setScalar(.05);blast.root.visible=true;
   puff(position,new THREE.Vector3(),radius*1.3,.38,true,radius);
   for(let i=0;i<36;i++){
    const a=i*2.39996,y=1-2*(i+.5)/36,h=Math.sqrt(1-y*y),direction=new THREE.Vector3(Math.cos(a)*h,y,Math.sin(a)*h);
    puff(position.clone().addScaledVector(direction,radius*.12),direction.multiplyScalar(radius*(.8+Math.random()*.5)),radius*(i<20?.28:.22),i<20?.5+Math.random()*.3:1.4+Math.random()*.6,i<20,radius,position);
   }
   for(let i=0;i<10;i++)puff(position,new THREE.Vector3((Math.random()-.5)*radius,2+Math.random()*3,(Math.random()-.5)*radius),radius*.35,1.8+Math.random()*.5,false,radius);
  },
  update(dt){
   for(const blast of blasts){if(blast.life<=0)continue;blast.life=Math.max(0,blast.life-dt);blast.root.visible=blast.life>0;const age=1-blast.life/1.25,fade=Math.min(1,blast.life/.45);blast.shell.material.opacity=.32*fade;blast.boundary.material.opacity=.8*fade;blast.ring.scale.setScalar(blast.radius*Math.min(1,age/.32));blast.ring.material.opacity=.9*Math.max(0,1-age/.6);}
   for(const p of pool){if(p.life<=0)continue;p.life-=dt;p.mesh.visible=p.life>0;const age=1-p.life/p.total;p.mesh.position.addScaledVector(p.velocity,dt);p.velocity.multiplyScalar(Math.exp(-dt*1.4));let size=p.size*(1+age*(p.fire?1.4:3));if(p.radius){const distance=p.mesh.position.distanceTo(p.center),maxDistance=p.radius*.72;if(distance>maxDistance)p.mesh.position.sub(p.center).multiplyScalar(maxDistance/distance).add(p.center);size=Math.min(size,Math.max(0,p.radius-p.mesh.position.distanceTo(p.center))*Math.SQRT2);}p.mesh.scale.setScalar(size);p.mesh.material.opacity=(p.fire?.95:.5)*Math.sin(Math.PI*Math.min(1,age+.15))*Math.max(0,1-age);}
  }
 };
}
