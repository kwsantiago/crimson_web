import { CreatureType, CREATURES } from '../data/creatures';

const STORAGE_KEY = 'crimsonland_stats';

export interface GameStats {
  totalKills: number;
  totalPlayTimeMs: number;
  totalShotsFired: number;
  totalShotsHit: number;
  totalGamesPlayed: number;
  killsByCreature: Partial<Record<CreatureType, number>>;
  highestLevel: number;
  longestSurvivalMs: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  perksSelected: number;
  weaponsPickedUp: number;
  powerupsCollected: number;
}

const DEFAULT_STATS: GameStats = {
  totalKills: 0,
  totalPlayTimeMs: 0,
  totalShotsFired: 0,
  totalShotsHit: 0,
  totalGamesPlayed: 0,
  killsByCreature: {},
  highestLevel: 1,
  longestSurvivalMs: 0,
  totalDamageDealt: 0,
  totalDamageTaken: 0,
  perksSelected: 0,
  weaponsPickedUp: 0,
  powerupsCollected: 0
};

export class StatsManager {
  private stats: GameStats;

  constructor() {
    this.stats = this.load();
  }

  private load(): GameStats {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return { ...DEFAULT_STATS, ...parsed };
      }
    } catch {
    }
    return { ...DEFAULT_STATS };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stats));
    } catch {
    }
  }

  recordKill(creatureType: CreatureType) {
    this.stats.totalKills++;
    this.stats.killsByCreature[creatureType] =
      (this.stats.killsByCreature[creatureType] ?? 0) + 1;
  }

  recordShot(hit: boolean) {
    this.stats.totalShotsFired++;
    if (hit) this.stats.totalShotsHit++;
  }

  recordDamageDealt(amount: number) {
    this.stats.totalDamageDealt += amount;
  }

  recordDamageTaken(amount: number) {
    this.stats.totalDamageTaken += amount;
  }

  recordPerkSelected() {
    this.stats.perksSelected++;
  }

  recordWeaponPickup() {
    this.stats.weaponsPickedUp++;
  }

  recordPowerupCollected() {
    this.stats.powerupsCollected++;
  }

  recordGameEnd(playTimeMs: number, level: number) {
    this.stats.totalGamesPlayed++;
    this.stats.totalPlayTimeMs += playTimeMs;
    if (playTimeMs > this.stats.longestSurvivalMs) {
      this.stats.longestSurvivalMs = playTimeMs;
    }
    if (level > this.stats.highestLevel) {
      this.stats.highestLevel = level;
    }
    this.save();
  }

  getAccuracy(): number {
    if (this.stats.totalShotsFired === 0) return 0;
    return (this.stats.totalShotsHit / this.stats.totalShotsFired) * 100;
  }

  getStats(): GameStats {
    return { ...this.stats };
  }

  getKillsByCreature(): { type: CreatureType; name: string; count: number }[] {
    const result: { type: CreatureType; name: string; count: number }[] = [];
    for (const [type, count] of Object.entries(this.stats.killsByCreature)) {
      const creatureType = type as CreatureType;
      const data = CREATURES[creatureType];
      if (data && count && count > 0) {
        result.push({ type: creatureType, name: data.name, count });
      }
    }
    result.sort((a, b) => b.count - a.count);
    return result;
  }

  formatPlayTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  resetStats() {
    this.stats = { ...DEFAULT_STATS };
    this.save();
  }
}
