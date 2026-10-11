import {ROOM,furnitureDefinition,furniturePose} from './housing-data.js?v=20261011-free-cook80';

// Shared geometry for ordinary furniture tables and their seats.
// Kitchen counters do not participate in dining.
export function diningTable(home,item){
 const def=item&&furnitureDefinition(item);
 if(!home||!['table','desk'].includes(def?.family))return null;
 const pose=furniturePose(item);
 return {item,pose,index:home.index,itemId:item.id,x:home.x+pose.x*home.front,z:home.z+pose.z*home.front,y:ROOM.floor+pose.y+pose.h*.88};
}
function localPoint(table,home,point){
 const dx=(point.x-home.x)*home.front-table.pose.x,dz=(point.z-home.z)*home.front-table.pose.z,c=Math.cos(table.pose.yaw),s=Math.sin(table.pose.yaw);
 return {x:c*dx-s*dz,z:s*dx+c*dz};
}
export function tableForObject(layout,home,point,preferredId=''){
 const matches=(layout?.items||[]).map(item=>diningTable(home,item)).filter(table=>{
  if(!table)return false;const p=localPoint(table,home,point);
  return Math.abs(p.x)<=table.pose.w*.44+.025&&Math.abs(p.z)<=table.pose.d*.44+.025&&point.y>=table.y-.035&&point.y<=table.y+.3;
 });
 return matches.find(table=>table.itemId===preferredId)||matches.sort((a,b)=>Math.abs(point.y-a.y)-Math.abs(point.y-b.y))[0]||null;
}
export function furnitureDiningSeats(home,item){
 const def=furnitureDefinition(item);if(!def?.seat||def.solid===false)return [];
 const p=furniturePose(item),yaw=p.yaw+(home.front<0?Math.PI:0),x=home.x+p.x*home.front,z=home.z+p.z*home.front,height=def.extended?def.seat:.88*(def.family==='chair'?def.h*.515:def.family==='sofa'?def.h*.55:def.seat);
 return (def.w>1.5?[-def.w*.23,def.w*.23]:[0]).map(offset=>({houseIndex:home.index,itemId:item.id,pair:item.pair||'',family:def.family,x:x+Math.cos(yaw)*offset,y:ROOM.floor+p.y+height,z:z-Math.sin(yaw)*offset,yaw}));
}
export function tableForSeat(layout,home,seat){
 if(!seat||String(seat.houseIndex)!==String(home?.index))return null;
 const source=(layout?.items||[]).find(item=>item.id===seat.itemId),pair=source?.pair||seat.pair;
 const tables=(layout?.items||[]).map(item=>diningTable(home,item)).filter(table=>{
  if(!table)return false;const p=localPoint(table,home,seat),gap=Math.hypot(Math.max(0,Math.abs(p.x)-table.pose.w*.44),Math.max(0,Math.abs(p.z)-table.pose.d*.44)),dx=table.x-seat.x,dz=table.z-seat.z,d=Math.hypot(dx,dz);
  return gap<=.95&&Math.abs(table.y-seat.y)<1.25&&(table.itemId===pair||d<.1||(dx*Math.sin(seat.yaw)+dz*Math.cos(seat.yaw))/d>=-.15);
 });
 return tables.find(table=>table.itemId===pair)||tables.sort((a,b)=>Math.hypot(a.x-seat.x,a.z-seat.z)-Math.hypot(b.x-seat.x,b.z-seat.z))[0]||null;
}
export function diningSeatAt(layout,home,player){
 if(!player?.seated||player.ragdoll||!home)return null;
 return (layout?.items||[]).flatMap(item=>furnitureDiningSeats(home,item)).find(seat=>Math.hypot(player.x-seat.x,player.z-seat.z)<.35)||null;
}
