export class Player {
  public score: number = 0;
  
  constructor(
    public readonly id: string,
    public position: { x: number; y: number }
  ) {}
}