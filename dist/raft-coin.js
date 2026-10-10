import * as THREE from 'three';

// One shared 32px coin atlas, cut directly from Raft's Java face + hat layer.
const face=document.createElement('canvas'),reverse=document.createElement('canvas');face.width=face.height=reverse.width=reverse.height=32;
let iconURL='';const icons=new Set(),textures=[];
function mint(canvas,skin=null,back=false){
 const c=canvas.getContext('2d');c.clearRect(0,0,32,32);c.imageSmoothingEnabled=false;
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){
  const dx=x-15.5,dy=y-15.5,d=Math.hypot(dx,dy);if(d>15)continue;
  c.fillStyle=d>14?'#604018':d>12.2?(x+y<31?'#ffe9a1':'#ac6c25'):d>10.6?'#dca844':'#f4c65d';c.fillRect(x,y,1,1);
 }
 c.fillStyle='#fff0ae';c.fillRect(9,3,12,1);c.fillRect(5,7,2,5);c.fillStyle='#8c581e';c.fillRect(11,28,11,1);
 if(back){const pattern=['111100','100010','100010','111100','101000','100100','100010'];c.fillStyle='#946026';pattern.forEach((row,y)=>[...row].forEach((bit,x)=>{if(bit==='1')c.fillRect(10+x*2,9+y*2,2,2);}));c.fillStyle='#ffe9a1';c.fillRect(12,25,8,1);}
 else{c.fillStyle='#a16825';c.fillRect(7,7,18,18);c.fillStyle='#ffe7a1';c.fillRect(8,8,16,16);if(skin){c.drawImage(skin,8,8,8,8,8,8,16,16);c.drawImage(skin,40,8,8,8,8,8,16,16);}else{c.fillStyle='#93694d';c.fillRect(10,10,12,5);c.fillStyle='#4e3026';c.fillRect(11,17,3,2);c.fillRect(18,17,3,2);}}
}
mint(face);mint(reverse,null,true);
function refreshIcons(){iconURL=face.toDataURL('image/png');for(const icon of icons){if(!icon.isConnected){icons.delete(icon);continue;}icon.src=iconURL;}}
export function coinIcon(size=28){const img=document.createElement('img');img.className='raft-coin-icon';img.alt='';img.width=img.height=size;img.draggable=false;img.src=iconURL||face.toDataURL('image/png');icons.add(img);return img;}
const skin=new Image();skin.onload=()=>{mint(face,skin);refreshIcons();for(const texture of textures)texture.needsUpdate=true;};skin.src=new URL('./skins/raft.png',import.meta.url).href;

