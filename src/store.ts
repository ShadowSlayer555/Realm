import { create } from 'zustand';
import { GameSave, HostInfo, PlayerData, InventoryItem } from './types';
import { createNewSave, encodeSave, triggerDownload } from './lib/save';
import { v4 as uuidv4 } from "uuid";

interface PickupNotification {
  id: string;
  type: string;
  amount: number;
}

interface GameState {
  // Navigation
  currentView: 'main' | 'lobby_browser' | 'host_lobby' | 'game';
  setView: (view: 'main' | 'lobby_browser' | 'host_lobby' | 'game') => void;

  // Local Save Data
  saveData: GameSave | null;
  loadSave: (save: GameSave) => void;
  exportSave: () => void;
  initializeSave: () => void; // call on boot, creates new save if null
  addToInventory: (type: string, amount: number) => void;
  addXp: (amount: number) => void;

  // HUD state
  notifications: PickupNotification[];
  removeNotification: (id: string) => void;
  showXpScale: number; // to temporarily show the XP bar


  // Multiplayer State
  isHost: boolean;
  setIsHost: (isHost: boolean) => void;
  multiplayerRole: 'solo' | 'host' | 'client' | null;
  setMultiplayerRole: (role: 'solo' | 'host' | 'client' | null) => void;
  
  // Hosted Session Info
  activeConnectedPeers: string[];
  addPeer: (id: string) => void;
  removePeer: (id: string) => void;
  
  // Game session dynamic data (the connected host's ID, or null)
  connectedHostId: string | null;
  setConnectedHostId: (id: string | null) => void;
}

export const useStore = create<GameState>((set, get) => ({
  currentView: 'main',
  setView: (view) => set({ currentView: view }),

  saveData: null,
  loadSave: (save) => set({ saveData: save }),
  exportSave: () => {
    const { saveData } = get();
    if (!saveData) return;
    const encoded = encodeSave(saveData);
    triggerDownload(encoded, `DungeonSave_${saveData.player.name}.sav`);
  },
  initializeSave: () => {
    if (!get().saveData) {
      set({ saveData: createNewSave() });
    }
  },
  
  notifications: [],
  removeNotification: (id) => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })),
  showXpScale: 0,
  
  addXp: (amount) => {
     set(state => {
       if (!state.saveData) return state;
       let newXp = state.saveData.player.xp + amount;
       let newLevel = state.saveData.player.level;
       // Very simple leveling curve
       const xpRequired = newLevel * 100;
       if (newXp >= xpRequired) {
          newLevel++;
          newXp -= xpRequired;
       }
       return {
          showXpScale: 1, // trigger animation
          saveData: {
             ...state.saveData,
             player: { ...state.saveData.player, xp: newXp, level: newLevel }
          }
       }
     });
     // hide after a bit
     setTimeout(() => set({ showXpScale: 0 }), 3000);
  },

  addToInventory: (type: string, amount: number) => {
    const notifId = uuidv4();
    set((state) => {
      const newNotifs = [...state.notifications, { id: notifId, type, amount }];

      if (!state.saveData) return { notifications: newNotifs };
      const { player } = state.saveData;
      const existing = player.inventory.find(i => i.type === type);
      
      const newInventory = existing 
         ? player.inventory.map(i => i.type === type ? { ...i, amount: i.amount + amount } : i)
         : [...player.inventory, { id: uuidv4(), type, amount, isEquipped: false }];

      return {
        notifications: newNotifs,
        saveData: {
          ...state.saveData,
          player: {
            ...player,
            inventory: newInventory
          }
        }
      };
    });
    setTimeout(() => get().removeNotification(notifId), 2500);
  },

  isHost: false,
  setIsHost: (isHost) => set({ isHost }),
  
  multiplayerRole: null,
  setMultiplayerRole: (role) => set({ multiplayerRole: role, isHost: role === 'host' }),

  activeConnectedPeers: [],
  addPeer: (id) => set((state) => ({ activeConnectedPeers: [...state.activeConnectedPeers, id] })),
  removePeer: (id) => set((state) => ({ activeConnectedPeers: state.activeConnectedPeers.filter((p) => p !== id) })),

  connectedHostId: null,
  setConnectedHostId: (id) => set({ connectedHostId: id }),
}));
