import * as THREE from './vendor/three.module.js';
// One bounded draw; deterministic seeds, no per-frame allocations or lights.
export function createGunWeather(group,map){
 if(!map.snow)return {update(){},overview(){}};
 const n=420,points=new Float32Array(n*3);for(let i=0;i<n;i++){points[i*3]=((i*73.731)%1-.5)*56;points[i*3+1]=(i*17.321)%32;points[i*3+2]=((i*39.197)%1-.5)*56;}
 const uniforms={uTime:{value:0},uCenter:{value:new THREE.Vector3()},uPixel:{value:Math.min(2,globalThis.devicePixelRatio||1)}};
 const q=map.zone,geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(points,3));
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,vertexShader:`uniform float uTime;uniform float uPixel;uniform vec3 uCenter;varying float vFade;void main(){vec3 p=position;p.x+=sin(uTime*.25+position.z)*.8+sin(uTime*.12)*1.2;p.y=mod(position.y-uTime*(.8+fract(position.x)*.4),32.)-3.;p+=uCenter;vFade=step(${q.minX.toFixed(3)},p.x)*step(p.x,${q.maxX.toFixed(3)})*step(${q.minZ.toFixed(3)},p.z)*step(p.z,${q.maxZ.toFixed(3)})*smoothstep(.12,1.,p.y)*(1.-smoothstep(20.,30.,length(p.xz-uCenter.xz)));vec4 eye=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*eye;gl_PointSize=clamp(65.*uPixel/max(1.,-eye.z),1.,4.*uPixel);}`,fragmentShader:'varying float vFade;void main(){float r=length(gl_PointCoord-.5);float a=(1.-smoothstep(.12,.5,r))*vFade*.48;if(a<.01)discard;gl_FragColor=vec4(.88,.94,1.,a);}'});
 const mesh=new THREE.Points(geometry,material);mesh.frustumCulled=false;mesh.visible=false;group.add(mesh);let overview=false;
 return {overview(value){overview=value;},update(time,p,covered=false){mesh.visible=!overview&&!!p&&!covered&&p.x>q.minX-12&&p.x<q.maxX+12&&p.z>q.minZ-12&&p.z<q.maxZ+12;if(!mesh.visible)return;uniforms.uTime.value=time;uniforms.uCenter.value.copy(p);}};
}
