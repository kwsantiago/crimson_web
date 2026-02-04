export enum CreatureType {
  ZOMBIE = 'zombie',
  FAST_ZOMBIE = 'fast_zombie',
  SPIDER = 'spider',
  SPIDER_MOTHER = 'spider_mother',
  ALIEN = 'alien'
}

export interface CreatureData {
  type: CreatureType;
  name: string;
  health: number;
  speed: number;
  damage: number;
  xp: number;
  radius: number;
  scale: number;
  tint: number;
  isRanged: boolean;
  projectileCooldown?: number;
  spawnsOnDeath?: CreatureType;
  spawnCount?: number;
}

export const CREATURES: Record<CreatureType, CreatureData> = {
  [CreatureType.ZOMBIE]: {
    type: CreatureType.ZOMBIE,
    name: 'Zombie',
    health: 20,
    speed: 40,
    damage: 10,
    xp: 10,
    radius: 14,
    scale: 1.0,
    tint: 0xff6b6b,
    isRanged: false
  },
  [CreatureType.FAST_ZOMBIE]: {
    type: CreatureType.FAST_ZOMBIE,
    name: 'Fast Zombie',
    health: 15,
    speed: 80,
    damage: 8,
    xp: 15,
    radius: 12,
    scale: 0.9,
    tint: 0xcc4444,
    isRanged: false
  },
  [CreatureType.SPIDER]: {
    type: CreatureType.SPIDER,
    name: 'Spider',
    health: 8,
    speed: 120,
    damage: 5,
    xp: 8,
    radius: 8,
    scale: 0.6,
    tint: 0x9b59b6,
    isRanged: false
  },
  [CreatureType.SPIDER_MOTHER]: {
    type: CreatureType.SPIDER_MOTHER,
    name: 'Spider Mother',
    health: 50,
    speed: 60,
    damage: 15,
    xp: 50,
    radius: 20,
    scale: 1.5,
    tint: 0x8e44ad,
    isRanged: false,
    spawnsOnDeath: CreatureType.SPIDER,
    spawnCount: 4
  },
  [CreatureType.ALIEN]: {
    type: CreatureType.ALIEN,
    name: 'Alien',
    health: 30,
    speed: 50,
    damage: 0,
    xp: 25,
    radius: 14,
    scale: 1.0,
    tint: 0x27ae60,
    isRanged: true,
    projectileCooldown: 2.0
  }
};

export function getCreatureData(type: CreatureType): CreatureData {
  return CREATURES[type];
}
