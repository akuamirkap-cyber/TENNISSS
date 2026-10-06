import React, { forwardRef } from 'react';
import * as THREE from 'three';

export const TennisRacket = forwardRef<THREE.Group, { 
  partSizes: any; 
  color?: string; 
  visible?: boolean;
  position?: [number, number, number];
}>(({ partSizes, color = "#3A82C4", visible = true, position = [0, -0.45, 0] }, ref) => {
  const length = partSizes.racketLength;
  const headSize = partSizes.racketHead;

  return (
    <group ref={ref} visible={visible} position={position} rotation={[Math.PI / 2 + 0.2, 0, 0]} scale={[partSizes.racket, partSizes.racket, partSizes.racket]}>
      <group rotation={[0, Math.PI / 2, 0]}>
        {/* Handle and Shaft (Scaled by length) */}
        <group scale={[1, length, 1]}>
          {/* Grip Base */}
          <mesh position={[0, -0.02, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.04]} />
            <meshStandardMaterial color="#1a5a8e" roughness={0.8} />
          </mesh>
          {/* Grip */}
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.045, 0.4]} />
            <meshStandardMaterial color="#1f69a5" roughness={0.8} />
          </mesh>
          {/* Lower Shaft */}
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.035, 0.1]} />
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
          </mesh>
        </group>

        {/* Throat and Head (Positioned dynamically, scaled by headSize) */}
        <group position={[0, length * 0.5, 0]} scale={[headSize, headSize, headSize]}>
          
          {/* Left Throat Branch */}
          <mesh position={[-0.06, 0.15, 0]} rotation={[0, 0, 0.25]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.32]} />
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
          </mesh>
          
          {/* Right Throat Branch */}
          <mesh position={[0.06, 0.15, 0]} rotation={[0, 0, -0.25]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.32]} />
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
          </mesh>

          {/* Bridge (bottom of the head) */}
          <mesh position={[0, 0.29, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.24]} />
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
          </mesh>
          
          {/* Head Frame */}
          {/* A tennis racket head is oval. We scale a torus on Y. */}
          <group position={[0, 0.61, 0]} scale={[1.05, 1.35, 1]}>
            <mesh castShadow>
              <torusGeometry args={[0.26, 0.022, 16, 48]} />
              <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
            </mesh>
            
            {/* Strings - Solid translucent with slightly distinct color */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.255, 0.255, 0.005, 32]} />
              <meshStandardMaterial 
                color="#e0e0e0" 
                transparent 
                opacity={0.3} 
                roughness={0.9}
              />
            </mesh>
            
            {/* Visual String Lines (Horizontal) */}
            {Array.from({ length: 9 }).map((_, i) => {
              const yPos = (i - 4) * 0.05;
              const width = 0.5 * Math.cos(Math.asin(yPos / 0.25));
              return (
                <mesh key={`h-${i}`} position={[0, yPos, 0]}>
                  <boxGeometry args={[width, 0.002, 0.002]} />
                  <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                </mesh>
              );
            })}
            {/* Visual String Lines (Vertical) */}
            {Array.from({ length: 7 }).map((_, i) => {
              const xPos = (i - 3) * 0.05;
              const height = 0.5 * Math.cos(Math.asin(xPos / 0.25));
              return (
                <mesh key={`v-${i}`} position={[xPos, 0, 0]}>
                  <boxGeometry args={[0.002, height, 0.002]} />
                  <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                </mesh>
              );
            })}
          </group>
        </group>
      </group>
    </group>
  );
});
