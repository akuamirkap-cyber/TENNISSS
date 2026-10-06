import * as THREE from 'three';

const torus = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.022, 16, 48));
torus.updateMatrixWorld(true);

const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.01, 32));
cyl.rotation.set(Math.PI / 2, 0, 0);
cyl.updateMatrixWorld(true);

const tBox = new THREE.Box3().setFromObject(torus);
const cBox = new THREE.Box3().setFromObject(cyl);

console.log("Torus Z depth:", tBox.max.z - tBox.min.z);
console.log("Cyl Z depth:", cBox.max.z - cBox.min.z);
