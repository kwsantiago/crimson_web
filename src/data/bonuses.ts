export enum BonusType {
  UNUSED = 0,
  POINTS = 1,
  ENERGIZER = 2,
  WEAPON = 3,
  WEAPON_POWER_UP = 4,
  NUKE = 5,
  DOUBLE_EXPERIENCE = 6,
  SHOCK_CHAIN = 7,
  FIREBLAST = 8,
  REFLEX_BOOST = 9,
  SHIELD = 10,
  FREEZE = 11,
  MEDIKIT = 12,
  SPEED = 13,
  FIRE_BULLETS = 14
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
  [BonusType.UNUSED]: {
    type: BonusType.UNUSED,
    name: '(unused)',
    sprite: 'bonus_xp',
    duration: 0
  },
  [BonusType.POINTS]: {
    type: BonusType.POINTS,
    name: 'Points',
    sprite: 'bonus_xp',
    duration: 0,
    xpValue: 500
  },
  [BonusType.ENERGIZER]: {
    type: BonusType.ENERGIZER,
    name: 'Energizer',
    sprite: 'bonus_energizer',
    duration: 8
  },
  [BonusType.WEAPON]: {
    type: BonusType.WEAPON,
    name: 'Weapon',
    sprite: 'bonus_weapon',
    duration: 0
  },
  [BonusType.WEAPON_POWER_UP]: {
    type: BonusType.WEAPON_POWER_UP,
    name: 'Weapon Power Up',
    sprite: 'bonus_power_up',
    duration: 10
  },
  [BonusType.NUKE]: {
    type: BonusType.NUKE,
    name: 'Nuke',
    sprite: 'bonus_nuke',
    duration: 0
  },
  [BonusType.DOUBLE_EXPERIENCE]: {
    type: BonusType.DOUBLE_EXPERIENCE,
    name: 'Double Experience',
    sprite: 'bonus_double_xp',
    duration: 6
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
  [BonusType.REFLEX_BOOST]: {
    type: BonusType.REFLEX_BOOST,
    name: 'Reflex Boost',
    sprite: 'bonus_reflex',
    duration: 3
  },
  [BonusType.SHIELD]: {
    type: BonusType.SHIELD,
    name: 'Shield',
    sprite: 'bonus_shield',
    duration: 7
  },
  [BonusType.FREEZE]: {
    type: BonusType.FREEZE,
    name: 'Freeze',
    sprite: 'bonus_freeze',
    duration: 5
  },
  [BonusType.MEDIKIT]: {
    type: BonusType.MEDIKIT,
    name: 'MediKit',
    sprite: 'bonus_health',
    duration: 0,
    healAmount: 10
  },
  [BonusType.SPEED]: {
    type: BonusType.SPEED,
    name: 'Speed',
    sprite: 'bonus_speed',
    duration: 8
  },
  [BonusType.FIRE_BULLETS]: {
    type: BonusType.FIRE_BULLETS,
    name: 'Fire Bullets',
    sprite: 'bonus_fire_bullets',
    duration: 5
  }
};

export function getBonusData(type: BonusType): BonusData {
  return BONUSES[type];
}

function bonusIdFromRoll(roll: number): BonusType | null {
  if (roll < 1 || roll > 162) return null;
  if (roll <= 13) return BonusType.POINTS;
  if (roll === 14) {
    if ((Math.floor(Math.random() * 64)) === 0) return BonusType.ENERGIZER;
    return BonusType.WEAPON;
  }
  let v5 = roll - 14;
  let v6 = BonusType.WEAPON;
  while (v5 > 10) {
    v5 -= 10;
    v6 += 1;
    if (v6 >= 15) return null;
  }
  return v6;
}

export function pickRandomBonusType(): BonusType {
  for (let i = 0; i < 101; i++) {
    const roll = Math.floor(Math.random() * 162) + 1;
    const bonusId = bonusIdFromRoll(roll);
    if (bonusId !== null && bonusId !== BonusType.UNUSED) {
      return bonusId;
    }
  }
  return BonusType.POINTS;
}
