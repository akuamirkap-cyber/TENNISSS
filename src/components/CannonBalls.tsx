import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CannonBall {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  active: boolean;
}

export function CannonBalls() {
  const ballsRef = useRef<THREE.Group>(null);
  const [balls, setBalls] = useState<CannonBall[]>([]);
  const lastSpawnRef = useRef(0);
  const ballIdRef = useRef(0);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    
    // Spawn new ball every 2.5 seconds
    if (time - lastSpawnRef.current > 2.5) {
      lastSpawnRef.current = time;
      ballIdRef.current++;
      setBalls(prev => [...prev, {
        id: ballIdRef.current,
        // Spawn at cannon position
        position: new THREE.Vector3((Math.random() - 0.5) * 8, 6.5, -100),
        velocity: new THREE.Vector3(0, 0, 15), // Move along +Z (down the ramp)
        active: true
      }]);
    }

    // Expose for collision
    (window as any).cannonBalls = [];

    // Update balls
    setBalls(prev => prev.map(ball => {
      if (!ball.active) return ball;
      
      const newPos = ball.position.clone();
      
      // Gravity and movement
      ball.velocity.y -= 20 * delta; // Gravity
      newPos.add(ball.velocity.clone().multiplyScalar(delta));
      
      // Ramp ground detection
      let groundY = 0;
      if (newPos.z > -60) groundY = 0;
      else if (newPos.z > -100) groundY = ((newPos.z + 60) / -40) * 5;
      else groundY = 5;

      const radius = 1.5;
      if (newPos.y - radius <= groundY) {
        newPos.y = groundY + radius;
        ball.velocity.y = Math.abs(ball.velocity.y) * 0.5; // Bounce
      }

      // Roll
      const speed = ball.velocity.length();

      if (newPos.z > 0) {
        return { ...ball, active: false }; // Off screen
      }
      
      (window as any).cannonBalls.push({
        position: newPos,
        radius: radius
      });

      return { ...ball, position: newPos };
    }).filter(b => b.active));
  });

  return (
    <group ref={ballsRef}>
      {balls.map(ball => (
        <mesh key={ball.id} position={ball.position} castShadow receiveShadow>
          <sphereGeometry args={[1.5, 32, 32]} />
          <meshStandardMaterial color="#333333" roughness={0.7} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
}
