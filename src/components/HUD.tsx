import { useEffect, useState } from "react";
import { useStore } from "../store";

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

export function HUD({ localHp, localMaxHp, localPos, worldBounds, showMap, setShowMap }: { localHp: number, localMaxHp: number, localPos?: {x: number, y: number}, worldBounds?: {width: number, height: number}, showMap: boolean, setShowMap: (val: boolean) => void }) {
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

           {/* Toolbar Quick Slots */}
           <div className="bg-slate-900/95 border-b-2 border-slate-800 px-2 py-2 flex gap-1 h-16 shadow-2xl backdrop-blur-md relative overflow-visible">
              <button className="w-12 h-12 bg-slate-800 border-2 border-slate-600 rounded flex items-center justify-center hover:bg-slate-700 text-slate-400 font-bold text-sm relative outline-none focus:border-emerald-500">
                 1
              </button>
              <button className="w-12 h-12 bg-slate-800 border-2 border-slate-600 rounded flex items-center justify-center hover:bg-slate-700 text-slate-400 font-bold text-sm relative outline-none focus:border-emerald-500">
                 2
              </button>
              <button className="w-12 h-12 bg-slate-800 border-2 border-slate-600 rounded flex items-center justify-center hover:bg-slate-700 text-slate-400 font-bold text-sm relative outline-none focus:border-emerald-500">
                 3
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

        {/* Circular Mini Map Overlay */}
        {showMap && localPos && worldBounds && (
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-96 md:h-96 rounded-full bg-slate-900/90 border-4 border-slate-700 shadow-2xl overflow-hidden z-30 pointer-events-none fade-in">
              {/* Map background/grid */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30" />
              
              {/* Central Player Blip */}
              <div 
                 className="absolute w-4 h-4 rounded-full bg-red-500 shadow-[0_0_10px_red]"
                 style={{ 
                   left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                   animation: 'pulse 1.5s infinite' 
                 }} 
              />
              <style>{`
                 @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                 }
              `}</style>

              {/* Just indicate full bounds logically relative to center */}
              {/* In a real game we would position other POIs using (x - localPos.x)/scale */}
           </div>
        )}

        {/* Inventory Screen */}
        {showInventory && (
           <div className="absolute inset-x-8 top-8 bottom-32 bg-slate-900/95 border-2 border-slate-700 rounded-xl z-40 p-6 flex flex-col md:flex-row shadow-2xl backdrop-blur-md overflow-hidden animate-fade-in">
              <div className="w-full md:w-1/3 border-b-2 md:border-b-0 md:border-r-2 border-slate-700 pb-4 md:pb-0 md:pr-6 flex flex-col">
                 <h2 className="text-2xl font-bold text-white mb-2">{saveData.player.name}</h2>
                 <p className="text-emerald-400 font-medium">Level {saveData.player.level}</p>
                 <div className="mt-4 bg-slate-800 p-4 rounded-lg flex-1">
                    <p className="text-sm text-slate-400">Power</p>
                    <p className="text-4xl font-bold text-white mb-4">15</p>
                    <div className="space-y-2 mt-4 text-sm font-medium">
                       <div className="flex justify-between"><span className="text-slate-400">Health</span><span className="text-white">{saveData.player.stats.maxHp}</span></div>
                       <div className="flex justify-between"><span className="text-slate-400">Attack</span><span className="text-white">{saveData.player.stats.attack}</span></div>
                    </div>
                 </div>
              </div>
              <div className="w-full md:w-2/3 md:pl-6 pt-4 md:pt-0 overflow-y-auto">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white tracking-wide">Inventory</h2>
                    <button onClick={() => setShowInventory(false)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-1 rounded">Close</button>
                 </div>
                 
                 {saveData.player.inventory.length === 0 ? (
                    <div className="text-slate-500 text-center py-10">Your bag is empty.</div>
                 ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                       {saveData.player.inventory.map(item => (
                          <div key={item.id || item.type} className="bg-slate-800 border-2 border-slate-700 aspect-square rounded drop-shadow hover:border-emerald-500 cursor-pointer relative flex items-center justify-center">
                             <span className="text-[10px] text-slate-300 font-medium capitalize absolute bottom-1 truncate px-1 w-full text-center">{item.type}</span>
                             <span className="absolute top-1 right-1 bg-slate-900 border border-slate-700 text-[10px] text-white px-1 rounded-sm">{item.amount}</span>
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
