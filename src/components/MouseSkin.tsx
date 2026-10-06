import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEditorStore } from '../store';
import { gamePositions } from '../utils/gameState';

function SmoothTail({ color, length = 0.6, baseRadius = 0.04, tipRadius = 0.005 }: { color: string, length?: number, baseRadius?: number, tipRadius?: number }) {
  const geometryData = React.useMemo(() => {
    const geo = new THREE.CylinderGeometry(tipRadius, baseRadius, length, 16, 15);
    geo.translate(0, length / 2, 0); 
    
    const posAttribute = geo.attributes.position;
    const orig = new Float32Array(posAttribute.array.length);
    orig.set(posAttribute.array);
    
    return { geometry: geo, originalPositions: orig };
  }, [length, baseRadius, tipRadius]);
  
  const { geometry, originalPositions } = geometryData;

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    const p0 = new THREE.Vector3(0, 0, 0);
    const p1 = new THREE.Vector3(
      Math.sin(time * 3) * 0.1,
      length * 0.5,
      Math.sin(time * 2) * 0.05
    );
    const p2 = new THREE.Vector3(
      Math.sin(time * 3 - 1) * 0.2,
      length * 0.9, 
      Math.sin(time * 2 - 1) * 0.1
    );
    
    const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
    
    const posAttribute = geometry.attributes.position;
    const positions = posAttribute.array;
    
    const point = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const up = new THREE.Vector3(0, 0, 1);
    const axisX = new THREE.Vector3();
    const axisZ = new THREE.Vector3();
    
    for (let i = 0; i < positions.length; i += 3) {
      const origX = originalPositions[i];
      const origY = originalPositions[i + 1];
      const origZ = originalPositions[i + 2];
      
      const t = Math.max(0, Math.min(1, origY / length));
      
      curve.getPoint(t, point);
      curve.getTangent(t, tangent);
      
      axisX.crossVectors(tangent, up).normalize();
      if (axisX.lengthSq() < 0.001) axisX.set(1, 0, 0);
      axisZ.crossVectors(axisX, tangent).normalize();
      
      positions[i] = point.x + origX * axisX.x + origZ * axisZ.x;
      positions[i + 1] = point.y + origX * axisX.y + origZ * axisZ.y;
      positions[i + 2] = point.z + origX * axisX.z + origZ * axisZ.z;
    }
    
    posAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
       <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}

interface MouseSkinProps {
  color?: string;
  headRef?: any;
  torsoRef?: any;
  armRef?: any;
  leftArmRef?: any;
  leftLegRef?: any;
  rightLegRef?: any;
  children?: React.ReactNode;
}

