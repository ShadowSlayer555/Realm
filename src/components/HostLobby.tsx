import { useEffect, useState } from "react";
import { useStore } from "../store";
import { getSocket } from "../lib/socket";
import { ArrowLeft, Play, UserCheck, UserX } from "lucide-react";

interface JoinRequest {
  clientId: string;
  playerName: string;
  playerDetails: any;
}

export function HostLobby() {
  const { setView, saveData, setMultiplayerRole } = useStore();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [acceptedPlayers, setAcceptedPlayers] = useState<JoinRequest[]>([]);

  useEffect(() => {
    if (!saveData) return;
    const socket = getSocket();

    // Register as host
    socket.emit("register_host", {
      name: saveData.player.name,
      details: `Lvl ${saveData.player.level} Realm`
    });

    socket.on("join_request", (req: JoinRequest) => {
      setRequests(prev => [...prev, req]);
    });

    return () => {
      socket.off("join_request");
      // Could unregister host here, or when starting game
    };
  }, [saveData]);

  const handleResponse = (clientId: string, accepted: boolean) => {
    getSocket().emit("join_response", { clientId, accepted });
    
    // Move from requests to accepted if accepted
    if (accepted) {
      const req = requests.find(r => r.clientId === clientId);
      if (req) {
         setAcceptedPlayers(prev => [...prev, req]);
      }
    }
    
    setRequests(prev => prev.filter(r => r.clientId !== clientId));
  };

  const startGame = () => {
    setMultiplayerRole('host');
    setView('game');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white font-sans p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => setView('main')} 
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Your Realm Lobby</h1>
        <div className="w-9" /> {/* Spacer */}
      </div>

      <div className="max-w-2xl mx-auto w-full space-y-8">
        
        {/* Accepted Players */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-emerald-400">Party ({acceptedPlayers.length + 1})</h2>
          <div className="space-y-3">
             <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <span className="font-medium text-slate-200">{saveData?.player.name} (Host)</span>
             </div>
             {acceptedPlayers.map(p => (
                <div key={p.clientId} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <span className="font-medium text-slate-200">{p.playerName}</span>
                  <span className="text-xs text-slate-400 border border-slate-700 px-2 py-1 rounded bg-slate-900">Joined</span>
                </div>
             ))}
          </div>
        </div>

        {/* Pending Requests */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-amber-400">Join Requests</h2>
          {requests.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Waiting for travelers...</p>
          ) : (
            <div className="space-y-3">
               {requests.map(req => (
                  <div key={req.clientId} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <div>
                        <span className="font-medium text-slate-200 block">{req.playerName}</span>
                        <span className="text-xs text-slate-400">Lvl {req.playerDetails?.level}</span>
                    </div>
                    <div className="flex space-x-2">
                       <button 
                         onClick={() => handleResponse(req.clientId, false)}
                         className="p-2 bg-red-900/50 hover:bg-red-900 text-red-400 rounded-lg transition-colors border border-red-900"
                       >
                         <UserX className="w-5 h-5" />
                       </button>
                       <button 
                         onClick={() => handleResponse(req.clientId, true)}
                         className="p-2 bg-emerald-900/50 hover:bg-emerald-900 text-emerald-400 rounded-lg transition-colors border border-emerald-900"
                       >
                         <UserCheck className="w-5 h-5" />
                       </button>
                    </div>
                  </div>
               ))}
            </div>
          )}
        </div>

        <button 
          onClick={startGame}
          className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-bold transition-colors shadow-lg shadow-emerald-900/20"
        >
          <Play className="w-5 h-5" />
          <span>Enter Realm</span>
        </button>

      </div>
    </div>
  );
}
