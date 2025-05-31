import React from 'react';

interface BallProps {
  position: { x: number; y: number };
}

const Ball: React.FC<BallProps> = ({ position }) => (
  <div 
    className="absolute bg-white rounded-full"
    style={{
      width: '30px',
      height: '30px',
      left: `${position.x - 15}px`,
      top: `${position.y - 15}px`,
      transition: 'left 0.05s linear, top 0.05s linear'
    }}
  />
);

export default Ball;