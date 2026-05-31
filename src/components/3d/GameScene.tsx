import { useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { GameEngine } from '../../game/GameEngine';
import { BlockyCharacter } from './BlockyCharacter';
import { Vector3, MathUtils } from 'three';
import { useStore } from '../../store';

// Procedural Tree Component
function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 2, 0.6]} />
        <meshStandardMaterial color="#5c4033" />
      </mesh>
      {/* Leaves */}
      <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 2, 2.5]} />
        <meshStandardMaterial color="#2d5a27" />
      </mesh>
    </group>
  );
}

// Glowing Door Objective
function ObjectiveDoor({ engine, id }: { engine: GameEngine, id: string }) {
   const [pos] = useState<[number, number, number]>(() => {
      const door = engine.doors.get(id);
      if (!door) return [0,0,0];
      return [door.pos.x * 0.02, 1, door.pos.y * 0.02];
   });
   const rotY = useMemo(() => Math.random() * Math.PI, []);

   return (
      <group position={pos} rotation={[0, rotY, 0]}>
         {/* Arch pillars */}
         <mesh position={[-2, 2, 0]} castShadow receiveShadow>
           <cylinderGeometry args={[0.5, 0.5, 6, 8]} />
           <meshStandardMaterial color="#475569" />
         </mesh>
         <mesh position={[2, 2, 0]} castShadow receiveShadow>
           <cylinderGeometry args={[0.5, 0.5, 6, 8]} />
           <meshStandardMaterial color="#475569" />
         </mesh>
         {/* Arch top */}
         <mesh position={[0, 5, 0]} castShadow receiveShadow>
           <boxGeometry args={[5.5, 1, 1.5]} />
           <meshStandardMaterial color="#334155" />
         </mesh>
         
         {/* Glowing Interior Portal */}
         <mesh position={[0, 2, 0]}>
           <planeGeometry args={[3, 5]} />
           <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
         </mesh>
         {/* Light pouring from door */}
         <pointLight position={[0, 2, 1]} color="#ffffff" intensity={5} distance={15} />
         
         {/* Volumetric light ray effect simplified as additive plane/cone */}
         <mesh position={[0, 2, 2.5]} rotation={[Math.PI / 2, 0, 0]}>
           <coneGeometry args={[3, 6, 16]} />
           <meshBasicMaterial color="#ffffff" transparent opacity={0.15} blending={2} depthWrite={false} side={2} />
         </mesh>
      </group>
   );
}


function DropWrapper({ engine, id }: { engine: GameEngine, id: string }) {
   const [rotY, setRotY] = useState(0);
   
   useFrame((state, delta) => {
       setRotY(prev => prev + delta * 2);
   });

   const drop = engine.drops.get(id);
   if (!drop) return null;

   const scale = 0.02;
   const targetX = drop.pos.x * scale;
   const targetZ = drop.pos.y * scale;

   const isEmerald = drop.type === 'emerald';
   const color = isEmerald ? "#10b981" : "#8b4513";
   const bounce = Math.sin(rotY * 2) * 0.2 + 0.5;

   return (
      <group position={[targetX, bounce, targetZ]} rotation={[0, rotY, 0]}>
         {isEmerald ? (
            <mesh castShadow>
               <octahedronGeometry args={[0.3]} />
               <meshStandardMaterial color={color} />
            </mesh>
         ) : (
            <mesh castShadow>
               <boxGeometry args={[0.4, 0.4, 0.4]} />
               <meshStandardMaterial color={color} />
            </mesh>
         )}
      </group>
   );
}


