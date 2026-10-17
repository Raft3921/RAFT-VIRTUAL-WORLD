import {parkourPose} from './parkour-pose.js?v=20261017-bodyhit131';
const RIGS=[{"torso":{"size":[8,12,4],"pad":0.25},"head":{"size":[8,8,8],"pad":0.5},"rightArm":{"size":[3,12,4],"pad":0.25},"leftArm":{"size":[3,12,4],"pad":0.25},"rightLeg":{"size":[4,12,4],"pad":0.25},"leftLeg":{"size":[4,12,4],"pad":0.25}},{"torso":{"size":[8,8,4],"pad":0.25,"center":[-0.0,9.0],"pivot":[0,13],"bottom":5,"top":13},"head":{"size":[18,9,8],"pad":0.5,"center":[-0.0,17.5],"pivot":[0,13],"bottom":13,"top":22},"rightArm":{"size":[3,7,4],"pad":0.25,"center":[-5.5,9.5],"pivot":[-5,13],"bottom":6,"top":13},"leftArm":{"size":[3,7,4],"pad":0.25,"center":[5.5,9.5],"pivot":[5,13],"bottom":6,"top":13},"rightLeg":{"size":[4,5,4],"pad":0.25,"center":[-2.0,2.5],"pivot":[-2,5],"bottom":0,"top":5},"leftLeg":{"size":[4,5,4],"pad":0.25,"center":[2.0,2.5],"pivot":[2,5],"bottom":0,"top":5}}];
const I=[1,0,0,0,1,0,0,0,1],PX=1/16;
const mul=(a,b)=>Array.from({length:9},(_,i)=>{const r=Math.floor(i/3)*3,c=i%3;return a[r]*b[c]+a[r+1]*b[c+3]+a[r+2]*b[c+6];});
const point=(m,v)=>[m[0]*v[0]+m[1]*v[1]+m[2]*v[2],m[3]*v[0]+m[4]*v[1]+m[5]*v[2],m[6]*v[0]+m[7]*v[1]+m[8]*v[2]];
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const rx=a=>[1,0,0,0,Math.cos(a),-Math.sin(a),0,Math.sin(a),Math.cos(a)];
const ry=a=>[Math.cos(a),0,Math.sin(a),0,1,0,-Math.sin(a),0,Math.cos(a)];
const rz=a=>[Math.cos(a),-Math.sin(a),0,Math.sin(a),Math.cos(a),0,0,0,1];
const xyz=a=>mul(mul(rx(a[0]),ry(a[1])),rz(a[2]));
export function parkourJoints(state){
 const pose=parkourPose(state),out={},phase=(state.parkourAge||0)*18;
 for(const [side,sign]of [['right',-1],['left',1]]){
  if(pose.kind==='wallrun')out[side]={hip:[(-.5+Math.sin(phase+(sign>0?Math.PI:0))*.6)*pose.weight,0,sign*.16*pose.weight],knee:[(.7+Math.max(0,Math.sin(phase))*.4)*pose.weight,0,0],shoulder:side==='left'?[-.9*pose.weight,0,.25*pose.weight]:[-1.2,0,0],elbow:side==='left'?[-.45*pose.weight,0,0]:[-.22,0,0]};
  else out[side]={hip:[-.95*pose.tuck,0,0],knee:[1.55*pose.tuck,0,0],shoulder:[-.8-pose.tuck,0,side==='left'?.18:-.18],elbow:[-.75,0,0]};
 }
 return out;
}
// Anatomical OBBs, with the same pivots, split segments, joint caps and outer
// skin dimensions as avatar.js. No envelope over the empty space between limbs.
export function parkourBodyBoxes(state){
 const pose=parkourPose(state);if(!pose.weight||state.ragdoll||state.seated||state.sleeping||state.mantling)return null;
 const custom=state.skin===7,parts=RIGS[custom?1:0],yaw=ry(state.yaw||0),body=mul(yaw,pose.matrix),base=add([state.x,state.y,state.z],point(yaw,[pose.shiftX,pose.shiftY,pose.shiftZ])),joints=parkourJoints(state),boxes=[];
 const joint=(parent,p,rotation=I)=>({p:add(parent.p,point(parent.m,p)),m:mul(parent.m,rotation)}),pelvis={p:base,m:body};
 const box=(parent,centre,size,label)=>{const p=add(parent.p,point(parent.m,centre));boxes.push({x:p[0],y:p[1],z:p[2],w:size[0],h:size[1],d:size[2],basis:parent.m,yaw:state.yaw||0,part:label});};
 const whole=(parent,name,y)=>{const part=parts[name],pad=part.pad;box(parent,[0,y*PX,0],part.size.map(v=>(v+pad*2)*PX),name);};
 const bottom=custom?parts.torso.bottom:12,legHeight=custom?parts.leftLeg.top:12;
 const torso=joint(pelvis,[0,bottom*PX,0]);whole(torso,'torso',parts.torso.size[1]/2);
 const head=joint(torso,[0,(custom?parts.head.bottom-bottom:12)*PX,0]);const headAim=mul(ry(Math.max(-.95,Math.min(.95,state.headYaw||0))),rx(Math.max(-.65,Math.min(.7,state.headPitch||0))));head.m=mul(pose.kind==='wallrun'?yaw:body,headAim);whole(head,'head',parts.head.size[1]/2);
 for(const [side,sign]of [['right',-1],['left',1]]){
  const a=parts[side+'Arm'],l=parts[side+'Leg'],angles=joints[side],armHalf=a.size[1]/2,legHalf=l.size[1]/2;
  const shoulder=joint(torso,[(custom?a.pivot[0]:sign*5)*PX,(custom?a.top-bottom:10)*PX,0],xyz(angles.shoulder)),elbow=joint(shoulder,[(custom?a.center[0]-a.pivot[0]:sign*.5)*PX,(custom?-armHalf:-4)*PX,0],xyz(angles.elbow));
  const hip=joint(pelvis,[(custom?l.center[0]:sign*2)*PX,legHeight*PX,0],xyz(angles.hip)),knee=joint(hip,[0,-legHalf*PX,0],xyz(angles.knee));
  for(const [name,part,upper,lower,x,upperY,lowerY,half]of [[side+'Arm',a,shoulder,elbow,custom?a.center[0]-a.pivot[0]:sign*.5,custom?-armHalf/2:-1.4,custom?-armHalf/2:-2.6,armHalf],[side+'Leg',l,hip,knee,0,custom?-legHalf/2:-3.4,custom?-legHalf/2:-2.6,legHalf]]){
   const pad=part.pad,inset=custom&&part.size[1]<8?.012:0,size=[(part.size[0]+2*pad)*PX,(half+pad-inset)*PX,(part.size[2]+2*pad)*PX];
   box(upper,[x*PX,(upperY+(pad+inset)/2)*PX,0],size,name+'-upper');box(lower,[0,(lowerY-(pad+inset)/2)*PX,0],size,name+'-lower');
   if(!custom)box(lower,[0,0,0],[(part.size[0]+.9)*PX,3.4*PX,(part.size[2]+.9)*PX],name+'-joint');
  }
 }
 return boxes;
}
