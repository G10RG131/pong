import { Player } from './Player';
import { Ball } from './Ball';
import { GameState } from '../types/gameTypes';

const CANVAS_SIZE = { width: 800, height: 400 };
const PADDLE_SIZE = { width: 15, height: 80 };

export class GameRoom {
  private players: Player[] = [];
  private ball: Ball;
  private gameInterval?: NodeJS.Timeout;

  constructor(public readonly id: string) {
    this.ball = new Ball({
      x: CANVAS_SIZE.width / 2,
      y: CANVAS_SIZE.height / 2
    });
  }

  addPlayer(playerId: string): boolean {
    if (this.players.length >= 2) return false;

    const isFirstPlayer = this.players.length === 0;
    const player = new Player(playerId, {
      x: isFirstPlayer ? 20 : CANVAS_SIZE.width - 35,
      y: CANVAS_SIZE.height / 2 - PADDLE_SIZE.height / 2
    });

    this.players.push(player);
    return true;
  }

  getPlayerCount(): number {
    return this.players.length;
  }

  removePlayer(playerId: string): boolean {
    const initialCount = this.players.length;
    this.players = this.players.filter(p => p.id !== playerId);
    return this.players.length !== initialCount;
  }

  movePlayer(playerId: string, direction: 'up' | 'down'): void {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;

    const moveAmount = 10;
    player.position.y += direction === 'up' ? -moveAmount : moveAmount;

    // Boundary checking
    player.position.y = Math.max(
      0,
      Math.min(
        CANVAS_SIZE.height - PADDLE_SIZE.height,
        player.position.y
      )
    );
  }

  startGame(): void {
    if (this.gameInterval) return;
    
    this.gameInterval = setInterval(() => this.update(), 1000 / 60);
  }

  stopGame(): void {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = undefined;
    }
  }

  isRunning(): boolean {
    return this.gameInterval !== undefined;
  }
  
  private update(): void {
    this.ball.update(CANVAS_SIZE);
    this.checkCollisions();
  }

  private checkCollisions(): void {
    // Check paddle collisions
    for (const player of this.players) {
      if (
        this.ball.position.x >= player.position.x &&
        this.ball.position.x <= player.position.x + PADDLE_SIZE.width &&
        this.ball.position.y >= player.position.y &&
        this.ball.position.y <= player.position.y + PADDLE_SIZE.height
      ) {
        // Reverse ball direction and slightly randomize
        this.ball.velocity.x *= -1.1;
        this.ball.velocity.y += (Math.random() - 0.5) * 2;
      }
    }

    // Check scoring
    if (this.ball.position.x <= 0) {
      if (this.players[1]) {
        this.players[1].score++;
      }
      this.ball.reset(CANVAS_SIZE);
    } else if (this.ball.position.x >= CANVAS_SIZE.width) {
      if (this.players[0]) {
        this.players[0].score++;
      }
      this.ball.reset(CANVAS_SIZE);
    }
  }

  getGameState(): GameState {
    return {
      ball: {
        position: { ...this.ball.position },
        velocity: { ...this.ball.velocity }
      },
      players: this.players.reduce((acc, player) => {
        acc[player.id] = {
          position: { ...player.position },
          score: player.score
        };
        return acc;
      }, {} as GameState['players'])
    };
  }
}