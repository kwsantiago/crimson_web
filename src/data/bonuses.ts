export enum BonusType {
  XP_SMALL = 0,
  XP_MEDIUM = 1,
  XP_LARGE = 2,
  WEAPON = 3,
  MEDIKIT = 4,
  NUKE = 5,
  DOUBLE_EXPERIENCE = 6,
  SHOCK_CHAIN = 7,
  FIREBLAST = 8,
  REFLEX_BOOST = 9,
  SHIELD = 10,
  FREEZE = 11,
  SPEED = 12,
  WEAPON_POWER_UP = 13,
  FIRE_BULLETS = 14,
  ENERGIZER = 15
}

export interface BonusData {
  type: BonusType;
  name: string;
  sprite: string;
  duration: number;
  xpValue?: number;
  healAmount?: number;
}

export const BONUSES: Record<BonusType, BonusData> = {
  [BonusType.XP_SMALL]: {
    type: BonusType.XP_SMALL,
    name: 'Small XP',
    sprite: 'bonus_xp',
    duration: 0,
    xpValue: 100
  },
  [BonusType.XP_MEDIUM]: {
    type: BonusType.XP_MEDIUM,
    name: 'Medium XP',
    sprite: 'bonus_xp_medium',
    duration: 0,
    xpValue: 250
  },
  [BonusType.XP_LARGE]: {
    type: BonusType.XP_LARGE,
    name: 'Large XP',
    sprite: 'bonus_xp_large',
    duration: 0,
    xpValue: 500
  },
  [BonusType.WEAPON]: {
    type: BonusType.WEAPON,
    name: 'Weapon',
    sprite: 'bonus_weapon',
    duration: 0
  },
  [BonusType.MEDIKIT]: {
    type: BonusType.MEDIKIT,
    name: 'Medikit',
    sprite: 'bonus_health',
    duration: 0,
    healAmount: 25
  },
  [BonusType.NUKE]: {
    type: BonusType.NUKE,
    name: 'Nuke',
    sprite: 'bonus_nuke',
    duration: 0
  },
  [BonusType.FREEZE]: {
    type: BonusType.FREEZE,
    name: 'Freeze',
    sprite: 'bonus_freeze',
    duration: 8
  },
  [BonusType.SPEED]: {
    type: BonusType.SPEED,
    name: 'Speed Boost',
    sprite: 'bonus_speed',
    duration: 10
  },
  [BonusType.SHIELD]: {
    type: BonusType.SHIELD,
    name: 'Shield',
    sprite: 'bonus_shield',
    duration: 10
  },
  [BonusType.REFLEX_BOOST]: {
    type: BonusType.REFLEX_BOOST,
    name: 'Reflex Boost',
    sprite: 'bonus_reflex',
    duration: 5
  },
  [BonusType.DOUBLE_EXPERIENCE]: {
    type: BonusType.DOUBLE_EXPERIENCE,
    name: 'Double Experience',
    sprite: 'bonus_double_xp',
    duration: 6
  },
  [BonusType.WEAPON_POWER_UP]: {
    type: BonusType.WEAPON_POWER_UP,
    name: 'Weapon Power Up',
    sprite: 'bonus_power_up',
    duration: 10
  },
  [BonusType.SHOCK_CHAIN]: {
    type: BonusType.SHOCK_CHAIN,
    name: 'Shock Chain',
    sprite: 'bonus_shock',
    duration: 0
  },
  [BonusType.FIREBLAST]: {
    type: BonusType.FIREBLAST,
    name: 'Fireblast',
    sprite: 'bonus_fireblast',
    duration: 0
  },
  [BonusType.FIRE_BULLETS]: {
    type: BonusType.FIRE_BULLETS,
    name: 'Fire Bullets',
    sprite: 'bonus_fire_bullets',
    duration: 5
  },
  [BonusType.ENERGIZER]: {
    type: BonusType.ENERGIZER,
    name: 'Energizer',
    sprite: 'bonus_energizer',
    duration: 8
  }
};

export function getBonusData(type: BonusType): BonusData {
  return BONUSES[type];
}

export interface SpawnWeight {
  type: BonusType;
  weight: number;
}

export const BONUS_SPAWN_WEIGHTS: SpawnWeight[] = [
  { type: BonusType.XP_SMALL, weight: 0.30 },
  { type: BonusType.XP_MEDIUM, weight: 0.12 },
  { type: BonusType.XP_LARGE, weight: 0.08 },
  { type: BonusType.WEAPON, weight: 0.08 },
  { type: BonusType.MEDIKIT, weight: 0.06 },
  { type: BonusType.SPEED, weight: 0.04 },
  { type: BonusType.FREEZE, weight: 0.04 },
  { type: BonusType.SHIELD, weight: 0.03 },
  { type: BonusType.REFLEX_BOOST, weight: 0.03 },
  { type: BonusType.NUKE, weight: 0.03 },
  { type: BonusType.DOUBLE_EXPERIENCE, weight: 0.04 },
  { type: BonusType.WEAPON_POWER_UP, weight: 0.04 },
  { type: BonusType.SHOCK_CHAIN, weight: 0.03 },
  { type: BonusType.FIREBLAST, weight: 0.03 },
  { type: BonusType.FIRE_BULLETS, weight: 0.03 },
  { type: BonusType.ENERGIZER, weight: 0.02 }
];

export function pickRandomBonusType(): BonusType {
  const roll = Math.random();
  let cumulative = 0;

  for (const entry of BONUS_SPAWN_WEIGHTS) {
    cumulative += entry.weight;
    if (roll < cumulative) {
      return entry.type;
    }
  }

  return BonusType.XP_SMALL;
}
