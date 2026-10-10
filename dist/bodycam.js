import * as THREE from 'three';
export function createBodycam(){
 let target=null,last=new THREE.Quaternion(),primed=false;const size=new THREE.Vector2(),blur=new THREE.Vector2();
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{image:{value:null},blur:{value:blur},time:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D image;uniform vec2 blur;uniform float time;varying vec2 vUv;
 void main(){vec2 p=vUv*2.-1.;vec2 uv=p*(.88+.18*dot(p,p))*.5+.5;vec3 col=texture2D(image,clamp(uv,0.,1.)).rgb*.5+texture2D(image,clamp(uv+blur,0.,1.)).rgb*.25+texture2D(image,clamp(uv-blur,0.,1.)).rgb*.25;float edge=1.-smoothstep(.35,1.65,dot(p,p))*.62;float grain=(fract(sin(dot(gl_FragCoord.xy+time,vec2(12.9898,78.233)))*43758.5453)-.5)*.012;gl_FragColor=vec4(col*edge+grain,1.);
 #include <colorspace_fragment>
 }`});
 const scene=new THREE.Scene(),camera=new THREE.Camera();scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
 return {mapNdc(p){const f=.88+.18*p.lengthSq();p.multiplyScalar(f);},reset(){primed=false;},render(renderer,world,view,state){renderer.getDrawingBufferSize(size);const scale=Math.min(1,1280/size.x),w=Math.max(1,Math.floor(size.x*scale)),h=Math.max(1,Math.floor(size.y*scale));if(!target){target=new THREE.WebGLRenderTarget(w,h,{depthBuffer:true});material.uniforms.image.value=target.texture;}else if(target.width!==w||target.height!==h)target.setSize(w,h);const delta=primed?last.angleTo(view.quaternion):0;last.copy(view.quaternion);primed=true;blur.set(Math.min(.009,delta*.06+state.speed*.00015),Math.min(.004,delta*.018));material.uniforms.time.value=state.time;const previous=renderer.getRenderTarget();renderer.setRenderTarget(target);renderer.render(world,view);renderer.setRenderTarget(previous);renderer.render(scene,camera);}};
}
