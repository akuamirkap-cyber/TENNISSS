import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEditorStore } from '../store';
import { RoundedBox } from '@react-three/drei';
import { StumbleBotBrain } from './StumbleBotBrain';
import { MouseSkin } from './MouseSkin';
import { MumuSkin } from './MumuSkin';

const getFaceTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  ctx.clearRect(0, 0, 512, 256);
  
  const cx = 256;
  const cy = 128;
  
  const drawEye = (x: number, y: number, radius: number, angle: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 10;
    
    ctx.beginPath();
    ctx.arc(0, 0, radius, Math.PI, Math.PI * 2, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(0, -radius * 0.2, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  
  drawEye(cx - 35, cy - 10, 24, 0.25); 
  drawEye(cx + 35, cy - 10, 24, -0.25); 
  
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + 30);
  ctx.lineTo(cx, cy + 24);
  ctx.lineTo(cx + 8, cy + 30);
  ctx.stroke();
  
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

export function StumbleBot({ startPosition, speed, color, id }: { startPosition: [number, number, number], speed: number, color: string, id: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const armRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  
  const faceTexture = useMemo(getFaceTexture, []);
  const { partSizes, skinType } = useEditorStore();
  
  const isJumpingRef = useRef(false);
  const jumpVelocityRef = useRef(0);
  const knockbackVelocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const isTumblingRef = useRef(false);
  const tumbleRotRef = useRef(new THREE.Vector3(0,0,0));
  const currentVelocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const landingSquashRef = useRef(0);
  const distanceMoved = useRef(0);
  const dodgeTargetX = useRef(startPosition[0]);
  const currentRotY = useRef(0);
  const currentLeanRef = useRef(0);

  const headY = 0.375 * partSizes.torso + 0.325 * partSizes.head;
  const armX = 0.3 * partSizes.torso + 0.15 * partSizes.arm;
  const armY = 0.25 * partSizes.torso;
  const legX = 0.08 * partSizes.torso + 0.1 * partSizes.leg;

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.033);
    if (!groupRef.current || !leftLegRef.current || !rightLegRef.current || !torsoRef.current) return;
    const store = useEditorStore.getState();
    if (store.gameMode !== 'stumble') return;

    const pos = groupRef.current.position;
    const currentSpeed = speed * (1.0 + (id % 5 - 2) * 0.02); // Varied speed +/- 4%
    
    // Register self in store for collisions
    store.setStumbleEntity(`bot-${id}`, {
      x: pos.x,
      z: pos.z,
      velocity: new THREE.Vector3(0,0,0), // Add if we need full physics later
      mass: 1.0 + (id % 3) * 0.1
    });

    // Check soft collisions with others
    const entities = store.stumbleEntities;
    for (const key in entities) {
      if (key !== `bot-${id}`) {
        const other = entities[key];
        const dx = pos.x - other.x;
        const dz = pos.z - other.z;
        const distSq = dx * dx + dz * dz;
        const minDist = 1.0;
        if (distSq < minDist * minDist && distSq > 0.001) {
          const dist = Math.sqrt(distSq);
          const pushStrength = (minDist - dist) * 10.0 * (other.mass / (1.0 + (id % 3) * 0.1));
          pos.x += (dx / dist) * pushStrength * delta;
          pos.z += (dz / dist) * pushStrength * delta;
        }
      }
    }

    // AI Decision Loop
    let moveX = 0;
    let moveZ = 0;
    
    // Check ground
    let isOnGround = false;
    if (pos.z <= 7 && pos.z >= -7 && pos.x >= -7 && pos.x <= 7) isOnGround = true; // Start
    else if (pos.z <= -7 && pos.z >= -100 && pos.x >= -5 && pos.x <= 5) isOnGround = true; // Path
    else if (pos.z <= -100 && pos.z >= -120 && pos.x >= -10 && pos.x <= 10) isOnGround = true; // End

    let groundY = 0;
    if (pos.z <= -100) groundY = 5;
    else if (pos.z <= -60) groundY = ((pos.z + 60) / -40) * 5;
    
    if (!isOnGround && pos.y === groundY) {
        isJumpingRef.current = true;
        jumpVelocityRef.current = 0;
    }
    
    // Default forward movement
    if (pos.z > -110 && isOnGround && !isJumpingRef.current) {
        moveZ = -1;
    }
    
    // Obstacle Avoidance & Collision
    const rocks = (window as any).stumbleObstacles || [];
    const cannons = (window as any).cannonBalls || [];
    const charRadius = 0.5;
    const charHeight = 2.0;
    
    for (let i = 0; i < rocks.length; i++) {
        const rock = rocks[i];
        const rockRadius = 1.6;
        const rockPos = new THREE.Vector3();
        rock.getWorldPosition(rockPos);
        
        const dx = pos.x - rockPos.x;
        const dy = (pos.y + charHeight/2) - rockPos.y;
        const dz = pos.z - rockPos.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (dist < rockRadius + charRadius) {
            const pushDist = (rockRadius + charRadius) - dist;
            const pushVec = new THREE.Vector3(dx, dy, dz).normalize().multiplyScalar(pushDist);
            pos.add(pushVec);
            
            isJumpingRef.current = true;
            jumpVelocityRef.current = 10.0;
            knockbackVelocityRef.current.copy(new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(15));
            isTumblingRef.current = true;
        }
    }
    
    for (let i = 0; i < cannons.length; i++) {
        const ball = cannons[i];
        const ballRadius = ball.radius || 1.5;
        const ballPos = ball.position;
        
        const dx = pos.x - ballPos.x;
        const dy = (pos.y + charHeight/2) - ballPos.y;
        const dz = pos.z - ballPos.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (dist < ballRadius + charRadius) {
            const pushDist = (ballRadius + charRadius) - dist;
            const pushVec = new THREE.Vector3(dx, dy, dz).normalize().multiplyScalar(pushDist);
            pos.add(pushVec);
            
            isJumpingRef.current = true;
            jumpVelocityRef.current = 15.0;
            knockbackVelocityRef.current.copy(new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(20));
            isTumblingRef.current = true;
        }
    }

        
            // AI Logic - StumbleBotBrain (Landing Planner & Pathfinding)
            
            if (pos.z < -100) {
                // Finished!
                moveZ = 0;
                moveX = 0;
            } else if (!isTumblingRef.current) {
                const rawObstacles = (window as any).stumbleObstacles || [];
                const store = useEditorStore.getState();
                const plan = StumbleBotBrain.planMove(
                    pos, 
                    currentVelocityRef.current, 
                    speed, 
                    rawObstacles, 
                    isJumpingRef.current,
                    id,
                    store.stumbleRecordingData
                );
                
                moveX = plan.moveX;
                moveZ = plan.moveZ;
                
                if (plan.jump && !isJumpingRef.current && pos.y < groundY + 0.2) {
                    isJumpingRef.current = true;
                    jumpVelocityRef.current = plan.jumpForce;
                }
            }
            
            // Tumbling recovery logic
            if (isTumblingRef.current) {
                // Bots should try to recover from tumbling quickly if they aren't moving fast
                if (knockbackVelocityRef.current.lengthSq() < 5.0 && pos.y < groundY + 0.5) {
                    isTumblingRef.current = false;
                    isJumpingRef.current = true; // Auto-jump out of a tumble
                    jumpVelocityRef.current = 12.0;
                }
            }

        if (pos.y > groundY + 0.5 && !isJumpingRef.current && !isTumblingRef.current) {
            isJumpingRef.current = true;
        }
    
    // Normalize movement
    if (moveX !== 0 || moveZ !== 0) {
        const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (length > 1.0) {
          moveX /= length;
          moveZ /= length;
        }
    }
    const isMoving = Math.abs(moveX) > 0.05 || Math.abs(moveZ) > 0.05;
    const targetVel = new THREE.Vector3(moveX, 0, moveZ).multiplyScalar(currentSpeed * 1.6);
    if (!isMoving || isTumblingRef.current) {
        currentVelocityRef.current.lerp(new THREE.Vector3(0,0,0), 8.0 * delta);
    } else {
        currentVelocityRef.current.lerp(targetVel, 6.0 * delta);
    }
    
    pos.add(currentVelocityRef.current.clone().multiplyScalar(delta));

    // Apply Knockback
    if (knockbackVelocityRef.current.lengthSq() > 0.01) {
        pos.add(knockbackVelocityRef.current.clone().multiplyScalar(delta));
        knockbackVelocityRef.current.lerp(new THREE.Vector3(0,0,0), 8.0 * delta);
    }

    pos.x = THREE.MathUtils.clamp(pos.x, -15, 15);
    pos.z = THREE.MathUtils.clamp(pos.z, -120, 15);

    // Landing Squash Recovery
    if (landingSquashRef.current > 0) {
        landingSquashRef.current = THREE.MathUtils.lerp(landingSquashRef.current, 0, 10 * delta);
    }

    // Gravity
    if (isJumpingRef.current) {
        const prevY = pos.y;
        jumpVelocityRef.current -= 35 * delta; // Lebih mantap
        pos.y += jumpVelocityRef.current * delta;
        
        if (isOnGround && prevY >= groundY && pos.y <= groundY) {
            pos.y = groundY;
            isJumpingRef.current = false;
            jumpVelocityRef.current = 0;
            landingSquashRef.current = 0.35; // Squash saat mendarat
            isTumblingRef.current = false;
        }
        
        if (pos.y < -15) {
            pos.set(...startPosition);
            pos.y = 5;
            jumpVelocityRef.current = 0;
        }
    } else {
        if (isOnGround) {
            pos.y = groundY;
        }
    }
    
    // Rotation & Lean
    const curVelLength = currentVelocityRef.current.length();
    
    if (isTumblingRef.current) {
        // Tumbling mid-air
        const tumbleQuat = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
                tumbleRotRef.current.x * delta, 
                tumbleRotRef.current.y * delta, 
                tumbleRotRef.current.z * delta
            )
        );
        groupRef.current.quaternion.multiply(tumbleQuat);
        tumbleRotRef.current.lerp(new THREE.Vector3(0,0,0), 0.5 * delta);
    } else {
        if (curVelLength > 0.1) {
            const targetY = Math.atan2(currentVelocityRef.current.x, currentVelocityRef.current.z);
            let deltaAngle = targetY - currentRotY.current;
            while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
            while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
            
            currentRotY.current += deltaAngle * Math.min(1.0, 15 * delta);
            
            // Calculate lean (Character Banking)
            const targetLean = -deltaAngle * curVelLength * 0.8;
            const maxLean = 40 * (Math.PI / 180); // ~40 degrees max lean for more pronounced effect
            const clampedTargetLean = THREE.MathUtils.clamp(targetLean, -maxLean, maxLean);
            
            // Smooth damping for lean (Mario 64 style)
            currentLeanRef.current = THREE.MathUtils.lerp(currentLeanRef.current, clampedTargetLean, 15 * delta);
            
            const targetRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, currentRotY.current, currentLeanRef.current));
            groupRef.current.quaternion.slerp(targetRot, 15 * delta);
        } else {
            currentLeanRef.current = THREE.MathUtils.lerp(currentLeanRef.current, 0, 15 * delta);
            const targetRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, currentRotY.current, currentLeanRef.current));
            groupRef.current.quaternion.slerp(targetRot, 10 * delta);
        }
    }

    // Animation (IK Footwork)
    if (curVelLength > 0.1 && !isJumpingRef.current) {
        const actualMoveDist = curVelLength * delta;
        distanceMoved.current += actualMoveDist * 1.5;
        const timePhase = distanceMoved.current + (id * 1.5); // Desync per bot
        
        const isMovingBackward = currentVelocityRef.current.z > 0.1;
        const isMovingLateral = Math.abs(currentVelocityRef.current.x) > 0.1;
        const isMovingForward = currentVelocityRef.current.z < -0.1;
        
        let bounceAmt = 0;
        let leftLegRotX = 0, rightLegRotX = 0, leftLegRotZ = 0, rightLegRotZ = 0;
        let scaleY = 1.0, scaleXZ = 1.0;

        if (isMovingBackward) {
            const legRot = Math.sin(timePhase) * -0.9; 
            leftLegRotX = legRot; rightLegRotX = -legRot;
            leftLegRotZ = Math.sin(timePhase) * 0.3 * Math.sign(currentVelocityRef.current.x || 1);
            rightLegRotZ = Math.sin(timePhase) * 0.3 * Math.sign(currentVelocityRef.current.x || 1);
            bounceAmt = Math.abs(Math.cos(timePhase)) * 0.1;
            const bounce = Math.abs(Math.cos(timePhase));
            scaleY = 0.95 + bounce * 0.05; scaleXZ = 1.05 - bounce * 0.05;
        } else if (isMovingForward && !isMovingLateral) {
            const legRot = Math.sin(timePhase) * 1.2;
            leftLegRotX = legRot; rightLegRotX = -legRot;
            bounceAmt = Math.abs(Math.cos(timePhase)) * 0.15; 
            const bounce = Math.abs(Math.cos(timePhase));
            scaleY = 0.9 + bounce * 0.1; scaleXZ = 1.1 - bounce * 0.1;
        } else if (isMovingForward && isMovingLateral) {
            const legRot = Math.sin(timePhase) * 0.9;
            leftLegRotX = legRot; rightLegRotX = -legRot;
            leftLegRotZ = -Math.sin(timePhase) * 0.45; rightLegRotZ = Math.sin(timePhase) * 0.45;
            bounceAmt = Math.abs(Math.sin(timePhase)) * 0.1;
            const bounce = Math.abs(Math.cos(timePhase));
            scaleY = 0.95 + bounce * 0.05; scaleXZ = 1.05 - bounce * 0.05;
        } else {
            const spreadAmt = 0.7;
            leftLegRotZ = -Math.sin(timePhase) * spreadAmt; rightLegRotZ = Math.sin(timePhase) * spreadAmt;
            bounceAmt = Math.abs(Math.sin(timePhase)) * 0.1;
            const bounce = Math.abs(Math.cos(timePhase));
            scaleY = 0.9 + bounce * 0.1; scaleXZ = 1.1 - bounce * 0.1;
        }

        // Apply landing squash
        scaleY -= landingSquashRef.current;
        scaleXZ += landingSquashRef.current * 0.5;
        
        const isMouseSkin = useEditorStore.getState().skinType === 'mouse' || useEditorStore.getState().skinType === 'mumu';
        const baseLegY = isMouseSkin ? 0.25 : 0.65 * partSizes.leg * partSizes.legHeight;
        
        leftLegRef.current.position.y = THREE.MathUtils.lerp(leftLegRef.current.position.y, baseLegY, 20 * delta);
        leftLegRef.current.position.z = THREE.MathUtils.lerp(leftLegRef.current.position.z, 0, 20 * delta);
        rightLegRef.current.position.y = THREE.MathUtils.lerp(rightLegRef.current.position.y, baseLegY, 20 * delta);
        rightLegRef.current.position.z = THREE.MathUtils.lerp(rightLegRef.current.position.z, 0, 20 * delta);
        
        leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, leftLegRotX, 20 * delta);
        rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, rightLegRotX, 20 * delta);
        leftLegRef.current.rotation.z = THREE.MathUtils.lerp(leftLegRef.current.rotation.z, leftLegRotZ, 20 * delta);
        rightLegRef.current.rotation.z = THREE.MathUtils.lerp(rightLegRef.current.rotation.z, rightLegRotZ, 20 * delta);
        
        torsoRef.current.scale.x = THREE.MathUtils.lerp(torsoRef.current.scale.x, scaleXZ, 20 * delta);
        torsoRef.current.scale.y = THREE.MathUtils.lerp(torsoRef.current.scale.y, scaleY, 20 * delta);
        torsoRef.current.scale.z = THREE.MathUtils.lerp(torsoRef.current.scale.z, scaleXZ, 20 * delta);
        
        const baseTorsoY = isMouseSkin ? useEditorStore.getState().mousePartSizes.torsoY + bounceAmt * 1.5 : baseLegY + 0.4 * partSizes.torso + bounceAmt * 1.5;
        torsoRef.current.position.y = THREE.MathUtils.lerp(torsoRef.current.position.y, baseTorsoY, 20 * delta);
        
        if (armRef.current && leftArmRef.current) {
            const armSwingPhase = Math.sin(timePhase) * 0.8;
            leftArmRef.current.rotation.x = -armSwingPhase;
            leftArmRef.current.rotation.z = 0.3;
            armRef.current.rotation.x = armSwingPhase;
            armRef.current.rotation.z = -0.3;
        }
    } else {
        const timePhase = state.clock.getElapsedTime() * 8;
        const idleBounce = Math.abs(Math.sin(timePhase)) * 0.02;
        
        let breathingScaleY = 1;
        let breathingScaleXZ = 1;
        let breathingPosY = 0;

        const breatheTime = state.clock.getElapsedTime() * 3;
        breathingScaleY = 1 + Math.sin(breatheTime) * 0.08;
        breathingScaleXZ = 1 + Math.sin(breatheTime + Math.PI) * 0.025;
        breathingPosY = Math.sin(breatheTime) * 0.025;

        torsoRef.current.scale.x = THREE.MathUtils.lerp(torsoRef.current.scale.x, breathingScaleXZ, 10 * delta);
        torsoRef.current.scale.y = THREE.MathUtils.lerp(torsoRef.current.scale.y, breathingScaleY, 10 * delta);
        torsoRef.current.scale.z = THREE.MathUtils.lerp(torsoRef.current.scale.z, breathingScaleXZ, 10 * delta);
        
        const isMouseSkin = useEditorStore.getState().skinType === 'mouse' || useEditorStore.getState().skinType === 'mumu';
        const baseLegY = isMouseSkin ? 0.25 : 0.65 * partSizes.leg * partSizes.legHeight;
        const baseTorsoY = isMouseSkin ? useEditorStore.getState().mousePartSizes.torsoY : baseLegY + 0.4 * partSizes.torso;
        
        leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, 15 * delta);
        rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, 15 * delta);
        leftLegRef.current.rotation.z = THREE.MathUtils.lerp(leftLegRef.current.rotation.z, 0, 15 * delta);
        rightLegRef.current.rotation.z = THREE.MathUtils.lerp(rightLegRef.current.rotation.z, 0, 15 * delta);
        
        leftLegRef.current.position.y = THREE.MathUtils.lerp(leftLegRef.current.position.y, baseLegY - 0.05, 15 * delta);
        leftLegRef.current.position.z = THREE.MathUtils.lerp(leftLegRef.current.position.z, 0, 15 * delta);
        rightLegRef.current.position.y = THREE.MathUtils.lerp(rightLegRef.current.position.y, baseLegY - 0.05, 15 * delta);
        rightLegRef.current.position.z = THREE.MathUtils.lerp(rightLegRef.current.position.z, 0, 15 * delta);
        
        torsoRef.current.position.y = THREE.MathUtils.lerp(torsoRef.current.position.y, baseTorsoY + breathingPosY, 10 * delta);
        
        if (armRef.current && leftArmRef.current) {
            const time = state.clock.getElapsedTime();
            armRef.current.rotation.z = THREE.MathUtils.lerp(armRef.current.rotation.z, -0.3 + Math.sin(time * 3) * 0.08, 15 * delta);
            armRef.current.rotation.x = THREE.MathUtils.lerp(armRef.current.rotation.x, 0.2 + Math.sin(time * 3 + Math.PI/2) * 0.05, 15 * delta);
            leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 0.15 - Math.sin(time * 3) * 0.08, 15 * delta);
            leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, Math.sin(time * 3 + Math.PI/2) * 0.05, 15 * delta);
        }
    }
    
    if (isJumpingRef.current) {
        const vel = jumpVelocityRef.current;
        torsoRef.current.scale.y = 1 + vel * 0.015;
        torsoRef.current.scale.x = 1 - Math.abs(vel) * 0.005;
        torsoRef.current.scale.z = 1 - Math.abs(vel) * 0.005;

        if (armRef.current && leftArmRef.current) {
            armRef.current.rotation.x = THREE.MathUtils.lerp(armRef.current.rotation.x, -Math.PI / 1.5, 15 * delta);
            leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, Math.PI / 2.5, 15 * delta);
        }
        leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, -0.8, 15 * delta); 
        rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0.8, 15 * delta); 
    }
  });

  const skinColor = "#FAD6B1";

  return (
    <group ref={groupRef} position={startPosition}>
      {/* Torso Group */}
      {skinType === 'mouse' || skinType === 'mumu' ? (
        skinType === 'mumu' ? (
          <MumuSkin color={color} torsoRef={torsoRef} armRef={armRef} leftArmRef={leftArmRef} leftLegRef={leftLegRef} rightLegRef={rightLegRef} />
        ) : (
        <MouseSkin color={color} torsoRef={torsoRef} armRef={armRef} leftArmRef={leftArmRef} leftLegRef={leftLegRef} rightLegRef={rightLegRef} />
      ) ) : (
        <>
          <group ref={torsoRef} position={[0, 1.05, 0]}>
        {/* Body (Shirt) */}
        <mesh castShadow receiveShadow scale={[partSizes.torso, partSizes.torso * partSizes.torsoHeight, partSizes.torso]}>
          <capsuleGeometry args={[0.39, 0.5, 16, 32]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>

        {/* Head */}
        <group position={[0, headY, 0]} scale={[partSizes.head, partSizes.head, partSizes.head]}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.42, 32, 32]} />
            <meshStandardMaterial color={skinColor} roughness={0.4} />
          </mesh>

          {/* Face Overlay */}
          <mesh rotation={[0, -Math.PI / 2, 0]}>
            <sphereGeometry args={[0.425, 32, 32]} />
            <meshStandardMaterial map={faceTexture} transparent={true} alphaTest={0.5} roughness={0.4} />
          </mesh>

          {/* Hat */}
          <group position={[0, partSizes.hatY, 0]} scale={[partSizes.hat, partSizes.hat * partSizes.hatHeight, partSizes.hat]}>
            <mesh castShadow position={[0, 0, 0]} scale={[1.05, 0.6, 1.05]}>
              <sphereGeometry args={[0.35, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={color} roughness={0.7} />
            </mesh>
            <mesh castShadow position={[0, -0.06, 0]}>
              <cylinderGeometry args={[0.365, 0.375, 0.14, 32]} />
              <meshStandardMaterial color={color} roughness={0.7} />
            </mesh>
            <mesh castShadow position={[0, -0.08, 0.2]} rotation={[0.1, 0, 0]} scale={[1, 1, 1.3]}>
              <cylinderGeometry args={[0.37, 0.37, 0.04, 32]} />
              <meshStandardMaterial color={color} roughness={0.7} />
            </mesh>
          </group>
        </group>

        {/* Right Arm */}
        <group ref={armRef} position={[-armX, armY, 0]} scale={[partSizes.arm, partSizes.arm, partSizes.arm]}>
          <mesh castShadow position={[0, -0.1, 0]}>
            <capsuleGeometry args={[0.15, 0.15, 16, 16]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh castShadow position={[0, -0.3, 0]}>
            <capsuleGeometry args={[0.13, 0.25, 16, 16]} />
            <meshStandardMaterial color={skinColor} />
          </mesh>
        </group>

        {/* Left Arm */}
        <group ref={leftArmRef} position={[armX, armY, 0]} scale={[partSizes.arm, partSizes.arm, partSizes.arm]}>
          <mesh castShadow position={[0, -0.1, 0]}>
            <capsuleGeometry args={[0.15, 0.15, 16, 16]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh castShadow position={[0, -0.3, 0]}>
            <capsuleGeometry args={[0.13, 0.25, 16, 16]} />
            <meshStandardMaterial color={skinColor} />
          </mesh>
        </group>
      </group>

      {/* Legs */}
      <group ref={leftLegRef} position={[-legX, 0.65 * partSizes.leg * partSizes.legHeight, 0]} scale={[partSizes.leg, partSizes.leg * partSizes.legHeight, partSizes.leg]}>
        <mesh castShadow position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.16, 0.35, 16, 16]} />
          <meshStandardMaterial color="#2E79F2" roughness={0.8} />
        </mesh>
        <mesh castShadow position={[0, -0.41, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.08, 16]} />
          <meshStandardMaterial color="#5192F5" roughness={0.8} />
        </mesh>
        <mesh castShadow position={[0, -0.55, 0.08]}>
          <RoundedBox args={[0.26, 0.2, 0.36]} radius={0.06}>
            <meshStandardMaterial color="#291B16" roughness={0.9} />
          </RoundedBox>
        </mesh>
      </group>
      
      <group ref={rightLegRef} position={[legX, 0.65 * partSizes.leg * partSizes.legHeight, 0]} scale={[partSizes.leg, partSizes.leg * partSizes.legHeight, partSizes.leg]}>
        <mesh castShadow position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.16, 0.35, 16, 16]} />
          <meshStandardMaterial color="#2E79F2" roughness={0.8} />
        </mesh>
        <mesh castShadow position={[0, -0.41, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.08, 16]} />
          <meshStandardMaterial color="#5192F5" roughness={0.8} />
        </mesh>
        <mesh castShadow position={[0, -0.55, 0.08]}>
          <RoundedBox args={[0.26, 0.2, 0.36]} radius={0.06}>
            <meshStandardMaterial color="#291B16" roughness={0.9} />
          </RoundedBox>
        </mesh>
      </group>
        </>
      )}
    </group>
  );
}
