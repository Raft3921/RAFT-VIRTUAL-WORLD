import * as THREE from 'three';

// Small upright rigid boxes share the world's furniture/floor collision solver.
// They never become player colliders, so a dropped spoon cannot block walking.
export function createCookingPlacement({scene,camera,get,modelFor,bounds}){
 const root=new THREE.Group();root.name='Cooking loose objects';scene.add(root);
 const material=new THREE.MeshBasicMaterial({color:'#b6e881',transparent:true,opacity:.3,depthWrite:false});
 const ghost=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);ghost.visible=false;ghost.raycast=()=>{};scene.add(ghost);
 const bodies=[],ray=new THREE.Raycaster();let serial=0,preview=null,measuredHand=null,measuredShape=null;
 function dispose(model){model.traverse(o=>{if(o.isInstancedMesh)o.dispose();});}
 function build(payload){
  const model=modelFor(payload),wrapper=new THREE.Group();wrapper.add(model);wrapper.updateMatrixWorld(true);
  const box=new THREE.Box3();
  model.traverse(mesh=>{if(!mesh.isMesh)return;let node=mesh;while(node&&node!==wrapper){if(node.userData.effect)return;node=node.parent;}box.expandByObject(mesh);});
  const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(center.x,box.min.y,center.z));
  return {model:wrapper,shape:{width:Math.max(.025,size.x/2),depth:Math.max(.025,size.z/2),height:Math.max(.035,size.y),yaw:0}};
 }
 function overlapping(p,shape,other){return Math.abs(p.x-other.p.x)<shape.width+other.shape.width&&Math.abs(p.z-other.p.z)<shape.depth+other.shape.depth&&p.y<other.p.y+other.shape.height-.002&&p.y+shape.height>other.p.y+.002;}
 function aim(payload,ndc={x:0,y:0}){
  camera.updateMatrixWorld(true);ray.setFromCamera(ndc,camera);
  const world=get().world,from=ray.ray.origin,to=from.clone().addScaledVector(ray.ray.direction,3.5),point=world.cameraPosition(from,to,.006);
  let surface=point.distanceTo(to)>.005,normal=surface?world.surfaceNormal(point,ray.ray.direction):null;
  const floor=bounds().floor;
  if(ray.ray.direction.y<-.001){const t=(floor-from.y)/ray.ray.direction.y;if(t>0&&t<=3.5&&(!surface||t<from.distanceTo(point))){point.copy(from).addScaledVector(ray.ray.direction,t);normal=new THREE.Vector3(0,1,0);surface=true;}}
  root.updateMatrixWorld(true);
  for(const hit of ray.intersectObject(root,true)){if(hit.distance>3.5||surface&&hit.distance>=from.distanceTo(point))break;let object=hit.object;while(object&&!object.userData.body)object=object.parent;const body=object?.userData.body;if(!body)continue;point.set(hit.point.x,body.p.y+body.shape.height,hit.point.z);normal=new THREE.Vector3(0,1,0);surface=true;break;}
  if(measuredHand!==payload){const item=build(payload);measuredShape=item.shape;measuredHand=payload;dispose(item.model);}
  const p=point.clone();p.y+=.09;const b=bounds(),s=measuredShape;
  const valid=surface&&normal.y>.7&&p.x-s.width>=b.minX&&p.x+s.width<=b.maxX&&p.z-s.depth>=b.minZ&&p.z+s.depth<=b.maxZ&&world.canStand(p,s)&&!bodies.some(other=>overlapping(p,s,other));
  preview={p,shape:s,valid};
  ghost.position.copy(p).y+=s.height/2;ghost.scale.set(s.width*2,s.height,s.depth*2);ghost.material.color.set(valid?'#b6e881':'#ed8c66');ghost.visible=true;
  return valid;
 }
 function release(payload,ndc){
  if(bodies.length>=64)return '置ける物は64個までです。食材を回収して容器にまとめてください';
  if(!aim(payload,ndc))return '近くの平らで空いている場所を狙ってください';
  const item=build(payload),body={id:++serial,payload,...item,p:preview.p.clone(),velocity:new THREE.Vector3(),spin:0};
  body.model.userData.body=body;body.model.position.copy(body.p);root.add(body.model);bodies.push(body);hide();return null;
 }
 function take(body){const index=bodies.indexOf(body);if(index<0)return null;bodies.splice(index,1);body.model.removeFromParent();dispose(body.model);return body.payload;}
 function refresh(){measuredHand=null;for(const body of bodies){const next=build(body.payload);body.model.removeFromParent();dispose(body.model);body.model=next.model;body.shape=next.shape;body.model.userData.body=body;body.model.position.copy(body.p);root.add(body.model);}}
 function update(dt){
  const steps=Math.max(1,Math.ceil(Math.min(dt,.1)/(1/90))),step=Math.min(dt,.1)/steps;
  for(let i=0;i<steps;i++)for(const body of bodies){
   const old=body.p.clone();body.velocity.y-=9.81*step;const falling=body.velocity.y,result=get().world.move(body.p,body.velocity,step,{shape:body.shape,ragdoll:true});
   let grounded=result.grounded;
   for(const other of bodies){if(other===body||!overlapping(body.p,body.shape,other))continue;
    const top=other.p.y+other.shape.height;
    if(old.y>=top-.025&&falling<=0){body.p.y=top;body.velocity.y=0;grounded=true;}
    else{const dx=body.p.x-other.p.x,dz=body.p.z-other.p.z,px=body.shape.width+other.shape.width-Math.abs(dx),pz=body.shape.depth+other.shape.depth-Math.abs(dz);if(px<pz){body.p.x+=Math.sign(dx||1)*px;body.velocity.x*=.25;}else{body.p.z+=Math.sign(dz||1)*pz;body.velocity.z*=.25;}}
   }
   if(grounded){if(falling<-.8){body.velocity.y=-falling*.12;body.spin=Math.min(.04,-falling*.008);}body.velocity.x*=Math.exp(-step*12);body.velocity.z*=Math.exp(-step*12);}
   body.spin*=Math.exp(-step*15);body.model.position.copy(body.p);
  }
 }
 function hide(){ghost.visible=false;preview=null;}
 return {root,bodies,aim,release,take,refresh,update,hide,clear(){for(const body of [...bodies])take(body);hide();},get valid(){return !!preview?.valid;}};
}
