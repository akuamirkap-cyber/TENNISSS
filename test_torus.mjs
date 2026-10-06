import * as THREE from 'three';

const group = new THREE.Group();
const mesh1 = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 16, 48));
group.add(mesh1);

const mesh2 = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.01, 32));
mesh2.rotation.set(Math.PI / 2, 0, 0);
group.add(mesh2);

group.updateMatrixWorld(true);

const box1 = new THREE.Box3().setFromObject(mesh1);
console.log("Torus world box:", box1);

const box2 = new THREE.Box3().setFromObject(mesh2);
console.log("Cyl world box:", box2);

