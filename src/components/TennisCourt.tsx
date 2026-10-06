import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useEditorStore } from '../store';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { MumuSkin } from './MumuSkin';

import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const Tribune = ({ position, scale, color }: { position: [number, number, number], scale: [number, number, number], color: string }) => (
  <mesh position={position} receiveShadow castShadow>
    <boxGeometry args={scale} />
    <meshStandardMaterial color={color} roughness={0.8} />
  </mesh>
);

const colors = ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#38bdf8', '#fb923c', '#ffffff', '#222222', '#10b981', '#6366f1'];
const skinTones = ['#FAD6B1', '#E2B98F', '#C68E58', '#8D5524', '#3E2723'];

function Audience() {
  const audienceData = useMemo(() => {
    const data = [];
    const steps = 5;
    const stepWidth = 1.2;
    const stepHeight = 0.6;
    const stepLength = 20;
    const startX = 12;
    const spacing = 1.0;
    
    const addPerson = (x, y, z, rotY) => {
      if (Math.random() > 0.8) {
        const xOffset = (Math.random() - 0.5) * 0.4;
        const zOffset = (Math.random() - 0.5) * 0.4;
        const rotYOffset = (Math.random() - 0.5) * 0.6;
        
        data.push({
          id: `aud-${x}-${y}-${z}`,
          basePos: [x + xOffset, y - 0.1, z + zOffset],
          rotation: [0, rotY + rotYOffset, 0],
        });
      }
    };
    
    for (let i = 0; i < steps; i++) {
        const height = (i + 1) * stepHeight;
        const x = -(startX + i * stepWidth + stepWidth / 2);
        for (let z = -stepLength/2 + 2; z < stepLength/2 - 1; z += spacing) {
            addPerson(x, height, z, Math.PI / 2);
        }
    }
    for (let i = 0; i < steps; i++) {
        const height = (i + 1) * stepHeight;
        const x = startX + i * stepWidth + stepWidth / 2;
        for (let z = -stepLength/2 + 2; z < stepLength/2 - 1; z += spacing) {
            addPerson(x, height, z, -Math.PI / 2);
        }
    }
    for (let i = 0; i < steps; i++) {
        const height = (i + 1) * stepHeight;
        const z = -(10 + i * stepWidth + stepWidth / 2);
        for (let lx = -11; lx <= 11; lx += spacing) {
             addPerson(lx, height, z, 0);
        }
    }
    for (let i = 0; i < steps; i++) {
        const height = (i + 1) * stepHeight;
        const z = 10 + i * stepWidth + stepWidth / 2;
         for (let lx = -11; lx <= 11; lx += spacing) {
             addPerson(lx, height, z, Math.PI);
        }
    }
    
    return data;
  }, []);

  return (
    <group>
      {audienceData.map((data) => (
        <group 
          key={data.id} 
          position={new THREE.Vector3(...data.basePos)} 
          rotation={new THREE.Euler(...data.rotation)}
          scale={0.8}
        >
          <MumuSkin disableAnimation={true} isSitting={true} />
        </group>
      ))}
    </group>
  );
}

