export class Ball {
  constructor(
    public position: { x: number; y: number },
    public velocity: { x: number; y: number } = { x: 5, y: 5 }
  ) {}

  update(canvas: { width: number; height: number }) {
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    // Wall collision (top/bottom)
    if (
      this.position.y <= 0 || 
      this.position.y >= canvas.height
    ) {
      this.velocity.y *= -1;
    }
  }

  reset(canvas: { width: number; height: number }) {
    this.position = {
      x: canvas.width / 2,
      y: canvas.height / 2
    };
    this.velocity = {
      x: 5 * (Math.random() > 0.5 ? 1 : -1),
      y: 5 * (Math.random() * 2 - 1)
    };
  }
}