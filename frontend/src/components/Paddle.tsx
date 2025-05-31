import React from 'react';

interface PaddleProps {
  position: { x: number; y: number };
  isPlayer?: boolean;
}

const Paddle: React.FC<PaddleProps> = ({ position, isPlayer = false }) => (
  <div 
    className={`absolute ${isPlayer ? 'bg-blue-500' : 'bg-red-500'}`}
    style={{
      width: '15px',
      height: '80px',
      left: `${position.x}px`,
      top: `${position.y}px`,
      transition: 'top 0.1s ease-out'
    }}
  />
);

export default Paddle;