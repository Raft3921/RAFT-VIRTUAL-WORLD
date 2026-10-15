import {buildGunTown} from './gun-layout.js?v=20261015-tactics99';
export const GUN_PROP_DEFS=new Map();
buildGunTown({box:(x,y,z,w,h,d,color,solid=true,extra={})=>{if(extra.gunPropId&&!GUN_PROP_DEFS.has(extra.gunPropId))GUN_PROP_DEFS.set(extra.gunPropId,{id:extra.gunPropId,kind:extra.gunPropKind,...extra.gunBounds});}});
export function cleanGunTraces(value){
 const traces=[];for(const v of Array.isArray(value)?value:[]){if(!GUN_PROP_DEFS.has(v?.id)||traces.some(t=>t.id===v.id))continue;
  traces.push({id:v.id,mode:['open','broken','cut'].includes(v.mode)?v.mode:'broken',at:Number.isFinite(v.at)?v.at:0,normal:Array.isArray(v.normal)&&v.normal.length===3&&v.normal.every(Number.isFinite)?v.normal.map(n=>Math.max(-1,Math.min(1,n))):[.65,.75,0]});
 }return traces;
}
