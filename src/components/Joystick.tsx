import React, { useState, useRef } from 'react';

export const joystickState = {
  jump: false,
  x: 0,
  y: 0
};

export function Joystick() {
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleMove = (clientX: number, clientY: number) => {
    if (!active || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    
    const maxDist = rect.width / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }
    
    setPos({ x: dx, y: dy });
    
    // Normalize for the game (-1 to 1)
    let nx = dx / maxDist;
    let ny = dy / maxDist;
    
    // Add a deadzone
    const distNorm = Math.sqrt(nx * nx + ny * ny);
    if (distNorm < 0.35) {
      nx = 0;
      ny = 0;
    }
    
    joystickState.x = nx;
    joystickState.y = ny;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    setActive(true); e.stopPropagation();
    containerRef.current?.setPointerCapture(e.pointerId);
    e.stopPropagation(); handleMove(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (active) {
      e.stopPropagation(); handleMove(e.clientX, e.clientY);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setActive(false); e.stopPropagation();
    containerRef.current?.releasePointerCapture(e.pointerId);
    setPos({ x: 0, y: 0 });
    joystickState.x = 0;
    joystickState.y = 0;
  };

  return (
    <div 
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="absolute bottom-8 left-8 w-32 h-32 bg-white/20 rounded-full border-2 border-white/40 touch-none shadow-lg backdrop-blur-sm flex items-center justify-center"
      style={{ zIndex: 1000 }}
    >
      {/* Deadzone visual indicator */}
      <div className="absolute w-[35%] h-[35%] rounded-full border border-white/30 bg-white/5 pointer-events-none" />
      
      <div 
        className="absolute top-1/2 left-1/2 w-12 h-12 bg-white/80 rounded-full shadow-md pointer-events-none transition-transform duration-75"
        style={{ transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }}
      />
    </div>
  );
}
