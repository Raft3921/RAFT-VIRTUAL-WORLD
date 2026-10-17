import * as THREE from 'three';
// Canvas2D rasterization of the existing scene, for browsers that expose no WebGL.
// Physics, camera, network state and hit detection continue to use the real world.
export function createSoftwareRenderer(canvas){
 let surface=canvas,context=null;try{context=canvas.getContext('2d',{alpha:false});}catch{}
 if(!context){surface=document.createElement('canvas');surface.id='compatSurface';canvas.after(surface);context=surface.getContext('2d',{alpha:false});canvas.style.opacity='0';}
 if(!context)throw new Error('このブラウザーではWebGLとCanvas 2Dの両方を利用できません。');
 let width=384,height=216,image=null,depth=null,pixelRatio=1,target=null;
 const vp=new THREE.Matrix4(),mvp=new THREE.Matrix4(),instance=new THREE.Matrix4(),model=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3(),frustum=new THREE.Frustum(),sphere=new THREE.Sphere(),color=new THREE.Color();
 const textures=new WeakMap(),projected=new WeakMap();
 const wrap=(value,mode)=>mode===THREE.RepeatWrapping?value-Math.floor(value):mode===THREE.MirroredRepeatWrapping?1-Math.abs(((value%2)+2)%2-1):Math.max(0,Math.min(.999999,value));
 const srgb=x=>Math.max(0,Math.min(255,Math.round((x<=.0031308?x*12.92:1.055*Math.pow(x,1/2.4)-.055)*255)));
 const info={render:{calls:0,triangles:0,frame:0},memory:{geometries:0,textures:0}};
 function setSize(w,h,style=true){
  const aspect=Math.max(.3,w/Math.max(1,h)),nextW=Math.max(256,Math.min(512,Math.round(384*Math.min(1.33,pixelRatio)))),nextH=Math.max(144,Math.min(512,Math.round(nextW/aspect)));
  if(nextW!==width||nextH!==height||!image){width=surface.width=nextW;height=surface.height=nextH;image=context.createImageData(width,height);depth=new Float32Array(width*height);}
  if(style){canvas.style.width=w+'px';canvas.style.height=h+'px';}
 }
 function textureData(texture){
  if(!texture||texture.isRenderTargetTexture)return null;
  const source=texture.image,w=source?.naturalWidth||source?.width,h=source?.naturalHeight||source?.height;if(!w||!h)return null;
  let cached=textures.get(texture);if(cached?.version===texture.version&&cached.source===source)return cached;
  try{const copy=document.createElement('canvas'),scale=Math.min(1,256/Math.max(w,h));copy.width=Math.max(1,Math.round(w*scale));copy.height=Math.max(1,Math.round(h*scale));const ctx=copy.getContext('2d');ctx.drawImage(source,0,0,copy.width,copy.height);cached={version:texture.version,source,width:copy.width,height:copy.height,pixels:ctx.getImageData(0,0,copy.width,copy.height).data};textures.set(texture,cached);return cached;}catch{textures.set(texture,{version:texture.version,source});return null;}
 }
 function plane(v,i){return i===0?v.w+v.x:i===1?v.w-v.x:i===2?v.w+v.y:i===3?v.w-v.y:i===4?v.w+v.z:v.w-v.z;}
 function interpolate(a,b,t){return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,w:a.w+(b.w-a.w)*t,u:a.u+(b.u-a.u)*t,v:a.v+(b.v-a.v)*t};}
 function clip(vertices){
  let output=vertices;
  for(let i=0;i<6;i++){
   const input=output;output=[];if(!input.length)break;let a=input[input.length-1],da=plane(a,i);
   for(const b of input){const db=plane(b,i);if((da>=0)!==(db>=0))output.push(interpolate(a,b,da/(da-db)));if(db>=0)output.push(b);a=b;da=db;}
  }
  return output;
 }
 function raster(a,b,c,material,tint,shade,fog,flip=false){
  const ax=(a.x/a.w*.5+.5)*width,ay=(.5-a.y/a.w*.5)*height,bx=(b.x/b.w*.5+.5)*width,by=(.5-b.y/b.w*.5)*height,cx=(c.x/c.w*.5+.5)*width,cy=(.5-c.y/c.w*.5)*height;
  const area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);if(Math.abs(area)<.035)return;
  const front=flip?area>0:area<0;if(material.side===THREE.FrontSide&&!front||material.side===THREE.BackSide&&front)return;
  const minX=Math.max(0,Math.floor(Math.min(ax,bx,cx))),maxX=Math.min(width-1,Math.ceil(Math.max(ax,bx,cx))),minY=Math.max(0,Math.floor(Math.min(ay,by,cy))),maxY=Math.min(height-1,Math.ceil(Math.max(ay,by,cy)));if(minX>maxX||minY>maxY)return;
  const inv=1/area,aw=1/a.w,bw=1/b.w,cw=1/c.w,az=a.z*aw,bz=b.z*bw,cz=c.z*cw;
  const map=material.map,tex=textureData(map),data=tex?.pixels,opacity=material.opacity??1,alphaTest=material.alphaTest||0,write=material.depthWrite!==false,test=material.depthTest!==false;
  if(map?.matrixAutoUpdate)map.updateMatrix();const uvMatrix=map?.matrix.elements;
  const r=srgb(tint.r*shade),g=srgb(tint.g*shade),blue=srgb(tint.b*shade),pixels=image.data;
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   const px=x+.5,py=y+.5,wa=((bx-px)*(cy-py)-(by-py)*(cx-px))*inv,wb=((cx-px)*(ay-py)-(cy-py)*(ax-px))*inv,wc=1-wa-wb;if(wa<-.00001||wb<-.00001||wc<-.00001)continue;
   const z=wa*az+wb*bz+wc*cz,at=y*width+x;if(test&&z>depth[at]+.0000001)continue;
   let rr=r,gg=g,bb=blue,alpha=opacity;
   if(data){const reciprocal=wa*aw+wb*bw+wc*cw;let u=(wa*a.u*aw+wb*b.u*bw+wc*c.u*cw)/reciprocal,v=(wa*a.v*aw+wb*b.v*bw+wc*c.v*cw)/reciprocal;
    if(uvMatrix){const oldU=u;u=uvMatrix[0]*u+uvMatrix[3]*v+uvMatrix[6];v=uvMatrix[1]*oldU+uvMatrix[4]*v+uvMatrix[7];}
    u=wrap(u,map.wrapS);v=wrap(v,map.wrapT);if(map.flipY)v=1-v;
    const tx=Math.max(0,Math.min(tex.width-1,Math.floor(u*tex.width))),ty=Math.max(0,Math.min(tex.height-1,Math.floor(v*tex.height))),offset=(ty*tex.width+tx)*4;
    alpha*=data[offset+3]/255;if(alpha<alphaTest||alpha<.01)continue;rr=rr*data[offset]/255;gg=gg*data[offset+1]/255;bb=bb*data[offset+2]/255;
   }else if(alpha<alphaTest||alpha<.01)continue;
   if(fog>0&&material.fog!==false){rr+=(154-rr)*fog;gg+=(185-gg)*fog;bb+=(195-bb)*fog;}
   const offset=at*4;if(alpha<.99){pixels[offset]+=(rr-pixels[offset])*alpha;pixels[offset+1]+=(gg-pixels[offset+1])*alpha;pixels[offset+2]+=(bb-pixels[offset+2])*alpha;}else{pixels[offset]=rr;pixels[offset+1]=gg;pixels[offset+2]=bb;}
   if(write)depth[at]=z;
  }
  info.render.triangles++;
 }
 function draw(entry){
  const {object,matrix,instanceIndex}=entry,geometry=object.geometry,position=geometry.attributes.position;if(!position)return;
  const uv=geometry.attributes.uv,normals=geometry.attributes.normal,colors=geometry.attributes.color,index=geometry.index,count=index?.count??position.count;
  mvp.multiplyMatrices(vp,matrix);normalMatrix.getNormalMatrix(matrix);const e=mvp.elements,n=normalMatrix.elements;
  let points=projected.get(geometry);if(!points||points.length!==position.count*4){points=new Float64Array(position.count*4);projected.set(geometry,points);}
  for(let i=0;i<position.count;i++){const x=position.getX(i),y=position.getY(i),z=position.getZ(i),p=i*4;points[p]=e[0]*x+e[4]*y+e[8]*z+e[12];points[p+1]=e[1]*x+e[5]*y+e[9]*z+e[13];points[p+2]=e[2]*x+e[6]*y+e[10]*z+e[14];points[p+3]=e[3]*x+e[7]*y+e[11]*z+e[15];}
  const materials=Array.isArray(object.material)?object.material:[object.material],groups=Array.isArray(object.material)&&geometry.groups.length?geometry.groups:[{start:0,count,materialIndex:0}],instanceColor=object.instanceColor;
  const getVertex=i=>({x:points[i*4],y:points[i*4+1],z:points[i*4+2],w:points[i*4+3],u:uv?.getX(i)||0,v:uv?.getY(i)||0});
  for(const group of groups){const material=materials[group.materialIndex]||materials[0];if(!material||material.visible===false||material.isShaderMaterial||material.colorWrite===false)continue;
   const start=Math.max(group.start,geometry.drawRange.start),end=Math.min(count,group.start+group.count,geometry.drawRange.start+geometry.drawRange.count);
   for(let i=start;i+2<end;i+=3){if(info.render.triangles>=(entry.overlay?26000:22000))return;const ia=index?index.getX(i):i,ib=index?index.getX(i+1):i+1,ic=index?index.getX(i+2):i+2,a=getVertex(ia),b=getVertex(ib),c=getVertex(ic);
    let outside=false,inside=true;for(let p=0;p<6;p++){const da=plane(a,p),db=plane(b,p),dc=plane(c,p);if(da<0&&db<0&&dc<0){outside=true;break;}if(da<0||db<0||dc<0)inside=false;}if(outside)continue;
    if(material.color)color.copy(material.color);else color.setRGB(1,1,1);if(instanceIndex!==null&&instanceColor){color.r*=instanceColor.getX(instanceIndex);color.g*=instanceColor.getY(instanceIndex);color.b*=instanceColor.getZ(instanceIndex);}
    if(material.vertexColors&&colors){color.r*=colors.getX(ia);color.g*=colors.getY(ia);color.b*=colors.getZ(ia);}
    let shade=1;if(!material.isMeshBasicMaterial&&normals){const nx=normals.getX(ia),ny=normals.getY(ia),nz=normals.getZ(ia),x=n[0]*nx+n[3]*ny+n[6]*nz,y=n[1]*nx+n[4]*ny+n[7]*nz,z=n[2]*nx+n[5]*ny+n[8]*nz;shade=.55+.45*Math.max(0,(x*.35+y*.85+z*.4)/Math.max(.00001,Math.hypot(x,y,z)));}
    const fog=Math.max(0,Math.min(.8,((a.w+b.w+c.w)/3-70)/100));
    if(inside)raster(a,b,c,material,color,shade,fog,entry.flip);else{const polygon=clip([a,b,c]);for(let p=1;p+1<polygon.length;p++)raster(polygon[0],polygon[p],polygon[p+1],material,color,shade,fog,entry.flip);}
   }
  }
  info.render.calls++;
 }
 function render(scene,camera){
  if(target)return;if(!image)setSize(innerWidth,innerHeight,false);
  info.render.calls=info.render.triangles=0;info.render.frame++;depth.fill(Infinity);
  const pixels=image.data;for(let y=0;y<height;y++){const t=y/height,r=75+80*t,g=135+60*t,b=185+25*t;for(let x=0;x<width;x++){const at=(y*width+x)*4;pixels[at]=r;pixels[at+1]=g;pixels[at+2]=b;pixels[at+3]=255;}}
  scene.updateMatrixWorld();camera.updateMatrixWorld();vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(vp);
  const entries=[];
  scene.traverseVisible(object=>{
   if(!object.isMesh||!object.geometry?.attributes.position||object.isSkinnedMesh)return;
   const material=object.material;if(!Array.isArray(material)&&(!material||material.isShaderMaterial||material.visible===false))return;
   const geometry=object.geometry;if(!geometry.boundingSphere)geometry.computeBoundingSphere();if(!geometry.boundingSphere)return;
   const add=(matrix,instanceIndex)=>{sphere.copy(geometry.boundingSphere).applyMatrix4(matrix);if(!Number.isFinite(sphere.radius)||sphere.radius<=.00001||!frustum.intersectsSphere(sphere))return;const distance=camera.position.distanceTo(sphere.center);if(distance-sphere.radius>170)return;entries.push({object,matrix:matrix.clone(),flip:matrix.determinant()<0,instanceIndex,distance:Math.max(0,distance-sphere.radius),transparent:Array.isArray(material)?material.some(m=>m.transparent):material.transparent,overlay:object.renderOrder>100||(!Array.isArray(material)&&material.depthTest===false)});};
   if(object.isInstancedMesh){for(let i=0;i<object.count;i++){object.getMatrixAt(i,instance);model.multiplyMatrices(object.matrixWorld,instance);add(model,i);}}else add(object.matrixWorld,null);
  });
  entries.sort((a,b)=>Number(a.overlay)-Number(b.overlay)||Number(a.transparent)-Number(b.transparent)||(a.transparent?b.distance-a.distance:a.distance-b.distance));
  for(const entry of entries){if(info.render.triangles>=22000&&!entry.overlay)continue;draw(entry);}
  context.putImageData(image,0,0);
 }
 setSize(innerWidth,innerHeight,false);
 return {isSoftwareRenderer:true,domElement:surface,info,capabilities:{maxTextureSize:4096,isWebGL2:false},shadowMap:{enabled:false,autoUpdate:false,needsUpdate:false},xr:{enabled:false},autoClear:true,render,setSize,setPixelRatio(value){pixelRatio=Math.max(.67,Math.min(1.33,value));},getPixelRatio(){return pixelRatio;},getDrawingBufferSize(out){return out.set(width,height);},getSize(out){return out.set(width,height);},getRenderTarget(){return target;},setRenderTarget(value){target=value;},dispose(){image=depth=null;},clear(){if(image){image.data.fill(0);depth.fill(Infinity);}}};
}
