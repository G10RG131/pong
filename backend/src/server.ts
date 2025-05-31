import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 80;
const BALL_SIZE = 15;
const PADDLE_SPEED = 8;
const BALL_SPEED = 5;

type Player = {
  id: string;
  paddleY: number;
  score: number;
  isPlayer1: boolean;
};

type Ball = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
};

type GameRoom = {
  id: string;
  players: Player[];
  ball: Ball;
  gameLoop?: NodeJS.Timeout;
  isGameOver: boolean;
};

const rooms: Record<string, GameRoom> = {};

io.on('connection', (socket: Socket) => {
  console.log(`Player connected: ${socket.id}`);

  let room: GameRoom | null = null;
  
  // Find available room
  for (const r of Object.values(rooms)) {
    if (r.players.length === 1) {
      room = r;
      break;
    }
  }

  // Create new room if needed
  if (!room) {
    const roomId = uuidv4();
    room = {
      id: roomId,
      players: [],
      ball: {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        velocityX: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
        velocityY: BALL_SPEED * (Math.random() * 2 - 1)
      },
      isGameOver: false
    };
    rooms[roomId] = room;
  }

const isPlayer1 = room.players.length === 0;
const player: Player = {
  id: socket.id,
  paddleY: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
  score: 0,
  isPlayer1
};

  room.players.push(player);
  socket.join(room.id);

  // Send initial game state
  socket.emit('game-init', {
    roomId: room.id,
    playerId: player.id,
    isPlayer1,
    canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    paddle: { width: PADDLE_WIDTH, height: PADDLE_HEIGHT }
  });

  // Start game if we have 2 players
  if (room.players.length === 2 && !room.gameLoop) {
    startGameLoop(room);
  }

  socket.on('restart-game', () => {
  if (!room) return;
  
  if (room.isGameOver) {
    console.log(`Restarting game in room ${room.id}`);
    resetRoom(room);
  }
});

  // Handle paddle movement
  socket.on('move-paddle', (direction: 'up' | 'down') => {
    if (!room) return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    
    if (direction === 'up') {
      player.paddleY = Math.max(0, player.paddleY - PADDLE_SPEED);
    } else {
      player.paddleY = Math.min(
        CANVAS_HEIGHT - PADDLE_HEIGHT, 
        player.paddleY + PADDLE_SPEED
      );
    }
    
    // Broadcast updated paddle position
    socket.to(room.id).emit('paddle-moved', {
      playerId: player.id,
      paddleY: player.paddleY
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    if (!room) return;
    
    room.players = room.players.filter(p => p.id !== socket.id);
    
    // Stop game if no players left
    if (room.players.length === 0) {
    if (room.gameLoop) clearInterval(room.gameLoop);
    delete rooms[room.id];
    console.log(`Room ${room.id} removed (no players)`);
  }
});
});

function startGameLoop(room: GameRoom) {
  if (room.isGameOver) return;
  room.gameLoop = setInterval(() => {
    // Update ball position
    room.ball.x += room.ball.velocityX;
    room.ball.y += room.ball.velocityY;

    // Top/bottom wall collision
    if (room.ball.y <= 0 || room.ball.y >= CANVAS_HEIGHT - BALL_SIZE) {
      room.ball.velocityY *= -1;
    }

    // Paddle collision
    room.players.forEach(player => {
      const paddleX = player.isPlayer1 ? 0 : CANVAS_WIDTH - PADDLE_WIDTH;
      const paddleLeft = paddleX;
      const paddleRight = paddleX + PADDLE_WIDTH;
      const paddleTop = player.paddleY;
      const paddleBottom = player.paddleY + PADDLE_HEIGHT;

      // Ball collision boundaries
      const ballLeft = room.ball.x;
      const ballRight = room.ball.x + BALL_SIZE;
      const ballTop = room.ball.y;
      const ballBottom = room.ball.y + BALL_SIZE;

      // Check collision with paddle
      if (
        ballRight > paddleLeft &&
        ballLeft < paddleRight &&
        ballBottom > paddleTop &&
        ballTop < paddleBottom
      ) {
        // Reverse X direction and add some randomness
        room.ball.velocityX *= -1.1;
        const hitPosition = (room.ball.y - player.paddleY) / PADDLE_HEIGHT;
        room.ball.velocityY = (hitPosition - 0.5) * 10;
      }
    });

    // Scoring 
    if (room.ball.x < 0) {
      // Player 2 scores
      const player2 = room.players.find(p => !p.isPlayer1);
      if (player2) {
        player2.score++;
        console.log(`Player 2 scored! Score: ${player2.score}`);
        
        // Check for win condition
        if (player2.score >= 10) {
          endGame(room, player2.id);
          return; // Exit early
        }
      }
      resetBall(room);
    } else if (room.ball.x > CANVAS_WIDTH) {
      // Player 1 scores
      const player1 = room.players.find(p => p.isPlayer1);
      if (player1) {
        player1.score++;
        console.log(`Player 1 scored! Score: ${player1.score}`);
        
        // Check for win condition
        if (player1.score >= 10) {
          endGame(room, player1.id);
          return; // Exit early
        }
      }
      resetBall(room);
    }

    // Broadcast game state
    io.to(room.id).emit('game-update', {
      ball: { ...room.ball },
      players: room.players.map(p => ({
        id: p.id,
        paddleY: p.paddleY,
        score: p.score,
        isPlayer1: p.isPlayer1
      }))
    });
  }, 1000 / 60); // 60 FPS
}

function endGame(room: GameRoom, winnerId: string) {
  console.log(`Game over in room ${room.id}! Winner: ${winnerId}`);
  
  // Set game over flag
  room.isGameOver = true;
  
  // Stop the game loop
  if (room.gameLoop) {
    clearInterval(room.gameLoop);
    room.gameLoop = undefined;
  }
  
  // Find winner information
  const winner = room.players.find(p => p.id === winnerId);
  const winnerName = winner?.isPlayer1 ? 'Player 1' : 'Player 2';
  
  // Send game over event to all players
  io.to(room.id).emit('game-over', {
    winnerId,
    winnerName,
    scores: room.players.map(p => ({
      playerId: p.id,
      score: p.score,
      isPlayer1: p.isPlayer1
    }))
  });
  
  // Remove room after delay
  setTimeout(() => {
    delete rooms[room.id];
    console.log(`Room ${room.id} removed`);
  }, 30000); // Remove room after 30 seconds
}

// Reset ball to center
function resetBall(room: GameRoom) {
  room.ball = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    velocityX: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
    velocityY: BALL_SPEED * (Math.random() * 2 - 1)
  };
}
function resetRoom(room: GameRoom) {
  // Reset scores
  room.players.forEach(player => {
    player.score = 0;
    player.paddleY = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
  });

  // Reset ball
  room.ball = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    velocityX: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
    velocityY: BALL_SPEED * (Math.random() * 2 - 1)
  };

  // Clear game over state
  room.isGameOver = false;

  // Notify players that game has restarted
  io.to(room.id).emit('game-restart', {
    ball: room.ball,
    players: room.players.map(p => ({
      id: p.id,
      paddleY: p.paddleY,
      score: p.score,
      isPlayer1: p.isPlayer1
    }))
  });

  // Restart game loop
  if (!room.gameLoop) {
    startGameLoop(room);
  }
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});