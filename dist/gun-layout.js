import {insideGunMap} from './gun-maps.js?v=20261017-maps121';
import {buildGunVariant} from './gun-town-variants.js?v=20261017-authority122';
// Shared geometry: the server sweeps bullets against the same town the client builds.
export const GUN_ZONE={minX:120,maxX:244,minZ:-140,maxZ:-44,x:182,z:-92,width:124,depth:96};
export const inGunZone=(p,map='sand')=>insideGunMap(p,map);
export const GUN_ENTRY={x:113,y:.12,z:-92,yaw:-Math.PI/2};
export const GUN_EXIT_BOARDS=[{x:126,z:-132},{x:238,z:-132},{x:126,z:-52},{x:238,z:-52}];
export const WEAPONS=[
 {id:'pistol',name:'拳銃',price:1,magazine:12,interval:320,speed:1500,pellets:1,spread:.002,range:420,require:0},
 {id:'machine',name:'マシンガン',price:3,magazine:30,interval:100,speed:1900,pellets:1,spread:.013,range:420,damage:.5,require:1},
 {id:'sniper',name:'スナイパー',price:5,magazine:5,interval:1000,speed:2600,pellets:1,spread:0,range:800,damage:1.5,require:5},
 {id:'shotgun',name:'ショットガン',price:7,magazine:8,interval:850,speed:1600,pellets:4,spread:.055,range:180,require:10},
 {id:'rocket',name:'ロケットランチャー',price:10,magazine:1,interval:1200,speed:24,pellets:1,spread:0,range:320,radius:12,damage:2,require:15},
 {id:'katana',name:'日本刀',price:1,magazine:1,interval:560,speed:0,pellets:1,spread:0,range:2.8,damage:1,melee:true,require:0}
];
export const weaponById=id=>WEAPONS.find(w=>w.id===id);
export function buildGunTown({box:emit,board=()=>{},sign=()=>{},map='sand'}){
 if(map!=='sand')return buildGunVariant({box:emit,board,map});
 let protectApproaches=false,stairRoof=null;const corridors=[];
 const box=(...a)=>{if(protectApproaches&&a[7]!==false&&a[4]>.03&&corridors.some(c=>Math.abs(a[0]-c.x)<a[3]/2+c.w/2+.5&&Math.abs(a[2]-c.z)<a[5]/2+c.d/2+.8))return;return emit(...a);};
 const sand='#c9a575',stone='#af8960',trim='#e4c797',dark='#65513e',paving='#b99d79',brick='#936c4f',chalk='#dbc29b',teal='#538383',rust='#c97750',blue='#626e8c';
 const detail=(...args)=>box(...args,false,{noShadow:true});
 const prop=(id,kind,x,y,z,w,h,d,color,bounds=null)=>box(x,y,z,w,h,d,color,true,{gunPropId:id,gunPropKind:kind,gunBounds:bounds||{x,y,z,w,h,d}});
 const stair=(x,z,width,run,rise,base=0,reverse=false)=>{
  corridors.push({x,z,w:width,d:run});
  const count=Math.ceil(rise/.19);for(let i=0;i<count;i++){const top=(i+1)*rise/count;box(x,base+top/2,z+(reverse?1:-1)*run/2+(reverse?-1:1)*(i+.5)*run/count,width,top,run/count+.01,stone,false);}
  box(x,base+rise/2,z,width,rise,run,stone,true,{ramp:{base,back:reverse?rise:0,front:reverse?0:rise},noRender:true,gunStairRoof:stairRoof});
 };
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
 [139,-121,11,11,4.8,sand,teal],[158,-122,12,12,5.5,chalk,rust],[182,-121,11,11,10.8,stone,blue],[204,-122,12,13,4.5,sand,rust],[225,-122,11,12,5.8,chalk,teal],
 [140,-101,12,10,5.2,stone,rust],[158,-101,10,11,4.4,sand,blue],[206,-101,11,11,6.1,chalk,teal],[225,-102,12,10,4.5,stone,blue],
 [138,-81,11,11,4.5,chalk,blue],[157,-82,12,10,6.3,stone,teal],[205,-81,12,10,9.6,sand,rust],[225,-81,11,12,6.5,chalk,rust],
 [139,-63,11,11,5.7,sand,teal],[157,-63,11,12,4.4,chalk,blue],[182,-64,12,11,5.3,stone,rust],[205,-63,11,12,6.2,chalk,blue],[225,-62,12,11,4.6,sand,teal]
 ];
 buildings.forEach(([x,z,w,d,h,paint,accent],index)=>{
  const thickness=.38,door=3.2,side=index%2?-1:1;stairRoof={x,z,w,d,y:h+.48,side,high:h>=8};
  box(x,.145,z,w,.07,d,paving);
  // Genuine side windows, room nooks and two different door openings.
  for(const sign of [-1,1]){const wallX=x+sign*w/2,sill=.68,head=3.35;
   box(wallX,sill/2,z,thickness,sill,d,paint);box(wallX,(h+head)/2,z,thickness,h-head,d,paint);
   box(wallX,(sill+head)/2,z,thickness,head-sill,1.1,paint);for(const edge of [-1,1])box(wallX,(sill+head)/2,z+edge*(d/2-.7),thickness,head-sill,1.4,paint);
   for(const edge of [-1,1]){const length=(d-2.8-1.1)/2,cz=z+edge*(.55+length/2),bounds={x:wallX,y:(sill+head)/2,z:cz,w:.18,h:head-sill,d:length},id=`window-${index}-${sign}-${edge}`;
    for(const y of [sill,head])for(const end of [-1,1])detail(wallX,y,cz+end*(length/2-.1),.14,.12,.20,'#525750');
    for(let k=0;k<4;k++)prop(id,'bars',wallX,(sill+head)/2,cz+(k-1.5)*length/4,.055,head-sill,.055,'#424b49',bounds);
    for(const y of [sill+.1,head-.1])prop(id,'bars',wallX,y,cz,.055,.055,length,'#424b49',bounds);
   }
  }
  for(const face of [-1,1]){const offset=(index%3-1)*1.05,span=(w-door)/2;box(x-w/2+span/2+offset/2,h/2,z+face*d/2,span+offset,h,thickness,paint);box(x+w/2-span/2+offset/2,h/2,z+face*d/2,span-offset,h,thickness,paint);box(x+offset,(h+2.8)/2,z+face*d/2,door,h-2.8,thickness,paint);for(const edge of [-1,1])detail(x+offset+edge*(door/2+.07),1.45,z+face*(d/2+.23),.15,2.9,.10,trim);detail(x+offset,2.95,z+face*(d/2+.25),door+.3,.16,.13,trim);}
  for(const face of [-1,1]){
   const dx=x+(index%3-1)*1.05,dz=z+face*d/2,id=`door-${index}-${face}`,bounds={x:dx,y:1.44,z:dz,w:door-.16,h:2.6,d:.16};
   prop(id,'door',dx,1.44,dz,bounds.w,2.6,.16,'#79604a',bounds);
   // Raised timber frame, recessed panels and hardware move with the leaf.
   for(const edge of [-1,1])prop(id,'door',dx+edge*(bounds.w/2-.13),1.44,dz,.19,2.6,.23,dark,bounds);
   for(const y of [.30,1.42,2.58])prop(id,'door',dx,y,dz,bounds.w,.16,.23,dark,bounds);
   for(const side of [-1,1]){
    for(const y of [.77,2.01])prop(id,'door',dx,y,dz+side*.09,bounds.w-.53,.85,.035,'#96785a',bounds);
    prop(id,'door',dx+bounds.w/2-.26,1.34,dz+side*.16,.09,.30,.06,'#3e4140',bounds);
    prop(id,'door',dx+bounds.w/2-.39,1.38,dz+side*.21,.30,.055,.07,'#a6a49a',bounds);
   }
   for(const y of [.45,1.44,2.43])prop(id,'door',dx-bounds.w/2+.04,y,dz,.10,.22,.27,'#414442',bounds);
  }
  box(x,h+.15,z,w+.7,.3,d+.7,trim);box(x,h+.39,z,w+.2,.18,d+.2,paint);
  box(x-side*w/2,h+.78,z,.35,.65,d,paint);box(h>=8?x-side*1.4:x,h+.78,z-d/2,h>=8?w-2.8:w,.65,.35,paint);
  // The roof stairs always rise by <=24 cm, within the movement step limit.
  // A continuous collision ramp under visual treads prevents toe snagging.
  if(h<8)stair(x+side*(w/2+1.05),z,1.65,d-.6,h+.49,.12);
  else{
   const sx=x+side*(w/2+1.05),half=(h+.49)/2;
   stair(sx,z,1.65,d-.6,half,.12);
   box(sx+side*.95,half+.18,z+d/2+.55,3.55,.16,1.5,trim);
   // A real switchback: step sideways on the landing, then climb back north.
   stair(sx+side*1.9,z,1.65,d-.6,half,.12+half,true);
   box(sx+side*.95,h+.55,z-d/2-.55,3.55,.16,1.5,trim);
  }
  box(x+side*(w/2+.45),h+.41,z+(h>=8?-1:1)*(d/2+.55),2.8,.18,1.5,trim);
  // Recessed doorway shades, colour-coded cloth and projecting wood rafters.
  if(index%3!==1){box(x,3.1,z+d/2+.7,w*.65,.16,1.7,dark);for(const post of [-1,1])box(x+post*w*.27,1.5,z+d/2+1.35,.15,3,.15,dark);detail(x,3.02,z+d/2+1.53,w*.62,.5,.025,accent);}
  for(const offset of [-w*.3,0,w*.3])detail(x+offset,h-.05,z+d/2+.3,.18,.16,.7,dark);
  detail(x-w*.35,2.2,z+d/2+.22,.65,1.1,.025,accent);
  prop(`crate-${index}-a`,'crate',x-2,.85,z+1,1.8,1.46,1.1,dark);prop(`crate-${index}-b`,'crate',x+2,.69,z-2,1.3,1.12,1.7,brick);
  if(index%2===0){box(x,1.3,z-1,3.3,2.6,.3,paint);box(x+1.5,.76,z-.5,.3,1.52,2.8,paint);}
  if(index%4===0){box(x-1.5,h+.9,z-1.8,2.3,.85,1.5,stone);box(x-1.5,h+1.37,z-1.8,2.5,.12,1.7,trim);}
 });
 function bridge(ax,ay,az,bx,by,bz){
  // Small rise per 0.45m tread; no steep inaccessible diagonal decks.
  const distance=Math.hypot(bx-ax,bz-az),steps=Math.ceil(Math.max(distance/.45,Math.abs(by-ay)/.16));
  for(let i=0;i<steps;i++){const t=(i+.5)/steps;box(ax+(bx-ax)*t,ay+(by-ay)*t,az+(bz-az)*t,Math.abs(bx-ax)>Math.abs(bz-az)?distance/steps+.02:1.6,.18,Math.abs(bx-ax)>Math.abs(bz-az)?1.6:distance/steps+.02,dark,false);}
  const alongX=Math.abs(bx-ax)>Math.abs(bz-az),forward=alongX?bx>ax:bz>az,lo=Math.min(ay,by),hi=Math.max(ay,by);
  box((ax+bx)/2,(lo+hi)/2,(az+bz)/2,1.6,hi-lo+.18,distance,dark,true,{noRender:true,rotation:alongX?Math.PI/2:0,ramp:{base:0,back:(forward?ay:by)+.09,front:(forward?by:ay)+.09}});

 }

 bridge(162,5.8,-123,178,11.3,-123);bridge(140,5.5,-96,139,5.0,-86);bridge(207,6.4,-105,223,4.8,-105);bridge(204,6.5,-67,224,4.9,-67);
 protectApproaches=true;
 // Crossroads plaza: a dry fountain, low cover and a shaded arcade.
 box(182,.145,-100,15,.07,11,trim);box(182,.43,-102,5.6,.7,4.8,brick);box(182,.82,-102,4.8,.12,4,trim);box(182,1.3,-102,1.2,1.1,1.2,stone);box(182,2.02,-102,1.7,.32,1.7,trim);
 for(const x of [174,190]){box(x,2.1,-102,.7,4.2,.7,stone);box(x,4.35,-102,1.15,.4,1.15,trim);}box(182,4.7,-102,17,.35,1.1,stone);detail(182,4.93,-102,12,.15,1.3,rust);
 function market(x,z,accent){for(const dx of [-2.6,2.6])for(const dz of [-1.4,1.4])box(x+dx,1.8,z+dz,.16,3.6,.16,dark);for(let i=0;i<6;i++)box(x-2.5+i,3.65,z,1,.15,3.4,i%2?trim:accent,true,{bounce:true,gunTent:true});box(x,.9,z+.6,4.8,1.8,1,dark);for(const dx of [-1.5,0,1.5])box(x+dx,1.95,z+.6,1.1,.3,.7,brick);}
 market(174,-112,teal);market(191,-76,rust);market(170,-70,blue);
 // Low maze walls interrupt long sightlines without closing circulation.
 for(const [x,z,w,d]of [[171,-87,.45,9],[178,-80,9,.45],[195,-97,.45,7],[191,-108,7,.45],[146,-72,6,.4],[217,-112,.4,9],[216,-72,6,.4]]){box(x,1.1,z,w,2.2,d,stone);box(x,2.25,z,w+.2,.16,d+.2,trim);}
 for(const [x,z]of [[132,-111],[162,-113],[212,-93],[233,-73],[170,-96],[194,-86]]){box(x,.66,z,1.8,1.32,1.6,dark);box(x+.7,1.65,z+.15,1.1,.66,1.1,brick);for(const y of [.25,.9])detail(x,y,z-.81,1.85,.07,.025,trim);}
 // Staggered corners break long ground-level sightlines. Lower walls can be
 // used crouched or prone; underpasses have 0.62m of genuine clear headroom.
 for(const [x,z,axis]of [[182,-132,0],[181,-114,1],[184,-83,1],[180,-57,0],[166,-92,0],[198,-92,0]]){
  const w=axis?5.4:.45,d=axis?.45:5.4;box(x,1.65,z,w,3.3,d,stone);box(x+2,1.65,z+2.5,3.4,3.3,.4,brick);
 }
 for(const [x,z,w,d]of [[174,-88,4,.45],[187,-78,4,.45],[194,-116,.45,4],[163,-72,.45,3.4],[214,-91,4,.45],[151,-92,3.2,.45]]){
  box(x,.51,z,w,.78,d,stone);box(x,.93,z,w+.12,.08,d+.12,trim);
 }
 for(const [i,x,z]of [[0,172,-123],[1,192,-64],[2,215,-84]]){
  box(x,.96,z,3.6,.44,2.2,stone);box(x-1.6,.44,z,.4,.66,2.2,brick);box(x+1.6,.44,z,.4,.66,2.2,brick);
  // Bent approach walls conceal the exit without closing the crawl opening.
  box(x-2.1,1.3,z-1.8,2.8,2.4,.4,stone);box(x+2.1,1.3,z+1.8,2.8,2.4,.4,stone);
 }
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
 // A desktop beside the entry board, clear of the return positions.
 box(pcX,1.02,pcZ,2.6,.16,1.3,dark);for(const dx of [-1.05,1.05])for(const dz of [-.48,.48])box(pcX+dx,.52,pcZ+dz,.12,1.04,.12,stone);
 box(pcX,1.14,pcZ-.18,.52,.08,.34,dark);box(pcX,1.35,pcZ-.26,.14,.38,.13,dark);box(pcX,1.68,pcZ-.30,1.40,.85,.12,dark);
 detail(pcX,1.68,pcZ-.226,1.22,.68,.025,teal);detail(pcX,1.76,pcZ-.208,1.06,.035,.01,trim);for(let i=0;i<3;i++)detail(pcX-.26+i*.26,1.59,pcZ-.207,.18,.16,.012,i===2?rust:blue);
 box(pcX-.22,1.14,pcZ+.28,.90,.07,.31,dark);for(let i=0;i<3;i++)detail(pcX-.22,1.18,pcZ+.18+i*.09,.80,.008,.025,trim);
 box(pcX+.56,1.15,pcZ+.29,.14,.09,.22,stone);box(pcX+1.04,1.38,pcZ-.15,.35,.64,.62,dark);detail(pcX+1.04,1.44,pcZ+.168,.16,.035,.012,teal);
 board(pcX,.09,pcZ,'pc');

}
