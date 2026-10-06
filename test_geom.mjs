import * as THREE from 'three';
const torus = new THREE.TorusGeometry(1, 0.1, 16, 48);
torus.computeBoundingBox();
console.log("Torus:", torus.boundingBox);

const cyl = new THREE.CylinderGeometry(1, 1, 0.01, 32);
cyl.rotateX(Math.PI / 2);
cyl.computeBoundingBox();
console.log("Cyl:", cyl.boundingBox);
