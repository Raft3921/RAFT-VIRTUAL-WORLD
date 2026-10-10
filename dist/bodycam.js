import * as THREE from 'three';
export function createBodycam(){
 let target=null,primed=false,lastYaw=0,lastPitch=0,lastTime=0;const size=new THREE.Vector2(),blur=new THREE.Vector2(),forward=new THREE.Vector3();
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{image:{value:null},depthImage:{value:null},pixel:{value:new THREE.Vector2()},blur:{value:blur},time:{value:0},warp:{value:1},nearPlane:{value:.1},farPlane:{value:1000},optics:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
 uniform sampler2D image;uniform sampler2D depthImage;uniform vec2 pixel;uniform vec2 blur;uniform float time;uniform float warp;uniform float nearPlane;uniform float farPlane;uniform float optics;varying vec2 vUv;
 float distanceAt(vec2 uv){float d=texture2D(depthImage,clamp(uv,0.,1.)).r;return nearPlane*farPlane/max(.0001,farPlane-(farPlane-nearPlane)*d);}
 vec3 sampleAt(vec2 uv){return texture2D(image,clamp(uv,0.,1.)).rgb;}
 void main(){vec2 p=vUv*2.-1.;vec2 uv=p*mix(1.,.88+.18*dot(p,p),warp)*.5+.5;float z=distanceAt(uv),focus=clamp(distanceAt(vec2(.5)),8.,35.);
 // A small depth-dependent circle of confusion. The held hand and aim remain crisp.
 float coc=smoothstep(2.,4.,z)*clamp(abs(z-focus)/max(focus,8.)*.75,0.,1.)*optics;vec2 dof=pixel*1.6*coc;
 vec2 offsets[4];offsets[0]=blur+dof;offsets[1]=-blur-dof;offsets[2]=blur*.45+vec2(dof.x,-dof.y);offsets[3]=-blur*.45+vec2(-dof.x,dof.y);
 vec3 col=sampleAt(uv)*.5;float total=.5;
 for(int i=0;i<4;i++){vec2 q=uv+offsets[i];float neighbor=distanceAt(q);float weight=.125*(1.-smoothstep(max(.5,z*.12),max(1.,z*.35),abs(neighbor-z)));col+=sampleAt(q)*weight;total+=weight;}col/=total;
 float edge=1.-smoothstep(.35,1.65,dot(p,p))*.62;float grain=(fract(sin(dot(gl_FragCoord.xy+time,vec2(12.9898,78.233)))*43758.5453)-.5)*.009;gl_FragColor=vec4(col*edge+grain,1.);
 #include <colorspace_fragment>
 }`});
 const scene=new THREE.Scene(),camera=new THREE.Camera();scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
 return {mapNdc(p,strength=1){const amount=Number.isFinite(strength)?THREE.MathUtils.clamp(strength,0,2):1;const f=1+amount*(-.12+.18*p.lengthSq());p.multiplyScalar(f);},reset(){primed=false;},render(renderer,world,view,state){
  renderer.getDrawingBufferSize(size);const scale=Math.min(1,1280/size.x),w=Math.max(1,Math.floor(size.x*scale)),h=Math.max(1,Math.floor(size.y*scale));
  if(!target){target=new THREE.WebGLRenderTarget(w,h,{depthBuffer:true,depthTexture:new THREE.DepthTexture(w,h,THREE.UnsignedShortType)});material.uniforms.image.value=target.texture;material.uniforms.depthImage.value=target.depthTexture;}else if(target.width!==w||target.height!==h)target.setSize(w,h);
  view.getWorldDirection(forward);const yaw=Math.atan2(forward.x,forward.z),pitch=Math.asin(THREE.MathUtils.clamp(forward.y,-1,1)),dt=Math.max(.008,Math.min(.05,state.time-lastTime)),yawDelta=primed?Math.atan2(Math.sin(yaw-lastYaw),Math.cos(yaw-lastYaw)):0,pitchDelta=primed?pitch-lastPitch:0;
  lastYaw=yaw;lastPitch=pitch;lastTime=state.time;primed=true;const walking=state.grounded?state.speed:0;
  blur.set(THREE.MathUtils.clamp(yawDelta/dt*.0025,-.005,.005)+walking*.000035,THREE.MathUtils.clamp(pitchDelta/dt*.002,-.003,.003));if(state.scoped)blur.multiplyScalar(.3);
  material.uniforms.pixel.value.set(1/w,1/h);material.uniforms.time.value=state.time;material.uniforms.warp.value=state.scoped?0:THREE.MathUtils.clamp(state.character.fisheye??1,0,2);material.uniforms.optics.value=state.scoped?.3:1;material.uniforms.nearPlane.value=view.near;material.uniforms.farPlane.value=view.far;
  const previous=renderer.getRenderTarget();renderer.setRenderTarget(target);renderer.render(world,view);renderer.setRenderTarget(previous);renderer.render(scene,camera);
 }};
}
