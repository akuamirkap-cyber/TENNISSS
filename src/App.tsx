import { Suspense, useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { TennisCharacter } from './components/TennisCharacter';
import { TennisBall } from './components/TennisBall';
import { HitParticles } from "./components/Effects";
import { AnimationEditor } from './components/AnimationEditor';
import { Joystick } from './components/Joystick';
import { TennisCourt } from './components/TennisCourt';
import { Referee } from './components/Referee';
import { CameraEditor } from './components/CameraEditor';
import { CharacterSizeEditor } from './components/CharacterSizeEditor';
import { PhysicsEditor } from './components/PhysicsEditor';
import { ArcadeTextOverlay } from './components/ArcadeTextOverlay';
import { audioManager } from './utils/audio';
import { useEditorStore } from './store';

const EnvTextureWrapper = ({ themeConfig, useEnvGround, envRadius, envHeight, envScale }: any) => {
  const texture = useTexture(themeConfig.files) as THREE.Texture;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return (
    <Environment 
      map={texture} 
      preset={useEnvGround ? "city" : undefined}
      background 
      environmentIntensity={0.8} 
      resolution={2048} 
      ground={useEnvGround ? { radius: envRadius, height: envHeight, scale: envScale } : undefined}
    />
  );
};

const DynamicEnvironment = ({ themeConfig, useEnvGround, envRadius, envHeight, envScale }: any) => {
  const isHdr = themeConfig.files.endsWith('.hdr') || themeConfig.files.endsWith('.exr');
  if (isHdr) {
    return (
      <Environment 
        files={themeConfig.files} 
        background 
        environmentIntensity={0.8} 
        resolution={2048} 
        ground={useEnvGround ? { radius: envRadius, height: envHeight, scale: envScale } : undefined}
      />
    );
  } else {
    return (
      <EnvTextureWrapper 
        themeConfig={themeConfig} 
        useEnvGround={useEnvGround} 
        envRadius={envRadius} 
        envHeight={envHeight} 
        envScale={envScale} 
      />
    );
  }
};

function PowerGauge() {
  return (
    <div id="serve-power-container" className="absolute bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 hidden pointer-events-none transition-opacity duration-300">
      <div className="text-white font-bold text-xl drop-shadow-md mb-2 tracking-widest uppercase">Serve Power</div>
      <div className="w-64 h-6 bg-gray-900/80 rounded-full border-2 border-white/50 overflow-hidden relative shadow-[0_0_15px_rgba(0,0,0,0.5)]">
        {/* Zones */}
        <div className="absolute top-0 bottom-0 left-0 w-[40%] bg-red-500/50"></div>
        <div className="absolute top-0 bottom-0 left-[40%] w-[45%] bg-yellow-500/50"></div>
        <div className="absolute top-0 bottom-0 left-[85%] right-0 bg-green-500/70"></div>
        <div className="absolute top-0 bottom-0 left-[85%] w-1 bg-white z-10 shadow-[0_0_5px_white]"></div>
        
        {/* Moving Bar */}
        <div id="serve-power-bar" className="h-full w-0 bg-white shadow-[0_0_10px_white] transition-none rounded-r-full relative z-20"></div>
      </div>
    </div>
  );
}

function CameraController({ mode, characterRef, settings, gameMode, stumbleCamera, tennisCamera, camConfig }: { mode: 'orbit' | 'game', characterRef: React.RefObject<THREE.Group | null>, settings: any, gameMode: string, stumbleCamera?: string, tennisCamera?: string, camConfig?: any }) {
  const { camera } = useThree();
  const cameraShake = useEditorStore((state) => state.cameraShake);
  const setCameraShake = useEditorStore((state) => state.setCameraShake);
  const seedRef = useRef(Math.random());
  const smoothedForwardRef = useRef(new THREE.Vector3(0, 0, -1));
  
  useFrame((state, delta) => {
    // Restore base camera pos before lerp if it was shaken in the previous frame
    if (state.scene.userData.baseCamPos && cameraShake > 0) {
       camera.position.copy(state.scene.userData.baseCamPos);
    }

    // Auto recover timeScale for smooth freeze effect
    // We use a fixed unscaled delta for this because timeScale itself affects delta in game logic
    const unscaledDelta = Math.min(0.05, 1.0 / 30.0); // Rough estimate of unscaled delta
    const timeScale = useEditorStore.getState().timeScale;
    if (timeScale < 1.0) {
       // Recover to 1.0 smoothly
       const nextTimeScale = Math.min(1.0, timeScale + unscaledDelta * 2.5); // recovers in ~0.4s
       useEditorStore.getState().setTimeScale(nextTimeScale);
    }

    if (cameraShake > 0) {
      setCameraShake(Math.max(0, cameraShake - delta * 4.0));
    }

    if (mode === 'game') {
      let targetPos = new THREE.Vector3(settings.posX, settings.posY, settings.posZ);
      let lookAtPos = new THREE.Vector3(settings.lookX, settings.lookY, settings.lookZ);
      
      let isGtaCam = (gameMode === 'stumble' && stumbleCamera === 'gta') || (gameMode === 'tennis' && tennisCamera === 'gta');
      
      if (characterRef.current) {
        const charPos = new THREE.Vector3();
        characterRef.current.getWorldPosition(charPos);
        
                                        if (isGtaCam) {
            if (gameMode === 'tennis') {
                targetPos.set(charPos.x, charPos.y + (camConfig?.tennisGtaTargetY || 2.0), charPos.z + (camConfig?.tennisGtaTargetZ || 3.5));
                lookAtPos.set(charPos.x, charPos.y + (camConfig?.tennisGtaLookY || 1.0), charPos.z + (camConfig?.tennisGtaLookZ || -10));
            } else {
                // Character natively faces +Z
                const charForward = new THREE.Vector3(0, 0, 1).applyQuaternion(characterRef.current.quaternion);
                charForward.y = 0; // Keep it horizontal so camera doesn't dip when character leans
                charForward.normalize();
                
                // If smoothed forward is exactly opposite, lerp will get stuck at 0. Add a small offset to prevent this.
                if (smoothedForwardRef.current.dot(charForward) < -0.99) {
                    smoothedForwardRef.current.add(new THREE.Vector3(0.01, 0, 0.01)).normalize();
                }
                
                // Smoothly interpolate the forward direction so the camera doesn't snap to head rotation
                smoothedForwardRef.current.lerp(charForward, 10.0 * delta).normalize();
                
                const forward = smoothedForwardRef.current;
                
                const distance = camConfig?.stumbleGtaDistance || 3.0;
                const height = camConfig?.stumbleGtaHeight || 2.0;
                
                // Position camera BEHIND the character (subtract forward vector)
                targetPos.copy(charPos).addScaledVector(forward, -distance);
                targetPos.y += height;
                
                // Look ahead of the character (add forward vector)
                const lookDist = camConfig?.stumbleGtaLookDist || 5.5;
                lookAtPos.copy(charPos).addScaledVector(forward, lookDist);
                lookAtPos.y += (camConfig?.stumbleGtaLookY || -0.5);
            }
        } else {
            if (gameMode === 'stumble') {
                targetPos.set(0, camConfig?.stumbleDefaultTargetY || 12, camConfig?.stumbleDefaultTargetZ || 16);
                lookAtPos.set(0, camConfig?.stumbleDefaultLookY || 0, camConfig?.stumbleDefaultLookZ || -5);
            } else if (gameMode === 'sidescroller') {
                targetPos.set(charPos.x, charPos.y + 4, 15);
                lookAtPos.set(charPos.x, charPos.y + 2, 0);
                // Hard reset for camera shake to avoid jitter on mode switch
                targetPos.z = 15;
            }
            if (gameMode !== 'sidescroller') {
                targetPos.x += charPos.x;
                targetPos.z += charPos.z;
                lookAtPos.x += charPos.x;
                lookAtPos.z += charPos.z;
            }
        }
      }
      
      // pure lerp to targetPos (without shake)
      const lerpFactorPos = 1.0 - Math.pow(0.001, delta);
      if (isGtaCam && gameMode === 'stumble') {
         camera.position.lerp(targetPos, 1.0 - Math.exp(-25.0 * delta)); // Frame-rate independent fast follow
      } else {
         camera.position.lerp(targetPos, lerpFactorPos);
      }
      
      const currentQuat = camera.quaternion.clone();
      camera.lookAt(lookAtPos);
      const targetQuat = camera.quaternion.clone();
      camera.quaternion.copy(currentQuat);
      
      const lerpFactorRot = 1.0 - Math.pow(0.00001, delta);
      if (isGtaCam && gameMode === 'stumble') {
          // Frame-rate independent rotation to follow character snappily
          camera.quaternion.slerp(targetQuat, 1.0 - Math.exp(-20.0 * delta));
      } else {
          camera.quaternion.slerp(targetQuat, lerpFactorRot);
      }
      
      // Add camera shake directly to position (post-lerp) so it isn't smoothed out
      if (cameraShake > 0) {
        const shakeMag = cameraShake * 0.2; // Less magnitude needed because it's not damped by lerp
        // Use unscaled elapsedTime so shake speed is consistent even during timeScale freeze
        const t = performance.now() * 0.03 + seedRef.current * 100.0;
        
        // Random-looking shake using overlapping sine waves
        const shakeX = (Math.sin(t) + Math.sin(t * 1.5)) * shakeMag;
        const shakeY = (Math.cos(t * 1.2) + Math.cos(t * 2.1)) * shakeMag;
        const shakeZ = (Math.sin(t * 0.8) + Math.sin(t * 1.8)) * shakeMag;
        
        // Temporarily store base pos so next frame's lerp starts from the real position
        if (!state.scene.userData.baseCamPos) {
           state.scene.userData.baseCamPos = new THREE.Vector3();
        }
        state.scene.userData.baseCamPos.copy(camera.position);
        
        camera.position.x += shakeX;
        camera.position.y += shakeY;
        camera.position.z += shakeZ;
      }
      
      let targetFov = 45;
      if (gameMode === 'stumble') {
        targetFov = stumbleCamera === 'gta' ? 75 : 60;
      } else if (gameMode === 'tennis') {
        targetFov = tennisCamera === 'gta' ? 75 : 45;
      } else if (gameMode === 'sidescroller') {
        targetFov = 35; // a bit more zoomed in for sidescroller
      }
      (camera as THREE.PerspectiveCamera).fov = THREE.MathUtils.lerp((camera as THREE.PerspectiveCamera).fov, targetFov, 5.0 * delta);
      camera.updateProjectionMatrix();
    }
  });
  
  return null;
}

import { StumbleGuysLevel } from './components/StumbleGuysLevel';
import { SidescrollerLevel } from './components/SidescrollerLevel';

export default function App() {
  const [cameraMode, setCameraMode] = useState<'orbit' | 'game'>('game');
  const [stumbleCamera, setStumbleCamera] = useState<'default' | 'gta'>('gta');
  const courtLength = useEditorStore(state => state.courtLength);
  const [camConfig, setCamConfig] = useState({
    tennisGtaTargetY: 4,
    tennisGtaTargetZ: 4,
    tennisGtaLookY: -0.5,
    tennisGtaLookZ: -12,
    stumbleGtaDistance: 3,
    stumbleGtaHeight: 2,
    stumbleGtaLookDist: 5.5,
    stumbleGtaLookY: -0.5,
    stumbleDefaultTargetY: 11,
    stumbleDefaultTargetZ: 11,
    stumbleDefaultLookY: 0,
    stumbleDefaultLookZ: -3,
  });
  const [tennisCamera, setTennisCamera] = useState<'broadcast' | 'gta'>('gta');
  const [showUI, setShowUI] = useState(false);
  const [faultMessage, setFaultMessage] = useState<string | null>(null);
  const [environmentTheme, setEnvironmentTheme] = useState<'forest' | 'forest_jpg' | 'snow' | 'beach' | 'park' | 'africa'>('beach');
  const [envRadius, setEnvRadius] = useState(103);
  const [envHeight, setEnvHeight] = useState(11);
  const [envScale, setEnvScale] = useState(55);
  const [useEnvGround, setUseEnvGround] = useState(true);

  const envConfig: Record<string, { files: string, fogColor: string, ambientColor: string, dirColor: string, dirIntensity: number }> = {
    forest: {
      files: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/forest_slope_2k.hdr",
      fogColor: '#8da794',
      ambientColor: '#dbe5d4',
      dirColor: '#ffdcb3',
      dirIntensity: 2.2
    },
    forest_jpg: {
      files: "/forest.jpg",
      fogColor: '#8da794',
      ambientColor: '#dbe5d4',
      dirColor: '#ffdcb3',
      dirIntensity: 2.2
    },
    snow: {
      files: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/rooitou_park_2k.hdr",
      fogColor: '#d6e3ee',
      ambientColor: '#e8f0f8',
      dirColor: '#ffffff',
      dirIntensity: 1.8
    },
    beach: {
      files: "/beach.png",
      fogColor: '#8eb3d4',
      ambientColor: '#e0f0ff',
      dirColor: '#ffebd6',
      dirIntensity: 2.5
    },
    park: {
      files: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/potsdamer_platz_2k.hdr",
      fogColor: '#9bb093',
      ambientColor: '#eaf4e3',
      dirColor: '#ffedcc',
      dirIntensity: 2.0
    },
    africa: {
      files: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/kiara_1_dawn_2k.hdr",
      fogColor: '#bfa888',
      ambientColor: '#f2e8d5',
      dirColor: '#ffebbd',
      dirIntensity: 2.4
    }
  };

  const [cameraSettings, setCameraSettings] = useState({
    posX: 0,
    posY: 8,
    posZ: 19.5,
    lookX: 0,
    lookY: -1,
    lookZ: 0
  });
  const characterRef = useRef<THREE.Group>(null);
  const { playerPoints, botPoints, playerGames, botGames, playerSets, botSets, isTieBreak, serverTurn, activeBallsCount, isAutoPlay, setIsAutoPlay, isAutoHit, setIsAutoHit, showTrail, setShowTrail, gameMode, setGameMode, isRecordingStumble, stumbleRecordingData } = useEditorStore();
  
  const getTennisScore = (p: number, b: number, isTieBreak: boolean) => {
    if (isTieBreak) return `${p}`; 
    if (p >= 3 && b >= 3) {
       if (p === b) return '40';
       if (p > b) return 'AD';
       return '-';
    }
    const scores = ['0', '15', '30', '40'];
    return scores[p] || '40';
  };
  const pDisplay = getTennisScore(playerPoints, botPoints, isTieBreak);
  const bDisplay = getTennisScore(botPoints, playerPoints, isTieBreak);

  useEffect(() => {
    if (playerPoints === 0 && botPoints === 0 && playerGames === 0 && botGames === 0) return;
    
    if (playerPoints === 0 && botPoints === 0 && (playerGames > 0 || botGames > 0)) {
       audioManager.playCrowd('applause');
       audioManager.announce(`Game, ${serverTurn === 'bot' ? 'Player' : 'Bot'}`);
    } else {
       audioManager.playCrowd('cheer');
       const p = getTennisScore(playerPoints, botPoints, isTieBreak);
       const b = getTennisScore(botPoints, playerPoints, isTieBreak);
       if (p === '40' && b === '40') audioManager.announce('Deuce');
       else if (p === 'AD') audioManager.announce('Advantage Player');
       else if (b === 'AD') audioManager.announce('Advantage Bot');
       else audioManager.announce(`${p} ${b === '0' ? 'Love' : b}`);
    }
  }, [playerPoints, botPoints, playerGames, botGames]);

  useEffect(() => {
    const interval = setInterval(() => {
      audioManager.playEnvironment(environmentTheme);
    }, 8000);
    return () => clearInterval(interval);
  }, [environmentTheme]);

  const [isUICollapsed, setIsUICollapsed] = useState(false);
  const courtTheme = useEditorStore(state => state.courtTheme);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h') {
        setShowUI(prev => !prev);
      }
      if (e.key.toLowerCase() === 'g') {
        const store = useEditorStore.getState();
        store.setSkinType(store.skinType === 'default' ? 'mouse' : (store.skinType === 'mouse' ? 'mumu' : 'default'));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="w-full h-screen bg-gradient-to-b from-blue-400 via-sky-200 to-orange-100 relative overflow-hidden font-sans">
      {showUI && (
        <>
          <AnimationEditor />
          <CameraEditor settings={cameraSettings} onChange={setCameraSettings} />
          
        </>
      )}
      <PowerGauge />
      <ArcadeTextOverlay />
      {gameMode === 'tennis' && (
        <div className="absolute top-4 left-4 z-50 pointer-events-none transform scale-[0.65] origin-top-left">
          <div className="flex flex-col gap-1 backdrop-blur-md rounded p-2 text-xs shadow-xl min-w-[200px] bg-black/30 border border-white/10">
             <div className="flex justify-between text-white font-bold mb-1 border-b border-white/40 pb-1">
                <span className="w-14"></span>
                <span className="w-6 text-center text-white/80">SET</span>
                <span className="w-6 text-center text-white/80">GMS</span>
                <span className="w-8 text-center text-green-400">PTS</span>
             </div>
             <div className="flex justify-between items-center text-white font-bold">
                <span className="w-14 truncate drop-shadow-md">YOU {serverTurn === 'player' ? '🎾' : ''}</span>
                <span className="w-6 text-center bg-blue-500/80 rounded shadow">{playerSets}</span>
                <span className="w-6 text-center bg-blue-500/80 rounded shadow">{playerGames}</span>
                <span className="w-8 text-center bg-blue-600 rounded py-0.5 shadow">{pDisplay}</span>
             </div>
             <div className="flex justify-between items-center text-white font-bold mt-1">
                <span className="w-14 text-red-100 drop-shadow-md truncate">BOT {serverTurn === 'bot' ? '🎾' : ''}</span>
                <span className="w-6 text-center bg-red-500/80 rounded shadow">{botSets}</span>
                <span className="w-6 text-center bg-red-500/80 rounded shadow">{botGames}</span>
                <span className="w-8 text-center bg-red-600 rounded py-0.5 shadow">{bDisplay}</span>
             </div>
          </div>
        </div>
      )}
      
      
      {/* Overlay UI Sidebar */}
      <div className={`absolute top-0 right-0 h-full transition-transform duration-300 z-40 flex items-start ${isUICollapsed ? 'translate-x-full' : 'translate-x-0'}`}>
        <div className="w-[360px] max-h-screen overflow-y-auto bg-black/60 backdrop-blur-md border-l border-white/20 shadow-2xl p-4 flex flex-col gap-4 pointer-events-auto">
          
          {/* Game Controls */}

            <div className="flex flex-col gap-1 mt-2 text-xs text-white/80 bg-black/40 p-2 rounded">
              <div className="font-bold text-white mb-1 border-b border-white/20 pb-1">Keyboard Controls</div>
              <div><kbd className="bg-white/20 px-1 rounded">W/A/S/D</kbd> : Move & Aim</div>
              <div><kbd className="bg-white/20 px-1 rounded">SPACE</kbd> : Toss / Jump</div>
              <div className="mt-1 font-bold text-yellow-300">Shot Types (Hold to Charge):</div>
              <div><kbd className="bg-white/20 px-1 rounded">J</kbd> : Topspin (Fast, Dives)</div>
              <div><kbd className="bg-white/20 px-1 rounded">K</kbd> : Slice (Slow, Low Bounce)</div>
              <div><kbd className="bg-white/20 px-1 rounded">L</kbd> : Lob (High Arc)</div>
              <div><kbd className="bg-white/20 px-1 rounded">M</kbd> : Smash (Matrix Slow-Mo)</div>
            </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-white font-bold border-b border-white/20 pb-1">Game Controls</h3>
            
            
            <div className="flex gap-2 flex-wrap">
              {gameMode === 'tennis' && (
                <>
                  <button onClick={() => setIsAutoPlay(!isAutoPlay)} className={`flex-1 font-bold text-xs px-2 py-1 rounded ${isAutoPlay ? 'bg-purple-600 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                    AUTO PLAY: {isAutoPlay ? 'ON' : 'OFF'}
                  </button>
                  <button onClick={() => setIsAutoHit(!isAutoHit)} className={`flex-1 font-bold text-xs px-2 py-1 rounded ${isAutoHit ? 'bg-orange-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                    AUTO HIT: {isAutoHit ? 'ON' : 'OFF'}
                  </button>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setGameMode(gameMode === 'tennis' ? 'stumble' : gameMode === 'stumble' ? 'sidescroller' : 'tennis')} className="flex-1 font-bold text-xs px-2 py-1 rounded bg-pink-500 text-white">
                MODE: {gameMode.toUpperCase()}
              </button>
              <button onClick={() => setShowTrail(!showTrail)} className={`flex-1 font-bold text-xs px-2 py-1 rounded ${showTrail ? 'bg-sky-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                TRAIL: {showTrail ? 'ON' : 'OFF'}
              </button>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => gameMode === 'stumble' ? setStumbleCamera(prev => prev === 'default' ? 'gta' : 'default') : setTennisCamera(prev => prev === 'broadcast' ? 'gta' : 'broadcast')}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-2 rounded text-xs"
              >
                CAM: {gameMode === 'stumble' ? stumbleCamera.toUpperCase() : tennisCamera.toUpperCase()}
              </button>
              
              {gameMode === 'tennis' && (
                <button 
                  onClick={() => {
                    const store = useEditorStore.getState();
                    const nextTheme = store.courtTheme === 'grass' ? 'hard' : store.courtTheme === 'hard' ? 'clay' : 'grass';
                    store.setCourtTheme(nextTheme);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2 rounded text-xs"
                >
                  COURT: {courtTheme.toUpperCase()}
                </button>
              )}
            </div>
            {gameMode === 'tennis' && (
              <div className="mt-2 flex items-center justify-between">
                  <label className="text-white text-xs font-bold">Court Length: {courtLength.toFixed(1)}m</label>
                  <input 
                      type="range" 
                      min="12.0" max="30.0" step="0.5" 
                      value={courtLength}
                      onChange={(e) => useEditorStore.getState().setCourtLength(parseFloat(e.target.value))}
                      className="w-1/2"
                  />
              </div>
            )}
          </div>

          {/* Environment */}
          <div className="flex flex-col gap-2">
            <h3 className="text-white font-bold border-b border-white/20 pb-1">Environment Theme</h3>
            <div className="grid grid-cols-2 gap-2">
              {['forest', 'forest_jpg', 'snow', 'beach', 'park', 'africa'].map(theme => (
                <button 
                  key={theme}
                  onClick={(e) => { e.stopPropagation(); setEnvironmentTheme(theme as any); }}
                  className={`font-bold py-1 px-2 rounded text-xs ${environmentTheme === theme ? 'bg-green-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1).replace('_', ' ')}
                </button>
              ))}
            </div>
            
            <div className="flex flex-col gap-2 mt-2 bg-black/20 p-2 rounded">
              <label className="flex items-center gap-2 text-white text-xs font-bold cursor-pointer">
                <input type="checkbox" checked={useEnvGround} onChange={(e) => setUseEnvGround(e.target.checked)} />
                Enable Ground Projection
              </label>
              
              {useEnvGround && (
                <>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-white">
                      <span>Radius</span>
                      <span>{envRadius}</span>
                    </div>
                    <input type="range" min="10" max="500" value={envRadius} onChange={(e) => setEnvRadius(Number(e.target.value))} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-white">
                      <span>Height</span>
                      <span>{envHeight}</span>
                    </div>
                    <input type="range" min="1" max="100" value={envHeight} onChange={(e) => setEnvHeight(Number(e.target.value))} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-white">
                      <span>Scale</span>
                      <span>{envScale}</span>
                    </div>
                    <input type="range" min="10" max="1000" value={envScale} onChange={(e) => setEnvScale(Number(e.target.value))} />
                  </div>
                </>
              )}
            </div>
          </div>

          <PhysicsEditor />

          {showUI && (
            <div className="flex flex-col gap-4 mt-2 border-t border-white/20 pt-4">
              <CharacterSizeEditor />
              <div className="flex flex-col gap-2">
                <h3 className="text-white font-bold">Animations</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => window.dispatchEvent(new CustomEvent('playAnim', { detail: 'swing' }))} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs">Play Swing</button>
                  <button onClick={() => window.dispatchEvent(new CustomEvent('playAnim', { detail: 'anim1' }))} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-xs">Anim 1</button>
                  <button onClick={() => window.dispatchEvent(new CustomEvent('playAnim', { detail: 'anim2' }))} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-2 rounded text-xs">Anim 2</button>
                  <button onClick={() => setCameraMode(prev => prev === 'orbit' ? 'game' : 'orbit')} className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-1 px-2 rounded text-xs">
                    {cameraMode === 'orbit' ? 'Game View' : 'Orbit View'}
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 mt-4">
                <h3 className="font-bold mb-2 text-white border-b border-white/20 pb-1">Camera Tuning</h3>
                <div className="text-white text-xs">
                  {Object.keys(camConfig).map(key => (
                    <div key={key} className="mb-2">
                      <label className="block mb-1">{key}: {camConfig[key as keyof typeof camConfig].toFixed(1)}</label>
                      <input 
                        type="range" 
                        min="-20" max="20" step="0.5" 
                        value={camConfig[key as keyof typeof camConfig]} 
                        onChange={(e) => setCamConfig(prev => ({...prev, [key]: parseFloat(e.target.value)}))} 
                        className="w-full"
                      />
                    </div>
                  ))}
                  <button 
                    className="mt-2 bg-blue-500 hover:bg-blue-600 w-full py-2 font-bold rounded"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(camConfig, null, 2));
                      alert('Copied to clipboard!');
                    }}
                  >
                    COPY JSON
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      
      {/* Toggle Button */}
      <button 
        onClick={() => setIsUICollapsed(!isUICollapsed)}
        className={`absolute top-4 transition-all duration-300 z-50 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white font-black text-lg w-10 h-10 rounded-full shadow-lg backdrop-blur-md border border-white/20 ${isUICollapsed ? 'right-4' : 'right-[376px]'}`}
      >
        {isUICollapsed ? '<' : '>'}
      </button>

      {gameMode === 'tennis' && serverTurn === 'player' && activeBallsCount === 0 && !isAutoPlay && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center pointer-events-none animate-pulse z-10">
          <h2 className="text-4xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">YOUR SERVE</h2>
          <p className="text-xl font-bold text-yellow-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mt-2">Press SPACE to Toss</p>
        </div>
      )}

      {gameMode === 'tennis' && serverTurn === 'bot' && activeBallsCount === 0 && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10">
          <h2 className="text-2xl font-bold text-red-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">BOT IS SERVING...</h2>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas 
        camera={{ position: [0, 6, 14], fov: 45 }} 
        shadows 
        dpr={[1, 2]} 
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        {/* Dynamic atmosphere fog */}
        <fog attach="fog" args={[envConfig[environmentTheme].fogColor, 30, 150]} />
        <CameraController mode={cameraMode} characterRef={characterRef} settings={cameraSettings} gameMode={gameMode} stumbleCamera={stumbleCamera} tennisCamera={tennisCamera} camConfig={camConfig} />
        
        {/* Dynamic ambient light */}
        <ambientLight intensity={0.5} color={envConfig[environmentTheme].ambientColor} />
        {/* Dynamic sunlight */}
        <directionalLight 
          position={[20, 30, -10]} 
          intensity={envConfig[environmentTheme].dirIntensity} 
          color={envConfig[environmentTheme].dirColor}
          castShadow 
          shadow-mapSize={[4096, 4096]}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
          shadow-bias={-0.0001}
        />
        
        <Suspense fallback={null}>
          <group>
            <TennisCharacter ref={characterRef} />
          </group>
          {gameMode === 'tennis' ? (
            <>
              <TennisBall />
              <TennisCourt />
              <Referee />
              <HitParticles />
            </>
          ) : gameMode === 'stumble' ? (
            <StumbleGuysLevel />
          ) : (
            <SidescrollerLevel characterRef={characterRef} />
          )}
          <DynamicEnvironment 
            themeConfig={envConfig[environmentTheme]}
            useEnvGround={useEnvGround}
            envRadius={envRadius}
            envHeight={envHeight}
            envScale={envScale}
          />
        </Suspense>
        
        {/* Ground Soft Shadows */}
        <ContactShadows 
          position={[0, -0.009, 0]} 
          opacity={0.4} 
          scale={40}
          resolution={1024}
          blur={2} 
          far={10} 
        />
        
        {cameraMode === 'orbit' && (
          <OrbitControls 
            enablePan={false} 
            minPolarAngle={Math.PI / 6} 
            maxPolarAngle={Math.PI / 2 + 0.1} 
            minDistance={3} 
            maxDistance={25} 
            target={[0, 0.5, 0]}
          />
        )}
      </Canvas>
      
      {(gameMode === 'stumble' || gameMode === 'sidescroller') && (
        <>
          <Joystick />
          <div 
            className="absolute bottom-8 right-8 w-24 h-24 bg-white/20 rounded-full border-2 border-white/40 touch-none shadow-lg backdrop-blur-sm flex items-center justify-center cursor-pointer select-none"
            style={{ zIndex: 1000 }}
            onPointerDown={(e) => { e.stopPropagation(); import('./components/Joystick').then(m => m.joystickState.jump = true); }}
            onPointerUp={(e) => { e.stopPropagation(); import('./components/Joystick').then(m => m.joystickState.jump = false); }}
            onPointerCancel={(e) => { e.stopPropagation(); import('./components/Joystick').then(m => m.joystickState.jump = false); }}
          >
            <div className="w-16 h-16 bg-white/80 rounded-full shadow-md flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4L12 20M12 4L6 10M12 4L18 10" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </>
      )}
      {gameMode === 'tennis' && <Joystick />}

    </div>
  );
}
