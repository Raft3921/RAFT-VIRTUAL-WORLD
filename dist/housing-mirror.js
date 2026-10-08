import * as THREE from 'three';

// One shared, low-resolution reflection pass for the nearest visible mirror.
// Furniture outside the interaction distance remains a cheap flat surface.
export function createHousingMirrors(scene){
  const geometry=new THREE.PlaneGeometry(1,1),target=new THREE.WebGLRenderTarget(256,256,{depthBuffer:true}),virtual=new THREE.PerspectiveCamera(),entries=new Set();
  const textureMatrix=new THREE.Matrix4(),bias=new THREE.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
  const point=new THREE.Vector3(),normal=new THREE.Vector3(),eye=new THREE.Vector3(),direction=new THREE.Vector3(),up=new THREE.Vector3(),look=new THREE.Vector3(),rotation=new THREE.Matrix4(),clip=new THREE.Vector4(),q=new THREE.Vector4(),plane=new THREE.Plane();
  let lastUpdate=-Infinity,lastMirror=null;
  function add(group,id,part){
    const material=new THREE.ShaderMaterial({uniforms:{reflection:{value:target.texture},textureMatrix:{value:new THREE.Matrix4()},strength:{value:0}},vertexShader:'uniform mat4 textureMatrix; varying vec4 mirrorUV; void main(){mirrorUV=textureMatrix*modelMatrix*vec4(position,1.0); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform sampler2D reflection; uniform float strength; varying vec4 mirrorUV; void main(){vec3 c=vec3(.43,.63,.68); if(strength>0.0){vec2 uv=mirrorUV.xy/mirrorUV.w; if(mirrorUV.w>0.0 && all(greaterThanEqual(uv,vec2(0.0))) && all(lessThanEqual(uv,vec2(1.0)))) c=mix(c,texture2D(reflection,uv).rgb,strength);} gl_FragColor=vec4(c,1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
    const mesh=new THREE.Mesh(geometry,material);mesh.visible=false;mesh.userData.itemId=id;group.add(mesh);const entry={mesh,part};entries.add(entry);return entry;
  }
  function remove(entry){entries.delete(entry);entry.mesh.removeFromParent();entry.mesh.material.dispose();}
  function update(renderer,camera,player,time,mobile=false,actor=null){
    let nearest=null,best=Infinity;camera.updateMatrixWorld();
    for(const entry of entries){entry.mesh.visible=false;entry.mesh.material.uniforms.strength.value=0;if(!entry.mesh.parent?.visible||!player)continue;entry.mesh.updateWorldMatrix(true,false);point.setFromMatrixPosition(entry.mesh.matrixWorld);normal.set(0,0,1).transformDirection(entry.mesh.matrixWorld);const d=point.distanceToSquared(camera.position);if(d<144&&point.distanceToSquared(player)<36&&eye.copy(camera.position).sub(point).dot(normal)>0&&d<best){best=d;nearest=entry;}}
    if(!nearest)return;
    nearest.mesh.visible=true;nearest.mesh.material.uniforms.strength.value=nearest===lastMirror ? .96 : 0;
    if(time-lastUpdate<(mobile ? .24 : .16))return;
    lastUpdate=time;lastMirror=nearest;nearest.mesh.material.uniforms.strength.value=.96;const mesh=nearest.mesh;point.setFromMatrixPosition(mesh.matrixWorld);normal.set(0,0,1).transformDirection(mesh.matrixWorld);
    eye.copy(camera.position).sub(point).reflect(normal).add(point);virtual.position.copy(eye);
    rotation.extractRotation(camera.matrixWorld);direction.set(0,0,-1).applyMatrix4(rotation).reflect(normal);up.set(0,1,0).applyMatrix4(rotation).reflect(normal);virtual.up.copy(up);look.copy(eye).add(direction);virtual.lookAt(look);virtual.far=camera.far;virtual.near=camera.near;virtual.updateMatrixWorld();virtual.projectionMatrix.copy(camera.projectionMatrix);
    textureMatrix.copy(bias).multiply(virtual.projectionMatrix).multiply(virtual.matrixWorldInverse);mesh.material.uniforms.textureMatrix.value.copy(textureMatrix);
    // Oblique clipping removes geometry behind the reflective plane.
    plane.setFromNormalAndCoplanarPoint(normal,point).applyMatrix4(virtual.matrixWorldInverse);clip.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);const e=virtual.projectionMatrix.elements;q.set((Math.sign(clip.x)+e[8])/e[0],(Math.sign(clip.y)+e[9])/e[5],-1,(1+e[10])/e[14]);const denominator=clip.dot(q);if(Math.abs(denominator)<1e-5)return;clip.multiplyScalar(2/denominator);e[2]=clip.x;e[6]=clip.y;e[10]=clip.z+1-.003;e[14]=clip.w;virtual.projectionMatrixInverse.copy(virtual.projectionMatrix).invert();
    const oldTarget=renderer.getRenderTarget(),oldXR=renderer.xr.enabled,oldShadows=renderer.shadowMap.autoUpdate,visible=mesh.visible,actorVisible=actor?.visible;
    try{mesh.visible=false;if(actor)actor.visible=true;renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,virtual);}
    finally{mesh.visible=visible;if(actor)actor.visible=actorVisible;renderer.xr.enabled=oldXR;renderer.shadowMap.autoUpdate=oldShadows;renderer.setRenderTarget(oldTarget);}
  }
  return {add,remove,update};
}
