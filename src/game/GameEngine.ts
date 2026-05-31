import { Player, Enemy, Vector2 } from "./Entities";
import { WebRTCManager } from "../lib/webrtc";

export interface InputState {
  x: number; // -1 to 1 joystick X
  y: number; // -1 to 1 joystick Y
  attack: boolean;
}

export interface DroppedItem {
  id: string;
  type: string;
  amount: number;
  pos: Vector2;
}

export interface Door {
  id: string;
  pos: Vector2;
  radius: number;
  active: boolean;
  targetMap: string;
}

export class GameEngine {
  public players: Map<string, Player> = new Map();
  public enemies: Map<string, Enemy> = new Map();
  public drops: Map<string, DroppedItem> = new Map();
  public doors: Map<string, Door> = new Map();
  
  public isHost: boolean = false;
  public localPlayerId: string = "";
  public mapId: string = "";
  public mapState: any = {};
  
  public inputs: Map<string, InputState> = new Map();
  
  private rtc: WebRTCManager | null = null;
  public worldBounds = { width: 2000, height: 2000 };
  
  public onDropPickup?: (playerId: string, drop: DroppedItem) => void;
  public onTutorialMsg?: (msg: string) => void;
  public onMapTransition?: (newMapId: string) => void;
  
  private spawnTimer = 0;

  constructor(isHost: boolean, localId: string, rtcManager: WebRTCManager | null) {
    this.isHost = isHost;
    this.localPlayerId = localId;
    this.rtc = rtcManager;
  }

  public addPlayer(id: string, name: string, x: number, y: number, hp: number) {
    this.players.set(id, new Player(id, name, x, y, hp));
    this.inputs.set(id, { x: 0, y: 0, attack: false });
  }

  public removePlayer(id: string) {
    this.players.delete(id);
    this.inputs.delete(id);
  }

  public setInput(id: string, input: InputState) {
    this.inputs.set(id, input);
  }

  private distanceSq(p1: Vector2, p2: Vector2) {
    return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
  }

  public loadMap(mapId: string) {
    this.mapId = mapId;
    this.enemies.clear();
    this.drops.clear();
    this.doors.clear();
    
    // Default world bounds
    this.worldBounds = { width: 2000, height: 2000 };

    if (mapId === "tutorial") {
      this.worldBounds = { width: 1000, height: 1000 };
      if (this.isHost) {
        this.enemies.set("z1", new Enemy("z1", 500, 300));
        this.mapState = { step: 0, enemiesToKill: 1 };
      }
    } else if (mapId === "camp") {
      // Safe zone, no enemies
      this.worldBounds = { width: 1500, height: 1500 };
    } else {
      // Standard level
      if (this.isHost) {
         for(let i=0; i<5; i++) {
            const eId = `z${i}`;
            this.enemies.set(eId, new Enemy(eId, 500 + Math.random()*1000, 500 + Math.random()*1000));
         }
      }
    }

    // Spawn players securely at center
    this.players.forEach(p => {
       p.pos = { x: this.worldBounds.width / 2, y: this.worldBounds.height / 2 + 200 };
       p.hp = p.maxHp;
       p.isDead = false;
    });
  }

