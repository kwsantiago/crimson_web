export enum GameMode {
  SURVIVAL = 'survival',
  RUSH = 'rush'
}

export interface GameModeConfig {
  name: string;
  description: string;
  baseSpawnInterval: number;
  minSpawnInterval: number;
  spawnDecayRate: number;
  xpMultiplier: number;
  enemySpeedMultiplier: number;
  waveCountMultiplier: number;
}

export const GAME_MODE_CONFIGS: Record<GameMode, GameModeConfig> = {
  [GameMode.SURVIVAL]: {
    name: 'Survival',
    description: 'Classic endless mode. Survive as long as you can!',
    baseSpawnInterval: 2.0,
    minSpawnInterval: 0.5,
    spawnDecayRate: 0.3,
    xpMultiplier: 1.0,
    enemySpeedMultiplier: 1.0,
    waveCountMultiplier: 1.0
  },
  [GameMode.RUSH]: {
    name: 'Rush',
    description: 'Fast-paced action with faster spawns and more XP!',
    baseSpawnInterval: 0.5,
    minSpawnInterval: 0.25,
    spawnDecayRate: 0.1,
    xpMultiplier: 1.5,
    enemySpeedMultiplier: 1.3,
    waveCountMultiplier: 1.5
  }
};
