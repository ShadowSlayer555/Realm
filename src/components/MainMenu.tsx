import { useStore } from "../store";
import { useEffect, useRef } from "react";
import { decodeSave } from "../lib/save";
import { Upload, Download, Play, Globe, Shield } from "lucide-react";

export function MainMenu() {
  const { setView, exportSave, initializeSave, saveData, loadSave } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initializeSave();
  }, [initializeSave]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const save = decodeSave(content);
      if (save) {
        loadSave(save);
        alert(`Loaded save for ${save.player.name}`);
      } else {
        alert("Failed to read save file. It may be corrupted or in an invalid format.");
      }
    };
    reader.readAsText(file);
  };

  if (!saveData) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6 font-sans">
      <div className="absolute top-8 text-center">
         <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-emerald-400 mb-2">Dungeon Quest</h1>
         <p className="text-slate-400 uppercase tracking-widest text-sm">Realms of Adventure</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-8 text-center shadow-lg">
           <h2 className="text-xl font-medium text-slate-200">{saveData.player.name}</h2>
           <div className="flex items-center justify-center space-x-4 mt-2 text-sm text-slate-400">
             <span>Lvl: {saveData.player.level}</span>
             <span>|</span>
             <span>HP: {saveData.player.stats.maxHp}</span>
             <span>|</span>
             <span>ATK: {saveData.player.stats.attack}</span>
           </div>
        </div>

        <button 
          onClick={() => setView('host_lobby')}
          className="w-full flex items-center justify-center space-x-3 bg-emerald-600 hover:bg-emerald-500 text-white py-4 px-6 rounded-xl font-semibold transition-colors"
        >
          <Shield className="w-5 h-5" />
          <span>Host Game / Play Solo</span>
        </button>

        <button 
          onClick={() => setView('lobby_browser')}
          className="w-full flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-500 text-white py-4 px-6 rounded-xl font-semibold transition-colors"
        >
          <Globe className="w-5 h-5" />
          <span>Join Online Realm</span>
        </button>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <button 
            onClick={exportSave}
            className="flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 py-4 rounded-xl transition-colors text-slate-300"
          >
            <Download className="w-6 h-6 mb-2" />
            <span className="text-xs font-medium uppercase tracking-wider">Save</span>
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 py-4 rounded-xl transition-colors text-slate-300 relative overflow-hidden"
          >
            <Upload className="w-6 h-6 mb-2" />
            <span className="text-xs font-medium uppercase tracking-wider">Load</span>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".sav" 
              onChange={handleFileUpload}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
