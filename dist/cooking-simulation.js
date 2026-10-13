import {FOOD_BY_ID} from './cooking-data.js?v=20261013-life89b';
export function advanceCookingHeat(v,elapsed,dt){
 // Short integration steps preserve warm-up time, evaporation and timer expiry
 // even when a saved Durable Object wakes after nobody has been watching it.
 for(let remaining=Math.min(3600,Math.max(0,dt));remaining>0;){
  const step=Math.min(.5,remaining);remaining-=step;elapsed+=step;
  if(v.location!=='stove'||!v.fire){v.temperature=Math.max(20,v.temperature-step*1.4);if(v.temperature===20)break;continue;}
  const wet=v.water>.01,max=wet?100:v.mode==='bake'?190:70+v.fire*55;
  v.temperature+=Math.sign(max-v.temperature)*Math.min(Math.abs(max-v.temperature),step*v.fire*(v.covered?1.35:1)*5/(.5+v.water));
  if(wet&&v.temperature>=99&&!v.covered)v.water=Math.max(0,v.water-step*.002*v.fire);
  const method=wet&&v.mode==='fry'?(v.fire===1?'simmer':'boil'):v.mode,enabled=['boil','simmer'].includes(method)?wet&&v.temperature>=99:method==='steam'?wet&&v.covered&&v.temperature>=99:v.temperature>=75,active=enabled?Math.min(step,v.timer?.remaining??step):0;
  if(active&&v.foods.length)v.cookSeconds+=active;
  for(const f of v.foods){if(!active)continue;f.method=method;f.progress=Math.min(180,f.progress+active*(f.cut==='mince'?1.25:f.cut?1.12:1)*({simmer:.35,steam:.65,bake:.6,boil:.6}[method]||1));if(!wet&&f.progress>FOOD_BY_ID.get(f.id).time*1.6&&v.temperature>135)f.burn=Math.min(100,f.burn+active*(v.temperature-130)*.08*(elapsed-v.lastStir<5?.3:1)*(v.seasonings.oil?.65:1));}
  if(v.timer&&enabled){v.timer.remaining=Math.max(0,v.timer.remaining-active);if(!v.timer.remaining){v.fire=0;v.timer=null;v.timerDone=true;}}
 }
}
