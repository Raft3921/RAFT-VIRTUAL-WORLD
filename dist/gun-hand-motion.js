// Gun-local tracks (+Z points down the barrel). The same reload sample drives
// the supporting hand and moving weapon part so they remain in contact.
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{v=clamp(v);return 1-Math.pow(1-v,3);};
function track(t,frames){
 for(let i=1;i<frames.length;i++)if(t<=frames[i][0]){
  const a=frames[i-1],b=frames[i],w=ease((t-a[0])/(b[0]-a[0]));
  return a.slice(1).map((v,j)=>v+(b[j+1]-v)*w);
 }
 return frames.at(-1).slice(1);
}
export function supportGrip(id){return id==='pistol'?[.082,-.008,-.016]:[.045,-.012,id==='rocket'?.46:.42];}
export function sampleGunReload(id,progress=null){
 const home=supportGrip(id),pose={weight:0,hand:home,rotation:[0,0,0],part:[0,0,0],partRotation:[0,0,0],dip:0,tilt:0,roll:0,clack:0};
 if(progress===null||progress<=0||progress>=1)return pose;
 const t=clamp(progress),weight=ease(t/.16)*(1-ease((t-.84)/.16));pose.weight=weight;pose.dip=-weight*.18;pose.tilt=weight*(id==='sniper'?.20:.29);pose.roll=weight*(id==='pistol'?-.32:-.18);
 let frames;
 if(id==='pistol'||id==='machine'){
  const z=id==='pistol'?-.015:.22;
  const pull=track(t,[[0,0],[.22,0],[.32,1],[.60,1],[.69,0],[1,0]])[0];
  pose.part=[0,-pull*.32,0];pose.partRotation=[pull*.12,0,0];
  frames=[[0,...home],[.22,.035,-.17,z],[.32,.035,-.49,z],[.60,.035,-.49,z],[.69,.035,-.17,z],[.84,.06,.055,.08],[.92,...home],[1,...home]];
 }else if(id==='sniper'){
  const pull=track(t,[[0,0],[.28,0],[.46,-.12],[.66,-.12],[.82,0],[1,0]])[0];pose.part=[0,0,pull];
  frames=[[0,...home],[.28,.18,.04,.10],[.46,.18,.04,-.02],[.66,.18,.04,-.02],[.82,.18,.04,.10],[1,...home]];
 }else if(id==='shotgun'){
  const pump=track(t,[[0,0],[.62,0],[.76,-.18],[.89,0],[1,0]])[0];pose.part=[0,0,pump];
  frames=[[0,...home],[.18,.12,-.20,.13],[.34,.12,-.34,.10],[.48,.12,-.20,.13],[.62,...home],[.76,home[0],home[1],home[2]-.18],[.89,...home],[1,...home]];
 }else{
  const pull=track(t,[[0,0],[.24,0],[.42,-.46],[.58,-.46],[.8,0],[1,0]])[0];pose.part=[0,0,pull];
  frames=[[0,...home],[.24,.12,-.04,-.40],[.42,.12,-.04,-.86],[.58,.12,-.04,-.86],[.8,.12,-.04,-.40],[1,...home]];
 }
 const insert=id==='shotgun'?.89:id==='rocket'?.8:id==='sniper'?.82:.69;pose.clack=Math.sin(Math.PI*clamp((t-insert+.025)/.09))*(1-clamp((t-insert+.025)/.09));pose.tilt+=pose.clack*.16;pose.roll+=pose.clack*.09;pose.hand=track(t,frames);pose.rotation=[weight*.18,weight*(id==='rocket'?-.25:.20),weight*.38];return pose;
}
export function shotHandKick(id,age){
 if(age<0||age>.65)return 0;
 const strength={pistol:1,machine:.6,sniper:1.2,shotgun:1.35,rocket:1.5}[id]||1;
 return strength*(1-Math.exp(-age*180))*Math.exp(-age*22);
}
export function stepGunSway(x,y,deltaYaw,deltaPitch,dt){
 const gain=1-Math.exp(-Math.max(0,dt)*14),limit=(v,n)=>Math.max(-n,Math.min(n,v)),seconds=Math.max(.001,dt);
 return [x+(limit(-deltaYaw/seconds*.018,.055)-x)*gain,y+(limit(-deltaPitch/seconds*.016,.045)-y)*gain];
}
