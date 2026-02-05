import { GameMode } from '../data/gameModes';
import { PerkId } from '../data/perks';

export interface QuestProgress {
  questId: string;
  completed: boolean;
  bestTimeMs: number;
}

export interface SaveData {
  version: number;
  playerName: string;
  unlockedWeapons: number[];
  unlockedPerks: PerkId[];
  questProgress: Record<string, QuestProgress>;
  questUnlockIndex: number;
  modePlayCounts: Record<string, number>;
  lastActiveMode: GameMode;
  settings: {
    soundVolume: number;
    musicVolume: number;
  };
}

const STORAGE_KEY = 'crimsonland_save';
const SAVE_VERSION = 1;

const DEFAULT_WEAPONS = [1, 2, 3, 4, 5];
const DEFAULT_PERKS: PerkId[] = [];

const DEFAULT_SAVE: SaveData = {
  version: SAVE_VERSION,
  playerName: '',
  unlockedWeapons: [...DEFAULT_WEAPONS],
  unlockedPerks: [...DEFAULT_PERKS],
  questProgress: {},
  questUnlockIndex: 0,
  modePlayCounts: {},
  lastActiveMode: GameMode.SURVIVAL,
  settings: {
    soundVolume: 1.0,
    musicVolume: 0.7
  }
};

export class SaveManager {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.version === SAVE_VERSION) {
          return { ...DEFAULT_SAVE, ...parsed };
        }
        return this.migrate(parsed);
      }
    } catch {}
    return { ...DEFAULT_SAVE };
  }

  private migrate(oldData: any): SaveData {
    const newData = { ...DEFAULT_SAVE };
    if (oldData.playerName) newData.playerName = oldData.playerName;
    if (oldData.unlockedWeapons) newData.unlockedWeapons = oldData.unlockedWeapons;
    if (oldData.unlockedPerks) newData.unlockedPerks = oldData.unlockedPerks;
    if (oldData.questProgress) newData.questProgress = oldData.questProgress;
    if (oldData.questUnlockIndex) newData.questUnlockIndex = oldData.questUnlockIndex;
    if (oldData.settings) newData.settings = { ...newData.settings, ...oldData.settings };
    return newData;
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {}
  }

  getPlayerName(): string {
    return this.data.playerName;
  }

  setPlayerName(name: string) {
    this.data.playerName = name.trim().substring(0, 20);
    this.save();
  }

  isWeaponUnlocked(weaponId: number): boolean {
    return this.data.unlockedWeapons.includes(weaponId);
  }

  unlockWeapon(weaponId: number) {
    if (!this.data.unlockedWeapons.includes(weaponId)) {
      this.data.unlockedWeapons.push(weaponId);
      this.save();
    }
  }

  getUnlockedWeapons(): number[] {
    return [...this.data.unlockedWeapons];
  }

  isPerkUnlocked(perkId: PerkId): boolean {
    return this.data.unlockedPerks.includes(perkId);
  }

  unlockPerk(perkId: PerkId) {
    if (!this.data.unlockedPerks.includes(perkId)) {
      this.data.unlockedPerks.push(perkId);
      this.save();
    }
  }

  getUnlockedPerks(): PerkId[] {
    return [...this.data.unlockedPerks];
  }

  getQuestProgress(questId: string): QuestProgress | undefined {
    return this.data.questProgress[questId];
  }

  setQuestProgress(questId: string, completed: boolean, timeMs: number) {
    const existing = this.data.questProgress[questId];
    if (!existing) {
      this.data.questProgress[questId] = { questId, completed, bestTimeMs: timeMs };
    } else {
      if (completed && !existing.completed) {
        existing.completed = true;
      }
      if (timeMs > 0 && (existing.bestTimeMs === 0 || timeMs < existing.bestTimeMs)) {
        existing.bestTimeMs = timeMs;
      }
    }
    this.save();
  }

  getQuestUnlockIndex(): number {
    return this.data.questUnlockIndex;
  }

  setQuestUnlockIndex(index: number) {
    if (index > this.data.questUnlockIndex) {
      this.data.questUnlockIndex = index;
      this.save();
    }
  }

  incrementModePlayCount(mode: GameMode) {
    const key = mode as string;
    this.data.modePlayCounts[key] = (this.data.modePlayCounts[key] || 0) + 1;
    this.save();
  }

  getModePlayCount(mode: GameMode): number {
    return this.data.modePlayCounts[mode as string] || 0;
  }

  setLastActiveMode(mode: GameMode) {
    this.data.lastActiveMode = mode;
    this.save();
  }

  getLastActiveMode(): GameMode {
    return this.data.lastActiveMode;
  }

  getSoundVolume(): number {
    return this.data.settings.soundVolume;
  }

  setSoundVolume(volume: number) {
    this.data.settings.soundVolume = Math.max(0, Math.min(1, volume));
    this.save();
  }

  getMusicVolume(): number {
    return this.data.settings.musicVolume;
  }

  setMusicVolume(volume: number) {
    this.data.settings.musicVolume = Math.max(0, Math.min(1, volume));
    this.save();
  }

  resetProgress() {
    this.data = {
      ...DEFAULT_SAVE,
      playerName: this.data.playerName,
      settings: this.data.settings
    };
    this.save();
  }

  resetAll() {
    this.data = { ...DEFAULT_SAVE };
    this.save();
  }

  exportSave(): string {
    return btoa(JSON.stringify(this.data));
  }

  importSave(encoded: string): boolean {
    try {
      const decoded = JSON.parse(atob(encoded));
      if (decoded.version) {
        this.data = decoded.version === SAVE_VERSION ? decoded : this.migrate(decoded);
        this.save();
        return true;
      }
    } catch {}
    return false;
  }
}
