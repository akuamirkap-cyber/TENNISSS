import React from 'react';
import { useEditorStore, Keyframe, anim1KeyframesDefault, anim2KeyframesDefault } from '../store';

export function AnimationEditor() {
  const { 
    isEditMode, toggleEditMode, 
    currentTime, setCurrentTime,
    currentArmRot, setCurrentArmRot,
    currentTorsoRot, setCurrentTorsoRot,
    currentRacketRot, setCurrentRacketRot,
    isPlayingPreview, setIsPlayingPreview,
    previewSpeed, setPreviewSpeed,
    keyframes, addKeyframe, removeKeyframe, setKeyframes
  } = useEditorStore();

  React.useEffect(() => {
    let animationFrameId: number;
    let lastTime: number;

    const loop = (time: number) => {
      if (!lastTime) lastTime = time;
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const store = useEditorStore.getState();
      if (store.isPlayingPreview) {
        let newTime = store.currentTime + dt * store.previewSpeed;
        if (newTime >= 1) newTime = 0;
        store.setCurrentTime(newTime);
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  if (!isEditMode) {
    return (
      <button 
        onClick={toggleEditMode}
        className="absolute bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-md shadow-lg z-50 text-sm font-mono"
      >
        Enter Anim Editor
      </button>
    );
  }

  const handleSaveKeyframe = () => {
    addKeyframe({
      id: Math.random().toString(36).substring(7),
      time: currentTime,
      armRot: currentArmRot,
      torsoRot: currentTorsoRot,
      racketRot: currentRacketRot
    });
  };

  const exportJSON = async () => {
    const data = {
      speed: previewSpeed,
      keyframes
    };
    const json = JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      alert('Keyframes & speed copied to clipboard!');
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = json;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Keyframes & speed copied to clipboard! (fallback)');
      } catch (e) {
        alert('Failed to copy. Please check the browser console.');
        console.log("Copied JSON Data:", json);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="absolute right-4 top-4 w-80 max-h-[50vh] bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl p-4 overflow-y-auto z-50 font-mono text-sm flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg">Anim Editor</h2>
          <button onClick={toggleEditMode} className="text-red-500 hover:text-red-700">Close</button>
        </div>
        <div className="flex gap-2 text-xs">
          <button onClick={() => setKeyframes(anim1KeyframesDefault as Keyframe[])} className="bg-gray-200 px-2 py-1 rounded flex-1">Load Anim 1</button>
          <button onClick={() => setKeyframes(anim2KeyframesDefault as Keyframe[])} className="bg-gray-200 px-2 py-1 rounded flex-1">Load Anim 2</button>
          <button onClick={() => setKeyframes([])} className="bg-red-200 px-2 py-1 rounded flex-1">Clear</button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <label className="font-bold">Timeline Preview: {currentTime.toFixed(2)}</label>
          <button 
            onClick={() => setIsPlayingPreview(!isPlayingPreview)} 
            className={`px-3 py-1 rounded text-white text-xs ${isPlayingPreview ? 'bg-red-500' : 'bg-green-500'}`}
          >
            {isPlayingPreview ? 'Stop' : 'Play'}
          </button>
        </div>
        <input 
          type="range" min="0" max="1" step="0.01" 
          value={currentTime} 
          onChange={(e) => setCurrentTime(parseFloat(e.target.value))} 
        />
        <div className="flex justify-between items-center mt-2">
          <label className="text-xs">Speed: {previewSpeed.toFixed(1)}x</label>
          <input 
            type="range" min="0.1" max="5" step="0.1" className="w-24"
            value={previewSpeed}
            onChange={(e) => setPreviewSpeed(parseFloat(e.target.value))}
          />
        </div>
        <button onClick={handleSaveKeyframe} className="bg-blue-600 text-white py-1 rounded hover:bg-blue-700 mt-2">
          Save Keyframe @ {currentTime.toFixed(2)}
        </button>
      </div>

      <div className="flex flex-col gap-2 bg-gray-100 p-2 rounded">
        <label className="font-bold border-b border-gray-300 pb-1">Right Arm Rot</label>
        {['X', 'Y', 'Z'].map((axis, i) => (
          <div key={axis} className="flex gap-2 items-center">
            <span className="w-4">{axis}</span>
            <input 
              type="range" min="-9" max="9" step="0.01" className="flex-1"
              value={currentArmRot[i]}
              onChange={(e) => {
                const newRot = [...currentArmRot] as [number, number, number];
                newRot[i] = parseFloat(e.target.value);
                setCurrentArmRot(newRot);
              }}
            />
            <span className="w-10 text-right">{currentArmRot[i].toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 bg-gray-100 p-2 rounded">
        <label className="font-bold border-b border-gray-300 pb-1">Torso Rot</label>
        {['X', 'Y', 'Z'].map((axis, i) => (
          <div key={axis} className="flex gap-2 items-center">
            <span className="w-4">{axis}</span>
            <input 
              type="range" min="-9" max="9" step="0.01" className="flex-1"
              value={currentTorsoRot[i]}
              onChange={(e) => {
                const newRot = [...currentTorsoRot] as [number, number, number];
                newRot[i] = parseFloat(e.target.value);
                setCurrentTorsoRot(newRot);
              }}
            />
            <span className="w-10 text-right">{currentTorsoRot[i].toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 bg-gray-100 p-2 rounded">
        <label className="font-bold border-b border-gray-300 pb-1">Racket Rot</label>
        {['X', 'Y', 'Z'].map((axis, i) => (
          <div key={axis} className="flex gap-2 items-center">
            <span className="w-4">{axis}</span>
            <input 
              type="range" min="-9" max="9" step="0.01" className="flex-1"
              value={currentRacketRot[i]}
              onChange={(e) => {
                const newRot = [...currentRacketRot] as [number, number, number];
                newRot[i] = parseFloat(e.target.value);
                setCurrentRacketRot(newRot);
              }}
            />
            <span className="w-10 text-right">{currentRacketRot[i].toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <label className="font-bold">Keyframes ({keyframes.length})</label>
          <button onClick={exportJSON} className="text-xs bg-gray-800 text-white px-2 py-1 rounded">Copy JSON</button>
        </div>
        
        {keyframes.map(kf => (
          <div 
            key={kf.id} 
            className="bg-gray-50 border p-2 rounded text-xs flex justify-between items-center cursor-pointer hover:bg-gray-200"
            onClick={() => {
              setCurrentTime(kf.time);
              setCurrentArmRot([...kf.armRot]);
              setCurrentTorsoRot([...kf.torsoRot]);
              setCurrentRacketRot([...kf.racketRot]);
            }}
          >
            <div>
              <div className="font-bold">t: {kf.time.toFixed(2)}</div>
              <div className="text-gray-500">
                Arm: [{kf.armRot.map(n => n.toFixed(1)).join(', ')}]<br/>
                Torso: [{kf.torsoRot.map(n => n.toFixed(1)).join(', ')}]
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                removeKeyframe(kf.id);
              }} 
              className="text-red-500 text-lg px-2 hover:bg-red-100 rounded"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      
      <div className="flex-1"></div>
      
      <p className="text-xs text-gray-500">
        Instruction: Slide time, adjust rotation, save keyframes. Then copy JSON and paste it to the AI.
      </p>
    </div>
  );
}
