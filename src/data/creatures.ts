export enum CreatureType {
  ZOMBIE = 'zombie',
  FAST_ZOMBIE = 'fast_zombie',
  BIG_ZOMBIE = 'big_zombie',
  SPIDER = 'spider',
  BABY_SPIDER = 'baby_spider',
  SPIDER_MOTHER = 'spider_mother',
  ALIEN = 'alien',
  ALIEN_ELITE = 'alien_elite',
  ALIEN_BOSS = 'alien_boss',
  LIZARD = 'lizard',
  LIZARD_SPITTER = 'lizard_spitter',
  NEST = 'nest',
  BOSS = 'boss'
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
  isStationary?: boolean;
  spawnTimer?: number;
  spawnType?: CreatureType;
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
  [CreatureType.BIG_ZOMBIE]: {
    type: CreatureType.BIG_ZOMBIE,
    name: 'Big Zombie',
    health: 60,
    speed: 25,
    damage: 20,
    xp: 35,
    radius: 18,
    scale: 1.4,
    tint: 0x993333,
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
  [CreatureType.BABY_SPIDER]: {
    type: CreatureType.BABY_SPIDER,
    name: 'Baby Spider',
    health: 3,
    speed: 150,
    damage: 2,
    xp: 3,
    radius: 5,
    scale: 0.4,
    tint: 0xbb77cc,
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
    spawnsOnDeath: CreatureType.BABY_SPIDER,
    spawnCount: 6
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
  },
  [CreatureType.ALIEN_ELITE]: {
    type: CreatureType.ALIEN_ELITE,
    name: 'Elite Alien',
    health: 60,
    speed: 40,
    damage: 0,
    xp: 50,
    radius: 16,
    scale: 1.2,
    tint: 0x2ecc71,
    isRanged: true,
    projectileCooldown: 1.2
  },
  [CreatureType.ALIEN_BOSS]: {
    type: CreatureType.ALIEN_BOSS,
    name: 'Alien Boss',
    health: 300,
    speed: 30,
    damage: 20,
    xp: 200,
    radius: 28,
    scale: 2.0,
    tint: 0x1abc9c,
    isRanged: true,
    projectileCooldown: 0.8
  },
  [CreatureType.LIZARD]: {
    type: CreatureType.LIZARD,
    name: 'Lizard',
    health: 25,
    speed: 100,
    damage: 12,
    xp: 20,
    radius: 12,
    scale: 0.9,
    tint: 0xe67e22,
    isRanged: false
  },
  [CreatureType.LIZARD_SPITTER]: {
    type: CreatureType.LIZARD_SPITTER,
    name: 'Spitter Lizard',
    health: 20,
    speed: 70,
    damage: 0,
    xp: 30,
    radius: 12,
    scale: 0.95,
    tint: 0xd35400,
    isRanged: true,
    projectileCooldown: 1.5
  },
  [CreatureType.NEST]: {
    type: CreatureType.NEST,
    name: 'Nest',
    health: 80,
    speed: 0,
    damage: 0,
    xp: 100,
    radius: 24,
    scale: 1.2,
    tint: 0x7f8c8d,
    isRanged: false,
    isStationary: true,
    spawnTimer: 5.0,
    spawnType: CreatureType.SPIDER
  },
  [CreatureType.BOSS]: {
    type: CreatureType.BOSS,
    name: 'Boss',
    health: 500,
    speed: 35,
    damage: 30,
    xp: 500,
    radius: 32,
    scale: 2.5,
    tint: 0xe74c3c,
    isRanged: true,
    projectileCooldown: 0.5
  }
};

export function getCreatureData(type: CreatureType): CreatureData {
  return CREATURES[type];
}
