import { GameMode } from '../data/gameModes';

export interface HighScoreEntry {
  name: string;
  score: number;
  kills: number;
  level: number;
  time: number;
  date: number;
  accuracy?: number;
  weaponId?: number;
  mode?: GameMode;
}

const STORAGE_KEY = 'crimsonland_highscores';
const STORAGE_KEY_RUSH = 'crimsonland_highscores_rush';
const STORAGE_KEY_TYPO = 'crimsonland_highscores_typo';
const MAX_ENTRIES = 10;

export class HighScoreManager {
  private scores: Partial<Record<GameMode, HighScoreEntry[]>> = {
    [GameMode.SURVIVAL]: [],
    [GameMode.RUSH]: [],
    [GameMode.TYPO]: []
  };

  constructor() {
    this.load();
  }

  private getScoresList(mode: GameMode): HighScoreEntry[] {
    if (!this.scores[mode]) {
      this.scores[mode] = [];
    }
    return this.scores[mode]!;
  }

  private getStorageKey(mode: GameMode): string {
    if (mode === GameMode.RUSH) return STORAGE_KEY_RUSH;
    if (mode === GameMode.TYPO) return STORAGE_KEY_TYPO;
    return STORAGE_KEY;
  }

  private load() {
    try {
      const survivalData = localStorage.getItem(STORAGE_KEY);
      if (survivalData) {
        const parsed = JSON.parse(survivalData);
        this.scores[GameMode.SURVIVAL] = parsed.map((e: any) => ({
          name: e.name || '',
          ...e
        }));
      }

      const rushData = localStorage.getItem(STORAGE_KEY_RUSH);
      if (rushData) {
        const parsed = JSON.parse(rushData);
        this.scores[GameMode.RUSH] = parsed.map((e: any) => ({
          name: e.name || '',
          ...e
        }));
      }

      const typoData = localStorage.getItem(STORAGE_KEY_TYPO);
      if (typoData) {
        const parsed = JSON.parse(typoData);
        this.scores[GameMode.TYPO] = parsed.map((e: any) => ({
          name: e.name || '',
          ...e
        }));
      }
    } catch {
      this.scores = {
        [GameMode.SURVIVAL]: [],
        [GameMode.RUSH]: [],
        [GameMode.TYPO]: []
      };
    }
  }

  private save(mode: GameMode) {
    try {
      const key = this.getStorageKey(mode);
      localStorage.setItem(key, JSON.stringify(this.scores[mode]));
    } catch {}
  }

  addScore(
    kills: number,
    level: number,
    timeMs: number,
    mode: GameMode = GameMode.SURVIVAL,
    name: string = '',
    accuracy?: number,
    weaponId?: number,
    experience?: number
  ): { rank: number; isHighScore: boolean; entry: HighScoreEntry } {
    const score = mode === GameMode.RUSH ? timeMs : (experience ?? 0);
    const entry: HighScoreEntry = {
      name: name.trim().substring(0, 20),
      score,
      kills,
      level,
      time: timeMs,
      date: Date.now(),
      accuracy,
      weaponId,
      mode
    };

    const scoresList = this.getScoresList(mode);
    const insertIndex = this.findInsertIndex(mode, score);
    scoresList.splice(insertIndex, 0, entry);
    this.scores[mode] = scoresList.slice(0, MAX_ENTRIES);
    this.save(mode);

    const rank = insertIndex;
    const isHighScore = rank < MAX_ENTRIES;

    return { rank, isHighScore, entry };
  }

  private findInsertIndex(mode: GameMode, score: number): number {
    const scores = this.getScoresList(mode);
    for (let i = 0; i < scores.length; i++) {
      if (score > scores[i].score) {
        return i;
      }
    }
    return scores.length;
  }

  updateEntryName(mode: GameMode, rank: number, name: string) {
    const scoresList = this.getScoresList(mode);
    if (rank >= 0 && rank < scoresList.length) {
      scoresList[rank].name = name.trim().substring(0, 20);
      this.save(mode);
    }
  }

  isNewHighScore(score: number, mode: GameMode): boolean {
    const scoresList = this.getScoresList(mode);
    if (scoresList.length < MAX_ENTRIES) return true;
    const lowestScore = scoresList[scoresList.length - 1]?.score || 0;
    return score > lowestScore;
  }

  getScores(mode: GameMode = GameMode.SURVIVAL): HighScoreEntry[] {
    return [...this.getScoresList(mode)];
  }

  getHighScore(mode: GameMode = GameMode.SURVIVAL): number {
    const scoresList = this.getScoresList(mode);
    return scoresList.length > 0 ? scoresList[0].score : 0;
  }

  getTopEntry(mode: GameMode = GameMode.SURVIVAL): HighScoreEntry | null {
    const scoresList = this.getScoresList(mode);
    return scoresList.length > 0 ? { ...scoresList[0] } : null;
  }

  clearScores(mode?: GameMode) {
    if (mode) {
      this.scores[mode] = [];
      this.save(mode);
    } else {
      this.scores = {
        [GameMode.SURVIVAL]: [],
        [GameMode.RUSH]: [],
        [GameMode.TYPO]: []
      };
      this.save(GameMode.SURVIVAL);
      this.save(GameMode.RUSH);
      this.save(GameMode.TYPO);
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

  formatScore(score: number): string {
    return score.toLocaleString();
  }
}
