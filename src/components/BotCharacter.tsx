import React, { forwardRef, useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { gamePositions } from '../utils/gameState';
import { RoundedBox } from '@react-three/drei';
import { MouseSkin } from "./MouseSkin";
import { MumuSkin } from "./MumuSkin";
import { TennisRacket } from "./TennisRacket";
import { useEditorStore, GameState, anim1KeyframesDefault, anim2KeyframesDefault, anim3KeyframesDefault } from '../store';
import { audioManager } from '../utils/audio';


function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function interpolateKeyframes(t: number, keyframes: any[]) {
  if (keyframes.length === 0) return null;
  if (keyframes.length === 1) return keyframes[0];
  
  let startKf = keyframes[0];
  let endKf = keyframes[keyframes.length - 1];
  
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (t >= keyframes[i].time && t <= keyframes[i + 1].time) {
      startKf = keyframes[i];
      endKf = keyframes[i + 1];
      break;
    }
  }
  
  if (t <= startKf.time) return startKf;
  if (t >= endKf.time) return endKf;
  
  let p = (t - startKf.time) / (endKf.time - startKf.time);
  p = easeInOutCubic(p); // Spline/Bezier interpolation
  
  return {
    armRot: startKf.armRot.map((v: number, i: number) => THREE.MathUtils.lerp(v, endKf.armRot[i], p)),
    torsoRot: startKf.torsoRot.map((v: number, i: number) => THREE.MathUtils.lerp(v, endKf.torsoRot[i], p)),
    racketRot: startKf.racketRot.map((v: number, i: number) => THREE.MathUtils.lerp(v, endKf.racketRot[i], p)),
  };
}

import { activeBalls } from './TennisBall';


const getFaceTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  ctx.clearRect(0, 0, 512, 256);
  
  const cx = 256;
  const cy = 128;
  
  const drawEye = (x, y, radius, angle) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 10;
    
    // Draw top half on canvas -> bottom half in 3D (flat top)
    ctx.beginPath();
    ctx.arc(0, 0, radius, Math.PI, Math.PI * 2, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw pupil slightly lower
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(0, -radius * 0.2, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  
  drawEye(cx - 35, cy - 10, 24, 0.25); 
  drawEye(cx + 35, cy - 10, 24, -0.25); 
  
  // Angry mouth
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

export const BotCharacter = forwardRef<THREE.Group, any>((props, ref) => {
  const faceTexture = useMemo(getFaceTexture, []);
  const armRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const racketRef = useRef<THREE.Group>(null);
  const fallbackRef = useRef<THREE.Group>(null);
  const characterRef = (ref as React.MutableRefObject<THREE.Group>) || fallbackRef;
  const leftArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  
  const tossTimerRef = useRef(0);
  const hasTossedRef = useRef(false);
  const handBallRef = useRef<THREE.Mesh>(null);
  const lastSwingTimeRef = useRef(0);
  
  const { partSizes, skinType } = useEditorStore();
  const { scene } = useThree();

  const headY = 0.375 * partSizes.torso + 0.325 * partSizes.head;
  const armX = 0.3 * partSizes.torso + 0.15 * partSizes.arm;
  const armY = 0.25 * partSizes.torso;
  const legX = 0.08 * partSizes.torso + 0.1 * partSizes.leg;

  const isSwinging = useRef(false);

  const fsmState = useRef<'idle' | 'run' | 'windup' | 'swing' | 'followThrough' | 'return'>('idle');

  const courtLength = useEditorStore(state => state.courtLength);

  useEffect(() => {
    if (characterRef.current) {
      characterRef.current.position.set(0, 0, -courtLength / 2);
    }
  }, [courtLength]);
  
  const activeAnim = useRef('swing');
  const swingProgress = useRef(0);
  const hasHitBall = useRef(false);
  const keys = useRef({ w: false, a: false, s: false, d: false });
  const chargingRef = useRef(false);
  const chargeValRef = useRef(0);
  const chargeDirRef = useRef(1);
  const hitTargetRef = useRef<{x: number, z: number} | null>(null);
  const hitPowerRef = useRef(0.8);
  const timeSinceLastBall = useRef(0);
  const skidTimerRef = useRef(0);
  const isSkiddingRef = useRef(false);
  const currentLeanRef = useRef(0);

  const isEditMode = false;
  const isPlayingPreview = false;
  const keyframes = [];
  const currentTime = 0;
  const currentArmRot = [0,0,0];
  const currentTorsoRot = [0,0,0];
  const currentRacketRot = [0,0,0];

  const isMovingRef = useRef(false);
  const isJumpingRef = useRef(false);
  const jumpVelocityRef = useRef(0);
  const isServingRef = useRef(false);

  

  const handleServe = () => {
     isServingRef.current = true;
     tossTimerRef.current = 0.01;
     hasTossedRef.current = false;
     chargingRef.current = false;
     
     setTimeout(() => {
        if (!isSwinging.current) {
            isSwinging.current = true;
            activeAnim.current = 'anim2';
            swingProgress.current = 0;
            hitPowerRef.current = 0.9;
            audioManager.playWoosh();
        }
     }, 600);
  };

  useFrame((state, rawDelta) => {
    const store = useEditorStore.getState();
    const courtLength = store.courtLength;
    const delta = Math.min(rawDelta, 0.033) * (store.timeScale || 1.0);
    if (!armRef.current || !torsoRef.current || !racketRef.current || !characterRef.current || !leftLegRef.current || !rightLegRef.current) return;

    let moveX = 0;
    let moveZ = 0;
    let isRecovering = false;

    if (isSwinging.current && !hitTargetRef.current) {
        const playerSideZones = [
             { id: 5, x: -2.05, z: 1.6 },
             { id: 6, x: 2.05, z: 1.6 },
             { id: 7, x: -2.05, z: 4.6 },
             { id: 8, x: 2.05, z: 4.6 }
        ];
        // gamePositions already imported
        let minIndex = 0;
        let minDist = Infinity;
        playerSideZones.forEach((zone, index) => {
            const dist = Math.pow(gamePositions.player.x - zone.x, 2) + Math.pow(gamePositions.player.z - zone.z, 2);
            if (dist < minDist) {
                minDist = dist;
                minIndex = index;
            }
        });
        const availableZones = playerSideZones.filter((_, idx) => idx !== minIndex);
        const targetZone = availableZones[Math.floor(Math.random() * availableZones.length)];
        hitTargetRef.current = {
            x: targetZone.x + (Math.random() - 0.5) * 2.0,
            z: targetZone.z + (Math.random() - 0.5) * 2.0
        };
    } else if (!isSwinging.current) {
        hitTargetRef.current = null;
    }

    
    let targetBall: any = null;
    let minZ = Infinity;
    
    activeBalls.forEach(b => {
      if (!b.state.active) return;
      if (b.state.lastHitter === 'none' && b.state.position.z < 0) {
         targetBall = b;
      } else if (b.state.velocity.z < -0.5 && b.state.position.z > characterRef.current.position.z - 2) {
         if (b.state.position.z < minZ) {
           minZ = b.state.position.z;
           targetBall = b;
         }
      }
    });

    if (useEditorStore.getState().activeBallsCount === 0) {
      if (useEditorStore.getState().serverTurn === 'bot') {
        timeSinceLastBall.current += delta;
        if (timeSinceLastBall.current > 1.0 && !isSwinging.current && !chargingRef.current) {
          timeSinceLastBall.current = 0;
          handleServe();
        }
      }
      
      const homeX = 0;
      const homeZ = -courtLength / 2;
      
      const dist = Math.sqrt(Math.pow(homeX - characterRef.current.position.x, 2) + Math.pow(homeZ - characterRef.current.position.z, 2));
      if (dist > 0.5) {
          // Calculate dynamic recovery target to avoid rigidity
          const targetHomeX = homeX;
          const targetHomeZ = homeZ;
          moveX = targetHomeX - characterRef.current.position.x;
          moveZ = targetHomeZ - characterRef.current.position.z;
          isRecovering = true;
        }
    } else {
      timeSinceLastBall.current = 0;
      
      if (targetBall) {
        const ballPos = targetBall.state.position;
        const ballVel = targetBall.state.velocity;
        
        // --- ULTRA GENIUS PREDICTION ---
        let targetX = ballPos.x;
        let targetZ = ballPos.z;

        if (targetBall.state.lastHitter === 'none') { targetX = characterRef.current.position.x; targetZ = characterRef.current.position.z; } else if (targetBall.state.bouncesSinceHit === 0) {
            // Predict bounce location
            const y0 = Math.max(0, ballPos.y - 0.18);
            const det = ballVel.y * ballVel.y + 50.0 * y0;
            let t_land = 0;
            if (det >= 0) {
                t_land = (ballVel.y + Math.sqrt(det)) / 25.0;
            }
            const bounceX = ballPos.x + ballVel.x * t_land;
            const bounceZ = ballPos.z + ballVel.z * t_land;
            
            // Move to where the ball will be ~0.3s AFTER bouncing
            const t_after = 0.3;
            targetX = bounceX + (ballVel.x * 0.9) * t_after;
            targetZ = bounceZ + (ballVel.z * 0.9) * t_after;
            
        } else {
            // Already bounced, just track it directly but stay a bit behind it to hit
            targetX = ballPos.x + ballVel.x * 0.1;
            targetZ = ballPos.z - 1.0;
        }

        targetX = THREE.MathUtils.clamp(targetX, -6.5, 6.5);
        targetZ = THREE.MathUtils.clamp(targetZ, -courtLength/2 - 2, -0.5);

        const distToTarget = Math.sqrt(Math.pow(targetX - characterRef.current.position.x, 2) + Math.pow(targetZ - characterRef.current.position.z, 2));
        
        if (distToTarget > 0.5 && !chargingRef.current && !isSwinging.current) {
          moveX = targetX - characterRef.current.position.x;
          moveZ = targetZ - characterRef.current.position.z;
        }

        // --- ULTRA GENIUS SWING TIMING ---
        const zDist = ballPos.z - characterRef.current.position.z;
        const xDist = Math.abs(ballPos.x - characterRef.current.position.x);

        const canSwing = targetBall.state.lastHitter === 'player';

        if (!isSwinging.current && !chargingRef.current && canSwing) {
            const velZ = Math.abs(targetBall.state.velocity.z);
            const timeToReach = velZ > 0.1 ? Math.max(0, zDist) / velZ : 999;
            const shouldSwing = (zDist > -1.0 && zDist < 0.8) || (zDist > 0 && zDist < 2.5 && timeToReach < 0.25);

            // Swing when it's within reach or will be here instantly!
            if (shouldSwing && xDist < 1.5 && ballPos.y < 3.5 && Date.now() - lastSwingTimeRef.current > 1000) {
                chargingRef.current = true;
                lastSwingTimeRef.current = Date.now();
                chargeValRef.current = 0.8 + Math.random() * 0.2; // Hit hard!
                const isLeft = targetBall.state.position.x < characterRef.current.position.x - 0.5;
                activeAnim.current = isLeft ? 'anim3' : 'anim2';
                
                setTimeout(() => {
                  if (chargingRef.current) {
                    chargingRef.current = false;
                    isSwinging.current = true;
                    swingProgress.current = 0;
                    hitPowerRef.current = chargeValRef.current;
                    audioManager.playWoosh();
                  }
                }, 10); // Instant reaction
            }
        }
      } else {
        const homeX = 0;
        const homeZ = -courtLength / 2;
        
        const dist = Math.sqrt(Math.pow(homeX - characterRef.current.position.x, 2) + Math.pow(homeZ - characterRef.current.position.z, 2));
        if (dist > 0.5) {
          // Calculate dynamic recovery target to avoid rigidity
          const targetHomeX = homeX;
          const targetHomeZ = homeZ;
          moveX = targetHomeX - characterRef.current.position.x;
          moveZ = targetHomeZ - characterRef.current.position.z;
          isRecovering = true;
        }
      }
    }
    if (moveX !== 0 || moveZ !== 0) {
      const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
      moveX /= length;
      moveZ /= length;
    }
    
    if (!characterRef.current.userData.currentVel) characterRef.current.userData.currentVel = {x: 0, z: 0};
    const currentVel = characterRef.current.userData.currentVel;
    
    // --- SKID DETECTION ---
    const speedSq = currentVel.x * currentVel.x + currentVel.z * currentVel.z;
    if (speedSq > 2.0 && !isJumpingRef.current) {
        const inputLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (inputLen > 0.1) {
            const dot = ((moveX / inputLen) * currentVel.x + (moveZ / inputLen) * currentVel.z) / Math.sqrt(speedSq);
            if (dot < -0.6 && skidTimerRef.current <= 0) {
                skidTimerRef.current = 0.35; // 0.35s of skid
            }
        }
    }
    if (skidTimerRef.current > 0) {
        skidTimerRef.current -= delta;
    }
    isSkiddingRef.current = skidTimerRef.current > 0;
    // ----------------------

    const accel = isSkiddingRef.current ? 3.0 : 12.0;
    currentVel.x = THREE.MathUtils.lerp(currentVel.x, moveX, accel * delta);
    currentVel.z = THREE.MathUtils.lerp(currentVel.z, moveZ, accel * delta);
    
    const isMoving = Math.abs(currentVel.x) > 0.05 || Math.abs(currentVel.z) > 0.05;
    
    moveX = currentVel.x;
    moveZ = currentVel.z;
    isMovingRef.current = isMoving;

    if (isMoving && !chargingRef.current && !isSwinging.current) {
      const moveSpeed = isRecovering ? 14 : 26; // Smoothly jog back, sprint when chasing
      characterRef.current.position.x += moveX * delta * moveSpeed;
      characterRef.current.position.z += moveZ * delta * moveSpeed;
    }
    characterRef.current.getWorldPosition(gamePositions.bot);

    // Handle Jumping
    if (isJumpingRef.current) {
      jumpVelocityRef.current -= 25 * delta; // Gravity
      characterRef.current.position.y += jumpVelocityRef.current * delta;
      
      if (characterRef.current.position.y <= 0) {
        characterRef.current.position.y = 0;
        isJumpingRef.current = false;
        jumpVelocityRef.current = 0;
      }
    }

      
    if (true) {
      let targetY = 0; // Always face net
      if (isMovingRef.current) {
         // Face movement direction
         const runDirection = Math.atan2(currentVel.x, currentVel.z);
         targetY = runDirection;

         // Calculate lean based on turn speed (angular velocity of velocity vector)
         const inputY = Math.atan2(moveX, moveZ);
         let angleDiff = inputY - runDirection;
         
         // Normalize angleDiff to -PI to PI
         while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
         while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
         
         if (moveX !== 0 || moveZ !== 0) {
            // Lean more the faster we are turning and moving
            const leanMultiplier = 0.5;
            const targetLean = angleDiff * leanMultiplier * Math.min(1.0, speedSq / 10.0);
            
            // Clamp lean to avoid breaking physics (Mumu looks weird if leaning too far)
            const maxLean = 40 * (Math.PI / 180); // ~40 degrees max lean for more pronounced effect
            const clampedTargetLean = THREE.MathUtils.clamp(targetLean, -maxLean, maxLean);
            
            // Smooth damping for lean (Mario 64 style)
            const finalLean = isSkiddingRef.current ? Math.sign(clampedTargetLean || 1) * maxLean * 1.2 : clampedTargetLean;
            currentLeanRef.current = THREE.MathUtils.lerp(currentLeanRef.current, finalLean, 15 * delta);
         } else {
            currentLeanRef.current = THREE.MathUtils.lerp(currentLeanRef.current, 0, 15 * delta);
         }
      } else {
         if (isSwinging.current && hitTargetRef.current) {
            targetY = Math.atan2(hitTargetRef.current.x - characterRef.current.position.x, hitTargetRef.current.z - characterRef.current.position.z);
            currentLeanRef.current = THREE.MathUtils.lerp(currentLeanRef.current, 0, 15 * delta);
         } else if (isSkiddingRef.current) {
            const velAngle = Math.atan2(currentVel.x, currentVel.z);
            let deltaAngle = targetY - velAngle;
            while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
            while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
            currentLeanRef.current = THREE.MathUtils.lerp(currentLeanRef.current, Math.sign(deltaAngle) * 1.0, 15 * delta);
         } else {
            currentLeanRef.current = THREE.MathUtils.lerp(currentLeanRef.current, 0, 15 * delta);
         }
      }
      
      const targetRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, targetY, currentLeanRef.current));
      const slerpSpeed = isSwinging.current ? 18 : 12;
      characterRef.current.quaternion.slerp(targetRot, slerpSpeed * delta);
    }

    if (isEditMode) {
      if (isPlayingPreview && keyframes.length > 0) {
        const interpolated = interpolateKeyframes(currentTime, keyframes);
        if (interpolated) {
          armRef.current.rotation.set(interpolated.armRot[0], interpolated.armRot[1], interpolated.armRot[2]);
          torsoRef.current.rotation.set(interpolated.torsoRot[0], interpolated.torsoRot[1], interpolated.torsoRot[2]);
          racketRef.current.rotation.set(interpolated.racketRot[0], interpolated.racketRot[1], interpolated.racketRot[2]);
        }
      } else {
        // In Edit Mode, directly apply editor state
        armRef.current.rotation.set(currentArmRot[0], currentArmRot[1], currentArmRot[2]);
        torsoRef.current.rotation.set(currentTorsoRot[0], currentTorsoRot[1], currentTorsoRot[2]);
        racketRef.current.rotation.set(currentRacketRot[0], currentRacketRot[1], currentRacketRot[2]);
      }
      return;
    }

    if (chargingRef.current) {
      chargeValRef.current += chargeDirRef.current * delta * 5.0; // speed up charging a bit
      if (chargeValRef.current > 1) {
        chargeValRef.current = 1;
        chargeDirRef.current = 0; // stop at max
      } else if (chargeValRef.current < 0) {
        chargeValRef.current = 0;
        chargeDirRef.current = 1;
      }
      // window.dispatchEvent(new CustomEvent('updateCharge', { detail: chargeValRef.current }));
    }

    // Handle Swing Animation Progress
    if (isSwinging.current) {
      if (swingProgress.current === 0 && isServingRef.current) {
          isJumpingRef.current = true;
          jumpVelocityRef.current = 10.0; // Loncat saat serve
      }
      let speed = 2.5; // default swing
      if (activeAnim.current === 'anim1') speed = 1.5;
      if (activeAnim.current === 'anim2') speed = 2.47; // 1.9x faster
      if (activeAnim.current === 'anim3') speed = 3.64; // User requested speed
      
      
      // Dynamic Swing Sync (Time-to-impact) & Micro-Stepping
      let nearestBall = null;
      let minDistSync = Infinity;
      activeBalls.forEach(b => {
          if (!b.state.active) return;
          const dist = b.state.position.distanceTo(characterRef.current.position);
          if (dist < minDistSync) { minDistSync = dist; nearestBall = b; }
      });
      
      if (nearestBall && nearestBall.state.velocity.z < 0 && swingProgress.current < 0.45) {
          const relZ = Math.abs(nearestBall.state.position.z - characterRef.current.position.z);
          const velZ = Math.abs(nearestBall.state.velocity.z);
          if (velZ > 0.1) {
              const timeToImpact = relZ / velZ;
              const framesToImpact = 0.45 - swingProgress.current;
              if (timeToImpact > 0.05 && timeToImpact < 1.0) {
                  const requiredSpeed = framesToImpact / timeToImpact;
                  speed = THREE.MathUtils.lerp(speed, requiredSpeed, 5 * delta);
              }
          }
          
          // Micro-Stepping: shift character X towards ball X
          if (swingProgress.current > 0.2) {
              const sideOffset = nearestBall.state.position.x > characterRef.current.position.x ? 1.0 : -1.0;
              const targetOffsetX = (nearestBall.state.position.x - sideOffset) - characterRef.current.position.x;
              if (Math.abs(targetOffsetX) < 2.0) {
                  characterRef.current.position.x += targetOffsetX * delta * 6.0; // Slide into perfect alignment
              }
          }
      }
      
      swingProgress.current += delta * speed;
      
      // Impact frame event
      if (swingProgress.current > 0.15 && swingProgress.current < 0.7) {
        const racketHeadPos = new THREE.Vector3();
        if (racketRef.current) {
           const localHeadPos = new THREE.Vector3(0, 1.13, 0);
           racketRef.current.localToWorld(localHeadPos);
           racketHeadPos.copy(localHeadPos);
        } else if (characterRef.current) {
           characterRef.current.getWorldPosition(racketHeadPos);
           racketHeadPos.y += 1.5;
        }
        
        // Get character world forward direction
        const forward = new THREE.Vector3(0, 0, 1);
        characterRef.current!.getWorldDirection(forward);

        window.dispatchEvent(new CustomEvent('hitBall', { 
          detail: { 
            position: racketHeadPos,
            direction: forward,
            anim: activeAnim.current,
            targetX: hitTargetRef.current?.x,
            targetZ: hitTargetRef.current?.z,
            power: hitPowerRef.current,
            isBot: true
          } 
        }));
      }

      if (swingProgress.current > 1) {
        swingProgress.current = 0;
        isSwinging.current = false;
        isServingRef.current = false;
        hasHitBall.current = false;
      }
    }

    const t = swingProgress.current;
    
    // --- Finite State Machine (FSM) Update ---
    if (isSwinging.current) {
        if (t < 0.3) fsmState.current = 'windup';
        else if (t < 0.45) fsmState.current = 'swing';
        else if (t < 0.75) fsmState.current = 'followThrough';
        else fsmState.current = 'return';
    } else {
        if (isMovingRef.current) fsmState.current = 'run';
        else fsmState.current = 'idle';
    }
    
    
    // Default Idle poses
    const targetArmRot = new THREE.Euler(0.2, 0, -0.3); 
    const targetTorsoRot = new THREE.Euler(0, 0, 0);
    const targetRacketRot = new THREE.Euler(Math.PI / 2 + 0.2, 0, 0);
    const targetLeftArmRot = new THREE.Euler(0, 0, 0.15);

    if (chargingRef.current) {
      if (activeAnim.current === 'anim3') {
        // Use idle pose (which is already set as default above)
      } else {
        const activeKeyframes = 
          activeAnim.current === 'anim1' ? anim1KeyframesDefault : 
          activeAnim.current === 'anim2' ? anim2KeyframesDefault : 
          anim3KeyframesDefault;
        
        const interpolated = interpolateKeyframes(0, activeKeyframes);
        if (interpolated) {
          targetArmRot.set(interpolated.armRot[0], interpolated.armRot[1], interpolated.armRot[2]);
          targetTorsoRot.set(interpolated.torsoRot[0], interpolated.torsoRot[1], interpolated.torsoRot[2]);
          targetRacketRot.set(interpolated.racketRot[0], interpolated.racketRot[1], interpolated.racketRot[2]);
        }
      }
    } else if (activeAnim.current !== 'swing' && isSwinging.current) {
      const activeKeyframes = 
        activeAnim.current === 'anim1' ? anim1KeyframesDefault : 
        activeAnim.current === 'anim2' ? anim2KeyframesDefault : 
        anim3KeyframesDefault;
      const interpolated = interpolateKeyframes(t, activeKeyframes);
      if (interpolated) {
        targetArmRot.set(interpolated.armRot[0], interpolated.armRot[1], interpolated.armRot[2]);
        targetTorsoRot.set(interpolated.torsoRot[0], interpolated.torsoRot[1], interpolated.torsoRot[2]);
        targetRacketRot.set(interpolated.racketRot[0], interpolated.racketRot[1], interpolated.racketRot[2]);
      }
    } else {
      // Calculate dynamic swing rotation (Tennis forehand)
      if (t > 0 && t <= 1) {
        if (t < 0.3) { 
          // 1. Wind-up (draw arm back, twist torso)
          const p = t / 0.3;
          const ease = p * p * (3 - 2 * p);
          targetArmRot.set(0.2 - ease * 1.2, -ease * 0.6, -0.3 - ease * 0.8); 
          targetTorsoRot.set(0, -ease * 0.8, 0);
          targetRacketRot.set(Math.PI / 2 + 0.2 + ease * 0.5, ease * 0.4, -ease * 0.2);
        } else if (t < 0.45) { 
          
          // 2. The Strike (Swing forward)
          const p = (t - 0.3) / 0.15;
          const ease = p * p; // Accelerate
          
          // Topspin vs Slice paths
          const isSlice = activeAnim.current === 'anim2';
          const isTopspin = activeAnim.current === 'anim1';
          const pathY = isTopspin ? -0.6 + ease * 1.8 : (isSlice ? 0.2 - ease * 1.0 : -0.6 + ease * 1.4);
          const pathZ = isTopspin ? -1.1 + ease * 1.5 : (isSlice ? -0.8 + ease * 0.6 : -1.1 + ease * 1.2);
          
          targetArmRot.set(
            -1.0 + ease * 2.8, 
            pathY, 
            pathZ
          );
          targetTorsoRot.set(-ease * 0.2, -0.8 + ease * 1.6, ease * 0.1);
          
          // Racket Angle Alignment
          let wristAngle = 0;
          if (hitTargetRef.current) {
            const dx = hitTargetRef.current.x - characterRef.current.position.x;
            const dz = hitTargetRef.current.z - characterRef.current.position.z;
            wristAngle = Math.atan2(dx, dz) * 0.3; // Align racket face to target
          }
          
          // Slice open racket face
          const racketFace = isSlice ? (Math.PI / 2 + 0.9 - ease * 0.5) : (Math.PI / 2 + 0.7 - ease * 0.7);
          
          targetRacketRot.set(
            racketFace, 
            0.4 - ease * 0.4 + wristAngle, 
            -0.2 + ease * 0.2
          );
      
        } else if (t < 0.75) { 
          
          // 3. Follow through (Arm crosses body up high / opposite shoulder)
          const p = (t - 0.45) / 0.3;
          const ease = 1 - Math.pow(1 - p, 3); // Decelerate
          
          // Arm Recoil
          let recoil = 0;
          if (p < 0.2 && hitPowerRef.current > 0.8 && hasHitBall.current) {
             recoil = Math.sin(p * Math.PI * 15) * 0.1 * (1 - p/0.2); // Vibrate
          }
          
          targetArmRot.set(
            1.8 + ease * 1.2 + recoil, 
            0.8 + ease * 0.8 + recoil, 
            0.1 + ease * 1.5
          );
          targetTorsoRot.set(-0.2 + ease * 0.4, 0.8 + ease * 0.8, 0.1 - ease * 0.2);
          targetRacketRot.set(Math.PI / 2, -ease * 0.5, ease * 1.0);
      
        } else { 
          // 4. Return to idle
          const p = (t - 0.75) / 0.25;
          const ease = p * p * (3 - 2 * p);
          targetArmRot.set(
            2.6 * (1 - ease) + 0.2 * ease, 
            1.2 * (1 - ease) + 0 * ease, 
            0.9 * (1 - ease) - 0.3 * ease
          );
          targetTorsoRot.set(0, 1.2 * (1 - ease), 0);
          targetRacketRot.set(Math.PI / 2 + 0.2 * ease, 0, 0.5 * (1 - ease));
        }
      }
    }

    // Movement Animation (Footwork patterns)

    // --- Squash and Stretch ---
    // Pada saat melakukan Smash, skala tubuh memanjang (stretch), dan memendek (squash) drastis
    if (characterRef.current) {
        let targetScaleY = 1.0;
        let targetScaleXZ = 1.0;
        
        const isIdle = !isMoving && !isJumpingRef.current && !isSwinging.current && !isSkiddingRef.current;
        if (isIdle) {
            const time = state.clock.getElapsedTime();
            // Subtle breathing squash/stretch
            targetScaleY = 1.0 + Math.sin(time * 3) * 0.04;
            targetScaleXZ = 1.0 - Math.sin(time * 3) * 0.02;
        }

        if (isSwinging.current && (activeAnim.current === 'anim2' || hitPowerRef.current > 0.9)) {
            const t = swingProgress.current;
            if (t < 0.3) {
                // Windup: Squash down
                const ease = t / 0.3;
                targetScaleY = 1.0 - ease * 0.2; // down to 0.8
                targetScaleXZ = 1.0 + ease * 0.15; // wide
            } else if (t < 0.45) {
                // Strike / Jump: Stretch up
                const ease = (t - 0.3) / 0.15;
                targetScaleY = 0.8 + ease * 0.5; // up to 1.3
                targetScaleXZ = 1.15 - ease * 0.35; // narrow to 0.8
            } else if (t < 0.6) {
                // Follow through / Landing: Extreme squash
                const ease = (t - 0.45) / 0.15;
                targetScaleY = 1.3 - ease * 0.6; // down to 0.7
                targetScaleXZ = 0.8 + ease * 0.4; // wide to 1.2
            } else {
                // Return to normal
                const ease = (t - 0.6) / 0.4;
                targetScaleY = 0.7 + ease * 0.3; // back to 1.0
                targetScaleXZ = 1.2 - ease * 0.2; // back to 1.0
            }
        } else if (isSkiddingRef.current && !isJumpingRef.current) {
            targetScaleY = 0.7;
            targetScaleXZ = 1.3;
        }
        
        // Apply smoothly
        characterRef.current.scale.x = THREE.MathUtils.lerp(characterRef.current.scale.x, targetScaleXZ, 15 * delta);
        characterRef.current.scale.y = THREE.MathUtils.lerp(characterRef.current.scale.y, targetScaleY, 15 * delta);
        characterRef.current.scale.z = THREE.MathUtils.lerp(characterRef.current.scale.z, targetScaleXZ, 15 * delta);
    }
    
    if (isMoving) {
      const time = state.clock.getElapsedTime();
      
      const isMovingForward = moveZ < -0.1;
      const isMovingBackward = moveZ > 0.1;
      const isMovingLateral = Math.abs(moveX) > 0.1;
      
      const runSpeed = 15;
      
      // Foot Planting (IK Kaki via distance tracked phase)
      if (!characterRef.current.userData.distanceMoved) characterRef.current.userData.distanceMoved = 0;
      const actualMoveDist = Math.sqrt(moveX*moveX + moveZ*moveZ) * delta * 15;
      if (!isSkiddingRef.current) {
          characterRef.current.userData.distanceMoved += actualMoveDist * 1.2;
      }
      const timePhase = characterRef.current.userData.distanceMoved;
  
      
      // Athletic ready stance base
      let readyStanceDrop = 0.15;
      let bounceAmt = 0;
      
      let leftLegRotX = 0;
      let rightLegRotX = 0;
      let leftLegRotZ = 0;
      let rightLegRotZ = 0;
      
      let scaleY = 1.0;
      let scaleXZ = 1.0;
      
      if (isSkiddingRef.current) {
          leftLegRotX = -0.8;
          rightLegRotX = 0.5;
          leftLegRotZ = 0.4;
          rightLegRotZ = -0.4;
          bounceAmt = 0.4;
      } else if (isMovingBackward) {
          // Backpedal / Crossover Retreat
          const legRot = Math.sin(timePhase) * -0.9; 
          leftLegRotX = legRot;
          rightLegRotX = -legRot;
          
          // Crossover lateral shift
          leftLegRotZ = Math.sin(timePhase) * 0.3 * Math.sign(moveX || 1);
          rightLegRotZ = Math.sin(timePhase) * 0.3 * Math.sign(moveX || 1);
          
          bounceAmt = Math.abs(Math.cos(timePhase)) * 0.15;
          const bounce = Math.abs(Math.cos(timePhase));
          scaleY = 0.85 + bounce * 0.15;
          scaleXZ = 1.15 - bounce * 0.15;
      } else if (isMovingForward && !isMovingLateral) {
          // Quick athletic run forward
          readyStanceDrop = 0.05;
          const legRot = Math.sin(timePhase) * 1.2;
          leftLegRotX = legRot;
          rightLegRotX = -legRot;
          
          bounceAmt = Math.abs(Math.cos(timePhase)) * 0.2;
          const bounce = Math.abs(Math.cos(timePhase));
          scaleY = 0.8 + bounce * 0.2;
          scaleXZ = 1.2 - bounce * 0.2;
      } else if (isMovingForward && isMovingLateral) {
          // Crossover step (forward-diagonal)
          const legRot = Math.sin(timePhase) * 0.9;
          leftLegRotX = legRot;
          rightLegRotX = -legRot;
          
          // Lateral shuffle spread
          leftLegRotZ = -Math.sin(timePhase) * 0.45;
          rightLegRotZ = Math.sin(timePhase) * 0.45;
          
          bounceAmt = Math.abs(Math.sin(timePhase)) * 0.15;
          const bounce = Math.abs(Math.cos(timePhase));
          scaleY = 0.85 + bounce * 0.15;
          scaleXZ = 1.15 - bounce * 0.15;
      } else {
          // Pure lateral side shuffle
          const spreadAmt = 0.7;
          leftLegRotZ = -Math.sin(timePhase) * spreadAmt;
          rightLegRotZ = Math.sin(timePhase) * spreadAmt;
          
          bounceAmt = Math.abs(Math.sin(timePhase)) * 0.2;
          const bounce = Math.abs(Math.cos(timePhase));
          scaleY = 0.8 + bounce * 0.2;
          scaleXZ = 1.2 - bounce * 0.2;
      }
      
      // Hip Y
      
      // Strict foot plant to floor
      const isMouseSkin = useEditorStore.getState().skinType === 'mouse' || useEditorStore.getState().skinType === 'mumu';
      const baseLegY = isMouseSkin ? 0.25 + bounceAmt * 2.5 : 0.65 * partSizes.leg * partSizes.legHeight + bounceAmt * 2.5;
  
      leftLegRef.current.position.y = THREE.MathUtils.lerp(leftLegRef.current.position.y, baseLegY, 20 * delta);
      leftLegRef.current.position.z = THREE.MathUtils.lerp(leftLegRef.current.position.z, 0, 20 * delta);
      rightLegRef.current.position.y = THREE.MathUtils.lerp(rightLegRef.current.position.y, baseLegY, 20 * delta);
      rightLegRef.current.position.z = THREE.MathUtils.lerp(rightLegRef.current.position.z, 0, 20 * delta);
      
      // Apply leg rotations
      leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, leftLegRotX, 20 * delta);
      rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, rightLegRotX, 20 * delta);
      leftLegRef.current.rotation.z = THREE.MathUtils.lerp(leftLegRef.current.rotation.z, leftLegRotZ, 20 * delta);
      rightLegRef.current.rotation.z = THREE.MathUtils.lerp(rightLegRef.current.rotation.z, rightLegRotZ, 20 * delta);
      
      // Torso - no squash/stretch
      torsoRef.current.scale.x = THREE.MathUtils.lerp(torsoRef.current.scale.x, 1, 20 * delta);
      torsoRef.current.scale.y = THREE.MathUtils.lerp(torsoRef.current.scale.y, 1, 20 * delta);
      torsoRef.current.scale.z = THREE.MathUtils.lerp(torsoRef.current.scale.z, 1, 20 * delta);
      
      const baseTorsoY = isMouseSkin ? useEditorStore.getState().mousePartSizes.torsoY : baseLegY + 0.4 * partSizes.torso;
      torsoRef.current.position.y = THREE.MathUtils.lerp(torsoRef.current.position.y, baseTorsoY, 20 * delta);
      
      targetTorsoRot.x = 0; // No forward lean
      
      // Arm swing
      if (!isSwinging.current && t === 0) {
          // Arm swing for all movements (forward, backward, lateral, diagonal)
          const armSwingPhase = Math.sin(timePhase) * 0.8;
          targetLeftArmRot.x = -armSwingPhase;
          targetLeftArmRot.z = 0.3;
          targetArmRot.x = armSwingPhase;
          targetArmRot.z = -0.3;
      }
    } else {
      // Recovery / Idle Stance (split step ready)
      const timePhase = state.clock.getElapsedTime() * 8; // subtle rapid idle bounce
      const idleBounce = Math.abs(Math.sin(timePhase)) * 0.02;
      
      let breathingScaleY = 1;
      let breathingScaleXZ = 1;
      let breathingPosY = 0;

      if (!isMoving) {
          const breatheTime = state.clock.getElapsedTime() * 3;
          breathingScaleY = 1 + Math.sin(breatheTime) * 0.08; // Deeper breathing
          breathingScaleXZ = 1 + Math.sin(breatheTime + Math.PI) * 0.025;
          breathingPosY = Math.sin(breatheTime) * 0.025;
      }

      torsoRef.current.scale.x = THREE.MathUtils.lerp(torsoRef.current.scale.x, breathingScaleXZ, 10 * delta);
      torsoRef.current.scale.y = THREE.MathUtils.lerp(torsoRef.current.scale.y, breathingScaleY, 10 * delta);
      torsoRef.current.scale.z = THREE.MathUtils.lerp(torsoRef.current.scale.z, breathingScaleXZ, 10 * delta);

      const isMouseSkin = useEditorStore.getState().skinType === 'mouse' || useEditorStore.getState().skinType === 'mumu';
      const baseLegY = isMouseSkin ? 0.25 : 0.65 * partSizes.leg * partSizes.legHeight;
      const baseTorsoY = isMouseSkin ? useEditorStore.getState().mousePartSizes.torsoY : baseLegY + 0.4 * partSizes.torso;
      torsoRef.current.position.y = THREE.MathUtils.lerp(torsoRef.current.position.y, baseTorsoY + breathingPosY, 10 * delta);
      
      leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, 15 * delta);
      rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, 15 * delta);
      leftLegRef.current.rotation.z = THREE.MathUtils.lerp(leftLegRef.current.rotation.z, 0, 15 * delta);
      rightLegRef.current.rotation.z = THREE.MathUtils.lerp(rightLegRef.current.rotation.z, 0, 15 * delta);
      
      leftLegRef.current.position.y = THREE.MathUtils.lerp(leftLegRef.current.position.y, baseLegY - 0.05, 15 * delta);
      leftLegRef.current.position.z = THREE.MathUtils.lerp(leftLegRef.current.position.z, 0, 15 * delta);
      rightLegRef.current.position.y = THREE.MathUtils.lerp(rightLegRef.current.position.y, baseLegY - 0.05, 15 * delta);
      rightLegRef.current.position.z = THREE.MathUtils.lerp(rightLegRef.current.position.z, 0, 15 * delta);
      
      targetTorsoRot.x = THREE.MathUtils.lerp(targetTorsoRot.x, 0, 10 * delta);
    }

    // Add fluid idle breathing animation when not swinging
    if (!isSwinging.current && t === 0 && !isMoving) {
      const time = state.clock.getElapsedTime();
      targetArmRot.z = -0.3 + Math.sin(time * 3) * 0.08;
      targetArmRot.x = 0.2 + Math.sin(time * 3 + Math.PI/2) * 0.05;
      targetLeftArmRot.z = 0.15 - Math.sin(time * 3) * 0.08;
      targetLeftArmRot.x = Math.sin(time * 3 + Math.PI/2) * 0.05;
      targetTorsoRot.x = Math.sin(time * 3) * 0.04;
      targetRacketRot.z = Math.sin(time * 3) * 0.05;
    }

    
    // 2. IK Lengan & Torso Twisting
    if (isSwinging.current) {
        // Torso Twisting (Procedural)
        if (swingProgress.current < 0.3) {
            targetTorsoRot.y += -0.6; // Wind up twist
        }
        
        // Weight Shift
        if (swingProgress.current > 0.3 && swingProgress.current < 0.6) {
            targetTorsoRot.z += -0.15; // Lean forward
            characterRef.current.position.z += 1 * delta * 4; // Step into the ball
        }
        
        // Simple IK Lengan (reach for ball)
        let nearestBall = null;
        let minDist = Infinity;
        activeBalls.forEach(b => {
            if (!b.state.active) return;
            const dist = b.state.position.distanceTo(characterRef.current!.position);
            if (dist < minDist) { minDist = dist; nearestBall = b; }
        });
        if (nearestBall && swingProgress.current > 0.15 && swingProgress.current < 0.6) {
            const ballPos = nearestBall.state.position;
            const charPos = characterRef.current.position;
            const heightDiff = ballPos.y - 1.2;
            const reachOffset = ballPos.x - charPos.x;
            targetArmRot.z += heightDiff * 0.4; // Reach high/low
            targetArmRot.x -= reachOffset * 0.3; // Reach wide
        }
    }
    
    // Animation Blending (add running twist to torso)
    if (isMovingRef.current) {
        const time = state.clock.getElapsedTime();
        const runTwist = Math.sin(time * 15) * 0.15;
        targetTorsoRot.y += runTwist;
        targetTorsoRot.z -= runTwist * 0.3; // subtle shoulder sway
        targetTorsoRot.x += Math.cos(time * 15) * 0.05; // subtle bounce
        
        if (!isSwinging.current) {
            // Arms flop slightly while running (squishy/relaxed feeling)
            targetArmRot.z += Math.cos(time * 15) * 0.15;
            targetLeftArmRot.z -= Math.cos(time * 15) * 0.15;
            targetArmRot.x -= Math.sin(time * 15) * 0.1;
            targetLeftArmRot.x += Math.sin(time * 15) * 0.1;
        }
    }
    
    // Squishy / Floppy reaction when skidding
    if (isSkiddingRef.current && !isJumpingRef.current && !isSwinging.current) {
        // Arms fly up and outward due to inertia
        targetArmRot.z += 0.6;
        targetArmRot.x -= 0.4;
        targetLeftArmRot.z -= 0.6;
        targetLeftArmRot.x -= 0.4;
        
        // Torso bends deeply to absorb shock
        targetTorsoRot.x += 0.4;
        targetTorsoRot.z += currentLeanRef.current * 0.5; // Twist with the lean
    }
    
    // Squash and Stretch on Jump
    if (isJumpingRef.current) {
        const vel = jumpVelocityRef.current;
        characterRef.current.scale.y = 1 + vel * 0.015; // stretch up
        characterRef.current.scale.x = 1 - Math.abs(vel) * 0.005;
        characterRef.current.scale.z = 1 - Math.abs(vel) * 0.005;
    } else {
        if (characterRef.current.userData.lastJump === true) {
            characterRef.current.userData.squashTime = 0.15;
        }
        if (characterRef.current.userData.squashTime > 0) {
            characterRef.current.userData.squashTime -= delta;
            characterRef.current.scale.y = 0.85; // Squash
            characterRef.current.scale.x = 1.1;
            characterRef.current.scale.z = 1.1;
        } else {
            characterRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 10 * delta);
        }
    }
    characterRef.current.userData.lastJump = isJumpingRef.current;
    
    let lerpSpeed = Math.min(1, 15 * delta);
    if (isSwinging.current) {
      lerpSpeed = 1; // Instant snap for stable speed
    }

    
    if (isSwinging.current && isServingRef.current) {
        if (rightLegRef.current && leftLegRef.current) {
            // kaki kanan kedepan (Z lebih kecil karena Z negatif adalah depan karakter)
            // kaki kiri kebelakang (Z lebih besar)
            rightLegRef.current.rotation.x = 0.5;
            
            leftLegRef.current.rotation.x = -0.5;
            
        }
    }
    
    
    let nearestBall: any = null;
    let minDist = Infinity;
    activeBalls.forEach(b => {
        if (!b.state.active) return;
        if (b.state.position.z > characterRef.current!.position.z + 0.5) {
            const dist = b.state.position.distanceTo(characterRef.current!.position);
            if (dist < minDist) { minDist = dist; nearestBall = b; }
        }
    });

    // Head tracking (Procedural LookAt)
    if (headRef.current) {
        if (nearestBall) {
            const targetPos = nearestBall.state.position.clone();
            // Convert world ball position to head's local space
            const localTarget = headRef.current.parent!.worldToLocal(targetPos);
            
            // Calculate yaw and pitch
            const dx = localTarget.x - headRef.current.position.x;
            const dy = localTarget.y - headRef.current.position.y;
            const dz = localTarget.z - headRef.current.position.z;
            
            const targetYaw = Math.atan2(dx, dz);
            const distXZ = Math.sqrt(dx*dx + dz*dz);
            const targetPitch = Math.atan2(-dy, distXZ);
            
            const clampedYaw = THREE.MathUtils.clamp(targetYaw, -1.2, 1.2);
            const clampedPitch = THREE.MathUtils.clamp(targetPitch, -0.6, 0.6);
            
            headRef.current.rotation.order = 'YXZ';
            headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, clampedYaw, 15 * delta);
            headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, clampedPitch, 15 * delta);
        } else {
            headRef.current.rotation.order = 'YXZ';
            headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, 0, 10 * delta);
            headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0, 10 * delta);
        }
    }
    
    // Smoothly interpolate current rotation to target rotation
    armRef.current.rotation.x = THREE.MathUtils.lerp(armRef.current.rotation.x, targetArmRot.x, lerpSpeed);
    armRef.current.rotation.y = THREE.MathUtils.lerp(armRef.current.rotation.y, targetArmRot.y, lerpSpeed);
    armRef.current.rotation.z = THREE.MathUtils.lerp(armRef.current.rotation.z, targetArmRot.z, lerpSpeed);


    // --- 1. Grip Switching ---
    if (isSwinging.current && swingProgress.current < 0.4) {
        // Procedurally adjust grip right before swing
        const isBackhand = nearestBall && nearestBall.state.position.x < characterRef.current.position.x;
        // Continental/Backhand grip twist
        if (isBackhand) {
            targetRacketRot.x += 0.5; // Twist racket face
        }
    }
    
    torsoRef.current.rotation.x = THREE.MathUtils.lerp(torsoRef.current.rotation.x, targetTorsoRot.x, lerpSpeed);
    torsoRef.current.rotation.y = THREE.MathUtils.lerp(torsoRef.current.rotation.y, targetTorsoRot.y, lerpSpeed);
    torsoRef.current.rotation.z = THREE.MathUtils.lerp(torsoRef.current.rotation.z, targetTorsoRot.z, lerpSpeed);

    racketRef.current.rotation.x = THREE.MathUtils.lerp(racketRef.current.rotation.x, targetRacketRot.x, lerpSpeed);
    racketRef.current.rotation.y = THREE.MathUtils.lerp(racketRef.current.rotation.y, targetRacketRot.y, lerpSpeed);
    racketRef.current.rotation.z = THREE.MathUtils.lerp(racketRef.current.rotation.z, targetRacketRot.z, lerpSpeed);

    // Tossing Logic
    if (tossTimerRef.current > 0) {
       tossTimerRef.current += delta;
       const p = Math.min(tossTimerRef.current / 0.4, 1);
       targetLeftArmRot.x = THREE.MathUtils.lerp(0.1, -2.8, p); 
       targetLeftArmRot.z = THREE.MathUtils.lerp(0.15, 0.4, p);
       
       if (tossTimerRef.current > 0.3 && !hasTossedRef.current) {
           hasTossedRef.current = true;
           if (characterRef.current && leftArmRef.current) {
              const worldPos = new THREE.Vector3();
              leftArmRef.current.getWorldPosition(worldPos);
              const startX = worldPos.x;
              const startY = worldPos.y + 0.2;
              const startZ = worldPos.z;
              window.dispatchEvent(new CustomEvent('tossBall', { 
                 detail: { 
                   position: new THREE.Vector3(startX, startY, startZ),
                   velocity: new THREE.Vector3(0, Math.sqrt(2.89 * useEditorStore.getState().ballGravity), 0.5)
                 } 
              }));
           }
       }
       
       if (tossTimerRef.current > 0.8) {
           tossTimerRef.current = 0;
           hasTossedRef.current = false;
       }
    }

    if (handBallRef.current) {
        const isBotTurn = useEditorStore.getState().serverTurn === 'bot';
        const noBalls = useEditorStore.getState().activeBallsCount === 0;
        const preToss = tossTimerRef.current === 0 || tossTimerRef.current < 0.3;
        handBallRef.current.visible = isBotTurn && noBalls && preToss;
    }

    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, targetLeftArmRot.x, lerpSpeed);
      leftArmRef.current.rotation.y = THREE.MathUtils.lerp(leftArmRef.current.rotation.y, targetLeftArmRot.y, lerpSpeed);
      leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, targetLeftArmRot.z, lerpSpeed);
    }
  });

  return (
    <group>
      <DustParticles characterRef={characterRef as React.RefObject<THREE.Group>} isMovingRef={isMovingRef} isSkiddingRef={isSkiddingRef} />
      <group ref={characterRef}>
        {skinType === 'mouse' || skinType === 'mumu' ? (
          skinType === 'mumu' ? (
            <MumuSkin
              headRef={headRef}
              torsoRef={torsoRef}
              armRef={armRef}
              leftArmRef={leftArmRef}
              leftLegRef={leftLegRef}
              rightLegRef={rightLegRef}
            >
              {/* Racket */}
              <TennisRacket ref={racketRef} visible={true} partSizes={partSizes} color="#222222" position={[0, -0.24, 0]} />
            </MumuSkin>
          ) : (
          <MouseSkin 
            color="#ffaa55"
            headRef={headRef}
            torsoRef={torsoRef}
            armRef={armRef}
            leftArmRef={leftArmRef}
            leftLegRef={leftLegRef}
            rightLegRef={rightLegRef}
          >
            {/* Tennis Racket attached to the hand */}
            <TennisRacket ref={racketRef} visible={true} partSizes={partSizes} color="#3A82C4" position={[0, -0.40, 0]} />
            </MouseSkin>
          )
        ) : (
          <>

        {/* Torso Group (Animated) */}
      <group ref={torsoRef} position={[0, 1.05, 0]}>
        
        {/* Body (Shirt) */}
        <mesh castShadow receiveShadow scale={[partSizes.torso, partSizes.torso * partSizes.torsoHeight, partSizes.torso]}>
          <capsuleGeometry args={[0.39, 0.5, 16, 32]} />
          <meshStandardMaterial color="#F57C23" roughness={0.6} />
        </mesh>

        {/* Head */}
        <group ref={headRef} position={[0, headY, 0]} scale={[partSizes.head, partSizes.head, partSizes.head]}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.42, 32, 32]} />
            <meshStandardMaterial color="#FAD6B1" roughness={0.4} />
          </mesh>

          {/* Face Overlay */}
          <mesh rotation={[0, -Math.PI / 2, 0]}>
            <sphereGeometry args={[0.425, 32, 32]} />
            <meshStandardMaterial map={faceTexture} transparent={true} alphaTest={0.5} roughness={0.4} />
          </mesh>

          {/* Hat */}
          <group position={[0, partSizes.hatY, 0]} scale={[partSizes.hat, partSizes.hat * partSizes.hatHeight, partSizes.hat]}>
            {/* Cap Dome */}
            <mesh castShadow position={[0, 0, 0]} scale={[1.05, 0.6, 1.05]}>
              <sphereGeometry args={[0.35, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#84E051" roughness={0.7} />
            </mesh>
            {/* Cap Base */}
            <mesh castShadow position={[0, -0.06, 0]}>
              <cylinderGeometry args={[0.365, 0.375, 0.14, 32]} />
              <meshStandardMaterial color="#84E051" roughness={0.7} />
            </mesh>
            {/* Brim */}
            <mesh castShadow position={[0, -0.08, 0.2]} rotation={[0.1, 0, 0]} scale={[1, 1, 1.3]}>
              <cylinderGeometry args={[0.37, 0.37, 0.04, 32]} />
              <meshStandardMaterial color="#457A3C" roughness={0.7} />
            </mesh>
          </group>
        </group>

        {/* Right Arm (Animated) */}
        <group ref={armRef} position={[-armX, armY, 0]} scale={[partSizes.arm, partSizes.arm, partSizes.arm]}>
          {/* Sleeve */}
          <mesh castShadow position={[0, -0.1, 0]}>
            <capsuleGeometry args={[0.15, 0.15, 16, 16]} />
            <meshStandardMaterial color="#F57C23" />
          </mesh>
          {/* Arm */}
          <mesh castShadow position={[0, -0.3, 0]}>
            <capsuleGeometry args={[0.13, 0.25, 16, 16]} />
            <meshStandardMaterial color="#FAD6B1" />
          </mesh>
          
          {/* Tennis Racket attached to the hand */}
          <TennisRacket ref={racketRef} visible={true} partSizes={partSizes} color="#ff3366" />
        </group>

        {/* Left Arm (Animated) */}
        <group ref={leftArmRef} position={[armX, armY, 0]} scale={[partSizes.arm, partSizes.arm, partSizes.arm]}>
          {/* Sleeve */}
          <mesh castShadow position={[0, -0.1, 0]}>
            <capsuleGeometry args={[0.15, 0.15, 16, 16]} />
            <meshStandardMaterial color="#F57C23" />
          </mesh>
          {/* Arm */}
          <mesh castShadow position={[0, -0.3, 0]}>
            <capsuleGeometry args={[0.13, 0.25, 16, 16]} />
            <meshStandardMaterial color="#FAD6B1" />
          </mesh>
          {/* Hand Ball */}
          <mesh ref={handBallRef} position={[0, -0.5, 0]} visible={false}>
             <sphereGeometry args={[0.1, 16, 16]} />
             <meshStandardMaterial color="#E3F026" roughness={0.3} />
          </mesh>
        </group>
      </group>

      {/* Legs (Animated Pivot at Hip) */}
      <group ref={leftLegRef} position={[-legX, 0.65 * partSizes.leg * partSizes.legHeight, 0]} scale={[partSizes.leg, partSizes.leg * partSizes.legHeight, partSizes.leg]}>
        {/* Pants */}
        <mesh castShadow position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.16, 0.35, 16, 16]} />
          <meshStandardMaterial color="#2E79F2" roughness={0.8} />
        </mesh>
        {/* Pants Cuff */}
        <mesh castShadow position={[0, -0.41, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.08, 16]} />
          <meshStandardMaterial color="#5192F5" roughness={0.8} />
        </mesh>
        {/* Shoe */}
        <mesh castShadow position={[0, -0.55, 0.08]}>
          <RoundedBox args={[0.26, 0.2, 0.36]} radius={0.06}>
            <meshStandardMaterial color="#291B16" roughness={0.9} />
          </RoundedBox>
        </mesh>
      </group>
      
      <group ref={rightLegRef} position={[legX, 0.65 * partSizes.leg * partSizes.legHeight, 0]} scale={[partSizes.leg, partSizes.leg * partSizes.legHeight, partSizes.leg]}>
        {/* Pants */}
        <mesh castShadow position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.16, 0.35, 16, 16]} />
          <meshStandardMaterial color="#2E79F2" roughness={0.8} />
        </mesh>
        {/* Pants Cuff */}
        <mesh castShadow position={[0, -0.41, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.08, 16]} />
          <meshStandardMaterial color="#5192F5" roughness={0.8} />
        </mesh>
        {/* Shoe */}
        <mesh castShadow position={[0, -0.55, 0.08]}>
          <RoundedBox args={[0.26, 0.2, 0.36]} radius={0.06}>
            <meshStandardMaterial color="#291B16" roughness={0.9} />
          </RoundedBox>
        </mesh>
      </group>
        </>
      )}
    </group>
  </group>
  );
});

