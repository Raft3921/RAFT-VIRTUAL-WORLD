import * as THREE from 'three';
export function createBodycam(){
 let target=null,primed=false,lastYaw=0,lastPitch=0,lastTime=0,focus=24,focusTarget=24,lastFocusAt=-Infinity;const focusPoint=new THREE.Vector3(),focusRay=new THREE.Raycaster();const size=new THREE.Vector2(),blur=new THREE.Vector2(),forward=new THREE.Vector3();
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{image:{value:null},depthImage:{value:null},pixel:{value:new THREE.Vector2()},blur:{value:blur},time:{value:0},warp:{value:1},nearPlane:{value:.1},farPlane:{value:1000},optics:{value:1},crisp:{value:0},focusDistance:{value:24}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
 uniform sampler2D image;uniform sampler2D depthImage;uniform vec2 pixel;uniform vec2 blur;uniform float time;uniform float warp;uniform float nearPlane;uniform float farPlane;uniform float optics;uniform float crisp;uniform float focusDistance;varying vec2 vUv;
 float distanceAt(vec2 uv){float d=texture2D(depthImage,clamp(uv,0.,1.)).r;return nearPlane*farPlane/max(.0001,farPlane-(farPlane-nearPlane)*d);}
 vec3 sampleAt(vec2 uv){return texture2D(image,clamp(uv,0.,1.)).rgb;}
 void main(){vec2 p=vUv*2.-1.;vec2 uv=p*mix(1.,.88+.18*dot(p,p),warp)*.5+.5;
 // Indoor life uses one sharp color sample: no depth-of-field or motion-blur taps.
 if(crisp>.5){gl_FragColor=vec4(sampleAt(uv),1.);
 #include <colorspace_fragment>
 return;}
 if(optics<.001&&dot(blur,blur)<.0000000001){vec3 sharp=sampleAt(uv);float edge=1.-smoothstep(.35,1.65,dot(p,p))*.18;float grain=(fract(sin(dot(gl_FragCoord.xy+time,vec2(12.9898,78.233)))*43758.5453)-.5 )*.002;gl_FragColor=vec4(sharp*edge+grain,1.);
 #include <colorspace_fragment>
 return;}
 float z=optics>.001?distanceAt(uv):1.,focus=optics>.001?max(2.5,focusDistance):1.;
 // World autofocus ignores the foreground hands; reciprocal depth keeps distant detail crisp.
 float distanceError=abs(1./max(z,.15)-1./focus);float coc=smoothstep(.025,.22,distanceError)*optics*smoothstep(.8,1.6,z);float center=1.-smoothstep(.15,.75,length(p));vec2 dof=pixel*2.8*coc*(1.-center*.55);
 vec2 offsets[4];offsets[0]=blur+dof;offsets[1]=-blur-dof;offsets[2]=blur*.45+vec2(dof.x,-dof.y);offsets[3]=-blur*.45+vec2(-dof.x,dof.y);
 if(coc<.001&&dot(blur,blur)<.0000000001){vec3 sharp=sampleAt(uv);float edge=1.-smoothstep(.35,1.65,dot(p,p))*.18;float grain=(fract(sin(dot(gl_FragCoord.xy+time,vec2(12.9898,78.233)))*43758.5453)-.5 )*.002;gl_FragColor=vec4(sharp*edge+grain,1.);
 #include <colorspace_fragment>
 return;}
 vec3 col=sampleAt(uv)*.5;float total=.5;
 for(int i=0;i<4;i++){vec2 q=uv+offsets[i];float neighbor=optics>.001?distanceAt(q):z;float weight=.125*(1.-smoothstep(max(.5,z*.12),max(1.,z*.35),abs(neighbor-z)));col+=sampleAt(q)*weight;total+=weight;}col/=total;
 float edge=1.-smoothstep(.35,1.65,dot(p,p))*.18;float grain=(fract(sin(dot(gl_FragCoord.xy+time,vec2(12.9898,78.233)))*43758.5453)-.5 )*.002;gl_FragColor=vec4(col*edge+grain,1.);
 #include <colorspace_fragment>
 }`});
 const scene=new THREE.Scene(),camera=new THREE.Camera();scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
 return {mapNdc(p,strength=1){const amount=Number.isFinite(strength)?THREE.MathUtils.clamp(strength,0,2):1;const f=1+amount*(-.12+.18*p.lengthSq());p.multiplyScalar(f);},reset(){primed=false;},render(renderer,world,view,state){
  renderer.getDrawingBufferSize(size);const maxWidth=state.video?.postResolution==='native'?size.x:Number(state.video?.postResolution)||1280,scale=Math.min(1,maxWidth/size.x),w=Math.max(1,Math.floor(size.x*scale)),h=Math.max(1,Math.floor(size.y*scale));
  if(!target){target=new THREE.WebGLRenderTarget(w,h,{depthBuffer:true,depthTexture:new THREE.DepthTexture(w,h,THREE.UnsignedIntType)});material.uniforms.image.value=target.texture;material.uniforms.depthImage.value=target.depthTexture;}else if(target.width!==w||target.height!==h)target.setSize(w,h);
  const samples=['high','ultra'].includes(state.video?.quality)?4:0;if(target.samples!==samples){target.dispose();target.samples=samples;}
  view.getWorldDirection(forward);const yaw=Math.atan2(forward.x,forward.z),pitch=Math.asin(THREE.MathUtils.clamp(forward.y,-1,1)),dt=Math.max(.008,Math.min(.05,state.time-lastTime)),yawDelta=primed?Math.atan2(Math.sin(yaw-lastYaw),Math.cos(yaw-lastYaw)):0,pitchDelta=primed?pitch-lastPitch:0;
  if(state.time-lastFocusAt>.12&&state.world&&!state.living){
   lastFocusAt=state.time;focusPoint.copy(view.position).addScaledVector(forward,90);const hit=state.world.cameraPosition(view.position,focusPoint,.01);focusTarget=Math.max(2.5,Math.min(60,view.position.distanceTo(hit)));
   if(state.targets?.length){focusRay.set(view.position,forward);focusRay.far=focusTarget;const targetHit=focusRay.intersectObjects(state.targets,true)[0];if(targetHit)focusTarget=Math.max(2.5,targetHit.distance);}
  }
  focus=THREE.MathUtils.damp(focus,focusTarget,6,dt);material.uniforms.focusDistance.value=focus;
  lastYaw=yaw;lastPitch=pitch;lastTime=state.time;primed=true;const walking=state.grounded?state.speed:0;
  blur.set(THREE.MathUtils.clamp(yawDelta/dt*.00035,-.0009,.0009)+walking*.000008,THREE.MathUtils.clamp(pitchDelta/dt*.0003,-.0008,.0008));blur.multiplyScalar(1-(state.scopeBlend||0)*.7);if(state.video?.motionBlur===false)blur.set(0,0);
  material.uniforms.crisp.value=state.living?1:0;
  const filter=state.living?THREE.NearestFilter:THREE.LinearFilter;if(target.texture.magFilter!==filter){target.texture.magFilter=target.texture.minFilter=filter;target.texture.needsUpdate=true;}
  material.uniforms.pixel.value.set(1/w,1/h);material.uniforms.time.value=state.time;material.uniforms.warp.value=state.scopeFromThird?0:(1-(state.scopeBlend||0))*THREE.MathUtils.clamp(state.character.fisheye??1,0,2);material.uniforms.optics.value=state.character.depthOfField===false||state.video?.depthOfField===false?0:1-(state.scopeBlend||0);material.uniforms.nearPlane.value=view.near;material.uniforms.farPlane.value=view.far;
  const previous=renderer.getRenderTarget();renderer.setRenderTarget(target);renderer.render(world,view);renderer.setRenderTarget(previous);renderer.render(scene,camera);
 }};
}
