// Shared geometry: the server sweeps bullets against the same town the client builds.
export const GUN_ZONE={minX:120,maxX:244,minZ:-140,maxZ:-44,x:182,z:-92,width:124,depth:96};
export const inGunZone=p=>!!p&&!p.mirrorRealm&&p.x>120&&p.x<244&&p.z>-140&&p.z<-44;
export const GUN_SPAWNS=[{x:128,y:.12,z:-130,yaw:Math.PI/2},{x:236,y:.12,z:-54,yaw:-Math.PI/2},{x:236,y:.12,z:-130,yaw:-Math.PI/2},{x:128,y:.12,z:-54,yaw:Math.PI/2},{x:180,y:.12,z:-130,yaw:0},{x:180,y:.12,z:-54,yaw:Math.PI},{x:128,y:.12,z:-92,yaw:Math.PI/2},{x:236,y:.12,z:-92,yaw:-Math.PI/2},{x:182,y:.12,z:-92,yaw:0}];
export const WEAPONS=[
 {id:'pistol',name:'拳銃',price:1,magazine:12,interval:320,speed:1500,pellets:1,spread:.002,range:420,require:0},
 {id:'machine',name:'マシンガン',price:3,magazine:30,interval:100,speed:1900,pellets:1,spread:.013,range:420,require:1},
 {id:'sniper',name:'スナイパー',price:5,magazine:5,interval:1000,speed:2600,pellets:1,spread:0,range:800,require:5},
 {id:'shotgun',name:'ショットガン',price:7,magazine:8,interval:850,speed:1600,pellets:4,spread:.055,range:180,require:10},
 {id:'rocket',name:'ロケットランチャー',price:10,magazine:1,interval:1200,speed:24,pellets:1,spread:0,range:320,radius:6,require:15}
];
export const weaponById=id=>WEAPONS.find(w=>w.id===id);
export function buildGunTown({box,board=()=>{},sign=()=>{}}){
 const sand='#c9a575',stone='#af8960',trim='#e4c797',dark='#65513e';
 box(182,.025,-92,124,.05,96,sand);
 // 11904 square metres, over 49 existing 16 x 15 metre house footprints.
 box(182,7,-140,125,14,1.2,stone);box(182,7,-44,125,14,1.2,stone);box(244,7,-92,1.2,14,96,stone);
 box(120,7,-120,1.2,14,40,stone);box(120,7,-64,1.2,14,40,stone);box(120,11.6,-92,1.2,4.8,16,stone);
 box(84,.035,-92,72,.07,8,sand);sign('SAND TOWN · 銃撃戦',120,10,-92,9);
 // Alternating openings, courtyards, rooms, roof bridges and exterior stairs.
 for(let row=0;row<4;row++)for(let col=0;col<6;col++){
  const x=139+col*17,z=-122+row*20,h=4.2+((row*7+col)%3)*1.2,w=11+(col%2),d=12,paint=(row+col)%2?stone:sand;
  box(x,.075,z,w,.15,d,trim);box(x-w/2,h/2,z,.35,h,d,paint);box(x+w/2,h/2,z,.35,h,d,paint);
  for(const face of [-1,1]){
   box(x-w/2+1.7,h/2,z+face*d/2,3.4,h,.35,paint);
   box(x+w/2-1.7,h/2,z+face*d/2,3.4,h,.35,paint);
   box(x,h-.6,z+face*d/2,w-6.8,1.2,.35,paint);
  }
  box(x,h+.12,z,w+.5,.24,d+.5,trim);
  // Partial parapets allow fire from roofs without sealing off the stairs.
  box(x-w/2,h+.55,z,.35,.8,d,paint);box(x+w/2,h+.55,z,.35,.8,d,paint);box(x,h+.55,z-d/2,w,.8,.35,paint);
  for(let step=0;step<16;step++){const top=(step+1)*h/16;box(x+w/2+1.1,top/2,z-5+step*.65,1.7,top,.66,stone);}
  box(x-2,.8,z+1,2,1.6,1.2,dark);box(x+2,.5,z-2,1.5,1,2,dark);
  // Shaded inner wall creates a hiding nook while preserving two exits.
  if((row+col)%2)box(x,1.4,z-1,4,2.8,.3,paint);
  if(col<5&&(col+row)%3===0)box(x+8.5,h+.12,z-3,6,.22,2.2,dark);
 }
 for(let row=0;row<3;row++)for(let col=0;col<5;col++){
  if((row+col)%2===0)box(147+col*17,1.1,-112+row*20,2.4,2.2,2,stone);
  else box(148+col*17,.65,-112+row*20,5,1.3,1.2,dark);
 }
 GUN_SPAWNS.forEach((p,i)=>{box(p.x,.06,p.z,5,.12,5,['#577b8b','#9a5e49','#6e7960'][i%3]);board(p.x+2,.12,p.z,'gun-team');sign('TEAM '+String.fromCharCode(65+i),p.x,2.8,p.z,2.5);});
 board(113,0,-92,'gun-team');
}
const solids=[];buildGunTown({box:(x,y,z,w,h,d,color,solid=true)=>{if(solid)solids.push({x,y,z,w,h,d});}});
export const GUN_SOLIDS=solids;
