import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { Trail } from '@react-three/drei';
import * as THREE from 'three';
import { audioManager } from '../utils/audio';
import { useEditorStore, GameState } from '../store';
import { BotCharacter } from './BotCharacter';
import { gamePositions } from '../utils/gameState';
import { MeshLineMaterial } from 'meshline';

extend({ MeshLineMaterial });

export const activeBalls = new Set<{ mesh: THREE.Mesh, state: any }>();

interface BallProps {
  id: number;
  initialPosition: THREE.Vector3;
  initialVelocity: THREE.Vector3;
  onRemove: () => void;
}

export function SingleTennisBall({ id, initialPosition, initialVelocity, initialHitter, onRemove }: BallProps & { initialHitter: 'none' | 'player' | 'bot' }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const landingGroup = useRef<THREE.Group>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const circleMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const [trailReady, setTrailReady] = useState(false);
  const [isMaxPower, setIsMaxPower] = useState(false);
  const showTrail = useEditorStore(state => state.showTrail);
  const courtLength = useEditorStore(state => state.courtLength);

  const powerGradientTex = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 256, 0);
      gradient.addColorStop(0, '#ff0000'); // Red at tail
      gradient.addColorStop(0.5, '#ff8800'); // Orange middle
      gradient.addColorStop(1, '#ffffff'); // White at head
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 1);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const state = useRef({
    active: true,
    dying: false,
    deathTimer: 0,
    dead: false,
    position: initialPosition.clone(),
    velocity: initialVelocity.clone(),
    angularVelocity: new THREE.Vector3(
      Math.random() * 10 - 5,
      Math.random() * 10 - 5,
      Math.random() * 10 - 5
    ),
    life: 0,
    lastHitTime: 0,
    hitByAnim: '',
    lastHitter: initialHitter,
    bouncesSinceHit: 0,
    validBounce: false,
    isServePhase: true
  });

  const scorePoint = (winner: 'player' | 'bot') => {
      const store = useEditorStore.getState();
      store.scorePoint(winner);
      store.setServerTurn(winner);
  };

  useEffect(() => {
    if (meshRef.current) {
       activeBalls.add({ mesh: meshRef.current, state: state.current });
    }
    const handleHitEvent = (e: any) => {
      if (!state.current.active) return;
      
      const { position: racketPos, direction: hitDir, anim, power, isBot } = e.detail;
      
      // Check distance from ball to racket
      const dist = state.current.position.distanceTo(racketPos);
      const hitRadius = 1.8; // Presisi tabrakan
      
      if (dist < hitRadius && Date.now() - state.current.lastHitTime > 300) {
        
        let hitQuality: 'sweet' | 'normal' | 'frame' = 'normal';
        let qualityPowerMod = 1.0;
        
        if (dist < 0.6) {
            hitQuality = 'sweet';
            qualityPowerMod = 1.25;
            window.dispatchEvent(new CustomEvent('showFault', { detail: 'SWEET SPOT!' }));
        } else if (dist > 1.2) {
            hitQuality = 'frame';
            qualityPowerMod = 0.7;
            window.dispatchEvent(new CustomEvent('showFault', { detail: 'FRAME HIT!' }));
        }

        // Prevent hitting ball moving away (allow slight backward velocity for lobs/bounces)
        if (isBot && state.current.velocity.z > 2.0) return;
        if (!isBot && state.current.velocity.z < -2.0) return;

        // Fault if hitting serve before it bounces
        if (state.current.lastHitter !== 'none' && state.current.isServePhase && state.current.bouncesSinceHit === 0) {
            const winner = isBot ? 'player' : 'bot';
            scorePoint(winner);
            window.dispatchEvent(new CustomEvent('showFault', { detail: 'FAULT!' }));
            audioManager.playCrowd('aww');
            state.current.dying = true;
           state.current.active = false;
           return;
        }

        if (state.current.lastHitter !== 'none' && state.current.isServePhase) {
            state.current.isServePhase = false;
        }
        
        // --- Hit Timing Windows ---
        let timingMod = 1.0;
        let accuracyMod = 0;
        let powerMod = 1.0;
        
        // Z distance from perfect impact point
        const zDist = Math.abs(racketPos.z - state.current.position.z);
        if (zDist < 0.6) {
             // Perfect Hit
             timingMod = 1.2;
             accuracyMod = 0; // Straight to target
             powerMod = 1.1;
        } else if ((racketPos.z > state.current.position.z) !== isBot) {
             // Early Hit (Hit ball too far in front)
             timingMod = 0.8;
             accuracyMod = (Math.random() - 0.5) > 0 ? 3.0 : -3.0; // Wide angle
             powerMod = 0.9;
        } else {
             // Late Hit (Hit ball too far behind)
             timingMod = 0.6; // Weak lob
             accuracyMod = (Math.random() - 0.5) > 0 ? -2.0 : 2.0; // Wide other way
             powerMod = 0.7;
        }

        state.current.lastHitTime = Date.now();
        state.current.bouncesSinceHit = 0;
        state.current.validBounce = false;
        state.current.life = 0;
        state.current.hitByAnim = anim;
        state.current.lastHitter = isBot ? 'bot' : 'player';
        
        audioManager.playHit(hitQuality);
        
        if (anim === 'anim2' || anim === 'anim3') {
          const hitPwr = power !== undefined ? power : 0.8;
          setIsMaxPower(hitPwr >= 1.0);
          
          let flightTime;

          // Smart Targeting System
          const botSideZones = [
             { id: 1, x: 2.05, z: -3.2 },
             { id: 2, x: -2.05, z: -3.2 },
             { id: 3, x: 2.05, z: -9.1 },
             { id: 4, x: -2.05, z: -9.1 }
          ];
          const playerSideZones = [
             { id: 5, x: -2.05, z: 3.2 },
             { id: 6, x: 2.05, z: 3.2 },
             { id: 7, x: -2.05, z: 9.1 },
             { id: 8, x: 2.05, z: 9.1 }
          ];

          const getClosestZoneIndex = (pos, zones) => {
              let minIndex = 0;
              let minDist = Infinity;
              zones.forEach((zone, index) => {
                  const dist = Math.pow(pos.x - zone.x, 2) + Math.pow(pos.z - zone.z, 2);
                  if (dist < minDist) {
                      minDist = dist;
                      minIndex = index;
                  }
              });
              return minIndex;
          };

          const startX = state.current.position.x;
          const startY = state.current.position.y;
          const startZ = state.current.position.z;

          let targetX = e.detail.targetX;
          let targetZ = e.detail.targetZ;
          
          if (targetX !== undefined) targetX += accuracyMod;
          

          if (targetX === undefined || targetZ === undefined) {
              if (isBot) {
                  // Bot targets Player side (Zones 5,6,7,8)
                  const playerZoneIndex = getClosestZoneIndex(gamePositions.player, playerSideZones);
                  const availableZones = playerSideZones.filter((_, idx) => idx !== playerZoneIndex);
                  const targetZone = availableZones[Math.floor(Math.random() * availableZones.length)];
                  
                  targetX = targetZone.x + (Math.random() - 0.5) * 2.0;
                  targetZ = targetZone.z + (Math.random() - 0.5) * 2.0;
              } else {
                  // Player targets Bot side (Zones 1,2,3,4)
                  const botZoneIndex = getClosestZoneIndex(gamePositions.bot, botSideZones);
                  const availableZones = botSideZones.filter((_, idx) => idx !== botZoneIndex);
                  const targetZone = availableZones[Math.floor(Math.random() * availableZones.length)];
                  
                  targetX = targetZone.x + (Math.random() - 0.5) * 2.0;
                  targetZ = targetZone.z + (Math.random() - 0.5) * 2.0;
              }
          }

          // Safety clamp to ensure the ball lands more frequently in the safe zone
          const safeMarginX = 1.0; // 1 meter safe margin from the 5.485 side lines
          const maxSafeX = 5.485 - safeMarginX;
          targetX = THREE.MathUtils.clamp(targetX, -maxSafeX, maxSafeX);

          // For depth safety (Z-axis)
          const courtLen = useEditorStore.getState().courtLength;
          const safeMarginZ = 1.0;
          const maxSafeZ = (courtLen / 2) - safeMarginZ;
          
          if (targetZ < 0) {
              // Bot side
              targetZ = THREE.MathUtils.clamp(targetZ, -maxSafeZ, -1.0);
          } else {
              // Player side
              targetZ = THREE.MathUtils.clamp(targetZ, 1.0, maxSafeZ);
          }

          const dist = Math.sqrt(Math.pow(targetX - startX, 2) + Math.pow(targetZ - startZ, 2));
          
          let powerFactor = qualityPowerMod;
          if (hitPwr >= 1.0) {
              powerFactor = 0.55; // MUCH faster at max power
          } else {
              powerFactor = 1.15 - hitPwr * 0.35; // scales based on power
          }

          let baseTime = 0.8;
          if (anim === 'anim2') {
              baseTime = 0.6; // Smash (reduced power by 20%, slower flight time)
          } else if (anim === 'anim3') {
              baseTime = 0.5; // Fast smash speed
          }
          
          // Scale flight time slightly by distance so short balls don't float too long, 
          // but deep balls remain relaxed and slow like before.
          flightTime = baseTime * powerFactor * (0.4 + 0.6 * (dist / 20.0)) / useEditorStore.getState().ballSpeedMultiplier;

          // CERDAS FISIKA: Pastikan bola tidak kena net (Y = 1.5 pada saat Z = 0)
          // Hitung waktu saat bola melewati net (Z = 0)
          if ((startZ < 0 && targetZ > 0) || (startZ > 0 && targetZ < 0)) {
              const fraction = Math.abs(startZ) / (Math.abs(startZ) + Math.abs(targetZ));
              const currentYNet = startY * (1 - fraction) + (useEditorStore.getState().ballGravity / 2) * Math.pow(flightTime, 2) * fraction * (1 - fraction);
              
              const requiredClearance = 1.4; // Net height + margin (lowered to make front-court balls much faster)
              if (currentYNet < requiredClearance) {
                  // Tambah flightTime (kurangi speed) agar bola melambung di atas net
                  const neededTerm = Math.max(0, requiredClearance - startY * (1 - fraction));
                  const minFlightTimeSq = neededTerm / ((useEditorStore.getState().ballGravity / 2) * fraction * (1 - fraction));
                  if (minFlightTimeSq > 0) {
                      const minFlightTime = Math.sqrt(minFlightTimeSq);
                      if (minFlightTime > flightTime) {
                          flightTime = minFlightTime;
                      }
                  }
              }
          }

          const velX = (targetX - startX) / flightTime;
          const velZ = (targetZ - startZ) / flightTime;
          
          // Using y = y0 + v0y * t - 0.5 * g * t^2, set y=0
          const velY = ((useEditorStore.getState().ballGravity / 2) * flightTime * flightTime - startY) / flightTime;
          
          let finalVelX = velX;
          let finalVelY = velY;
          let finalVelZ = velZ;
          
          const shotType = e.detail.shotType;
          if (shotType === 'lob') {
              finalVelY += 6.0; 
              flightTime += 0.8;
              finalVelZ = (targetZ - startZ) / flightTime;
              finalVelX = (targetX - startX) / flightTime;
              state.current.angularVelocity.set(-10, 0, 0);
          } else if (shotType === 'slice') {
              flightTime += 0.3;
              finalVelY = ((useEditorStore.getState().ballGravity / 2) * flightTime * flightTime - startY) / flightTime;
              finalVelZ = (targetZ - startZ) / flightTime;
              finalVelX = (targetX - startX) / flightTime;
              state.current.angularVelocity.set(-25, 0, 0);
          } else if (shotType === 'topspin') {
              state.current.angularVelocity.set(30, 0, 0);
          } else if (anim === 'anim2' || shotType === 'smash') {
              finalVelY -= 2.0; 
          }

          const hitMult = useEditorStore.getState().hitPowerMultiplier;
          state.current.velocity.set(finalVelX * hitMult, finalVelY * hitMult, finalVelZ * hitMult);

          if (hitPwr >= 1.0 && (anim === 'anim2' || shotType === 'smash')) {
              // Smooth freeze: drops time scale to 0.05 for a sharper hit stop, 
              // it will smoothly recover in App.tsx
              useEditorStore.getState().setTimeScale(0.05);
              useEditorStore.getState().setCameraShake(2.0);
          }
          
          if (anim === 'anim2') {
             window.dispatchEvent(new CustomEvent('spawnParticles', { detail: { position: state.current.position, type: 'smash' } }));
          } else {
             window.dispatchEvent(new CustomEvent('spawnParticles', { detail: { position: state.current.position, type: 'normal' } }));
          }
        } else {
          // Default hit
          let hitPower = 45 + Math.random() * 8;
          let arc = 5 + Math.random() * 4;

          const forwardVelocity = hitDir.clone().multiplyScalar(hitPower);
          forwardVelocity.y += arc; // upward arc
          
          // Add some variation
          forwardVelocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 0.15);
          
          state.current.velocity.copy(forwardVelocity);
        }
        if (anim !== 'anim2' && anim !== 'anim3') {
           window.dispatchEvent(new CustomEvent('spawnParticles', { detail: { position: state.current.position, type: 'normal' } }));
        }
        
        // Apply spin
        state.current.angularVelocity.set(
          Math.random() * 20 - 10,
          Math.random() * 20 - 10,
          Math.random() * 20 - 10
        );
      }
    };

    window.addEventListener('hitBall', handleHitEvent);
    return () => {
       window.removeEventListener('hitBall', handleHitEvent);
       activeBalls.forEach(b => {
          if (b.mesh === meshRef.current) activeBalls.delete(b);
       });
    };
  }, []);

  useFrame((_, rawDelta) => {
    const delta = rawDelta * (useEditorStore.getState().timeScale || 1.0);
    if (!meshRef.current) return;

    if (state.current.dying) {
        state.current.deathTimer += delta;
        
        // Make ball disappear immediately
        meshRef.current.visible = false;
        
        // Fade out for trail (1.8 seconds)
        if (state.current.deathTimer > 1.0) {
            if (!state.current.dead) {
                state.current.dead = true;
                onRemove();
            }
        }
        
        // Slow down physics quickly so trail catches up and shrinks
        state.current.velocity.y -= useEditorStore.getState().ballGravity * delta;
        state.current.velocity.multiplyScalar(0.95);
        state.current.position.addScaledVector(state.current.velocity, delta);
        
        meshRef.current.position.copy(state.current.position);
        if (landingGroup.current) landingGroup.current.visible = false;
        
        return;
    }
    
    if (!state.current.active) return;

    
    // Gravity
    state.current.velocity.y -= useEditorStore.getState().ballGravity * delta;
    
    // Update position
    state.current.position.addScaledVector(state.current.velocity, delta);
    
    // Simple Floor Collision
    const ballRadius = 0.18;
    if (state.current.position.y <= ballRadius) {
      state.current.position.y = ballRadius;
      
      if (state.current.velocity.y < -2) {
        audioManager.playBounce(Math.abs(state.current.velocity.y));
      }

      state.current.bouncesSinceHit++;
      
      if (state.current.bouncesSinceHit === 1) {
        const { x, z } = state.current.position;
        const inBoundsX = x >= -5.485 && x <= 5.485; // doubles court bounds
        
        let validArea = false;
        if (state.current.lastHitter === 'player') {
           validArea = inBoundsX && z < 0 && z >= -courtLength/2;
        } else if (state.current.lastHitter === 'bot') {
           validArea = inBoundsX && z > 0 && z <= courtLength/2;
        }
        
        if (state.current.lastHitter !== 'none') {
            if (validArea) {
               state.current.validBounce = true;
            } else {
               // OUT OF BOUNDS! Opponent scores
               if (state.current.lastHitter === 'player') {
                   scorePoint('bot');
                   window.dispatchEvent(new CustomEvent('showFault', { detail: 'OUT!' }));
             audioManager.playCrowd('aww');
               } else {
                   scorePoint('player');
                   window.dispatchEvent(new CustomEvent('showFault', { detail: 'OUT!' }));
             audioManager.playCrowd('aww');
               }
               
               state.current.dying = true;
           state.current.active = false;
           return; // ball dies immediately
            }
        }
      } else if (state.current.bouncesSinceHit === 2) {
        if (state.current.validBounce) {
           // Bounced twice in valid area, last hitter wins
           const winner = state.current.lastHitter;
           scorePoint(winner as 'player' | 'bot');
           if (winner === 'player') {
               window.dispatchEvent(new CustomEvent('showFault', { detail: state.current.bouncesSinceHit === 2 && state.current.lastHitTime - Date.now() < -1500 ? 'ACE!' : 'POINT!' }));
           } else {
               window.dispatchEvent(new CustomEvent('showFault', { detail: 'POINT!' }));
           }
           state.current.dying = true;
           state.current.active = false;
           return;
        } else if (state.current.lastHitter === 'none') {
           // Player tossed it and missed, let them try again
           state.current.dying = true;
           state.current.active = false;
           return;
        }
      }

      state.current.velocity.y *= -useEditorStore.getState().ballBounciness; // higher restitution (more bouncy)
      if (state.current.bouncesSinceHit > 2) state.current.life += 1.0; // age faster when rolling
      state.current.velocity.x *= 0.9;
      state.current.velocity.z *= 0.9;
      
      if (Math.abs(state.current.velocity.y) < 0.5) {
        state.current.velocity.y = 0;
      }
    }
    
    // Net collision (simple check)
    if (Math.abs(state.current.position.z) < 0.05 && state.current.position.y < 1.05) {
        state.current.velocity.z *= -0.3; // bounce off net
        state.current.velocity.x *= 0.5;
    }
    
    meshRef.current.position.copy(state.current.position);
    gamePositions.ball.copy(state.current.position);

    if (landingGroup.current && ringMatRef.current && circleMatRef.current) {
        if (state.current.bouncesSinceHit === 0 && state.current.lastHitter !== 'none' && state.current.velocity.y < 8) {
            const y0 = state.current.position.y;
            const vy = state.current.velocity.y;
            const det = vy*vy - 4*(-(useEditorStore.getState().ballGravity / 2))*(y0 - 0.18);
            if (det >= 0) {
                const t = (-vy - Math.sqrt(det)) / -(useEditorStore.getState().ballGravity); 
                if (t > 0 && t < 2.0) { 
                    const landX = state.current.position.x + state.current.velocity.x * t;
                    const landZ = state.current.position.z + state.current.velocity.z * t;
                    
                    landingGroup.current.position.set(landX, 0.02, landZ);
                    landingGroup.current.visible = true;
                    
                    const scale = 1.0 + Math.max(0, t) * 0.5;
                    landingGroup.current.scale.setScalar(scale);
                    
                    const isSmash = state.current.hitByAnim === 'anim2';
                    const targetColor = isSmash ? new THREE.Color('#ff3b00') : new THREE.Color('#ffffff');
                    
                    ringMatRef.current.color = targetColor;
                    circleMatRef.current.color = targetColor;
                    
                    const alpha = THREE.MathUtils.clamp(1.0 - (t * 0.5), 0.2, 0.8);
                    ringMatRef.current.opacity = alpha;
                    circleMatRef.current.opacity = alpha * 0.3;
                } else {
                    landingGroup.current.visible = false;
                }
            } else {
                landingGroup.current.visible = false;
            }
        } else {
            landingGroup.current.visible = false;
        }
    }

    
    meshRef.current.rotation.x += state.current.angularVelocity.x * delta;
    meshRef.current.rotation.y += state.current.angularVelocity.y * delta;
    meshRef.current.rotation.z += state.current.angularVelocity.z * delta;

    if (state.current.position.y === ballRadius) {
      const speed = Math.sqrt(state.current.velocity.x**2 + state.current.velocity.z**2);
      if (speed > 0.1) {
        const rollAxis = new THREE.Vector3(-state.current.velocity.z, 0, state.current.velocity.x).normalize();
        meshRef.current.rotateOnWorldAxis(rollAxis, speed * delta / ballRadius);
      }
      state.current.angularVelocity.multiplyScalar(0.95);
    }
    
    state.current.life += delta;
    if (state.current.life > 0.05 && !trailReady) {
      setTrailReady(true);
    }
    
    // Only destroy mid-air if it's REALLY far away to allow it to bounce on the grass first
    if (state.current.life > 10 || Math.abs(state.current.position.x) > 40 || Math.abs(state.current.position.z) > 40) {
      if (state.current.bouncesSinceHit === 0 && state.current.lastHitter !== 'none') {
         // Flew out without bouncing -> out of bounds
         if (state.current.lastHitter === 'player') {
             scorePoint('bot');
             window.dispatchEvent(new CustomEvent('showFault', { detail: 'OUT!' }));
             audioManager.playCrowd('aww');
         } else {
             scorePoint('player');
             window.dispatchEvent(new CustomEvent('showFault', { detail: 'OUT!' }));
             audioManager.playCrowd('aww');
         }
      } else if (state.current.bouncesSinceHit === 1 && state.current.validBounce) {
         // Bounced once in bounds, but flew out -> hitter scores
         const winner = state.current.lastHitter;
         scorePoint(winner as 'player' | 'bot');
         if (winner === 'player') {
             window.dispatchEvent(new CustomEvent('showFault', { detail: 'POINT!' }));
         } else {
             window.dispatchEvent(new CustomEvent('showFault', { detail: 'POINT!' }));
         }
      }
      state.current.dying = true;
      state.current.active = false;
    }
  });

  const ballTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.fillStyle = '#b5cc18';
    ctx.fillRect(0, 0, 512, 256);
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    for (let i = 0; i <= 512; i++) {
      const x = i;
      const a = (x / 512) * Math.PI * 4; 
      const y = 128 + Math.sin(a) * 70;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <group userData={{ type: 'tennisBall' }}>
      {/* Landing indicator */}
      <group ref={landingGroup} visible={false}>
        <mesh rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[0.3, 0.45, 32]} />
          <meshBasicMaterial ref={ringMatRef} color="#ffffff" transparent opacity={0.8} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI/2, 0, 0]}>
          <circleGeometry args={[0.3, 32]} />
          <meshBasicMaterial ref={circleMatRef} color="#ffffff" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      </group>
      {trailReady && showTrail && (
        <Trail
          target={meshRef}
          width={4.0}
          length={3}
          decay={1}
          attenuation={(t) => t * t}
          local={false}
        >
          {(isMaxPower || state.current.hitByAnim === 'anim2') ? (
            // @ts-ignore
            <meshLineMaterial useMap={1} map={powerGradientTex} color="white" />
          ) : (
            // @ts-ignore
            <meshLineMaterial color={state.current.hitByAnim === 'anim3' ? "#aaffaa" : "white"} />
          )}
        </Trail>
      )}
      <mesh ref={meshRef} position={initialPosition.clone()} castShadow receiveShadow userData={{ type: 'tennisBallMesh' }}>
        <sphereGeometry args={[0.18, 32, 32]} />
        {ballTexture ? (
          <meshStandardMaterial map={ballTexture} roughness={0.5} />
        ) : (
          <meshStandardMaterial color="#b5cc18" roughness={0.5} />
        )}
      </mesh>
    </group>
  );
}