export function TennisCourt() {
  const [showNumbers, setShowNumbers] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'y' || e.key === 'Y') {
        setShowNumbers(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const netTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000000'; // transparent in alpha map
      ctx.fillRect(0, 0, 128, 128);
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 12; // thicker lines so they are visible
      
      ctx.beginPath();
      for (let i = 0; i <= 128; i += 32) {
         ctx.moveTo(i, 0);
         ctx.lineTo(i, 128);
         ctx.moveTo(0, i);
         ctx.lineTo(128, i);
      }
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(30, 2); // Repeat across the net
    return tex;
  }, []);

  const steps = 5;
  const stepWidth = 1.2;
  const stepHeight = 0.6;
  const stepLength = 20;
  const startX = 12;

  
  const courtTheme = useEditorStore(state => state.courtTheme);
  const courtLength = useEditorStore(state => state.courtLength);
  
  let outerColor = "#2E8B57";
  let mainColor = "#4CAF50";
  
  if (courtTheme === 'hard') {
      outerColor = "#1a3b5c";
      mainColor = "#2b619e";
  } else if (courtTheme === 'clay') {
      outerColor = "#a3492f";
      mainColor = "#c05a3c";
  }

  return (
    <group position={[0, 0, 0]} scale={1.0}>
      {/* Grass/Out of bounds (Removed based on user request) */}
      
      {/* Main Court */}
      <mesh receiveShadow position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10.97, courtLength]} />
        <meshStandardMaterial color={mainColor} roughness={0.9} />
      </mesh>

      {/* Numbering / Zones */}
      {showNumbers && (
        <>
          {/* Bot side zones */}
          <Text position={[2.05, 0.01, -1.6]} rotation={[-Math.PI / 2, 0, Math.PI]} fontSize={1.5} color="rgba(255, 255, 255, 0.3)">1</Text>
          <Text position={[-2.05, 0.01, -1.6]} rotation={[-Math.PI / 2, 0, Math.PI]} fontSize={1.5} color="rgba(255, 255, 255, 0.3)">2</Text>
          <Text position={[2.05, 0.01, -courtLength/2 + 1.4]} rotation={[-Math.PI / 2, 0, Math.PI]} fontSize={1.5} color="rgba(255, 255, 255, 0.3)">3</Text>
          <Text position={[-2.05, 0.01, -courtLength/2 + 1.4]} rotation={[-Math.PI / 2, 0, Math.PI]} fontSize={1.5} color="rgba(255, 255, 255, 0.3)">4</Text>
          
          {/* Player side zones */}
          <Text position={[-2.05, 0.01, 1.6]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.5} color="rgba(255, 255, 255, 0.3)">5</Text>
          <Text position={[2.05, 0.01, 1.6]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.5} color="rgba(255, 255, 255, 0.3)">6</Text>
          <Text position={[-2.05, 0.01, courtLength/2 - 1.4]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.5} color="rgba(255, 255, 255, 0.3)">7</Text>
          <Text position={[2.05, 0.01, courtLength/2 - 1.4]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.5} color="rgba(255, 255, 255, 0.3)">8</Text>
        </>
      )}

      {/* Lines */}
      {/* Let's draw some actual lines using boxes for thickness */}
      <group position={[0, 0.005, 0]}>
        {/* Baselines */}
        <mesh position={[0, 0, courtLength / 2]}><boxGeometry args={[10.97, 0.02, 0.1]} /><meshStandardMaterial color="white" /></mesh>
        <mesh position={[0, 0, -courtLength / 2]}><boxGeometry args={[10.97, 0.02, 0.1]} /><meshStandardMaterial color="white" /></mesh>
        
        {/* Sidelines (Doubles) */}
        <mesh position={[5.485, 0, 0]}><boxGeometry args={[0.1, 0.02, courtLength]} /><meshStandardMaterial color="white" /></mesh>
        <mesh position={[-5.485, 0, 0]}><boxGeometry args={[0.1, 0.02, courtLength]} /><meshStandardMaterial color="white" /></mesh>
        
        {/* Sidelines (Singles) */}
        <mesh position={[4.115, 0, 0]}><boxGeometry args={[0.1, 0.02, courtLength]} /><meshStandardMaterial color="white" /></mesh>
        <mesh position={[-4.115, 0, 0]}><boxGeometry args={[0.1, 0.02, courtLength]} /><meshStandardMaterial color="white" /></mesh>
        
        {/* Service line */}
        <mesh position={[0, 0, 3.2]}><boxGeometry args={[8.23, 0.02, 0.1]} /><meshStandardMaterial color="white" /></mesh>
        <mesh position={[0, 0, -3.2]}><boxGeometry args={[8.23, 0.02, 0.1]} /><meshStandardMaterial color="white" /></mesh>
        
        {/* Center service line */}
        <mesh position={[0, 0, 0]}><boxGeometry args={[0.1, 0.02, 6.4]} /><meshStandardMaterial color="white" /></mesh>
        
        {/* Net */}
        <group position={[0, 0.45, 0]}>
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[10.97, 0.9]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.8} alphaMap={netTexture} alphaTest={0.5} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow><boxGeometry args={[10.97, 0.1, 0.1]} /><meshStandardMaterial color="white" /></mesh>
          {/* Net posts */}
          <mesh position={[5.485, -0.05, 0]} castShadow receiveShadow><cylinderGeometry args={[0.1, 0.1, 1.0]} /><meshStandardMaterial color="#222" /></mesh>
          <mesh position={[-5.485, -0.05, 0]} castShadow receiveShadow><cylinderGeometry args={[0.1, 0.1, 1.0]} /><meshStandardMaterial color="#222" /></mesh>
        </group>
      </group>

      {/* Left Tribunes */}
      {/* 
      {Array.from({ length: steps }).map((_, i) => {
        const height = (i + 1) * stepHeight;
        const x = -(startX + i * stepWidth + stepWidth / 2);
        return (
          <Tribune
            key={`left-tribune-${i}`}
            position={[x, height / 2, 0]}
            scale={[stepWidth, height, stepLength]}
            color="#8c92ac"
          />
        );
      })}
      */}

      {/* Right Tribunes */}
      {/* 
      {Array.from({ length: steps }).map((_, i) => {
        const height = (i + 1) * stepHeight;
        const x = startX + i * stepWidth + stepWidth / 2;
        return (
          <Tribune
            key={`right-tribune-${i}`}
            position={[x, height / 2, 0]}
            scale={[stepWidth, height, stepLength]}
            color="#8c92ac"
          />
        );
      })}
      */}

      {/* Back Tribunes (Bot Side) */}
      {/* 
      {Array.from({ length: steps }).map((_, i) => {
        const height = (i + 1) * stepHeight;
        const z = -(10 + i * stepWidth + stepWidth / 2);
        return (
          <Tribune
            key={`back-tribune-${i}`}
            position={[0, height / 2, z]}
            scale={[24, height, stepWidth]}
            color="#8c92ac"
          />
        );
      })}
      */}

      {/* Front Tribunes (Player Side) */}
      {/* 
      {Array.from({ length: steps }).map((_, i) => {
        const height = (i + 1) * stepHeight;
        const z = 10 + i * stepWidth + stepWidth / 2;
        return (
          <Tribune
            key={`front-tribune-${i}`}
            position={[0, height / 2, z]}
            scale={[24, height, stepWidth]}
            color="#8c92ac"
          />
        );
      })}
      */}

      {/* <Audience /> */}
    </group>
  );
}
