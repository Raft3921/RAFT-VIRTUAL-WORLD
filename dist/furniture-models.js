import {FURNITURE_BY_ID,FURNITURE_COLORS} from './housing-data.js';
const WOOD='#bd9166',DARK='#354353',METAL='#87929a',WHITE='#f4eee2',LEAF='#52a96d';
export function furnitureParts(item){
  const f=FURNITURE_BY_ID.get(item.t),paint=FURNITURE_COLORS[item.c],parts=[];
  const box=(x,y,z,w,h,d,c=paint,detail=false)=>{w=Math.min(1,w);h=Math.min(1,h);d=Math.min(1,d);x=Math.max(-.5+w/2,Math.min(.5-w/2,x));y=Math.max(h/2,Math.min(1-h/2,y));z=Math.max(-.5+d/2,Math.min(.5-d/2,z));parts.push({x:x*f.w,y:y*f.h,z:z*f.d,w:w*f.w,h:h*f.h,d:d*f.d,c,detail});};
  const legs=(height=.7)=>{for(const x of [-.39,.39])for(const z of [-.36,.36])box(x,height/2,z,.075,height,.085,WOOD);};
  switch(f.family){
    case 'chair':legs(.43);box(0,.46,0,1,.11,1);box(0,.75,-.43,1,.5,.14);box(0,.77,-.35,.7,.17,.04,WOOD,true);break;
    case 'sofa':legs(.13);box(0,.29,0,1,.4,1,DARK);box(0,.47,.06,.79,.16,.8);box(0,.79,-.43,1,.42,.14);for(const x of [-.45,.45])box(x,.56,0,.1,.35,1);box(0,.56,.16,.035,.01,.55,WHITE,true);break;
    case 'stool':legs(.85);box(0,.92,0,1,.16,1);break;
    case 'bench':legs(.8);box(0,.9,0,1,.2,1);for(const z of [-.3,0,.3])box(0,1.001,z,1,.002,.025,DARK,true);break;
    case 'table':legs(.88);box(0,.94,0,1,.12,1);break;
    case 'desk':legs(.88);box(0,.94,0,1,.12,1);box(-.26,.61,0,.38,.55,.8,WOOD);for(const y of [.45,.65,.83])box(-.26,y,.41,.16,.02,.02,DARK,true);break;
    case 'bed':case 'canopy':{
      const ratio=f.family==='canopy'?.34:1;const bedBox=(x,y,z,w,h,d,c)=>box(x,y*ratio,z,w,h*ratio,d,c);
      legs(.12);bedBox(0,.28,0,1,.25,1,WOOD);bedBox(0,.48,0,.94,.2,.91,WHITE);bedBox(0,.6,.18,.95,.05,.6,paint);bedBox(0,.61,-.27,.68,.09,.24,WHITE);bedBox(0,.7,-.46,1,.6,.08,WOOD);
      if(f.family==='canopy'){for(const x of [-.46,.46])for(const z of [-.46,.46])box(x,.5,z,.055,1,.055,WOOD);box(0,.97,0,1,.06,1,paint);}break;
    }
    case 'bookshelf':case 'cabinet':case 'wardrobe':case 'dresser':case 'wall-cabinet':{
      box(0,.5,-.42,1,1,.16,WOOD);for(const x of [-.46,.46])box(x,.5,0,.08,1,1,WOOD);
      const rows=f.family==='dresser'?3:f.family==='wall-cabinet'?2:4;for(let i=0;i<=rows;i++)box(0,i/rows,0,1,.035,1,WOOD);
      if(f.family==='bookshelf'){for(let row=0;row<rows;row++)for(let b=0;b<5;b++)box(-.35+b*.17,(row+.42)/rows,-.03,.11,.7/rows,.7,FURNITURE_COLORS[(b+row*2)%8],true);}
      else{for(const x of [-.22,.22]){box(x,.5,.43,.45,.94,.1,f.family==='cabinet'?'#8fbac9':paint);box(x+(x<0?.16:-.16),.5,.5,.025,.08,.025,DARK,true);}if(f.family==='dresser')for(let row=0;row<rows;row++)box(0,(row+.5)/rows,.5,.2,.025,.02,DARK,true);}break;
    }
    case 'crate':box(0,.5,0,1,1,1,WOOD);for(const y of [.12,.5,.88])box(0,y,.505,1,.045,.015,DARK,true);for(const x of [-.42,.42])box(x,.5,.51,.08,1,.02,paint,true);break;
    case 'kitchen':case 'sink':box(0,.43,0,1,.86,1);box(0,.94,0,1,.12,1,WHITE);for(const x of [-.25,.25]){box(x,.44,.505,.46,.78,.02,WOOD);box(x,.69,.52,.16,.03,.03,DARK,true);}if(f.family==='sink'){box(0,1.002,0,.6,.02,.6,DARK);box(0,1.08,-.24,.045,.2,.045,METAL);box(0,1.18,-.12,.045,.045,.3,METAL);}break;
    case 'fridge':box(0,.5,0,1,1,1,WHITE);box(0,.75,.51,.96,.45,.02,paint);box(0,.25,.51,.96,.46,.02,paint);for(const y of [.35,.68])box(.31,y,.55,.04,.16,.06,DARK,true);break;
    case 'oven':box(0,.45,0,1,.9,1);box(0,.94,0,1,.12,1,WHITE);box(0,.48,.51,.78,.47,.03,DARK);box(0,.75,.54,.6,.035,.04,METAL,true);for(const x of [-.25,.25])for(const z of [-.23,.23])box(x,1.001,z,.25,.01,.25,DARK,true);break;
    case 'tv':box(0,.2,0,1,.4,1,WOOD);box(0,.44,-.1,.2,.2,.1,DARK);box(0,.75,-.1,.95,.5,.12,DARK);box(0,.75,-.03,.88,.42,.02,paint);box(0,.8,-.015,.55,.03,.008,WHITE,true);break;
    case 'computer':legs(.57);box(0,.6,0,1,.06,1,WOOD);box(0,.7,-.23,.16,.16,.08,DARK);box(0,.87,-.23,.6,.26,.08,DARK);box(0,.87,-.18,.54,.21,.025,paint);box(0,.65,.22,.42,.035,.22,DARK,true);box(.35,.35,-.1,.18,.5,.5,DARK);break;
    case 'piano':legs(.5);box(0,.68,-.15,1,.6,.7,paint);box(0,.52,.22,1,.07,.45,WHITE);for(let i=0;i<14;i++)box(-.44+i*.068,.565,.13,.025,.035,.18,DARK,true);break;
    case 'record':legs(.5);box(0,.59,0,1,.18,1,WOOD);box(0,.72,0,.8,.09,.8,paint);box(-.12,.775,0,.4,.015,.5,DARK);box(.21,.85,-.04,.035,.04,.5,METAL,true);box(0,.4,.51,.65,.22,.03,DARK,true);break;
    case 'plant':case 'bonsai':{
      if(f.family==='bonsai'){legs(.4);box(0,.43,0,1,.06,1,WOOD);}const start=f.family==='bonsai'?.5:0;
      box(0,start+.12,0,.48,.24,.48,paint);box(0,.24+start/2,0,.32,.035,.32,WOOD);box(0,.53,0,.09,.58,.09,WOOD);box(-.17,.7,-.08,.45,.25,.5,LEAF);box(.17,.82,.06,.45,.25,.5,LEAF);box(0,.94,0,.47,.12,.45,LEAF);break;
    }
    case 'aquarium':legs(.4);box(0,.44,0,1,.09,1,WOOD);box(0,.74,0,1,.5,1,'#8fbac9');box(0,.97,0,1,.06,1,DARK);box(0,.52,0,.9,.03,.9,WOOD);for(const x of [-.25,.12])box(x,.7,.51,.15,.08,.015,paint,true);break;
    case 'lamp':box(0,.04,0,.55,.08,.55,DARK);box(0,.43,0,.045,.8,.045,METAL);box(0,.88,0,1,.24,1,paint);box(0,.82,.505,.65,.1,.015,WHITE,true);break;
    case 'coat':box(0,.04,0,.8,.08,.8,WOOD);box(0,.49,0,.07,.9,.07,WOOD);box(0,.83,0,1,.055,.08,WOOD);box(.25,.68,0,.32,.4,.1,paint);break;
    case 'mirror':box(0,.05,0,1,.1,1,WOOD);box(0,.53,-.18,1,.93,.18,paint);box(0,.53,-.07,.83,.82,.045,'#8fbac9');break;
    case 'pet':box(0,.25,0,1,.5,1,paint);for(const x of [-.44,.44])box(x,.7,0,.12,.6,1);box(0,.7,-.43,1,.6,.14);box(0,.43,0,.7,.08,.65,WHITE);break;
    case 'rug':box(0,.5,0,1,1,1,paint);for(const z of [-.4,.4])box(0,1.01,z,.94,.02,.035,WHITE,true);for(const x of [-.42,.42])box(x,1.01,0,.025,.02,.85,WHITE,true);break;
    case 'frame':case 'poster':case 'wall-mirror':box(0,.5,0,1,1,1,f.family==='poster'?WHITE:WOOD);box(0,.5,.52,.87,.84,.06,f.family==='wall-mirror'?'#8fbac9':paint);if(f.family==='frame'){box(-.2,.4,.56,.2,.2,.02,WHITE,true);box(.14,.58,.56,.33,.08,.02,DARK,true);}break;
    case 'clock':box(0,.5,0,1,1,1,paint);box(0,.5,.53,.82,.82,.05,WHITE);box(0,.62,.58,.04,.28,.03,DARK,true);box(.12,.5,.58,.25,.04,.03,DARK,true);break;
    case 'wall-shelf':box(0,.2,0,1,.09,1,WOOD);box(0,.75,-.39,1,.5,.14,paint);for(const x of [-.35,.35])box(x,.09,-.26,.05,.2,.45,METAL);for(const x of [-.18,0,.18])box(x,.45,0,.12,.42,.5,FURNITURE_COLORS[Math.round((x+.4)*10)],true);break;
    case 'pegboard':box(0,.5,0,1,1,.25,WOOD);for(let i=0;i<5;i++){box(-.36+i*.18,.7,.3,.03,.08,.45,METAL,true);box(-.36+i*.18,.46,.32,.06,.38,.09,paint,true);}break;
    case 'sconce':box(0,.5,-.3,.5,.65,.25,METAL);box(0,.6,.12,1,.8,.75,paint);box(0,.6,.51,.76,.55,.03,WHITE,true);break;
    case 'aircon':box(0,.5,0,1,1,1,WHITE);box(0,.27,.51,.83,.07,.03,DARK,true);break;
    case 'pendant':box(0,.72,0,.045,.56,.045,METAL);box(0,.24,0,1,.48,1,paint);box(0,.035,0,.8,.03,.8,WHITE);break;
    case 'chandelier':box(0,.75,0,.04,.5,.04,METAL);box(0,.4,0,.75,.055,.09,METAL);box(0,.4,0,.09,.055,.75,METAL);for(const [x,z]of [[-.36,0],[.36,0],[0,-.36],[0,.36]])box(x,.2,z,.27,.4,.27,paint);break;
    case 'fan':box(0,.74,0,.055,.52,.055,METAL);box(0,.38,0,.2,.18,.2,paint);box(0,.3,0,1,.05,.14,WOOD);box(0,.3,0,.14,.05,1,WOOD);box(0,.1,0,.19,.2,.19,WHITE);break;
    case 'ceiling-light':box(0,.72,0,1,.56,1,METAL);box(0,.24,0,.9,.48,.9,WHITE);break;
    case 'light-bar':for(const x of [-.36,.36])box(x,.72,0,.025,.56,.025,METAL);box(0,.26,0,1,.45,1,paint);box(0,.035,0,.9,.035,.8,WHITE);break;
  }
  const shift=f.mount==='wall'?-f.h/2:f.mount==='ceiling'?-f.h:0,light=['lamp','sconce','pendant','chandelier','fan','ceiling-light','light-bar'].includes(f.family);for(const p of parts){p.y+=shift;p.glow=light&&p.c===WHITE;}
  return parts;
}
export function furnitureThumbnail(def,color=10){
  const parts=furnitureParts({t:def.id,c:color}),project=(x,y,z)=>[(x-z)*.8,(x+z)*.34-y],points=parts.flatMap(p=>Array.from({length:8},(_,i)=>project(p.x+(i&1?.5:-.5)*p.w,p.y+(i&2?.5:-.5)*p.h,p.z+(i&4?.5:-.5)*p.d)));
  const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1])),s=48/Math.max(maxX-minX,maxY-minY),poly=(v,c)=>`<polygon points="${v.map(p=>{const a=project(...p);return ((a[0]-(minX+maxX)/2)*s+32).toFixed(1)+','+((a[1]-(minY+maxY)/2)*s+31).toFixed(1)}).join(' ')}" fill="${c}" stroke="#283b45" stroke-width=".35"/>`;
  let svg='<svg viewBox="0 0 64 64" aria-hidden="true">';
  for(const p of [...parts].sort((a,b)=>a.x+a.z-b.x-b.z)){const x=p.x-p.w/2,X=p.x+p.w/2,y=p.y-p.h/2,Y=p.y+p.h/2,z=p.z-p.d/2,Z=p.z+p.d/2;svg+=poly([[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]],p.c)+poly([[X,y,z],[X,y,Z],[X,Y,Z],[X,Y,z]],p.c)+poly([[x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z]],p.c);}return svg+'</svg>';
}
