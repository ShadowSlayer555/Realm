import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { WebRTCManager } from "../lib/webrtc";
import { GameEngine, InputState } from "../game/GameEngine";
import { Enemy } from "../game/Entities";
import { Joystick } from "./Joystick";
import { Canvas } from '@react-three/fiber';
import { GameScene } from './3d/GameScene';
import { HUD } from "./HUD";

export function GameOverlay() {
  const { setView, saveData, exportSave, isHost, connectedHostId, activeConnectedPeers, addToInventory } = useStore();
  
  const rtcRef = useRef<WebRTCManager | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  
  // For UI rendering state
  const [localHp, setLocalHp] = useState(100);
  const [localMaxHp, setLocalMaxHp] = useState(100);
  const [showDeathScreen, setShowDeathScreen] = useState(false);
  const [mapMessage, setMapMessage] = useState<string | null>(null);
  
  const [pendingMapId, setPendingMapId] = useState<string | null>(null);

  const [showMap, setShowMap] = useState(false);
  const [localPos, setLocalPos] = useState<{x: number, y: number} | undefined>(undefined);
  const [worldBounds, setWorldBounds] = useState<{width: number, height: number} | undefined>(undefined);

  // Joystick & Input State
  const inputRef = useRef<InputState>({ x: 0, y: 0, attack: false });
  // We use a ref so we don't trigger useEffect when saveData changes
  const localPlayerRef = useRef(saveData?.player);

  useEffect(() => {
    // Only run on initial mount
    const pData = localPlayerRef.current;
    if (!pData) return;
    const localId = pData.id;

    // 1. Setup WebRTC
    const rtc = new WebRTCManager(isHost);
    rtcRef.current = rtc;

    // 2. Setup Game Engine
    const engine = new GameEngine(isHost, localId, rtc);
    engineRef.current = engine;
    
    // Determine which map to load
    const initialMap = pData.tutorialCompleted ? "camp" : "tutorial";
    engine.loadMap(initialMap);

    engine.onDropPickup = (playerId, drop) => {
      if (playerId === localId) {
         addToInventory(drop.type, drop.amount);
      }
    };
    
    engine.onTutorialMsg = (msg) => {
       setMapMessage(msg);
    }
    
    engine.onMapTransition = (newMapId) => {
       setPendingMapId(newMapId);
    }

    // Add local player
    engine.addPlayer(localId, pData.name, 1000, 1000, pData.stats.maxHp);
    
    if (isHost && activeConnectedPeers.length > 0) {
      activeConnectedPeers.forEach(peerId => {
        rtc.establishConnection(peerId);
      });
    }

    setEngineReady(true);

    // 3. WebRTC Callbacks
    rtc.setCallbacks(
      (peerId, data) => {
        if (data.type === "state_sync") {
          engine.applyStateSync(data);
        } else if (data.type === "input") {
          engine.setInput(data.playerId, data.input);
        } else if (data.type === "join") {
          engine.addPlayer(data.player.id, data.player.name, 1000, 1000, data.player.stats.hp);
        }
      },
      (peerId) => {
        if (!isHost) {
          rtc.sendTo(peerId, { type: "join", player: pData });
        }
      },
      (peerId) => {}
    );

    // 4. Game Loop
    let lastTime = performance.now();
    const intervalTime = 1000 / 30;

    const logicTimer = setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      
      const p = engine.players.get(localId);
      if (p) {
         setLocalHp(p.hp);
         setLocalMaxHp(p.maxHp);
         setLocalPos({ x: p.pos.x, y: p.pos.y });
         setWorldBounds(engine.worldBounds);
         if (p.isDead && !showDeathScreen) {
             setShowDeathScreen(true);
         }
      }

      engine.setInput(localId, inputRef.current);
      
      if (!isHost && rtcRef.current && connectedHostId) {
        rtcRef.current.sendTo(connectedHostId, {
          type: "input",
          playerId: localId,
          input: inputRef.current
        });
      }

      // Hardcoded delta to ensure stable fast updates
      engine.logicUpdate(1/30);
    }, intervalTime);

    return () => {
      clearInterval(logicTimer);
      rtc.cleanup();
    };
  }, []); // VERY IMPORTANT: empty dependency array to prevent freezes

  // Simple key inputs for desktop testing
  useEffect(() => {
    const keys: Record<string, boolean> = {};
    const handleKeyDown = (e: KeyboardEvent) => { keys[e.key] = true; updateInput(); };
    const handleKeyUp = (e: KeyboardEvent) => { keys[e.key] = false; updateInput(); };
    
    const updateInput = () => {
      let x = 0, y = 0, attack = false;
      if (keys['ArrowUp'] || keys['w']) y -= 1;
      if (keys['ArrowDown'] || keys['s']) y += 1;
      if (keys['ArrowLeft'] || keys['a']) x -= 1;
      if (keys['ArrowRight'] || keys['d']) x += 1;
      if (keys[' ']) attack = true;
      
      if (x !== 0 && y !== 0) {
        const len = Math.sqrt(x*x + y*y);
        x /= len; y /= len;
      }
      
      inputRef.current = { x, y, attack };
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleAttackClick = () => {
    inputRef.current.attack = true;
    setTimeout(() => { inputRef.current.attack = false; }, 100);
  };
  
  const handleJoystickMove = (x: number, y: number) => {
    inputRef.current.x = x;
    inputRef.current.y = y;
  };
  
  const handleJoystickEnd = () => {
    inputRef.current.x = 0;
    inputRef.current.y = 0;
  };
  
  const pData = localPlayerRef.current;
  if (!pData) return null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#87CEEB] touch-none select-none">
      
      {/* 3D Canvas */}
      {engineReady && engineRef.current && (
        <Canvas className="absolute inset-0 block" shadows>
           <GameScene engine={engineRef.current} localId={pData.id} />
        </Canvas>
      )}

      {/* Map Message Popup */}
      {mapMessage && (
        <div className="absolute top-20 left-0 right-0 flex justify-center pointer-events-none z-10 fade-in">
           <div className="bg-slate-900/80 px-6 py-3 rounded-xl border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
               <h2 className="text-xl font-bold text-white tracking-widest uppercase">{mapMessage}</h2>
           </div>
        </div>
      )}

      {/* HUD Rendering extracted */}
      <HUD localHp={localHp} localMaxHp={localMaxHp} localPos={localPos} worldBounds={worldBounds} showMap={showMap} setShowMap={setShowMap} engine={engineRef.current} />

      <div className="absolute top-4 right-4 flex gap-2 pointer-events-auto z-20">
         <button 
           onClick={exportSave}
           className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 transition-colors backdrop-blur shadow-md font-medium"
         >
           Save
         </button>
         <button 
           onClick={() => setView('main')}
           className="px-4 py-2 bg-red-900/80 hover:bg-red-800 border border-red-700 rounded-lg text-sm text-white transition-colors backdrop-blur shadow-md font-medium"
         >
           Quit
         </button>
      </div>

      <div className="absolute bottom-6 left-6 md:bottom-12 md:left-12 pointer-events-auto z-10">
        <Joystick onMove={handleJoystickMove} onEnd={handleJoystickEnd} />
      </div>

      <div className="absolute bottom-6 right-6 md:bottom-12 md:right-12 flex gap-4 pointer-events-auto items-end z-10">
         <button 
           className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-emerald-600/80 border-2 border-emerald-500 active:bg-emerald-500 backdrop-blur text-white font-bold flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)] transform active:scale-95 transition-transform"
           onTouchStart={handleAttackClick}
           onMouseDown={handleAttackClick}
         >
           <span className="md:text-xl tracking-wider">ATK</span>
         </button>
      </div>

      {showDeathScreen && (
        <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-8">
           <h1 className="text-6xl font-bold text-red-500 mb-8 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">You Died</h1>
           <p className="text-slate-300 mb-8 max-w-md">Your adventure takes a pause, hero. The realm remains unsafe.</p>
           <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-wider text-xl transition-all shadow-lg hover:scale-105"
           >
             Continue to Camp
           </button>
        </div>
      )}

      {pendingMapId && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-50 flex flex-col items-center justify-center text-center p-8 fade-in">
           <h1 className="text-5xl font-bold text-emerald-400 mb-4 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]">Victory</h1>
           <p className="text-slate-300 mb-12 max-w-md">You've cleared the area. A reward awaits!</p>
           
           <div className="group relative w-32 h-32 mb-12 cursor-pointer flex items-center justify-center bg-slate-800 border-2 border-emerald-500 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_50px_rgba(16,185,129,0.8)] transition-all overflow-hidden"
                onClick={() => {
                   if (engineRef.current?.mapId === 'tutorial' && !saveData?.player.tutorialCompleted) {
                      addToInventory("Bottomless Health Potion", 1);
                      useStore.setState(s => s.saveData ? { saveData: {...s.saveData, player: {...s.saveData.player, tutorialCompleted: true}} } : s);
                   } else {
                      const possibleLoot = ['iron sword', 'mana potion', 'gold coins', 'ruby'];
                      addToInventory(possibleLoot[Math.floor(Math.random() * possibleLoot.length)], 1);
                   }
                   if (engineRef.current) engineRef.current.loadMap(pendingMapId);
                   setPendingMapId(null);
                }}>
              <div className="absolute inset-0 bg-emerald-500 opacity-20 group-hover:scale-150 transition-transform duration-500 rounded-full blur-xl" />
              <span className="text-4xl">🎁</span>
           </div>

           <p className="text-slate-400 text-sm animate-pulse uppercase tracking-widest">Tap to Open</p>
        </div>
      )}
    </div>
  );
}
