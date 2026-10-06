const fs = require('fs');
let code = fs.readFileSync('src/components/MumuSkin.tsx', 'utf8');

const beforeRef = `  const furColor = "#B87333"; // Light brown copper`;
const addRefs = `  const furColor = "#B87333"; // Light brown copper
  const leftPupilRef = React.useRef<THREE.Group>(null);
  const rightPupilRef = React.useRef<THREE.Group>(null);
  
  useFrame(() => {
     if (leftPupilRef.current && rightPupilRef.current && headRef && headRef.current) {
        // We want the pupil to look at the ball in local space of the head.
        // The head's forward is +Z in local space (eyes are at Z=0.3).
        const ballPosWorld = gamePositions.ball;
        
        // Transform ball position to head's local space
        const headLocalBallPos = headRef.current.worldToLocal(ballPosWorld.clone());
        
        // The eyes are at Z=0.3, X=+-0.2, Y=0.05 roughly.
        // Let's get the direction from the origin of the head to the ball in local space.
        const dir = headLocalBallPos.normalize();
        
        // Now dir.x and dir.y are exactly what we want for local offsets.
        const maxOffset = 0.05;
        let offsetX = dir.x * 0.08;
        let offsetY = dir.y * 0.08;
        
        // Clamp
        offsetX = Math.max(-maxOffset, Math.min(maxOffset, offsetX));
        offsetY = Math.max(-maxOffset, Math.min(maxOffset, offsetY));
        
        // Apply to pupils (Z is fixed to 0.05 to stick out of iris)
        // Lerp for smooth eye movement
        leftPupilRef.current.position.x += (offsetX - leftPupilRef.current.position.x) * 0.2;
        leftPupilRef.current.position.y += (offsetY - leftPupilRef.current.position.y) * 0.2;
        
        rightPupilRef.current.position.x += (offsetX - rightPupilRef.current.position.x) * 0.2;
        rightPupilRef.current.position.y += (offsetY - rightPupilRef.current.position.y) * 0.2;
     }
  });`;

code = code.replace(beforeRef, addRefs);

// Change the huge pupil meshes to groups so we can move them easily and keep the highlight attached
// Left eye:
const leftEyeGroupStr = `<group position={[-0.2, 0.05, 0.3]} rotation={[-0.05, -0.2, 0.1]}>
             {/* Amber Iris */}
             <mesh castShadow receiveShadow scale={[0.2, 0.22, 0.08]}>
               <sphereGeometry args={[1, 12, 12]} />
               <meshStandardMaterial color="#c47700" roughness={0.2} metalness={0.1} />
             </mesh>
             {/* Huge Pupil */}
             <mesh position={[0, 0, 0.05]} castShadow receiveShadow scale={[0.16, 0.18, 0.04]}>
               <sphereGeometry args={[1, 12, 12]} />
               <meshStandardMaterial color="#111111" roughness={0.1} metalness={0.1} />
             </mesh>
             {/* Eye Highlight */}
             <mesh position={[0.05, 0.08, 0.08]} castShadow receiveShadow scale={[0.04, 0.04, 0.02]}>
               <sphereGeometry args={[1, 10, 8]} />
               <meshStandardMaterial color="#ffffff" roughness={0} />
             </mesh>
          </group>`;

const newLeftEyeGroup = `<group position={[-0.2, 0.05, 0.3]} rotation={[-0.05, -0.2, 0.1]}>
             {/* Amber Iris */}
             <mesh castShadow receiveShadow scale={[0.2, 0.22, 0.08]}>
               <sphereGeometry args={[1, 12, 12]} />
               <meshStandardMaterial color="#e88915" roughness={0.2} metalness={0.1} />
             </mesh>
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
          </group>`;

const rightEyeGroupStr = `<group position={[0.2, 0.05, 0.3]} rotation={[-0.05, 0.2, -0.1]}>
             {/* Amber Iris */}
             <mesh castShadow receiveShadow scale={[0.2, 0.22, 0.08]}>
               <sphereGeometry args={[1, 12, 12]} />
               <meshStandardMaterial color="#c47700" roughness={0.2} metalness={0.1} />
             </mesh>
             {/* Huge Pupil */}
             <mesh position={[0, 0, 0.05]} castShadow receiveShadow scale={[0.16, 0.18, 0.04]}>
               <sphereGeometry args={[1, 12, 12]} />
               <meshStandardMaterial color="#111111" roughness={0.1} metalness={0.1} />
             </mesh>
             {/* Eye Highlight */}
             <mesh position={[0.05, 0.08, 0.08]} castShadow receiveShadow scale={[0.04, 0.04, 0.02]}>
               <sphereGeometry args={[1, 10, 8]} />
               <meshStandardMaterial color="#ffffff" roughness={0} />
             </mesh>
          </group>`;

const newRightEyeGroup = `<group position={[0.2, 0.05, 0.3]} rotation={[-0.05, 0.2, -0.1]}>
             {/* Amber Iris */}
             <mesh castShadow receiveShadow scale={[0.2, 0.22, 0.08]}>
               <sphereGeometry args={[1, 12, 12]} />
               <meshStandardMaterial color="#e88915" roughness={0.2} metalness={0.1} />
             </mesh>
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
          </group>`;

code = code.replace(leftEyeGroupStr, newLeftEyeGroup);
code = code.replace(rightEyeGroupStr, newRightEyeGroup);

fs.writeFileSync('src/components/MumuSkin.tsx', code);
