import { create } from 'zustand';
import * as THREE from 'three';

export interface Keyframe {
  id: string;
  time: number; // 0 to 1
  armRot: [number, number, number];
  torsoRot: [number, number, number];
  racketRot: [number, number, number];
}


export interface MousePartSizes {
  head: number;
  body: number;
  ears: number;
  arms: number;
  legs: number;
  tail: number;
  snout: number;
  armRotation: number;
  bodyHeight: number;
  tailRotation: number;
  tailTipSize: number;
  tailBaseSize: number;
  tailMaxSize: number;
  headY: number;
  armX: number;
  armY: number;
  legX: number;
  legY: number;
  torsoY: number;
}

export interface PartSizes {
  head: number;
  torso: number;
  arm: number;
  leg: number;
  racket: number;
  racketHead: number;
  racketLength: number;
  hat: number;
  hatY: number;
  hatHeight: number;
  torsoHeight: number;
  legHeight: number;
}

interface EditorState {

  partSizes: PartSizes;
  setPartSize: (part: keyof PartSizes, size: number) => void;
  mousePartSizes: MousePartSizes;
  setMousePartSize: (part: keyof MousePartSizes, size: number) => void;

  isEditMode: boolean;
  toggleEditMode: () => void;
  
  currentTime: number;
  setCurrentTime: (t: number) => void;
  
  currentArmRot: [number, number, number];
  setCurrentArmRot: (rot: [number, number, number]) => void;
  
  currentTorsoRot: [number, number, number];
  setCurrentTorsoRot: (rot: [number, number, number]) => void;

  currentRacketRot: [number, number, number];
  setCurrentRacketRot: (rot: [number, number, number]) => void;
  
  isPlayingPreview: boolean;
  setIsPlayingPreview: (b: boolean) => void;
  
  previewSpeed: number;
  setPreviewSpeed: (s: number) => void;
  
  keyframes: Keyframe[];
  addKeyframe: (kf: Keyframe) => void;
  removeKeyframe: (id: string) => void;
  updateKeyframe: (id: string, kf: Partial<Keyframe>) => void;
  setKeyframes: (kfs: Keyframe[]) => void;
  
    playerPoints: number;
  botPoints: number;
  playerGames: number;
  botGames: number;
  playerSets: number;
  botSets: number;
  isTieBreak: boolean;
  scorePoint: (winner: 'player' | 'bot') => void;
  serverTurn: 'player' | 'bot';
  setServerTurn: (turn: 'player' | 'bot') => void;
  activeBallsCount: number;
  setActiveBallsCount: (count: number) => void;
  isAutoPlay: boolean;
  setIsAutoPlay: (b: boolean) => void;
  gameMode: 'tennis' | 'stumble' | 'sidescroller';
  setGameMode: (mode: 'tennis' | 'stumble' | 'sidescroller') => void;
  isAutoHit: boolean;
  setIsAutoHit: (b: boolean) => void;
  showTrail: boolean;
  setShowTrail: (b: boolean) => void;

  cameraShake: number;
  courtTheme: 'grass' | 'hard' | 'clay';
  setCourtTheme: (theme: 'grass' | 'hard' | 'clay') => void;
  courtLength: number;
  setCourtLength: (length: number) => void;
  addCameraShake: (amount: number) => void;
  setCameraShake: (amount: number) => void;

  stumbleEntities: Record<string, { x: number, z: number, velocity: THREE.Vector3, mass: number }>;
  setStumbleEntity: (id: string, data: { x: number, z: number, velocity: THREE.Vector3, mass: number }) => void;
  
