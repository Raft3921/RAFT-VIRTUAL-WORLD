import * as THREE from './vendor/three.module.js';
import {ARENA,COURSE} from './world-layout.js';
import {rampHeight} from './plaza-surfaces.js';

export function createCollisionWorld(bodies,{moving=[],falling=[],pulsing=[]}={}){
 let worldTime=0; const previous=new THREE.Vector3(),movementBounds=new Map();
 let api;
  // Broad-phase buckets avoid scanning the 600 platforms during every physics substep.
  const buckets=new Map();
  for(const b of bodies){const extent=Math.hypot(b.w,b.d)/2+1+(b.motionMargin||0);for(let x=Math.floor((b.x-extent)/12);x<=Math.floor((b.x+extent)/12);x++)for(let z=Math.floor((b.z-extent)/12);z<=Math.floor((b.z+extent)/12);z++){const k=x+','+z;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(b);}}
  const housingBodies=new Map(),housingBuckets=new Map(),nearbyCache=new Map(),housingSeatLists=new Map(),housingBedLists=new Map();let housingSeats=[],housingBeds=[];
  function setHouseBodies(index,list,roomSeats=[],roomBeds=[]){
    housingBodies.set(index,list);housingSeatLists.set(index,roomSeats);housingBedLists.set(index,roomBeds);housingSeats=[...housingSeatLists.values()].flat();housingBeds=[...housingBedLists.values()].flat();housingBuckets.clear();nearbyCache.clear();
    for(const records of housingBodies.values())for(const b of records){const extent=Math.hypot(b.w,b.d)/2+1;for(let x=Math.floor((b.x-extent)/12);x<=Math.floor((b.x+extent)/12);x++)for(let z=Math.floor((b.z-extent)/12);z<=Math.floor((b.z+extent)/12);z++){const key=x+','+z;if(!housingBuckets.has(key))housingBuckets.set(key,[]);housingBuckets.get(key).push(b);}}
  }
  function nearby(p){const key=Math.floor(p.x/12)+','+Math.floor(p.z/12);if(!nearbyCache.has(key))nearbyCache.set(key,(buckets.get(key)||[]).concat(housingBuckets.get(key)||[]));return nearbyCache.get(key);}
  function localPoint(p,b){const c=Math.cos(b.rotation||0),s=Math.sin(b.rotation||0),x=p.x-b.x,z=p.z-b.z;return {x:c*x-s*z,z:s*x+c*z,c,s};}
  function terrainHeight(p){const distance=Math.hypot(p.x-ARENA.x,p.z-ARENA.z);return distance<ARENA.radius?.24:distance<33.1?.12:0;}
  function floorAt(p,limit=p.y+.48){
    let floor=terrainHeight(p),body=null;
    for(const b of nearby(p)){const q=localPoint(p,b),top=b.ramp?rampHeight(b,q.z):b.y+b.h/2;if(!b.disabled&&Math.abs(q.x)<b.w/2+.12&&Math.abs(q.z)<b.d/2+.12&&top<=limit&&top>=floor){floor=top;body=b;}}
    return {y:floor,body};
  }
  // Read-only occupancy query for entering activities at an unobstructed spot.
  function canStand(p,shape=null,margin=.04){
    for(const bound of movementBounds.values())if(Math.abs(p.x-bound.x)<70&&Math.abs(p.z-(bound.z-62.5))<55&&!bound.allowed(p.x,p.z))return false;
    const height=shape?.height||1.9,width=shape?.width||.32,depth=shape?.depth||.32,angle=shape?.yaw||0;
    for(const b of nearby(p)){
      const q=localPoint(p,b);
      if(b.disabled||(b.ramp?rampHeight(b,q.z):b.y+b.h/2)<=p.y+.04||b.y-b.h/2>=p.y+height)continue;
      const relative=angle-(b.rotation||0),rx=Math.abs(Math.cos(relative))*width+Math.abs(Math.sin(relative))*depth,rz=Math.abs(Math.sin(relative))*width+Math.abs(Math.cos(relative))*depth;
      if(Math.abs(q.x)<b.w/2+rx+margin&&Math.abs(q.z)<b.d/2+rz+margin)return false;
    }
    return true;
  }
  function move(p,vel,dt,{ragdoll=false,insideArena=false,lockedInArena=false,shape=null}={}){
    const height=shape?.height||1.9,width=shape?.width||.32,depth=shape?.depth||.32,angle=shape?.yaw||0,offset=shape?.offset||0;
    const offsetX=-Math.sin(angle)*offset,offsetZ=-Math.cos(angle)*offset;
    const slices=Math.max(1,Math.ceil(vel.length()*dt/.18)),step=dt/slices;
    let grounded=false,landed=null;
    for(let s=0;s<slices;s++){
      const support=floorAt(p,p.y+.035),wasSupported=vel.y<=0&&Math.abs(p.y-support.y)<.04;
      grounded=false;landed=null;
      previous.copy(p);p.addScaledVector(vel,step);
      const center={x:p.x+offsetX,z:p.z+offsetZ};
      for(const b of nearby(center)){
        if(b.disabled||api.portalPassage?.(b,p,previous,height))continue;
        const q=localPoint({x:p.x+offsetX,z:p.z+offsetZ},b),relative=angle-(b.rotation||0),rxExtent=shape?Math.abs(Math.cos(relative))*width+Math.abs(Math.sin(relative))*depth:.32,rzExtent=shape?Math.abs(Math.sin(relative))*width+Math.abs(Math.cos(relative))*depth:.32;
        const bottom=b.y-b.h/2,top=b.ramp?rampHeight(b,q.z):b.y+b.h/2;
        if(Math.abs(q.x)>=b.w/2+rxExtent||Math.abs(q.z)>=b.d/2+rzExtent)continue;
        if(b.ramp){
          const prior=localPoint({x:previous.x+offsetX,z:previous.z+offsetZ},b),priorHeight=rampHeight(b,prior.z);
          const along=Math.abs(prior.x)<b.w/2-rxExtent*.25;
          const rise=top-previous.y,climb=wasSupported&&along&&Math.abs(previous.y-priorHeight)<.08&&rise<=.20&&rise>=-.20;
          const landing=vel.y<=0&&previous.y>=top-.002&&p.y<=top;
          if(climb||landing){p.y=top;vel.y=0;grounded=true;landed=b;continue;}
        }
        if(vel.y<=0&&previous.y>=top-.002&&p.y<=top){p.y=top;vel.y=0;grounded=true;landed=b;if(b.activatedAt===null)b.activatedAt=worldTime;continue;}
        if(vel.y>0&&previous.y+height<=bottom+.025&&p.y+height>=bottom){p.y=bottom-height;vel.y=0;continue;}
        if(p.y>=top-.02||p.y+height-.05<=bottom)continue;
        if(wasSupported&&top-previous.y<=(b.kind==='snake'?.14:.28)&&top>previous.y&&vel.y<=0&&(!b.course||b.kind==='snake')&&!ragdoll&&canStand({x:p.x,y:top,z:p.z},shape)){p.y=top;grounded=true;landed=b;continue;}
        const rx=b.w/2+rxExtent-Math.abs(q.x),rz=b.d/2+rzExtent-Math.abs(q.z);
        const nx=rx<rz?Math.sign(q.x||1)*q.c:Math.sign(q.z||1)*q.s,nz=rx<rz?-Math.sign(q.x||1)*q.s:Math.sign(q.z||1)*q.c;
        const penetration=Math.min(rx,rz);p.x+=nx*penetration;p.z+=nz*penetration;
        const speed=vel.x*nx+vel.z*nz;if(speed<0){vel.x-=speed*nx*(ragdoll?1.08:1);vel.z-=speed*nz*(ragdoll?1.08:1);}
      }
      if(lockedInArena||ragdoll&&insideArena){
        const dx=p.x+offsetX-ARENA.x,dy=Math.max(0,p.y+height/2-.24),dz=p.z+offsetZ-ARENA.z,r=ARENA.radius-Math.max(.65,depth*.75),len=Math.hypot(dx,dy,dz);
        if(len>r){const nx=dx/len,ny=dy/len,nz=dz/len;p.set(ARENA.x+nx*r-offsetX,Math.max(.24,.24+ny*r-height/2),ARENA.z+nz*r-offsetZ);const dot=vel.x*nx+vel.y*ny+vel.z*nz;if(dot>0){const restitution=ragdoll?1.10:1,damping=ragdoll?.68:1;vel.x=(vel.x-dot*nx*restitution)*damping;vel.y=(vel.y-dot*ny*restitution)*damping;vel.z=(vel.z-dot*nz*restitution)*damping;}}
      }
      for(const bound of movementBounds.values())if(Math.abs(previous.x-bound.x)<70&&Math.abs(previous.z-(bound.z-62.5))<55&&!bound.allowed(p.x,p.z)){p.x=previous.x;p.z=previous.z;vel.x=0;vel.z=0;break;}
      const ground=terrainHeight(p);
      if(p.y<=ground){p.y=ground;vel.y=0;grounded=true;}
    }
    return {grounded,body:landed};
  }

 function update(t){worldTime=t;
  for(const b of moving){b.motionTime=t;const x=b.x,y=b.y,z=b.z;if(b.lift)b.y=b.originY+Math.sin(t*.9+b.phase)*b.amplitude;else if(b.forward)b.x=b.originX+Math.sin(t*.9+b.phase)*b.amplitude;else b.z=b.originZ+Math.sin(t*.9+b.phase)*b.amplitude;b.deltaX=b.x-x;b.deltaY=b.y-y;b.deltaZ=b.z-z;}
  for(const b of falling){const age=b.activatedAt===null?0:t-b.activatedAt;b.disabled=age>=.65;if(age>4){b.activatedAt=null;b.disabled=false;b.y=b.originY;}else if(b.disabled)b.y=b.originY-Math.min(8,(age-.65)**2*6);}
  for(const b of pulsing)b.disabled=(t+b.phase)%5>4;
 }
 api={get housingSeats(){return housingSeats;},get housingBeds(){return housingBeds;},setTime:t=>{worldTime=t;},move,floorAt,canStand,nearby,setHouseBodies,update,bodies,moving,falling,pulsing,setMovementBounds:(key,bound)=>{if(bound)movementBounds.set(key,bound);else movementBounds.delete(key);}};return api;
}
