const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);},mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const rest={rotation:[-.95,-.12,-.24],position:[0,0,0],shoulder:[-1.25,0,-.08],elbow:[-.65,0,0]};
const guard={rotation:[-1.75,-.55,.75],position:[-.10,.06,.04],shoulder:[-2.3,-.18,-.30],elbow:[-1.05,0,0]};
const cut={rotation:[.30,.75,-1.15],position:[.14,-.06,-.03],shoulder:[-.75,.30,.26],elbow:[-.12,0,0]};
const blend=(a,b,t,active=false)=>({rotation:mix(a.rotation,b.rotation,t),position:mix(a.position,b.position,t),shoulder:mix(a.shoulder,b.shoulder,t),elbow:mix(a.elbow,b.elbow,t),active});
// Reach the guard with bent elbows, accelerate through a diagonal cut, then recover.
export function sampleKatanaPose(held=0,age=Infinity){
 if(Number.isFinite(age)&&age>=0&&age<.52){
  if(age<.085)return blend(guard,cut,ease(age/.085),true);
  return blend(cut,rest,ease((age-.15)/.37),age<.18);
 }
 return blend(rest,guard,ease(held/.16));
}