  isRecordingStumble: boolean;
  setIsRecordingStumble: (b: boolean) => void;
  stumbleRecordingData: { time: number; x: number; z: number; moveX: number; moveZ: number; jump: boolean }[];
  addStumbleRecordingFrame: (frame: { time: number; x: number; z: number; moveX: number; moveZ: number; jump: boolean }) => void;
  clearStumbleRecording: () => void;
  skinType: 'default' | 'mouse' | 'mumu';
  ballSpeedMultiplier: number;
  setBallSpeedMultiplier: (s: number) => void;
  ballBounciness: number;
  setBallBounciness: (b: number) => void;
  ballGravity: number;
  setBallGravity: (g: number) => void;
  hitPowerMultiplier: number;
  setHitPowerMultiplier: (h: number) => void;
  timeScale: number;
  setTimeScale: (s: number) => void;
  setSkinType: (skin: 'default' | 'mouse' | 'mumu') => void;
}

export const anim1KeyframesDefault = [
  {
    "id": "idle_start",
    "time": 0,
    "armRot": [0.2, 0, -0.3],
    "torsoRot": [0, 0, 0],
    "racketRot": [1.77, 0, 0]
  },
  {
    "id": "japgyd",
    "time": 0.3,
    "armRot": [ -3.14, -0.04, -0.35 ],
    "torsoRot": [ 0, 0, 0 ],
    "racketRot": [ 1.71, 1.4, 0 ]
  },
  {
    "id": "244agb",
    "time": 1,
    "armRot": [ -0.04, 0.83, -0.35 ],
    "torsoRot": [ 0, 0, 0 ],
    "racketRot": [ 2.23, -0.46, 0.06 ]
  }
];

export const anim2KeyframesDefault = [
  {
    "id": "idle_start",
    "time": 0,
    "armRot": [0.2, 0, -0.3],
    "torsoRot": [0, 0, 0],
    "racketRot": [1.77, 0, 0]
  },
  {
    "id": "66eal9",
    "time": 0.3,
    "armRot": [-3.67, -0.25, -0.3],
    "torsoRot": [-0.3, -0.35, 0],
    "racketRot": [1.5, -1.44, 0]
  },
  {
    "id": "2wuc6s",
    "time": 0.58,
    "armRot": [-1.92, 0.26, -0.3],
    "torsoRot": [0.26, -0.35, 0],
    "racketRot": [1.89, -0.15, -0.28]
  },
  {
    "id": "nrm78l",
    "time": 1,
    "armRot": [-0.12, 1.5, -0.3],
    "torsoRot": [0.01, 0.16, 0],
    "racketRot": [2.69, -0.12, 0.32]
  }
];

export const anim3KeyframesDefault = [
    {
      "id": "hpbu3t",
      "time": 0,
      "armRot": [
        -2.2,
        1.86,
        1.49
      ],
      "torsoRot": [
        -0.05,
        1.04,
        0
      ],
      "racketRot": [
        1.98,
        0.51,
        0
      ]
    },
    {
      "id": "wj9yq9",
      "time": 0.46,
      "armRot": [
        -2.82,
        2.11,
        1.24
      ],
      "torsoRot": [
        0,
        0,
        0
      ],
      "racketRot": [
        2.23,
        1.74,
        0
      ]
    },
    {
      "id": "zkc9ej",
      "time": 1,
      "armRot": [
        -3.93,
        2.97,
        1.24
      ],
      "torsoRot": [
        0,
        0,
        0
      ],
      "racketRot": [
        1.98,
        0.51,
        0
      ]
    }
];

