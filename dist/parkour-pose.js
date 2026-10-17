const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function parkourPose(state){
 const kind=state.parkourKind||'',t=clamp((state.parkourAge||0)/Math.max(.01,state.parkourDuration||1),0,1),edge=Math.min(1,t*8,(1-t)*8);
 if(kind==='backflip'){const u=t*t*(3-2*t);return {kind,pitch:-Math.PI*2*u,roll:0,tuck:Math.sin(Math.PI*t),weight:1,pivot:state.skin===7?.65:.95};}
 if(kind==='wallrun')return {kind,pitch:0,roll:-(state.wallSide||1)*.32,tuck:0,weight:clamp(edge,0,1),pivot:state.skin===7?.65:.95};
 if(kind==='wallkick')return {kind,pitch:-.14*Math.sin(Math.PI*t),roll:(state.wallSide||1)*.16*Math.sin(Math.PI*t),tuck:.45*Math.sin(Math.PI*t),weight:1,pivot:state.skin===7?.65:.95};
 return {kind,pitch:0,roll:0,tuck:0,weight:0,pivot:state.skin===7?.65:.95};
}
// Rotate occupied box extents with the visible acrobatic body, about its centre.
export function transformParkourBox(box,p){
 const pose=parkourPose(p);if(!pose.weight)return box;
 const yaw=p.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw),dx=box.x-p.x,dz=box.z-p.z,x=c*dx-s*dz,z=s*dx+c*dz,y=box.y-p.y-pose.pivot,a=pose.pitch,b=pose.roll*pose.weight,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),py=y*ca-z*sa,pz=y*sa+z*ca,px=x*cb-py*sb,ry=x*sb+py*cb;
 const h=Math.abs(box.h*ca)+Math.abs(box.d*sa),d=Math.abs(box.h*sa)+Math.abs(box.d*ca),w=Math.abs(box.w*cb)+Math.abs(h*sb),height=Math.abs(box.w*sb)+Math.abs(h*cb);
 return {...box,x:p.x+c*px+s*pz,y:p.y+pose.pivot+ry,z:p.z-s*px+c*pz,w,h:height,d};
}
