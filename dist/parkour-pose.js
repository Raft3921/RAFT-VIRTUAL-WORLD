const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const multiplyQuaternion=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
export function parkourPose(state){
 const kind=state.parkourKind||'',t=clamp((state.parkourAge||0)/Math.max(.01,state.parkourDuration||1),0,1),pivot=state.skin===7?.65:.95;
 let pitch=0,roll=0,tuck=0,weight=0,qx=0,qy=0,qz=0,qw=1,offsetX=0,offsetZ=0;
 if(kind==='backflip'){pitch=-Math.PI*2*t*t*(3-2*t);tuck=Math.sin(Math.PI*t);weight=1;}
 if(kind==='frontflip'||kind==='slideflip'){pitch=Math.PI*(kind==='slideflip'?4:2)*t*t*(3-2*t);tuck=Math.sin(Math.PI*t);weight=1;}
 if(kind==='sideflip'){roll=(state.wallSide||1)*Math.PI*2*t*t*(3-2*t);tuck=Math.sin(Math.PI*t);weight=1;}
 if(kind==='wallkick'){pitch=-.14*Math.sin(Math.PI*t);roll=(state.wallSide||1)*.45*Math.sin(Math.PI*t);tuck=.45*Math.sin(Math.PI*t);weight=1;}
 if(kind==='wallrun'){
  const entry=clamp((state.parkourAge||0)/.14,0,1),u=entry*entry*(3-2*entry),angle=Math.PI/2*u,yaw=state.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw),nx=state.wallNX||0,nz=state.wallNZ||0,length=Math.hypot(nx,nz);
  if(length>.5){const x=(c*nx-s*nz)/length,z=(s*nx+c*nz)/length;qx=z*Math.sin(angle/2);qz=-x*Math.sin(angle/2);qw=Math.cos(angle/2);offsetX=x*Math.max(0,pivot-.32)*u;offsetZ=z*Math.max(0,pivot-.32)*u;weight=u;}
 }else{const a=pitch/2,b=roll/2;qx=Math.cos(b)*Math.sin(a);qy=Math.sin(b)*Math.sin(a);qz=Math.sin(b)*Math.cos(a);qw=Math.cos(b)*Math.cos(a);}
 if(kind==='wallspin'){
  const age=Math.max(0,state.parkourAge||0),rate=2.4,finish=state.wallSpinFinish??-1,duration=Math.max(.01,state.wallSpinFinishDuration||.18),u=finish<0?0:clamp((age-finish)/duration,0,1),ease=u*u*(3-2*u),start=Math.max(0,finish)*rate,end=Math.ceil(start+.5);
  const turns=finish<0?age*rate:(2*u*u*u-3*u*u+1)*start+(u*u*u-2*u*u+u)*rate*duration+(-2*u*u*u+3*u*u)*end;
  const recovery=clamp((age-(state.wallSpinRise||0))/.7,0,1),tilt=(state.wallSpinTilt??1)*(1-recovery*recovery*(3-2*recovery))*(1-ease),angle=Math.PI/2*tilt;
  const locked=state.wallSpinYaw||0,yaw=state.yaw||0,nx=state.wallNX||0,nz=state.wallNZ||0,length=Math.max(.001,Math.hypot(nx,nz)),x=(Math.cos(locked)*nx-Math.sin(locked)*nz)/length,z=(Math.sin(locked)*nx+Math.cos(locked)*nz)/length;
  const wall=[z*Math.sin(angle/2),0,-x*Math.sin(angle/2),Math.cos(angle/2)],spin=[-Math.sin(Math.PI*turns),0,0,Math.cos(Math.PI*turns)],delta=Math.atan2(Math.sin(locked-yaw),Math.cos(locked-yaw))/2*(1-ease);
  [qx,qy,qz,qw]=multiplyQuaternion([0,Math.sin(delta),0,Math.cos(delta)],multiplyQuaternion(wall,spin));
  offsetX=(Math.cos(yaw)*nx-Math.sin(yaw)*nz)/length*Math.max(0,pivot-.32)*tilt;offsetZ=(Math.sin(yaw)*nx+Math.cos(yaw)*nz)/length*Math.max(0,pivot-.32)*tilt;
  pitch=-Math.PI*2*turns;tuck=Math.sin(Math.PI*(turns-Math.floor(turns)))*(.85-.35*ease);weight=1;
 }
 const matrix=[1-2*(qy*qy+qz*qz),2*(qx*qy-qz*qw),2*(qx*qz+qy*qw),2*(qx*qy+qz*qw),1-2*(qx*qx+qz*qz),2*(qy*qz-qx*qw),2*(qx*qz-qy*qw),2*(qy*qz+qx*qw),1-2*(qx*qx+qy*qy)];
 return {kind,pitch,roll,tuck,weight,pivot,quaternion:[qx,qy,qz,qw],matrix,offsetX,offsetZ,shiftX:-matrix[1]*pivot+offsetX,shiftY:pivot*(1-matrix[4]),shiftZ:-matrix[7]*pivot+offsetZ};
}
// The same rotation and wall-contact offset drive avatar rendering and bullets.
export function transformParkourBox(box,p){
 const pose=parkourPose(p);if(!pose.weight)return box;
 const yaw=p.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw),dx=box.x-p.x,dz=box.z-p.z,x=c*dx-s*dz,y=box.y-p.y-pose.pivot,z=s*dx+c*dz,m=pose.matrix;
 const rx=m[0]*x+m[1]*y+m[2]*z+pose.offsetX,ry=m[3]*x+m[4]*y+m[5]*z,rz=m[6]*x+m[7]*y+m[8]*z+pose.offsetZ;
 return {...box,x:p.x+c*rx+s*rz,y:p.y+pose.pivot+ry,z:p.z-s*rx+c*rz,w:Math.abs(m[0])*box.w+Math.abs(m[1])*box.h+Math.abs(m[2])*box.d,h:Math.abs(m[3])*box.w+Math.abs(m[4])*box.h+Math.abs(m[5])*box.d,d:Math.abs(m[6])*box.w+Math.abs(m[7])*box.h+Math.abs(m[8])*box.d};
}
