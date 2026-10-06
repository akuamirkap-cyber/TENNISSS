import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEditorStore } from '../store';
import { gamePositions } from '../utils/gameState';

function MumuTail({ color, length = 1.2, baseRadius = 0.08, maxRadius = 0.35, tipRadius = 0.15, disableAnimation = false,
  isSitting = false }: { color: string, length?: number, baseRadius?: number, maxRadius?: number, tipRadius?: number, disableAnimation?: boolean, isSitting?: boolean }) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  
  // Physics states for control points
  const p1World = React.useRef(new THREE.Vector3());
  const p2World = React.useRef(new THREE.Vector3());
  const p3World = React.useRef(new THREE.Vector3());
  
  const p1Vel = React.useRef(new THREE.Vector3());
  const p2Vel = React.useRef(new THREE.Vector3());
  const p3Vel = React.useRef(new THREE.Vector3());
  
  // Track if initialized
  const initialized = React.useRef(false);

  const geometryData = React.useMemo(() => {
    // Increase segments for smoother bending and custom inflation (pengeditan custom ekor)
    const geo = new THREE.CylinderGeometry(1, 1, length, 24, 64, false);
    geo.translate(0, length / 2, 0); 
    
    const posAttribute = geo.attributes.position;
    const orig = new Float32Array(posAttribute.array.length);
    orig.set(posAttribute.array);
    
    return { geometry: geo, originalPositions: orig };
  }, [length]);
  
  const { geometry, originalPositions } = geometryData;

  useFrame((state, delta) => {
    if (disableAnimation) return;
    if (!meshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.05); // cap delta to prevent physics explosion
    
    // Organic squirrel tail motion: ideal local positions
    const speed = 2.2;
    const wave = time * speed;
    
    const p1Ideal = new THREE.Vector3(
      Math.sin(wave) * 0.08,
      length * 0.25,
      -length * 0.5 + Math.sin(wave * 0.7) * 0.05
    );
    const p2Ideal = new THREE.Vector3(
      Math.sin(wave - 0.8) * 0.15,
      length * 0.75, 
      -length * 0.4 + Math.cos(wave * 0.7) * 0.08
    );
    const p3Ideal = new THREE.Vector3(
      Math.sin(wave - 1.6) * 0.22,
      length * 0.95 + Math.cos(wave * 1.3) * 0.08, 
      0.15 + Math.sin(wave - 0.5) * 0.1
    );

    // Convert ideal positions to world space to create lag/inertia when the character moves
    const targetP1 = p1Ideal.clone();
    meshRef.current.localToWorld(targetP1);
    
    const targetP2 = p2Ideal.clone();
    meshRef.current.localToWorld(targetP2);
    
    const targetP3 = p3Ideal.clone();
    meshRef.current.localToWorld(targetP3);
    
    if (!initialized.current) {
      p1World.current.copy(targetP1);
      p2World.current.copy(targetP2);
      p3World.current.copy(targetP3);
      initialized.current = true;
    }

    // Spring physics (stiffness and damping for each point to make it feel like a tail)
    const applySpring = (current: THREE.Vector3, target: THREE.Vector3, vel: THREE.Vector3, stiffness: number, damping: number) => {
      const force = target.clone().sub(current).multiplyScalar(stiffness);
      const dampingForce = vel.clone().multiplyScalar(damping);
      const acceleration = force.sub(dampingForce);
      vel.add(acceleration.multiplyScalar(dt));
      current.add(vel.clone().multiplyScalar(dt));
    };

    // p1 is stiffest (closest to body), p3 is loosest (tip)
    applySpring(p1World.current, targetP1, p1Vel.current, 400, 25);
    applySpring(p2World.current, targetP2, p2Vel.current, 200, 15);
    applySpring(p3World.current, targetP3, p3Vel.current, 100, 8);

    // Convert back to local space for the bezier curve
    const p0 = new THREE.Vector3(0, 0, 0);
    const p1 = p1World.current.clone();
    meshRef.current.worldToLocal(p1);
    
    const p2 = p2World.current.clone();
    meshRef.current.worldToLocal(p2);
    
    const p3 = p3World.current.clone();
    meshRef.current.worldToLocal(p3);
    
    // Enforce bone lengths based on ideal positions to prevent stretching like rubber
    const idealDist1 = p1Ideal.length();
    const idealDist2 = p1Ideal.distanceTo(p2Ideal);
    const idealDist3 = p2Ideal.distanceTo(p3Ideal);

    // p1 distance from p0 (0,0,0)
    p1.copy(p1.normalize().multiplyScalar(idealDist1));
    // p2 distance from p1
    p2.copy(p1.clone().add(p2.clone().sub(p1).normalize().multiplyScalar(idealDist2)));
    // p3 distance from p2
    p3.copy(p2.clone().add(p3.clone().sub(p2).normalize().multiplyScalar(idealDist3)));
    
    const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
    
    const posAttribute = geometry.attributes.position;
    const positions = posAttribute.array;
    
    const point = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const refX = new THREE.Vector3(1, 0, 0);
    const refY = new THREE.Vector3(0, 1, 0);
    const axisX = new THREE.Vector3();
    const axisZ = new THREE.Vector3();
    
    for (let i = 0; i < positions.length; i += 3) {
      const origX = originalPositions[i];
      const origY = originalPositions[i + 1];
      const origZ = originalPositions[i + 2];
      
      const t = Math.max(0, Math.min(1, origY / length));
      
      curve.getPoint(t, point);
      curve.getTangent(t, tangent);
      
      // Use a stable reference axis to prevent twisting/flipping when tangent crosses UP vector
      let refAxis = refX;
      if (Math.abs(tangent.x) > 0.99) {
         refAxis = refY; // fallback to Y if tangent is almost purely along X
      }
      axisZ.crossVectors(refAxis, tangent).normalize();
      axisX.crossVectors(tangent, axisZ).normalize();
      
      // Custom tail profile for a fluffy squirrel look (pengeditan custom ekor)
      const baseR = baseRadius;
      const maxR = maxRadius;
      const tipR = tipRadius;
      
      let profile = 1.0;
      if (t < 0.5) {
        const x = t / 0.5;
        // ease in-out
        profile = baseR + (maxR - baseR) * (3 * x * x - 2 * x * x * x);
      } else {
        const x = (t - 0.5) / 0.5;
        // ease in-out
        profile = maxR + (tipR - maxR) * (3 * x * x - 2 * x * x * x);
      }
      
      // Round the tip (agar ujung ekor tidak lancip tapi smooth/bulat)
      const distFromTip = (1 - t) * length;
      if (distFromTip < tipR) {
        const h = tipR - distFromTip;
        const hemi = Math.sqrt(Math.max(0, tipR * tipR - h * h));
        profile = Math.min(profile, hemi);
      }
      
      positions[i] = point.x + origX * axisX.x * profile + origZ * axisZ.x * profile;
      positions[i + 1] = point.y + origX * axisX.y * profile + origZ * axisZ.y * profile;
      positions[i + 2] = point.z + origX * axisX.z * profile + origZ * axisZ.z * profile;
    }
    
    posAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
       <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

interface MumuSkinProps {
  color?: string;
  headRef?: any;
  torsoRef?: React.Ref<THREE.Group>;
  armRef?: React.Ref<THREE.Group>;
  leftArmRef?: React.Ref<THREE.Group>;
  leftLegRef?: React.Ref<THREE.Group>;
  rightLegRef?: React.Ref<THREE.Group>;
  children?: React.ReactNode;
  headChildren?: React.ReactNode;
  disableAnimation?: boolean;
  isSitting?: boolean;
}

export function MumuSkin({ 
  color,
  headRef,
  torsoRef,
  armRef,
  leftArmRef,
  leftLegRef,
  rightLegRef,
  children,
  headChildren,
  disableAnimation = false,
  isSitting = false
}: MumuSkinProps) {
  const furColor = "#B87333"; // Light brown copper
  const leftPupilRef = React.useRef<THREE.Group>(null);
  const rightPupilRef = React.useRef<THREE.Group>(null);
  
  const leftTopEyelidRef = React.useRef<THREE.Mesh>(null);
  const leftBottomEyelidRef = React.useRef<THREE.Mesh>(null);
  const rightTopEyelidRef = React.useRef<THREE.Mesh>(null);
  const rightBottomEyelidRef = React.useRef<THREE.Mesh>(null);
  const blinkTimer = React.useRef(0);
  const nextBlink = React.useRef(3 + Math.random() * 4);
  
  useFrame((state, delta) => {
     if (disableAnimation) {
        // Keep eyes open if animation disabled
        if (leftTopEyelidRef.current) leftTopEyelidRef.current.rotation.x = -Math.PI / 2;
        if (leftBottomEyelidRef.current) leftBottomEyelidRef.current.rotation.x = Math.PI / 2;
        if (rightTopEyelidRef.current) rightTopEyelidRef.current.rotation.x = -Math.PI / 2;
        if (rightBottomEyelidRef.current) rightBottomEyelidRef.current.rotation.x = Math.PI / 2;
        return;
     }
     
     // Blinking logic
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
        
        // Transform ball position to head's local space
        const headLocalBallPos = headRef.current.worldToLocal(ballPosWorld.clone());
        
        let targetX = headLocalBallPos.x;
        let targetY = headLocalBallPos.y;
        let targetZ = headLocalBallPos.z;
        
        // If ball is behind the character, look forward
        if (targetZ < 0.5) targetZ = 0.5;
        
        const angleX = Math.atan2(targetX, targetZ);
        const angleY = Math.atan2(targetY, targetZ);
        
        const maxOffsetX = 0.06;
        const maxOffsetY = 0.06;
        
        // The pupils in Mumu are placed in groups that are already rotated a bit, 
        // but adding local X/Y translation works well enough.
        let offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, angleX * 0.08));
        let offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, angleY * 0.08));
        
        // Lerp for smooth eye movement
        leftPupilRef.current.position.x += (offsetX - leftPupilRef.current.position.x) * 0.2;
        leftPupilRef.current.position.y += (offsetY - leftPupilRef.current.position.y) * 0.2;
        
        rightPupilRef.current.position.x += (offsetX - rightPupilRef.current.position.x) * 0.2;
        rightPupilRef.current.position.y += (offsetY - rightPupilRef.current.position.y) * 0.2;
     }
  });
  const backColor = "#8B4513"; // Darker brown
  const bellyColor = "#FFF8DC"; // Cream
  const earInnerColor = "#E6A8A8"; 
  const noseColor = "#3A2F2F";  
  
  const { mousePartSizes } = useEditorStore();
  
  return (
    <>
      {/* Torso */}
      <group ref={torsoRef} position={[0, 0.6, 0]} scale={[1.2, 1.2, 1.2]}>
        <group scale={[mousePartSizes.body, mousePartSizes.bodyHeight, mousePartSizes.body]}>
           {/* Main body (chubby capsule-like) */}
           <mesh castShadow receiveShadow position={[0, 0, 0]}>
             <cylinderGeometry args={[0.3, 0.35, 0.6, 10]} />
             <meshStandardMaterial color={furColor} roughness={0.9} />
           </mesh>
           <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
             <sphereGeometry args={[0.3, 10, 8]} />
             <meshStandardMaterial color={furColor} roughness={0.9} />
           </mesh>
           <mesh castShadow receiveShadow position={[0, -0.3, 0]}>
             <sphereGeometry args={[0.35, 10, 8]} />
             <meshStandardMaterial color={furColor} roughness={0.9} />
           </mesh>
           
           {/* Dark back patch */}
           <mesh position={[0, 0.0, -0.15]} castShadow receiveShadow scale={[1.1, 1.3, 0.8]}>
             <sphereGeometry args={[0.26, 10, 8]} />
             <meshStandardMaterial color={backColor} roughness={0.9} />
           </mesh>
           
           {/* Belly patch */}
           <mesh position={[0, -0.05, 0.25]} castShadow receiveShadow scale={[1, 1.1, 0.6]}>
             <sphereGeometry args={[0.3, 10, 8]} />
             <meshStandardMaterial color={bellyColor} roughness={0.9} />
           </mesh>
        </group>

        {/* Head */}
        <group ref={headRef} position={[0, mousePartSizes.headY + 0.05, 0]} scale={[mousePartSizes.head, mousePartSizes.head, mousePartSizes.head]}>
          {/* Head base - wide and rounded */}
          <mesh castShadow receiveShadow scale={[1.4, 1.1, 1.1]}>
            <sphereGeometry args={[0.35, 12, 12]} />
            <meshStandardMaterial color={furColor} roughness={0.9} />
          </mesh>
          
          {/* Face mask - cream */}
          <mesh castShadow receiveShadow position={[0, -0.05, 0.1]} scale={[1.2, 0.9, 1]}>
            <sphereGeometry args={[0.32, 12, 12]} />
            <meshStandardMaterial color={bellyColor} roughness={0.9} />
          </mesh>

          {/* Left Ear - large, wide, rounded-triangular, sides of head */}
          <group position={[-0.32, 0.08, -0.05]} rotation={[0.2, 0.3, 1.2]} scale={[mousePartSizes.ears, mousePartSizes.ears, mousePartSizes.ears * 0.4]}>
             {/* Outer ear */}
             <mesh castShadow receiveShadow position={[0, 0.15, 0]}>
               <cylinderGeometry args={[0.06, 0.18, 0.3, 10]} />
               <meshStandardMaterial color={furColor} roughness={0.9} />
             </mesh>
             <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
               <sphereGeometry args={[0.06, 10, 8]} />
               <meshStandardMaterial color={furColor} roughness={0.9} />
             </mesh>
             {/* Inner ear */}
             <mesh castShadow receiveShadow position={[0, 0.15, 0.05]}>
               <cylinderGeometry args={[0.02, 0.12, 0.22, 10]} />
               <meshStandardMaterial color={earInnerColor} roughness={0.8} />
             </mesh>
             <mesh castShadow receiveShadow position={[0, 0.26, 0.05]}>
               <sphereGeometry args={[0.02, 10, 8]} />
               <meshStandardMaterial color={earInnerColor} roughness={0.8} />
             </mesh>
          </group>
          
          {/* Right Ear */}
          <group position={[0.32, 0.08, -0.05]} rotation={[0.2, -0.3, -1.2]} scale={[mousePartSizes.ears, mousePartSizes.ears, mousePartSizes.ears * 0.4]}>
             {/* Outer ear */}
             <mesh castShadow receiveShadow position={[0, 0.15, 0]}>
               <cylinderGeometry args={[0.06, 0.18, 0.3, 10]} />
               <meshStandardMaterial color={furColor} roughness={0.9} />
             </mesh>
             <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
               <sphereGeometry args={[0.06, 10, 8]} />
               <meshStandardMaterial color={furColor} roughness={0.9} />
             </mesh>
             {/* Inner ear */}
             <mesh castShadow receiveShadow position={[0, 0.15, 0.05]}>
               <cylinderGeometry args={[0.02, 0.12, 0.22, 10]} />
               <meshStandardMaterial color={earInnerColor} roughness={0.8} />
             </mesh>
             <mesh castShadow receiveShadow position={[0, 0.26, 0.05]}>
               <sphereGeometry args={[0.02, 10, 8]} />
               <meshStandardMaterial color={earInnerColor} roughness={0.8} />
             </mesh>
          </group>

          <group scale={[mousePartSizes.snout, mousePartSizes.snout, mousePartSizes.snout]}>
            {/* Small Muzzle */}
            <mesh position={[0, -0.15, 0.35]} castShadow receiveShadow scale={[1.2, 0.8, 0.8]}>
              <sphereGeometry args={[0.12, 10, 8]} />
              <meshStandardMaterial color={bellyColor} roughness={0.9} />
            </mesh>
            {/* Nose */}
            <mesh position={[0, -0.1, 0.43]} castShadow receiveShadow scale={[1.2, 0.8, 1]}>
              <sphereGeometry args={[0.04, 10, 8]} />
              <meshStandardMaterial color={noseColor} roughness={0.6} />
            </mesh>
          </group>

          {/* Huge Amber Eyes (40% of face width means they are very large) */}
          <group position={[-0.2, 0.05, 0.3]} rotation={[-0.05, -0.2, 0.1]}>
             {/* Amber Iris */}
             <mesh castShadow receiveShadow scale={[0.2, 0.22, 0.08]}>
               <sphereGeometry args={[1, 12, 12]} />
               <meshStandardMaterial color="#e88915" roughness={0.2} metalness={0.1} />
             </mesh>
             {/* Eyelids */}
             <group scale={[0.21, 0.23, 0.17]}>
               <mesh ref={leftTopEyelidRef} castShadow receiveShadow>
                 <sphereGeometry args={[1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                 <meshStandardMaterial color={furColor} roughness={0.8} />
               </mesh>
               <mesh ref={leftBottomEyelidRef} castShadow receiveShadow>
                 <sphereGeometry args={[1, 16, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                 <meshStandardMaterial color={furColor} roughness={0.8} />
               </mesh>
             </group>
             {/* Huge Pupil that moves */}
             <group ref={leftPupilRef} position={[0, 0, 0.05]}>
                 <mesh castShadow receiveShadow scale={[0.16, 0.18, 0.04]}>
                   <sphereGeometry args={[1, 12, 12]} />
                   <meshStandardMaterial color="#000000" roughness={0.1} metalness={0.1} />
                 </mesh>
                 {/* Eye Highlight attached to pupil so it moves with it */}
                 <mesh position={[0.05, 0.08, 0.03]} castShadow receiveShadow scale={[0.04, 0.04, 0.02]}>
                   <sphereGeometry args={[1, 10, 8]} />
                   <meshStandardMaterial color="#ffffff" roughness={0} />
                 </mesh>
             </group>
          </group>
          
          <group position={[0.2, 0.05, 0.3]} rotation={[-0.05, 0.2, -0.1]}>
             {/* Amber Iris */}
             <mesh castShadow receiveShadow scale={[0.2, 0.22, 0.08]}>
               <sphereGeometry args={[1, 12, 12]} />
               <meshStandardMaterial color="#e88915" roughness={0.2} metalness={0.1} />
             </mesh>
             {/* Eyelids */}
             <group scale={[0.21, 0.23, 0.17]}>
               <mesh ref={rightTopEyelidRef} castShadow receiveShadow>
                 <sphereGeometry args={[1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                 <meshStandardMaterial color={furColor} roughness={0.8} />
               </mesh>
               <mesh ref={rightBottomEyelidRef} castShadow receiveShadow>
                 <sphereGeometry args={[1, 16, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                 <meshStandardMaterial color={furColor} roughness={0.8} />
               </mesh>
             </group>
             {/* Huge Pupil */}
             <group ref={rightPupilRef} position={[0, 0, 0.05]}>
                 <mesh castShadow receiveShadow scale={[0.16, 0.18, 0.04]}>
                   <sphereGeometry args={[1, 12, 12]} />
                   <meshStandardMaterial color="#000000" roughness={0.1} metalness={0.1} />
                 </mesh>
                 {/* Eye Highlight */}
                 <mesh position={[0.05, 0.08, 0.03]} castShadow receiveShadow scale={[0.04, 0.04, 0.02]}>
                   <sphereGeometry args={[1, 10, 8]} />
                   <meshStandardMaterial color="#ffffff" roughness={0} />
                 </mesh>
             </group>
          </group>
          
          {headChildren}
        </group>

        {/* Tail - Large, fluffy, curled */}
        <group position={[0, -0.2 * mousePartSizes.bodyHeight, -0.2]} rotation={[mousePartSizes.tailRotation + 0.5, 0, 0]} scale={[mousePartSizes.tail * 0.9, mousePartSizes.tail * 0.9, mousePartSizes.tail * 0.9]}>
           <MumuTail color={furColor} length={1.3} baseRadius={mousePartSizes.tailBaseSize} maxRadius={mousePartSizes.tailMaxSize} tipRadius={mousePartSizes.tailTipSize} disableAnimation={disableAnimation} />
        </group>
        
        {/* Tiny Arms */}
        <group ref={armRef} position={[-mousePartSizes.armX, mousePartSizes.armY - 0.1, 0]} rotation={[0, 0, mousePartSizes.armRotation]} scale={[mousePartSizes.arms, mousePartSizes.arms, mousePartSizes.arms]}>
          <mesh castShadow receiveShadow position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.05, 0.15]} />
            <meshStandardMaterial color={furColor} />
          </mesh>
          {children}
        </group>
        
        <group ref={leftArmRef} position={[mousePartSizes.armX, mousePartSizes.armY - 0.1, 0]} rotation={[0, 0, -mousePartSizes.armRotation]} scale={[mousePartSizes.arms, mousePartSizes.arms, mousePartSizes.arms]}>
          <mesh castShadow receiveShadow position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.05, 0.15]} />
            <meshStandardMaterial color={furColor} />
          </mesh>
        </group>
      </group>

      {/* Tiny Legs */}
      <group ref={leftLegRef} position={[-mousePartSizes.legX - 0.05, mousePartSizes.legY + (isSitting ? 0.1 : 0), (isSitting ? 0.2 : 0)]} rotation={[isSitting ? -Math.PI / 2 : 0, 0, 0]} scale={[mousePartSizes.legs * 1.0, mousePartSizes.legs * 1.0, mousePartSizes.legs * 1.0]}>
        <mesh castShadow receiveShadow position={[0, -0.1, 0]}>
          <capsuleGeometry args={[0.06, 0.15]} />
          <meshStandardMaterial color={furColor} />
        </mesh>
        {/* Tiny Foot */}
        <mesh castShadow receiveShadow position={[0, -0.18, 0.05]}>
           <boxGeometry args={[0.08, 0.06, 0.12]} />
           <meshStandardMaterial color={furColor} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[mousePartSizes.legX + 0.05, mousePartSizes.legY + (isSitting ? 0.1 : 0), (isSitting ? 0.2 : 0)]} rotation={[isSitting ? -Math.PI / 2 : 0, 0, 0]} scale={[mousePartSizes.legs * 1.0, mousePartSizes.legs * 1.0, mousePartSizes.legs * 1.0]}>
        <mesh castShadow receiveShadow position={[0, -0.1, 0]}>
          <capsuleGeometry args={[0.06, 0.15]} />
          <meshStandardMaterial color={furColor} />
        </mesh>
        {/* Tiny Foot */}
        <mesh castShadow receiveShadow position={[0, -0.18, 0.05]}>
           <boxGeometry args={[0.08, 0.06, 0.12]} />
           <meshStandardMaterial color={furColor} />
        </mesh>
      </group>
    </>
  );
}
