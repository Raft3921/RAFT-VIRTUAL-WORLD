import {HOUSES,ROOM} from './housing-data.js';

export const STREET_LAMPS=[[-25,20],[25,20],[-25,62],[25,62],[16,-15],[-34,12],[60,27],[78,27]];
export const nightLight={value:0};
const patched=new WeakSet();
const lampFill=STREET_LAMPS.map(([x,z])=>`raftLamp=max(raftLamp,pow(max(0.0,1.0-length(raftPosition.xz-vec2(${x.toFixed(1)},${z.toFixed(1)}))/6.0),2.0));`).join('\n');
// The avenue is a regular four-column/two-row grid. Resolve the closest home
// analytically so every screen pixel evaluates one home mask, not eight.
const columns=[...new Set(HOUSES.map(h=>h.x))].sort((a,b)=>a-b),rows=[...new Set(HOUSES.map(h=>h.z))].sort((a,b)=>a-b),spacing=columns[1]-columns[0];
const houseFill=`
  vec2 raftHomeCenter=vec2(
    ${columns[0].toFixed(1)}+${spacing.toFixed(1)}*clamp(floor((raftWorldPosition.x-(${columns[0].toFixed(1)}))/${spacing.toFixed(1)}+.5),0.0,${(columns.length-1).toFixed(1)}),
    mix(${rows[0].toFixed(1)},${rows[1].toFixed(1)},step(${((rows[0]+rows[1])/2).toFixed(1)},raftWorldPosition.z))
  );
  raftRoom=max(raftRoom,.75*raftBoxFill(raftWorldPosition,vec3(raftHomeCenter.x,${(ROOM.floor+ROOM.height/2).toFixed(3)},raftHomeCenter.y),vec3(${ROOM.x.toFixed(1)},${(ROOM.height/2).toFixed(3)},${ROOM.z.toFixed(1)})));
`;

// Spatial fill lighting, not eight shadowed point lights. World-space fragment
// masks also light large instanced floor/wall faces correctly. Existing skin
// and furniture shader hooks are preserved, including reversible bald skins.
export function withLocalLighting(material){
  if(patched.has(material)||!material.isMeshStandardMaterial)return material;
  patched.add(material);
  const compile=material.onBeforeCompile,cacheKey=material.customProgramCacheKey.bind(material),key=cacheKey();
  material.onBeforeCompile=function(shader,renderer){
    compile.call(this,shader,renderer);
    shader.uniforms.uRaftNight=nightLight;
    shader.vertexShader='varying vec3 raftWorldPosition; varying float raftStreetFill;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vec4 raftPosition=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        raftPosition=instanceMatrix*raftPosition;
      #endif
      raftPosition=modelMatrix*raftPosition;
      raftWorldPosition=raftPosition.xyz;
      float raftLamp=0.0;
      ${lampFill}
      raftStreetFill=raftLamp*(1.0-smoothstep(2.8,4.0,raftPosition.y));
    `);
    shader.fragmentShader=`varying vec3 raftWorldPosition; varying float raftStreetFill; uniform float uRaftNight;
      float raftBoxFill(vec3 p,vec3 center,vec3 halfSize){
        vec3 d=abs(p-center)-halfSize;
        return 1.0-smoothstep(-.12,.08,max(d.x,max(d.y,d.z)));
      }
    `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
      float raftRoom=raftBoxFill(raftWorldPosition,vec3(0.0,3.55,0.0),vec3(10.95,3.5,8.95));
      ${houseFill}
      reflectedLight.indirectDiffuse+=diffuseColor.rgb*(vec3(raftRoom)+vec3(1.0,.78,.46)*raftStreetFill*uRaftNight*.6);
    `);
  };
  material.customProgramCacheKey=()=>key+'|raft-spatial-fill-1';
  return material;
}
