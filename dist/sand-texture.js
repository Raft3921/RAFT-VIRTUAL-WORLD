import * as THREE from 'three';
export function sandTexture(color){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#e5e1d6';c.fillRect(0,0,256,256);
 let seed=173;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 // Large plaster patches and fine aggregate are separate scales, with true
 // mortar lines on masonry. World-space UVs keep detail at a fixed metre size.
 for(let i=0;i<160;i++){c.fillStyle=i%2?'#ffffff18':'#57482b14';c.fillRect(random()*256,random()*256,8+random()*30,3+random()*18);}
 for(let i=0;i<6500;i++){c.fillStyle=i%3?'#69594325':'#ffffff45';c.fillRect(random()*256,random()*256,random()>.9?2:1,1);}
 if(['#af8960','#936c4f'].includes(color))for(let row=0;row<8;row++){
  c.fillStyle='#6e645650';c.fillRect(0,row*32,256,2);for(let col=-1;col<5;col++){const x=col*64+(row%2)*32;c.fillRect(x,row*32,2,32);c.fillStyle='#ffffff25';c.fillRect(x+2,row*32+2,61,1);c.fillStyle='#6e645650';}
 }
 for(let i=0;i<20;i++){const x=random()*256,y=random()*256;c.fillStyle='#584a3420';c.fillRect(x,y,1,4+random()*20);}
 const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.anisotropy=4;return texture;
}
