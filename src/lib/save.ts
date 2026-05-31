import { GameSave, PlayerData } from "../types";
import { v4 as uuidv4 } from "uuid";

const DEFAULT_PLAYER: PlayerData = {
  id: uuidv4(),
  name: "Hero_" + Math.floor(Math.random() * 1000),
  level: 1,
  xp: 0,
  inventory: [],
  equipment: {},
  stats: {
    hp: 100,
    maxHp: 100,
    mana: 50,
    maxMana: 50,
    attack: 10,
  },
  tutorialCompleted: false
};

export function createNewSave(): GameSave {
  return {
    version: 1,
    timestamp: new Date().toISOString(),
    player: { ...DEFAULT_PLAYER },
  };
}

// Obfuscate the save file by taking JSON -> text -> URI encode -> base64
export function encodeSave(save: GameSave): string {
  try {
    const jsonStr = JSON.stringify(save);
    // encodeURIComponent solves the multi-byte char issues with btoa
    const encodedStr = btoa(encodeURIComponent(jsonStr));
    // Optional: could add a simple XOR cipher here, but btoa is obfuscation enough for "cryptic"
    return encodedStr;
  } catch (err) {
    console.error("Failed to encode save", err);
    return "";
  }
}

export function decodeSave(encodedStr: string): GameSave | null {
  try {
    const jsonStr = decodeURIComponent(atob(encodedStr));
    const save = JSON.parse(jsonStr) as GameSave;
    if (save && save.version) {
      return save;
    }
    return null;
  } catch (err) {
    console.error("Failed to decode save", err);
    return null;
  }
}

export function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) { 
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
