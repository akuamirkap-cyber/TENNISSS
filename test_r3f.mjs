import { CylinderGeometry, TorusGeometry, Euler, Vector3, Mesh } from 'three';

const cyl = new Mesh(new CylinderGeometry(0.255, 0.255, 0.01, 32));
cyl.rotation.x = Math.PI / 2;
cyl.updateMatrixWorld(true);

const torus = new Mesh(new TorusGeometry(0.26, 0.022, 16, 48));
torus.updateMatrixWorld(true);

console.log("Cyl normal (Y axis transformed):", new Vector3(0, 1, 0).applyEuler(cyl.rotation));
console.log("Torus normal (Z axis transformed):", new Vector3(0, 0, 1).applyEuler(torus.rotation));
