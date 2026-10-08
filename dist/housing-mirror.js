import * as THREE from 'three';

// Self-only mirrors: a flat backing plus a shared portrait-sized render target.
// Never render the world, housing instances, grass, particles or shadows twice.
export function createHousingMirrors(){
  const geometry=new THREE.PlaneGeometry(1,1),target=new THREE.WebGLRenderTarget(128,128,{depthBuffer:true}),virtual=new THREE.PerspectiveCamera(),entries=new Set(),portrait=new THREE.Scene();
  portrait.add(new THREE.HemisphereLight(0xe9f7ff,0x697a82,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(3,6,5);portrait.add(light);
  const textureMatrix=new THREE.Matrix4(),bias=new THREE.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
  const point=new THREE.Vector3(),normal=new THREE.Vector3(),eye=new THREE.Vector3(),direction=new THREE.Vector3(),up=new THREE.Vector3(),look=new THREE.Vector3(),rotation=new THREE.Matrix4(),clearColor=new THREE.Color();
  let lastUpdate=-Infinity,lastMirror=null,sourceActor=null,copies=[];
  function add(group,id,part){
    const material=new THREE.ShaderMaterial({uniforms:{reflection:{value:target.texture},textureMatrix:{value:new THREE.Matrix4()},strength:{value:0}},vertexShader:'uniform mat4 textureMatrix; varying vec4 mirrorUV; void main(){mirrorUV=textureMatrix*modelMatrix*vec4(position,1.0); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform sampler2D reflection; uniform float strength; varying vec4 mirrorUV; void main(){vec3 c=vec3(.43,.63,.68); if(strength>0.0 && mirrorUV.w>0.0){vec2 uv=mirrorUV.xy/mirrorUV.w; if(all(greaterThanEqual(uv,vec2(0.0))) && all(lessThanEqual(uv,vec2(1.0)))){vec4 reflected=texture2D(reflection,uv);c=mix(c,reflected.rgb,reflected.a*strength);}} gl_FragColor=vec4(c,1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
    const mesh=new THREE.Mesh(geometry,material);mesh.visible=false;mesh.userData.itemId=id;group.add(mesh);const entry={mesh,part};entries.add(entry);return entry;
  }
  function remove(entry){entries.delete(entry);entry.mesh.removeFromParent();entry.mesh.material.dispose();if(lastMirror===entry)lastMirror=null;}
  function syncActor(actor){
    if(sourceActor!==actor){for(const {copy}of copies)copy.removeFromParent();copies=[];sourceActor=actor;actor.traverse(source=>{if(!source.isMesh)return;const copy=new THREE.Mesh(source.geometry,source.material);copy.matrixAutoUpdate=false;copy.frustumCulled=false;copy.castShadow=copy.receiveShadow=false;portrait.add(copy);copies.push({source,copy});});}
    actor.updateWorldMatrix(true,true);
    for(const {source,copy}of copies){let visible=true;for(let p=source;p&&p!==actor;p=p.parent)if(!p.visible){visible=false;break;}copy.visible=visible;copy.matrix.copy(source.matrixWorld);copy.matrixWorldNeedsUpdate=true;}
  }
  function update(renderer,camera,player,time,mobile=false,actor=null){
    let nearest=null,best=Infinity;camera.updateMatrixWorld();
    for(const entry of entries){entry.mesh.visible=false;entry.mesh.material.uniforms.strength.value=0;if(!entry.mesh.parent?.visible||!player||!actor)continue;entry.mesh.updateWorldMatrix(true,false);point.setFromMatrixPosition(entry.mesh.matrixWorld);normal.set(0,0,1).transformDirection(entry.mesh.matrixWorld);const d=point.distanceToSquared(camera.position);if(d<144&&point.distanceToSquared(player)<25&&eye.copy(camera.position).sub(point).dot(normal)>.03&&d<best){best=d;nearest=entry;}}
    if(!nearest)return;
    const same=nearest===lastMirror&&sourceActor===actor;nearest.mesh.visible=true;nearest.mesh.material.uniforms.strength.value=same?1:0;
    if(same&&time-lastUpdate<(mobile ? .5 : .35))return;
    const size=mobile?96:128;if(target.width!==size)target.setSize(size,size);
    lastUpdate=time;lastMirror=nearest;syncActor(actor);const mesh=nearest.mesh;point.setFromMatrixPosition(mesh.matrixWorld);normal.set(0,0,1).transformDirection(mesh.matrixWorld);
    eye.copy(camera.position).sub(point).reflect(normal).add(point);virtual.position.copy(eye);rotation.extractRotation(camera.matrixWorld);direction.set(0,0,-1).applyMatrix4(rotation).reflect(normal);up.set(0,1,0).applyMatrix4(rotation).reflect(normal);virtual.up.copy(up);look.copy(eye).add(direction);virtual.lookAt(look);virtual.near=.03;virtual.far=40;virtual.updateMatrixWorld();
    // Keep exactly the same projected UV and camera basis on all four walls.
    // An avatar-only pass needs no oblique plane that can clip its own face.
    virtual.projectionMatrix.copy(camera.projectionMatrix);virtual.projectionMatrixInverse.copy(virtual.projectionMatrix).invert();textureMatrix.copy(bias).multiply(virtual.projectionMatrix).multiply(virtual.matrixWorldInverse);mesh.material.uniforms.textureMatrix.value.copy(textureMatrix);
    const oldTarget=renderer.getRenderTarget(),oldXR=renderer.xr.enabled,oldShadows=renderer.shadowMap.autoUpdate,oldAlpha=renderer.getClearAlpha();renderer.getClearColor(clearColor);
    try{renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(target);renderer.setClearColor(0x000000,0);renderer.clear();renderer.render(portrait,virtual);mesh.material.uniforms.strength.value=1;}
    finally{renderer.setClearColor(clearColor,oldAlpha);renderer.xr.enabled=oldXR;renderer.shadowMap.autoUpdate=oldShadows;renderer.setRenderTarget(oldTarget);}
  }
  return {add,remove,update};
}
