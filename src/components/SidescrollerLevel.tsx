import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function SidescrollerLevel({ characterRef }: { characterRef: any }) {
  const cloudsRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    // Parallax or simple moving clouds
    if (cloudsRef.current) {
      cloudsRef.current.children.forEach(cloud => {
        cloud.position.x -= delta * 1.5;
        if (cloud.position.x < -100) cloud.position.x = 100;
      });
    }
  });

  return (
    <group>
      {/* Ground Path */}
      <mesh receiveShadow position={[0, -1, 0]}>
        <boxGeometry args={[400, 2, 8]} />
        <meshStandardMaterial color="#55aa55" />
      </mesh>
      
      <mesh receiveShadow position={[0, -1, -4]}>
         <boxGeometry args={[400, 2, 4]} />
         <meshStandardMaterial color="#449944" />
      </mesh>

      {/* Decorative Trees/Hills Background */}
      {Array.from({ length: 40 }).map((_, i) => {
        const x = (i - 20) * 8 + (Math.random() * 4 - 2);
        return (
          <group key={i} position={[x, 0, -6 - Math.random() * 4]}>
             <mesh castShadow receiveShadow position={[0, 1.5, 0]}>
               <cylinderGeometry args={[0.3, 0.5, 3]} />
               <meshStandardMaterial color="#5c4033" />
             </mesh>
             <mesh castShadow receiveShadow position={[0, 4, 0]}>
               <dodecahedronGeometry args={[2.5]} />
               <meshStandardMaterial color="#2d5a27" roughness={0.8} />
             </mesh>
             {Math.random() > 0.5 && (
               <mesh castShadow receiveShadow position={[1, 5, 0]} scale={0.8}>
                 <dodecahedronGeometry args={[2.5]} />
                 <meshStandardMaterial color="#2d5a27" roughness={0.8} />
               </mesh>
             )}
          </group>
        );
      })}

      {/* Foreground elements */}
      {Array.from({ length: 20 }).map((_, i) => {
        const x = (i - 10) * 15 + (Math.random() * 5);
        return (
          <group key={`fg-${i}`} position={[x, 0, 5 + Math.random() * 2]}>
             <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
               <boxGeometry args={[0.8, 0.5, 0.8]} />
               <meshStandardMaterial color="#777777" roughness={0.9} />
             </mesh>
          </group>
        );
      })}

      {/* Clouds */}
      <group ref={cloudsRef} position={[0, 15, -15]}>
        {Array.from({ length: 15 }).map((_, i) => {
          const x = Math.random() * 200 - 100;
          const y = Math.random() * 5;
          const z = Math.random() * 10 - 5;
          const scale = 1 + Math.random() * 1.5;
          return (
            <mesh key={`cloud-${i}`} position={[x, y, z]} scale={scale}>
              <sphereGeometry args={[2, 16, 16]} />
              <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
              <mesh position={[1.5, 0, 0]} scale={0.8}>
                <sphereGeometry args={[2, 16, 16]} />
                <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
              </mesh>
              <mesh position={[-1.5, 0.5, 0]} scale={0.9}>
                <sphereGeometry args={[2, 16, 16]} />
                <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
              </mesh>
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
