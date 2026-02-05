export enum GameMode {
  SURVIVAL = 'survival',
  RUSH = 'rush',
  QUEST = 'quest',
  TUTORIAL = 'tutorial',
  TYPO = 'typo'
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
    baseSpawnInterval: 0.5,
    minSpawnInterval: 0.001,
    spawnDecayRate: 0.0,
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
  },
  [GameMode.QUEST]: {
    name: 'Quest',
    description: 'Complete missions with specific objectives and unlock new content!',
    baseSpawnInterval: 1.0,
    minSpawnInterval: 0.5,
    spawnDecayRate: 0.0,
    xpMultiplier: 1.0,
    enemySpeedMultiplier: 1.0,
    waveCountMultiplier: 1.0
  },
  [GameMode.TUTORIAL]: {
    name: 'Tutorial',
    description: 'Learn the basics of Crimsonland',
    baseSpawnInterval: 999,
    minSpawnInterval: 999,
    spawnDecayRate: 0,
    xpMultiplier: 1.0,
    enemySpeedMultiplier: 0.7,
    waveCountMultiplier: 0
  },
  [GameMode.TYPO]: {
    name: 'Typo Shooter',
    description: 'Type enemy names to kill them!',
    baseSpawnInterval: 3.5,
    minSpawnInterval: 0.1,
    spawnDecayRate: 0.0,
    xpMultiplier: 1.0,
    enemySpeedMultiplier: 0.5,
    waveCountMultiplier: 1.0
  }
};
