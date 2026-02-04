export interface HighScoreEntry {
  score: number;
  kills: number;
  level: number;
  time: number;
  date: number;
}

const STORAGE_KEY = 'crimsonland_highscores';
const MAX_ENTRIES = 10;

export class HighScoreManager {
  private scores: HighScoreEntry[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.scores = JSON.parse(data);
      }
    } catch {
      this.scores = [];
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.scores));
    } catch {
      // Storage full or unavailable
    }
  }

  addScore(kills: number, level: number, timeMs: number): { rank: number; isHighScore: boolean } {
    const score = this.calculateScore(kills, level, timeMs);
    const entry: HighScoreEntry = {
      score,
      kills,
      level,
      time: timeMs,
      date: Date.now()
    };

    this.scores.push(entry);
    this.scores.sort((a, b) => b.score - a.score);

    const rank = this.scores.indexOf(entry);
    const isHighScore = rank < MAX_ENTRIES;

    this.scores = this.scores.slice(0, MAX_ENTRIES);
    this.save();

    return { rank: rank + 1, isHighScore };
  }

  private calculateScore(kills: number, level: number, timeMs: number): number {
    const timeBonus = Math.floor(timeMs / 1000);
    return kills * 100 + level * 500 + timeBonus * 10;
  }

  getScores(): HighScoreEntry[] {
    return [...this.scores];
  }

  getHighScore(): number {
    return this.scores.length > 0 ? this.scores[0].score : 0;
  }

  clearScores() {
    this.scores = [];
    this.save();
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
