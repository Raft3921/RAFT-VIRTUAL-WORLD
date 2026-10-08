import * as THREE from 'three';
let triangle=null;
export function furnitureGeometry(shape){
  if(shape!=='triangle')return null;
  if(triangle)return triangle;
  // A closed, flat-shaded right-triangular prism. The diagonal is one clean
  // face, not seven disconnected boxes with floating legs underneath.
  const a=[-.5,-.5,-.5],b=[.5,-.5,-.5],c=[-.5,-.5,.5],A=[-.5,.5,-.5],B=[.5,.5,-.5],C=[-.5,.5,.5];
  const faces=[[A,C,B],[a,b,c],[a,A,B],[a,B,b],[b,B,C],[b,C,c],[c,C,A],[c,A,a]],positions=faces.flat(2),uvs=faces.flatMap(()=>[0,0,1,0,0,1]);
  triangle=new THREE.BufferGeometry();triangle.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));triangle.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));triangle.computeVertexNormals();triangle.computeBoundingSphere();return triangle;
}
