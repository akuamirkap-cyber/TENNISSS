import * as THREE from 'three';

const geom = new THREE.CylinderGeometry(1, 1, 1, 4, 1, true, Math.PI/2, Math.PI);
const uv = geom.attributes.uv;
const pos = geom.attributes.position;
for(let i=0; i<uv.count; i++) {
  console.log(`pos: ${pos.getX(i).toFixed(2)}, ${pos.getZ(i).toFixed(2)} | u: ${uv.getX(i).toFixed(2)}`);
}
