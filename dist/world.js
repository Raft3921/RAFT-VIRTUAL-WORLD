import {buildGunTown,GUN_ZONE} from './gun-layout.js';
import * as THREE from 'three';
import { ARENA, COURSE, buildCourse } from './world-layout.js';
import { buildDistrict } from './district.js';
import { HOUSES,HOUSE_COLORS } from './housing-data.js';
import {withLocalLighting,STREET_LAMPS,nightLight} from './local-lighting.js';

const boxGeometry=new THREE.BoxGeometry(1,1,1);
const materials=new Map();
function material(color){if(!materials.has(color)){const mat=withLocalLighting(new THREE.MeshStandardMaterial({color,roughness:.82}));if(['#c9a575','#af8960','#e4c797','#b99d79','#936c4f','#dbc29b'].includes(color)){const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');c.fillStyle='#ffffff';c.fillRect(0,0,64,64);let seed=42;for(let i=0;i<900;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%64;seed=(seed*1664525+1013904223)>>>0;const y=seed%64;c.fillStyle=i%2?'#bdb5a530':'#7e6b4720';c.fillRect(x,y,1,1);}const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;mat.map=texture;mat.roughness=.94;
 const previous=mat.onBeforeCompile;mat.onBeforeCompile=function(shader,renderer){previous?.call(this,shader,renderer);shader.vertexShader='varying vec3 vSandLocal; varying vec3 vSandNormal;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 #ifdef USE_INSTANCING
 vSandLocal=(instanceMatrix*vec4(position,1.0)).xyz;
 #else
 vSandLocal=position;
 #endif
 vSandNormal=normal;`);shader.fragmentShader='varying vec3 vSandLocal; varying vec3 vSandNormal;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
 #ifdef USE_MAP
 vec3 n=abs(vSandNormal);vec2 tile=n.y>.5?vSandLocal.xz:n.x>.5?vSandLocal.zy:vSandLocal.xy;
 diffuseColor*=texture2D(map,tile*.65);
 #endif`);};const cache=mat.customProgramCacheKey.bind(mat);mat.customProgramCacheKey=()=>cache()+'|sand-world-uv';}materials.set(color,mat);}return materials.get(color);}
