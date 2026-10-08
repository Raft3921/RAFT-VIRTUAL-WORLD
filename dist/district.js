import {STREET_LAMPS} from './local-lighting.js';
// Low-poly town details share the world's box instances and collision grid.
export function buildDistrict({box,board,sign,seats,clockHands}){
  const stone='#c9c4b7',white='#faf8f1',wood='#9a6748',trim='#d4d7d5';
  box(0,.04,-42,42,.08,28,stone);box(16,.04,-6,6,.08,58,stone);
  box(7,.04,-28,22,.08,6,stone);box(32,.04,-28,32,.08,5,stone);
  box(-34,.04,-14,5,.08,52,stone);box(-17,.04,-28,34,.08,5,stone);
  box(0,.04,-60,8,.08,14,stone);box(0,.04,-66,52,.08,6,stone);
  // Fountain and four planters around a walkable central square.
  box(0,.2,-42,7,.4,7,trim);
  for(const side of [-1,1]){box(side*3.2,.55,-42,.45,.7,6.7,white);box(0,.55,-42+side*3.2,6.7,.7,.45,white);}
  box(0,.43,-42,5.95,.12,5.95,'#58bfcc',false);box(0,1.1,-42,1.3,1.4,1.3,trim);
  box(0,1.78,-42,3,.2,3,white);box(0,1.93,-42,2.7,.12,2.7,'#58bfcc',false);box(0,2.4,-42,.7,.85,.7,trim);
  box(0,2.88,-42,.85,.2,.85,'#7fe0df',false);
  function tree(x,z,size=1){box(x,1.55,z,.6,3.1,.6,wood);box(x,3.6,z,3.7*size,1.8,3.7*size,'#438766',false);box(x,4.75,z,2.9*size,1.0,2.9*size,'#60a773',false);box(x,5.48,z,1.6*size,.6,1.6*size,'#84bd78',false);}
  for(const x of [-18,18])for(const z of [-52,-32]){
    box(x,.32,z,4,.64,4,trim);box(x,.66,z,3.6,.07,3.6,'#685647',false);tree(x,z,.8);
  }
  function bench(x,z,yaw=0){
    const c=Math.cos(yaw),s=Math.sin(yaw);const at=(dx,y,dz,w,h,d,color=wood)=>box(x+c*dx+s*dz,y,z-s*dx+c*dz,w,h,d,color,true,{rotation:yaw});
    at(0,.56,0,2.5,.18,.65);at(0,1.0,.38,2.5,.85,.13);for(const dx of [-.95,.95])at(dx,.27,0,.13,.54,.5,'#344c57');
    seats.push({x,z,y:.65,yaw:yaw+Math.PI});
  }
  bench(-9,-35,Math.PI/2);bench(9,-35,-Math.PI/2);bench(-9,-50,Math.PI/2);bench(9,-50,-Math.PI/2);
  // Open market stalls: striped canopies, counters and stacked pixel crates.
  for(let i=0;i<4;i++){
    const x=-13+i*8.6,z=-59,accent=['#d84a42','#52a96d','#48b8d4','#e88a38'][i];
    box(x,.1,z,6,.2,5,trim);for(const dx of [-2.5,2.5])for(const dz of [-1.8,1.8])box(x+dx,1.75,z+dz,.18,3.5,.18,wood);
    for(let stripe=0;stripe<6;stripe++)box(x-2.5+stripe,3.55,z,1,.2,5,stripe%2?white:accent);
    box(x,3.27,z+2.35,6,.55,.2,accent,false);box(x,1.05,z+1.2,5.2,1.05,.85,wood);
    for(let j=0;j<3;j++)box(x-1.6+j*1.6,1.71,z+1.2,1.1,.27,.65,['#e4c84d','#d84a42','#52a96d'][j],false);
    box(x-2.15,.6,z-1.05,1,1,1,wood);box(x-1.1,.38,z-1.2,.65,.65,.65,'#bd8d60');
  }
  // Two accessible little shop shells with a deep porch and open doors.
  for(const x of [-20,20]){
    const z=-77,accent=x<0?'#9a70c5':'#48b8d4';
    box(x,.12,z,13,.24,10,trim);box(x,.26,z,12.4,.06,9.4,'#bd8d60');
    for(const side of [-1,1])box(x+side*6.2,2.4,z,.24,4.3,9.6,white);
    box(x,2.4,z-4.7,12.6,4.3,.24,white);for(const side of [-1,1])box(x+side*4.2,2.4,z+4.7,4.2,4.3,.24,white);
    box(x,4.1,z+4.7,4.3,.9,.24,white);box(x,4.65,z,13,.32,10.4,accent);box(x,4.96,z,12.5,.3,10,accent);
    for(const side of [-1,1]){box(x+side*4.25,2.6,z+4.86,2.8,1.8,.05,'#a9d2df',false);box(x+side*4.25,2.6,z+4.91,.09,1.9,.1,trim,false);}
    box(x,.1,z+6.3,6,.2,3.1,stone);box(x,3.7,z+5.9,7,.2,3.2,accent);
    for(const side of [-1,1])box(x+side*3.2,1.85,z+6.9,.2,3.7,.2,white);
  }
  // A garden pavilion and a clock lookout, each reachable on foot.
  const gx=-55,gz=-19;
  box(gx,.12,gz,12,.24,11,stone);for(const dx of [-5,5])for(const dz of [-4,4])box(gx+dx,2,gz+dz,.4,4,.4,white);
  for(let r=0;r<4;r++)box(gx,4.2+r*.3,gz,12-r*1.8,.35,11-r*1.8,'#52a96d');
  bench(gx,gz-3);board(gx+3,.24,gz+2);
  for(const z of [-8,6,20]){tree(-62,z);tree(-47,z,.8);}
  const tx=42,tz=-28;box(tx,.14,tz,9,.28,9,stone);
  for(const dx of [-3.4,3.4])for(const dz of [-3.4,3.4])box(tx+dx,2.5,tz+dz,.65,5,.65,white);
  box(tx,4.5,tz,8,.4,8,trim);
  for(let j=0;j<22;j++)box(tx-6.8+j*.18,.1+j*.1,tz+5.6-j*.35,2,.2+j*.2,.4,stone);
  box(tx,6.55,tz,5.5,3.8,5.5,white);box(tx,8.55,tz,6,.3,6,'#d84a42');box(tx,8.9,tz,4.7,.4,4.7,'#d84a42');
  for(const side of [-1,1]){
    box(tx,6.65,tz+side*2.8,2.45,2.45,.1,'#344c57',false);box(tx,6.65,tz+side*2.87,2.1,2.1,.04,'#f2e9cb',false);
    clockHands.push(box(tx,7.05,tz+side*2.91,.12,.9,.04,'#344c57',false,{clockHand:'minute',clockSide:side,clockX:tx,clockY:6.65,clockDX:0,clockDY:.40}));
    clockHands.push(box(tx+side*.38,6.65,tz+side*2.96,.8,.12,.04,'#344c57',false,{clockHand:'hour',clockSide:side,clockX:tx,clockY:6.65,clockDX:side*.38,clockDY:0}));
  }
  board(tx-5,.28,tz+2);
  // Lamps, hedges and direction markers create landmarks without house labels.
  for(const [x,z] of STREET_LAMPS){
    box(x,1.6,z,.16,3.2,.16,'#344c57');box(x,3.3,z,.6,.45,.6,'#ffe4a6',false,{streetLamp:true,noShadow:true});box(x,3.58,z,.9,.15,.9,'#344c57',false);
  }
  for(const x of [-25,25])for(const z of [60,64])box(x,.45,z,10,.9,1.0,'#438766');
  sign('PLAZA',16,2.6,-19,2.5);
  board(-28,.08,29);board(75,.08,25);
}
