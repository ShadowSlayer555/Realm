import { useEffect, useState } from "react";
import { useStore } from "../store";
import { InventoryItem } from "../types";

function EquipSlot({ type, item }: { type: string, item?: InventoryItem }) {
   return (
      <div className="w-12 h-12 bg-slate-900/80 border-2 border-slate-600 rounded drop-shadow flex flex-col items-center justify-center relative hover:border-slate-400 cursor-pointer group">
         {!item ? (
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter opacity-50">{type}</span>
         ) : (
            <>
               <span className="text-2xl drop-shadow-md group-hover:scale-110 transition-transform">
                  {item.category === 'melee' ? '🗡️' :
                   item.category === 'potion' ? '🧪' :
                   item.category === 'armor' ? '🛡️' :
                   item.category === 'ranged' ? '🏹' : '💎'}
               </span>
               <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 rounded-b opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[8px] text-white font-medium text-center truncate px-0.5 w-full">{item.type}</p>
               </div>
            </>
         )}
      </div>
   );
}

function RedShrinkingBar({ current, max, colorClass, baseClass }: { current: number, max: number, colorClass: string, baseClass: string }) {
   const [delayedVal, setDelayedVal] = useState(current);

   useEffect(() => {
     let raf: number;
     let lastTime = performance.now();
     
     const animate = (time: number) => {
        const dt = (time - lastTime) / 1000;
        lastTime = time;

        setDelayedVal(prev => {
           if (prev > current) return Math.max(current, prev - (max * 0.2 * dt)); // shrink 20% per second
           if (prev < current) return current; // instant fill if health goes up
           return prev;
        });
        raf = requestAnimationFrame(animate);
     };
     raf = requestAnimationFrame(animate);
     return () => cancelAnimationFrame(raf);
   }, [current, max]);

   const percent = Math.max(0, Math.min(100, (current / max) * 100));
   const delayedPercent = Math.max(0, Math.min(100, (delayedVal / max) * 100));

   return (
      <div className={`relative w-full h-full rounded ${baseClass} overflow-hidden border border-slate-950`}>
         {/* Shrinking red bar behind */}
         <div 
           className={`absolute top-0 bottom-0 left-0 bg-red-600 transition-none`} 
           style={{ width: `${delayedPercent}%` }} 
         />
         {/* Actual current value bar */}
         <div 
           className={`absolute top-0 bottom-0 left-0 ${colorClass} transition-all duration-100 ease-linear`} 
           style={{ width: `${percent}%` }} 
         />
      </div>
   );
}

import { GameEngine } from "../game/GameEngine";

