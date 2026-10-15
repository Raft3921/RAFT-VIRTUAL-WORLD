// All scenery reuses the box geometry and instanced material batches.
export function plazaParts(f,paint,B,parts){
 const wood='#bd9166',dark='#354353',metal='#87929a',white='#f4eee2',green='#438766',s=f.design;
 const role=r=>parts[parts.length-1].role=r,rot=(x=0,y=0,z=0)=>Object.assign(parts[parts.length-1],{rx:x,ry:y,rz:z});
 const posts=(height=1)=>{for(const x of [-.44,.44])for(const z of [-.44,.44])B(x,height/2,z,.06,height,.06,wood);};
 if(f.family==='nature'){
  let leaf=['red','redleaves'].includes(s)?'#bc493d':s==='orange'?'#da843d':['gold','goldpine'].includes(s)?'#ddbb57':green;
  const trunk=(height=.65)=>B(0,height/2,0,.08,height,.08,s==='birch'?'#e5e2d4':wood);
  const crown=(y=.7,w=.9,h=.25)=>{B(0,y,0,w,h,w,leaf);B(-w*.16,y+h*.55,w*.1,w*.58,h*.55,w*.65,['red','redleaves'].includes(s)?'#d9764c':s==='orange'?'#edac5c':['gold','goldpine'].includes(s)?'#f0d272':'#659c64');};
  if(['vine','twist','vinewall','vinearch'].includes(s)){
   const strands=s==='vinewall'?5:s==='vinearch'?2:2;
   for(let j=0;j<strands;j++)for(let i=0;i<12;i++){const t=i/11,x=s==='vinewall'?-.4+j*.2:s==='vinearch'?(j?1:-1)*(.42-.08*Math.sin(t*Math.PI)):Math.sin(t*Math.PI*(s==='twist'?4:1)+j*2)*.2,z=s==='twist'?Math.cos(t*Math.PI*4+j*2)*.2:0;B(x,t*.92+.035,z,.025,.11,.025,'#6f7850');if(i%2===0)B(x+(i%4?-.055:.055),t*.92+.035,z,.16,.045,.13,leaf);}if(s==='vinearch')B(0,.94,0,.86,.09,.16,leaf);return;
  }
  if(['grass','bamboo'].includes(s)){for(let i=0;i<7;i++){const x=Math.sin(i*2.4)*.35,z=Math.cos(i*2.4)*.35,h=.65+(i%3)*.15;B(x,h/2,z,s==='bamboo'?.045:.022,h,.035,s==='bamboo'?'#769451':leaf);if(s==='bamboo')for(const y of [.3,.6,.85])B(x+.08,y,z,.18,.025,.06,green);}return;}
  if(['moss','leaves','redleaves'].includes(s)){for(let i=0;i<12;i++){B(Math.sin(i*2.4)*.37,.35+(i%3)*.1,Math.cos(i*2.4)*.37,.22,.25,.16,s==='moss'?green:leaf);rot(0,i*.3);}return;}
  if(s==='flower'||s==='mushroom'){for(let i=0;i<5;i++){const x=Math.sin(i*2.4)*.3,z=Math.cos(i*2.4)*.3,y=.45+(i%2)*.25;B(x,y/2,z,.035,y,.035,green);B(x,y,z,s==='mushroom'?.24:.17,.09,s==='mushroom'?.24:.17,s==='mushroom'?'#b77b53':i%2?'#e4c84d':'#e9a5a0');if(s==='flower')B(x,y+.06,z,.05,.045,.05,white);}return;}
  if(['roots','log','stump','branch','dead'].includes(s)){if(s==='stump'){B(0,.4,0,.68,.8,.68,wood);B(0,.82,0,.55,.04,.55,'#dfc69e');}else if(s==='log')B(0,.4,0,.7,.8,.95,wood);else{if(s!=='roots')trunk();for(let i=0;i<5;i++){B(Math.sin(i*1.26)*.22,s==='roots'?.2:.55+Math.cos(i)*.2,Math.cos(i*1.26)*.22,.07,s==='roots'?.2:.35,.6,wood);rot(s==='roots'?0:-.5,i*1.26);if(s==='branch')B(Math.sin(i)*.28,.7,Math.cos(i)*.25,.35,.08,.35,leaf);}}return;}
  if(['hedge','leaf','fern','banana'].includes(s)){if(s==='hedge'){crown(.5,.95,.65);return;}if(s==='banana')trunk(.7);for(let i=0;i<8;i++){const a=i*Math.PI/4;B(Math.sin(a)*.22,s==='banana'?.75:.45,Math.cos(a)*.22,.14,.04,.65,leaf);rot(-.28,a,.1);}return;}
  trunk(s==='palm'?.85:.65);
  if(['conifer','snowpine','goldpine'].includes(s)){for(let i=0;i<5;i++){const w=.92-i*.15;B(0,.35+i*.13,0,w,.13,w,leaf);if(s==='snowpine')B(0,.42+i*.13,0,w*.85,.04,w*.85,white);}return;}
  if(s==='palm'){for(let i=0;i<8;i++){const a=i*Math.PI/4;B(Math.sin(a)*.24,.9,Math.cos(a)*.24,.16,.05,.65,leaf);rot(.22,a);}return;}
  crown(.68,.93,.25);crown(.89,.65,.18);
  if(['willow','banyan','jungle'].includes(s))for(let i=0;i<8;i++){const a=i*Math.PI/4;B(Math.sin(a)*.32,s==='banyan'?.45:.6,Math.cos(a)*.32,.035,s==='banyan'?.8:.35,.035,s==='banyan'?wood:leaf);}return;
 }
 if(f.family==='playground'){
  if(s==='slide'){
   const top=.76,steps=Math.ceil(f.h*.88*top/.18),height=f.h*.88*top,span=f.d*.88*.45,len=Math.hypot(height-f.h*.88*.05,span),slope=Math.atan2(height-f.h*.88*.05,span);
   for(const x of [-.36,.36]){B(x,.39,-.03,.045,.78,.055,metal);B(x,.84,-.03,.035,.2,.035,metal);}
   B(0,top,-.03,.72,.04,.10,wood);role('platform');
   for(let i=0;i<steps;i++){const t=(i+1)/steps;B(0,top*t/2,-.49+t*.44,.66,top*t,.44/steps+.018,wood);role('step');}
   B(0,.405,.225,.64,.025,len/(f.d*.88),paint);rot(slope);
   for(const x of [-.34,.34]){B(x,.44,.225,.035,.08,len/(f.d*.88),white);rot(slope);}
   B(0,.05,.45,.68,.025,.12,paint);return;
  }
  if(s==='swing'||s==='zipline'){
   if(s==='zipline'){for(const z of [-.44,.44])for(const x of [-.4,.4])B(x,.5,z,.055,1,.055,wood);B(0,.95,0,.035,.035,.95,metal);B(0,.81,0,.014,.28,.014,metal);role('ride');B(0,.67,0,.3,.015,.025,wood);role('ride');return;}
   else{for(const x of [-.43,.43])for(const z of [-.38,.38]){const rise=f.h*.88*.95,reach=z*f.d*.88;B(x,.475,z/2,.06,Math.hypot(rise,reach)/(f.h*.88),.06,wood);rot(Math.atan2(-reach,rise));B(x,.025,z,.12,.05,.16,metal);}B(0,.95,0,.96,.07,.07,metal);}
   for(const [slot,x]of (f.id==='play-double-swing'?[-.24,.24]:[0]).entries()){
    for(const side of [-1,1]){
     // Two twisted fibre strands, small knots and a metal pivot; all share the seat pivot.
     for(let k=0;k<28;k++)for(const strand of [-1,1]){const a=k*1.2+(strand===1?Math.PI:0);B(x+side*.115+Math.sin(a)*.0025,.23+(k+.5)*.72/28,Math.cos(a)*.003,.006,.72/28+.003,.006,k%3?'#a58a61':'#ddc49a');role('ride');parts[parts.length-1].rideSlot=slot;}
     for(const y of [.245,.92]){B(x+side*.115,y,0,.02,.024,.022,'#79603f');role('ride');parts[parts.length-1].rideSlot=slot;}
    }
    B(x,.23,0,.28,.035,.2,paint);role('ride');parts[parts.length-1].rideSlot=slot;
   }return;
  }
  if(s==='seesaw'){B(0,.28,0,.16,.56,.4,wood);B(0,.47,0,.96,.09,.28,paint);role('ride');for(const x of [-.4,.4]){B(x,.6,0,.02,.2,.03,metal);role('ride');B(x,.51,0,.18,.025,.3,wood);role('ride');}return;}
  if(s==='spring'){B(0,.035,0,.45,.07,.5,metal);for(let i=0;i<9;i++){const a=i*.95;B(Math.sin(a)*.09,.12+i*.018,Math.cos(a)*.09,.11,.035,.035,metal);}const start=parts.length;B(0,.46,0,.65,.26,.68,paint);B(0,.61,0,.47,.06,.43,wood);if(f.id==='play-spring-horse'){B(0,.7,-.26,.16,.32,.2,paint);B(0,.85,-.29,.28,.13,.27,paint);for(const x of [-.065,.065])B(x,.95,-.3,.04,.1,.04,wood);}else{for(const x of [-.36,.36])for(const z of [-.25,.25])B(x,.43,z,.12,.17,.18,dark);B(0,.7,-.2,.5,.15,.14,paint);}B(0,.68,-.1,.65,.025,.025,metal);for(let i=start;i<parts.length;i++)parts[i].role='ride';return;}
  if(s==='carousel'){for(let i=0;i<8;i++){B(0,.12,0,.9,.06,.38,paint);rot(0,i*Math.PI/4);role('ride');}B(0,.36,0,.055,.72,.055,metal);for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.sin(a)*.3,z=Math.cos(a)*.3;B(x,.4,z,.035,.54,.035,metal);role('ride');B(x*.5,.7,z*.5,.04,.035,.65,metal);rot(0,a);role('ride');}return;}
  if(s==='trampoline'){posts(.65);for(const x of [-.45,.45])B(x,.7,0,.08,.06,.95,metal);for(const z of [-.45,.45])B(0,.7,z,.95,.06,.08,metal);for(let i=0;i<5;i++)for(let j=0;j<5;j++){B(-.32+i*.16,.73,-.32+j*.16,.165,.018,.165,dark);role('mat');}for(const z of [-.36,-.18,0,.18,.36])for(const x of [-.4,.4])B(x,.73,z,.05,.02,.035,white);for(let i=0;i<3;i++)B(0,.12+i*.18,.66-i*.08,.5,.06,.08,metal);return;}
  if(s==='monkey'){posts(.92);for(const x of [-.4,.4])B(x,.94,0,.035,.035,.96,metal);for(let i=0;i<9;i++)B(0,.94,-.42+i*.105,.85,.025,.025,wood);for(let i=0;i<7;i++)B(0,.1+i*.12,-.43,.65,.025,.025,metal);return;}
  if(f.id==='play-climbing-wall'){B(0,.5,-.38,.94,1,.1,wood);for(let i=0;i<18;i++){B(-.36+(i%5)*.18,.09+Math.floor(i/5)*.24,-.29,.09,.045,.1,i%2?paint:white);}return;}
  posts();for(const y of [.25,.5,.75,1])for(const x of [-.44,0,.44])B(x,y,0,.03,.03,.94,paint);for(const z of [-.44,0,.44])for(const y of [.25,.5,.75,1])B(0,y,z,.94,.03,.03,metal);return;
 }
 if(['map','menu','guide','players'].includes(s)){for(const x of [-.38,.38])B(x,.47,0,.07,.94,.09,wood);B(0,.6,0,.98,.72,.1,dark);B(0,.6,.059,.92,.65,.025,'#88aaa0');role('notice');return;}
 if(['stage','deck','path','step','sand','pond'].includes(s)){B(0,.45,0,1,.9,1,s==='pond'?'#5aa6b5':s==='sand'?'#dfc69e':s==='path'?metal:wood);if(['stage','deck'].includes(s))for(let i=0;i<8;i++)B(0,.905,-.44+i*.125,.96,.012,.01,dark);return;}
 if(['fence','railing','wall','hurdle'].includes(s)){for(const x of [-.44,.44])B(x,.5,0,.065,1,.4,s==='railing'?metal:wood);for(const y of [.35,.85])B(0,y,0,.95,.065,.15,s==='wall'?metal:wood);if(s==='wall')B(0,.5,0,.95,.9,.85,metal);return;}
 if(['bench','seat','picnic'].includes(s)){for(const x of [-.4,.4])for(const z of [-.35,.35])B(x,.23,z,.06,.46,.065,metal);B(0,s==='picnic'?.8:.49,0,.95,.09,s==='picnic'?.46:.9,wood);if(s==='bench')B(0,.76,-.43,.95,.45,.07,paint);if(s==='picnic')for(const z of [-.4,.4])B(0,.45,z,.95,.06,.18,wood);return;}
 if(['pavilion','pergola','market','kiosk','arch','tunnel'].includes(s)){posts(.9);if(s==='tunnel'){for(const x of [-.43,.43])B(x,.4,0,.1,.8,.95,wood);B(0,.86,0,.95,.15,.95,wood);return;}if(s==='arch'){B(0,.93,0,1,.14,.75,paint);return;}if(s==='pergola')for(let i=0;i<6;i++)B(-.45+i*.18,.94,0,.065,.06,1,wood);else for(let i=0;i<7;i++)B(-.43+i*.145,.96,0,.15,.09,1,i%2?white:paint);if(['market','kiosk'].includes(s))B(0,.35,.32,.88,.05,.25,wood);return;}
 if(s==='fountain'){B(0,.07,0,1,.14,1,metal);for(const x of [-.44,.44])B(x,.14,0,.12,.23,.9,white);for(const z of [-.44,.44])B(0,.14,z,.9,.23,.12,white);B(0,.16,0,.8,.025,.8,'#58bfcc');B(0,.42,0,.12,.6,.12,white);B(0,.63,0,.42,.06,.42,white);B(0,.79,0,.07,.32,.07,'#58bfcc');return;}
 if(s==='lamp'||s==='lantern'||s==='clocktower'){B(0,.4,0,.13,.8,.13,metal);B(0,.88,0,.7,.16,.7,s==='clocktower'?white:'#ffe4a6');if(s!=='clocktower')parts[parts.length-1].glow=true;else{B(0,.88,.37,.52,.1,.01,dark);B(0,.89,.38,.02,.1,.01,dark);}B(0,.99,0,.85,.05,.85,paint);return;}
 if(s==='bridge'||s==='stairs'){for(let i=0;i<10;i++)B(0,s==='stairs'?.05+i*.09:.15+Math.sin(i/9*Math.PI)*.25,-.45+i*.1,.95,.08,.12,wood);for(const x of [-.45,.45])B(x,.65,0,.04,.055,.95,wood);return;}
 if(s==='planter'){for(const x of [-.45,.45])B(x,.5,0,.1,1,.95,wood);for(const z of [-.45,.45])B(0,.5,z,.95,1,.1,wood);B(0,.1,0,.9,.2,.9,'#685647');return;}
 if(s==='rack'){for(let i=0;i<5;i++)B(-.4+i*.2,.45,0,.025,.9,.8,metal);return;}
 if(s==='balance'){B(0,.45,0,.7,.5,.95,wood);return;}
 if(s==='rock'||s==='sculpture'){for(let i=0;i<4;i++)B(Math.sin(i)*.1,.12+i*.22,Math.cos(i)*.1,.9-i*.17,.25,.9-i*.15,s==='rock'?metal:i%2?wood:paint);return;}
 if(s==='flags'){for(const x of [-.44,.44])B(x,.5,0,.03,1,.03,wood);for(let i=0;i<8;i++)B(-.4+i*.11,.88,.02,.08,.09,.03,i%2?paint:white);return;}
 if(s==='podium'){for(let i=0;i<3;i++)B(-.33+i*.33,[.3,.5,.2][i],0,.31,[.6,1,.4][i],.9,i===1?paint:wood);return;}
 B(0,.45,0,.8,.9,.8,paint);B(0,.95,0,.9,.1,.9,dark);
}
