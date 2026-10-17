// Map definitions are immutable and room-local consumers select by ID. No shared
// mutable active map: separate LAN/Worker rooms can run different maps safely.
const define=(id,name,snow,large,layout)=>{const scale=large?Math.sqrt(5):1,width=124*scale,depth=96*scale;return Object.freeze({id,name,snow,large,layout,areaScale:large?5:1,ceiling:large?82:snow?48:24.9,zone:Object.freeze({minX:120,maxX:120+width,minZ:-92-depth/2,maxZ:-92+depth/2,x:120+width/2,z:-92,width,depth})});};
export const GUN_MAPS=Object.freeze([
 define('sand','砂の街',false,false,0),define('snow','雪の街',true,false,1),
 define('sand-large','砂の街・大峡谷（面積5倍）',false,true,2),define('snow-large','雪の街・氷雪城塞（面積5倍）',true,true,3)
]);
export const gunMap=id=>GUN_MAPS.find(m=>m.id===id)||GUN_MAPS[0];
export const insideGunMap=(p,id)=>{const z=gunMap(id).zone;return !!p&&!p.mirrorRealm&&p.x>z.minX&&p.x<z.maxX&&p.z>z.minZ&&p.z<z.maxZ;};
export function gunExitBoards(id){const z=gunMap(id).zone;return [{x:z.minX+6,z:z.minZ+8},{x:z.maxX-6,z:z.minZ+8},{x:z.minX+6,z:z.maxZ-8},{x:z.maxX-6,z:z.maxZ-8}];}