export function MouseSkin({ 
  color = "#c78652",
  headRef,
  torsoRef,
  armRef,
  leftArmRef,
  leftLegRef,
  rightLegRef,
  children
}: MouseSkinProps) {
  const furColor = color !== "#c78652" ? color : "#b06e3d";
  const earInnerColor = "#f5c4b8";
  const eyeColor = "#ffffff";
  const pupilColor = "#222222";
  const noseColor = "#333333";
  const bellyColor = "#e6ba93";
  
  const { mousePartSizes } = useEditorStore();
  
  const leftTopEyelidRef = React.useRef<THREE.Mesh>(null);
  const leftBottomEyelidRef = React.useRef<THREE.Mesh>(null);
  const rightTopEyelidRef = React.useRef<THREE.Mesh>(null);
  const rightBottomEyelidRef = React.useRef<THREE.Mesh>(null);
  const leftPupilRef = React.useRef<THREE.Group>(null);
  const rightPupilRef = React.useRef<THREE.Group>(null);
  const blinkTimer = React.useRef(0);
  const nextBlink = React.useRef(3 + Math.random() * 4);
  
  useFrame((state, delta) => {
     blinkTimer.current += delta;
     if (blinkTimer.current > nextBlink.current) {
        const blinkDuration = 1.5;
        const t = blinkTimer.current - nextBlink.current;
        
        let blinkProgress = 0;
        if (t < blinkDuration / 2) {
            blinkProgress = t / (blinkDuration / 2);
        } else if (t < blinkDuration) {
            blinkProgress = 1 - ((t - blinkDuration / 2) / (blinkDuration / 2));
        } else {
            blinkProgress = 0;
            blinkTimer.current = 0;
            nextBlink.current = 2 + Math.random() * 5;
        }
        
        const easeInOut = (p: number) => p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
        const progress = easeInOut(blinkProgress);

        const topRotX = -Math.PI / 2 * (1 - progress);
        const bottomRotX = Math.PI / 2 * (1 - progress);
        
        if (leftTopEyelidRef.current) leftTopEyelidRef.current.rotation.x = topRotX;
        if (leftBottomEyelidRef.current) leftBottomEyelidRef.current.rotation.x = bottomRotX;
        if (rightTopEyelidRef.current) rightTopEyelidRef.current.rotation.x = topRotX;
        if (rightBottomEyelidRef.current) rightBottomEyelidRef.current.rotation.x = bottomRotX;
     }

     if (leftPupilRef.current && rightPupilRef.current && headRef && headRef.current) {
        // We want the pupil to look at the ball in local space of the head.
        const ballPosWorld = gamePositions.ball;
        const headLocalBallPos = headRef.current.worldToLocal(ballPosWorld.clone());
        
        let targetX = headLocalBallPos.x;
        let targetY = headLocalBallPos.y;
        let targetZ = headLocalBallPos.z;
        
        // If ball is behind the character, look forward
        if (targetZ < 0.5) targetZ = 0.5;
        
        const angleX = Math.atan2(targetX, targetZ);
        const angleY = Math.atan2(targetY, targetZ);
        
        const maxOffsetX = 0.04;
        const maxOffsetY = 0.06;
        let offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, angleX * 0.08));
        let offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, angleY * 0.08));
        
        leftPupilRef.current.position.x += (offsetX - leftPupilRef.current.position.x) * 0.2;
        // Pupil base Y is -0.05
        leftPupilRef.current.position.y += ((offsetY - 0.05) - leftPupilRef.current.position.y) * 0.2;
        
        rightPupilRef.current.position.x += (offsetX - rightPupilRef.current.position.x) * 0.2;
        rightPupilRef.current.position.y += ((offsetY - 0.05) - rightPupilRef.current.position.y) * 0.2;
     }
  });
  
  return (
    <>
      {/* Torso */}
      <group ref={torsoRef} position={[0, 0.6, 0]} scale={[1.2, 1.2, 1.2]}>
        <group scale={[mousePartSizes.body, mousePartSizes.bodyHeight, mousePartSizes.body]}>
           {/* Main body (capsule-like) */}
           <mesh castShadow receiveShadow position={[0, 0, 0]}>
             <cylinderGeometry args={[0.3, 0.4, 0.7, 16]} />
             <meshStandardMaterial color={furColor} roughness={0.8} />
           </mesh>
           <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
             <sphereGeometry args={[0.3, 16, 16]} />
             <meshStandardMaterial color={furColor} roughness={0.8} />
           </mesh>
           <mesh castShadow receiveShadow position={[0, -0.35, 0]}>
             <sphereGeometry args={[0.4, 16, 16]} />
             <meshStandardMaterial color={furColor} roughness={0.8} />
           </mesh>
           
           {/* Belly patch */}
           <mesh position={[0, -0.05, 0.35]} castShadow receiveShadow scale={[1, 1.2, 0.5]}>
             <sphereGeometry args={[0.25, 16, 16]} />
             <meshStandardMaterial color={bellyColor} roughness={0.9} />
           </mesh>
        </group>

        {/* Head */}
        <group ref={headRef} position={[0, mousePartSizes.headY, 0]} scale={[mousePartSizes.head, mousePartSizes.head, mousePartSizes.head]}>
          {/* Head base */}
          <mesh castShadow receiveShadow scale={[1.2, 1, 1.1]}>
            <sphereGeometry args={[0.45, 32, 32]} />
            <meshStandardMaterial color={furColor} roughness={0.8} />
          </mesh>
          
          {/* Left Ear */}
          <group position={[-0.45, 0.4, -0.1]} rotation={[0, -0.2, 0.3]} scale={[mousePartSizes.ears, mousePartSizes.ears, mousePartSizes.ears]}>
             <mesh castShadow receiveShadow scale={[1, 1, 0.2]}>
               <sphereGeometry args={[0.35, 32, 32]} />
               <meshStandardMaterial color={furColor} roughness={0.8} />
             </mesh>
             <mesh position={[0, 0, 0.05]} castShadow receiveShadow scale={[1, 1, 0.2]}>
               <sphereGeometry args={[0.25, 32, 32]} />
               <meshStandardMaterial color={earInnerColor} roughness={0.8} />
             </mesh>
          </group>
          
          {/* Right Ear */}
          <group position={[0.45, 0.4, -0.1]} rotation={[0, 0.2, -0.3]} scale={[mousePartSizes.ears, mousePartSizes.ears, mousePartSizes.ears]}>
             <mesh castShadow receiveShadow scale={[1, 1, 0.2]}>
               <sphereGeometry args={[0.35, 32, 32]} />
               <meshStandardMaterial color={furColor} roughness={0.8} />
             </mesh>
             <mesh position={[0, 0, 0.05]} castShadow receiveShadow scale={[1, 1, 0.2]}>
               <sphereGeometry args={[0.25, 32, 32]} />
               <meshStandardMaterial color={earInnerColor} roughness={0.8} />
             </mesh>
          </group>

          <group scale={[mousePartSizes.snout, mousePartSizes.snout, mousePartSizes.snout]}>
            {/* Muzzle */}
            <mesh position={[0, -0.1, 0.38]} castShadow receiveShadow scale={[1.2, 0.8, 1]}>
              <sphereGeometry args={[0.25, 32, 32]} />
              <meshStandardMaterial color={bellyColor} roughness={0.8} />
            </mesh>

            {/* Nose */}
            <mesh position={[0, -0.05, 0.62]} castShadow receiveShadow scale={[1.2, 0.8, 1]}>
              <sphereGeometry args={[0.06, 16, 16]} />
              <meshStandardMaterial color={noseColor} roughness={0.6} />
            </mesh>
            
            {/* Whiskers */}
            <group position={[-0.2, -0.1, 0.45]}>
               <mesh position={[-0.15, 0.05, 0]} rotation={[0, 0, Math.PI/2 + 0.2]}>
                  <cylinderGeometry args={[0.005, 0.005, 0.3]} />
                  <meshStandardMaterial color={noseColor} />
               </mesh>
               <mesh position={[-0.15, -0.05, 0]} rotation={[0, 0, Math.PI/2 - 0.2]}>
                  <cylinderGeometry args={[0.005, 0.005, 0.3]} />
                  <meshStandardMaterial color={noseColor} />
               </mesh>
            </group>
            <group position={[0.2, -0.1, 0.45]}>
               <mesh position={[0.15, 0.05, 0]} rotation={[0, 0, Math.PI/2 - 0.2]}>
                  <cylinderGeometry args={[0.005, 0.005, 0.3]} />
                  <meshStandardMaterial color={noseColor} />
               </mesh>
               <mesh position={[0.15, -0.05, 0]} rotation={[0, 0, Math.PI/2 + 0.2]}>
                  <cylinderGeometry args={[0.005, 0.005, 0.3]} />
                  <meshStandardMaterial color={noseColor} />
               </mesh>
            </group>
          </group>

          {/* Eyes */}
          <group position={[-0.18, 0.15, 0.405]} rotation={[-0.1, -0.2, 0.1]}>
             <mesh castShadow receiveShadow scale={[0.15, 0.25, 0.05]}>
               <sphereGeometry args={[1, 16, 16]} />
               <meshStandardMaterial color={eyeColor} />
             </mesh>
             {/* Eyelids */}
             <group scale={[0.16, 0.26, 0.11]}>
               <mesh ref={leftTopEyelidRef} castShadow receiveShadow>
                 <sphereGeometry args={[1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                 <meshStandardMaterial color={furColor} roughness={0.8} />
               </mesh>
               <mesh ref={leftBottomEyelidRef} castShadow receiveShadow>
                 <sphereGeometry args={[1, 16, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                 <meshStandardMaterial color={furColor} roughness={0.8} />
               </mesh>
             </group>
             <group ref={leftPupilRef} position={[0, -0.05, 0.03]}>
               <mesh castShadow receiveShadow scale={[0.08, 0.1, 0.02]}>
                 <sphereGeometry args={[1, 16, 16]} />
                 <meshStandardMaterial color={pupilColor} />
               </mesh>
               <mesh position={[0.03, 0.04, 0.015]} castShadow receiveShadow scale={[0.025, 0.025, 0.02]}>
                 <sphereGeometry args={[1, 10, 8]} />
                 <meshStandardMaterial color="#ffffff" roughness={0} />
               </mesh>
             </group>
          </group>
          
          <group position={[0.18, 0.15, 0.405]} rotation={[-0.1, 0.2, -0.1]}>
             <mesh castShadow receiveShadow scale={[0.15, 0.25, 0.05]}>
               <sphereGeometry args={[1, 16, 16]} />
               <meshStandardMaterial color={eyeColor} />
             </mesh>
             {/* Eyelids */}
             <group scale={[0.16, 0.26, 0.11]}>
               <mesh ref={rightTopEyelidRef} castShadow receiveShadow>
                 <sphereGeometry args={[1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                 <meshStandardMaterial color={furColor} roughness={0.8} />
               </mesh>
               <mesh ref={rightBottomEyelidRef} castShadow receiveShadow>
                 <sphereGeometry args={[1, 16, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                 <meshStandardMaterial color={furColor} roughness={0.8} />
               </mesh>
             </group>
             <group ref={rightPupilRef} position={[0, -0.05, 0.03]}>
               <mesh castShadow receiveShadow scale={[0.08, 0.1, 0.02]}>
                 <sphereGeometry args={[1, 16, 16]} />
                 <meshStandardMaterial color={pupilColor} />
               </mesh>
               <mesh position={[0.03, 0.04, 0.015]} castShadow receiveShadow scale={[0.025, 0.025, 0.02]}>
                 <sphereGeometry args={[1, 10, 8]} />
                 <meshStandardMaterial color="#ffffff" roughness={0} />
               </mesh>
             </group>
          </group>
        </group>

        {/* Tail */}
        <group position={[0, -0.4 * mousePartSizes.bodyHeight, -0.3]} rotation={[mousePartSizes.tailRotation, 0, 0]} scale={[mousePartSizes.tail, mousePartSizes.tail, mousePartSizes.tail]}>
           <SmoothTail color={furColor} length={0.6} baseRadius={0.05} tipRadius={0.015} />
        </group>
        
        {/* Arms */}
        <group ref={armRef} position={[-mousePartSizes.armX, mousePartSizes.armY, 0]} rotation={[0, 0, mousePartSizes.armRotation]} scale={[mousePartSizes.arms, mousePartSizes.arms, mousePartSizes.arms]}>
          <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.08, 0.3]} />
            <meshStandardMaterial color={furColor} />
          </mesh>
          {children}
        </group>
        
        <group ref={leftArmRef} position={[mousePartSizes.armX, mousePartSizes.armY, 0]} rotation={[0, 0, -mousePartSizes.armRotation]} scale={[mousePartSizes.arms, mousePartSizes.arms, mousePartSizes.arms]}>
          <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.08, 0.3]} />
            <meshStandardMaterial color={furColor} />
          </mesh>
        </group>
      </group>

      {/* Legs */}
      <group ref={leftLegRef} position={[-mousePartSizes.legX, mousePartSizes.legY, 0]} scale={[mousePartSizes.legs * 1.2, mousePartSizes.legs * 1.2, mousePartSizes.legs * 1.2]}>
        <mesh castShadow receiveShadow position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.09, 0.2]} />
          <meshStandardMaterial color={furColor} />
        </mesh>
        {/* Foot */}
        <mesh castShadow receiveShadow position={[0, -0.25, 0.05]}>
           <boxGeometry args={[0.14, 0.1, 0.2]} />
           <meshStandardMaterial color={furColor} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[mousePartSizes.legX, mousePartSizes.legY, 0]} scale={[mousePartSizes.legs * 1.2, mousePartSizes.legs * 1.2, mousePartSizes.legs * 1.2]}>
        <mesh castShadow receiveShadow position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.09, 0.2]} />
          <meshStandardMaterial color={furColor} />
        </mesh>
        {/* Foot */}
        <mesh castShadow receiveShadow position={[0, -0.25, 0.05]}>
           <boxGeometry args={[0.14, 0.1, 0.2]} />
           <meshStandardMaterial color={furColor} />
        </mesh>
      </group>
    </>
  );
}
