import * as THREE from './vendor/three.module.js';
import {cutConvexGeometry} from './convex-cut.js?v=20261015-tactics99';

export function doorAngle(age){
 const t=Math.max(0,age),end=Math.PI*.56;
 // A forceful push, hinge drag, then a small damped rebound against the stop.
 return t<.55?end*(1-Math.pow(1-t/.55,3)):end+Math.sin((t-.55)*13)*Math.exp(-(t-.55)*6)*.055;
}
export function createGunMapVisual(group,bodies){
 const changed=new Map(),scratch=new THREE.Object3D(),active=[],doors=new Map(),positions=[],normals=[],colors=[];
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85});
 const debris=new THREE.Mesh(new THREE.BufferGeometry(),material);debris.name='permanent cut traces';debris.receiveShadow=true;debris.visible=false;group.add(debris);
 const byId=new Map();for(const b of bodies)if(b.gunPropId){const list=byId.get(b.gunPropId)||[];list.push(b);byId.set(b.gunPropId,list);}
 function write(b,position,rotation,visible=true){scratch.position.copy(position);scratch.rotation.set(rotation.x,rotation.y,rotation.z);scratch.scale.set(visible?b.w:0,visible?b.h:0,visible?b.d:0);scratch.updateMatrix();b.mesh.setMatrixAt(b.instance,scratch.matrix);b.mesh.instanceMatrix.needsUpdate=true;}
 function door(list,angle){
  const bounds=list[0].gunBounds,hinge=bounds.x-bounds.w/2;
  for(const b of list){const dx=b.x-hinge,dz=b.z-bounds.z;write(b,new THREE.Vector3(hinge+dx*Math.cos(angle)+dz*Math.sin(angle),b.y,bounds.z-dx*Math.sin(angle)+dz*Math.cos(angle)),new THREE.Vector3(0,angle,0));}
 }
 function bake(mesh){mesh.updateMatrix();const g=mesh.geometry.clone().applyMatrix4(mesh.matrix),p=g.attributes.position,n=g.attributes.normal,c=mesh.userData.color;
  for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));colors.push(c.r,c.g,c.b);}g.dispose();mesh.removeFromParent();mesh.geometry.dispose();
 }
 function rebuild(){const g=new THREE.BufferGeometry();for(const [name,values]of [['position',positions],['normal',normals],['color',colors]])g.setAttribute(name,new THREE.Float32BufferAttribute(values,3));g.computeBoundingSphere();debris.geometry.dispose();debris.geometry=g;debris.visible=true;}
 function fragment(geometry,b,trace,index,side){
  const c=b.mesh.material.color.clone(),count=geometry.attributes.position.count,cs=[];for(let i=0;i<count;i++)cs.push(c.r,c.g,c.b);geometry.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));geometry.computeBoundingBox();
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.color=c;group.add(mesh);
  const bounds=b.gunBounds,floor=Number.isFinite(bounds.floor)?bounds.floor:.12,dir=new THREE.Vector3(...trace.normal);if(dir.lengthSq()<.01)dir.set(1,.2,.3);dir.normalize();
  const start=new THREE.Vector3(b.x,b.y,b.z),size=geometry.boundingBox.getSize(new THREE.Vector3()),spin=b.gunPropKind!=='bars'||size.y>size.z?new THREE.Vector3(Math.PI/2,0,side*.25):new THREE.Vector3(0,side*.6,0),radius=size.length()/2;
  // Falling segments land individually, with a single small bounce and no replay on join.
  const end=new THREE.Vector3(b.x+dir.x*(.48+index*.035)+side*.12,floor+.02+Math.min(.24,radius*.16),b.z+dir.z*(.48+index*.035)+side*.12);
  active.push({mesh,start,end,spin,floor,at:trace.at||0,fall:Math.sqrt(Math.max(.1,2*(start.y-end.y)/9.8)),radius});
 }
 function update(now=Date.now()){
  for(const [id,d]of doors){const age=Math.max(0,(now-(d.trace.at||0))/1000);door(d.list,doorAngle(age)*d.sign);if(age>2){door(d.list,Math.PI*.56*d.sign);doors.delete(id);}}
  let dirty=false;
  for(let i=active.length-1;i>=0;i--){const f=active[i],t=Math.max(0,(now-f.at)/1000),u=Math.min(1,t/f.fall),turn=u*u*(3-2*u);
   f.mesh.position.copy(f.start).lerp(f.end,u);f.mesh.position.y=Math.max(f.end.y,f.start.y-4.9*t*t)+ (t>f.fall?Math.abs(Math.sin((t-f.fall)*12))*Math.exp(-(t-f.fall)*9)*.07:0);
   f.mesh.rotation.set(f.spin.x*turn,f.spin.y*turn,f.spin.z*turn);
   // Keep rotated fragments above the ground, including long grille rods.
   const box=new THREE.Box3().setFromObject(f.mesh);if(box.min.y<f.floor)f.mesh.position.y+=f.floor-box.min.y;
   if(t>f.fall+.8){bake(f.mesh);active.splice(i,1);dirty=true;}
  }
  if(dirty)rebuild();
 }
 function reset(){
  for(const f of active){f.mesh.removeFromParent();f.mesh.geometry.dispose();}active.length=0;doors.clear();
  positions.length=normals.length=colors.length=0;debris.geometry.dispose();debris.geometry=new THREE.BufferGeometry();debris.visible=false;
  for(const id of changed.keys())for(const b of byId.get(id)||[]){b.disabled=false;write(b,new THREE.Vector3(b.x,b.y,b.z),new THREE.Vector3(0,b.rotation||0,0));}
  changed.clear();
 }
 function replace(traces=[],now=Date.now()){
  const next=new Map(traces.map(t=>[t.id,t]));
  if([...changed].some(([id,old])=>!next.has(id)||next.get(id).mode!==old.mode||next.get(id).at!==old.at))reset();
  apply(traces,now);
 }
 function apply(traces,now=Date.now()){
  for(const trace of traces||[]){if(changed.has(trace.id)&&!(changed.get(trace.id).mode==='open'&&trace.mode==='cut'))continue;const list=byId.get(trace.id);if(!list)continue;changed.set(trace.id,trace);doors.delete(trace.id);
   if(trace.mode==='open'&&list[0].gunPropKind==='door'){
    const sign=(trace.normal?.[2]||1)>0?-1:1;for(const b of list)b.disabled=true;doors.set(trace.id,{list,trace,sign});continue;
   }
   for(const [index,b]of list.entries()){
    b.disabled=true;write(b,new THREE.Vector3(b.x,b.y,b.z),new THREE.Vector3(),false);
    const geometry=new THREE.BoxGeometry(b.w,b.h,b.d),normal=new THREE.Vector3(...(trace.normal||[.65,.75,0])).normalize(),point=new THREE.Vector3(b.gunBounds.x-b.x,b.gunBounds.y-b.y,b.gunBounds.z-b.z);
    // Impact-broken rods kink at staggered heights; sword cuts retain the blade plane.
    if(trace.mode==='broken'){point.set(0,Math.sin(index*2.4)*b.h*.18,0);normal.set(.35,1,.15).normalize();}
    const cuts=cutConvexGeometry(geometry,point,normal);geometry.dispose();
    for(const cut of cuts){if(cut.volume<1e-8){cut.geometry.dispose();continue;}fragment(cut.geometry,b,trace,index,cut.side);}
   }
  }
  update(now);
 }
 return {apply,replace,reset,update,get changed(){return changed;}};
}
