import { GameMode } from '../data/gameModes';

export interface HighScoreEntry {
  score: number;
  kills: number;
  level: number;
  time: number;
  date: number;
  mode?: GameMode;
}

const STORAGE_KEY = 'crimsonland_highscores';
const STORAGE_KEY_RUSH = 'crimsonland_highscores_rush';
const MAX_ENTRIES = 10;

export class HighScoreManager {
  private scores: Record<GameMode, HighScoreEntry[]> = {
    [GameMode.SURVIVAL]: [],
    [GameMode.RUSH]: []
  };

  constructor() {
    this.load();
  }

  private getStorageKey(mode: GameMode): string {
    return mode === GameMode.RUSH ? STORAGE_KEY_RUSH : STORAGE_KEY;
  }

  private load() {
    try {
      const survivalData = localStorage.getItem(STORAGE_KEY);
      if (survivalData) {
        this.scores[GameMode.SURVIVAL] = JSON.parse(survivalData);
      }

      const rushData = localStorage.getItem(STORAGE_KEY_RUSH);
      if (rushData) {
        this.scores[GameMode.RUSH] = JSON.parse(rushData);
      }
    } catch {
      this.scores = {
        [GameMode.SURVIVAL]: [],
        [GameMode.RUSH]: []
      };
    }
  }

  private save(mode: GameMode) {
    try {
      const key = this.getStorageKey(mode);
      localStorage.setItem(key, JSON.stringify(this.scores[mode]));
    } catch {
      // Storage full or unavailable
    }
  }

  addScore(kills: number, level: number, timeMs: number, mode: GameMode = GameMode.SURVIVAL): { rank: number; isHighScore: boolean } {
    const score = this.calculateScore(kills, level, timeMs, mode);
    const entry: HighScoreEntry = {
      score,
      kills,
      level,
      time: timeMs,
      date: Date.now(),
      mode
    };

    this.scores[mode].push(entry);
    this.scores[mode].sort((a, b) => b.score - a.score);

    const rank = this.scores[mode].indexOf(entry);
    const isHighScore = rank < MAX_ENTRIES;

    this.scores[mode] = this.scores[mode].slice(0, MAX_ENTRIES);
    this.save(mode);

    return { rank: rank + 1, isHighScore };
  }

  private calculateScore(kills: number, level: number, timeMs: number, mode: GameMode): number {
    const timeBonus = Math.floor(timeMs / 1000);
    const baseScore = kills * 100 + level * 500 + timeBonus * 10;

    if (mode === GameMode.RUSH) {
      return Math.floor(baseScore * 1.2);
    }

    return baseScore;
  }

  getScores(mode: GameMode = GameMode.SURVIVAL): HighScoreEntry[] {
    return [...this.scores[mode]];
  }

  getHighScore(mode: GameMode = GameMode.SURVIVAL): number {
    return this.scores[mode].length > 0 ? this.scores[mode][0].score : 0;
  }

  clearScores(mode?: GameMode) {
    if (mode) {
      this.scores[mode] = [];
      this.save(mode);
    } else {
      this.scores = {
        [GameMode.SURVIVAL]: [],
        [GameMode.RUSH]: []
      };
      this.save(GameMode.SURVIVAL);
      this.save(GameMode.RUSH);
    }
  }

  formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  }
}
