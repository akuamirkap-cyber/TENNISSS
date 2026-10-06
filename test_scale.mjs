import * as THREE from 'three';

const group = new THREE.Group();
group.rotation.set(0, Math.PI / 2, 0);

const headGroup = new THREE.Group();
headGroup.scale.set(1.05, 1.35, 1);
group.add(headGroup);

const torusMesh = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.022, 16, 48));
headGroup.add(torusMesh);

const cylMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.01, 32));
cylMesh.rotation.set(Math.PI / 2, 0, 0);
headGroup.add(cylMesh);

group.updateMatrixWorld(true);

const torusBox = new THREE.Box3().setFromObject(torusMesh);
const cylBox = new THREE.Box3().setFromObject(cylMesh);

console.log("WITH SCALE:");
console.log("Torus width (X bounds):", torusBox.max.x - torusBox.min.x);
console.log("Cylinder width (X bounds):", cylBox.max.x - cylBox.min.x);
