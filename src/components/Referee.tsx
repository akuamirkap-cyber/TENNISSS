import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gamePositions } from '../utils/gameState';
import { MumuSkin } from './MumuSkin';

export function Referee() {
  const headRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const armRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    // Make mumu sit
    if (leftLegRef.current) {
        leftLegRef.current.rotation.x = Math.PI / 2;
        leftLegRef.current.position.y = 0.15;
        leftLegRef.current.position.z = 0.2;
    }
    if (rightLegRef.current) {
        rightLegRef.current.rotation.x = Math.PI / 2;
        rightLegRef.current.position.y = 0.15;
        rightLegRef.current.position.z = 0.2;
    }
    if (leftArmRef.current) {
        leftArmRef.current.rotation.x = Math.PI / 4;
    }
    if (armRef.current) {
        armRef.current.rotation.x = Math.PI / 4;
    }

    // Subtle head movement
    if (headRef.current) {
      // Smoothly look at the ball
      const targetPosition = gamePositions.ball.clone();
      
      // Prevent looking down/up by keeping the target at head level
      const headWorldPos = new THREE.Vector3();
      headRef.current.getWorldPosition(headWorldPos);
      targetPosition.y = headWorldPos.y;

      // Store current rotation
      const currentRot = headRef.current.rotation.clone();
      // Calculate desired rotation
      headRef.current.lookAt(targetPosition);
      const targetRot = headRef.current.rotation.clone();
      // Revert and lerp (for smooth movement)
      headRef.current.rotation.copy(currentRot);
      headRef.current.quaternion.slerp(new THREE.Quaternion().setFromEuler(targetRot), 0.1);
    }
  });

  const partSizes = {
    head: 0.35,
    torso: 0.45,
    torsoHeight: 1.4,
    arm: 0.12,
    armLength: 2.2,
    leg: 0.16,
    legHeight: 2.2,
  };

  const skinColor = "#f1c27d";
  const shirtColor = "#ffffff";
  const shortsColor = "#222222";
  const shoeColor = "#ffffff";
  const chairColor = "#795548"; // Wood/Metal color
  const chairMetalColor = "#aaaaaa";

  return (
    <group position={[6.2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
      {/* Referee Chair */}
      <group>
        {/* Legs */}
        <mesh position={[-0.5, 1.5, -0.5]} castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.05, 3]} />
          <meshStandardMaterial color={chairMetalColor} />
        </mesh>
        <mesh position={[0.5, 1.5, -0.5]} castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.05, 3]} />
          <meshStandardMaterial color={chairMetalColor} />
        </mesh>
        <mesh position={[-0.5, 1.5, 0.5]} castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.05, 3]} />
          <meshStandardMaterial color={chairMetalColor} />
        </mesh>
        <mesh position={[0.5, 1.5, 0.5]} castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.05, 3]} />
          <meshStandardMaterial color={chairMetalColor} />
        </mesh>

        {/* Seat */}
        <mesh position={[0, 3, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.1, 1.2]} />
          <meshStandardMaterial color={chairColor} />
        </mesh>

        {/* Backrest */}
        <mesh position={[0, 3.4, -0.55]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.8, 0.1]} />
          <meshStandardMaterial color={chairColor} />
        </mesh>
        
        {/* Armrests */}
        <mesh position={[-0.55, 3.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.1, 1.0]} />
          <meshStandardMaterial color={chairColor} />
        </mesh>
        <mesh position={[0.55, 3.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.1, 1.0]} />
          <meshStandardMaterial color={chairColor} />
        </mesh>
        
        {/* Steps/Ladder */}
        <mesh position={[0.5, 0.5, 0.5]} rotation={[0, 0, Math.PI / 8]} castShadow receiveShadow>
          <cylinderGeometry args={[0.03, 0.03, 3]} />
          <meshStandardMaterial color={chairMetalColor} />
        </mesh>
        <mesh position={[0.5, 1.5, 0.5]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.05, 0.6]} />
          <meshStandardMaterial color={chairColor} />
        </mesh>
        <mesh position={[0.5, 2.5, 0.5]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.05, 0.6]} />
          <meshStandardMaterial color={chairColor} />
        </mesh>
      </group>

      {/* Referee Character (Sitting) */}
      <group position={[0, 3.0, 0.2]}>
          <MumuSkin
             headRef={headRef}
             leftLegRef={leftLegRef}
             rightLegRef={rightLegRef}
             armRef={armRef}
             leftArmRef={leftArmRef}
             torsoRef={torsoRef}
             headChildren={
               <>
                 {/* Cap */}
                 <group position={[0, 0.08, 0]}>
                    <mesh castShadow position={[0, 0.15, 0]} scale={[1.45, 1.1, 1.15]}>
                      <sphereGeometry args={[0.35, 32, 16, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
                      <meshStandardMaterial color="#3b82f6" roughness={0.8} />
                    </mesh>
                    {/* Visor */}
                    <mesh castShadow position={[0, 0.12, 0.28]} rotation={[-0.1, 0, 0]} scale={[1.4, 1, 1.2]}>
                      <cylinderGeometry args={[0.35, 0.35, 0.02, 32, 1, false, 0, Math.PI]} />
                      <meshStandardMaterial color="#3b82f6" roughness={0.8} />
                    </mesh>
                 </group>
                 {/* Whistle */}
                 <group position={[0, -0.15, 0.48]}>
                    <mesh castShadow position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                       <cylinderGeometry args={[0.02, 0.02, 0.1]} />
                       <meshStandardMaterial color="#silver" />
                    </mesh>
                    <mesh castShadow position={[0, -0.05, 0.05]}>
                       <boxGeometry args={[0.04, 0.04, 0.08]} />
                       <meshStandardMaterial color="#silver" />
                    </mesh>
                    {/* string */}
                    <mesh position={[0, -0.05, -0.15]} rotation={[Math.PI/4, 0, 0]}>
                       <torusGeometry args={[0.1, 0.005, 8, 16]} />
                       <meshStandardMaterial color="#111" />
                    </mesh>
                 </group>
               </>
             }
          />
        </group>
    </group>
  );
}