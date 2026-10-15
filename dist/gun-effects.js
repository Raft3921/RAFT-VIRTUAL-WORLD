import * as THREE from 'three';
export function createGunEffects(scene,{showRadius=true}={}){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d'),gradient=c.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,.9)');gradient.addColorStop(.35,'rgba(255,255,255,.55)');gradient.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=gradient;c.fillRect(0,0,64,64);const texture=new THREE.CanvasTexture(canvas);
 // Two shared billboard batches replace one scene object and draw per puff.
 const limit=224,live=new Set(),transform=new THREE.Object3D(),viewPosition=new THREE.Vector3();
 function batch(fire){
  const geometry=new THREE.PlaneGeometry(1,1),opacity=new THREE.InstancedBufferAttribute(new Float32Array(limit),1).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('puffOpacity',opacity);
  const material=new THREE.MeshBasicMaterial({map:texture,color:fire?'#ffffff':'#a79b88',transparent:true,depthWrite:false,blending:fire?THREE.AdditiveBlending:THREE.NormalBlending});
  material.onBeforeCompile=shader=>{
   shader.vertexShader='attribute float puffOpacity; varying float vPuffOpacity;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
    vPuffOpacity=puffOpacity;
    vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0);
    mvPosition.xy+=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));
    gl_Position=projectionMatrix*mvPosition;
   `);
   shader.fragmentShader='varying float vPuffOpacity;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vPuffOpacity;');
  };
  material.customProgramCacheKey=()=> 'instanced-gun-puff-1';
  const mesh=new THREE.InstancedMesh(geometry,material,limit);mesh.name=fire?'Batched explosion fire':'Batched gun smoke';mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
  const particles=[];
  // Smoke keeps back-to-front ordering separately for the main, scope and mirror views.
  function prepare(camera){
   if(!fire){for(const p of particles){viewPosition.copy(p.position).applyMatrix4(mesh.matrixWorld).applyMatrix4(camera.matrixWorldInverse);p.depth=viewPosition.z;}particles.sort((a,b)=>a.depth-b.depth);}
   for(let i=0;i<particles.length;i++){const p=particles[i];transform.position.copy(p.position);transform.scale.setScalar(p.drawSize);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);opacity.setX(i,p.opacity);mesh.setColorAt(i,p.color);}
   if(particles.length){mesh.instanceMatrix.addUpdateRange(0,particles.length*16);mesh.instanceMatrix.needsUpdate=true;opacity.addUpdateRange(0,particles.length);opacity.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  };
  return {mesh,particles,prepare};
 }
 const smoke=batch(false),fire=batch(true);
 // Populate GPU buffers before Three.js collects the render list and uploads them.
 // This runs for every camera, including the scope and mirror passes.
 let renderScene=scene;while(renderScene.parent)renderScene=renderScene.parent;
 const previousBeforeRender=renderScene.onBeforeRender;
 renderScene.onBeforeRender=function(renderer,renderedScene,camera,...rest){
  previousBeforeRender.call(this,renderer,renderedScene,camera,...rest);
  for(let parent=scene;parent;parent=parent.parent)if(!parent.visible)return;
  if(smoke.mesh.visible)smoke.prepare(camera);if(fire.mesh.visible)fire.prepare(camera);
 };
 const pool=Array.from({length:limit},()=>({position:new THREE.Vector3(),life:0,total:1,velocity:new THREE.Vector3(),size:1,drawSize:1,opacity:0,fire:false,center:new THREE.Vector3(),radius:0,depth:0,color:new THREE.Color(),gravity:0}));let cursor=0,blastCursor=0;
 // Reuse a bounded pool of blasts. The stationary shell is the authoritative radius;
 // the expanding ring and fireball are visual animation only.
 const shellGeometry=new THREE.SphereGeometry(1,24,12),ringGeometry=new THREE.RingGeometry(.965,1,64);
 const blasts=Array.from({length:8},()=>{
  const root=new THREE.Group(),shell=new THREE.Mesh(shellGeometry,new THREE.MeshBasicMaterial({color:'#ff9c32',wireframe:true,transparent:true,opacity:.4,depthWrite:false})),ring=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:'#fff0a3',side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending})),boundary=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:'#ffb347',side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false}));
  shell.visible=boundary.visible=showRadius;ring.rotation.x=boundary.rotation.x=-Math.PI/2;root.add(shell,ring,boundary);root.visible=false;scene.add(root);return {root,shell,ring,boundary,life:0,radius:12};
 });
 function puff(position,velocity,size,life,fire=false,radius=0,center=position,tint=fire?'#ffd078':'#a79b88',gravity=0){const p=pool[cursor++%pool.length];p.position.copy(position);p.velocity.copy(velocity);p.life=p.total=life;p.size=size;p.fire=fire;p.radius=radius;p.center.copy(center);p.color.set(tint);p.gravity=gravity;live.add(p);}
 const casingMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',metalness:.65,roughness:.36}),72);casingMesh.name='Pooled shell casings and combat confetti';casingMesh.visible=false;casingMesh.count=0;casingMesh.frustumCulled=false;scene.add(casingMesh);
 const casings=Array.from({length:72},()=>({position:new THREE.Vector3(),velocity:new THREE.Vector3(),rotation:new THREE.Vector3(),size:new THREE.Vector3(),color:new THREE.Color(),life:0,floor:0,confetti:false}));let casingCursor=0,waveCursor=0;
 const waves=Array.from({length:12},()=>{const mesh=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:'#ffe0a0',side:THREE.DoubleSide,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));mesh.rotation.x=-Math.PI/2;mesh.visible=false;scene.add(mesh);return {mesh,life:0,total:1,radius:1};});
 function wave(position,radius=1,color='#ffe0a0'){const w=waves[waveCursor++%waves.length];w.mesh.position.copy(position);w.mesh.position.y+=.035;w.life=w.total=.48;w.radius=radius;w.mesh.material.color.set(color);w.mesh.visible=true;}
 function chip(position,velocity,size,floor,color='#dba64c',confetti=false){const p=casings[casingCursor++%casings.length];p.position.copy(position);p.velocity.copy(velocity);p.size.copy(size);p.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);p.color.set(color);p.life=confetti?2.4:1.8;p.floor=floor;p.confetti=confetti;}
 function burst(position,count,speed,color='#ffcf78',size=.075){for(let i=0;i<count;i++){const a=i*2.39996;const v=new THREE.Vector3(Math.cos(a)*(1+Math.random())*speed,.6+Math.random()*speed,Math.sin(a)*(1+Math.random())*speed);puff(position,v,size,.3+Math.random()*.35,true,0,position,color,3);}}
 return {
  action(kind,position,strength=1,direction=new THREE.Vector3()){
   const amount=Math.max(.2,Math.min(1.6,strength)),step=kind==='step';
   if(kind==='mantle'){burst(position.clone().add(new THREE.Vector3(0,1.4,0)),5,.5,'#9cefff',.035);return;}
   if(!step)wave(position,kind==='eliminate'?2.5:kind==='land'?1.1+amount:1.0,kind==='jump'?'#9cddff':kind==='eliminate'?'#ffbe69':'#ffe0aa');
   const count=step?3:kind==='eliminate'?22:kind==='land'?Math.round(8+amount*6):7;
   for(let i=0;i<count;i++){const a=i*2.39996,v=new THREE.Vector3(Math.cos(a)*amount*(step?.35:1.7),.2+Math.random()*.5,Math.sin(a)*amount*(step?.35:1.7));v.addScaledVector(direction,-.16);puff(position,v,(step?.06:.11)*amount,step?.3:.5+Math.random()*.3);}
   if(kind==='jump'||kind==='eliminate')burst(position,kind==='eliminate'?18:7,kind==='eliminate'?2.2:.9,kind==='jump'?'#a3e9ff':'#ffd27b',.055);
  },
  eject(position,aim,weapon,floor=position.y-1.3){if(weapon==='rocket'||weapon==='katana')return;const side=new THREE.Vector3(aim.z,.45,-aim.x).normalize();chip(position,side.multiplyScalar(1.8+Math.random()).add(new THREE.Vector3(0,.8,0)),new THREE.Vector3(.025,.025,weapon==='shotgun'?.085:.055),floor,weapon==='shotgun'?'#d25740':'#e9b858');},
  reload(position,aim,weapon,stage,floor=position.y-1.1){
   if(stage==='out'){chip(position,new THREE.Vector3(aim.z*.8,-.8,-aim.x*.8),new THREE.Vector3(.09,weapon==='rocket'?.32:.22,.13),floor,'#414d5a');puff(position,new THREE.Vector3(0,.25,0),.07,.3);}
   else burst(position,stage==='snap'?9:5,stage==='snap'?.85:.4,'#a9ddff',.028);
  },
  celebrate(position,won=true){wave(position,3.8,won?'#ffe78b':'#91c5ff');burst(position.clone().add(new THREE.Vector3(0,1,0)),32,3,won?'#ffd776':'#a5dcff',.10);
   for(let i=0;i<44;i++){const a=i*2.39996;chip(position.clone().add(new THREE.Vector3(0,1.3,0)),new THREE.Vector3(Math.cos(a)*(2+Math.random()*3),3+Math.random()*4,Math.sin(a)*(2+Math.random()*3)),new THREE.Vector3(.035,.08,.012),position.y,i%3?'#ffe28c':'#9aebff',true);}
  },
  muzzle(position,aim){burst(position,7,.75,'#ffdf9e',.06);for(let i=0;i<5;i++)puff(position,new THREE.Vector3((Math.random()-.5)*.3,.35+Math.random()*.2,(Math.random()-.5)*.3).addScaledVector(aim,.55),.12,.3+Math.random()*.3);},
  impact(position,explosion,radius=12){
   if(!explosion){burst(position,10,1.5,'#ffcf80',.045);for(let i=0;i<4;i++)puff(position,new THREE.Vector3((Math.random()-.5)*.35,.25,(Math.random()-.5)*.35),.1,.4);return;}
   const blast=blasts[blastCursor++%blasts.length];blast.root.position.copy(position);blast.radius=radius;blast.life=1.25;blast.shell.scale.setScalar(radius);blast.boundary.scale.setScalar(radius);blast.ring.scale.setScalar(.05);blast.root.visible=true;
   puff(position,new THREE.Vector3(),radius*1.3,.38,true,radius);
   for(let i=0;i<36;i++){
    const a=i*2.39996,y=1-2*(i+.5)/36,h=Math.sqrt(1-y*y),direction=new THREE.Vector3(Math.cos(a)*h,y,Math.sin(a)*h);
    puff(position.clone().addScaledVector(direction,radius*.12),direction.multiplyScalar(radius*(.8+Math.random()*.5)),radius*(i<20?.28:.22),i<20?.5+Math.random()*.3:1.4+Math.random()*.6,i<20,radius,position);
   }
   for(let i=0;i<10;i++)puff(position,new THREE.Vector3((Math.random()-.5)*radius,2+Math.random()*3,(Math.random()-.5)*radius),radius*.35,1.8+Math.random()*.5,false,radius);
  },
  update(dt){
   for(const w of waves){if(w.life<=0)continue;w.life=Math.max(0,w.life-dt);const t=1-w.life/w.total;w.mesh.visible=w.life>0;w.mesh.scale.setScalar(w.radius*(.15+t*.85));w.mesh.material.opacity=(1-t)*.65;}
   let shellCount=0;for(const p of casings){p.life-=dt;if(p.life<=0)continue;p.velocity.y-=dt*(p.confetti?3.8:9.8);p.position.addScaledVector(p.velocity,dt);if(p.position.y<p.floor+.025){p.position.y=p.floor+.025;p.velocity.y=Math.abs(p.velocity.y)*.23;p.velocity.x*=.65;p.velocity.z*=.65;}p.rotation.x+=dt*(p.confetti?5:12);p.rotation.z+=dt*(p.confetti?3:9);transform.position.copy(p.position);transform.rotation.set(p.rotation.x,p.rotation.y,p.rotation.z);transform.scale.copy(p.size).multiplyScalar(Math.min(1,p.life/.2));transform.updateMatrix();casingMesh.setMatrixAt(shellCount,transform.matrix);casingMesh.setColorAt(shellCount++,p.color);}casingMesh.count=shellCount;casingMesh.visible=shellCount>0;if(shellCount){casingMesh.instanceMatrix.needsUpdate=true;casingMesh.instanceColor.needsUpdate=true;}transform.rotation.set(0,0,0);
   for(const blast of blasts){if(blast.life<=0)continue;blast.life=Math.max(0,blast.life-dt);blast.root.visible=blast.life>0;const age=1-blast.life/1.25,fade=Math.min(1,blast.life/.45);blast.shell.material.opacity=.32*fade;blast.boundary.material.opacity=.8*fade;blast.ring.scale.setScalar(blast.radius*Math.min(1,age/.32));blast.ring.material.opacity=.9*Math.max(0,1-age/.6);}
   smoke.particles.length=fire.particles.length=0;
   for(const p of live){
    p.life-=dt;if(p.life<=0){live.delete(p);continue;}
    const age=1-p.life/p.total;p.position.addScaledVector(p.velocity,dt);p.velocity.y-=p.gravity*dt;p.velocity.multiplyScalar(Math.exp(-dt*1.4));let size=p.size*(1+age*(p.fire?1.4:3));
    if(p.radius){const distance=p.position.distanceTo(p.center),maxDistance=p.radius*.72;if(distance>maxDistance)p.position.sub(p.center).multiplyScalar(maxDistance/distance).add(p.center);size=Math.min(size,Math.max(0,p.radius-p.position.distanceTo(p.center))*Math.SQRT2);}
    p.drawSize=size;p.opacity=(p.fire?.95:.5)*Math.sin(Math.PI*Math.min(1,age+.15))*Math.max(0,1-age);(p.fire?fire:smoke).particles.push(p);
   }
   smoke.mesh.count=smoke.particles.length;smoke.mesh.visible=smoke.mesh.count>0;fire.mesh.count=fire.particles.length;fire.mesh.visible=fire.mesh.count>0;
  },
  get stats(){return {particles:live.size,casings:casings.filter(p=>p.life>0).length,waves:waves.filter(w=>w.life>0).length,particleLimit:limit,casingLimit:casings.length,waveLimit:waves.length};}
 };
}