  public logicUpdate(dt: number) {
    this.players.forEach((p) => {
      const input = this.inputs.get(p.id);
      if (input && p.hp > 0) {
        if (input.x !== 0 || input.y !== 0) {
            p.pos.x += input.x * p.speed * dt;
            p.pos.y += input.y * p.speed * dt;
            p.dir.x = input.x;
            p.dir.y = input.y;
            
            p.pos.x = Math.max(p.radius, Math.min(this.worldBounds.width - p.radius, p.pos.x));
            p.pos.y = Math.max(p.radius, Math.min(this.worldBounds.height - p.radius, p.pos.y));
        }

        if (this.isHost) {
           if (p.attackCooldown > 0) p.attackCooldown -= dt;
           
           if (input.attack && p.attackCooldown <= 0) {
             p.isAttacking = true;
             p.attackTime = 0.2;
             p.attackCooldown = 0.5;
             
             const attackRange = 50;
             const reach = attackRange + p.radius;
             const atkX = p.pos.x + p.dir.x * (p.radius + 10);
             const atkY = p.pos.y + p.dir.y * (p.radius + 10);
             
             this.enemies.forEach((e, eId) => {
               if (e.isDead) return;
               if (this.distanceSq({x: atkX, y: atkY}, e.pos) < Math.pow(reach + e.radius, 2)) {
                 e.hp -= 20; 
                 if (e.hp <= 0) {
                   e.isDead = true;
                   const dropId = "drop_" + Math.random().toString(36).substr(2, 9);
                   this.drops.set(dropId, {
                     id: dropId,
                     type: Math.random() > 0.5 ? 'emerald' : 'wood',
                     amount: Math.floor(Math.random() * 5) + 1,
                     pos: { x: e.pos.x, y: e.pos.y }
                   });
                   // Will be cleared later or clients kept for smoke
                   setTimeout(() => this.enemies.delete(eId), 1000);
                 }
               }
             });
           }
           
           // Pickup drops
           this.drops.forEach((drop, dropId) => {
               if (this.distanceSq(p.pos, drop.pos) < Math.pow(p.radius + 15, 2)) {
                   this.drops.delete(dropId);
                   if (this.onDropPickup) {
                     this.onDropPickup(p.id, drop);
                   }
               }
           });
           
           // Door collisions
           this.doors.forEach((door) => {
              if (door.active && this.distanceSq(p.pos, door.pos) < Math.pow(door.radius + p.radius, 2)) {
                  if (this.onMapTransition) this.onMapTransition(door.targetMap);
              }
           });
        } else {
             if (input.attack && !p.isAttacking) {
                 p.isAttacking = true;
                 p.attackTime = 0.2;
             }
        }
      }
      
      if (p.attackTime > 0) {
        p.attackTime -= dt;
        if (p.attackTime <= 0) p.isAttacking = false;
      }
    });

    if (this.isHost) {
      if (this.mapId === 'tutorial') {
         // Tutorial logic
         const activeEnemies = Array.from(this.enemies.values()).filter(e => !e.isDead).length;
         if (this.mapState.step === 0 && activeEnemies === 0) {
             this.mapState.step = 1;
             this.doors.set('tut_door', { id: 'tut_door', pos: { x: 500, y: 150 }, radius: 100, active: true, targetMap: 'camp' });
             if (this.onTutorialMsg) this.onTutorialMsg("Go through the glowing door!");
         } else if (this.mapState.step === 0) {
             if (this.onTutorialMsg) this.onTutorialMsg("Defeat the Zombie to proceed!");
         }
      } else if (this.mapId !== 'camp') {
         // Basic level logic: spawn door when all dead
         const activeEnemies = Array.from(this.enemies.values()).filter(e => !e.isDead).length;
         if (activeEnemies === 0 && !this.doors.has('level_exit')) {
             this.doors.set('level_exit', { id: 'level_exit', pos: { x: this.worldBounds.width/2, y: 200 }, radius: 100, active: true, targetMap: 'camp' });
         }
      }

      this.enemies.forEach(e => {
        if (e.isDead) return;
        
        let nearest: Player | null = null;
        let minDistSq = Infinity;

        this.players.forEach(p => {
          if (!p.isDead) {
             const distSq = this.distanceSq(p.pos, e.pos);
             if (distSq < minDistSq) {
               minDistSq = distSq;
               nearest = p;
             }
          }
        });

        if (nearest && !nearest.isDead) {
          e.targetId = nearest.id;
          const dist = Math.sqrt(minDistSq);
          
          if (e.attackCooldown > 0) e.attackCooldown -= dt;

          if (dist > (e.radius + nearest.radius + 10)) { 
            const dx = (nearest.pos.x - e.pos.x) / dist;
            const dy = (nearest.pos.y - e.pos.y) / dist;
            e.pos.x += dx * e.speed * dt;
            e.pos.y += dy * e.speed * dt;
          } else {
            if (e.attackCooldown <= 0) {
               nearest.hp = Math.max(0, nearest.hp - e.damage);
               e.attackCooldown = 1.0; 
            }
          }
        }
      });
      
      if (this.rtc) {
        const stateMsg = {
          type: "state_sync",
          mapId: this.mapId,
          players: Array.from(this.players.values()),
          enemies: Array.from(this.enemies.values()),
          drops: Array.from(this.drops.values()),
          doors: Array.from(this.doors.values())
        };
        this.rtc.broadcast(stateMsg);
      }
    }
  }

  public applyStateSync(state: any) {
    if (this.isHost) return;

    if (state.mapId && state.mapId !== this.mapId) {
        this.mapId = state.mapId;
        // Resync bounds simply
        if (this.mapId === "tutorial") this.worldBounds = { width: 1000, height: 1000 };
        else if (this.mapId === "camp") this.worldBounds = { width: 1500, height: 1500 };
        else this.worldBounds = { width: 2000, height: 2000 };
    }

    state.players.forEach((pState: any) => {
      let p = this.players.get(pState.id);
      if (!p) {
        this.addPlayer(pState.id, pState.name, pState.pos.x, pState.pos.y, pState.hp);
        p = this.players.get(pState.id)!;
      }
      if (p.id !== this.localPlayerId) { 
         p.pos = pState.pos;
         p.dir = pState.dir;
      } else {
         const distSq = this.distanceSq(p.pos, pState.pos);
         if (distSq > 10000) { 
            p.pos = pState.pos;
         }
         p.hp = pState.hp;
         p.isDead = pState.isDead;
      }
      if (pState.isAttacking) p.isAttacking = pState.isAttacking;
    });

    const incomingPlayerIds = new Set(state.players.map((p: any) => p.id));
    this.players.forEach((p, id) => {
        if (!incomingPlayerIds.has(id)) {
            this.removePlayer(id);
        }
    });

    this.enemies.clear();
    state.enemies.forEach((eState: any) => {
       const e = new Enemy(eState.id, eState.pos.x, eState.pos.y);
       e.hp = eState.hp;
       e.maxHp = eState.maxHp;
       e.isDead = eState.isDead;
       this.enemies.set(e.id, e);
    });

    this.drops.clear();
    if (state.drops) {
        state.drops.forEach((d: any) => {
            this.drops.set(d.id, d);
        });
    }

    this.doors.clear();
    if (state.doors) {
        state.doors.forEach((d: any) => {
            this.doors.set(d.id, d);
        });
    }
  }
}