function DustParticles({ characterRef, isMovingRef, isSkiddingRef }: { characterRef: React.RefObject<THREE.Group>, isMovingRef: React.MutableRefObject<boolean>, isSkiddingRef?: React.MutableRefObject<boolean> }) {
  const PARTICLE_COUNT = 30;
  const dummy = React.useMemo(() => new THREE.Object3D(), []);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const particles = useRef(Array.from({ length: PARTICLE_COUNT }, () => ({
    active: false,
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    scale: 0,
    life: 0,
  })));
  
  const spawnTimer = useRef(0);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.033) * (useEditorStore.getState().timeScale || 1.0);
    if (!meshRef.current || !characterRef.current) return;

    const isMoving = isMovingRef.current && characterRef.current.position.y < 0.1;
    const isSkidding = isSkiddingRef?.current ?? false;
    
    spawnTimer.current += delta;
    const spawnRate = isSkidding ? 0.015 : 0.05; // faster spawn when skidding
    if ((isMoving || isSkidding) && spawnTimer.current > spawnRate) { 
      spawnTimer.current = 0;
      const p = particles.current.find(p => !p.active);
      if (p) {
        p.active = true;
        // spawn at feet level
        p.position.copy(characterRef.current.position);
        p.position.y = 0; 
        p.position.x += (Math.random() - 0.5) * 0.5;
        p.position.z += (Math.random() - 0.5) * 0.5;
        
        if (isSkidding) {
            p.velocity.set((Math.random() - 0.5) * 8, Math.random() * 3.0 + 2.0, (Math.random() - 0.5) * 8);
            p.scale = Math.random() * 0.5 + 0.35;
        } else {
            p.velocity.set((Math.random() - 0.5) * 2, Math.random() * 1.5 + 0.5, (Math.random() - 0.5) * 2);
            p.scale = Math.random() * 0.2 + 0.15;
        }
        p.life = 1.0;
      }
    }

    particles.current.forEach((p, i) => {
      if (p.active) {
        p.life -= delta * 2;
        p.position.addScaledVector(p.velocity, delta);
        p.scale += delta * 0.5;
        
        if (p.life <= 0) {
          p.active = false;
        } else {
          dummy.position.copy(p.position);
          dummy.scale.setScalar(p.scale * p.life);
          dummy.updateMatrix();
          meshRef.current!.setMatrixAt(i, dummy.matrix);
        }
      }
      if (!p.active) {
        dummy.position.set(0, -100, 0);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      }
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]} receiveShadow>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.6} depthWrite={false} roughness={1} />
    </instancedMesh>
  );
}