export const useEditorStore = create<EditorState>((set) => ({
  partSizes: { head: 0.84, torso: 0.54, arm: 0.58, leg: 0.67, racket: 1.05, racketHead: 0.97, racketLength: 0.56, hat: 1.12, hatY: 0.22, hatHeight: 1.26, torsoHeight: 0.85, legHeight: 0.62 },
  setPartSize: (part, size) => set((state) => ({ partSizes: { ...state.partSizes, [part]: size } })),
  mousePartSizes: { head: 0.91, body: 0.67, ears: 1, arms: 0.99, legs: 0.97, tail: 0.9595, snout: 1, armRotation: 0.038407346410207, bodyHeight: 0.73, tailRotation: -1.30159265358979, tailTipSize: 0.29, tailBaseSize: 0.164, tailMaxSize: 0.285, headY: 0.3, armX: 0.22, armY: 0.05, legX: 0.13, legY: 0.25, torsoY: 0.45 },
  setMousePartSize: (part, size) => set((state) => ({ mousePartSizes: { ...state.mousePartSizes, [part]: size } })),
  isEditMode: false,
  toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),
  
  currentTime: 0,
  setCurrentTime: (t) => set({ currentTime: t }),
  
  currentArmRot: [0.2, 0, -0.3],
  setCurrentArmRot: (rot) => set({ currentArmRot: rot }),
  
  currentTorsoRot: [0, 0, 0],
  setCurrentTorsoRot: (rot) => set({ currentTorsoRot: rot }),
  
  currentRacketRot: [Math.PI / 2 + 0.2, 0, 0],
  setCurrentRacketRot: (rot) => set({ currentRacketRot: rot }),

  isPlayingPreview: false,
  setIsPlayingPreview: (b) => set({ isPlayingPreview: b }),

  previewSpeed: 0.8,
  setPreviewSpeed: (s) => set({ previewSpeed: s }),

  keyframes: [],
  addKeyframe: (kf) => set((state) => ({ keyframes: [...state.keyframes, kf].sort((a, b) => a.time - b.time) })),
  removeKeyframe: (id) => set((state) => ({ keyframes: state.keyframes.filter((k) => k.id !== id) })),
  updateKeyframe: (id, kf) => set((state) => ({
    keyframes: state.keyframes.map((k) => (k.id === id ? { ...k, ...kf } : k)).sort((a, b) => a.time - b.time),
  })),
  setKeyframes: (kfs) => set({ keyframes: kfs }),
  
    playerPoints: 0,
  botPoints: 0,
  playerGames: 0,
  botGames: 0,
  playerSets: 0,
  botSets: 0,
  isTieBreak: false,
  scorePoint: (winner) => set((state) => {
      let pPoints = state.playerPoints;
      let bPoints = state.botPoints;
      let pGames = state.playerGames;
      let bGames = state.botGames;
      let pSets = state.playerSets;
      let bSets = state.botSets;
      let tieBreak = state.isTieBreak;
      let nextTurn = state.serverTurn;
      let announcement = "";

      if (tieBreak) {
          if (winner === 'player') pPoints++;
          else bPoints++;
          
          const totalPoints = pPoints + bPoints;
          if (totalPoints % 2 === 1) {
             nextTurn = state.serverTurn === 'player' ? 'bot' : 'player';
          }

          announcement = `${pPoints} - ${bPoints}`;

          if ((pPoints >= 7 && pPoints - bPoints >= 2) || (bPoints >= 7 && bPoints - pPoints >= 2)) {
             const setWinner = pPoints > bPoints ? 'Player' : 'Bot';
             if (pPoints > bPoints) pSets++; else bSets++;
             announcement = `Game and Set, ${setWinner}`;
             pGames = 0; bGames = 0;
             pPoints = 0; bPoints = 0;
             tieBreak = false;
             nextTurn = winner === 'player' ? 'bot' : 'player';
          }
      } else {
          if (winner === 'player') pPoints++;
          else bPoints++;

          let gameWonBy = null;

          if (pPoints >= 4 && pPoints - bPoints >= 2) {
              pGames++; pPoints = 0; bPoints = 0;
              gameWonBy = 'Player';
          } else if (bPoints >= 4 && bPoints - pPoints >= 2) {
              bGames++; pPoints = 0; bPoints = 0;
              gameWonBy = 'Bot';
          }

          if (gameWonBy) {
              announcement = `Game, ${gameWonBy}`;
          } else {
              if (pPoints === 3 && bPoints === 3) {
                  announcement = "Deuce";
              } else if (pPoints >= 3 && bPoints >= 3) {
                  if (pPoints > bPoints) announcement = "Advantage Player";
                  else if (bPoints > pPoints) announcement = "Advantage Bot";
                  else announcement = "Deuce";
              } else {
                  const scores = ["Love", "15", "30", "40"];
                  const pStr = scores[pPoints];
                  const bStr = scores[bPoints];
                  if (pPoints === bPoints) {
                      announcement = `${pStr} All`;
                  } else {
                      if (state.serverTurn === 'player') {
                          announcement = `${pStr}, ${bStr}`;
                      } else {
                          announcement = `${bStr}, ${pStr}`;
                      }
                  }
              }
          }

          if (pPoints === 0 && bPoints === 0) {
              if (pGames >= 6 && pGames - bGames >= 2) {
                  pSets++; pGames = 0; bGames = 0;
                  announcement += ". Set, Player!";
              } else if (bGames >= 6 && bGames - pGames >= 2) {
                  bSets++; pGames = 0; bGames = 0;
                  announcement += ". Set, Bot!";
              } else if (pGames === 6 && bGames === 6) {
                  tieBreak = true;
                  announcement += ". Tie break!";
              }
              nextTurn = state.serverTurn === 'player' ? 'bot' : 'player';
          }
      }

      if (announcement && state.gameMode === 'tennis') {
          setTimeout(() => {
              import('./utils/audio').then(m => m.audioManager.announce(announcement));
          }, 1500);
      }

      return {
          playerPoints: pPoints,
          botPoints: bPoints,
          playerGames: pGames,
          botGames: bGames,
          playerSets: pSets,
          botSets: bSets,
          isTieBreak: tieBreak,
          serverTurn: nextTurn,
      };
  }),
  serverTurn: 'player',
  setServerTurn: (turn) => set({ serverTurn: turn }),
  activeBallsCount: 0,
  setActiveBallsCount: (count) => set({ activeBallsCount: count }),
  isAutoPlay: false,
  setIsAutoPlay: (b) => set({ isAutoPlay: b }),
  gameMode: 'sidescroller',
  setGameMode: (mode) => set({ gameMode: mode }),
  isAutoHit: false,
  setIsAutoHit: (b) => set({ isAutoHit: b }),
  showTrail: true,
  setShowTrail: (b) => set({ showTrail: b }),
  
  cameraShake: 0,
  courtTheme: 'grass',
  setCourtTheme: (theme) => set({ courtTheme: theme }),
  courtLength: 12.0,
  setCourtLength: (length) => set({ courtLength: length }),
  addCameraShake: (amount) => set((state) => ({ cameraShake: Math.min(state.cameraShake + amount, 2.0) })),
  setCameraShake: (amount) => set({ cameraShake: amount }),

  stumbleEntities: {},
  setStumbleEntity: (id, data) => set((state) => ({
    stumbleEntities: { ...state.stumbleEntities, [id]: data }
  })),
  
  isRecordingStumble: false,
  setIsRecordingStumble: (b) => set({ isRecordingStumble: b }),
  stumbleRecordingData: [],
  addStumbleRecordingFrame: (frame) => set((state) => ({ stumbleRecordingData: [...state.stumbleRecordingData, frame] })),
  clearStumbleRecording: () => set({ stumbleRecordingData: [] }),
  skinType: 'mumu',
  setSkinType: (skin) => set({ skinType: skin }),
  ballSpeedMultiplier: 1.5,
  setBallSpeedMultiplier: (s) => set({ ballSpeedMultiplier: s }),
  ballBounciness: 0.60,
  setBallBounciness: (b) => set({ ballBounciness: b }),
  ballGravity: 57.0,
  setBallGravity: (g) => set({ ballGravity: g }),
  hitPowerMultiplier: 1.20,
  setHitPowerMultiplier: (h) => set({ hitPowerMultiplier: h }),
  timeScale: 1.0,
  setTimeScale: (s) => set({ timeScale: s }),
}));

export const GameState = { };
