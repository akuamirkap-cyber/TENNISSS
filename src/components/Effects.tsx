import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function HitParticles() {
  const [particles, setParticles] = useState<any[]>([]);
  
  useEffect(() => {
    const onHit = (e: any) => {
      const { position, type } = e.detail;
      const count = type === 'smash' ? 12 : 6;
      const color = type === 'smash' ? '#ffeb99' : '#ffffff';
      const speed = type === 'smash' ? 6 : 3;
      
      const newParticles = Array.from({length: count}).map(() => ({
         id: Math.random(),
         pos: position.clone(),
         vel: new THREE.Vector3((Math.random()-0.5)*speed, Math.random()*speed*0.5 + speed*0.5, (Math.random()-0.5)*speed),
         life: 1.0,
         color: new THREE.Color(color)
      }));
      setParticles(p => [...p, ...newParticles].slice(-150)); 
    };
    window.addEventListener('spawnParticles', onHit);
    return () => window.removeEventListener('spawnParticles', onHit);
  }, []);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useEffect(() => {
    if (meshRef.current) {
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      for (let i = 0; i < 150; i++) {
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, []);
  
  useEffect(() => {
     if (!meshRef.current) return;
     particles.forEach((p, i) => {
         meshRef.current.setColorAt(i, p.color);
     });
     if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [particles]);

  useFrame((_, delta) => {
     if (!meshRef.current) return;
     let needsUpdate = false;
     particles.forEach((p, i) => {
        if (p.life > 0) {
           p.life -= delta * 3.0; // fade out faster
           p.pos.addScaledVector(p.vel, delta);
           p.vel.y -= 5 * delta; // soft gravity
           
           dummy.position.copy(p.pos);
           // Soft shrinking effect
           const currentScale = Math.max(0, p.life * (p.color.getHex() === 0xffeb99 ? 0.2 : 0.12));
           dummy.scale.setScalar(currentScale);
           dummy.updateMatrix();
           meshRef.current.setMatrixAt(i, dummy.matrix);
           needsUpdate = true;
        } else if (p.life > -1) {
           p.life = -1; // hide it once
           dummy.scale.setScalar(0);
           dummy.updateMatrix();
           meshRef.current.setMatrixAt(i, dummy.matrix);
           needsUpdate = true;
        }
     });
     if (needsUpdate) {
        meshRef.current.instanceMatrix.needsUpdate = true;
     }
  });

  return (
     <instancedMesh ref={meshRef} args={[undefined, undefined, 150]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial transparent opacity={0.6} depthWrite={false} />
     </instancedMesh>
  )
}
