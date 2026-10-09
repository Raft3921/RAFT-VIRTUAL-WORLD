import * as THREE from 'three';

const turn=new THREE.Matrix4().makeRotationY(Math.PI);
// Normalize scale and handedness: reflected gateway meshes have a negative
// determinant, while cameras and travelling bodies need a proper rotation.
export function portalFrame(mesh){
  mesh.updateWorldMatrix(true,false);
  const center=new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld);
  const normal=new THREE.Vector3(0,0,1).transformDirection(mesh.matrixWorld);
  const up=new THREE.Vector3(0,1,0).transformDirection(mesh.matrixWorld);
  const right=new THREE.Vector3().crossVectors(up,normal).normalize();up.crossVectors(normal,right).normalize();
  const matrix=new THREE.Matrix4().makeBasis(right,up,normal).setPosition(center);
  const size=new THREE.Vector3().setFromMatrixScale(mesh.matrixWorld);
  return {center,normal,up,right,matrix,width:Math.abs(size.x),height:Math.abs(size.y)};
}
export function passageTransform(source,destination){return portalFrame(destination).matrix.multiply(turn).multiply(portalFrame(source).matrix.invert());}

// Screen-projected portal textures retain the viewer's perspective. Oblique
// near clipping removes the wall behind the destination window. Only the
// visible mirror pixels display the linked room; the surrounding world stays
// in its own space. No recursively nested render passes are required.
export function createPortalViews(scene){
  const pool=new Map(),virtual=new THREE.PerspectiveCamera(),plane=new THREE.Plane(),clip=new THREE.Vector4(),q=new THREE.Vector4(),size=new THREE.Vector2();
  let frame=0;
  function release(mesh){const entry=pool.get(mesh);if(!entry)return;entry.target.dispose();entry.material.dispose();mesh.material=entry.previous;pool.delete(mesh);}
  function resource(mesh,width,height){
    let entry=pool.get(mesh);
    if(!entry){if(pool.size>=8){const oldest=[...pool.entries()].sort((a,b)=>a[1].lastSeen-b[1].lastSeen)[0];release(oldest[0]);}
      const target=new THREE.WebGLRenderTarget(width,height,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true,stencilBuffer:false});target.texture.generateMipmaps=false;
      const material=new THREE.ShaderMaterial({uniforms:{map:{value:target.texture},shape:{value:mesh.userData.portalShape||0}},vertexShader:'varying vec4 portalClip; varying vec2 portalUV; void main(){portalUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);portalClip=gl_Position;}',fragmentShader:`uniform sampler2D map; uniform float shape; varying vec4 portalClip; varying vec2 portalUV;
        void main(){vec2 p=portalUV*2.0-1.0;if(shape==1.0&&dot(p,p)>1.0)discard;if(shape==2.0&&abs(p.x)>1.0-abs(p.y)*.4)discard;if(shape==3.0&&p.y>0.0&&dot(p,p)>1.0)discard;
          vec2 screen=portalClip.xy/portalClip.w*.5+.5;gl_FragColor=texture2D(map,screen);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,side:THREE.FrontSide,toneMapped:false});
      entry={target,material,previous:mesh.material,lastSeen:frame,lastRendered:-Infinity};pool.set(mesh,entry);mesh.material=material;
    }
    if(entry.target.width!==width||entry.target.height!==height)entry.target.setSize(width,height);
    entry.lastSeen=frame;return entry;
  }
  function render(renderer,camera,links,{mobile=false,prepare=()=>{},restore=()=>{},roots=[]}={}){
    frame++;camera.updateMatrixWorld();
    const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    const visible=links.filter(link=>{if(!link.source.visible)return false;const f=portalFrame(link.source),distance=camera.position.distanceTo(f.center);return distance<32&&camera.position.clone().sub(f.center).dot(f.normal)>.015&&frustum.intersectsSphere(new THREE.Sphere(f.center,Math.hypot(f.width,f.height)*.5));});
    visible.sort((a,b)=>camera.position.distanceToSquared(portalFrame(a.source).center)-camera.position.distanceToSquared(portalFrame(b.source).center));visible.length=Math.min(8,visible.length);
    renderer.getSize(size);const max=mobile?480:768,scale=Math.min(1,max/Math.max(size.x,size.y)),width=Math.max(64,Math.round(size.x*scale)),height=Math.max(64,Math.round(size.y*scale));
    for(const link of visible)resource(link.source,width,height);
    visible.sort((a,b)=>pool.get(a.source).lastRendered-pool.get(b.source).lastRendered||camera.position.distanceToSquared(portalFrame(a.source).center)-camera.position.distanceToSquared(portalFrame(b.source).center));
    const viewport=renderer.getViewport(new THREE.Vector4()),scissor=renderer.getScissor(new THREE.Vector4()),scissorTest=renderer.getScissorTest(),oldTarget=renderer.getRenderTarget(),oldAutoClear=renderer.autoClear,oldShadowUpdate=renderer.shadowMap.autoUpdate;
    try{
      renderer.shadowMap.autoUpdate=false;renderer.autoClear=true;renderer.setScissorTest(false);
      for(const link of visible.slice(0,mobile?2:3)){
        const entry=pool.get(link.source);if(!entry)continue;
        const travel=passageTransform(link.source,link.destination);virtual.copy(camera,false);virtual.matrixAutoUpdate=true;virtual.matrixWorld.copy(travel).multiply(camera.matrixWorld);virtual.matrixWorld.decompose(virtual.position,virtual.quaternion,virtual.scale);virtual.scale.setScalar(1);virtual.updateMatrixWorld();virtual.projectionMatrix.copy(camera.projectionMatrix);
        const end=portalFrame(link.destination);plane.setFromNormalAndCoplanarPoint(end.normal,end.center.clone().addScaledVector(end.normal,.012));plane.applyMatrix4(virtual.matrixWorldInverse);clip.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
        const projection=virtual.projectionMatrix.elements;q.set((Math.sign(clip.x)+projection[8])/projection[0],(Math.sign(clip.y)+projection[9])/projection[5],-1,(1+projection[10])/projection[14]);clip.multiplyScalar(2/clip.dot(q));projection[2]=clip.x;projection[6]=clip.y;projection[10]=clip.z+1;projection[14]=clip.w;virtual.projectionMatrixInverse.copy(virtual.projectionMatrix).invert();
        const visibility=[];scene.traverse(object=>visibility.push([object,object.visible]));
        try{prepare(virtual);for(const other of links)other.source.visible=false;for(const root of roots)if(root)root.visible=root.position.distanceToSquared(virtual.position)<14400;
          renderer.setRenderTarget(entry.target);renderer.clear();renderer.render(scene,virtual);entry.lastRendered=frame;
        }finally{for(const [object,value]of visibility)object.visible=value;restore(camera);}
      }
    }finally{renderer.setRenderTarget(oldTarget);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);renderer.autoClear=oldAutoClear;renderer.shadowMap.autoUpdate=oldShadowUpdate;}
    for(const [mesh,entry]of pool)if(frame-entry.lastSeen>180)release(mesh);
  }
  return {render,release,clear(){for(const mesh of [...pool.keys()])release(mesh);}};
}
