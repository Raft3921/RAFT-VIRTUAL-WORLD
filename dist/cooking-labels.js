import * as THREE from 'three';
const materials=new Map(),geometry=new THREE.PlaneGeometry(1,1);
// Printed markings belong to the equipment itself and share cached textures.
export function cookingLabel(text,width=.3,height=.08){
 const key=String(text);if(!materials.has(key)){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#294a40';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#a7bc97';ctx.lineWidth=6;ctx.strokeRect(3,3,506,122);ctx.fillStyle='#fff1c9';ctx.font='bold 45px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(key,256,64,480);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=texture.magFilter=THREE.NearestFilter;materials.set(key,new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));}
 const mesh=new THREE.Mesh(geometry,materials.get(key));mesh.scale.set(width,height,1);return mesh;
}
