export interface InventoryItem {
  id: string;
  type: string;
  amount: number;
  isEquipped?: boolean;
}

export interface PlayerData {
  id: string; // uuid
  name: string;
  level: number;
  xp: number;
  inventory: InventoryItem[]; // items
  stats: {
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    attack: number;
  };
  tutorialCompleted: boolean;
}

// Represent the online lobby host info
export interface HostInfo {
  id: string;      // socket id of the host
  name: string;    // host player name
  details: string; // e.g., "Exploring Caves, Level 5"
}

// Encrypted / Obfuscated Save File Structure
export interface GameSave {
  version: number;
  timestamp: string;
  player: PlayerData;
}
