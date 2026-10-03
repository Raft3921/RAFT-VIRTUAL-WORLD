import * as THREE from 'three';

// All vegetation and terrain are geometry/shaders: no image textures or downloads.
const TIERS = {
  low: { clumps: 2300, span: 34, segments: 3, shadow: 512, pixelRatio: 1.25 },
  medium: { clumps: 4600, span: 46, segments: 4, shadow: 1024, pixelRatio: 1.65 },
  high: { clumps: 7600, span: 58, segments: 5, shadow: 2048, pixelRatio: 2 },
};
const BLADES_PER_CLUMP = 6;
const clamp = THREE.MathUtils.clamp;
const fract = (n) => n - Math.floor(n);
const random = (n) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453123);

const NOISE = `
float fieldHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float fieldNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(fieldHash(i), fieldHash(i + vec2(1., 0.)), f.x),
             mix(fieldHash(i + vec2(0., 1.)), fieldHash(i + vec2(1., 1.)), f.x), f.y);
}
`;

function makeSky() {
  const uniforms = {
    uSun: { value: new THREE.Vector3(-0.5, 0.7, -0.4).normalize() },
    uTime: { value: 0 },
    uZenith: { value: new THREE.Color('#2791ed') },
    uHorizon: { value: new THREE.Color('#abd5f2') },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, depthTest: false, toneMapped: false,
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = position;
        vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
        gl_Position = clip.xyww;
      }`,
    fragmentShader: `
      uniform vec3 uSun, uZenith, uHorizon;
      uniform float uTime;
      varying vec3 vDirection;
      ${NOISE}
      void main() {
        vec3 direction = normalize(vDirection);
        float elevation = max(direction.y, 0.0);
        vec3 sky = mix(uHorizon, uZenith, pow(elevation, .42));
        float sunAlignment = max(dot(direction, uSun), 0.0);
        sky += vec3(.30, .24, .13) * pow(sunAlignment, 18.0);
        sky += vec3(1.0, .92, .70) * smoothstep(.99976, .99991, sunAlignment) * 1.3;
        // A few thin high wisps; the main view remains a clean blue sky.
        vec2 cloudPoint = direction.xz / max(direction.y + .17, .10);
        cloudPoint = cloudPoint * vec2(1.35, 4.5) + vec2(uTime * .0015, 0.0);
        float clouds = fieldNoise(cloudPoint) * .65 + fieldNoise(cloudPoint * 2.1) * .35;
        float veil = smoothstep(.68, .91, clouds) * smoothstep(.12, .4, elevation);
        sky = mix(sky, vec3(.87, .91, .90), veil * .22);
        gl_FragColor = vec4(sky, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material);
  sky.name = 'Procedural daytime sky';
  sky.renderOrder = -1000;
  sky.frustumCulled = false;
  return sky;
}

function makeGround() {
  const geometry = new THREE.PlaneGeometry(2800, 2800, 160, 160);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    // A broad flat, usable recording area with gentle hills at the horizon.
    const ramp = THREE.MathUtils.smoothstep(Math.hypot(x, z), 90, 420);
    const hills = 3.4 + Math.sin(x * .033 + .7) * Math.cos(z * .021) * 4.6
      + Math.sin(x * .014 - z * .025 + 1.8) * 3.8;
    positions.setY(i, Math.max(0, hills) * ramp - .015);
  }
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: '#74b056', roughness: 1, metalness: 0,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec3 vGroundPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vGroundPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
    `);
    shader.fragmentShader = 'varying vec3 vGroundPosition;\n' + NOISE + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      float broad = fieldNoise(vGroundPosition.xz * .044);
      float groundPatch = fieldNoise(vGroundPosition.xz * .31);
      float fine = fieldNoise(vGroundPosition.xz * 7.0);
      float detailRange = 1.0 - smoothstep(12.0, 32.0, length(vViewPosition));
      diffuseColor.rgb *= mix(.80, 1.09, broad) * mix(.94, 1.035, groundPatch);
      diffuseColor.rgb *= mix(1.0, mix(.89, 1.05, fine), detailRange * .6);
    `);
  };
  material.customProgramCacheKey = () => 'studio-meadow-ground-v1';
  const ground = new THREE.Mesh(geometry, material);
  ground.name = 'Flat meadow and distant rolling hills';
  ground.receiveShadow = true;
  return ground;
}

