import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { GameState, PlayerMovement } from '../../../backend/src/types/gameTypes';

const SERVER_URL = 'http://localhost:4000';

export const useGameSocket = () => {
  const [socket, setSocket] = useState<typeof Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on('game-init', (data: { roomId: string; playerId: string }) => {
      setRoomId(data.roomId);
      setPlayerId(data.playerId);
    });

    newSocket.on('game-update', (state: GameState) => {
      setGameState(state);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const movePlayer = (direction: PlayerMovement['direction']) => {
    if (socket) {
      socket.emit('player-move', { direction });
    }
  };

  return { socket, gameState, playerId, roomId, movePlayer };
};