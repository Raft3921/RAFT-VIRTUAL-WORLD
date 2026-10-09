import * as THREE from 'three';

const turn=new THREE.Matrix4().makeRotationY(Math.PI);
export function portalFrame(mesh){
  mesh.updateWorldMatrix(true,false);
  const center=new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld);
  const normal=new THREE.Vector3(0,0,1).transformDirection(mesh.matrixWorld),up=new THREE.Vector3(0,1,0).transformDirection(mesh.matrixWorld),right=new THREE.Vector3().crossVectors(up,normal).normalize();up.crossVectors(normal,right).normalize();
  const matrix=new THREE.Matrix4().makeBasis(right,up,normal).setPosition(center),size=new THREE.Vector3().setFromMatrixScale(mesh.matrixWorld);
  return {center,normal,up,right,matrix,width:Math.abs(size.x),height:Math.abs(size.y)};
}
export function passageTransform(source,destination){return portalFrame(destination).matrix.multiply(turn).multiply(portalFrame(source).matrix.invert());}

// Draw the connected space straight into the main framebuffer through a
// stencil opening. No render textures, texture updates or per-mirror pools.
// Only the nearest visible doorway is drawn, within a short approach range.
export function createPortalViews(scene){
  const virtual=new THREE.PerspectiveCamera(),plane=new THREE.Plane(),clip=new THREE.Vector4(),q=new THREE.Vector4(),frustum=new THREE.Frustum(),scratch=new THREE.Matrix4(),viewport=new THREE.Vector4(),oldScissor=new THREE.Vector4(),drawSize=new THREE.Vector2(),corner=new THREE.Vector3();
  const maskScene=new THREE.Scene(),mask=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShaderMaterial({uniforms:{shape:{value:0}},vertexShader:'varying vec2 portalUV;void main(){portalUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position.z=max(gl_Position.z,-gl_Position.w+0.00001);}',fragmentShader:`uniform float shape;varying vec2 portalUV;void main(){vec2 p=portalUV*2.0-1.0;if(shape==1.0&&dot(p,p)>1.0)discard;if(shape==2.0&&abs(p.x)>1.0-abs(p.y)*.4)discard;if(shape==3.0&&p.y>0.0&&dot(p,p)>1.0)discard;gl_FragColor=vec4(0.0);}`,colorWrite:false,depthWrite:false,depthTest:true,side:THREE.DoubleSide,stencilWrite:true,stencilRef:1,stencilFunc:THREE.AlwaysStencilFunc,stencilFail:THREE.KeepStencilOp,stencilZFail:THREE.KeepStencilOp,stencilZPass:THREE.ReplaceStencilOp}));mask.matrixAutoUpdate=false;mask.frustumCulled=false;maskScene.add(mask);
  const clearScene=new THREE.Scene(),clearCamera=new THREE.Camera(),clearQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({vertexShader:'void main(){gl_Position=vec4(position.xy,1.0,1.0);}',fragmentShader:'void main(){gl_FragColor=vec4(0.0,0.0,0.0,1.0);}',depthTest:true,depthFunc:THREE.AlwaysDepth,depthWrite:true,stencilWrite:true,stencilRef:1,stencilFunc:THREE.EqualStencilFunc,stencilFail:THREE.KeepStencilOp,stencilZFail:THREE.KeepStencilOp,stencilZPass:THREE.KeepStencilOp,toneMapped:false}));clearQuad.frustumCulled=false;clearScene.add(clearQuad);
  let lastSource=null;
  const stencilKeys=['stencilWrite','stencilRef','stencilFunc','stencilFuncMask','stencilWriteMask','stencilFail','stencilZFail','stencilZPass'];
  function render(renderer,camera,links,{prepare=()=>{},restore=()=>{},roots=[]}={}){
    camera.updateMatrixWorld();frustum.setFromProjectionMatrix(scratch.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    let selected=null,best=14*14;
    for(const link of links){if(!link.source.visible)continue;const f=portalFrame(link.source),distance=camera.position.distanceToSquared(f.center);if(distance>=best||camera.position.clone().sub(f.center).dot(f.normal)<=.0001||!frustum.intersectsSphere(new THREE.Sphere(f.center,Math.hypot(f.width,f.height)*.5)))continue;selected=link;best=distance;}
    const previous=links.find(link=>link.source===lastSource);if(previous&&previous.source.visible){const f=portalFrame(previous.source),distance=camera.position.distanceToSquared(f.center);if(distance<14*14&&best>distance*.75&&camera.position.clone().sub(f.center).dot(f.normal)>.0001&&frustum.intersectsSphere(new THREE.Sphere(f.center,Math.hypot(f.width,f.height)*.5)))selected=previous;}
    if(!selected){lastSource=null;return;}lastSource=selected.source;
    const travel=passageTransform(selected.source,selected.destination);virtual.copy(camera,false);virtual.matrixAutoUpdate=true;virtual.matrixWorld.copy(travel).multiply(camera.matrixWorld);virtual.matrixWorld.decompose(virtual.position,virtual.quaternion,virtual.scale);virtual.scale.setScalar(1);virtual.updateMatrixWorld();virtual.projectionMatrix.copy(camera.projectionMatrix);
    const end=portalFrame(selected.destination);plane.setFromNormalAndCoplanarPoint(end.normal,end.center.clone().addScaledVector(end.normal,.012)).applyMatrix4(virtual.matrixWorldInverse);clip.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
    const projection=virtual.projectionMatrix.elements;q.set((Math.sign(clip.x)+projection[8])/projection[0],(Math.sign(clip.y)+projection[9])/projection[5],-1,(1+projection[10])/projection[14]);const denominator=clip.dot(q);if(!Number.isFinite(denominator)||Math.abs(denominator)<.0001)return;clip.multiplyScalar(2/denominator);projection[2]=clip.x;projection[6]=clip.y;projection[10]=clip.z+1;projection[14]=clip.w;virtual.projectionMatrixInverse.copy(virtual.projectionMatrix).invert();
    const source=portalFrame(selected.source);renderer.getViewport(viewport);renderer.getScissor(oldScissor);const oldScissorTest=renderer.getScissorTest();renderer.getDrawingBufferSize(drawSize);let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const x of [-.5,.5])for(const y of [-.5,.5]){corner.copy(source.center).addScaledVector(source.right,x*source.width).addScaledVector(source.up,y*source.height).project(camera);minX=Math.min(minX,(corner.x+1)*drawSize.x*.5);maxX=Math.max(maxX,(corner.x+1)*drawSize.x*.5);minY=Math.min(minY,(corner.y+1)*drawSize.y*.5);maxY=Math.max(maxY,(corner.y+1)*drawSize.y*.5);}const sx=Math.max(viewport.x,Math.floor(minX)-2),sy=Math.max(viewport.y,Math.floor(minY)-2),sw=Math.min(viewport.x+viewport.z,Math.ceil(maxX)+2)-sx,sh=Math.min(viewport.y+viewport.w,Math.ceil(maxY)+2)-sy;
    if(!Number.isFinite(sx)||!Number.isFinite(sy)||sw<=0||sh<=0)return;
    const visibility=[],materials=new Map(),autoClear=renderer.autoClear,shadowAuto=renderer.shadowMap.autoUpdate,originalBackground=scene.background,originalFog=scene.fog;
    scene.traverse(object=>visibility.push([object,object.visible]));
    try{
      renderer.autoClear=false;renderer.shadowMap.autoUpdate=false;renderer.setScissor(sx,sy,sw,sh);renderer.setScissorTest(true);
      renderer.clear(false,false,true);mask.matrix.copy(selected.source.matrixWorld);mask.matrixWorldNeedsUpdate=true;mask.material.uniforms.shape.value=selected.source.userData.portalShape||0;renderer.render(maskScene,camera);renderer.render(clearScene,clearCamera);
      prepare(virtual);scene.background=null;
      for(const link of links)link.source.visible=false;
      for(const root of roots)if(root)root.visible=root.position.distanceToSquared(virtual.position)<14400;
      scene.traverseVisible(object=>{if(!object.material)return;for(const material of Array.isArray(object.material)?object.material:[object.material]){if(materials.has(material))continue;materials.set(material,stencilKeys.map(key=>material[key]));material.stencilWrite=true;material.stencilRef=1;material.stencilFunc=THREE.EqualStencilFunc;material.stencilFuncMask=255;material.stencilWriteMask=0;material.stencilFail=material.stencilZFail=material.stencilZPass=THREE.KeepStencilOp;}});
      renderer.render(scene,virtual);
    }finally{
      for(const [material,values]of materials)stencilKeys.forEach((key,i)=>material[key]=values[i]);
      for(const [object,value]of visibility)object.visible=value;
      scene.background=originalBackground;scene.fog=originalFog;renderer.autoClear=autoClear;renderer.shadowMap.autoUpdate=shadowAuto;renderer.setScissor(oldScissor);renderer.setScissorTest(oldScissorTest);restore(camera);
    }
  }
  return {render,release(){},clear(){}};
}