function pushBlade(positions, uvs, indices, dx, dz, height, outward, bladeWidth, segments, lean = 1) {
  const firstVertex = positions.length / 3;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const width = bladeWidth * Math.pow(1 - t, .55) * (.7 + Math.sin(t * Math.PI) * .55) + .001;
    const reach = .02 + outward * Math.pow(t, lean);
    const y = height * (t - .22 * t * t);
    positions.push(dx * reach - dz * width / 2, y, dz * reach + dx * width / 2,
                   dx * reach + dz * width / 2, y, dz * reach - dx * width / 2);
    uvs.push(0, t, 1, t);
    if (i < segments) {
      const a = firstVertex + i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
}

function grassClumpGeometry(segments) {
  const positions = [], uvs = [], indices = [];
  for (let leaf = 0; leaf < BLADES_PER_CLUMP; leaf++) {
    const angle = leaf * 2.399963 + random(leaf + 53) * .45;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    const height = .16 + random(leaf + 61) * .07;
    const outward = .16 + random(leaf + 73) * .12;
    const bladeWidth = .07 + random(leaf + 89) * .03;
    pushBlade(positions, uvs, indices, dx, dz, height, outward, bladeWidth, segments, .85);
  }
  // Almost-flat crown leaves so a top-down shot reads as green lawn, not a dark tuft.
  for (let leaf = 0; leaf < 4; leaf++) {
    const angle = leaf * Math.PI / 2 + .2;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    pushBlade(positions, uvs, indices, dx, dz, .045, .11 + random(leaf + 17) * .04, .11, Math.max(2, segments - 2), 1.6);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeGrass(tier, uniforms) {
  const geometry = grassClumpGeometry(tier.segments);
  const material = new THREE.MeshLambertMaterial({
    color: '#7db85a', emissive: '#6fa84c', emissiveIntensity: .42, side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `
      uniform float uMeadowTime, uWind, uSpan;
      uniform vec2 uFocus;
      varying float vBladeHeight;
    ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
      #include <beginnormal_vertex>
      // Grass tufts share the soft light of the surrounding lawn. Tilting the
      // normals upward avoids dark upright strips against the lit green ground.
      objectNormal = normalize(mix(objectNormal, vec3(0.0, 1.0, 0.0), .9));
    `);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vBladeHeight = uv.y;
      vec2 initialRoot = instanceMatrix[3].xz;
      // Tile individual instances outside the visible ring. World roots stay put
      // while walking; only invisible, distant blades wrap to the other side.
      vec2 wrap = floor((uFocus - initialRoot) / uSpan + .5) * uSpan;
      vec2 root = initialRoot + wrap;
      float distanceToFocus = length(root - uFocus);
      float visibility = 1.0 - smoothstep(uSpan * .30, uSpan * .47, distanceToFocus);
      float phase = root.x * .48 + root.y * .31;
      float breeze = sin(phase + uMeadowTime * 1.6) * .55
                   + sin(root.y * .67 - uMeadowTime * 2.1) * .22
                   + sin(root.x * 1.8 + root.y * 1.4 + uMeadowTime * 2.7) * .10;
      float tipWeight = uv.y * uv.y;
      transformed.x += (breeze + .26) * tipWeight * .075 * uWind;
      transformed.z += sin(phase * .71 + uMeadowTime * 1.3) * tipWeight * .028 * uWind;
      transformed *= visibility;
      // Undo the instance's rotation/scale for the world-space wrap offset.
      transformed += vec3(dot(instanceMatrix[0].xz, wrap) / dot(instanceMatrix[0].xyz, instanceMatrix[0].xyz),
                          0.0,
                          dot(instanceMatrix[2].xz, wrap) / dot(instanceMatrix[2].xyz, instanceMatrix[2].xyz));
    `);
    shader.fragmentShader = 'varying float vBladeHeight;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 rootColor = vec3(.48, .66, .28);
      vec3 tipColor = vec3(.78, .92, .46);
      vec3 bladeColor = mix(rootColor, tipColor, smoothstep(0.0, 1.0, vBladeHeight));
      diffuseColor.rgb = gl_FrontFacing ? bladeColor : bladeColor * .72;
    `);
  };
  material.customProgramCacheKey = () => 'studio-meadow-grass-clumps-v3';
  const grass = new THREE.InstancedMesh(geometry, material, tier.clumps);
  const transform = new THREE.Object3D(), color = new THREE.Color();
  const baseColor = new THREE.Color('#ffffff');
  for (let i = 0; i < tier.clumps; i++) {
    // Independent deterministic random coordinates avoid visible planted rows.
    const x = (random(i * 2 + 101) - .5) * tier.span;
    const z = (random(i * 2 + 102) - .5) * tier.span;
    const variation = random(i + 7);
    const fullness = .88 + Math.sin(x * .32 + 1.3) * Math.cos(z * .24) * .2;
    const spread = (.78 + random(i + 29) * .72) * fullness;
    transform.position.set(x, 0, z);
    transform.rotation.set(0, random(i + 11) * Math.PI * 2, 0);
    transform.scale.set(spread, (.80 + variation * .46) * fullness, spread * (.85 + random(i + 31) * .3));
    transform.updateMatrix();
    grass.setMatrixAt(i, transform.matrix);
    color.copy(baseColor).multiplyScalar(.98 + random(i + 37) * .12);
    grass.setColorAt(i, color);
  }
  grass.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  grass.instanceMatrix.needsUpdate = true;
  grass.instanceColor.needsUpdate = true;
  grass.name = 'Random six-leaf meadow tufts — GPU breeze';
  // The shader wraps instances around the player, so the source bounds are stale.
  grass.frustumCulled = false;
  grass.castShadow = false;
  grass.receiveShadow = false;
  return grass;
}

/**
 * Daytime recording meadow. update() expects elapsed seconds and a THREE.Vector3
 * recording focus (usually the local avatar). Only shader uniforms and the sun's
 * transform change per frame; no per-blade CPU work or uploaded matrices.
 *
 * Settings: wind 0..2, grassDensity 0..1, sunHeight 8..82 degrees,
 * exposure .65..1.6, quality 'low' | 'medium' | 'high'.
 */
export function createEnvironment(scene, renderer, { mobile = false } = {}) {
  const settings = {
    quality: mobile ? 'low' : 'high', wind: .75,
    grassDensity: 1, sunHeight: 48, exposure: 1.05,
  };
  const group = new THREE.Group();
  group.name = 'Meadow environment';
  const sky = makeSky(), ground = makeGround();
  const ambient = new THREE.HemisphereLight('#e3f1ff', '#728153', 1.6);
  const sun = new THREE.DirectionalLight('#fff7e3', 2.5);
  sun.castShadow = true;
  sun.shadow.bias = -.00018;
  sun.shadow.normalBias = .026;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 140;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -19;
  sun.shadow.camera.right = sun.shadow.camera.top = 19;
  const sunOffset = new THREE.Vector3();
  const focus = new THREE.Vector3();
  const uniforms = {
    uMeadowTime: { value: 0 }, uWind: { value: settings.wind },
    uSpan: { value: TIERS[settings.quality].span },
    uFocus: { value: new THREE.Vector2() },
  };
  let grass = makeGrass(TIERS[settings.quality], uniforms);
  group.add(sky, ground, grass, ambient, sun, sun.target);
  scene.add(group);
  scene.fog = new THREE.Fog('#abd5f2', 120, 1400);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  function applyQuality() {
    const tier = TIERS[settings.quality];
    sun.shadow.mapSize.set(tier.shadow, tier.shadow);
    if (sun.shadow.map) {
      sun.shadow.map.dispose();
      sun.shadow.map = null;
    }
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, tier.pixelRatio));
    uniforms.uSpan.value = tier.span;
    grass.count = Math.floor(tier.clumps * settings.grassDensity);
  }

  function applyLighting() {
    const elevation = THREE.MathUtils.degToRad(settings.sunHeight);
    sunOffset.set(-Math.cos(elevation) * .8, Math.sin(elevation), -Math.cos(elevation) * .6).multiplyScalar(70);
    sky.material.uniforms.uSun.value.copy(sunOffset).normalize();
    sun.intensity = THREE.MathUtils.lerp(1.55, 2.5, Math.sin(elevation));
    sun.color.set(settings.sunHeight < 20 ? '#ffe6bf' : '#fff7e3');
    renderer.toneMappingExposure = settings.exposure;
    sun.position.copy(focus).add(sunOffset);
    sun.target.position.copy(focus);
  }

  function setSettings(next = {}) {
    if (next.quality && TIERS[next.quality] && next.quality !== settings.quality) {
      settings.quality = next.quality;
      group.remove(grass);
      grass.geometry.dispose();
      grass.material.dispose();
      grass = makeGrass(TIERS[settings.quality], uniforms);
      group.add(grass);
      applyQuality();
    }
    if (Number.isFinite(next.wind)) settings.wind = clamp(next.wind, 0, 2);
    if (Number.isFinite(next.grassDensity)) settings.grassDensity = clamp(next.grassDensity, 0, 1);
    if (Number.isFinite(next.sunHeight)) settings.sunHeight = clamp(next.sunHeight, 8, 82);
    if (Number.isFinite(next.exposure)) settings.exposure = clamp(next.exposure, .65, 1.6);
    uniforms.uWind.value = settings.wind;
    grass.count = Math.floor(TIERS[settings.quality].clumps * settings.grassDensity);
    applyLighting();
  }

  applyQuality();
  applyLighting();

  return {
    group, ground, sun, ambient, settings,
    get grass() { return grass; },
    setSettings,
    update(time, nextFocus) {
      uniforms.uMeadowTime.value = Number.isFinite(time) ? time : 0;
      sky.material.uniforms.uTime.value = uniforms.uMeadowTime.value;
      if (nextFocus) focus.set(nextFocus.x, 0, nextFocus.z);
      uniforms.uFocus.value.set(focus.x, focus.z);
      sun.position.copy(focus).add(sunOffset);
      sun.target.position.copy(focus);
    },
    get stats() {
      return {
        grassBlades: grass.count * (BLADES_PER_CLUMP + 4), grassClumps: grass.count, grassDrawCalls: 1,
        grassTriangles: grass.count * (BLADES_PER_CLUMP + 4) * TIERS[settings.quality].segments * 2,
        quality: settings.quality, grassImages: 0,
      };
    },
    dispose() {
      scene.remove(group);
      [sky, ground, grass].forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      sun.shadow.dispose();
    },
  };
}
