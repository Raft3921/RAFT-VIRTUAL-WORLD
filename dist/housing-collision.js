import {houseDescriptor,roomFor,furnitureDefinition,furniturePose} from './housing-data.js';
import {furnitureParts} from './furniture-models.js';
import {furnitureDiningSeats} from './dining.js';
export function housingColliders(index,layout){
    const h=houseDescriptor(index),ROOM=roomFor(index),records=[{x:h.x,y:ROOM.floor-.009,z:h.z,w:ROOM.x*2,h:.018,d:ROOM.z*2}],seats=[],beds=[];
    for(const item of layout.items){const def=furnitureDefinition(item),p=furniturePose(item),yaw=p.yaw+(h.front<0?Math.PI:0),x=h.x+p.x*h.front,z=h.z+p.z*h.front;
      const add=(w,height,d,dy=height/2,dx=0,dz=0)=>records.push({x:x+Math.cos(yaw)*dx+Math.sin(yaw)*dz,y:ROOM.floor+dy,z:z-Math.sin(yaw)*dx+Math.cos(yaw)*dz,w,h:height,d,rotation:yaw,boardId:'furniture:'+index+':'+item.id});
      if(def.family==='playground'){
       const boardId='furniture:'+index+':'+item.id,base=ROOM.floor+p.y;
       if(def.design==='slide'){for(const part of furnitureParts(item)){if(part.rx||['step','platform'].includes(part.role))continue;add(part.w,part.h,part.d,p.y+part.y,part.x,part.z);}const stairZ=-def.d*.88*.27;records.push({x:x+Math.sin(yaw)*stairZ,y:base+def.h*.4,z:z+Math.cos(yaw)*stairZ,w:def.w*.88*.66,h:def.h*.8,d:def.d*.88*.44,rotation:yaw,boardId,ramp:{base,back:0,front:def.h*.88*.76}});records.push({x:x-Math.sin(yaw)*def.d*.88*.025,y:base+def.h*.88*.76,z:z-Math.cos(yaw)*def.d*.88*.025,w:def.w*.88*.72,h:.02,d:def.d*.88*.1,rotation:yaw,boardId,ramp:{base,back:def.h*.88*.76,front:def.h*.88*.76}});const dz=def.d*.88*.225;records.push({x:x+Math.sin(yaw)*dz,y:base+def.h*.4,z:z+Math.cos(yaw)*dz,w:def.w*.88*.64,h:def.h*.8,d:def.d*.88*.45,rotation:yaw,boardId,playKind:'slide',plazaItemId:item.id,ramp:{base,back:def.h*.88*.76,front:def.h*.88*.05}});}
       else if(def.design==='trampoline'){for(const part of furnitureParts(item)){if(part.role==='mat')continue;add(part.w,part.h,part.d,p.y+part.y,part.x,part.z);}records.push({x,y:base+def.h*.88*.73,z,w:def.w*.88*.8,h:.025,d:def.d*.88*.8,rotation:yaw,boardId,playKind:'trampoline',plazaItemId:item.id,bounce:true});}
       else for(const part of furnitureParts(item)){if(part.role==='ride')continue;add(part.w,part.h,part.d,p.y+part.y,part.x,part.z);}continue;
      }
      if(def.family==='outdoor'&&['pavilion','pergola','market','kiosk','arch','tunnel','picnic','bridge','stairs','hurdle','fence','railing','rack'].includes(def.design)){for(const part of furnitureParts(item))add(part.w,part.h,part.d,p.y+part.y,part.x,part.z);continue;}
      if(def.design==='treadmill'){add(def.w*.88,.16,def.d*.88,p.y+.08);for(const sign of [-1,1])add(.09,def.h*.88,.12,p.y+def.h*.44,sign*def.w*.35,-def.d*.32);continue;}
      if(def.design==='bath'){add(def.w*.88,.12,def.d*.88,p.y+.06);for(const sign of [-1,1])add(.12,def.h*.88,def.d*.88,p.y+def.h*.44,sign*def.w*.39,0);continue;}
      if(def.solid===false||def.family==='mirror'||def.family==='wall-mirror')continue;
      if(def.seat){const seatHeight=def.extended?def.seat:.88*(def.family==='chair'?def.h*.515:def.family==='sofa'?def.h*.55:def.seat);add(def.w*.88,seatHeight,def.d*.88,p.y+seatHeight/2);if((def.family==='chair'||def.family==='sofa')&&(!def.extended||def.back!==false)&&def.h*.88>seatHeight+.04)add(def.w*.88,def.h*.88-seatHeight,def.d*.14*.88,seatHeight+(def.h*.88-seatHeight)/2,0,-def.d*.43*.88);seats.push(...furnitureDiningSeats(h,item));}
      else if(def.family==='bed'||def.family==='canopy'){const height=def.bedHeight??.55;if(height>1){add(def.w*.88,.24,def.d*.88,height-.12);for(const dx of [-def.w*.4,def.w*.4])for(const dz of [-def.d*.4,def.d*.4])add(.1,height,.1,height/2,dx,dz);}else add(def.w*.88,height,def.d*.88);if(!def.extended||def.bedBack)add(def.w*.88,def.extended?.25:.88,def.d*.07,def.extended?height+.1:.44,0,-def.d*.46*.88);beds.push({id:index+':'+item.id,x,y:ROOM.floor+height,z,yaw,w:def.w*.75,d:def.d*.70});if(def.family==='canopy'||def.design==='fourposter'||def.design==='crib')for(const dx of [-def.w*.46*.88,def.w*.46*.88])for(const dz of [-def.d*.46*.88,def.d*.46*.88])add(def.w*.055*.88,def.h*.88,def.d*.055*.88,def.h*.44,dx,dz);}
      else add(p.w*.88,p.h*.88,p.d*.88,def.mount==='floor'?p.y+p.h*.44:def.mount==='ceiling'?ROOM.height-p.h*.44:p.centerY);
    }if(h.realm){const add=(x,y,z,w,height,d)=>records.push({x:h.x+x*h.front,y:ROOM.floor+y,z:h.z+z*h.front,w,h:height,d});add(0,ROOM.height/2,-ROOM.z-.1,ROOM.x*2+.4,ROOM.height,.2);for(const sign of [-1,1]){add(sign*(ROOM.x+.1),ROOM.height/2,0,.2,ROOM.height,ROOM.z*2+.4);add(sign*4.85,ROOM.height/2,ROOM.z+.1,5.1,ROOM.height,.2);}add(0,4.53,ROOM.z+.1,4.6,1.44,.2);add(0,ROOM.height+.1,0,ROOM.x*2+.4,.2,ROOM.z*2+.4);}return {records,seats,beds};
  }

