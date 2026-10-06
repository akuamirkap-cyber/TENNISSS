import React from 'react';
import { useEditorStore } from '../store';

export function CharacterSizeEditor() {
  const { partSizes, setPartSize, mousePartSizes, setMousePartSize, skinType } = useEditorStore();

  const handleCopy = () => {
    const dataToCopy = (skinType === 'mouse' || skinType === 'mumu') ? mousePartSizes : partSizes;
    navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
    alert(`${skinType === 'mouse' ? 'Mouse' : (skinType === 'mumu' ? 'Mumu' : 'Character')} sizes copied to clipboard!`);
  };

  const parts = (skinType === 'mouse' || skinType === 'mumu') 
    ? Object.keys(mousePartSizes) as Array<keyof typeof mousePartSizes>
    : Object.keys(partSizes) as Array<keyof typeof partSizes>;

  return (
    <div className="bg-slate-800/80 p-4 rounded-lg shadow-xl w-full pointer-events-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-green-300">
          {skinType === 'mouse' ? 'Mouse Sizes' : (skinType === 'mumu' ? 'Mumu Sizes' : 'Character Sizes')}
        </h3>
        <button 
          onClick={handleCopy}
          className="bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-xs text-white"
        >
          📋 Copy
        </button>
      </div>

      <div className="space-y-4">
        {skinType === 'default' && (parts as Array<keyof typeof partSizes>).map(part => (
          <div key={part}>
            <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono uppercase">
              <span>{part}</span>
              <span>{partSizes[part].toFixed(2)}</span>
            </div>
            <input 
              type="range" 
              min={part === 'hatY' ? "-1" : "0.1"} 
              max={part === 'hatY' ? "1" : "3"} 
              step="0.01" 
              value={partSizes[part]}
              onChange={(e) => setPartSize(part, parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-400"
            />
          </div>
        ))}
        { (skinType === 'mouse' || skinType === 'mumu') && (parts as Array<keyof typeof mousePartSizes>).map(part => {
          let min = 0.1;
          let max = 3;
          let step = 0.01;
          
          if (part.includes('Rotation')) {
            min = -Math.PI;
            max = Math.PI;
          } else if (part.startsWith('tail') && part.includes('Size')) {
            min = 0.001;
            max = 0.8;
            step = 0.001;
          } else if (part.endsWith('X') || part.endsWith('Y')) {
            min = -2;
            max = 2;
          }

          return (
          <div key={part}>
            <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono uppercase">
              <span>{part}</span>
              <span>{mousePartSizes[part].toFixed(3)}</span>
            </div>
            <input 
              type="range" 
              min={min} 
              max={max} 
              step={step} 
              value={mousePartSizes[part]}
              onChange={(e) => setMousePartSize(part, parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-400"
            />
          </div>
          );
        })}
        
        { (skinType === 'mouse' || skinType === 'mumu') && ['racket', 'racketHead', 'racketLength'].map(part => (
          <div key={part}>
            <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono uppercase text-blue-300">
              <span>{part}</span>
              <span>{partSizes[part as keyof typeof partSizes].toFixed(2)}</span>
            </div>
            <input 
              type="range" 
              min="0.1" 
              max="3" 
              step="0.01" 
              value={partSizes[part as keyof typeof partSizes]}
              onChange={(e) => setPartSize(part as keyof typeof partSizes, parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
