// A continuous, supported switchback stairwell. Each flight ends on the same
// deck where the next flight starts; posts and an outer wall reach its footing.
export function buildTownStairwell({box,slab,stair,sx,z,base,rise,levels,run,side=1,stone,cap,foot=.12}){
 const center=sx+side*1.15,inner=sx-side*1.12,outer=sx+side*3.42,top=base+rise*levels;
 for(const xx of [inner,outer])for(const end of [-1,1])box(xx,(foot+top)/2,z+end*(run/2+1.85),.38,top-foot,.38,stone);
 box(outer+side*.12,(base+top+.7)/2,z,.24,top-base+.7,run+4.1,stone);
 // Foundation and ground entry landing connect to street/terrace level.
 slab(center,base,z-run/2-1,4.8,2.4,stone);
 for(let level=0;level<levels;level++){
  const reverse=level%2===1,xx=sx+(reverse?side*2.3:0),end=reverse?-1:1,y=base+(level+1)*rise,zz=z+end*(run/2+1);
  stair(xx,z,rise,base+level*rise,reverse,2.1,run);
  slab(center,y,zz,4.8,2.8,cap);
  box(center,y-.48,zz,4.8,.30,.40,stone);
  box(center,y+.42,z+end*(run/2+2.15),4.8,.84,.22,stone);
 }
 return {x:center,y:top,z:z+(levels%2===0?-1:1)*(run/2+1)};
}
