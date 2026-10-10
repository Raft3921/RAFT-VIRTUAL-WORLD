import * as THREE from 'three';
// Hollow cookware stays hollow: square rails and stepped walls, all box faces.
function boxes(parts){
 const positions=[],normals=[],uvs=[],base=new THREE.BoxGeometry(1,1,1).toNonIndexed();
 for(const [x,y,z,w,h,d] of parts){const p=base.attributes.position,n=base.attributes.normal,uv=base.attributes.uv;for(let i=0;i<p.count;i++){positions.push(p.getX(i)*w+x,p.getY(i)*h+y,p.getZ(i)*d+z);normals.push(n.getX(i),n.getY(i),n.getZ(i));uvs.push(uv.getX(i),uv.getY(i));}}
 base.dispose();const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));return geometry;
}
const ring=(width,y,height,wall=.055)=>[[0,y,-width/2+wall/2,width,height,wall],[0,y,width/2-wall/2,width,height,wall],[-width/2+wall/2,y,0,wall,height,width-2*wall],[width/2-wall/2,y,0,wall,height,width-2*wall]];
const bowl=[[0,.035,0,.56,.07,.56]];
for(let row=0;row<6;row++)bowl.push(...ring(.58+row*.084,(row+.5)/6,1/6,.065));
export const cookingGeometry={
 box:new THREE.BoxGeometry(1,1,1),round:new THREE.BoxGeometry(1,1,1),disc:new THREE.BoxGeometry(1,1,1),
 cone:boxes([[0,-.3,0,1,.4,1],[0,.02,0,.65,.24,.65],[0,.28,0,.3,.28,.3]]),
 tube:boxes(ring(1,0,1,.045)),rim:boxes(ring(1,0,.04,.04)),
 wire:boxes([[-.45,0,0,.06,1,.06],[.45,0,0,.06,1,.06],[0,.47,0,.96,.06,.06],[0,-.47,0,.96,.06,.06]]),
 bowl:boxes(bowl),basket:boxes(bowl)
};
