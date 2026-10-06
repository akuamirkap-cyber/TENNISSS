import React from 'react';
import { useEditorStore } from '../store';

export function PhysicsEditor() {
  const { 
    ballSpeedMultiplier, setBallSpeedMultiplier,
    ballBounciness, setBallBounciness,
    ballGravity, setBallGravity,
    hitPowerMultiplier, setHitPowerMultiplier
  } = useEditorStore();

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-white font-bold border-b border-white/20 pb-1 mt-2">Ball Physics & Hit Power</h3>
      
      <div className="px-2">
        <label className="text-white text-xs font-bold block mb-1">
          Flight Speed ({ballSpeedMultiplier.toFixed(2)}x)
        </label>
        <input 
          type="range" min="0.1" max="5.0" step="0.1" 
          value={ballSpeedMultiplier} 
          onChange={(e) => setBallSpeedMultiplier(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      <div className="px-2">
        <label className="text-white text-xs font-bold block mb-1">
          Hit Power ({hitPowerMultiplier.toFixed(2)}x)
        </label>
        <input 
          type="range" min="0.1" max="5.0" step="0.1" 
          value={hitPowerMultiplier} 
          onChange={(e) => setHitPowerMultiplier(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      <div className="px-2">
        <label className="text-white text-xs font-bold block mb-1">
          Bounciness (Elasticity) ({ballBounciness.toFixed(2)})
        </label>
        <input 
          type="range" min="0.1" max="2.0" step="0.05" 
          value={ballBounciness} 
          onChange={(e) => setBallBounciness(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      <div className="px-2">
        <label className="text-white text-xs font-bold block mb-1">
          Gravity ({ballGravity.toFixed(1)})
        </label>
        <input 
          type="range" min="1" max="100" step="1" 
          value={ballGravity} 
          onChange={(e) => setBallGravity(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>
    </div>
  );
}