export function TennisBall() {
  const [balls, setBalls] = useState<any[]>([]);
  const courtLength = useEditorStore(state => state.courtLength);

  useEffect(() => {
    useEditorStore.getState().setActiveBallsCount(balls.length);
  }, [balls]);

  useEffect(() => {
    const handleBotServe = (e: any) => {
      setBalls((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          position: e.detail.position,
          velocity: e.detail.velocity,
          initialHitter: 'bot'
        },
      ]);
    };
    
    const handleToss = (e: any) => {
      setBalls((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          position: e.detail.position,
          velocity: e.detail.velocity,
          initialHitter: 'none'
        },
      ]);
    };
    
    window.addEventListener('botServeBall', handleBotServe);
    window.addEventListener('tossBall', handleToss);
    return () => {
      window.removeEventListener('botServeBall', handleBotServe);
      window.removeEventListener('tossBall', handleToss);
    };
  }, []);

  return (
    <>
      {/* The AI Opponent */}
      <BotCharacter position={[0, 0, -courtLength/2]} />
      
      {balls.map((ball) => (
        <SingleTennisBall
          key={ball.id}
          id={ball.id}
          initialPosition={ball.position}
          initialVelocity={ball.velocity}
          initialHitter={ball.initialHitter}
          onRemove={() => setBalls((prev) => prev.filter((b) => b.id !== ball.id))}
        />
      ))}
    </>
  );
}

