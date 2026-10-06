import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { StumbleBot } from './StumbleBot';
import { CannonBalls } from './CannonBalls';

export function StumbleGuysLevel() {
  const obstaclesRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (obstaclesRef.current) {
      // Expose to window for collision detection (only rocks now)
      (window as any).stumbleObstacles = obstaclesRef.current.children;
    }
  });

  return (
    <group>
      {/* Starting Platform */}
      <mesh receiveShadow position={[0, -2, 0]}>
        <boxGeometry args={[14, 4, 14]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
      
      {/* Start Line */}
      <mesh receiveShadow position={[0, 0.01, -7]}>
        <boxGeometry args={[14, 0.02, 2]} />
        <meshStandardMaterial color="#33ff33" />
      </mesh>
      
      {/* Start Text Banner */}
      <group position={[0, 3, -7]}>
        <Text fontSize={1.5} color="#22ff22" outlineWidth={0.1} outlineColor="#000">
          START
        </Text>
      </group>
      
      {/* Flat Path */}
      <mesh receiveShadow position={[0, -2, -33.5]}>
        <boxGeometry args={[10, 4, 53]} />
        <meshStandardMaterial color="#666666" />
      </mesh>

      {/* Ramp Path */}
      <group position={[0, 0, -80]}>
        <mesh receiveShadow rotation={[Math.atan(5/40), 0, 0]} position={[0, 2.5 - 2, 0]}>
          <boxGeometry args={[10, 4, Math.sqrt(40*40 + 5*5)]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
      </group>
      
      {/* End Platform */}
      <mesh receiveShadow position={[0, 5 - 2, -110]}>
        <boxGeometry args={[20, 4, 20]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
      
      {/* Finish Line */}
      <mesh receiveShadow position={[0, 5.01, -100]}>
        <boxGeometry args={[10, 0.02, 2]} />
        <meshStandardMaterial color="#ffff33" />
      </mesh>
      
      {/* Finish Banner */}
      <group position={[0, 8, -100]}>
        <Text fontSize={1.5} color="#ffff22" outlineWidth={0.1} outlineColor="#000">
          FINISH
        </Text>
      </group>

      {/* The Cannon Base */}
      <group position={[0, 6.5, -105]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[8, 3, 4]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.5, 2]}>
          <cylinderGeometry args={[1.5, 1.5, 4, 16]} />
          <meshStandardMaterial color="#222222" />
        </mesh>
      </group>
      
      {/* Bots */}
      <StumbleBot id={1} startPosition={[-2, 0, 0]} speed={11.2} color="#3355ff" />
      <StumbleBot id={2} startPosition={[-4, 0, -2]} speed={10.8} color="#ffaa33" />
      <StumbleBot id={3} startPosition={[2, 0, -1]} speed={11.5} color="#aa33ff" />
      <StumbleBot id={4} startPosition={[4, 0, 1]} speed={10.5} color="#33ffaa" />
      <StumbleBot id={5} startPosition={[-1, 0, -3]} speed={11.8} color="#ff3355" />
      <StumbleBot id={6} startPosition={[-3, 0, -1]} speed={12.0} color="#ff33ff" />
      <StumbleBot id={7} startPosition={[1, 0, 1]} speed={10.9} color="#33aaff" />
      <StumbleBot id={8} startPosition={[3, 0, -3]} speed={11.1} color="#ffff33" />
      <StumbleBot id={9} startPosition={[-5, 0, 0]} speed={11.4} color="#aaff33" />
      <StumbleBot id={10} startPosition={[5, 0, -2]} speed={10.7} color="#33ffff" />

      {/* Cannon Balls */}
      <CannonBalls />

      {/* Static Rock Obstacles on the Ramp */}
      <group ref={obstaclesRef}>
        <group position={[-2, (( -68 + 60) / -40) * 5 + 1, -68]}>
          <mesh castShadow receiveShadow rotation={[0.4, 0.2, 0.5]}>
             <dodecahedronGeometry args={[1.5]} />
             <meshStandardMaterial color="#777777" roughness={0.9} />
          </mesh>
        </group>
        <group position={[2.5, (( -78 + 60) / -40) * 5 + 1, -78]}>
          <mesh castShadow receiveShadow rotation={[0.1, 0.8, 0.3]}>
             <dodecahedronGeometry args={[1.8]} />
             <meshStandardMaterial color="#777777" roughness={0.9} />
          </mesh>
        </group>
        <group position={[-3, (( -88 + 60) / -40) * 5 + 1, -88]}>
          <mesh castShadow receiveShadow rotation={[0.7, 0.1, 0.2]}>
             <dodecahedronGeometry args={[1.6]} />
             <meshStandardMaterial color="#777777" roughness={0.9} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
