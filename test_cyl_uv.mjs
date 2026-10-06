import * as THREE from 'three';
const geom = new THREE.CylinderGeometry(100, 100, 50, 4, 1, true, Math.PI * 0.75, Math.PI * 0.5);
const pos = geom.attributes.position;
for(let i=0; i<=4; i++) {
  console.log(`pos: ${pos.getX(i).toFixed(2)}, ${pos.getZ(i).toFixed(2)}`);
}
