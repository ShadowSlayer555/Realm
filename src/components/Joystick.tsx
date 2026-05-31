import React, { useRef, useState, useEffect } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  onEnd: () => void;
}

export function Joystick({ onMove, onEnd }: JoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const maxRadius = 40;

  useEffect(() => {
    // Prevent scrolling when touching the joystick area
    const preventScroll = (e: TouchEvent) => e.preventDefault();
    const el = containerRef.current;
    if (el) {
      el.addEventListener('touchmove', preventScroll, { passive: false });
    }
    return () => {
      if (el) el.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerId.current = e.pointerId;
    updateKnob(e.clientX, e.clientY);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId) return;
    e.preventDefault();
    updateKnob(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    setKnobPos({ x: 0, y: 0 });
    onEnd();
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  const updateKnob = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    setKnobPos({ x: dx, y: dy });
    
    // Normalize to -1..1
    const nx = dx / maxRadius;
    const ny = dy / maxRadius;
    onMove(nx, ny);
  };

  return (
    <div 
      ref={containerRef}
      className="w-32 h-32 rounded-full border-4 border-slate-700 bg-slate-800/50 backdrop-blur pointer-events-auto flex items-center justify-center touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: 'none' }}
    >
      <div 
        className="w-12 h-12 rounded-full bg-slate-400 shadow-lg pointer-events-none"
        style={{ transform: `translate(${knobPos.x}px, ${knobPos.y}px)` }}
      />
    </div>
  );
}
