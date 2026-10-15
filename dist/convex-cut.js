import * as THREE from "three";
function cutConvexGeometry(input, point, normal) {
  const source = input.index ? input.toNonIndexed() : input.clone(), p = source.getAttribute("position"), uv = source.getAttribute("uv");
  if (!p || p.count % 3 || p.count > 768 || normal.lengthSq() < 1e-12 || ![...point.toArray(), ...normal.toArray()].every(Number.isFinite)) {
    source.dispose();
    return [];
  }
  const n = normal.clone().normalize(), epsilon = 1e-6;
  const results = [-1, 1].map((side) => {
    const vertices = [], tex = [], crossings = [];
    function tri(a, b, c) {
      if (b.p.clone().sub(a.p).cross(c.p.clone().sub(a.p)).lengthSq() < 1e-16) return;
      for (const v of [a, b, c]) {
        vertices.push(...v.p.toArray());
        tex.push(v.uv.x, v.uv.y);
      }
    }
    function cross(v) {
      if (!crossings.some((p2) => p2.distanceToSquared(v) < 1e-10)) crossings.push(v.clone());
    }
    for (let i = 0; i < p.count; i += 3) {
      const triangle = Array.from({ length: 3 }, (_, j) => ({ p: new THREE.Vector3().fromBufferAttribute(p, i + j), uv: uv ? new THREE.Vector2().fromBufferAttribute(uv, i + j) : new THREE.Vector2() }));
      const polygon = [];
      for (let j = 0; j < 3; j++) {
        const a = triangle[j], b = triangle[(j + 1) % 3], da = side * n.dot(a.p.clone().sub(point)), db = side * n.dot(b.p.clone().sub(point));
        if (da >= -epsilon) {
          polygon.push(a);
          if (Math.abs(da) <= epsilon) cross(a.p);
        }
        if (da >= -epsilon !== db >= -epsilon) {
          const t = da / (da - db), v = { p: a.p.clone().lerp(b.p, t), uv: a.uv.clone().lerp(b.uv, t) };
          polygon.push(v);
          cross(v.p);
        }
      }
      for (let j = 1; j + 1 < polygon.length; j++) tri(polygon[0], polygon[j], polygon[j + 1]);
    }
    if (crossings.length >= 3) {
      const center = crossings.reduce((sum, v2) => sum.add(v2), new THREE.Vector3()).divideScalar(crossings.length), out = n.clone().multiplyScalar(-side);
      const u = new THREE.Vector3(Math.abs(out.y) < 0.8 ? 0 : 1, Math.abs(out.y) < 0.8 ? 1 : 0, 0).cross(out).normalize(), v = out.clone().cross(u);
      crossings.sort((a, b) => Math.atan2(a.clone().sub(center).dot(v), a.clone().sub(center).dot(u)) - Math.atan2(b.clone().sub(center).dot(v), b.clone().sub(center).dot(u)));
      for (let i = 1; i + 1 < crossings.length; i++) tri(...[crossings[0], crossings[i], crossings[i + 1]].map((p2) => ({ p: p2, uv: new THREE.Vector2(p2.dot(u), p2.dot(v)) })));
    }
    let volume = 0;
    for (let i = 0; i < vertices.length; i += 9) volume += new THREE.Vector3().fromArray(vertices, i).dot(new THREE.Vector3().fromArray(vertices, i + 3).cross(new THREE.Vector3().fromArray(vertices, i + 6))) / 6;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(tex, 2));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.userData.convexCut = true;
    return { side, geometry, volume: Math.abs(volume) };
  });
  source.dispose();
  return results;
}
function convexGeometryVolume(geometry, validate = false) {
  const positions = geometry.getAttribute("position"), index = geometry.index, vertices = [];
  if (!positions) return 0;
  for (let i = 0; i < (index?.count ?? positions.count); i++) vertices.push(new THREE.Vector3().fromBufferAttribute(positions, index ? index.getX(i) : i));
  let volume = 0;
  for (let i = 0; i + 2 < vertices.length; i += 3) volume += vertices[i].dot(vertices[i + 1].clone().cross(vertices[i + 2])) / 6;
  if (validate) {
    if (!Number.isFinite(volume) || Math.abs(volume) < 1e-8) return 0;
    const unique = /* @__PURE__ */ new Map();
    for (const v of vertices) unique.set(v.toArray().map((n) => n.toFixed(5)).join(","), v);
    if (unique.size > 128 || vertices.length > 2304) return 0;
    const points = [...unique.values()], sign = Math.sign(volume);
    for (let i = 0; i + 2 < vertices.length; i += 3) {
      const a = vertices[i], normal = vertices[i + 1].clone().sub(a).cross(vertices[i + 2].clone().sub(a)).multiplyScalar(sign);
      if (normal.lengthSq() < 1e-16) continue;
      normal.normalize();
      if (points.some((p) => normal.dot(p.clone().sub(a)) > 2e-4)) return 0;
    }
  }
  return Math.abs(volume);
}
export {
  convexGeometryVolume,
  cutConvexGeometry
};
