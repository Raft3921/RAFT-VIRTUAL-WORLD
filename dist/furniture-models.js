import {furnitureDefinition,FURNITURE_COLORS} from './housing-data.js?v=20261011-free-cook72';
import {expandedParts} from './furniture-shapes.js?v=20261011-free-cook72';
import {furnitureAction} from './furniture-actions.js?v=20261011-free-cook72';
const WOOD='#bd9166',DARK='#354353',METAL='#87929a',WHITE='#f4eee2',LEAF='#52a96d';
const partsCache=new Map();
export function furnitureParts(item){
  const cacheKey=item.t+':'+item.c+':'+(item.v||0);if(partsCache.has(cacheKey))return partsCache.get(cacheKey);
  const f=furnitureDefinition(item),paint=FURNITURE_COLORS[item.c],parts=[];
  // Keep designed front/top layers separate, never clamp their centres onto
  // the body surface. Reserve a small border inside the placement envelope.
  const inset=.88,box=(x,y,z,w,h,d,c=paint,detail=false)=>{parts.push({x:x*f.w*inset,y:y*f.h*inset,z:z*f.d*inset,w:w*f.w*inset,h:h*f.h*inset,d:d*f.d*inset,c,detail});};
  const motion=(kind,options={})=>Object.assign(parts[parts.length-1],{motion:kind,...options});
  const legs=(height=.7)=>{for(const x of [-.39,.39])for(const z of [-.36,.36])box(x,height/2,z,.075,height,.085,WOOD);};
  if(f.extended)expandedParts(f,paint,box,motion,parts);else switch(f.family){
    case 'chair':legs(.43);box(0,.46,0,1,.11,1);box(0,.75,-.43,1,.5,.14);box(0,.77,-.35,.7,.17,.04,WOOD,true);break;
    case 'sofa':legs(.13);box(0,.26,0,.96,.32,.96,DARK);box(0,.48,.055,.78,.14,.79);box(0,.76,-.43,.98,.48,.14);for(const x of [-.45,.45])box(x,.57,0,.1,.42,1);box(0,.557,.14,.022,.008,.54,WHITE,true);break;
    case 'stool':legs(.85);box(0,.92,0,1,.16,1);break;
    case 'bench':legs(.8);box(0,.9,0,1,.2,1);for(const z of [-.3,0,.3])box(0,1.001,z,1,.002,.025,DARK,true);break;
    case 'table':legs(.88);box(0,.94,0,1,.12,1);break;
    case 'desk':legs(.88);box(0,.94,0,1,.12,1);box(-.26,.61,0,.38,.55,.8,WOOD);for(const y of [.45,.65,.83])box(-.26,y,.41,.16,.02,.02,DARK,true);break;
    case 'bed':case 'canopy':{
      const ratio=f.family==='canopy'?1/f.h:1;const bedBox=(x,y,z,w,h,d,c)=>box(x,y*ratio,z,w,h*ratio,d,c);
      for(const x of [-.39,.39])for(const z of [-.36,.36])bedBox(x,.09,z,.075,.18,.085,WOOD);
      bedBox(0,.29,0,1,.22,1,WOOD);bedBox(0,.5,0,.94,.2,.91,WHITE);bedBox(0,.61,.16,.94,.025,.56,paint);bedBox(0,.655,-.30,.68,.11,.22,WHITE);bedBox(0,.70,-.46,1,.6,.08,WOOD);
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
    case 'piano':legs(.5);box(0,.68,-.27,1,.6,.46,paint);box(0,.52,.17,1,.07,.58,WHITE);for(let i=0;i<14;i++){box(-.44+i*.068,.575,.15,.025,.035,.28,DARK,true);motion('key',{key:i});}break;
    case 'record':legs(.5);box(0,.59,0,1,.18,1,WOOD);box(0,.72,0,.8,.09,.8,paint);box(-.12,.775,0,.4,.015,.4,DARK);motion('spin',{rate:.8});box(.21,.85,-.04,.035,.04,.5,METAL,true);box(0,.4,.51,.65,.22,.03,DARK,true);break;
    case 'plant':case 'bonsai':{
      if(f.family==='bonsai'){legs(.4);box(0,.43,0,1,.06,1,WOOD);}const start=f.family==='bonsai'?.5:0;
      box(0,start+.12,0,.48,.24,.48,paint);box(0,.24+start/2,0,.32,.035,.32,WOOD);box(0,.53,0,.09,.58,.09,WOOD);box(-.17,.7,-.08,.45,.25,.5,LEAF);motion('sway');box(.17,.82,.06,.45,.25,.5,LEAF);motion('sway',{phase:1});box(0,.94,0,.47,.12,.45,LEAF);motion('sway',{phase:2});break;
    }
    case 'aquarium':legs(.4);box(0,.44,0,1,.09,1,WOOD);box(0,.725,0,.94,.43,.88,'#8fbac9');box(0,.97,0,1,.05,1,DARK);box(0,.50,0,.98,.035,.96,WOOD);for(const [i,x]of [-.25,.12].entries()){box(x,.68+i*.09,.458+i*.018,.15,.08,.012,paint,true);motion('fish',{phase:x*9,amplitude:f.w*.12});}break;
    case 'lamp':box(0,.04,0,.55,.08,.55,DARK);box(0,.43,0,.045,.8,.045,METAL);box(0,.88,0,1,.24,1,paint);box(0,.82,.505,.65,.1,.015,WHITE,true);break;
    case 'coat':box(0,.04,0,.8,.08,.8,WOOD);box(0,.49,0,.07,.9,.07,WOOD);box(0,.83,0,1,.055,.08,WOOD);box(.25,.68,0,.32,.4,.1,paint);break;
    case 'stove':box(0,.46,0,1,.92,1,WHITE);box(0,.96,0,1,.08,1,DARK);for(const x of [-.25,.25]){box(x,1.01,0,.3,.025,.5,METAL);box(x,.76,.51,.1,.12,.04,paint);}break;
    case 'cookware':if(f.design==='board')box(0,.5,0,1,1,1,WOOD);else if(f.design==='knife'){box(-.2,.5,0,.5,1,1,METAL);box(.3,.5,0,.4,1,.8,DARK);}else{box(0,.1,0,.85,.2,.85,METAL);if(f.design!=='plate')for(const sign of [-1,1]){box(sign*.43,.5,0,.08,.8,.9,paint);box(0,.5,sign*.43,.9,.8,.08,paint);}if(f.design==='pan')box(.7,.6,0,.5,.14,.14,DARK);}break;
    case 'mirror':box(0,.05,0,1,.1,1,WOOD);box(0,.53,-.18,1,.93,.18,paint);box(0,.53,-.065,.83,.82,.045,'#8fbac9');parts[parts.length-1].mirror=true;break;
    case 'pet':box(0,.25,0,1,.5,1,paint);for(const x of [-.44,.44])box(x,.7,0,.12,.6,1);box(0,.7,-.43,1,.6,.14);box(0,.43,0,.7,.08,.65,WHITE);break;
    case 'rug':box(0,.5,0,1,1,1,paint);for(const z of [-.4,.4])box(0,1.01,z,.94,.02,.035,WHITE,true);for(const x of [-.42,.42])box(x,1.01,0,.025,.02,.85,WHITE,true);break;
    case 'frame':case 'poster':case 'wall-mirror':box(0,.5,0,1,1,.84,f.family==='poster'?WHITE:WOOD);box(0,.5,.47,.87,.84,.06,f.family==='wall-mirror'?'#8fbac9':paint);if(f.family==='wall-mirror')parts[parts.length-1].mirror=true;if(f.family==='frame'){box(-.2,.4,.515,.2,.2,.018,WHITE,true);box(.14,.58,.515,.33,.08,.018,DARK,true);}break;
    case 'clock':box(0,.5,0,1,1,.8,paint);box(0,.5,.45,.82,.82,.04,WHITE);box(0,.62,.49,.04,.28,.018,DARK,true);motion('hand',{clockHand:'minute',pivot:[0,.5*f.h*inset,.49*f.d*inset],rate:-Math.PI/30});box(.12,.5,.52,.25,.04,.018,DARK,true);motion('hand',{pivot:[0,.5*f.h*inset,.52*f.d*inset],clockHand:'hour',rate:-Math.PI/360});break;
    case 'wall-shelf':box(0,.2,0,1,.09,1,WOOD);box(0,.75,-.39,1,.5,.14,paint);for(const x of [-.35,.35])box(x,.09,-.26,.05,.2,.45,METAL);for(const x of [-.18,0,.18])box(x,.45,0,.12,.42,.5,FURNITURE_COLORS[Math.round((x+.4)*10)],true);break;
    case 'pegboard':box(0,.5,0,1,1,.25,WOOD);for(let i=0;i<5;i++){box(-.36+i*.18,.7,.3,.03,.08,.45,METAL,true);box(-.36+i*.18,.46,.32,.06,.38,.09,paint,true);}break;
    case 'sconce':box(0,.5,-.3,.5,.65,.25,METAL);box(0,.6,.12,1,.8,.75,paint);box(0,.6,.51,.76,.55,.03,WHITE,true);break;
    case 'aircon':box(0,.5,0,1,1,1,WHITE);box(0,.27,.525,.83,.12,.02,DARK,true);box(0,.27,.55,.8,.035,.035,METAL,true);motion('flap');box(.38,.69,.525,.05,.045,.02,'#85ddb5',true);break;
    case 'pendant':box(0,.72,0,.045,.56,.045,METAL);box(0,.24,0,1,.48,1,paint);box(0,.012,0,.8,.025,.8,WHITE);break;
    case 'chandelier':box(0,.75,0,.04,.5,.04,METAL);box(0,.4,0,.75,.055,.09,METAL);box(0,.4,0,.09,.055,.75,METAL);for(const [x,z]of [[-.36,0],[.36,0],[0,-.36],[0,.36]]){box(x,.2,z,.27,.4,.27,paint);box(x,.012,z,.21,.02,.21,WHITE);}break;
    case 'fan':box(0,.74,0,.055,.52,.055,METAL);box(0,.38,0,.2,.18,.2,paint);box(0,.3,0,1,.05,.14,WOOD);motion('spin',{rate:2.6});box(0,.3,0,.14,.05,1,WOOD);motion('spin',{rate:2.6});box(0,.1,0,.19,.2,.19,WHITE);break;
    case 'vent':box(0,.5,0,1,1,.65,WHITE);for(let i=0;i<5;i++)box(0,.18+i*.16,.37,.85,.035,.035,METAL,true);break;
    case 'wall-planter':box(0,.3,0,.9,.48,.75,paint);for(const x of [-.27,0,.27]){box(x,.68,.1,.18,.42,.4,LEAF);motion('sway',{phase:x*8});}break;
    case 'curtain':box(0,.92,0,1,.08,.35,METAL);for(const x of [-.34,.34]){box(x,.45,.1,.3,.9,.5,paint);motion('sway');}break;
    case 'wall-speaker':box(0,.5,0,1,1,.8,DARK);box(0,.38,.46,.68,.38,.055,METAL);box(0,.76,.46,.3,.2,.055,paint);break;
    case 'hanging-plant':box(0,.8,0,.03,.4,.03,METAL);box(0,.43,0,.6,.34,.6,paint);for(const x of [-.25,0,.25]){box(x,.19,0,.13,.38,.25,LEAF);motion('sway',{phase:x*8});}break;
    case 'mobile':box(0,.8,0,.025,.4,.025,METAL);box(0,.6,0,.8,.035,.035,WOOD);motion('spin',{rate:.4});for(const x of [-.32,0,.32]){box(x,.34,0,.15,.25,.15,FURNITURE_COLORS[Math.round((x+.4)*10)]);motion('orbit',{pivot:[0,.34*f.h*inset,0],rate:.4});}break;
    case 'projector':box(0,.82,0,.09,.36,.09,METAL);box(0,.4,0,1,.48,1,WHITE);box(.22,.4,.54,.27,.25,.065,'#8fbac9',true);break;
    case 'ceiling-light':box(0,.72,0,1,.56,1,METAL);box(0,.24,0,.9,.48,.9,WHITE);break;
    case 'light-bar':for(const x of [-.36,.36])box(x,.72,0,.025,.56,.025,METAL);box(0,.26,0,1,.45,1,paint);box(0,.035,0,.9,.035,.8,WHITE);break;
  }
  const shift=f.mount==='wall'?-f.h*.44:f.mount==='ceiling'?-f.h*.88:0,light=f.light||['lamp','sconce','pendant','chandelier','fan','ceiling-light','light-bar'].includes(f.family),action=furnitureAction(f);for(const p of parts){
    if(action.kind==='screen'&&p.d<f.d*.18&&(p.c===paint||p.c==='#8fbac9'||['vr','projector'].includes(f.design)&&p.z>f.d*.2))p.role='screen';
    if(action.kind==='door'&&p.z>f.d*.30&&p.d<f.d*.20)p.role='door';
    if(action.kind==='door'&&['rice','trash','recycle','trunk','suitcase'].includes(f.design)&&p.y>f.h*.72&&p.h<f.h*.18&&p.w>f.w*.4)p.role='lid';
    if(action.kind==='curtain'&&p.h>f.h*.3&&p.c!==METAL)p.role='curtain';
    p.y+=shift;if(p.pivot)p.pivot[1]+=shift;if(p.detail&&f.family!=='rug'&&f.solid!==false)p.z+=.001;p.glow=light&&p.c===WHITE;
  }
  const doors=parts.filter(p=>p.role==='door'&&p.w>f.w*.15&&p.h>f.h*.2),lids=parts.filter(p=>p.role==='lid');
  for(const p of parts){if(p.role==='door'&&doors.length){const panel=[...doors].sort((a,b)=>Math.abs(a.x-p.x)+Math.abs(a.y-p.y)-Math.abs(b.x-p.x)-Math.abs(b.y-p.y))[0],sign=panel.x<0?-1:1;p.doorPivot=[panel.x+sign*panel.w/2,panel.y,panel.z];p.doorSign=sign;}if(p.role==='lid'){p.lidPivot=[p.x,p.y,p.z-p.d/2];}}
  // Separate remaining exposed co-planar box faces across every furniture
  // family. Do this once when building, not during animation/render updates.
  const axes=[['x','w'],['y','h'],['z','d']];
  for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){
    const a=parts[i],b=parts[j],small=a.w*a.h*a.d<=b.w*b.h*b.d?a:b,large=small===a?b:a;
    for(const [axis,size]of axes){
      const overlap=axes.filter(([other])=>other!==axis).every(([other,span])=>Math.min(a[other]+a[span]/2,b[other]+b[span]/2)-Math.max(a[other]-a[span]/2,b[other]-b[span]/2)>.00001);if(!overlap)continue;
      for(const sign of [-1,1])if(Math.abs(small[axis]+sign*small[size]/2-large[axis]-sign*large[size]/2)<.000001){const separation=.003;small[axis]+=sign*separation;if(small.pivot)small.pivot[axes.findIndex(([key])=>key===axis)]+=sign*separation;break;}
    }
  }
  if(partsCache.size>=192)partsCache.delete(partsCache.keys().next().value);partsCache.set(cacheKey,parts);return parts;
}
const thumbnailCache=new Map();
export function furnitureThumbnail(def,color=10){
  const key=def.id+':'+color;if(thumbnailCache.has(key))return thumbnailCache.get(key);
  const parts=furnitureParts({t:def.id,c:color}),project=(x,y,z)=>[(x-z)*.8,(x+z)*.34-y];
  const corner=(p,x,y,z)=>{
    const Z=p.rz||0,Y=p.ry||0,X=p.rx||0;
    [x,y]=[x*Math.cos(Z)-y*Math.sin(Z),x*Math.sin(Z)+y*Math.cos(Z)];
    [x,z]=[x*Math.cos(Y)+z*Math.sin(Y),-x*Math.sin(Y)+z*Math.cos(Y)];
    [y,z]=[y*Math.cos(X)-z*Math.sin(X),y*Math.sin(X)+z*Math.cos(X)];
    return [p.x+x,p.y+y,p.z+z];
  };
  const points=parts.flatMap(p=>Array.from({length:8},(_,i)=>project(...corner(p,(i&1?.5:-.5)*p.w,(i&2?.5:-.5)*p.h,(i&4?.5:-.5)*p.d))));
  const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1])),s=48/Math.max(maxX-minX,maxY-minY);
  const poly=(p,v)=>'<polygon points="'+v.map(([x,y,z])=>{const a=project(...corner(p,x,y,z));return ((a[0]-(minX+maxX)/2)*s+32).toFixed(1)+','+((a[1]-(minY+maxY)/2)*s+31).toFixed(1)}).join(' ')+'" fill="'+p.c+'" stroke="#283b45" stroke-width=".35"/>';
  let svg='<svg viewBox="0 0 64 64" aria-hidden="true">';
  for(const p of [...parts].sort((a,b)=>a.x+a.z-b.x-b.z)){
    const x=-p.w/2,X=p.w/2,y=-p.h/2,Y=p.h/2,z=-p.d/2,Z=p.d/2;
    if(p.shape==='triangle')svg+=poly(p,[[x,y,Z],[X,y,z],[X,Y,z],[x,Y,Z]])+poly(p,[[x,Y,z],[X,Y,z],[x,Y,Z]]);
    else svg+=poly(p,[[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]])+poly(p,[[X,y,z],[X,y,Z],[X,Y,Z],[X,Y,z]])+poly(p,[[x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z]]);
  }
  svg+='</svg>';if(thumbnailCache.size>=160)thumbnailCache.delete(thumbnailCache.keys().next().value);thumbnailCache.set(key,svg);return svg;
}
