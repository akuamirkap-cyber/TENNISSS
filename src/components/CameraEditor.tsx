import React, { useState } from 'react';

interface CameraSettings {
  posX: number;
  posY: number;
  posZ: number;
  lookX: number;
  lookY: number;
  lookZ: number;
}

interface CameraEditorProps {
  settings: CameraSettings;
  onChange: (settings: CameraSettings) => void;
}

export function CameraEditor({ settings, onChange }: CameraEditorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const copyToClipboard = () => {
    const text = JSON.stringify(settings, null, 2);
    navigator.clipboard.writeText(text);
    alert('Camera data copied to clipboard!');
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute bottom-4 right-4 z-20 bg-slate-800 text-white px-4 py-2 rounded shadow-lg opacity-50 hover:opacity-100 transition-opacity"
      >
        📷 Edit Camera
      </button>
    );
  }

  const handleChange = (key: keyof CameraSettings, value: number) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="absolute bottom-4 right-4 z-20 bg-slate-800/90 backdrop-blur text-white p-4 rounded-lg shadow-xl w-80 text-sm font-mono border border-slate-600">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-sky-300">Camera Setup</h3>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-slate-300 mb-2 border-b border-slate-600 pb-1">Position</h4>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="w-4 text-red-400">X</span>
            <input type="range" min="-30" max="30" step="0.5" value={settings.posX} onChange={(e) => handleChange('posX', parseFloat(e.target.value))} className="flex-1" />
            <span className="w-10 text-right">{settings.posX.toFixed(1)}</span>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="w-4 text-green-400">Y</span>
            <input type="range" min="0" max="30" step="0.5" value={settings.posY} onChange={(e) => handleChange('posY', parseFloat(e.target.value))} className="flex-1" />
            <span className="w-10 text-right">{settings.posY.toFixed(1)}</span>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="w-4 text-blue-400">Z</span>
            <input type="range" min="-30" max="30" step="0.5" value={settings.posZ} onChange={(e) => handleChange('posZ', parseFloat(e.target.value))} className="flex-1" />
            <span className="w-10 text-right">{settings.posZ.toFixed(1)}</span>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-slate-300 mb-2 border-b border-slate-600 pb-1">Look At Target</h4>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="w-4 text-red-400">X</span>
            <input type="range" min="-30" max="30" step="0.5" value={settings.lookX} onChange={(e) => handleChange('lookX', parseFloat(e.target.value))} className="flex-1" />
            <span className="w-10 text-right">{settings.lookX.toFixed(1)}</span>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="w-4 text-green-400">Y</span>
            <input type="range" min="-10" max="30" step="0.5" value={settings.lookY} onChange={(e) => handleChange('lookY', parseFloat(e.target.value))} className="flex-1" />
            <span className="w-10 text-right">{settings.lookY.toFixed(1)}</span>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="w-4 text-blue-400">Z</span>
            <input type="range" min="-30" max="30" step="0.5" value={settings.lookZ} onChange={(e) => handleChange('lookZ', parseFloat(e.target.value))} className="flex-1" />
            <span className="w-10 text-right">{settings.lookZ.toFixed(1)}</span>
          </div>
        </div>

        <button 
          onClick={copyToClipboard}
          className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded mt-2 transition-colors"
        >
          📋 Copy Camera Data
        </button>
      </div>
    </div>
  );
}
