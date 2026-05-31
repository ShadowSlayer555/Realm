export interface Vector2 { x: number; y: number; }

export class Entity {
  id: string;
  pos: Vector2;
  vel: Vector2;
  speed: number = 200;
  radius: number = 20; // For collisions
  
  constructor(id: string, x: number, y: number) {
    this.id = id;
    this.pos = { x, y };
    this.vel = { x: 0, y: 0 };
  }
}

export class Player extends Entity {
  name: string;
  hp: number;
  maxHp: number;
  isAttacking: boolean = false;
  attackTime: number = 0;
  attackCooldown: number = 0;
  dir: Vector2 = { x: 0, y: 1 }; // Direction facing
  level: number = 1;
  isDead: boolean = false;

  constructor(id: string, name: string, x: number, y: number, hp: number) {
    super(id, x, y);
    this.name = name;
    this.hp = hp;
    this.maxHp = hp;
  }
}

export class Enemy extends Entity {
  hp: number = 50;
  maxHp: number = 50;
  targetId: string | null = null;
  attackCooldown: number = 0;
  damage: number = 10;
  isDead: boolean = false;
  
  constructor(id: string, x: number, y: number) {
    super(id, x, y);
    this.speed = 100; // Slower than player
    this.radius = 25; // Bigger than player
  }
}
