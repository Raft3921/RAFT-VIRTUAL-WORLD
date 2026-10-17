import {buildTownDoor,buildTownBarredWall} from './gun-town-props.js?v=20261017-props124';
import {gunMap,gunExitBoards} from './gun-maps.js?v=20261017-maps121';
// Deterministic, shared render/collision recipe; visual stair treads are batched,
// while each flight has one continuous authoritative ramp.
export function buildGunVariant({box,board=()=>{},map='snow'}){
 const m=gunMap(map),q=m.zone,snow=m.snow,large=m.large;
 const stone=snow?'#7c8e9b':'#ad8054',wall=snow?'#bbc9cf':'#c09a69',cap=snow?'#eef4f4':'#e5c495',dark=snow?'#384c5b':'#65503d',ground=snow?'#dce7eb':'#c6a16f',accent=snow?'#637f99':'#926c50',timber=snow?'#5c686e':'#76604a';
 const detail=(x,y,z,w,h,d,c)=>box(x,y,z,w,h,d,c,false,{noShadow:true});
 const prop=(id,kind,x,y,z,w,h,d,c,bounds=null)=>box(x,y,z,w,h,d,c,true,{gunPropId:`${map}-${id}`,gunPropKind:kind,gunBounds:bounds||{x,y,z,w,h,d}});
 const slab=(x,y,z,w,d,c=stone)=>box(x,y-.16,z,w,.32,d,c);
 function stair(x,z,rise,base=0,reverse=false,width=2.1,run=10){
  const n=Math.ceil(rise/.19);for(let i=0;i<n;i++){const t=(i+.5)/n,top=(i+1)*rise/n;box(x,base+top/2,z+(reverse?-1:1)*(t-.5)*run,width,top,run/n+.015,stone,false);}
  box(x,base+rise/2,z,width,rise,run,stone,true,{noRender:true,ramp:{base,back:reverse?rise:0,front:reverse?0:rise}});
 }
 function tower(x,z,w,d,base,height,id){
  const door=2.8,thick=.42;
  // Two clear ground entrances; deep side windows break the silhouette.
  slab(x,base+.12,z,w,d,stone);
  for(const side of [-1,1]){buildTownBarredWall({box,detail,prop,id:`${id}-window-${side}`,x:x+side*w/2,z,depth:d,height,base,thickness:thick,paint:wall});const span=(w-door)/2;
   for(const edge of [-1,1])box(x+edge*(door/2+span/2),base+height/2,z+side*d/2,span,height,thick,wall);
   box(x,base+(height+2.9)/2,z+side*d/2,door,height-2.9,thick,wall);
   buildTownDoor({prop,id:`${id}-door-${side}`,x,z:z+side*d/2,width:door-.12,base,dark,wood:timber,panel:snow?'#899397':'#96785a'});
   for(let y=4;y<height-1;y+=4){detail(x+side*(w/2+.23),base+y,z,.035,1.5,1.1,dark);detail(x,base+y,z+side*(d/2+.23),1.1,1.5,.035,dark);}
  }
  slab(x,base+height+.16,z,w+.8,d+.8,cap);
  for(const side of [-1,1]){box(x+side*(w/2-.1),base+height+.65,z,.32,.95,d-4,wall);box(x,base+height+.65,z+side*(d/2-.1),w-3,.95,.32,wall);}
  // Alternating stair flights outside the east wall. Wide end landings join
  // both flights and the roof; neither the room nor adjacent routes are filled.
  const levels=Math.ceil(height/3.6),rise=height/levels,sx=x+w/2+1.5,run=d+1.4;
  for(let level=0;level<levels;level++){const reverse=level%2===1,xx=sx+(reverse?2.3:0),zz=z+(reverse?-1:1)*(run/2+1);
   stair(xx,z,rise,base+.12+level*rise,reverse,2.1,run);slab(sx+1.15,base+.12+(level+1)*rise,zz,4.6,2.3,cap);
  }
  // Openings in the parapet meet the landing on either end of the roof.
  for(const end of [-1,1])slab(x+w/2+1.1,base+height+.12,z+end*(run/2+1),4.8,2.8,cap);
  if(snow){for(const side of [-1,1])detail(x+side*w*.23,base+height+.22,z,w*.37,.12,d*.8,cap);}
  prop(`${id}-crate`,'crate',x-1.9,base+.72,z+1.7,1.5,1.2,1.5,timber);
  if(height>16){box(x,base+height+2,z,.18,3.6,.18,dark);detail(x+.6,base+height+2.6,z,1.2,1.2,.05,accent);}
 }
 // Open sky lining stays far above reachable towers. Strong perimeter walls
 // define the selected footprint while the staging board remains at x=113.
 box(q.x,.055,q.z,q.width,.11,q.depth,ground);box(84,.045,-92,72,.09,10,ground);
 for(const z of [q.minZ,q.maxZ])box(q.x,m.ceiling/2,z,q.width+2,m.ceiling,1.8,stone,true,{noShadow:true});
 for(const x of [q.minX,q.maxX])box(x,m.ceiling/2,q.z,1.8,m.ceiling,q.depth,stone,true,{noShadow:true});
 box(q.x,m.ceiling+.1,q.z,q.width+2,.4,q.depth+2,cap,true,{noShadow:true});
 for(const z of [q.minZ,q.maxZ])for(let x=q.minX+5;x<q.maxX-3;x+=15){box(x,6.5,z,1.6,13,2.6,stone);detail(x,13.3,z,2.4,.5,3.1,cap);}
 for(const x of [q.minX,q.maxX])for(let z=q.minZ+9;z<q.maxZ-5;z+=15){box(x,6.5,z,2.6,13,1.6,stone);detail(x,13.3,z,3.1,.5,2.4,cap);}
 const cols=large?(snow?7:8):4,rows=large?6:3,dx=(q.width-24)/cols,dz=(q.depth-24)/rows,cells=[];
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const id=row*cols+col,seed=(id*17+m.layout*23)%31;
  // Three authored street patterns: snow's staggered courtyards, the desert's
  // stepped east-west ridges, and the citadel's broken checkerboard highlands.
  const x=q.minX+12+(col+.5)*dx+(snow?(row%2?2:-2):((row+col)%3-1)*2),z=q.minZ+12+(row+.5)*dz+((seed%3)-1)*1.4;
  const raised=large?(snow?(row+col)%3!==0:col%3===1):snow&&id%4===1;
  const base=raised?(large?(snow?8+(row%2)*3.6:5.4+(row%3)*2.4):4.2):0;
  const w=large?12+(seed%3):10,d=large?11+(seed%3):9;
  const high=large?(snow?(row+col)%2===0:id%3===0):id%4===0,height=high?(large?21.6+(seed%4)*3.6:14.4):7.2+(seed%3)*3.6;
  if(base){
   // A real covered lower street under the raised district, with four mouths.
   const pw=w+8,pd=d+7;slab(x,base,z,pw,pd,stone);const span=(pw-4.2)/2;
   for(const side of [-1,1])for(const end of [-1,1])box(x+end*(2.1+span/2),base/2,z+side*pd/2,span,base,.55,stone);
   for(const side of [-1,1]){box(x+side*pw/2,base/2,z-pd*.32,.55,base,pd*.35,stone);box(x+side*pw/2,base/2,z+pd*.32,.55,base,pd*.35,stone);}
   // Ground-to-terrace flights lie west of each platform, with no solid plinth.
   const count=Math.ceil(base/3.6),rise=base/count,run=d+1.4,sx=x-pw/2-1.4;
   for(let l=0;l<count;l++){const rev=l%2===1;stair(sx-(rev?2.3:0),z,rise,l*rise,rev,2.1,run);slab(sx-1.15,(l+1)*rise,z+(rev?-1:1)*(run/2+1),4.6,2.3,cap);}
   for(const end of [-1,1])slab(x-pw/2-.3,base,z+end*(run/2+1),4,2.3,cap);
   for(const side of [-1,1]){detail(x+side*1.8,2.2,z,.12,.4,.16,'#d5bd83');box(x+side*1.8,.52,z-1.5,.5,.9,1.2,dark);}
  }
  tower(x,z,w,d,base,height,`block-${id}`);cells.push({x,z,base,height,w,d,row,col});
  // Street cover stays below sight height; snowdrifts / sandstone benches.
  box(x-dx*.39,.48,z+dz*.3,3.6,.85,1.2,snow?cap:stone);box(x+dx*.37,.60,z-dz*.3,1.2,1.1,3,stone);
  if(snow&&id%2===0){const tx=x-dx*.35,tz=z-dz*.34;box(tx,2,tz,.38,4,.38,timber);for(let k=0;k<3;k++){const size=3.4-k*.7;box(tx,1.6+k*.9,tz,size,.7,size,dark,false);detail(tx,2+k*.9,tz,size,.14,size,cap);}}
 }
 // Fixed-level skywalks connect selected tower pairs without impossible slopes.
 // They have piers, walkable decks and a continuous ramp when roof heights differ.
 if(large)for(let i=snow?1:0;i<cells.length-cols;i+=snow?5:4){const a=cells[i],b=cells[i+cols];if(!b)continue;const x=a.x-a.w/2-1,z=(a.z+b.z)/2,length=b.z-a.z,lo=a.base+a.height+.16,hi=b.base+b.height+.16;
  const n=Math.ceil(Math.max(length/.6,Math.abs(hi-lo)/.17));for(let k=0;k<n;k++){const t=(k+.5)/n;box(x,lo+(hi-lo)*t-.10,a.z+length*t,2,.20,length/n+.01,timber,false);}
  box(x,(lo+hi)/2-.10,z,2,Math.abs(hi-lo)+.20,length,timber,true,{noRender:true,ramp:{base:Math.min(lo,hi)-.0,back:lo-Math.min(lo,hi),front:hi-Math.min(lo,hi)}});
  // Low cover leaves the crossing readable from below.
  for(const end of [a,b])slab((x+end.x)/2,end.base+end.height+.16,end.z,Math.abs(x-end.x)+2,2.4,cap);
 }
 // Functional entry/exit boards remain; decorative text signs are omitted.
 gunExitBoards(map).forEach(p=>{slab(p.x,.12,p.z,3.5,3.5,ground);board(p.x,.12,p.z,'gun-exit');});
 board(113,.09,-92,'gun-entry');
 // Reusable entry PC, separate from the nearby shared world-menu board.
 box(113,1.02,-96,2.6,.16,1.3,timber);for(const s of [-1,1])box(113+s*1.05,.52,-96,.13,1.04,1.1,stone);
 box(113,1.65,-96.3,1.4,.85,.16,dark);detail(113,1.65,-96.2,1.2,.65,.025,accent);box(113,1.13,-95.7,.9,.08,.3,dark);board(113,.09,-96,'pc');
}
