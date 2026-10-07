export const ARENA={x:112,z:8,radius:21,fightRadius:17};
export function insideArena(p){return Math.hypot(p.x-ARENA.x,p.z-ARENA.z)<ARENA.fightRadius&&p.y<4&&!p.flight&&!p.seated;}
export const COURSE={x:-137,z:173,minX:-205,maxX:-70,minZ:102,maxZ:260,exit:{x:-79,y:0,z:98}};
// Each checkpoint is a mixed obstacle course. The first starts at the old
// level-20 footing size; later ones increase travel, timing and precision.
const sets=[
  ['snake','sideways','small','lift','falling'],
  ['small','forward','spinner','snake','sideways'],
  ['lift','projectile','snake','falling','forward'],
  ['sideways','spinner','small','projectile','lift'],
  ['snake','falling','forward','spinner','projectile'],
];
export function buildCourse(){
  const out=[];let height=.24;
  for(let i=0;i<600;i++){
    const level=.2+.8*i/599,row=Math.floor(i/30),col=i%30,course=Math.floor(i/6),step=i%6;
    const checkpoint=(step===0&&i!==594)||i===599;
    const kind=checkpoint?'checkpoint':col===29?'turn':sets[course%sets.length][(step+Math.floor(course/5)-1)%5];
    const weave=[0,1.3,-.8,1.1,-1.15,.2][step]*(.9+level*.22);
    const x=-79-(row%2?29-col:col)*4.05,z=110+row*5.8+(checkpoint?0:col===29?.75:weave);
    if(i>0)height+=.34+level*.13;
    const size=checkpoint?3.8:kind==='spinner'?3.8:kind==='small'?1.8-level*.45:2.4-level*.45;
    out.push({index:i,course:course+1,step,level,kind,x,z,y:height,size,w:size,d:col===29?2.4:kind==='snake'?.8-level*.22:size,
      checkpoint:i===599?100:checkpoint?course+1:0,
      moving:kind==='sideways'||kind==='forward',lift:kind==='lift',falling:kind==='falling',hazard:kind==='spinner',projectile:kind==='projectile',
      boardX:col===0?x+(row%2?-1:1)*(size/2+1.05):x,boardZ:col===0?z:z+(row%2?1:-1)*(size/2+1.05)});
  }
  return out;
}
