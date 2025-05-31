import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const SERVER_URL = 'http://localhost:4000';

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 80;
const BALL_SIZE = 15;

type Player = {
  id: string;
  paddleY: number;
  score: number;
  isPlayer1?: boolean;
};

type Ball = {
  x: number;
  y: number;
};

type GameOverData = {
  winnerId: string;
  winnerName: string;
  scores: {
    playerId: string;
    score: number;
    isPlayer1: boolean;
  }[];
};

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [socket, setSocket] = useState<any>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [isPlayer1, setIsPlayer1] = useState<boolean>(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [ball, setBall] = useState<Ball>({ x: 0, y: 0 });
  const [status, setStatus] = useState('Connecting to server...');
  const [gameOver, setGameOver] = useState<GameOverData | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);


  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setStatus('Connected! Waiting for opponent...');
    });

    newSocket.on('game-init', (data: {
      roomId: string;
      playerId: string;
      isPlayer1: boolean;
    }) => {
      setRoomId(data.roomId);
      setPlayerId(data.playerId);
      setIsPlayer1(data.isPlayer1);
      setStatus(`Room ${data.roomId} - ${data.isPlayer1 ? 'Player 1' : 'Player 2'}`);
    });

    newSocket.on('game-update', (data: {
      ball: Ball;
      players: Player[];
    }) => {
      setBall(data.ball);
      setPlayers(data.players);
    });

    newSocket.on('game-restart', (data: {
      ball: Ball;
      players: Player[];
    }) => {
      setBall(data.ball);
      setPlayers(data.players);
      setGameOver(null);
      setIsRestarting(false);
      setStatus('Game restarted!');
    });

    newSocket.on('paddle-moved', (data: {
      playerId: string;
      paddleY: number;
    }) => {
      setPlayers(prev => prev.map(p => 
        p.id === data.playerId ? { ...p, paddleY: data.paddleY } : p
      ));
    });
    
    // Handle game over event
    newSocket.on('game-over', (data: GameOverData) => {
      setGameOver(data);
      setStatus(`Game Over! Winner: ${data.winnerName}`);
    });

    newSocket.on('disconnect', () => {
      setStatus('Server disconnected. Refresh to reconnect.');
    });

    newSocket.on('connect_error', (err: any) => {
      console.error('Connection error:', err);
      setStatus('Connection failed. Is the server running?');
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

    // Restart game handler
  const handleRestart = () => {
    if (socket && !isRestarting) {
      setIsRestarting(true);
      setStatus('Restarting game...');
      socket.emit('restart-game');
    }
  };

  // Handle keyboard input (disable when game is over)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!socket || gameOver) return;
      
      if ((isPlayer1 && (e.key === 'w' || e.key === 's')) || 
          (!isPlayer1 && (e.key === 'ArrowUp' || e.key === 'ArrowDown'))) {
        const direction = e.key === 'w' || e.key === 'ArrowUp' ? 'up' : 'down';
        socket.emit('move-paddle', direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [socket, isPlayer1, gameOver]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw background
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw center line
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash
    
    // Draw paddles
    players.forEach(player => {
      const isCurrentPlayer = player.id === playerId;
      let x;
      
      if (isPlayer1) {
        // If I'm player 1
        x = isCurrentPlayer ? 20 : CANVAS_WIDTH - 20 - PADDLE_WIDTH;
      } else {
        // If I'm player 2
        x = isCurrentPlayer ? CANVAS_WIDTH - 20 - PADDLE_WIDTH : 20;
      }
      
      ctx.fillStyle = isCurrentPlayer ? '#3B82F6' : '#EF4444';
      ctx.fillRect(x, player.paddleY, PADDLE_WIDTH, PADDLE_HEIGHT);
      
      // Draw paddle border
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, player.paddleY, PADDLE_WIDTH, PADDLE_HEIGHT);
    });
    
    // Draw ball (if game is still active)
    if (!gameOver) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw scores
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#E5E7EB';
    ctx.textAlign = 'center';
    
    // Find players by role
    const player1 = players.find(p => p.isPlayer1);
    const player2 = players.find(p => !p.isPlayer1);
    
    ctx.fillText(player1?.score.toString() || '0', CANVAS_WIDTH / 4, 50);
    ctx.fillText(player2?.score.toString() || '0', CANVAS_WIDTH * 3 / 4, 50);
    
    // Draw player indicator
    ctx.font = '16px Arial';
    ctx.fillText(isPlayer1 ? 'YOU (P1)' : 'OPPONENT (P1)', CANVAS_WIDTH / 4, 80);
    ctx.fillText(isPlayer1 ? 'OPPONENT (P2)' : 'YOU (P2)', CANVAS_WIDTH * 3 / 4, 80);
    
    // Draw game over screen
    if (gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.font = 'bold 60px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      
      // Draw winner text
      const winnerText = playerId === gameOver.winnerId 
        ? 'YOU WIN!' 
        : `${gameOver.winnerName} WINS!`;
      
      ctx.fillText(winnerText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
      
      // Draw scores
      ctx.font = '32px Arial';
      gameOver.scores.forEach((player, index) => {
        const playerName = player.isPlayer1 ? 'Player 1' : 'Player 2';
        const isYou = player.playerId === playerId;
        ctx.fillText(
          `${playerName}${isYou ? ' (YOU)' : ''}: ${player.score}`, 
          CANVAS_WIDTH / 2, 
          CANVAS_HEIGHT / 2 + 30 + index * 40
        );
      });
      
      // Draw restart instruction
      ctx.font = '24px Arial';
      ctx.fillText('Refresh page to play again', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50);
    }
  }, [ball, players, playerId, isPlayer1, gameOver]);


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <h1 className="text-3xl font-bold text-white mb-2">Multiplayer Ping Pong</h1>
      
      <div className="mb-4 text-center">
        <div className="text-lg text-blue-400 mb-1">{status}</div>
        <div className="text-sm text-gray-400">Room: {roomId || 'N/A'}</div>
      </div>
      
      <div className="relative mb-6">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-2 border-gray-700 rounded-lg shadow-lg"
        />
      </div>
      
      {!gameOver && (
        <div className="bg-gray-800 p-4 rounded-lg max-w-md w-full">
          <h2 className="text-xl font-semibold text-white mb-3">Controls</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700 p-3 rounded-lg">
              <h3 className="text-blue-400 font-medium mb-1">Player 1 (Left)</h3>
              <div className="flex items-center justify-center space-x-2">
                <kbd className="px-2 py-1 bg-gray-600 rounded text-sm">W</kbd>
                <span className="text-gray-300">Up</span>
                <kbd className="px-2 py-1 bg-gray-600 rounded text-sm">S</kbd>
                <span className="text-gray-300">Down</span>
              </div>
            </div>
            
            <div className="bg-gray-700 p-3 rounded-lg">
              <h3 className="text-red-400 font-medium mb-1">Player 2 (Right)</h3>
              <div className="flex items-center justify-center space-x-2">
                <kbd className="px-2 py-1 bg-gray-600 rounded text-sm">↑</kbd>
                <span className="text-gray-300">Up</span>
                <kbd className="px-2 py-1 bg-gray-600 rounded text-sm">↓</kbd>
                <span className="text-gray-300">Down</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center text-sm text-gray-400">
            <p>First to 10 points wins!</p>
            {players.length === 2 && (
              <p className="mt-2 text-green-400">Game is active!</p>
            )}
          </div>
        </div>
      )}
      
      {gameOver && (
        <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-green-500 mb-4">GAME OVER</h2>
          
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-white">
              {playerId === gameOver.winnerId ? (
                <span className="text-green-400">You Win! 🏆</span>
              ) : (
                <span className="text-red-400">{gameOver.winnerName} Wins!</span>
              )}
            </h3>
            
            <div className="mt-4 space-y-2">
              {gameOver.scores.map((player, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg ${player.playerId === gameOver.winnerId 
                    ? 'bg-green-900/50' 
                    : 'bg-gray-700'}`}
                >
                  <p className="text-lg">
                    {player.isPlayer1 ? 'Player 1' : 'Player 2'}
                    {player.playerId === playerId && ' (YOU)'}: 
                    <span className="font-bold ml-2">{player.score}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleRestart}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition w-full"
          >
            Play Again
          </button>
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-500">
        <p>Player ID: {playerId || 'Connecting...'}</p>
        <p>Your Role: {isPlayer1 ? 'Player 1 (Left)' : 'Player 2 (Right)'}</p>
      </div>
    </div>
  );
};

export default Game;