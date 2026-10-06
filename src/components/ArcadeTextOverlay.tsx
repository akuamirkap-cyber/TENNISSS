import React, { useEffect, useState } from 'react';

export function ArcadeTextOverlay() {
  const [text, setText] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const handleShowFault = (e: any) => {
      setText(e.detail);
      setKey(prev => prev + 1);
      if ((window as any).audioManager) {
          (window as any).audioManager.announce(e.detail);
      } else {
          import('../utils/audio').then(m => m.audioManager.announce(e.detail));
      }
    };
    window.addEventListener('showFault', handleShowFault);
    return () => window.removeEventListener('showFault', handleShowFault);
  }, []);

  if (!text) return null;

  let colorClass = "text-white";
  if (text.includes("OUT") || text.includes("FAULT")) colorClass = "text-red-500";
  if (text.includes("ACE") || text.includes("SWEET")) colorClass = "text-yellow-400";
  if (text.includes("POINT") || text.includes("DEUCE")) colorClass = "text-green-400";

  return (
    <div key={key} className="absolute top-16 left-0 w-full flex items-start justify-center pointer-events-none z-[100]">
      <div className="animate-arcade-text text-center">
        <h1 className={`text-5xl md:text-7xl font-black italic tracking-widest drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] ${colorClass}`}
            style={{ 
              WebkitTextStroke: '2px rgba(255, 255, 255, 0.4)', 
              textShadow: '3px 3px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000' 
            }}>
          {text}
        </h1>
      </div>
    </div>
  );
}
