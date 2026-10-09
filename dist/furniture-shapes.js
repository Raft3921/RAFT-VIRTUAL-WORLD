// Block-native modern furniture. All components reuse the unit box, palette
// materials and existing per-house instance batches; no downloaded models.
const WOOD='#bd9166',DARK='#354353',METAL='#87929a',WHITE='#f4eee2',LEAF='#52a96d',GLASS='#8fbac9';
export function expandedParts(f,paint,box,motion,parts){
  const s=f.design;
  const B=(...args)=>box(...args),rotate=(x=0,y=0,z=0)=>Object.assign(parts[parts.length-1],{rx:x,ry:y,rz:z});
  const disk=(x,y,z,w,h,d,c=paint,n=7)=>{for(let i=0;i<n;i++){const a=(i+.5)/n*2-1;B(x,y,z+a*d/2,w*Math.sqrt(1-a*a),h,d/n,c);}};
  const face=(shape,x,y,z,w,h,d,c=paint,mirror=false)=>{for(let i=0;i<9;i++){const a=(i+.5)/9*2-1;let width=w;if(['round','oval'].includes(shape))width*=Math.sqrt(1-a*a);else if(shape==='hex')width*=1-Math.abs(a)*.4;else if(shape==='arch'&&a>0)width*=Math.sqrt(1-a*a);B(x,y+a*h/2,z,width,h/9,d,c);if(mirror&&i===4)Object.assign(parts[parts.length-1],{mirror:true,portalHeight:9,portalShape:['round','oval'].includes(shape)?1:shape==='hex'?2:shape==='arch'?3:0});}};
  const fourLegs=(top=.88,c=WOOD)=>{for(const x of [-.4,.4])for(const z of [-.37,.37])B(x,top/2,z,.07,top,.07,c);};
  const shelf=(rows=4,columns=1)=>{B(0,.5,-.46,1,1,.07,WOOD);for(const x of [-.46,.46])B(x,.5,0,.08,1,1,WOOD);for(let i=0;i<=rows;i++)B(0,i/rows,0,1,.035,1,WOOD);for(let i=1;i<columns;i++)B(-.5+i/columns,.5,0,.04,1,1,WOOD);};
  const screen=(x=0,y=.7,z=0,w=.9,h=.5)=>{B(x,y,z,w,h,.09,DARK);B(x,y,z+.055,w*.9,h*.82,.025,paint);parts[parts.length-1].role='screen';B(x-w*.2,y+h*.17,z+.071,w*.4,h*.045,.009,WHITE,true);parts[parts.length-1].role='screen';};
  const wheels=()=>{for(const x of [-.35,.35])for(const z of [-.32,.32])B(x,.06,z,.12,.12,.12,DARK);};
  const stand=()=>{B(0,.035,0,.65,.07,.6,METAL);B(0,.36,0,.05,.65,.05,METAL);};
  const flower=(x,y,z,size=.15)=>{B(x,y-.16,z,.025,.3,.025,LEAF);for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]])B(x+dx*size*.5,y+dy*size*.5,z,size*.55,size*.55,.065,paint);B(x,y,z+.04,size*.35,size*.35,.025,'#e4c84d',true);};
  switch(f.family){
    case 'chair':{
      const seat=f.seat/(f.h*.88),low=['floor','beanbag','pouf'].includes(s),wide=['corner','chaise','modular'].includes(s);
      if(['office','gaming','saddle','bar'].includes(s)){B(0,.05,0,.8,.08,.1,METAL);B(0,.05,0,.1,.08,.8,METAL);B(0,seat/2,0,.08,seat,.08,METAL);if(s==='office'||s==='gaming')wheels();}
      else if(!low){if(['corner','chaise'].includes(s)){for(const [x,z]of [[-.4,-.35],[.4,-.35],[.4,.38],[-.1,-.35]])B(x,(seat-.06)/2,z,.07,seat-.06,.07,WOOD);}else fourLegs(Math.max(.05,seat-.06),s==='folding'?METAL:WOOD);}
      if(['beanbag','pouf'].includes(s)){disk(0,.19,0,.94,.38,.94);disk(0,.42,-.1,.72,.1,.7);break;}
      if(s==='corner'||s==='chaise'){B(0,seat-.04,-.24,.95,.08,.44);B(.31,seat-.04,.19,.32,.08,.62);}else B(0,seat-.04,0,.95,.08,.92);
      if(!['bar','piano','saddle','ottoman','entry'].includes(s)){B(0,(seat+1)/2,-.43,.95,Math.max(.1,1-seat),.12);if(s==='cafe')for(const x of [-.28,0,.28])B(x,.78,-.4,.055,.34,.05,WOOD);}
      if(['office','gaming','lounge','recliner','corner','chaise','modular'].includes(s))for(const x of [-.44,.44])B(x,seat+.13,0,.08,.12,.82,METAL);
      if(s==='gaming'){B(0,.96,-.38,.46,.12,.15,DARK);B(0,.7,-.35,.7,.3,.06,WHITE,true);}
      if(s==='rocking')for(const x of [-.4,.4])for(let j=0;j<5;j++)B(x,.055+Math.abs(j-2)*.012,-.4+j*.2,.12,.065,.23,WOOD);
      if(s==='recliner')B(0,seat-.1,.43,.78,.12,.2);
      if(s==='entry')B(0,.16,0,.88,.055,.8,WOOD);
      if(s==='ottoman')B(0,seat/2,0,.94,seat,.9);
      if(wide)for(const x of [-.25,0,.25])B(x,seat+.016,.07,.015,.014,.74,WHITE,true);
      break;
    }
    case 'table':{
      const round=['round','oval','pedestal','drum','tray'].includes(s),top=s==='nest'?.92:.94;
      if(['pedestal','drum','laptop','tray'].includes(s)){disk(0,.06,0,.72,.12,.72,METAL);B(0,.46,0,s==='drum'?.65:.1,.8,s==='drum'?.65:.1,s==='drum'?paint:METAL);}
      else if(s==='c-side'){B(0,.05,0,.85,.1,.85,METAL);B(-.41,.48,0,.08,.86,.85,METAL);}
      else if(s==='standing'){for(const x of [-.38,.38]){B(x,.05,0,.12,.1,.95,METAL);B(x,.47,0,.1,.85,.12,METAL);}}
      else if(s==='corner'){for(const [x,z]of [[-.39,-.39],[.32,-.39],[-.39,.32]])B(x,.45,z,.07,.9,.07,WOOD);B(-.39,.72,-.035,.065,.055,.70,WOOD);B(-.035,.72,-.39,.70,.055,.065,WOOD);}
      else if(s==='l-shape'){for(const [x,z]of [[-.4,-.4],[.4,-.4],[-.4,.4],[-.14,.4]])B(x,.45,z,.07,.9,.07,WOOD);}else fourLegs(.9,s==='glass'||s==='folding'?METAL:WOOD);
      if(round)disk(0,top,0,1,.1,1);else if(s==='l-shape'){B(0,top,-.28,1,.1,.44);B(-.3,top,.2,.4,.1,.6);}else if(s==='corner'){B(0,top,0,1,.1,1);parts[parts.length-1].shape='triangle';}
      else{B(0,top,0,1,.1,1,s==='glass'?GLASS:paint);if(s==='drafting')rotate(-.18,0,0);}
      if(s==='nest'){B(.25,.69,.22,.5,.06,.55);for(const x of [.05,.45])B(x,.34,.25,.035,.66,.4,METAL);}
      if(['writing','vanity','workbench'].includes(s)){B(-.27,.57,0,.35,.58,.83,WOOD);for(const y of [.38,.58,.78])B(-.27,y,.43,.15,.02,.02,DARK,true);}
      if(s==='gaming'){B(0,.995,-.3,.65,.1,.32,DARK);B(-.4,1.0,.2,.09,.08,.18,DARK);}
      if(s==='kotatsu'){B(0,.6,0,.94,.65,.94,WHITE);B(0,.99,0,1,.05,1,WOOD);}
      if(s==='vanity'){B(0,.67,-.4,.5,.5,.09,WOOD);B(0,.67,-.34,.42,.42,.035,GLASS);parts[parts.length-1].mirror=true;}
      if(s==='picnic'){for(const x of [-.42,.42])B(x,.43,0,.12,.1,1,WOOD);B(0,.46,0,.85,.05,.09,WOOD);}
      if(s==='extend')B(0,1.002,0,.012,.006,.94,DARK,true);
      if(s==='tray')for(const x of [-.45,.45])B(x,1.02,0,.03,.1,.82);
      break;
    }
    case 'modern-storage':{
      if(['coat','umbrella'].includes(s)){B(0,.08,0,.75,.16,.75);if(s==='coat'){B(0,.48,0,.06,.9,.06,WOOD);for(const y of [.6,.84]){B(0,y,0,.9,.04,.05,WOOD);B(0,y,0,.05,.04,.9,WOOD);}}else{B(0,.32,0,.85,.5,.85);for(const x of [-.2,.17]){B(x,.72,0,.03,.5,.03,METAL);B(x+.055,.95,0,.15,.07,.08,DARK);}}break;}
      if(s==='pedestal'){B(0,.5,0,.9,1,.9,WHITE);B(0,.97,0,1,.06,1,paint);break;}
      if(['basket','suitcase','trunk'].includes(s)){B(0,.44,0,.95,.82,.85);for(const y of [.2,.5,.75])B(0,y,.44,.86,.025,.025,WOOD,true);if(s==='suitcase'){wheels();B(0,.93,0,.4,.04,.08,DARK);for(const x of [-.16,.16])B(x,.82,0,.025,.2,.03,METAL);}if(s==='trunk')for(const x of [-.25,.25])B(x,.48,.45,.06,.8,.025,METAL,true);break;}
      if(s==='step'){for(let i=0;i<4;i++){const h=(i+1)/4;B(-.375+i*.25,h/2,0,.23,h,.9);B(-.375+i*.25,h*.62,.46,.17,h*.5,.025,DARK,true);}break;}
      if(s==='magazine'){B(0,.06,0,.9,.12,.8,WOOD);for(const z of [-.35,.35])B(0,.32,z,.9,.5,.08,WOOD);for(let i=0;i<4;i++)B(-.3+i*.2,.63,0,.12,.6,.65,i%2?paint:WHITE);break;}
      if(s==='cart'){wheels();for(const x of [-.43,.43])for(const z of [-.4,.4])B(x,.5,z,.04,.9,.04,METAL);for(const y of [.17,.52,.9])B(0,y,0,.95,.055,.94,paint);break;}
      shelf(s==='ladder'?5:4,s==='cube'?3:1);
      if(['cube','ladder','corner'].includes(s)){for(let j=0;j<5;j++)B(-.32+j*.15,.15+j%3*.25,0,.1,.17,.65,j%2?paint:WHITE);}
      else if(s==='open'){B(0,.85,0,.85,.025,.04,METAL);for(const x of [-.27,0,.27]){B(x,.6,0,.17,.4,.18,paint);B(x,.82,0,.03,.11,.02,METAL);}}
      else{for(const x of [-.23,.23]){B(x,.5,.46,.45,.92,.065,s==='vitrine'?GLASS:paint);B(x+(x<0?.15:-.15),.5,.51,.025,.07,.025,DARK,true);}if(['filing','tool','shoe'].includes(s))for(let j=0;j<5;j++)B(0,.13+j*.17,.51,.84,.015,.015,METAL,true);}
      break;
    }
    case 'bed':{
      const surface=f.bedHeight/(f.h*.88),bed=(y,h,w=.98,d=.98,c=WOOD)=>B(0,y,0,w,h,d,c);
      fourLegs(Math.max(.05,surface-.13));if(s==='round'){disk(0,surface-.15,0,1,.12,1,WOOD);disk(0,surface-.055,0,.94,.11,.94,WHITE);disk(0,surface+.013,0,.89,.023,.89,paint);}else{bed(surface-.15,.12);bed(surface-.055,.11,.93,.92,WHITE);B(0,surface+.013,.12,.93,.023,.63,paint);}B(0,surface+.055,-.32,.58,.09,.2,WHITE);
      if(!['futon','cot','hammock','round'].includes(s))B(0,surface+.1,-.46,1,.32,.07,WOOD);
      if(['loft','bunk','fourposter','crib'].includes(s)){for(const x of [-.46,.46])for(const z of [-.46,.46])B(x,.5,z,.045,1,.045,WOOD);if(s==='fourposter')B(0,.98,0,1,.04,1,paint);if(s==='crib')for(let j=0;j<7;j++)for(const x of [-.46,.46])B(x,.55,-.4+j*.133,.025,.55,.025,WOOD);}
      if(s==='loft'){B(0,.4,-.1,.83,.035,.75,WOOD);B(-.45,.35,.43,.06,.65,.1,WOOD);for(let j=0;j<6;j++)B(-.34,.12+j*.12,.45,.2,.025,.035,WOOD);}
      if(s==='bunk'){bed(.18,.08,.92,.92,WHITE);for(let j=0;j<6;j++)B(.4,.1+j*.12,.45,.18,.025,.035,METAL);}
      if(s==='storage')for(const x of [-.25,.25]){B(x,surface-.19,.505,.43,.15,.018,paint);B(x,surface-.19,.52,.1,.015,.018,DARK,true);}
      if(s==='hospital')for(const x of [-.43,.43])B(x,surface+.17,0,.03,.05,.75,METAL);
      if(s==='hammock')for(const z of [-.45,.45]){B(0,.35,z,.06,.65,.08,METAL);B(0,.04,z,.9,.08,.1,METAL);}
      if(s==='day')B(-.46,surface+.1,0,.07,.3,1,paint);
      break;
    }
    case 'electronics':{
      if(s.startsWith('tv-')||['crt','portable','screen'].includes(s)){if(s!=='tv-wall'&&s!=='screen'){B(0,.07,0,.6,.14,.85,DARK);B(0,.24,0,.12,.25,.12,DARK);}if(s==='crt')B(0,.63,-.15,1,.72,.72,WHITE);screen(0,s==='tv-wall'||s==='screen'?.5:.65,0,s==='screen'?1:.96,s==='screen'?.9:.65);if(s==='portable')B(.25,.91,0,.03,.15,.03,METAL);break;}
      if(['laptop','tablet'].includes(s)){B(0,.045,.06,1,.09,.9,METAL);screen(0,.6,-.35,.94,.7);for(let j=0;j<4;j++)B(0,.095,.01+j*.11,.78,.008,.045,DARK,true);break;}
      if(s==='arcade'){B(0,.35,0,1,.7,.94);screen(0,.76,-.2,.8,.4);B(0,.54,.3,.9,.08,.45,DARK);B(-.22,.61,.3,.04,.12,.04,METAL);B(.21,.58,.3,.09,.035,.09,WHITE);B(0,.98,-.12,1,.08,.8,paint);break;}
      if(s==='camera'){for(const x of [-.32,.32])B(x,.33,0,.045,.66,.055,METAL);B(0,.35,-.32,.05,.68,.06,METAL);B(0,.72,0,.05,.2,.05,METAL);B(0,.88,0,.55,.24,.48,DARK);B(.08,.88,.32,.23,.16,.19,METAL);break;}
      if(s==='fan'){stand();face('round',0,.75,0,.95,.48,.08,METAL);B(0,.75,.09,.1,.09,.08,paint);B(0,.75,.15,.65,.05,.035,WHITE);motion('propeller',{rate:7,pivot:[0,.75*f.h*.88,.15*f.d*.88]});B(0,.75,.15,.04,.32,.035,WHITE);motion('propeller',{rate:7,pivot:[0,.75*f.h*.88,.15*f.d*.88]});break;}
      if(s==='robot'){disk(0,.45,0,1,.85,1,DARK);disk(0,.88,0,.45,.09,.45,paint);break;}
      if(s==='vacuum'){B(0,.07,0,.9,.14,.85,DARK);B(0,.52,-.1,.08,.9,.1,METAL);B(0,.68,-.05,.38,.3,.4,paint);break;}
      if(s==='vr'){B(0,.05,0,.7,.1,.7,METAL);B(0,.3,0,.06,.45,.06,METAL);B(0,.68,0,.85,.37,.4,WHITE);B(0,.68,.23,.65,.25,.05,DARK);break;}
      if(s==='speakers'){for(const x of [-.29,.29]){B(x,.5,0,.39,1,.8,DARK);face('round',x,.37,.43,.26,.28,.04,METAL);face('round',x,.76,.43,.12,.12,.04,paint);}break;}
      if(s==='console'){B(-.18,.3,0,.55,.6,.8,WHITE);B(.25,.13,.2,.38,.2,.35,DARK);for(const x of [.17,.32])B(x,.245,.22,.05,.025,.07,paint);break;}
      B(0,.45,0,.95,.9,.9,['pc','server','speaker','radio'].includes(s)?DARK:WHITE);
      if(s==='projector'){B(.2,.47,.51,.3,.3,.08,GLASS);B(-.2,.7,.47,.24,.04,.035,DARK,true);}
      else if(s==='printer'){B(0,.84,-.14,.75,.15,.65,METAL);B(0,.35,.51,.7,.07,.04,DARK);B(0,.37,.64,.6,.025,.25,WHITE);}
      else if(s==='scanner'){B(0,.97,0,.94,.055,.95,METAL);B(0,.5,.49,.4,.1,.04,DARK);}
      else if(s==='humidifier'){B(0,.93,0,.2,.08,.18,DARK);B(0,.5,.49,.25,.32,.025,GLASS);}
      else if(s==='radio'){B(-.42,.95,0,.025,.1,.03,METAL);face('round',-.18,.46,.5,.45,.55,.04,METAL);B(.27,.67,.51,.22,.1,.025,paint);}
      else{for(let j=0;j<(s==='server'?8:5);j++)B(0,.13+j*(s==='server'?.1:.16),.47,.75,.04,.025,METAL,true);B(.3,.84,.5,.045,.03,.02,paint,true);}
      break;
    }
    case 'appliance':{
      if(['kettle','blender','mixer','coffee'].includes(s)){B(0,.055,0,.95,.11,.9,DARK);if(s==='kettle'){disk(0,.43,0,.63,.65,.7,WHITE);B(.34,.58,0,.16,.12,.12,paint);B(-.34,.54,0,.08,.45,.08,DARK);}else if(s==='blender'){B(0,.2,0,.8,.3,.8,paint);B(0,.59,0,.65,.5,.65,GLASS);B(0,.89,0,.8,.06,.8,DARK);}else if(s==='mixer'){B(-.31,.48,-.12,.2,.8,.6);B(0,.86,0,.8,.18,.45);disk(.12,.27,0,.65,.38,.65,METAL);}else{B(0,.62,-.22,.92,.74,.5);B(0,.44,.15,.65,.09,.5,METAL);B(-.21,.51,.28,.06,.15,.06,METAL);B(.16,.19,.27,.27,.27,.27,WHITE);}break;}
      if(s==='fruit'){disk(0,.14,0,1,.28,1,WOOD);for(const [x,z]of [[-.2,0],[.1,-.2],[.17,.15]]){B(x,.43,z,.3,.35,.3,paint);B(x,.65,z,.025,.09,.025,LEAF);}break;}
      if(s==='dishes'){B(0,.07,0,1,.14,1,METAL);for(let j=0;j<5;j++)B(-.36+j*.18,.48,0,.035,.65,.8,WHITE);break;}
      if(s==='pots'){B(0,.8,-.2,1,.055,.12,METAL);for(const x of [-.28,0,.28]){B(x,.64,0,.025,.3,.06,METAL);face('round',x,.3,.08,.27,.5,.1,DARK);}break;}
      if(s==='hood'){B(0,.78,0,.3,.44,.4,METAL);B(0,.25,0,1,.5,1,METAL);for(let j=0;j<4;j++)B(0,.005,-.3+j*.2,.85,.025,.07,DARK);break;}
      if(s==='recycle'){for(const x of [-.26,.26]){B(x,.44,0,.44,.88,.9,WHITE);B(x,.92,0,.48,.09,1,x<0?paint:DARK);}break;}
      B(0,.47,0,.95,.94,.94,WHITE);B(0,.96,0,1,.075,1,METAL);
      if(['washer','dryer'].includes(s)){face('round',0,.47,.51,.66,.66,.065,DARK);face('round',0,.47,.552,.48,.48,.025,GLASS);B(.29,.82,.52,.15,.07,.035,paint);}
      else if(s==='water'){B(0,.25,.5,.65,.24,.025,DARK);B(0,.54,.54,.045,.07,.08,paint);B(0,.79,0,.62,.38,.65,GLASS);}
      else if(['microwave','wine','dishwasher','mini-fridge'].includes(s)){B(0,.48,.49,.85,.68,.045,s==='mini-fridge'?paint:DARK);B(.34,.52,.54,.035,.25,.04,METAL);if(s==='wine')for(let j=0;j<4;j++)B(0,.21+j*.17,.522,.65,.035,.025,WOOD);}
      else if(s==='toaster'){for(const x of [-.2,.2])B(x,1.005,0,.14,.012,.68,DARK);B(.39,.5,.28,.05,.06,.08,paint);}
      else if(s==='rice'){B(0,.975,0,.35,.025,.1,DARK);B(0,.45,.51,.45,.13,.025,paint);}
      else if(s==='scale'){disk(0,.8,0,.8,.25,.8,METAL);B(0,.31,.51,.45,.16,.025,DARK);}
      else{B(0,.09,.5,.3,.06,.1,DARK);B(0,.995,0,.35,.04,.08,DARK);}
      break;
    }
    case 'botanical':{
      const hanging=f.mount==='ceiling',potY=hanging?.56:.12;
      disk(0,potY,0,.52,.24,.52,paint,5);disk(0,potY+.126,0,.46,.012,.46,WOOD,5);
      if(hanging){B(0,.86,0,.025,.28,.025,METAL);for(const x of [-.22,0,.22]){B(x,.28,0,.12,.36,.16,LEAF);motion('sway',{phase:x*4});}break;}
      if(['ball','rosette','moss','terrarium','tray'].includes(s)){for(let j=0;j<5;j++){const a=j*Math.PI*.4;B(Math.sin(a)*.2,.35+j%2*.06,Math.cos(a)*.2,.24,.2,.24,LEAF);}if(s==='terrarium')for(const x of [-.35,.35])B(x,.45,0,.03,.65,.7,GLASS);if(s==='tray')B(0,.08,0,1,.16,.9,WOOD);break;}
      if(['snake','bamboo','cactus'].includes(s)){for(const x of [-.2,0,.2]){B(x,.57+x*.35,0,s==='cactus'?.17:.08,.68-Math.abs(x),.14,LEAF);if(s==='bamboo')for(let j=0;j<3;j++)B(x,.35+j*.18,.085,.1,.018,.025,WOOD,true);}if(s==='cactus')B(.21,.65,0,.26,.14,.14,LEAF);break;}
      if(['orchid','tulip','sunflower','rose','daisy','bouquet','dried'].includes(s)){const n=s==='sunflower'?1:5;for(let j=0;j<n;j++){const a=j*2.4;flower(Math.sin(a)*.23,.6+(j%3)*.13,Math.cos(a)*.14,s==='sunflower'?.37:.16);}B(-.2,.42,0,.28,.07,.15,LEAF);break;}
      B(0,.55,0,.065,.68,.065,WOOD);
      const leaves=s==='fern'?8:s==='palm'?6:5;
      for(let j=0;j<leaves;j++){const a=j*2.4,x=Math.sin(a)*.24,z=Math.cos(a)*.24,y=s==='palm'?.85:.48+(j%3)*.18;B(x,y,z,s==='bamboo'?.12:.42,s==='palm'?.06:.15,s==='palm'?.55:.32,s==='maple'?paint:LEAF);motion('sway',{phase:j});}
      if(s==='pine')for(let j=0;j<3;j++)B(0,.65+j*.13,0,.7-j*.18,.12,.7-j*.18,LEAF);
      break;
    }
    case 'soft':{
      if(s.endsWith('cushion')||['bolster','blanket'].includes(s)){if(s==='round-cushion')disk(0,.42,0,1,.84,1);else{B(0,.35,0,.96,.7,.96);B(0,.75,0,.82,.12,.82);if(s==='blanket')for(let j=0;j<4;j++)B(0,.1+j*.22,.495,.9,.06,.015,WHITE,true);}break;}
      if(['round','oval'].includes(s))disk(0,.5,0,1,1,1);
      else if(['crescent','cloud','heart','star','flower','hex','octagon'].includes(s)){
        const mask=(x,z)=>{
          if(s==='crescent')return Math.hypot(x,z)<.49&&Math.hypot(x-.22,z)>.40;
          if(s==='cloud')return Math.hypot(x+.27,z+.04)<.23||Math.hypot(x,z-.02)<.35||Math.hypot(x-.28,z+.04)<.22;
          if(s==='heart'){const u=x*1.9,v=-z*1.9+.12;return (u*u+v*v-.72)**3-u*u*v*v*v<0;}
          if(s==='hex')return Math.abs(z)<.43&&Math.abs(x)+Math.abs(z)*.58<.49;
          if(s==='octagon')return Math.abs(x)+Math.abs(z)<.70;
          if(s==='flower'){if(Math.hypot(x,z)<.20)return true;for(let j=0;j<5;j++){const a=j*Math.PI*.4; if(Math.hypot(x-Math.sin(a)*.27,z-Math.cos(a)*.27)<.21)return true;}return false;}
          const angle=(Math.atan2(z,x)+Math.PI*2.5)%(Math.PI*2),sector=angle/(Math.PI/5),t=sector%1,r=Math.floor(sector)%2?.22+t*.27:.49-t*.27;return Math.hypot(x,z)<r;
        };
        for(let row=0;row<11;row++){let start=-1;for(let col=0;col<=11;col++){const filled=col<11&&mask((col+.5)/11-.5,(row+.5)/11-.5);if(filled&&start<0)start=col;if(!filled&&start>=0){B((start+col)/22-.5,.5,(row+.5)/11-.5,(col-start)/11,1,1/11);start=-1;}}}
      }
      else B(0,.5,0,1,1,1);
      if(['stripe','woven','fluffy','diamond'].includes(s))for(let j=0;j<7;j++)B(0,1.07,-.4+j*.133,s==='diamond'?1-Math.abs(j-3)*.22:.94,.025,s==='fluffy'?.08:.03,WHITE,true);
      if(s==='checker'||s==='puzzle')for(let x=0;x<4;x++)for(let z=0;z<4;z++)if((x+z)%2===0)B(-.375+x*.25,1.07,-.375+z*.25,.23,.025,.23,WHITE,true);
      break;
    }
    case 'toy':{
      if(['dome','a-frame','teepee','canopy'].includes(s)){B(0,.018,0,1,.036,1,DARK);if(s==='canopy'){for(const x of [-.45,.45])for(const z of [-.45,.45])B(x,.43,z,.04,.84,.04,METAL);for(let j=0;j<4;j++)B(0,.87+j*.035,0,1-j*.2,.07,1-j*.2,paint);}else for(let j=0;j<7;j++){const w=.96-j*.12,y=.08+j*.135;if(s==='a-frame'){for(const x of [-w/2,w/2])B(x,y,0,.12,.14,1);B(0,y,-.45,w,.14,.08);}else{for(const x of [-w/2,w/2])B(x,y,0,.1,.14,w);B(0,y,-w/2,w,.14,.1);if(j>3)B(0,y,w/2,w,.14,.1);}}break;}
      if(['bear','rabbit','cat','dog','penguin','dinosaur','robot'].includes(s)){B(0,.38,0,.58,.48,.6);B(0,.76,0,.62,.32,.61);for(const x of [-.2,.2]){B(x,.1,.19,.23,.2,.38);B(x*.6,.78,.32,.055,.055,.02,DARK,true);}B(0,.69,.36,.15,.08,.12,WHITE);B(-.37,.42,0,.16,.26,.21);B(.37,.42,0,.16,.26,.21);if(s==='rabbit')for(const x of [-.18,.18])B(x,1.01,0,.12,.3,.13);else if(s==='bear'||s==='cat'||s==='dog')for(const x of [-.24,.24])B(x,.98,0,s==='dog'?.19:.15,s==='dog'?.3:.16,.15);if(s==='penguin')B(0,.39,.31,.42,.43,.035,WHITE);if(s==='dinosaur'){B(0,.28,-.38,.16,.15,.45);for(let j=0;j<3;j++)B(0,.54+j*.1,-.32,.09,.1,.06,WHITE);}if(s==='robot')B(0,1.0,0,.025,.16,.025,METAL);break;}
      if(s==='globe'){stand();face('round',0,.68,0,.8,.62,.6,GLASS);B(0,.7,.325,.62,.09,.025,LEAF);break;}
      if(s==='basketball'){B(0,.04,0,.8,.08,1,DARK);B(0,.45,-.3,.06,.9,.08,METAL);B(0,.85,-.26,1,.27,.05,WHITE);B(0,.78,.05,.43,.02,.03,paint);for(const x of [-.22,.22])B(x,.78,-.02,.025,.02,.18,paint);break;}
      if(s==='dollhouse'){B(0,.05,0,1,.1,1,WOOD);shelf(2,2);B(0,.97,0,1,.08,1,paint);for(const x of [-.27,.27])B(x,.51,.52,.18,.16,.025,GLASS);break;}
      if(s==='horse'){for(const x of [-.36,.36])B(x,.05,0,.1,.08,1,WOOD);B(0,.42,0,.4,.45,.55,WOOD);B(0,.72,-.28,.22,.47,.28,WOOD);B(0,.92,-.13,.25,.18,.4,WOOD);for(const x of [-.16,.16])for(const z of [-.17,.17])B(x,.2,z,.05,.33,.06,WOOD);break;}
      if(s==='board'||s==='chess'){B(0,.08,0,1,.16,1,WOOD);for(let x=0;x<4;x++)for(let z=0;z<4;z++)if((x+z)%2===0)B(-.375+x*.25,.164,-.375+z*.25,.24,.012,.24,WHITE,true);if(s==='chess')for(const x of [-.37,-.12,.12,.37])for(const z of [-.36,.36])B(x,.46,z,.12,.56,.12,z<0?DARK:paint);break;}
      if(s==='blocks'){for(let j=0;j<7;j++)B((j%3-1)*.27,.16+Math.floor(j/3)*.3,(j%2-.5)*.25,.26,.29,.3,j%2?paint:WHITE);break;}
      B(0,.4,0,.9,.5,.8,paint);for(const x of [-.37,.37])for(const z of [-.29,.29])B(x,.15,z,.17,.3,.19,DARK);B(0,.78,-.17,.55,.25,.5,WHITE);if(s==='train'){B(0,.72,.28,.3,.15,.3,DARK);B(0,.94,-.22,.75,.06,.65,paint);}break;
    }
    case 'hobby':{
      if(['acoustic','electric','bass','ukulele','violin'].includes(s)){B(0,.07,0,.8,.14,.85,METAL);B(0,.21,-.22,.04,.32,.04,METAL);disk(0,.35,0,.78,.26,.5,s==='acoustic'||s==='ukulele'?WOOD:paint);B(0,.48,0,.46,.26,.26);B(0,.73,0,.13,.45,.13,WOOD);B(0,.97,0,.24,.1,.16,paint);for(const x of [-.035,0,.035])B(x,.66,.145,.008,.55,.014,WHITE,true);if(s==='acoustic'||s==='ukulele')B(0,.38,.27,.14,.12,.035,DARK);break;}
      if(['drums','e-drums','snare'].includes(s)){for(const [x,z,y,w]of s==='snare'?[[0,0,.65,.9]]:[[-.29,-.1,.65,.34],[.22,-.1,.7,.32],[0,.28,.35,.5]]){B(x,y-.17,z,w,.3,w,paint);disk(x,y, z,w,.035,w,WHITE,5);B(x,y/2-.08,z,.025,y-.17,.025,METAL);}if(s!=='snare')for(const x of [-.42,.42]){B(x,.47,-.28,.02,.88,.025,METAL);disk(x,.9,-.28,.31,.035,.31,'#d3ac58',5);}break;}
      if(s==='harp'){B(0,.04,0,.95,.08,.8,WOOD);B(-.4,.5,0,.11,1,.13,WOOD);B(.35,.5,0,.07,1,.1,WOOD);B(0,.93,0,.85,.12,.18,WOOD);for(let j=0;j<7;j++)B(-.28+j*.085,.52,0,.008,.82,.012,WHITE);break;}
      if(s==='keyboard'){fourLegs(.7,METAL);B(0,.81,0,1,.16,1,DARK);for(let j=0;j<12;j++){B(-.45+j*.082,.9,.12,.07,.025,.5,WHITE,true);motion('key',{key:j,keySpan:12});}break;}
      if(s==='easel'){for(const x of [-.36,.36])B(x,.5,-.1,.055,1,.065,WOOD);B(0,.35,-.35,.05,.7,.06,WOOD);B(0,.6,0,.85,.64,.055,WOOD);B(0,.6,.04,.78,.56,.025,WHITE);B(-.12,.63,.057,.22,.12,.01,paint,true);B(0,.29,.045,1,.035,.14,WOOD);break;}
      if(s==='canvas'){B(0,.5,0,1,1,.55,WOOD);B(0,.5,.32,.94,.94,.03,WHITE);for(let j=0;j<4;j++)B(-.3+j*.2,.3+j%2*.3,.345,.14,.2,.012,paint,true);break;}
      if(s==='bike'){B(0,.07,0,.8,.14,.95,METAL);B(0,.37,0,.35,.5,.5,DARK);B(0,.74,-.26,.05,.7,.07,METAL);B(0,.95,-.26,.65,.05,.06,DARK);B(0,.61,.18,.06,.4,.07,METAL);B(0,.8,.18,.4,.08,.24,paint);break;}
      if(s==='treadmill'){B(0,.06,0,1,.12,1,DARK);B(0,.135,.12,.8,.025,.68,paint);for(const x of [-.4,.4])B(x,.5,-.37,.055,.9,.07,METAL);B(0,.95,-.35,.95,.07,.23,DARK);screen(0,.96,-.31,.42,.07);break;}
      if(s==='yoga'){B(0,.4,0,1,.8,1,paint);for(let j=0;j<6;j++)B(0,.82,-.38+j*.15,.85,.015,.025,WHITE,true);break;}
      if(s==='sewing'){B(0,.055,0,1,.11,1,WHITE);B(-.3,.48,-.18,.25,.86,.4,paint);B(0,.86,-.18,.85,.18,.4);B(.23,.5,-.18,.05,.55,.04,METAL);break;}
      if(s==='vinyl'){shelf(1,3);for(let j=0;j<6;j++)B(-.4+j*.16,.52,0,.065,.75,.8,j%2?paint:DARK);break;}
      B(0,.14,0,.95,.28,.94,WOOD);if(s==='palette')for(let j=0;j<5;j++)B(-.3+j*.15,.32,0,.08,.07,.08,j%2?paint:WHITE);else for(let j=0;j<5;j++)B(-.3+j*.15,.54,(j%2-.5)*.2,.07,.78,.07,j%2?paint:METAL);break;
    }
    case 'fixture':{
      if(f.mount==='ceiling'){if(['square','flush-ring'].includes(s)){if(s==='square'){B(0,.5,0,1,1,1,METAL);B(0,.02,0,.88,.06,.88,WHITE);}else for(const [x,z,w,d]of [[0,-.4,1,.18],[0,.4,1,.18],[-.4,0,.18,.7],[.4,0,.18,.7]])B(x,.4,z,w,.8,d,WHITE);break;}
        B(0,.76,0,s==='track'?.94:.04,.48,.04,METAL);
        if(s==='track'||s==='cluster'){for(const x of [-.34,0,.34]){B(x,.5,0,.025,.5,.025,METAL);B(x,.15,0,.25,.22,.7,s==='cluster'?paint:METAL);B(x,.03,0,.2,.025,.6,WHITE);}break;}
        if(['paper','globe','glass'].includes(s)){for(let j=0;j<5;j++){const a=(j+.5)/5*2-1;B(0,.28+a*.23,0,.86*Math.sqrt(1-a*a),.095,.86*Math.sqrt(1-a*a),s==='glass'?GLASS:paint);}B(0,.08,0,.56,.03,.56,WHITE);}
        else{for(let j=0;j<4;j++)B(0,.1+j*.11,0,.95-j*.18,.12,.95-j*.18,paint);B(0,.024,0,.85,.03,.85,WHITE);}break;}
      if(f.mount==='wall'){if(s==='string'){B(0,.73,0,1,.025,.1,METAL);for(let j=0;j<6;j++){const x=-.43+j*.17,y=.35+Math.abs(x)*.5;B(x,y,0,.05,.27,.05,METAL);B(x,y-.15,.05,.1,.13,.13,WHITE);}}else if(s==='neon'){for(let j=0;j<5;j++){B(-.35+j*.175,.5,.15,.045,.55,.4,WHITE);B(-.31+j*.175,.72,.15,.11,.04,.4,WHITE);}}else{B(0,.5,0,.65,.85,.75,paint);B(0,s==='candle'?.8:.95,.16,.38,.1,.35,WHITE);if(s==='updown')B(0,.05,.16,.38,.1,.35,WHITE);}break;}
      if(['panel','ring','tripod'].includes(s))fourLegs(.69,METAL);else stand();
      if(s==='tube'){B(0,.5,0,.12,.9,.12,WHITE);break;}
      if(s==='anglepoise'||s==='task'){B(-.22,.47,0,.045,.6,.05,METAL);B(0,.79,0,.65,.05,.08,METAL);B(.25,.72,0,.44,.12,.65,paint);B(.25,.655,0,.34,.02,.55,WHITE);}
      else if(s==='arc'){B(-.4,.5,0,.045,.96,.06,METAL);B(0,.94,0,.84,.035,.07,METAL);B(.32,.81,0,.38,.23,.8,paint);B(.32,.686,0,.3,.02,.68,WHITE);}
      else if(s==='ring'){for(const [x,y,w,h]of [[0,.92,.65,.055],[0,.65,.65,.055],[-.31,.79,.055,.3],[.31,.79,.055,.3]])B(x,y,0,w,h,.08,WHITE);}
      else if(s==='panel'){B(0,.8,0,.86,.36,.08,DARK);B(0,.8,.052,.8,.3,.025,WHITE);}
      else if(s==='lantern'){B(0,.48,0,.6,.7,.6,WHITE);for(const x of [-.33,.33])B(x,.48,0,.04,.75,.65,METAL);B(0,.94,0,.6,.12,.65,paint);}
      else{B(0,.82,0,.88,.36,.88,paint);B(0,.63,0,.75,.025,.75,WHITE);}break;
    }
    case 'wall-decor':case 'wall-mirror':{
      if(f.mirror){face(s==='split'?'square':s,0,.5,0,1,1,.6,paint);face(s==='split'?'square':s,0,.5,.35,.85,.86,.05,GLASS,true);if(s==='split'){B(0,.5,.39,.035,.9,.025,WOOD);B(0,.5,.39,.86,.035,.025,WOOD);}break;}
      if(['venetian','roman','sheer','blackout','bamboo','tieback','roller'].includes(s)){B(0,.97,0,1,.06,.7,METAL);if(['sheer','blackout','tieback'].includes(s)){for(const x of [-.34,.34])for(let j=0;j<3;j++){B(x-.09+j*.09,.47,.07,.085,.91,.6,s==='sheer'?WHITE:paint);motion('sway',{phase:j});}if(s==='tieback')for(const x of [-.34,.34])B(x,.4,.41,.32,.045,.02,WOOD,true);}else if(s==='roller'){B(0,.6,.06,.95,.71,.15,paint);B(0,.26,.1,.96,.03,.2,METAL);}else for(let j=0;j<(s==='bamboo'?12:8);j++)B(0,.08+j*(s==='bamboo'?.075:.115),.08,.95,s==='roman'?.1:.05,.25,s==='bamboo'?WOOD:paint);break;}
      B(0,.5,0,1,1,.48,WOOD);B(0,.5,.275,.95,.95,.045,s==='space'?DARK:WHITE);
      if(s==='city')for(let j=0;j<6;j++){const h=.15+(j%3)*.17;B(-.37+j*.15,.2+h/2,.31,.12,h,.015,paint,true);}
      else if(s==='botanical'){B(0,.5,.315,.018,.67,.012,LEAF,true);for(let j=0;j<5;j++)B((j%2?.12:-.12),.25+j*.12,.325,.18,.07,.015,LEAF,true);}
      else if(s==='music')for(const x of [-.25,.17]){B(x,.52,.31,.035,.48,.015,DARK,true);B(x-.07,.29,.315,.17,.1,.012,paint,true);}
      else if(s==='space'){face('round',-.1,.6,.315,.5,.42,.012,paint);for(const [x,y]of [[.3,.8],[-.31,.3],[.24,.2]])B(x,y,.325,.045,.045,.012,WHITE,true);}
      else if(s==='pixel')for(let j=0;j<12;j++)B((j%4-1.5)*.18,.25+Math.floor(j/4)*.18,.31,.15,.15,.015,j%3?paint:DARK,true);
      else if(s==='map')for(let j=0;j<6;j++)B(-.38+j*.15,.48+(j%3-1)*.16,.31,.22,.25,.015,LEAF,true);
      else if(s==='geometric'){for(let j=0;j<4;j++){B(-.25+j*.16,.3+j*.14,.31,.22,.22,.012,paint,true);rotate(0,0,Math.PI/4);}}
      else{B(-.18,.43,.31,.27,.58,.015,paint,true);B(.18,.57,.325,.35,.19,.015,DARK,true);disk(0,.78,.34,.25,.06,.05,paint,3);}break;
    }
  }
}
