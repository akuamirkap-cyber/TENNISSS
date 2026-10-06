import * as THREE from 'three';
const geom = new THREE.CylinderGeometry(1, 1, 1, 4, 1, false, Math.PI / 2, Math.PI);
const pos = geom.attributes.position;
for(let i=0; i<pos.count; i++) {
  console.log(pos.getX(i).toFixed(2), pos.getZ(i).toFixed(2));
}
