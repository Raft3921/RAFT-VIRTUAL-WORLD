const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const mix=(a,b,t)=>a+(b-a)*t;
export const ATTACKS=[
  {name:'右ストレート',duration:.34,impact:.42},
  {name:'左クロス',duration:.38,impact:.42},
  {name:'上段蹴り',duration:.52,impact:.46},
  {name:'回転蹴り',duration:.66,impact:.78},
  {name:'衝撃波',duration:.76,impact:.48},
  {name:'ジャンプフィニッシュ',duration:1.55,impact:.90},
  {name:'踏み込み正拳',duration:.68,impact:.52,dash:6},
  {name:'跳び膝蹴り',duration:.90,impact:.55,jump:6},
  {name:'飛び蹴り',duration:1.05,impact:.48,jump:6.9,dash:4.5},
  {name:'旋風蹴り',duration:1.15,impact:.65,jump:7.6,dash:2.8},
  {name:'跳び上段突き',duration:.98,impact:.48,jump:6},
  {name:'急降下掌打',duration:1.24,impact:.87,jump:8.8,dash:3},
  {name:'二重衝撃波',duration:1.42,impact:.84,jump:9.6},
];
export function chargeAttack(level){return [0,0,4,6,7,8,9,10,11,12,5][clamp(level,1,10)];}
ATTACKS[5].jump=10.4;
// Anticipation -> fast extension -> held contact -> recovery. All tracks use
// the same phase so the hips, chest and striking limb arrive together.
export function sampleAttack(kind,t){
  const spec=ATTACKS[kind]||ATTACKS[0],hit=spec.impact;
  const recoveryStart=Math.min(hit+.08,.94),weightStart=Math.max(.76,hit+.02);
  const strike=smooth((t-(hit-.18))/.13),recover=smooth((t-recoveryStart)/Math.max(.04,1-recoveryStart));
  const reach=strike*(1-recover),weight=smooth(t/.09)*(1-smooth((t-weightStart)/(1-weightStart)));
  const pose={weight,drop:-.08,twist:0,lean:0,spin:0,spread:.13,
    rightShoulder:[-.65,0,-.14],leftShoulder:[-.65,0,.14],rightElbow:[-1.3,0,0],leftElbow:[-1.3,0,0],
    rightHip:[-.4,0,-.03],leftHip:[-.4,0,.03],rightKnee:[.8,0,0],leftKnee:[.8,0,0]};
  if(kind===0||kind===1){
    const side=kind===0?'right':'left',sign=kind===0?1:-1;
    pose.twist=sign*mix(-.36,.38,reach);pose.lean=.06+reach*.09;
    pose[side+'Shoulder']=[mix(-.25,-1.55,reach),-sign*.13,-sign*.10];pose[side+'Elbow']=[mix(-1.85,-.06,reach),0,0];
  }else if(kind===2){
    pose.twist=-.22;pose.lean=-.19*reach;pose.drop=-.11;
    pose.rightHip=[mix(-.95,-1.93,reach),.08,-.04];pose.rightKnee=[mix(1.65,.08,reach),0,0];
    pose.leftShoulder=[-.9,.12,.18];pose.rightShoulder=[-.25,-.2,-.18];
  }else if(kind===3){
    pose.spin=Math.PI*2*smooth((t-.10)/.64);pose.lean=.12;pose.drop=-.07;
    pose.rightHip=[mix(-.5,-1.60,reach),0,-.08];pose.rightKnee=[mix(1.0,.1,reach),0,0];
    pose.leftShoulder=[-.4,.15,.8*reach];pose.rightShoulder=[-.4,-.15,-.8*reach];
  }else if(kind===4){
    pose.drop=-.14*(1-reach);pose.twist=mix(-.55,.38,reach);pose.lean=.15*reach;
    pose.rightShoulder=[mix(.5,-1.5,reach),-.18,-.13];pose.rightElbow=[mix(-1.85,-.02,reach),0,0];
    pose.leftShoulder=[-.85,.1,.22];
  }else if(kind===5||kind===11||kind===12){
    const launch=smooth(t/.2),landing=smooth((t-.72)/.18);
    pose.spin=Math.PI*2*smooth((t-.16)/.53);pose.drop=mix(0,-.15,landing)*(1-recover);pose.lean=.22*landing;
    pose.rightShoulder=[mix(-2.6,-1.0,landing),0,-.1];pose.leftShoulder=[mix(-2.6,-.7,landing),0,.1];
    pose.rightElbow=[mix(-.5,-.05,landing),0,0];pose.leftElbow=[-.6,0,0];
    pose.rightHip=[mix(-.8,-.4,landing),0,0];pose.leftHip=[mix(-.8,-.4,landing),0,0];
    pose.rightKnee=[mix(1.4,.8,landing),0,0];pose.leftKnee=[mix(1.4,.8,landing),0,0];
    pose.weight*=launch;
    if(kind===11){pose.spin=0;pose.lean=.35*landing;pose.leftShoulder=[mix(-2.5,-1.3,landing),0,.18];}
    if(kind===12){pose.spin=Math.PI*2*smooth((t-.1)/.48);pose.rightShoulder=[mix(-2.4,-1.4,landing),-.16,-.15];pose.leftShoulder=[mix(-2.4,-1.4,landing),.16,.15];}
  }else if(kind===6){
    pose.spread=.23;pose.drop=-.15;pose.lean=.18;pose.twist=mix(-.55,.5,reach);
    pose.rightShoulder=[mix(.25,-1.6,reach),-.1,-.1];pose.rightElbow=[mix(-1.9,-.03,reach),0,0];
    pose.rightHip=[-.60,0,-.18];pose.rightKnee=[1.18,0,0];pose.leftHip=[-.25,0,.10];pose.leftKnee=[.50,0,0];
  }else if(kind===7){
    pose.lean=-.12;pose.twist=-.2;pose.rightHip=[-1.85,0,0];pose.rightKnee=[1.75,0,0];pose.leftHip=[.12,0,0];pose.leftKnee=[.7,0,0];
    pose.rightShoulder=[-1.3,0,-.2];pose.leftShoulder=[-.7,0,.15];
  }else if(kind===8||kind===9){
    pose.lean=-.28;pose.rightHip=[mix(-.8,-1.75,reach),0,-.1];pose.rightKnee=[mix(1.4,.08,reach),0,0];pose.leftHip=[-.2,0,.06];pose.leftKnee=[1.2,0,0];
    pose.rightShoulder=[-.2,0,-.7];pose.leftShoulder=[-.5,0,.8];
    if(kind===9)pose.spin=Math.PI*2*smooth((t-.12)/.6);
  }else if(kind===10){
    pose.twist=mix(-.4,.4,reach);pose.lean=-.15*reach;pose.rightShoulder=[mix(.4,-2.6,reach),-.1,-.1];pose.rightElbow=[-.75,0,0];
    pose.leftHip=[-.7,0,0];pose.leftKnee=[1.35,0,0];
  }
  return pose;
}
export function sampleCharge(power,time=0){
  const level=Math.min(9,Math.floor(power*10)),w=smooth(power*7),pulse=Math.sin(time*3)*.025;
  const frames=[[-.7,-1.25,.2],[-.85,-1.1,.25],[-1.05,-.95,.35],[-.4,-1.55,.45],[.3,-1.75,.55],[-1.5,-.85,.65],[-2.2,-.8,.75],[-2.5,-1.25,.85],[-1.2,-1.65,.95],[-2.4,-.6,1]];
  const blend=smooth(power*10-level),next=frames[Math.min(9,level+1)],current=frames[level];
  const [arm,elbow,stance]=current.map((v,i)=>mix(v,next[i],blend));
  return {weight:w,drop:-.06-stance*.16,spread:.12+stance*.16,twist:-.12-stance*.35,
    rightShoulder:[arm+pulse,-.18,-.16],rightElbow:[elbow,0,0],leftShoulder:[level>=7?arm:-.95,.15,.16],leftElbow:[level>=7?elbow:-1.1,0,0],hip:-.35-stance*.35,knee:.7+stance*.7};
}
