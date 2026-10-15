import * as THREE from './vendor/three.module.js';
import {houseDescriptor,ROOM,furnitureDefinition,furniturePose} from './housing-data.js?v=20261013-life89b';
import {furnitureParts} from './furniture-models.js?v=20261013-life89b';

import {STREET_LAMPS} from './street-lamps.js?v=20261013-life89b';
export {STREET_LAMPS};
export const nightLight={value:0};
const patched=new WeakSet();
const lampFill=STREET_LAMPS.map(([x,z])=>`{
  vec2 raftLampDelta=raftPosition.xz-vec2(${x.toFixed(1)},${z.toFixed(1)});
  float raftLampDistanceSquared=dot(raftLampDelta,raftLampDelta);
  if(raftLampDistanceSquared<36.0){float raftFalloff=1.0-sqrt(raftLampDistanceSquared)/6.0;raftLamp=max(raftLamp,raftFalloff*raftFalloff);}
}`).join('\n');
const MAX_LIGHTS=12,fixtures=new Map(),lampPositions={value:Array.from({length:MAX_LIGHTS},()=>new THREE.Vector4())},lampRooms={value:Array.from({length:MAX_LIGHTS},()=>new THREE.Vector2())};
const lampFamilies=new Set(['lamp','sconce','pendant','chandelier','fan','ceiling-light','light-bar']);
const sourceTransform=new THREE.Object3D(),sourcePoint=new THREE.Vector3(),lastView=new THREE.Vector3(Infinity,Infinity,Infinity);
let lightsDirty=true,lastLightUpdate=-Infinity;const disabledFixtures=new Set(),nearby=[],lightCount={value:0};
export function setFurnitureEnabled(index,id,enabled){const key=index+':'+id;if(enabled)disabledFixtures.delete(key);else disabledFixtures.add(key);lightsDirty=true;}
export function setHouseLighting(index,layout){
  const home=houseDescriptor(index);if(!home)return;
  const sources=[];
  for(const item of layout.items){
    const f=furnitureDefinition(item);if(!f.light&&!lampFamilies.has(f.family))continue;
    const pose=furniturePose(item),parts=furnitureParts(item).filter(part=>part.glow);
    sourcePoint.set(0,0,0);
    if(parts.length){for(const part of parts)sourcePoint.add(new THREE.Vector3(part.x,part.y,part.z));sourcePoint.multiplyScalar(1/parts.length);}
    else sourcePoint.y=f.mount==='ceiling'?-f.h*.44:f.mount==='wall'?0:f.h*.7;
    sourceTransform.position.set(pose.x,pose.y,pose.z);sourceTransform.rotation.set(0,pose.yaw,pose.roll);sourceTransform.updateMatrix();sourcePoint.applyMatrix4(sourceTransform.matrix);
    sources.push({id:item.id,x:home.x+sourcePoint.x*home.front,y:ROOM.floor+sourcePoint.y,z:home.z+sourcePoint.z*home.front,range:f.mount==='ceiling'?8.5:5.5,home});
  }
  fixtures.set(index,sources);lightsDirty=true;
}
export function updateFurnitureLighting(camera,time,force=false){
  if(!force&&!lightsDirty&&(time-lastLightUpdate<.2||lastView.distanceToSquared(camera)<1))return;
  lastView.copy(camera);lastLightUpdate=time;lightsDirty=false;
  nearby.length=0;
  for(const sources of fixtures.values())for(const light of sources){
    if(disabledFixtures.has(light.home.index+':'+light.id))continue;
    const distance=(light.x-camera.x)**2+(light.y-camera.y)**2+(light.z-camera.z)**2;if(distance>=35*35)continue;
    light.viewDistance=distance;let at=nearby.length;while(at>0&&nearby[at-1].viewDistance>distance)at--;
    if(at<MAX_LIGHTS){nearby.splice(at,0,light);if(nearby.length>MAX_LIGHTS)nearby.pop();}
  }
  lightCount.value=nearby.length;
  for(let i=0;i<MAX_LIGHTS;i++){const l=nearby[i];lampPositions.value[i].set(l?.x||0,l?.y||0,l?.z||0,l?.range||0);lampRooms.value[i].set(l?.home.x||0,l?.home.z||0);}
}

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
    shader.uniforms.uFurnitureLightCount=lightCount;shader.uniforms.uFurnitureLights=lampPositions;shader.uniforms.uFurnitureRooms=lampRooms;
    shader.vertexShader='varying vec3 raftWorldPosition; varying float raftStreetFill; uniform float uRaftNight;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vec4 raftPosition=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        raftPosition=instanceMatrix*raftPosition;
      #endif
      raftPosition=modelMatrix*raftPosition;
      raftWorldPosition=raftPosition.xyz;
      float raftLamp=0.0;
      if(uRaftNight>0.0 && raftPosition.y<4.0){${lampFill}}
      raftStreetFill=raftLamp*(1.0-smoothstep(2.8,4.0,raftPosition.y));
    `);
    shader.fragmentShader=`varying vec3 raftWorldPosition; varying float raftStreetFill; uniform float uRaftNight;
      uniform int uFurnitureLightCount; uniform vec4 uFurnitureLights[${MAX_LIGHTS}]; uniform vec2 uFurnitureRooms[${MAX_LIGHTS}];
      float raftBoxFill(vec3 p,vec3 center,vec3 halfSize){
        vec3 d=abs(p-center)-halfSize;
        return 1.0-smoothstep(-.12,.08,max(d.x,max(d.y,d.z)));
      }
    `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
      float raftStudio=.55*raftBoxFill(raftWorldPosition,vec3(0.0,3.55,0.0),vec3(10.95,3.5,8.95));
      vec3 raftFixtureLight=vec3(0.0);
      if(raftWorldPosition.y>0.05 && raftWorldPosition.y<${(ROOM.floor+ROOM.height+.2).toFixed(3)})
      for(int raftIndex=0;raftIndex<${MAX_LIGHTS};raftIndex++){
        if(raftIndex>=uFurnitureLightCount)break;
        vec4 raftSource=uFurnitureLights[raftIndex];
        vec2 raftRoomDelta=abs(raftWorldPosition.xz-uFurnitureRooms[raftIndex]);
        if(raftSource.w>0.0 && raftRoomDelta.x<${(ROOM.x+.2).toFixed(2)} && raftRoomDelta.y<${(ROOM.z+.2).toFixed(2)} && raftWorldPosition.y>0.05 && raftWorldPosition.y<${(ROOM.floor+ROOM.height+.2).toFixed(3)}){
          vec3 raftToLight=raftSource.xyz-raftWorldPosition;
          float raftDistanceSquared=dot(raftToLight,raftToLight);
          if(raftDistanceSquared>=raftSource.w*raftSource.w)continue;
          float raftDistance=sqrt(raftDistanceSquared);
          float raftFalloff=(1.0-smoothstep(raftSource.w*.65,raftSource.w,raftDistance))/(1.0+.14*raftDistance*raftDistance);
          vec3 raftLightDirection=normalize(mat3(viewMatrix)*raftToLight+vec3(0.0,.0001,0.0));
          float raftLambert=max(0.0,dot(normal,raftLightDirection));
          raftFixtureLight+=vec3(1.0,.90,.72)*raftFalloff*(.12+.88*raftLambert)*1.2;
        }
      }
      reflectedLight.indirectDiffuse+=diffuseColor.rgb*vec3(raftStudio);
      reflectedLight.directDiffuse+=diffuseColor.rgb*(min(raftFixtureLight,vec3(.9))+vec3(1.0,.78,.46)*raftStreetFill*uRaftNight*.6);
    `);
  };
  material.customProgramCacheKey=()=>key+'|raft-fixture-light-3';
  return material;
}
