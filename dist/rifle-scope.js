import * as THREE from 'three';
// A real magnified scene is rendered onto the ocular lens of the held rifle.
export function createRifleScope(){
 let model=null,lens=null,original=null,target=null;const view=new THREE.PerspectiveCamera(12,1,.05,2600),size=new THREE.Vector2();
 const material=new THREE.ShaderMaterial({toneMapped:false,uniforms:{image:{value:null},ready:{value:0},aim:{value:0},eye:{value:new THREE.Vector2()},clock:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
 uniform sampler2D image;uniform float ready,aim,clock;uniform vec2 eye;varying vec2 vUv;
 void main(){vec2 p=vUv*2.-1.;float radius=length(p);if(radius>1.)discard;
 vec2 offset=eye*(1.-aim*.65);vec2 q=(p+offset)*(.985+.018*dot(p,p))*.5+.5;
 vec3 imageColor=texture2D(image,clamp(q,.002,.998)).rgb;
 float vignette=1.-smoothstep(.73,.99,length(p+offset))* .98;
 vec3 glass=vec3(.025,.055,.07)+vec3(.055,.085,.10)*pow(max(0.,1.-length(p-vec2(-.32,.43))),3.);
 vec3 col=mix(glass,imageColor*vignette,ready*smoothstep(.12,.8,aim));
 float hair=(1.-step(.0027,abs(p.x)))*step(.045,abs(p.y))+(1.-step(.0027,abs(p.y)))*step(.045,abs(p.x));
 float ticks=step(.13,abs(p.y))*step(abs(p.y),.76)*(1.-step(.005,abs(mod(abs(p.y)+.07,.14)-.07)))*(1.-step(.025,abs(p.x)));
 ticks+=step(.13,abs(p.x))*step(abs(p.x),.76)*(1.-step(.005,abs(mod(abs(p.x)+.07,.14)-.07)))*(1.-step(.025,abs(p.y)));
 col=mix(col,vec3(.008,.012,.01),clamp(hair+ticks,0.,1.)*smoothstep(.3,.9,aim));
 float dotCenter=1.-smoothstep(.003,.008,radius);col=mix(col,vec3(.58,.065,.035),dotCenter*aim);
 float rim=smoothstep(.91,.99,radius)*(1.-smoothstep(.99,1.,radius));col+=vec3(.025,.055,.075)*rim;
 float reflection=pow(max(0.,1.-abs(p.x*.48+p.y-.73)),18.)*.08*(1.-aim*.8);col+=vec3(.5,.75,.85)*reflection;
 gl_FragColor=vec4(col,1.);
 #include <colorspace_fragment>
 }`});
 function attach(next){if(model===next)return;if(lens)lens.material=original;model=next;lens=next?.scopeLens||null;original=lens?.material;if(lens)lens.material=material;material.uniforms.ready.value=0;}
 return {attach,render(renderer,scene,camera,state,weight,rig,sway){
  attach(rig.children.find(child=>child.userData.weapon==='sniper'));if(!lens)return;
  material.uniforms.aim.value=weight;material.uniforms.eye.value.set(sway.x*3,sway.y*3);material.uniforms.clock.value=state.time;
  if(weight<.025||state.paused)return;
  renderer.getDrawingBufferSize(size);const side=Math.max(256,Math.min(renderer.capabilities.maxTextureSize,2048,Math.ceil(size.y*.75/32)*32));
  if(!target){target=new THREE.WebGLRenderTarget(side,side,{depthBuffer:true});material.uniforms.image.value=target.texture;}else if(target.width!==side)target.setSize(side,side);
  const magnification=THREE.MathUtils.smoothstep(weight,0,1);view.position.copy(camera.position);view.quaternion.copy(camera.quaternion);view.fov=THREE.MathUtils.lerp(36,11,magnification);view.far=camera.far;view.updateProjectionMatrix();view.updateMatrixWorld();
  const previous=renderer.getRenderTarget(),xr=renderer.xr.enabled,auto=renderer.shadowMap.autoUpdate,needs=renderer.shadowMap.needsUpdate,rigVisible=rig.visible,avatar=state.avatar?.root,avatarVisible=avatar?.visible;
  rig.visible=false;if(avatar)avatar.visible=false;renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;
  try{renderer.setRenderTarget(target);renderer.render(scene,view);material.uniforms.ready.value=1;}
  finally{renderer.setRenderTarget(previous);renderer.xr.enabled=xr;renderer.shadowMap.autoUpdate=auto;renderer.shadowMap.needsUpdate=needs;rig.visible=rigVisible;if(avatar)avatar.visible=avatarVisible;}
 },detach(){attach(null);},get attached(){return !!lens;}};
}
