export enum CreatureTypeId {
  ZOMBIE = 0,
  LIZARD = 1,
  ALIEN = 2,
  SPIDER_SP1 = 3,
  SPIDER_SP2 = 4,
  TROOPER = 5,
}

export enum CreatureType {
  ZOMBIE = "zombie",
  FAST_ZOMBIE = "fast_zombie",
  BIG_ZOMBIE = "big_zombie",
  SPIDER = "spider",
  BABY_SPIDER = "baby_spider",
  SPIDER_MOTHER = "spider_mother",
  ALIEN = "alien",
  ALIEN_ELITE = "alien_elite",
  ALIEN_BOSS = "alien_boss",
  LIZARD = "lizard",
  LIZARD_SPITTER = "lizard_spitter",
  NEST = "nest",
  BOSS = "boss",
}

export const CREATURE_TYPE_TO_ID: Record<CreatureType, CreatureTypeId> = {
  [CreatureType.ZOMBIE]: CreatureTypeId.ZOMBIE,
  [CreatureType.FAST_ZOMBIE]: CreatureTypeId.ZOMBIE,
  [CreatureType.BIG_ZOMBIE]: CreatureTypeId.ZOMBIE,
  [CreatureType.SPIDER]: CreatureTypeId.SPIDER_SP1,
  [CreatureType.BABY_SPIDER]: CreatureTypeId.SPIDER_SP1,
  [CreatureType.SPIDER_MOTHER]: CreatureTypeId.SPIDER_SP2,
  [CreatureType.ALIEN]: CreatureTypeId.ALIEN,
  [CreatureType.ALIEN_ELITE]: CreatureTypeId.ALIEN,
  [CreatureType.ALIEN_BOSS]: CreatureTypeId.ALIEN,
  [CreatureType.LIZARD]: CreatureTypeId.LIZARD,
  [CreatureType.LIZARD_SPITTER]: CreatureTypeId.LIZARD,
  [CreatureType.NEST]: CreatureTypeId.ZOMBIE,
  [CreatureType.BOSS]: CreatureTypeId.ZOMBIE,
};

export const CREATURE_CORPSE_FRAMES: Record<CreatureTypeId, number> = {
  [CreatureTypeId.ZOMBIE]: 0,
  [CreatureTypeId.LIZARD]: 3,
  [CreatureTypeId.ALIEN]: 4,
  [CreatureTypeId.SPIDER_SP1]: 1,
  [CreatureTypeId.SPIDER_SP2]: 2,
  [CreatureTypeId.TROOPER]: 7,
};

export function getCorpseFrame(creatureType: CreatureType): number {
  const typeId = CREATURE_TYPE_TO_ID[creatureType];
  return CREATURE_CORPSE_FRAMES[typeId] ?? 0;
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
    name: "Zombie",
    health: 20,
    speed: 40,
    damage: 10,
    xp: 10,
    radius: 14,
    scale: 1.0,
    tint: 0xffffff,
    isRanged: false,
  },
  [CreatureType.FAST_ZOMBIE]: {
    type: CreatureType.FAST_ZOMBIE,
    name: "Fast Zombie",
    health: 15,
    speed: 80,
    damage: 8,
    xp: 15,
    radius: 12,
    scale: 0.85,
    tint: 0xffffff,
    isRanged: false,
  },
  [CreatureType.BIG_ZOMBIE]: {
    type: CreatureType.BIG_ZOMBIE,
    name: "Big Zombie",
    health: 200,
    speed: 51,
    damage: 15,
    xp: 160,
    radius: 18,
    scale: 1.25,
    tint: 0xffffff,
    isRanged: false,
  },
  [CreatureType.SPIDER]: {
    type: CreatureType.SPIDER,
    name: "Spider",
    health: 8,
    speed: 120,
    damage: 5,
    xp: 8,
    radius: 8,
    scale: 0.78,
    tint: 0xffffff,
    isRanged: false,
  },
  [CreatureType.BABY_SPIDER]: {
    type: CreatureType.BABY_SPIDER,
    name: "Baby Spider",
    health: 3,
    speed: 150,
    damage: 2,
    xp: 3,
    radius: 5,
    scale: 0.625,
    tint: 0xffffff,
    isRanged: false,
  },
  [CreatureType.SPIDER_MOTHER]: {
    type: CreatureType.SPIDER_MOTHER,
    name: "Spider Mother",
    health: 50,
    speed: 60,
    damage: 15,
    xp: 50,
    radius: 20,
    scale: 1.0,
    tint: 0xffffff,
    isRanged: false,
    spawnsOnDeath: CreatureType.BABY_SPIDER,
    spawnCount: 6,
  },
  [CreatureType.ALIEN]: {
    type: CreatureType.ALIEN,
    name: "Alien",
    health: 30,
    speed: 50,
    damage: 10,
    xp: 25,
    radius: 14,
    scale: 0.86,
    tint: 0xffffff,
    isRanged: false,
  },
  [CreatureType.ALIEN_ELITE]: {
    type: CreatureType.ALIEN_ELITE,
    name: "Elite Alien",
    health: 800,
    speed: 75,
    damage: 20,
    xp: 450,
    radius: 16,
    scale: 1.016,
    tint: 0xffffff,
    isRanged: false,
  },
  [CreatureType.ALIEN_BOSS]: {
    type: CreatureType.ALIEN_BOSS,
    name: "Alien Boss",
    health: 3800,
    speed: 60,
    damage: 40,
    xp: 1500,
    radius: 28,
    scale: 1.5,
    tint: 0xffffff,
    isRanged: false,
  },
  [CreatureType.LIZARD]: {
    type: CreatureType.LIZARD,
    name: "Lizard",
    health: 25,
    speed: 75,
    damage: 12,
    xp: 20,
    radius: 12,
    scale: 0.7,
    tint: 0xffffff,
    isRanged: false,
  },
  [CreatureType.LIZARD_SPITTER]: {
    type: CreatureType.LIZARD_SPITTER,
    name: "Spitter Lizard",
    health: 20,
    speed: 60,
    damage: 8,
    xp: 30,
    radius: 12,
    scale: 0.7,
    tint: 0xffffff,
    isRanged: true,
    projectileCooldown: 2.0,
  },
  [CreatureType.NEST]: {
    type: CreatureType.NEST,
    name: "Nest",
    health: 80,
    speed: 0,
    damage: 0,
    xp: 100,
    radius: 24,
    scale: 0.78,
    tint: 0xffffff,
    isRanged: false,
    isStationary: true,
    spawnTimer: 5.0,
    spawnType: CreatureType.SPIDER,
  },
  [CreatureType.BOSS]: {
    type: CreatureType.BOSS,
    name: "Boss",
    health: 500,
    speed: 35,
    damage: 30,
    xp: 500,
    radius: 32,
    scale: 1.5,
    tint: 0xffffff,
    isRanged: false,
  },
};

export function getCreatureData(type: CreatureType): CreatureData {
  return CREATURES[type];
}
