// Shared geometry: the server sweeps bullets against the same town the client builds.
export const GUN_ZONE={minX:120,maxX:244,minZ:-140,maxZ:-44,x:182,z:-92,width:124,depth:96};
export const inGunZone=p=>!!p&&!p.mirrorRealm&&p.x>120&&p.x<244&&p.z>-140&&p.z<-44;
export const GUN_ENTRY={x:113,y:.12,z:-92,yaw:-Math.PI/2};
export const GUN_EXIT_BOARDS=[{x:126,z:-132},{x:238,z:-132},{x:126,z:-52},{x:238,z:-52}];
export const WEAPONS=[
 {id:'pistol',name:'拳銃',price:1,magazine:12,interval:320,speed:1500,pellets:1,spread:.002,range:420,require:0},
 {id:'machine',name:'マシンガン',price:3,magazine:30,interval:100,speed:1900,pellets:1,spread:.013,range:420,require:1},
 {id:'sniper',name:'スナイパー',price:5,magazine:5,interval:1000,speed:2600,pellets:1,spread:0,range:800,require:5},
 {id:'shotgun',name:'ショットガン',price:7,magazine:8,interval:850,speed:1600,pellets:4,spread:.055,range:180,require:10},
 {id:'rocket',name:'ロケットランチャー',price:10,magazine:1,interval:1200,speed:24,pellets:1,spread:0,range:320,radius:6,require:15}
];
export const weaponById=id=>WEAPONS.find(w=>w.id===id);
export function buildGunTown({box,board=()=>{},sign=()=>{}}){
 const sand='#c9a575',stone='#af8960',trim='#e4c797',dark='#65513e',paving='#b99d79',brick='#936c4f',chalk='#dbc29b',teal='#538383',rust='#c97750',blue='#626e8c';
 const detail=(...args)=>box(...args,false,{noShadow:true});
 // The solid raised sand slab and desert apron replace every green patch.
 box(182,.055,-92,124,.11,96,sand);box(84,.045,-92,72,.09,10,paving);
 box(182,.118,-92,8,.018,91,paving);box(182,.119,-92,119,.018,7.5,paving);
 for(const z of [-111,-74])box(182,.119,z,112,.018,3.8,paving);
 for(const x of [167,197])box(x,.119,-92,3.4,.018,88,paving);
 // Continuous, thick fortress walls. Only the west entry has a pedestrian gate.
 const wallHeight=18;
 box(182,9,-140,126,wallHeight,2.8,stone);box(182,9,-44,126,wallHeight,2.8,stone);box(244,9,-92,2.8,wallHeight,96,stone);
 box(120,9,-92,2.8,wallHeight,96,stone);
 // Heavy plinth, visible cap and regularly spaced buttresses create depth.
 for(const z of [-140,-44]){box(182,.75,z,126,1.5,3.8,brick);box(182,18.25,z,127,.5,3.7,trim);for(let x=125;x<244;x+=9){box(x,8.9,z,1.5,17.8,3.5,stone);box(x,19.05,z,3,1.2,3.8,trim);}}
 for(const x of [120,244])for(let z=-135;z<-44;z+=9){if(x===120&&z>-105&&z<-79)continue;box(x,8.9,z,3.5,17.8,1.5,stone);box(x,19.05,z,3.8,1.2,3,trim);}
 for(const [x,z]of [[120,-140],[244,-140],[120,-44],[244,-44]]){box(x,11.2,z,7.5,22.4,7.5,brick);box(x,21.7,z,8.2,.6,8.2,trim);for(const side of [-1,1]){box(x+side*3.3,22.8,z,.9,1.6,7.5,stone);box(x,22.8,z+side*3.3,7.5,1.6,.9,stone);}detail(x,13,z-3.77,1.1,3.2,.025,dark);detail(x+3.77,13,z,.025,3.2,1.1,dark);}
 // A completely enclosed roof; only its underside is rendered as cloudy sky.
 box(182,24.9,-92,126,.6,98,stone,true,{noShadow:true});
 for(const z of [-140,-44])box(182,21.5,z,126,7,2.8,stone,true,{noShadow:true});
 for(const x of [120,244])box(x,21.5,-92,2.8,7,96,stone,true,{noShadow:true});
 // Each district has its own footprint, colour, roof level and entrances.
 const buildings=[
 [139,-121,11,11,4.8,sand,teal],[158,-122,12,12,5.5,chalk,rust],[182,-121,11,11,6.6,stone,blue],[204,-122,12,13,4.5,sand,rust],[225,-122,11,12,5.8,chalk,teal],
 [140,-101,12,10,5.2,stone,rust],[158,-101,10,11,4.4,sand,blue],[206,-101,11,11,6.1,chalk,teal],[225,-102,12,10,4.5,stone,blue],
 [138,-81,11,11,4.5,chalk,blue],[157,-82,12,10,6.3,stone,teal],[205,-81,12,10,4.8,sand,rust],[225,-81,11,12,6.5,chalk,rust],
 [139,-63,11,11,5.7,sand,teal],[157,-63,11,12,4.4,chalk,blue],[182,-64,12,11,5.3,stone,rust],[205,-63,11,12,6.2,chalk,blue],[225,-62,12,11,4.6,sand,teal]
 ];
 buildings.forEach(([x,z,w,d,h,paint,accent],index)=>{
  const thickness=.38,door=3.2,side=index%2?-1:1;
  box(x,.145,z,w,.07,d,paving);
  // Genuine side windows, room nooks and two different door openings.
  for(const sign of [-1,1]){const wallX=x+sign*w/2;box(wallX,.63,z,thickness,1.26,d,paint);box(wallX,(h+3.05)/2,z,thickness,h-3.05,d,paint);box(wallX,2.155,z,thickness,1.79,1.5,paint);for(const edge of [-1,1])box(wallX,2.155,z+edge*(d/2-1),thickness,1.79,2,paint);}
  for(const face of [-1,1]){const offset=(index%3-1)*1.05,span=(w-door)/2;box(x-w/2+span/2+offset/2,h/2,z+face*d/2,span+offset,h,thickness,paint);box(x+w/2-span/2+offset/2,h/2,z+face*d/2,span-offset,h,thickness,paint);box(x+offset,(h+2.8)/2,z+face*d/2,door,h-2.8,thickness,paint);for(const edge of [-1,1])detail(x+offset+edge*(door/2+.07),1.45,z+face*(d/2+.23),.15,2.9,.10,trim);detail(x+offset,2.95,z+face*(d/2+.25),door+.3,.16,.13,trim);}
  box(x,h+.15,z,w+.7,.3,d+.7,trim);box(x,h+.39,z,w+.2,.18,d+.2,paint);
  box(x-side*w/2,h+.78,z,.35,.65,d,paint);box(x,h+.78,z-d/2,w,.65,.35,paint);
  // The roof stairs always rise by <=24 cm, within the movement step limit.
  const steps=Math.ceil((h+.49)/.24),stepDepth=(d-1)/steps;
  for(let i=0;i<steps;i++){const top=(i+1)*(h+.49)/steps;box(x+side*(w/2+1.05),top/2,z-d/2+.5+(i+.5)*stepDepth,1.65,top,stepDepth+.012,stone);}
  box(x+side*(w/2+.45),h+.41,z+d/2-.4,2.8,.18,1.5,trim);
  // Recessed doorway shades, colour-coded cloth and projecting wood rafters.
  if(index%3!==1){box(x,3.1,z+d/2+.7,w*.65,.16,1.7,dark);for(const post of [-1,1])box(x+post*w*.27,1.5,z+d/2+1.35,.15,3,.15,dark);detail(x,3.02,z+d/2+1.53,w*.62,.5,.025,accent);}
  for(const offset of [-w*.3,0,w*.3])detail(x+offset,h-.05,z+d/2+.3,.18,.16,.7,dark);
  detail(x-w*.35,2.2,z+d/2+.22,.65,1.1,.025,accent);
  box(x-2,.73,z+1,1.8,1.46,1.1,dark);box(x+2,.56,z-2,1.3,1.12,1.7,brick);
  if(index%2===0){box(x,1.3,z-1,3.3,2.6,.3,paint);box(x+1.5,.76,z-.5,.3,1.52,2.8,paint);}
  if(index%4===0){box(x-1.5,h+.9,z-1.8,2.3,.85,1.5,stone);box(x-1.5,h+1.37,z-1.8,2.5,.12,1.7,trim);}
 });
 function bridge(ax,ay,az,bx,by,bz){const distance=Math.hypot(bx-ax,bz-az),steps=Math.ceil(distance/.65);for(let i=0;i<steps;i++){const t=(i+.5)/steps;box(ax+(bx-ax)*t,ay+(by-ay)*t,az+(bz-az)*t,Math.abs(bx-ax)>Math.abs(bz-az)?distance/steps+.03:2,.22,Math.abs(bx-ax)>Math.abs(bz-az)?2:distance/steps+.03,dark);}for(const sign of [-1,1]){if(az===bz)box((ax+bx)/2,Math.max(ay,by)+.65,az+sign*1.05,distance,.14,.12,dark);else box(ax+sign*1.05,Math.max(ay,by)+.65,(az+bz)/2,.12,.14,distance,dark);}}
 bridge(162,5.8,-123,178,6.9,-123);bridge(140,5.5,-96,139,5.0,-86);bridge(207,6.4,-105,223,4.8,-105);bridge(204,6.5,-67,224,4.9,-67);
 // Crossroads plaza: a dry fountain, low cover and a shaded arcade.
 box(182,.145,-100,15,.07,11,trim);box(182,.43,-102,5.6,.7,4.8,brick);box(182,.82,-102,4.8,.12,4,trim);box(182,1.3,-102,1.2,1.1,1.2,stone);box(182,2.02,-102,1.7,.32,1.7,trim);
 for(const x of [174,190]){box(x,2.1,-102,.7,4.2,.7,stone);box(x,4.35,-102,1.15,.4,1.15,trim);}box(182,4.7,-102,17,.35,1.1,stone);detail(182,4.93,-102,12,.15,1.3,rust);
 function market(x,z,accent){for(const dx of [-2.6,2.6])for(const dz of [-1.4,1.4])box(x+dx,1.8,z+dz,.16,3.6,.16,dark);for(let i=0;i<6;i++)detail(x-2.5+i,3.65,z,1,.15,3.4,i%2?trim:accent);box(x,.9,z+.6,4.8,1.8,1,dark);for(const dx of [-1.5,0,1.5])box(x+dx,1.95,z+.6,1.1,.3,.7,brick);}
 market(174,-112,teal);market(192,-76,rust);market(171,-70,blue);
 // Low maze walls interrupt long sightlines without closing circulation.
 for(const [x,z,w,d]of [[171,-87,.45,9],[178,-80,9,.45],[195,-97,.45,7],[191,-108,7,.45],[146,-72,6,.4],[217,-112,.4,9],[216,-72,6,.4]]){box(x,1.1,z,w,2.2,d,stone);box(x,2.25,z,w+.2,.16,d+.2,trim);}
 for(const [x,z]of [[132,-111],[162,-113],[212,-93],[233,-73],[170,-96],[194,-86]]){box(x,.66,z,1.8,1.32,1.6,dark);box(x+.7,1.65,z+.15,1.1,.66,1.1,brick);for(const y of [.25,.9])detail(x,y,z-.81,1.85,.07,.025,trim);}
 // Quiet courtyards and district signs are recognisable navigation landmarks.
 box(148,.13,-91,9,.04,6,trim);box(215,.13,-92,9,.04,6,paving);

 for(const [x,z]of [[170,-119],[193,-118],[168,-65],[198,-64]]){box(x,3.2,z,.16,6.4,.16,dark);detail(x,5.65,z+.12,1.25,1.8,.035,x%2?teal:rust);}
 // The perimeter is a winding part of the maze, not an empty ring road.
 const outerWall=(x,z,w,d)=>{if(GUN_EXIT_BOARDS.some(p=>Math.abs(p.x-x)<w/2+4&&Math.abs(p.z-z)<d/2+4))return;box(x,1.6,z,w,3.2,d,stone);box(x,3.27,z,w+.15,.14,d+.15,trim);};
 for(let i=0;i<11;i++){const x=133+i*9;outerWall(x,-132,5.5,.45);outerWall(x+(i%2?2.8:-2.8),-134, .45,5.5);outerWall(x,-51,5.5,.45);outerWall(x+(i%2?-2.8:2.8),-54,.45,5.5);}
 for(let i=0;i<9;i++){const z=-124+i*8.1;outerWall(127,z,.45,5);outerWall(130,z+(i%2?2.6:-2.6),6,.45);outerWall(237,z,.45,5);outerWall(234,z+(i%2?-2.6:2.6),6,.45);}
 GUN_EXIT_BOARDS.forEach(p=>{box(p.x,.1,p.z,3.5,.2,3.5,paving);board(p.x,.2,p.z,'gun-exit');});
 board(GUN_ENTRY.x,.09,GUN_ENTRY.z,'gun-entry');
 // A desktop beside the entry board, clear of the return positions.
 const pcX=GUN_ENTRY.x,pcZ=GUN_ENTRY.z-4;
 box(pcX,1.02,pcZ,2.6,.16,1.3,dark);for(const dx of [-1.05,1.05])for(const dz of [-.48,.48])box(pcX+dx,.52,pcZ+dz,.12,1.04,.12,stone);
 box(pcX,1.14,pcZ-.18,.52,.08,.34,dark);box(pcX,1.35,pcZ-.26,.14,.38,.13,dark);box(pcX,1.68,pcZ-.30,1.40,.85,.12,dark);
 detail(pcX,1.68,pcZ-.226,1.22,.68,.025,teal);detail(pcX,1.76,pcZ-.208,1.06,.035,.01,trim);for(let i=0;i<3;i++)detail(pcX-.26+i*.26,1.59,pcZ-.207,.18,.16,.012,i===2?rust:blue);
 box(pcX-.22,1.14,pcZ+.28,.90,.07,.31,dark);for(let i=0;i<3;i++)detail(pcX-.22,1.18,pcZ+.18+i*.09,.80,.008,.025,trim);
 box(pcX+.56,1.15,pcZ+.29,.14,.09,.22,stone);box(pcX+1.04,1.38,pcZ-.15,.35,.64,.62,dark);detail(pcX+1.04,1.44,pcZ+.168,.16,.035,.012,teal);
 board(pcX,.09,pcZ,'pc');

}
const solids=[];buildGunTown({box:(x,y,z,w,h,d,color,solid=true)=>{if(solid)solids.push({x,y,z,w,h,d});}});
export const GUN_SOLIDS=solids;

// Ground-level clear points come from the actual shared maze solids. No fixed team pads.
const spawnPoints=[];
for(let x=125;x<=239;x+=3.5)for(let z=-135;z<=-49;z+=3.5){
 if(GUN_EXIT_BOARDS.some(p=>Math.hypot(x-p.x,z-p.z)<4))continue;
 if(GUN_SOLIDS.some(b=>b.y+b.h/2>.30&&b.y-b.h/2<2.15&&Math.abs(x-b.x)<b.w/2+.60&&Math.abs(z-b.z)<b.d/2+.60))continue;
 spawnPoints.push({x,y:.12,z,yaw:0});
}
export const GUN_SPAWNS=spawnPoints;
