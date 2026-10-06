import * as THREE from 'three';

const group = new THREE.Group();
group.rotation.set(0, Math.PI / 2, 0);

const hLine = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.5));
hLine.rotation.set(0, 0, Math.PI / 2);
group.add(hLine);

const vLine = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.5));
group.add(vLine);

group.updateMatrixWorld(true);

const hBox = new THREE.Box3().setFromObject(hLine);
const vBox = new THREE.Box3().setFromObject(vLine);

console.log("hLine width (X bounds):", hBox.max.x - hBox.min.x);
console.log("vLine width (X bounds):", vBox.max.x - vBox.min.x);
