import {buildTownStairwell} from './town-stairwell.js?v=20261017-settlement125';
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
  // Attached stairwell, with foundations and continuous supported landings.
  const levels=Math.ceil(height/3.6),rise=height/levels,sx=x+w/2+1.5,run=d+1.4;
  const landing=buildTownStairwell({box,slab,stair,sx,z,base:base+.12,rise,levels,run,stone,cap});
  slab(x+w/2+1.05,landing.y,landing.z,4.9,3.2,cap);
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
 const occupied=[];
 const cols=large?(snow?7:8):4,rows=large?6:3,dx=(q.width-24)/cols,dz=(q.depth-24)/rows,cells=[];
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const id=row*cols+col,seed=(id*17+m.layout*23)%31;
  // Three authored street patterns: snow's staggered courtyards, the desert's
  // stepped east-west ridges, and the citadel's broken checkerboard highlands.
  const x=q.minX+12+(col+.5)*dx+(snow?(row%2?2:-2):((row+col)%3-1)*2),z=q.minZ+12+(row+.5)*dz+((seed%3)-1)*1.4;
  const raised=large?(snow?(row+col)%3!==0:col%3===1):snow&&id%4===1;
  const base=raised?(large?5.4+(row%2)*1.8:3.6):0;
  const w=large?12+(seed%3):10,d=large?11+(seed%3):9;
  const high=large?(snow?(row+col)%4===0:id%5===0):id%5===0,height=high?(large?18+(seed%2)*3.6:14.4):5.4+(seed%3)*1.8;
  if(base){
   // A real covered lower street under the raised district, with four mouths.
   const pw=w+8,pd=d+7;slab(x,base,z,pw,pd,stone);const span=(pw-4.2)/2;
   for(const side of [-1,1])for(const end of [-1,1])box(x+end*(2.1+span/2),base/2,z+side*pd/2,span,base,.55,stone);
   for(const side of [-1,1]){box(x+side*pw/2,base/2,z-pd*.32,.55,base,pd*.35,stone);box(x+side*pw/2,base/2,z+pd*.32,.55,base,pd*.35,stone);}
   const count=Math.ceil(base/3.6),rise=(base-.12)/count,run=d+1.4,sx=x-pw/2-1.4;
   const landing=buildTownStairwell({box,slab,stair,sx,z,base:.12,rise,levels:count,run,side:-1,stone,cap});
   slab(x-pw/2-.3,base,landing.z,4,3.2,cap);
   for(const side of [-1,1]){detail(x+side*1.8,2.2,z,.12,.4,.16,'#d5bd83');box(x+side*1.8,.52,z-1.5,.5,.9,1.2,dark);}
  }
  occupied.push({x:x-(base?1.8:0),z,w:w+(base?18:12),d:d+8});
  tower(x,z,w,d,base,height,`block-${id}`);cells.push({x,z,base,height,w,d,row,col});
  // Street cover stays below sight height; snowdrifts / sandstone benches.
  box(x-dx*.39,.48,z+dz*.3,3.6,.85,1.2,snow?cap:stone);box(x+dx*.37,.60,z-dz*.3,1.2,1.1,3,stone);
  if(snow&&id%2===0){const tx=x-dx*.35,tz=z-dz*.34;box(tx,2,tz,.38,4,.38,timber);for(let k=0;k<3;k++){const size=3.4-k*.7;box(tx,1.6+k*.9,tz,size,.7,size,dark,false);detail(tx,2+k*.9,tz,size,.14,size,cap);}}
 }
 // Flat bridges only: no unsupported diagonal stair slabs between mismatched
 // roof levels. Both edges have piers down to street level and solid railings.
 let bridgeCount=0;
 if(large)for(let i=0;i<cells.length-cols&&bridgeCount<6;i++){
  const a=cells[i],b=cells[i+cols],y=a.base+a.height+.16;if(Math.abs(y-(b.base+b.height+.16))>.05)continue;
  const x=Math.min(a.x-a.w/2,b.x-b.w/2)-1.4,z=(a.z+b.z)/2,length=b.z-a.z;
  slab(x,y,z,2.4,length,cap);for(const side of [-1,1]){box(x+side*1.2,y+.45,z,.18,.9,length-2,stone);box(x+side*1.1,y/2,z,.38,y,.38,stone);}
  for(const end of [a,b])slab((x+end.x)/2,y,end.z,Math.abs(x-end.x)+2.4,2.8,cap);bridgeCount++;
 }
 // Alternate full-height cover, low cover and small rooms along the gaps
 // between districts. Reserve routes around towers, stairs and exit boards.
 const exits=gunExitBoards(map);let coverId=0;
 function streetCover(x,z,w,d,kind){
  if(x-w/2<q.minX+5||x+w/2>q.maxX-5||z-d/2<q.minZ+5||z+d/2>q.maxZ-5)return;
  if(exits.some(p=>Math.abs(x-p.x)<w/2+4&&Math.abs(z-p.z)<d/2+4)||occupied.some(p=>Math.abs(x-p.x)<(w+p.w)/2+1.1&&Math.abs(z-p.z)<(d+p.d)/2+1.1))return;
  occupied.push({x,z,w,d});const id=`street-${coverId++}`;
  if(kind===0){
   const h=3.8,door=2.5;slab(x,.12,z,w,d,stone);
   for(const face of [-1,1]){const span=(w-door)/2;for(const side of [-1,1])box(x+side*(door/2+span/2),h/2,z+face*d/2,span,h,.32,wall);box(x,(h+2.8)/2,z+face*d/2,door,h-2.8,.32,wall);buildTownDoor({prop,id:`${id}-door-${face}`,x,z:z+face*d/2,width:door-.12,dark,wood:timber});}
   for(const side of [-1,1])buildTownBarredWall({box,detail,prop,id:`${id}-window-${side}`,x:x+side*w/2,z,depth:d,height:h,paint:wall});
   slab(x,h+.12,z,w+.4,d+.4,cap);
  }else if(kind===1){
   box(x,1.15,z-d/2+.18,w,2.3,.36,stone);box(x-w/2+.18,1.15,z-d*.12,.36,2.3,d*.72,stone);detail(x,2.34,z-d/2+.18,w+.12,.08,.48,cap);
   prop(`${id}-crate`,'crate',x+w*.22,.69,z+d*.16,1.5,1.16,1.4,timber);
  }else if(kind===2){
   box(x,1.2,z-d/2,w,2.4,.36,wall);box(x-w/2,.58,z,.3,1.16,d,stone);
   for(const side of [-1,1])box(x+side*(w/2-.16),1.5,z+d/2-.16,.32,3,.32,stone);slab(x,3.16,z,w+.4,d+.4,cap);
  }else{
   box(x-w*.23,.62,z-d*.18,w*.45,1.24,d*.52,stone);box(x+w*.24,1.05,z+d*.18,w*.42,2.1,d*.48,stone);
   detail(x+w*.24,2.15,z+d*.18,w*.44,.10,d*.50,cap);
  }
 }
 for(let row=0;row<rows-1;row++)for(let col=0;col<cols;col++){
  const a=cells[row*cols+col],b=cells[(row+1)*cols+col],x=(a.x+b.x)/2,z=(a.z+b.z)/2,kind=(row*cols+col+m.layout)%4;
  streetCover(x,z,kind===0?6.2:5.2,kind===0?5.6:4.2,kind);
  if(large)streetCover(x+dx*.43,z+dz*.06,3.4,2.5,3);
 }
 // Short staggered walls also break the wide perimeter sight lines, without
 // closing the path to any of the corner exit boards.
 for(let x=q.minX+17;x<q.maxX-12;x+=15){streetCover(x,q.minZ+7.5,4.8,2.2,1);streetCover(x+4,q.maxZ-7.5,4.8,2.2,3);}
 // Functional entry/exit boards remain; decorative text signs are omitted.
 gunExitBoards(map).forEach(p=>{slab(p.x,.12,p.z,3.5,3.5,ground);board(p.x,.12,p.z,'gun-exit');});
 board(113,.09,-92,'gun-entry');
 // Reusable entry PC, separate from the nearby shared world-menu board.
 box(113,1.02,-96,2.6,.16,1.3,timber);for(const s of [-1,1])box(113+s*1.05,.52,-96,.13,1.04,1.1,stone);
 box(113,1.65,-96.3,1.4,.85,.16,dark);detail(113,1.65,-96.2,1.2,.65,.025,accent);box(113,1.13,-95.7,.9,.08,.3,dark);board(113,.09,-96,'pc');
}