// 3D wrapper for a single character pulling direct from mutable state
function PlayerWrapper({ engine, id, isLocal }: { engine: GameEngine, id: string, isLocal: boolean }) {
  const [moving, setMoving] = useState(false);
  const [attacking, setAttacking] = useState(false);
  const [pos, setPos] = useState<[number, number, number]>([0,0,0]);
  const [rot, setRot] = useState<[number, number, number]>([0,0,0]);
  const [deadRot, setDeadRot] = useState(0);
  
  // Read local equipment for visualization
  const equipment = useStore(state => isLocal ? state.saveData?.player.equipment : undefined);

  useFrame((state, delta) => {
    const player = engine.players.get(id);
    if (!player) return;

    if (player.isDead) {
       setDeadRot(prev => MathUtils.lerp(prev, Math.PI / 2, delta * 5));
       return; // Stop updating pos/rot when dead
    } else {
       setDeadRot(0);
    }

    // Convert 2D logic coordinate (x,y) to 3D coordinate (x,0,z)
    const scale = 0.02;
    const targetX = player.pos.x * scale;
    const targetZ = player.pos.y * scale;

    const currentPos = new Vector3(pos[0], pos[1], pos[2]);
    const targetPos = new Vector3(targetX, 0, targetZ);
    
    currentPos.lerp(targetPos, delta * 15);
    setPos([currentPos.x, currentPos.y, currentPos.z]);

    const isMovingNow = (player.dir.x !== 0 || player.dir.y !== 0) && (player.hp > 0);
    if (moving !== isMovingNow) setMoving(isMovingNow);
    if (attacking !== player.isAttacking) setAttacking(player.isAttacking);

    // Rotation (smooth looking)
    if (isMovingNow) {
       const targetAngle = Math.atan2(player.dir.x, player.dir.y); 
       // We'll just directly snap or lerp. Let's direct snap for simplicity
       setRot([0, targetAngle, 0]);
    }

    if (isLocal) {
       // Camera follow (isometric angle)
       const cameraOffset = new Vector3(0, 15, 15);
       const targetCamPos = currentPos.clone().add(cameraOffset);
       state.camera.position.lerp(targetCamPos, delta * 5);
       state.camera.lookAt(currentPos);
    }
  });

  const player = engine.players.get(id);
  if (!player) return null; 
  
  return (
    <group position={pos} rotation={[deadRot, 0, 0]}>
       <BlockyCharacter 
          position={[0,0,0]} 
          rotation={rot} 
          isMoving={moving} 
          isAttacking={attacking} 
          colorPrimary={isLocal ? '#10b981' : '#3b82f6'} 
          equipment={equipment}
       />
    </group>
  );
}

function EnemyWrapper({ engine, id }: { engine: GameEngine, id: string }) {
  const [pos, setPos] = useState<[number, number, number]>([0,0,0]);
  const [rot, setRot] = useState<[number, number, number]>([0,0,0]);
  const [deadRot, setDeadRot] = useState(0);

  useFrame((state, delta) => {
    const enemy = engine.enemies.get(id);
    if (!enemy) return;

    if (enemy.isDead) {
       setDeadRot(prev => MathUtils.lerp(prev, Math.PI / 2, delta * 5));
       return;
    }

    const scale = 0.02;
    const targetX = enemy.pos.x * scale;
    const targetZ = enemy.pos.y * scale;
    
    // Inferred moving direction for enemies
    const dx = targetX - pos[0];
    const dz = targetZ - pos[2];
    
    if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
       setRot([0, Math.atan2(dx, dz), 0]);
    }

    const currentPos = new Vector3(pos[0], pos[1], pos[2]);
    const targetPos = new Vector3(targetX, 0, targetZ);
    currentPos.lerp(targetPos, delta * 15);
    setPos([currentPos.x, currentPos.y, currentPos.z]);
  });

  const enemy = engine.enemies.get(id);
  if (!enemy) return null; 
  
  return (
    <group position={pos} rotation={[deadRot, 0, 0]}>
       <BlockyCharacter 
          position={[0,0,0]} 
          rotation={rot} 
          isMoving={true}
          isAttacking={false} 
          isZombie={true}
       />
    </group>
  );
}

