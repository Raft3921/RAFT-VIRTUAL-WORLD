const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
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
