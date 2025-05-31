export interface PlayerPosition {
  x: number;
  y: number;
}

export interface GameState {
  ball: {
    position: PlayerPosition;
    velocity: PlayerPosition;
  };
  players: {
    [playerId: string]: {
      position: PlayerPosition;
      score: number;
    };
  };
}

export interface PlayerMovement {
  direction: 'up' | 'down';
}