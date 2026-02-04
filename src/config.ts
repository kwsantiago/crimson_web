export const WORLD_WIDTH = 1024;
export const WORLD_HEIGHT = 1024;
export const SCREEN_WIDTH = 800;
export const SCREEN_HEIGHT = 600;

export const PLAYER_BASE_SPEED = 150;
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_RADIUS = 12;

export const BULLET_SPEED = 500;
export const BULLET_DAMAGE = 12;
export const FIRE_RATE = 0.14;

export const ZOMBIE_SPEED = 40;
export const ZOMBIE_HEALTH = 20;
export const ZOMBIE_DAMAGE = 10;
export const ZOMBIE_XP = 10;
export const ZOMBIE_RADIUS = 14;

export const XP_PER_LEVEL_BASE = 100;
export const XP_MULTIPLIER = 1.5;

export function getXpForLevel(level: number): number {
  return Math.floor(XP_PER_LEVEL_BASE * Math.pow(XP_MULTIPLIER, level - 1));
}
