import {buildGunTown,GUN_EXIT_BOARDS} from './gun-layout.js?v=20261015-tactics99';
// Authority-only geometry and spawn search; browsers do not build these tables.
const solids=[];buildGunTown({box:(x,y,z,w,h,d,color,solid=true,extra={})=>{if(solid)solids.push({x,y,z,w,h,d,...extra,yaw:extra.rotation||0});}});
export const GUN_SOLIDS=solids;

// Ground-level clear points come from the actual shared maze solids. No fixed team pads.
const spawnPoints=[];
for(let x=125;x<=239;x+=3.5)for(let z=-135;z<=-49;z+=3.5){
 if(GUN_EXIT_BOARDS.some(p=>Math.hypot(x-p.x,z-p.z)<4))continue;
 if(GUN_SOLIDS.some(b=>b.y+b.h/2>.30&&b.y-b.h/2<2.15&&Math.abs(x-b.x)<b.w/2+.60&&Math.abs(z-b.z)<b.d/2+.60))continue;
 spawnPoints.push({x,y:.12,z,yaw:0});
}
export const GUN_SPAWNS=spawnPoints;