export function createCoinRewards(camera,{get,anchor}){
 const front=new THREE.CanvasTexture(face),back=new THREE.CanvasTexture(reverse);for(const texture of [front,back]){texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);}
 const rimMaterial=new THREE.MeshStandardMaterial({color:'#e9b64d',metalness:.48,roughness:.34,depthTest:false,depthWrite:false}),frontMaterial=new THREE.MeshBasicMaterial({map:front,transparent:true,depthTest:false,depthWrite:false}),backMaterial=new THREE.MeshBasicMaterial({map:back,transparent:true,depthTest:false,depthWrite:false});
 const rimGeometry=new THREE.CylinderGeometry(.18,.18,.05,16);rimGeometry.rotateX(Math.PI/2);const faceGeometry=new THREE.PlaneGeometry(.36,.36);
 const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)');
 const root=new THREE.Group();root.name='Raft Coin reward pool';camera.add(root);
 const coins=Array.from({length:4},()=>{const holder=new THREE.Group(),model=new THREE.Group(),rim=new THREE.Mesh(rimGeometry,rimMaterial),a=new THREE.Mesh(faceGeometry,frontMaterial),b=new THREE.Mesh(faceGeometry,backMaterial);a.position.z=.028;b.position.z=-.028;b.rotation.y=Math.PI;model.add(rim,a,b);holder.add(model);root.add(holder);holder.visible=false;holder.traverse(object=>{object.renderOrder=1000;object.frustumCulled=false;});return {holder,model,age:0,delay:0,active:false};});
 const starShape=new THREE.Shape();for(let i=0;i<8;i++){const angle=i*Math.PI/4,r=i%2?.28:1,x=Math.cos(angle)*r,y=Math.sin(angle)*r;if(!i)starShape.moveTo(x,y);else starShape.lineTo(x,y);}starShape.closePath();
 const starMaterial=new THREE.MeshBasicMaterial({color:'#ffe7a1',transparent:true,opacity:.9,depthTest:false,depthWrite:false,side:THREE.DoubleSide}),stars=new THREE.InstancedMesh(new THREE.ShapeGeometry(starShape),starMaterial,32),transform=new THREE.Object3D();stars.frustumCulled=false;stars.renderOrder=1001;stars.visible=false;root.add(stars);const particles=Array.from({length:32},()=>({life:0,x:0,y:0,vx:0,vy:0,angle:0}));let cursor=0,elapsed=0,noticeUntil=0,amountPending=0,timer=null;
 const notice=document.createElement('div');notice.id='coinRewardNotice';notice.hidden=true;notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');const label=document.createElement('strong');notice.append(coinIcon(32),label);document.body.append(notice);
 function sparkle(x,y,count){for(let i=0;i<count;i++){const p=particles[cursor++%particles.length],angle=i*2.399+Math.random()*.4;p.life=.55+Math.random()*.3;p.x=x;p.y=y;p.vx=Math.cos(angle)*(.1+Math.random()*.18);p.vy=Math.sin(angle)*(.1+Math.random()*.18)+.08;p.angle=angle;}}
 function award(amount){if(!get().inStudio||!Number.isInteger(amount)||amount<=0)return;amountPending+=amount;label.textContent='＋'+amountPending+' ラフトコイン';notice.hidden=false;noticeUntil=elapsed+2.4;notice.classList.remove('coin-award');anchor.classList.remove('coin-award');requestAnimationFrame(()=>{notice.classList.add('coin-award');anchor.classList.add('coin-award');});clearTimeout(timer);timer=setTimeout(()=>anchor.classList.remove('coin-award'),1500);
  const count=Math.min(amount,coins.length);for(let i=0;i<count;i++){const coin=coins.find(c=>!c.active)||coins.reduce((a,b)=>a.age>b.age?a:b);coin.active=true;coin.age=0;coin.delay=i*.13;coin.holder.visible=true;}sparkle(-.1,.2,12);
 }
 function update(dt){elapsed+=dt;const state=get();root.visible=state.inStudio&&state.cameraMode!=='first'&&!document.hidden;if(elapsed>noticeUntil){notice.hidden=true;amountPending=0;}const depth=1.2,halfH=Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))*depth,halfW=halfH*camera.aspect,rect=anchor.querySelector('.raft-coin-icon')?.getBoundingClientRect(),destX=rect?(rect.left+rect.width/2)/innerWidth*2-1:-.9,destY=rect?1-(rect.top+rect.height/2)/innerHeight*2:.9;
  for(const coin of coins){if(!coin.active)continue;coin.age+=dt;const t=coin.age-coin.delay;if(t<0){coin.holder.visible=false;continue;}coin.holder.visible=true;const travel=THREE.MathUtils.smoothstep(t,.72,1.45),x=THREE.MathUtils.lerp(-.10,destX,travel),y=THREE.MathUtils.lerp(.28,destY,travel)+Math.sin(Math.min(1,t/.72)*Math.PI)*.08;coin.holder.position.set(x*halfW,y*halfH,-depth);coin.model.rotation.set(reducedMotion.matches?0:.12*Math.sin(t*5),reducedMotion.matches ? .18 : t*Math.PI*5,reducedMotion.matches?0:Math.sin(t*3)*.1);const scale=(.5+Math.sin(Math.min(1,t/.18)*Math.PI/2)*.5)*(1-travel*.85)*Math.min(1,halfH/.6);coin.holder.scale.setScalar(scale);if(t>=1.45){coin.active=false;coin.holder.visible=false;sparkle(destX,destY,8);}}
  let visible=false;for(let i=0;i<particles.length;i++){const p=particles[i];if(p.life>0){visible=true;p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=dt*.12;transform.position.set(p.x*halfW,p.y*halfH,-depth+.04);transform.rotation.set(0,0,p.angle+elapsed*1.8);transform.scale.setScalar(Math.min(.018,p.life*.06)*Math.min(1,halfH/.6));}else transform.scale.setScalar(0);transform.updateMatrix();stars.setMatrixAt(i,transform.matrix);}stars.visible=visible;stars.instanceMatrix.needsUpdate=visible;
 }
 function clear(){for(const coin of coins){coin.active=false;coin.holder.visible=false;}for(const p of particles)p.life=0;notice.hidden=true;amountPending=0;clearTimeout(timer);anchor.classList.remove('coin-award');}
 return {award,update,clear};
}