const WHITE='#faf8f1',TRIM='#d4d7d5',WOOD='#bd8d60',STONE='#c9c4b7';
export function createWorld(scene){
  const group=new THREE.Group();scene.add(group);group.name='RAFT World';
  const batches=new Map(),bodies=[],boards=[],seats=[],moving=[],hazards=[],pulsing=[],falling=[],balls=[],chunks=[],clockHands=[];
  let worldTime=0,currentHouse=null;const movementBounds=new Map();
  const houses=HOUSES.map(h=>({...h,parts:[]}));
  const lampMaterial=withLocalLighting(new THREE.MeshStandardMaterial({color:'#ffe4a6',emissive:'#ffe4a6',emissiveIntensity:0,roughness:.6}));
  const transform=new THREE.Object3D(),previous=new THREE.Vector3();
  const boardPickGeometry=new THREE.BoxGeometry(1.12,2.05,.24),boardPickMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false});
  function box(x,y,z,w,h,d,color=WHITE,solid=true,extra={}){
    const body={x,y,z,w,h,d,...extra};
    if(currentHouse){body.houseIndex=currentHouse.index;currentHouse.parts.push(body);}
    if(solid)bodies.push(body);
    // Spatial and vertical batches keep elevated/far-away parts independently culled.
    const key=color+':'+!!extra.noShadow+':'+!!extra.streetLamp+':'+Math.floor(x/48)+','+Math.floor(y/24)+','+Math.floor(z/48);
    if(!batches.has(key))batches.set(key,{color,list:[]});
    batches.get(key).list.push(body);return body;
  }
  function sign(text,x,y,z,width=3,yaw=0){
    const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');
    ctx.fillStyle='#172c35';ctx.fillRect(0,0,512,128);ctx.fillStyle='#eafbf4';ctx.font='bold 46px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),side:THREE.DoubleSide}));
    mesh.position.set(x,y,z);mesh.rotation.y=yaw;group.add(mesh);return mesh;
  }
  function board(x,floor,z,kind='world',checkpoint=null,face=-1){
    if(kind==='pc'){const label=new THREE.Object3D();label.position.set(x,floor+1.5,z);group.add(label);const entry={boardId:boards.length,x,y:floor+1.5,z,kind,label,pick:label};boards.push(entry);return entry;}

    if(checkpoint)face=Math.sign(checkpoint.z-z)||-1;
    const boardId=boards.length,boardPart=(...args)=>box(...args,true,{boardId});
    if(floor>0&&floor<1)boardPart(x,floor/2,z,1.5,floor,1.5,TRIM);
    boardPart(x,floor+.12,z,1.1,.24,.85,'#344c57');
    boardPart(x,floor+1.15,z,.18,2,.18,'#344c57');
    boardPart(x,floor+1.45,z,.9,1.8,.16,'#243945');
    box(x,floor+1.49,z+face*.096,.75,1.5,.04,'#87d8d3',false);
    const c=document.createElement('canvas');c.width=128;c.height=256;const ctx=c.getContext('2d');
    ctx.fillStyle='#142d3c';ctx.fillRect(0,0,128,256);ctx.fillStyle='#80e8db';ctx.fillRect(10,12,108,24);
    ctx.fillStyle='#152d3a';ctx.font='16px DotGothic16,monospace';ctx.textAlign='center';ctx.fillText('RAFT',64,30);
    ctx.fillStyle='#eff8de';ctx.font='16px DotGothic16,monospace';ctx.fillText(kind==='house'?'HOME':checkpoint?'CHECK '+checkpoint.id:'MENU',64,66);
    if(kind==='house'){ctx.fillStyle=currentHouse.color;ctx.fillRect(15,78,98,5);ctx.fillStyle='#eff8de';ctx.fillText('EDIT',64,219);}
    for(let i=0;i<4;i++){ctx.fillStyle=i%2?'#284c5a':'#203f4f';ctx.fillRect(12,82+i*32,104,24);ctx.fillStyle='#78d7c8';ctx.fillRect(18,89+i*32,10,10);ctx.fillStyle='#bad6d2';ctx.fillRect(38,93+i*32,64-i*7,3);}
    ctx.fillStyle='#6eb5aa';ctx.fillRect(47,226,34,4);
    const tex=new THREE.CanvasTexture(c);tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;
    const label=new THREE.Mesh(new THREE.PlaneGeometry(.73,1.46),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));label.position.set(x,floor+1.49,z+face*.12);label.rotation.y=face>0?0:Math.PI;group.add(label);
    const pick=new THREE.Mesh(boardPickGeometry,boardPickMaterial);pick.position.set(x,floor+1.45,z);group.add(pick);
    const b={boardId,x,y:floor+1.45,z,kind,checkpoint,label,pick,...(kind==='house'?{houseIndex:currentHouse.index,owner:currentHouse.owner}:{})};boards.push(b);return b;
  }
  // Centre studio: a white box with a genuinely open, broad entrance on +Z.
  const studio={x:0,z:0};box(0,.08,0,22,.16,18);box(-10.9,3.5,0,.3,7,18);box(10.9,3.5,0,.3,7,18);
  box(0,3.5,-8.9,22,7,.3);box(-7.5,3.5,8.9,7,7,.3);box(7.5,3.5,8.9,7,7,.3);box(0,6.1,8.9,8,1.8,.3);
  // Roof collision and visibility remain, but neither roof layer blocks sun.
  box(0,7,0,22.5,.25,18.5,WHITE,true,{noShadow:true});box(0,7.22,0,23,.2,19,TRIM,true,{noShadow:true});
  const chromaMaterial=new THREE.MeshBasicMaterial({color:'#00ff00',toneMapped:false});
  const backdrop=new THREE.Group();
  const bgWall=new THREE.Mesh(boxGeometry,chromaMaterial);bgWall.position.set(0,3.2,-8.64);bgWall.scale.set(20,6.25,.03);backdrop.add(bgWall);
  const bgFloor=new THREE.Mesh(boxGeometry,chromaMaterial);bgFloor.position.set(0,.17,-2);bgFloor.scale.set(20,.035,13);backdrop.add(bgFloor);group.add(backdrop);
  box(6,.035,11,4,.07,4,STONE);board(6,.07,11,'studio',null,1);sign('STUDIO',0,6.25,9.08,5);
  // Roads and a residential avenue; all eight houses face its open central space.
  box(0,.035,24,8,.07,30,STONE);box(56,.035,27,112,.07,7,STONE);box(112,.035,45,7,.07,36,STONE);box(-45,.035,31,90,.07,7,STONE);
  box(0,.045,62,92,.09,9,STONE);box(-79,.035,67,7,.07,72,STONE);
  const colors=HOUSE_COLORS;
  for(let i=0;i<8;i++){
    currentHouse=houses[i];
    const x=-39+(i%4)*26,z=i<4?45:80;
    const front=i<4?1:-1; const accent=colors[i];
    box(x,.09,z,16,.18,15,TRIM);box(x,.19,z,15.2,.05,14.2,WOOD);
    // Subtle plank seams are instanced boxes rather than dozens of textures.
    for(let j=0;j<24;j++)box(x-7.2+j*.62,.223,z,.025,.005,14,'#96704f',false);
    box(x-7.6,2.8,z,.3,5.5,14.5);box(x+7.6,2.8,z,.3,5.5,14.5);
    box(x,2.8,z-front*7.1,15.5,5.5,.3);
    box(x-5,2.8,z+front*7.1,5.4,5.5,.3);box(x+5,2.8,z+front*7.1,5.4,5.5,.3);
    box(x,4.8,z+front*7.1,4.6,1.5,.3);
    // Clear 4.4 m doorway; decorative jambs do not block entry.
    box(x-2.3,1.95,z+front*7.3,.18,3.7,.35,accent);box(x+2.3,1.95,z+front*7.3,.18,3.7,.35,accent);
    box(x,3.8,z+front*7.3,4.8,.18,.35,accent);
    box(x,5.65,z,16.4,.22,15.4,TRIM);box(x,5.9,z,16,.3,15,accent);
    // Low stepped hip roof: straight walls, continuous roof, no crossing triangles.
    for(let r=0;r<4;r++)box(x,6.12+r*.19,z,15.6-r*1.6,.2,14.6-r*1.6,accent);
    box(x,.09,z+front*9.2,5,.18,4.2,STONE);
    box(x,.035,i<4?56.5:70,5,.07,i<4?9:7,STONE);
    box(x,1.1,z-front*6.85,6,1.8,.1,accent,false);
    // Recessed light strips and neutral window-like architectural panels.
    box(x-5,3,z+front*7.28,2.6,1.8,.04,'#a9d2df',false);box(x+5,3,z+front*7.28,2.6,1.8,.04,'#a9d2df',false);
    for(const wx of [-5,5]){
      for(const side of [-1,1])box(x+wx+side*1.38,3,z+front*7.33,.12,2.04,.14,TRIM,false);
      for(const wy of [2.02,3.98])box(x+wx,wy,z+front*7.33,2.88,.12,.14,TRIM,false);
      box(x+wx,3,z+front*7.36,.09,1.9,.1,WHITE,false);
      box(x+wx,3,z+front*7.36,2.7,.08,.1,WHITE,false);
      box(x+wx,1.85,z+front*7.5,3,.18,.65,TRIM);
    }
    // Low plinth, porch posts and a shaded canopy give the facade actual depth.
    box(x,.39,z-front*7.28,15.5,.35,.16,TRIM,false);
    for(const side of [-1,1])box(x+side*2.6,1.9,z+front*9,.24,3.6,.24,WHITE);
    box(x,3.8,z+front*8.4,5.8,.18,3.1,accent);
    currentHouse.board=board(x-6,.22,z+front*9,'world',null,front);
    currentHouse=null;
  }
  // Colosseum: sunken combat floor, four accessible terraces, radial seats,
  // open entrance aisles, exterior piers and a continuous upper cornice.
  const arena={center:{x:ARENA.x,z:ARENA.z},radius:ARENA.radius};
  const apron=new THREE.Mesh(new THREE.CylinderGeometry(33.1,33.1,.12,64),material(STONE));apron.position.set(ARENA.x,.06,ARENA.z);apron.receiveShadow=true;group.add(apron);
  const floor=new THREE.Mesh(new THREE.CylinderGeometry(ARENA.radius,ARENA.radius,.24,64),material('#dce0df'));floor.position.set(ARENA.x,.12,ARENA.z);floor.receiveShadow=true;group.add(floor);
  const ring=new THREE.Mesh(new THREE.RingGeometry(ARENA.fightRadius-.2,ARENA.fightRadius,64),material('#c8a761'));ring.rotation.x=-Math.PI/2;ring.position.set(ARENA.x,.245,ARENA.z);ring.name='Duel start boundary';group.add(ring);
  for(let i=0;i<64;i++){
    const a=i/64*Math.PI*2,aisle=i%16===0;
    const radial=(r,y,w,h,d,c=STONE,solid=true)=>box(ARENA.x+Math.sin(a)*r,y,ARENA.z+Math.cos(a)*r,w,h,d,c,solid,{rotation:a});
    if(!aisle){
      for(let row=0;row<4;row++){
        const r=23+row*2.2,top=.24+(row+1)*.65;
        radial(r,top/2,r*.099,top,2.24,row%2?'#d4cfbf':'#e2ddcf');
        const x=ARENA.x+Math.sin(a)*r,z=ARENA.z+Math.cos(a)*r;
        radial(r,top+.24,1.22,.48,.58,'#745d49');
        radial(r+.40,top+.82,1.22,.65,.12,'#a98461');
        seats.push({x,z,y:top+.48,yaw:a+Math.PI});
      }
      // Open bays between vertical supports, with lintels instead of solid walls.
      radial(32,5.1,2.9,.42,1.05,'#e2ddcf');
    }else{
      for(let stair=0;stair<14;stair++)radial(21.4+stair*.65,.1+stair*.10,2.25,.2+stair*.20,.68,'#d4cfbf');
    }
    if(i%2===1){radial(32,2.55,.72,5.1,1.05,'#e2ddcf');radial(32,.2,1.12,.4,1.4);radial(32,4.75,1.05,.35,1.4);}
    radial(32,5.5,3.2,.36,1.6,'#b7ac93');
    if(!aisle)radial(31,3.35,3.08,.42,.5,'#d4cfbf');
  }
  board(ARENA.x+3,.24,ARENA.z+20,'arena');
  // One dome draw; proximity evaluated per fragment so only nearby hexes appear.
  const barrierMaterial=new THREE.ShaderMaterial({
    uniforms:{uPlayer:{value:new THREE.Vector3()},uCenter:{value:new THREE.Vector3(ARENA.x,.24,ARENA.z)},uTime:{value:0}},
    transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,
    vertexShader:'varying vec3 vWorld; varying vec2 vUv; void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}',
    fragmentShader:`varying vec3 vWorld; varying vec2 vUv; uniform vec3 uPlayer; uniform float uTime;
    void main(){vec2 p=vec2(vUv.x*151.,vUv.y*75.);vec2 r=vec2(1.73205,3.);
    vec2 a=mod(p,r)-r*.5;vec2 b=mod(p-r*.5,r)-r*.5;vec2 h=dot(a,a)<dot(b,b)?a:b;
    float edge=max(abs(h.x),abs(h.x)*.5+abs(h.y)*.866025);float line=1.-smoothstep(.015,.042,abs(edge-.866025));
    float near=1.-smoothstep(1.,6.,distance(vWorld,uPlayer));float alpha=near*(.018+line*.52);
    if(alpha<.003)discard;gl_FragColor=vec4(.40,.88,1.,alpha);}`
  });
  const dome=new THREE.Mesh(new THREE.SphereGeometry(ARENA.radius,64,32,0,Math.PI*2,0,Math.PI/2),barrierMaterial);
  dome.position.set(ARENA.x,.24,ARENA.z);group.add(dome);
  // Five obstacle families: gap jumps, balance beams, lateral movers,
  // sweeping red lasers, and elevators / warning-phase disappearing pads.
  const layout=buildCourse(),athletic={...COURSE,checkpoints:[],platforms:[],finish:null};
  for(const p of layout){
    const color='#'+new THREE.Color().setHSL((p.index%16)/16,.68,.56).getHexString();
    const thickness=p.kind==='small'?.65:.36;
    const b=box(p.x,p.y-thickness/2,p.z,p.w,thickness,p.d,color,true,{course:true,checkpoint:p.checkpoint,index:p.index,kind:p.kind});
    athletic.platforms.push(b);
    if(p.moving||p.lift){b.originX=b.x;b.originY=b.y;b.originZ=b.z;b.amplitude=p.lift?.7+p.level*.4:1.7+p.level*.8;b.motionMargin=b.amplitude;b.phase=p.index*.83;b.lift=p.lift;b.forward=p.kind==='forward';moving.push(b);}
    if(p.falling){b.originY=b.y;b.activatedAt=null;falling.push(b);}
    if(p.kind==='snake'&&p.index%30!==0){
      const a=layout[p.index-1],turnX=(a.x+p.x)/2,segments=[[a.x,a.z,turnX,a.z],[turnX,a.z,turnX,p.z],[turnX,p.z,p.x,p.z]];
      for(let j=0;j<segments.length;j++){
        const [ax,az,bx,bz]=segments[j],length=Math.hypot(bx-ax,bz-az);if(length<.01)continue;
        box((ax+bx)/2,p.y-.22-(2-j)*.10,(az+bz)/2,length+.08,.20,.68-p.level*.18,color,true,{course:true,rotation:Math.atan2(-(bz-az),bx-ax),kind:'snake'});
      }
    }
    if(p.checkpoint){
      const cp={...p,id:p.checkpoint};athletic.checkpoints.push(cp);
      const bx=p.boardX,bz=p.boardZ;
      box(bx,p.y-.18,bz,1.6,.36,1.6,color,true,{course:true});
      board(bx,p.y,bz,'checkpoint',cp);
      if(cp.id%10===0){
        // Coloured finish gates distinguish each set of ten checkpoints.
        for(const side of [-1,1])box(p.x,p.y+2.35,p.z+side*2.2,.26,4.7,.26,color);
        box(p.x,p.y+4.8,p.z,.34,.3,4.65,color);
      }
    }
    if(p.hazard){
      box(p.x,p.y+.12,p.z,.45,.24,.45,'#344c57',false);
      const h=box(p.x,p.y+.55,p.z,4.8+p.level,.18,.18,'#ff2233',false,{hazard:true,originX:p.x,originZ:p.z,phase:p.index,spinner:true});
      hazards.push(h);
    }
    if(p.projectile){
      const side=p.course%2?1:-1;
      box(p.x,p.y+.55,p.z+side*3.2,.75,1.1,.9,'#344c57');box(p.x,p.y+.7,p.z+side*2.72,.4,.4,.12,'#e88a38',false);
      balls.push({x:p.x,y:p.y+.75,z:p.z,radius:.28+p.level*.10,originZ:p.z,side,phase:p.index*.7,speed:2.3+p.level*1.2});
    }
  }
  athletic.finish=athletic.checkpoints.at(-1);
  box(COURSE.exit.x,.08,COURSE.exit.z,10,.16,10,STONE);board(COURSE.exit.x+3,.16,COURSE.exit.z,'world');
  buildDistrict({box,board,sign,seats,clockHands});
  buildGunTown({box,board,sign});
  // Keep the white sky lining well below the solid slab to avoid depth fighting.
  const skyCanvas=document.createElement('canvas');skyCanvas.width=skyCanvas.height=512;const skyContext=skyCanvas.getContext('2d');skyContext.fillStyle='#f6f7f7';skyContext.fillRect(0,0,512,512);
  for(const [x,y,r]of [[90,110,200],[370,80,180],[280,360,230],[500,480,190]]){const veil=skyContext.createRadialGradient(x,y,0,x,y,r);veil.addColorStop(0,'rgba(210,218,222,.25)');veil.addColorStop(1,'rgba(210,218,222,0)');skyContext.fillStyle=veil;skyContext.fillRect(0,0,512,512);}
  const cloudTexture=new THREE.CanvasTexture(skyCanvas);cloudTexture.colorSpace=THREE.SRGBColorSpace;cloudTexture.magFilter=THREE.LinearFilter;cloudTexture.minFilter=THREE.LinearMipmapLinearFilter;
  const cloudMaterial=new THREE.MeshBasicMaterial({map:cloudTexture,toneMapped:false,side:THREE.FrontSide});
  const cloudRoof=new THREE.Mesh(new THREE.PlaneGeometry(GUN_ZONE.width+1,GUN_ZONE.depth+1),cloudMaterial);cloudRoof.rotation.x=Math.PI/2;cloudRoof.position.set(GUN_ZONE.x,23.95,GUN_ZONE.z);cloudRoof.name='Cloud-white inside roof';group.add(cloudRoof);
  // Flush repeated parts to one draw per material, with instance indices for moving pads.
  for(const {color,list} of batches.values()){
    const mesh=new THREE.InstancedMesh(boxGeometry,list[0].streetLamp?lampMaterial:material(color),list.length);mesh.userData.noShadow=!!list[0].noShadow;
    for(let i=0;i<list.length;i++){const b=list[i];transform.position.set(b.x,b.y,b.z);transform.rotation.set(0,b.rotation||0,0);transform.scale.set(b.w,b.h,b.d);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);b.mesh=mesh;b.instance=i;}
    mesh.receiveShadow=true;mesh.castShadow=!mesh.userData.noShadow&&color!==STONE;mesh.computeBoundingSphere();mesh.boundingSphere.radius+=4;group.add(mesh);chunks.push(mesh);
  }
  // Eight softly fading ground pools in one draw; no extra realtime lights,
  // shadow maps, image downloads or day/night material replacement.
  const poolMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uNight:nightLight},vertexShader:'varying vec2 vPoolUV; void main(){vPoolUV=uv; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}',fragmentShader:`
    varying vec2 vPoolUV; uniform float uNight;
    void main(){
      float falloff=pow(max(0.0,1.0-length(vPoolUV*2.0-1.0)),2.0);
      gl_FragColor=vec4(vec3(1.0,.78,.46),falloff*uNight*.42);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `});
  const lightPools=new THREE.InstancedMesh(new THREE.PlaneGeometry(12,12),poolMaterial,STREET_LAMPS.length);
  for(let i=0;i<STREET_LAMPS.length;i++){const [x,z]=STREET_LAMPS[i];transform.position.set(x,.12,z);transform.rotation.set(-Math.PI/2,0,0);transform.scale.setScalar(1);transform.updateMatrix();lightPools.setMatrixAt(i,transform.matrix);}
  lightPools.computeBoundingSphere();group.add(lightPools);transform.rotation.set(0,0,0);
  for(const h of hazards){h.mesh.material.emissive.set('#ff0018');h.mesh.material.emissiveIntensity=2;}
  const ballMaterial=new THREE.MeshStandardMaterial({color:'#ffd05e',emissive:'#fa6839',emissiveIntensity:.6,roughness:.6});
  const ballMesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),ballMaterial,balls.length);ballMesh.frustumCulled=false;group.add(ballMesh);
  // Broad-phase buckets avoid scanning the 600 platforms during every physics substep.
  const buckets=new Map();
  for(const b of bodies){const extent=Math.hypot(b.w,b.d)/2+1+(b.motionMargin||0);for(let x=Math.floor((b.x-extent)/12);x<=Math.floor((b.x+extent)/12);x++)for(let z=Math.floor((b.z-extent)/12);z<=Math.floor((b.z+extent)/12);z++){const k=x+','+z;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(b);}}
  const housingBodies=new Map(),housingBuckets=new Map(),nearbyCache=new Map(),housingSeatLists=new Map(),housingBedLists=new Map();let housingSeats=[],housingBeds=[];
  function setHouseBodies(index,list,roomSeats=[],roomBeds=[]){
    housingBodies.set(index,list);housingSeatLists.set(index,roomSeats);housingBedLists.set(index,roomBeds);housingSeats=[...housingSeatLists.values()].flat();housingBeds=[...housingBedLists.values()].flat();housingBuckets.clear();nearbyCache.clear();
    for(const records of housingBodies.values())for(const b of records){const extent=Math.hypot(b.w,b.d)/2+1;for(let x=Math.floor((b.x-extent)/12);x<=Math.floor((b.x+extent)/12);x++)for(let z=Math.floor((b.z-extent)/12);z<=Math.floor((b.z+extent)/12);z++){const key=x+','+z;if(!housingBuckets.has(key))housingBuckets.set(key,[]);housingBuckets.get(key).push(b);}}
  }
  function nearby(p){const key=Math.floor(p.x/12)+','+Math.floor(p.z/12);if(!nearbyCache.has(key))nearbyCache.set(key,(buckets.get(key)||[]).concat(housingBuckets.get(key)||[]));return nearbyCache.get(key);}
  function cutawayHouse(index,enabled,sideX=1,sideZ=null){
    const h=houses[index];if(!h)return;sideZ??=h.front;
    h.board.editorHidden=enabled;h.board.label.visible=!enabled;h.board.pick.visible=!enabled;
    for(const b of h.parts){
      if(b.y<1)continue;
      const shell=b.y>5.5||Math.abs(b.z-h.z)>6.8||Math.abs(b.x-h.x)>7.4;
      if(!shell)continue;
      const hide=enabled&&(b.y>5.5||(b.z-h.z)*sideZ>6.8||(b.x-h.x)*sideX>7.4);
      transform.position.set(b.x,b.y,b.z);transform.rotation.set(0,b.rotation||0,0);transform.scale.set(hide?0:b.w,hide?0:b.h,hide?0:b.d);transform.updateMatrix();b.mesh.setMatrixAt(b.instance,transform.matrix);b.mesh.instanceMatrix.needsUpdate=true;
    }
  }
  function inAthletic(p){return p.x>COURSE.minX&&p.x<COURSE.maxX&&p.z>COURSE.minZ&&p.z<COURSE.maxZ;}
  function localPoint(p,b){const c=Math.cos(b.rotation||0),s=Math.sin(b.rotation||0),x=p.x-b.x,z=p.z-b.z;return {x:c*x-s*z,z:s*x+c*z,c,s};}
  function terrainHeight(p){const distance=Math.hypot(p.x-ARENA.x,p.z-ARENA.z);return distance<ARENA.radius?.24:distance<33.1?.12:0;}
  function floorAt(p,limit=p.y+.48){
    let floor=terrainHeight(p),body=null;
    for(const b of nearby(p)){const q=localPoint(p,b),top=b.y+b.h/2;if(!b.disabled&&Math.abs(q.x)<b.w/2+.12&&Math.abs(q.z)<b.d/2+.12&&top<=limit&&top>=floor){floor=top;body=b;}}
    return {y:floor,body};
  }
  function move(p,vel,dt,{ragdoll=false,insideArena=false,lockedInArena=false,shape=null}={}){
    const height=shape?.height||1.9,width=shape?.width||.32,depth=shape?.depth||.32,angle=shape?.yaw||0,offset=shape?.offset||0;
    const offsetX=-Math.sin(angle)*offset,offsetZ=-Math.cos(angle)*offset;
    const slices=Math.max(1,Math.ceil(vel.length()*dt/.18)),step=dt/slices;
    let grounded=false,landed=null;
    for(let s=0;s<slices;s++){
      previous.copy(p);p.addScaledVector(vel,step);
      const center={x:p.x+offsetX,z:p.z+offsetZ};
      for(const b of nearby(center)){
        if(b.disabled||api.portalPassage?.(b,p,previous,height))continue;
        const q=localPoint({x:p.x+offsetX,z:p.z+offsetZ},b),relative=angle-(b.rotation||0),rxExtent=shape?Math.abs(Math.cos(relative))*width+Math.abs(Math.sin(relative))*depth:.32,rzExtent=shape?Math.abs(Math.sin(relative))*width+Math.abs(Math.cos(relative))*depth:.32;
        const bottom=b.y-b.h/2,top=b.y+b.h/2;
        if(Math.abs(q.x)>=b.w/2+rxExtent||Math.abs(q.z)>=b.d/2+rzExtent)continue;
        if(vel.y<=0&&previous.y>=top-.025&&p.y<=top){p.y=top;vel.y=0;grounded=true;landed=b;if(b.activatedAt===null)b.activatedAt=worldTime;continue;}
        if(vel.y>0&&previous.y+height<=bottom+.025&&p.y+height>=bottom){p.y=bottom-height;vel.y=0;continue;}
        if(p.y>=top-.02||p.y+height-.05<=bottom)continue;
        if(top-p.y<=(b.kind==='snake'?.14:.28)&&vel.y<=0&&(!b.course||b.kind==='snake')&&!ragdoll){p.y=top;grounded=true;landed=b;continue;}
        const rx=b.w/2+rxExtent-Math.abs(q.x),rz=b.d/2+rzExtent-Math.abs(q.z);
        const nx=rx<rz?Math.sign(q.x||1)*q.c:Math.sign(q.z||1)*q.s,nz=rx<rz?-Math.sign(q.x||1)*q.s:Math.sign(q.z||1)*q.c;
        const penetration=Math.min(rx,rz);p.x+=nx*penetration;p.z+=nz*penetration;
        const speed=vel.x*nx+vel.z*nz;if(speed<0){vel.x-=speed*nx*(ragdoll?1.08:1);vel.z-=speed*nz*(ragdoll?1.08:1);}
      }
      if(lockedInArena||ragdoll&&insideArena){
        const dx=p.x+offsetX-ARENA.x,dy=Math.max(0,p.y+height/2-.24),dz=p.z+offsetZ-ARENA.z,r=ARENA.radius-Math.max(.65,depth*.75),len=Math.hypot(dx,dy,dz);
        if(len>r){const nx=dx/len,ny=dy/len,nz=dz/len;p.set(ARENA.x+nx*r-offsetX,Math.max(.24,.24+ny*r-height/2),ARENA.z+nz*r-offsetZ);const dot=vel.x*nx+vel.y*ny+vel.z*nz;if(dot>0){const restitution=ragdoll?1.10:1,damping=ragdoll?.68:1;vel.x=(vel.x-dot*nx*restitution)*damping;vel.y=(vel.y-dot*ny*restitution)*damping;vel.z=(vel.z-dot*nz*restitution)*damping;}}
      }
      for(const bound of movementBounds.values())if(Math.abs(previous.x-bound.x)<70&&Math.abs(previous.z-(bound.z-62.5))<55&&!bound.allowed(p.x,p.z)){p.x=previous.x;p.z=previous.z;vel.x=0;vel.z=0;break;}
      const ground=terrainHeight(p);
      if(p.y<=ground){p.y=ground;vel.y=0;grounded=true;}
    }
    return {grounded,body:landed};
  }
  function seatAt(p,oldY,vy){if(vy>0)return null;const match=s=>Math.hypot(p.x-s.x,p.z-s.z)<.64&&oldY>s.y+.001&&p.y<=s.y+.12;return seats.find(match)||housingSeats.find(match)||null;}
  function bedAt(p,oldY,vy){if(vy>0)return null;return housingBeds.find(b=>{const dx=p.x-b.x,dz=p.z-b.z,x=Math.cos(b.yaw)*dx-Math.sin(b.yaw)*dz,z=Math.sin(b.yaw)*dx+Math.cos(b.yaw)*dz;return Math.abs(x)<b.w/2&&Math.abs(z)<b.d/2&&oldY>=b.y-.03&&p.y<=b.y+.12&&p.y>=b.y-.08;})||null;}
  function bedById(id){return housingBeds.find(b=>b.id===id)||null;}
  function checkpointAt(p){return athletic.checkpoints.find(cp=>Math.abs(p.x-cp.x)<cp.size/2&&Math.abs(p.z-cp.z)<cp.size/2&&Math.abs(p.y-cp.y)<.12);}
  function lethal(p){return hazards.some(h=>{const q=localPoint(p,h);return Math.abs(q.x)<h.w/2+.27&&Math.abs(q.z)<h.d/2+.27&&p.y<h.y+.2&&p.y+1.85>h.y-.2;})||balls.some(b=>Math.hypot(p.x-b.x,p.z-b.z)<b.radius+.3&&p.y<b.y+b.radius&&p.y+1.85>b.y-b.radius);}
  function boardHit(o,f){let best=null,dist=4;for(const b of boards){if(b.kind==='house')continue;const dx=b.x-o.x,dy=b.y-o.y,dz=b.z-o.z,d=Math.hypot(dx,dy,dz);if(d<dist&&(dx*f.x+dz*f.z)/Math.max(.01,Math.hypot(dx,dz))>.45){best=b;dist=d;}}return best;}
  // Sweep a near-plane-sized camera sphere against the same oriented solids.
  // Test the whole segment (not just its endpoint), preventing fast wall tunnelling.
  function cameraPosition(from,to,radius=.24,ignoreBoardId=null){
    let fraction=1;const candidates=new Set(),length=from.distanceTo(to),sample=new THREE.Vector3();
    const steps=Math.max(1,Math.ceil(length/5));
    for(let i=0;i<=steps;i++){sample.lerpVectors(from,to,i/steps);for(const b of nearby(sample))candidates.add(b);}
    for(const b of candidates){
      if(b.disabled||(ignoreBoardId!==null&&b.boardId===ignoreBoardId))continue;
      const a=localPoint(from,b),z=localPoint(to,b),start=[a.x,from.y-b.y,a.z],end=[z.x,to.y-b.y,z.z],half=[b.w/2+radius,b.h/2+radius,b.d/2+radius];
      // A focus point enclosed by its own surface must be allowed to escape.
      if(start.every((v,i)=>Math.abs(v)<half[i]))continue;
      let enter=0,leave=1;
      for(let axis=0;axis<3;axis++){
        const delta=end[axis]-start[axis];
        if(Math.abs(delta)<1e-8){if(Math.abs(start[axis])>half[axis]){enter=2;break;}continue;}
        let a=(-half[axis]-start[axis])/delta,z=(half[axis]-start[axis])/delta;
        if(a>z)[a,z]=[z,a];enter=Math.max(enter,a);leave=Math.min(leave,z);if(enter>leave)break;
      }
      if(enter<=leave&&enter>=0&&enter<fraction&&!api.portalPassage?.(b,to,from,0,true))fraction=Math.max(0,enter-.015/Math.max(length,.01));
    }
    return to.clone().lerp(from,1-fraction);
  }
  function surfaceNormal(point,incoming){let best=.65,result=incoming.clone().negate();for(const b of nearby(point)){if(b.disabled)continue;const q=localPoint(point,b),coords=[q.x,point.y-b.y,q.z],half=[b.w/2,b.h/2,b.d/2];if(coords.some((v,i)=>Math.abs(v)>half[i]+.3))continue;for(let axis=0;axis<3;axis++){const distance=Math.abs(Math.abs(coords[axis])-half[axis]);if(distance>=best)continue;best=distance;const sign=Math.sign(coords[axis])||1;if(axis===0)result.set(q.c*sign,0,-q.s*sign);else if(axis===1)result.set(0,sign,0);else result.set(q.s*sign,0,q.c*sign);}}if(point.y<.25&&best>.1)result.set(0,1,0);return result;}
  function cull(view){
    for(const mesh of chunks){const sphere=mesh.boundingSphere,d=sphere.center.distanceTo(view);mesh.visible=d<160+sphere.radius;mesh.castShadow=!mesh.userData.noShadow&&mesh.visible&&d<55+sphere.radius;}
    for(const b of boards)b.label.visible=!b.editorHidden&&Math.hypot(view.x-b.x,view.y-b.y,view.z-b.z)<85;
    for(let i=0;i<balls.length;i++){const b=balls[i],visible=Math.hypot(view.x-b.x,view.y-b.y,view.z-b.z)<130;transform.position.set(b.x,b.y,b.z);transform.rotation.set(0,worldTime,worldTime*.8);transform.scale.setScalar(visible?b.radius:0);transform.updateMatrix();ballMesh.setMatrixAt(i,transform.matrix);}ballMesh.instanceMatrix.needsUpdate=true;
  }
  function update(t,p,clockPhase=.5){
    worldTime=t;
    for(const hand of clockHands){const angle=hand.clockSide*(hand.clockHand==='hour'?Math.PI/2-clockPhase*Math.PI*4:-clockPhase*Math.PI*48);transform.position.set(hand.clockX+Math.cos(angle)*hand.clockDX-Math.sin(angle)*hand.clockDY,hand.clockY+Math.sin(angle)*hand.clockDX+Math.cos(angle)*hand.clockDY,hand.z);transform.rotation.set(0,0,angle);transform.scale.set(hand.w,hand.h,hand.d);transform.updateMatrix();hand.mesh.setMatrixAt(hand.instance,transform.matrix);hand.mesh.instanceMatrix.needsUpdate=true;}
    transform.rotation.set(0,0,0);
    barrierMaterial.uniforms.uPlayer.value.copy(p).y+=1;barrierMaterial.uniforms.uTime.value=t;
    const sync=b=>{transform.position.set(b.x,b.y,b.z);transform.rotation.set(0,b.rotation||0,0);transform.scale.set(b.w,b.disabled?.025:b.warning?.18:b.h,b.d);transform.updateMatrix();b.mesh.setMatrixAt(b.instance,transform.matrix);b.mesh.instanceMatrix.needsUpdate=true;};
    for(const b of moving){const oldX=b.x,oldY=b.y,oldZ=b.z;if(b.lift)b.y=b.originY+Math.sin(t*.9+b.phase)*b.amplitude;else if(b.forward)b.x=b.originX+Math.sin(t*.9+b.phase)*b.amplitude;else b.z=b.originZ+Math.sin(t*.9+b.phase)*b.amplitude;b.deltaX=b.x-oldX;b.deltaY=b.y-oldY;b.deltaZ=b.z-oldZ;if(b.mesh.visible)sync(b);}
    for(const b of falling){const age=b.activatedAt===null?0:t-b.activatedAt;b.warning=age>.2&&age<.65;b.disabled=age>=.65;if(age>4){b.activatedAt=null;b.disabled=false;b.y=b.originY;}else if(b.disabled)b.y=b.originY-Math.min(8,(age-.65)**2*6);if(b.mesh.visible)sync(b);}
    for(const b of pulsing){const phase=(t+b.phase)%5;b.disabled=phase>4;b.warning=phase>3.3&&phase<=4;if(b.mesh.visible)sync(b);}
    for(const h of hazards){if(h.spinner)h.rotation=t*.8+h.phase;else h.z=h.originZ+Math.sin(t*1.2+h.phase)*1.05;if(h.mesh.visible)sync(h);}
    for(const b of balls){const phase=((t+b.phase)*b.speed)%8;b.z=b.originZ+b.side*(4-phase);}
  }
  function setBackdrop(mode){chromaMaterial.color.set(mode==='RB'?'#ff0000':mode==='BB'?'#0000ff':'#00ff00');}
  // Keep the inexpensive pool draw registered even during the day (alpha 0)
  // so its shader is not first compiled when night begins.
  function setNight(value){nightLight.value=THREE.MathUtils.clamp(value||0,0,1);lampMaterial.emissiveIntensity=nightLight.value*1.8;}
  const api={setMovementBounds:(key,bound)=>{if(bound)movementBounds.set(key,bound);else movementBounds.delete(key);},group,studio,arena,athletic,boards,houses,seats,bodies,moving,hazards,pulsing,falling,balls,chunks,move,floorAt,inAthletic,seatAt,bedAt,bedById,checkpointAt,lethal,boardHit,update,cull,cameraPosition,surfaceNormal,setBackdrop,setNight,setHouseBodies,cutawayHouse};return api;
}