export function HUD({ localHp, localMaxHp, localPos, worldBounds, showMap, setShowMap, engine }: { localHp: number, localMaxHp: number, localPos?: {x: number, y: number}, worldBounds?: {width: number, height: number}, showMap: boolean, setShowMap: (val: boolean) => void, engine?: GameEngine | null }) {
  const { saveData, notifications } = useStore();
  const [showInventory, setShowInventory] = useState(false);

  if (!saveData) return null;

  return (
     <>
        {/* Item Pickup Slide-in Notifications */}
        <div className="absolute left-0 top-32 flex flex-col gap-2 p-4 pointer-events-none z-50">
           {notifications.map((n) => (
             <div key={n.id} className="animate-slide-in-left bg-slate-900/90 border-l-4 border-emerald-500 text-white px-4 py-2 rounded-r shadow-lg flex items-center justify-between min-w-[200px]">
                <span className="font-semibold capitalize text-shadow-sm">{n.type}</span>
                <span className="text-emerald-400 font-bold bg-slate-800 px-2 py-0.5 rounded ml-4 border border-slate-700">+{n.amount}</span>
             </div>
           ))}
        </div>

        {/* Bottom Central Action Bar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-1 pointer-events-auto z-20">
           {/* Level Badge */}
           <div className="bg-slate-900 border-2 border-slate-700 w-12 h-12 flex items-center justify-center -mb-2 z-10 shadow-lg transform rotate-45">
               <span className="text-white font-bold text-lg -rotate-45">{saveData.player.level}</span>
           </div>
           
           {/* Main HUD Consoles */}
           <div className="bg-slate-900/95 border-t-2 border-b-2 border-l-2 border-r border-slate-800 rounded-l-lg p-2 flex flex-col gap-2 w-48 shadow-2xl backdrop-blur-md">
              <div className="h-5 relative group">
                 <RedShrinkingBar current={localHp} max={localMaxHp} colorClass="bg-red-500" baseClass="bg-slate-800" />
                 <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-black drop-shadow-md">
                    {Math.floor(localHp)} / {localMaxHp}
                 </span>
              </div>
              <div className="h-4 relative">
                 <div className="w-full h-full bg-slate-800 border border-slate-950 rounded overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${(saveData.player.stats.mana / saveData.player.stats.maxMana) * 100}%` }} />
                 </div>
              </div>
           </div>

           {/* Toolbar Quick Slots (Artifacts + Potion) */}
           <div className="bg-slate-900/95 border-b-2 border-slate-800 px-2 flex gap-1 h-[4.5rem] shadow-2xl backdrop-blur-md relative overflow-visible items-center justify-center">
              <div className="absolute -top-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest w-full text-center">Quick Use</div>
              
              <button onClick={() => alert("Used artifact 1")} className="w-12 h-12 bg-slate-800 border-2 border-slate-600 rounded flex items-center justify-center hover:bg-slate-700 text-slate-400 font-bold text-sm relative transition-colors overflow-hidden group shadow-[inset_0_3px_6px_rgba(0,0,0,0.6)]">
                 {saveData.player.equipment?.artifact1 ? <span className="text-2xl drop-shadow group-hover:scale-110 transition-transform">💎</span> : '1'}
              </button>
              <button className="w-12 h-12 bg-slate-800 border-2 border-slate-600 rounded flex items-center justify-center hover:bg-slate-700 text-slate-400 font-bold text-sm relative transition-colors overflow-hidden group shadow-[inset_0_3px_6px_rgba(0,0,0,0.6)]">
                 {saveData.player.equipment?.artifact2 ? <span className="text-2xl drop-shadow group-hover:scale-110 transition-transform">📜</span> : '2'}
              </button>
              <button className="w-12 h-12 bg-slate-800 border-2 border-slate-600 rounded flex items-center justify-center hover:bg-slate-700 text-slate-400 font-bold text-sm relative transition-colors overflow-hidden group shadow-[inset_0_3px_6px_rgba(0,0,0,0.6)]">
                 {saveData.player.equipment?.artifact3 ? <span className="text-2xl drop-shadow group-hover:scale-110 transition-transform">🔮</span> : '3'}
              </button>
              <button onClick={() => alert("Used potion")} className="w-12 h-12 bg-slate-800 border-2 border-slate-600 rounded flex items-center justify-center hover:bg-slate-700 text-slate-400 font-bold text-sm relative transition-colors overflow-hidden group shadow-[inset_0_3px_6px_rgba(0,0,0,0.6)] ml-2">
                 <span className="text-2xl drop-shadow group-hover:scale-110 transition-transform">🧪</span>
                 <span className="absolute bottom-0.5 right-0.5 bg-slate-900 border border-slate-700 rounded px-1 text-[9px] text-white">5</span>
              </button>
           </div>
           
           {/* Side buttons */}
           <div className="bg-slate-900/95 border-t-2 border-b-2 border-r-2 border-l border-slate-800 rounded-r-lg p-2 flex flex-col w-16 shadow-2xl backdrop-blur-md h-[4.5rem] justify-center gap-1">
              <button 
                 onClick={() => setShowInventory(!showInventory)}
                 className={`w-full py-0.5 text-xs font-bold rounded flex-1 ${showInventory ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-emerald-800 text-slate-300'}`}
              >
                 INV
              </button>
              <button 
                 onClick={() => setShowMap(!showMap)}
                 className={`w-full py-0.5 text-xs font-bold rounded flex-1 ${showMap ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-blue-800 text-slate-300'}`}
              >
                 MAP
              </button>
           </div>
        </div>

        {/* Overlay Mini Map */}
        {showMap && localPos && worldBounds && (
           <div className="absolute inset-4 md:inset-20 z-30 pointer-events-auto bg-slate-900/95 border-2 border-slate-700 shadow-2xl rounded-2xl flex flex-col animate-fade-in backdrop-blur-md overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
                 <h2 className="text-2xl font-bold text-white tracking-widest uppercase">Local Map</h2>
                 <button onClick={() => setShowMap(false)} className="text-slate-400 hover:text-white font-bold text-xl uppercase tracking-widest border border-slate-700 hover:bg-slate-700 px-4 py-1 rounded">Close</button>
              </div>
              
              <div className="flex-1 relative overflow-hidden bg-slate-950 m-4 rounded outline outline-1 outline-slate-800">
                 {/* CSS grid acting as topological lines */}
                 <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                 
                 {/* The map drawing container, scaled to fit bounds */}
                 <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="relative w-full h-full max-w-[800px] max-h-[800px] aspect-square bg-[#0f172a]" style={{ borderRadius: '1rem' }}>
                       
                       {/* Represent local bounds */}
                       <div className="absolute inset-0 border border-slate-600 rounded-xl" />
                       
                       {/* Central Player Blip (scaled strictly by pct bounds) */}
                       <div 
                          className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full z-20 pointer-events-none"
                          style={{ 
                            left: `${(localPos.x / worldBounds.width) * 100}%`, top: `${(localPos.y / worldBounds.height) * 100}%` 
                          }} 
                       >
                          {/* Inner dot */}
                          <div className="absolute inset-0 bg-emerald-400 rounded-full" />
                          {/* Ping circle */}
                          <div className="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-ping opacity-50" />
                       </div>

                       {engine && engine.statics.map(st => (
                          <div 
                             key={st.id}
                             className="absolute rounded bg-slate-800 border border-slate-700 shadow-lg opacity-70 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center font-bold text-slate-500 uppercase text-[10px]"
                             style={{
                                left: `${(st.pos.x / worldBounds.width) * 100}%`,
                                top: `${(st.pos.y / worldBounds.height) * 100}%`,
                                width: `${(st.radius*2 / worldBounds.width) * 100}%`,
                                height: `${(st.radius*2 / worldBounds.height) * 100}%`,
                             }}
                          >
                             {st.id}
                          </div>
                       ))}
                       
                       {engine && Array.from(engine.doors.values()).map(door => (
                          <div 
                             key={door.id}
                             className="absolute rounded bg-yellow-400/50 border border-yellow-400 shadow-lg -translate-x-1/2 -translate-y-1/2 flex items-center justify-center font-bold text-yellow-300 uppercase text-[8px] animate-pulse"
                             style={{
                                left: `${(door.pos.x / worldBounds.width) * 100}%`,
                                top: `${(door.pos.y / worldBounds.height) * 100}%`,
                                width: `${(door.radius*2 / worldBounds.width) * 100}%`,
                                height: `${(door.radius*2 / worldBounds.height) * 100}%`,
                             }}
                          >
                             EXIT
                          </div>
                       ))}

                       {engine && Array.from(engine.enemies.values()).map(enemy => (
                          <div 
                             key={enemy.id}
                             className="absolute w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] -translate-x-1/2 -translate-y-1/2 z-10"
                             style={{
                                left: `${(enemy.pos.x / worldBounds.width) * 100}%`,
                                top: `${(enemy.pos.y / worldBounds.height) * 100}%`,
                             }}
                          />
                       ))}

                    </div>
                 </div>
              </div>
           </div>
        )}

        {/* Inventory Screen */}
        {showInventory && (
           <div className="absolute inset-x-8 top-8 bottom-32 bg-slate-900/95 border-2 border-slate-700 rounded-xl z-40 p-6 flex flex-col md:flex-row shadow-2xl backdrop-blur-md overflow-hidden animate-fade-in">
               <div className="w-full md:w-1/2 border-b-2 md:border-b-0 md:border-r-2 border-slate-700 pb-4 md:pb-0 md:pr-6 flex flex-col items-center">
                 <h2 className="text-2xl font-bold text-white mb-2">{saveData.player.name}</h2>
                 <p className="text-emerald-400 font-medium mb-4">Level {saveData.player.level}</p>
                 
                 <div className="relative w-full aspect-square max-w-[300px] bg-slate-800 rounded-xl overflow-visible border-2 border-slate-700 shadow-inner">
                    {/* Tiny inline 3D Canvas for player in inventory */}
                    <div className="absolute inset-0 z-0">
                       <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80&fm=jpg&crop=entropy" className="w-full h-full object-cover opacity-20 sepia" alt="backdrop" />
                    </div>
                    
                    {/* CSS 3D fallback or placeholder for character */}
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                       {/* Extremely simple CSS representation of player */}
                       <div className="w-12 h-20 bg-emerald-500 rounded relative shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                          <div className="w-8 h-8 rounded bg-emerald-300 absolute -top-8 left-2" />
                       </div>
                    </div>

                    {/* Equipment slots around the border */}
                    <div className="absolute top-2 left-2 z-20 flex flex-col gap-2">
                       <EquipSlot type="melee" item={saveData.player.inventory.find(i => i.id === saveData.player.equipment?.melee)} />
                       <EquipSlot type="ranged" item={saveData.player.inventory.find(i => i.id === saveData.player.equipment?.ranged)} />
                    </div>
                    <div className="absolute top-2 right-2 z-20 flex flex-col gap-2">
                       <EquipSlot type="armor" item={saveData.player.inventory.find(i => i.id === saveData.player.equipment?.armor)} />
                    </div>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                       <EquipSlot type="artifact" item={saveData.player.inventory.find(i => i.id === saveData.player.equipment?.artifact1)} />
                       <EquipSlot type="artifact" item={saveData.player.inventory.find(i => i.id === saveData.player.equipment?.artifact2)} />
                       <EquipSlot type="artifact" item={saveData.player.inventory.find(i => i.id === saveData.player.equipment?.artifact3)} />
                    </div>
                 </div>

                 <div className="mt-4 w-full bg-slate-800 p-4 rounded-lg">
                    <p className="text-sm text-slate-400">Power</p>
                    <p className="text-4xl font-bold text-white mb-4">15</p>
                    <div className="space-y-2 mt-2 text-sm font-medium">
                       <div className="flex justify-between"><span className="text-slate-400">Health</span><span className="text-white">{saveData.player.stats.maxHp}</span></div>
                       <div className="flex justify-between"><span className="text-slate-400">Attack</span><span className="text-white">{saveData.player.stats.attack}</span></div>
                    </div>
                 </div>
              </div>

              <div className="w-full md:w-1/2 md:pl-6 pt-4 md:pt-0 overflow-y-auto">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white tracking-wide">Inventory</h2>
                    <button onClick={() => setShowInventory(false)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-1 rounded">Close</button>
                 </div>
                 
                 {saveData.player.inventory.length === 0 ? (
                    <div className="text-slate-500 text-center py-10">Your bag is empty.</div>
                 ) : (
                    <div className="grid grid-cols-4 lg:grid-cols-5 gap-3">
                       {saveData.player.inventory.map(item => (
                          <div 
                             key={item.id} 
                             className="bg-slate-800/80 border-2 border-slate-600 aspect-square rounded-xl drop-shadow hover:border-emerald-500 cursor-pointer relative flex items-center justify-center overflow-hidden group"
                             onClick={() => alert(`Equip placeholder for ${item.type}`)}
                          >
                             {/* Faux 3D Item Background effect */}
                             <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 group-hover:from-slate-600 z-0" />
                             
                             {/* Central 3D illusion icon */}
                             <div className="z-10 text-3xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] transform group-hover:scale-110 transition-transform">
                                {item.category === 'melee' ? '🗡️' :
                                 item.category === 'potion' ? '🧪' :
                                 item.category === 'armor' ? '🛡️' :
                                 item.category === 'ranged' ? '🏹' : '💎'}
                             </div>
                             
                             <div className="absolute inset-x-0 bottom-0 bg-slate-900/80 p-0.5 z-20">
                                <p className="text-[9px] text-slate-300 font-medium capitalize text-center truncate px-1">{item.type}</p>
                             </div>
                             {item.amount > 1 && (
                                <span className="absolute top-1 right-1 bg-slate-950/80 text-[10px] text-white px-1.5 py-0.5 rounded-full z-20 font-bold border border-slate-700">{item.amount}</span>
                             )}
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        )}
     </>
  );
}
