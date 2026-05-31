import { useEffect, useState } from "react";
import { useStore } from "../store";
import { getSocket } from "../lib/socket";
import { HostInfo } from "../types";
import { ArrowLeft, RefreshCw, Users } from "lucide-react";

export function LobbyBrowser() {
  const { setView, saveData, setConnectedHostId, setMultiplayerRole } = useStore();
  const [hosts, setHosts] = useState<HostInfo[]>([]);
  const [requestingHostId, setRequestingHostId] = useState<string | null>(null);
  
  useEffect(() => {
    const socket = getSocket();
    
    // Listen for hosts list updates
    socket.on("hosts_list", (data: HostInfo[]) => {
      setHosts(data);
    });

    // Request the initial list
    socket.emit("get_hosts");

    // Listen for join response
    socket.on("join_result", (data: { hostId: string, accepted: boolean, reason?: string }) => {
      if (data.accepted) {
        setConnectedHostId(data.hostId);
        setMultiplayerRole('client');
        setView('game'); // Move to game screen once connected
      } else {
        alert("Join request declined: " + (data.reason || "No reason given."));
        setRequestingHostId(null);
      }
    });

    return () => {
      socket.off("hosts_list");
      socket.off("join_result");
    };
  }, [setView, setConnectedHostId, setMultiplayerRole]);

  const handleRefresh = () => {
    getSocket().emit("get_hosts");
  };

  const requestJoin = (hostId: string) => {
    if (!saveData) return;
    setRequestingHostId(hostId);
    getSocket().emit("request_join", {
      hostId,
      playerName: saveData.player.name,
      playerDetails: {
        level: saveData.player.level,
        stats: saveData.player.stats,
      }
    });
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
        <h1 className="text-2xl font-bold tracking-tight">Active Realms</h1>
        <button 
          onClick={handleRefresh}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5 text-slate-300" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 max-w-2xl mx-auto w-full">
        {hosts.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <GlobeIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No realms are currently open.</p>
          </div>
        ) : (
          hosts.map(host => (
             <div key={host.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-md">
                <div>
                   <h3 className="font-semibold text-lg text-slate-100">{host.name}'s Realm</h3>
                   <div className="flex items-center text-sm text-slate-400 mt-1">
                     <Users className="w-4 h-4 mr-1 inline" />
                     <span>{host.details}</span>
                   </div>
                </div>
                <button
                  onClick={() => requestJoin(host.id)}
                  disabled={requestingHostId === host.id}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium transition-colors"
                >
                  {requestingHostId === host.id ? 'Requesting...' : 'Join'}
                </button>
             </div>
          ))
        )}
      </div>
    </div>
  );
}

function GlobeIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  );
}
