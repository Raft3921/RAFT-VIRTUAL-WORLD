import {buildGunTown} from './gun-layout.js?v=20261017-maps121';
import {gunMap,gunExitBoards} from './gun-maps.js?v=20261017-maps121';
const cache=new Map();
export function gunCollision(id='sand'){
 const map=gunMap(id);if(cache.has(map.id))return cache.get(map.id);
 const solids=[],props=new Map(),spawns=[],q=map.zone,exits=gunExitBoards(map.id);
 buildGunTown({map:map.id,box:(x,y,z,w,h,d,color,solid=true,extra={})=>{if(solid)solids.push({x,y,z,w,h,d,...extra,yaw:extra.rotation||0});if(extra.gunPropId&&!props.has(extra.gunPropId))props.set(extra.gunPropId,{id:extra.gunPropId,kind:extra.gunPropKind,...extra.gunBounds});}});
 const buckets=new Map();for(const b of solids)for(let x=Math.floor((b.x-b.w/2-1)/12);x<=Math.floor((b.x+b.w/2+1)/12);x++)for(let z=Math.floor((b.z-b.d/2-1)/12);z<=Math.floor((b.z+b.d/2+1)/12);z++){const key=x+','+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(b);}
 for(let x=q.minX+5;x<q.maxX-5;x+=3.5)for(let z=q.minZ+5;z<q.maxZ-5;z+=3.5){
  if(exits.some(p=>Math.hypot(x-p.x,z-p.z)<4))continue;
  if((buckets.get(Math.floor(x/12)+','+Math.floor(z/12))||[]).some(b=>b.y+b.h/2>.30&&b.y-b.h/2<2.15&&Math.abs(x-b.x)<b.w/2+.60&&Math.abs(z-b.z)<b.d/2+.60))continue;
  spawns.push({x,y:.12,z,yaw:0});
 }
 const data={solids,props,spawns,exits};cache.set(map.id,data);return data;
}
// Existing authority integrations may continue to import the original town.
export const GUN_SOLIDS=gunCollision('sand').solids,GUN_SPAWNS=gunCollision('sand').spawns;