function CampDetails() {
  return (
     <group>
        {/* Central Map Table */}
        <mesh position={[15, 0.4, 15]} castShadow receiveShadow>
           <cylinderGeometry args={[2, 2, 0.8, 12]} />
           <meshStandardMaterial color="#8b4513" />
        </mesh>
        <mesh position={[15, 0.81, 15]}>
           <cylinderGeometry args={[1.9, 1.9, 0.05, 12]} />
           <meshStandardMaterial color="#fef08a" />
        </mesh>
        
        {/* Trader Stall 1 */}
        <group position={[5, 0, 15]} rotation={[0, Math.PI/4, 0]}>
           <mesh position={[0, 1, 0]} castShadow receiveShadow>
             <boxGeometry args={[3, 2, 1.5]} />
             <meshStandardMaterial color="#b45309" />
           </mesh>
           <mesh position={[0, 2.5, 0]} rotation={[-Math.PI/6, 0, 0]} castShadow>
             <boxGeometry args={[3.2, 0.2, 2]} />
             <meshStandardMaterial color="#ef4444" />
           </mesh>
        </group>

        {/* Campfire */}
        <group position={[25, 0, 25]}>
           <mesh position={[0, 0.2, 0]}>
             <cylinderGeometry args={[1, 1, 0.4, 8]} />
             <meshStandardMaterial color="#333" />
           </mesh>
           <mesh position={[0, 0.6, 0]}>
             <coneGeometry args={[0.5, 1, 4]} />
             <meshStandardMaterial color="#f97316" transparent opacity={0.8} />
           </mesh>
           <pointLight position={[0, 1.5, 0]} color="#f97316" intensity={2} distance={10} />
        </group>
     </group>
  );
}

export function GameScene({ engine, localId }: { engine: GameEngine, localId: string }) {
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [enemyIds, setEnemyIds] = useState<string[]>([]);
  const [dropIds, setDropIds] = useState<string[]>([]);
  const [doorIds, setDoorIds] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
        setPlayerIds(Array.from(engine.players.keys()));
        setEnemyIds(Array.from(engine.enemies.keys()));
        setDropIds(Array.from(engine.drops.keys()));
        setDoorIds(Array.from(engine.doors.keys()));
    }, 500);
    return () => clearInterval(interval);
  }, [engine]);

  // Generate some static trees pseudo-randomly based on MapId
  const trees = useMemo(() => {
    if (engine.mapId === "camp") return []; // No trees in camp for now, or just a few

    const arr = [];
    const numTrees = engine.mapId === "tutorial" ? 20 : 100;
    const worldW = engine.worldBounds.width * 0.02;
    const worldH = engine.worldBounds.height * 0.02;
    // stable seeded random function would be better, but Math.random works just for visuals
    
    for (let i = 0; i < numTrees; i++) {
        const x = (Math.random() * worldW);
        const z = (Math.random() * worldH);
        // exclude center spawn area and door areas
        if (Math.abs(x - worldW/2) < 5 && Math.abs(z - worldH/2) < 5) continue;
        if (Math.abs(x - worldW/2) < 5 && z < 10) continue;
        arr.push({ x, z });
    }
    return arr;
  }, [engine.mapId, engine.worldBounds]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[-10, 20, 10]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      
      {/* Floor Elements */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[engine.worldBounds.width * 0.01, -0.01, engine.worldBounds.height * 0.01]}
        receiveShadow
      >
        <planeGeometry args={[engine.worldBounds.width * 0.02, engine.worldBounds.height * 0.02]} />
        <meshStandardMaterial color={engine.mapId === 'camp' ? '#334155' : "#064e3b"} />
      </mesh>
      
      {/* Grid overlay for better sense of scale and not just a weird plane */}
      <gridHelper 
         args={[Math.max(engine.worldBounds.width, engine.worldBounds.height) * 0.02, 50, '#10b981', '#10b981']} 
         position={[engine.worldBounds.width * 0.01, 0, engine.worldBounds.height * 0.01]} 
         rotation={[0, 0, 0]}
      />

      {/* Decorative Trees */}
      {trees.map((t, i) => (
        <Tree key={i} position={[t.x, 0, t.z]} />
      ))}
      
      {engine.mapId === 'camp' && <CampDetails />}
      
      {doorIds.map(id => <ObjectiveDoor key={id} engine={engine} id={id} />)}
      {dropIds.map(id => <DropWrapper key={id} engine={engine} id={id} />)}
      {playerIds.map(id => <PlayerWrapper key={id} engine={engine} id={id} isLocal={id === localId} />)}
      {enemyIds.map(id => <EnemyWrapper key={id} engine={engine} id={id} />)}
    </>
  );
}
