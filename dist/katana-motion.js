const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);},mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
// Camera-space grip travels across the torso. The wrist follows the shoulder
// and elbow, so the blade describes a descending diagonal rather than a pivot.
const rest={rotation:[-.64,.08,-.12],position:[-.03,-.025,.02],shoulder:[-1.14,.12,-.15],elbow:[-.82,0,0],rightElbow:[.29,-.42,-.02],leftElbow:[-.27,-.44,-.03],torso:[0,.02,0]};
const guard={rotation:[-1.28,.66,-.38],position:[-.54,.35,.035],shoulder:[-2.52,.66,-.46],elbow:[-1.12,0,-.16],rightElbow:[.02,-.12,-.13],leftElbow:[-.38,-.18,-.16],torso:[-.04,.24,-.07]};
const strike={rotation:[.54,-.78,.22],position:[.24,-.19,-.045],shoulder:[-.88,-.46,.48],elbow:[-.26,0,.08],rightElbow:[.43,-.39,-.10],leftElbow:[-.03,-.45,-.15],torso:[.10,-.28,.08]};
const follow={...strike,rotation:[.77,-.91,.29],position:[.30,-.23,.08],shoulder:[-.62,-.52,.46],elbow:[-.68,0,.12],torso:[.12,-.30,.08]};
const blend=(a,b,t,active=false)=>{const pose={active};for(const key of ['rotation','position','shoulder','elbow','rightElbow','leftElbow','torso'])pose[key]=mix(a[key],b[key],t);return pose;};
export function sampleKatanaPose(held=0,age=Infinity){
 if(Number.isFinite(age)&&age>=0&&age<.78){
  if(age<.18)return blend(guard,strike,Math.pow(clamp(age/.18),1.65),true);
  if(age<.29)return blend(strike,follow,ease((age-.18)/.11),true);
  return blend(follow,rest,ease((age-.29)/.49));
 }
 return blend(rest,guard,ease(held/.25));
}
