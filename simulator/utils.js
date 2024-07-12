import {
  PointsMaterial,
  BufferGeometry,
  Points,
  Vector3,
  ArrowHelper,
} from "three";

// A version of traverse that will stop a branch when the callback returns "true"
function traverse(obj, cb, descendants = "children") {
  let ret = cb(obj);

  if (ret || !obj[descendants]) {
    return;
  }

  const children = obj[descendants];
  for (let i = 0; i < children.length; i++) {
    traverse(children[i], cb, descendants);
  }
}

function showPoints(scene, positions, color = null) {
  let material = new PointsMaterial({
    size: 10,
    color: color !== null ? color : 0x00ff00,
    sizeAttenuation: false,
    depthTest: false,
    depthWrite: true,
  });
  let geom = new BufferGeometry();
  const vertices = new Float32Array(positions.length * 3);
  for (let i = 0; i < positions.length; i++) {
    vertices[i * 3] = positions[i].x;
    vertices[i * 3 + 1] = positions[i].y;
    vertices[i * 3 + 2] = positions[i].z;
  }
  geom.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

  var dots = new Points(geom, material);
  dots.layers.toggle(31);
  scene.add(dots);
}

function showAxes(objects) {
  for (const o of objects) {
    let color = 0xff0000;
    for (const c of ["x", "y", "z"]) {
      let dir = new Vector3();
      dir[c] = 1.0;
      let arrow = new ArrowHelper(dir, new Vector3(), 0.2, color);
      o.add(arrow);
      color = color >>> 8;
    }
  }
}

/*
 * Returns the signed difference between two angles in [-PI, PI);
 */
function signedAngleDifference(a1, a2) {
  return ((a1 - a2 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
}

export { traverse, showPoints, showAxes, signedAngleDifference };