// Mirror avenues use the same reflected architectural solids as the renderer.
export function mirrorAvenueColliders(sourceBodies,realm,homes){
 const bodies=[];
 for(const p of sourceBodies){const h=homes[p.houseIndex];if(!h||h.index>=8||p.y===1.1)continue;
  if(p.y>5.5||Math.abs(p.x-h.x)>7.4&&Math.abs(p.z-h.z)<7.4||Math.abs(p.z-h.z)>6.8&&Math.abs(p.z-h.z)<7.5)continue;
  bodies.push({...p,x:realm.x+p.x,z:realm.z-p.z,rotation:-(p.rotation||0),houseIndex:realm.key+'|'+h.index,...(p.boardId!==undefined?{boardId:'mirror-board:'+realm.key+'|'+h.index}:{})});
 }
 bodies.push({x:realm.x,y:.045,z:realm.z-62,w:92,h:.09,d:9});
 for(const h of homes.slice(0,8))bodies.push({x:realm.x+h.x,y:.09,z:realm.z-(h.index<4?54.7:70),w:5,h:.18,d:h.index<4?12:13});
 for(const sign of [-1,1]){bodies.push({x:realm.x+sign*54,y:256,z:realm.z-62.5,w:.5,h:1024,d:58});bodies.push({x:realm.x,y:256,z:realm.z-62.5+sign*29,w:108,h:1024,d:.5});}
 return bodies;
}
