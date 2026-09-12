import React from 'react';
import { Joystick } from 'react-joystick-component';

interface JoystickOverlayProps {
  onMove: (data: { x: number; y: number }) => void;
  onStop: () => void;
}

export const JoystickOverlay: React.FC<JoystickOverlayProps> = ({ onMove, onStop }) => {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] drop-shadow-xl select-none">
      <Joystick 
        size={100} 
        baseColor="rgba(255, 255, 255, 0.7)" 
        stickColor="rgba(59, 130, 246, 0.9)" 
        move={(e) => onMove({ x: e.x || 0, y: e.y || 0 })} 
        stop={onStop} 
      />
    </div>
  );
};
