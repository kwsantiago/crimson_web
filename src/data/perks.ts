export enum PerkId {
  ANTIPERK = 0,
  BLOODY_MESS = 1,
  SHARPSHOOTER = 2,
  FASTLOADER = 3,
  LEAN_MEAN_EXP = 4,
  LONG_DISTANCE_RUNNER = 5,
  INSTANT_WINNER = 7,
  AMMO_MANIAC = 12,
  REGENERATION = 13,
  FASTSHOT = 15,
  THICK_SKINNED = 17,
  URANIUM_BULLETS = 20,
  BONUS_MAGNET = 22,
  BREATHING_ROOM = 29,
  RANDOM_WEAPON = 31,
  BANDAGE = 34,
  PERK_EXPERT = 40,
  PERK_MASTER = 41,
  POISON_BULLETS = 46
}

export interface PerkData {
  id: PerkId;
  name: string;
  description: string;
  maxStacks: number;
}

export const PERKS: Record<PerkId, PerkData> = {
  [PerkId.ANTIPERK]: {
    id: PerkId.ANTIPERK,
    name: 'AntiPerk',
    description: 'You should not see this',
    maxStacks: 1
  },
  [PerkId.BLOODY_MESS]: {
    id: PerkId.BLOODY_MESS,
    name: 'Bloody Mess',
    description: 'More blood effects when enemies die',
    maxStacks: 1
  },
  [PerkId.SHARPSHOOTER]: {
    id: PerkId.SHARPSHOOTER,
    name: 'Sharpshooter',
    description: '50% less weapon spread',
    maxStacks: 3
  },
  [PerkId.FASTLOADER]: {
    id: PerkId.FASTLOADER,
    name: 'Fastloader',
    description: '25% faster reload speed',
    maxStacks: 3
  },
  [PerkId.LEAN_MEAN_EXP]: {
    id: PerkId.LEAN_MEAN_EXP,
    name: 'Lean Mean Exp Machine',
    description: '+10 XP per second passively',
    maxStacks: 5
  },
  [PerkId.LONG_DISTANCE_RUNNER]: {
    id: PerkId.LONG_DISTANCE_RUNNER,
    name: 'Long Distance Runner',
    description: '+50% movement speed',
    maxStacks: 1
  },
  [PerkId.INSTANT_WINNER]: {
    id: PerkId.INSTANT_WINNER,
    name: 'Instant Winner',
    description: 'Gain 2500 XP immediately',
    maxStacks: 99
  },
  [PerkId.AMMO_MANIAC]: {
    id: PerkId.AMMO_MANIAC,
    name: 'Ammo Maniac',
    description: '+50% ammo capacity',
    maxStacks: 2
  },
  [PerkId.REGENERATION]: {
    id: PerkId.REGENERATION,
    name: 'Regeneration',
    description: 'Slowly regenerate health',
    maxStacks: 1
  },
  [PerkId.FASTSHOT]: {
    id: PerkId.FASTSHOT,
    name: 'Fastshot',
    description: '+25% fire rate',
    maxStacks: 3
  },
  [PerkId.THICK_SKINNED]: {
    id: PerkId.THICK_SKINNED,
    name: 'Thick Skinned',
    description: 'Take 33% less damage',
    maxStacks: 1
  },
  [PerkId.URANIUM_BULLETS]: {
    id: PerkId.URANIUM_BULLETS,
    name: 'Uranium Filled Bullets',
    description: '+25% bullet damage',
    maxStacks: 3
  },
  [PerkId.BONUS_MAGNET]: {
    id: PerkId.BONUS_MAGNET,
    name: 'Bonus Magnet',
    description: 'Pickups are attracted to you',
    maxStacks: 1
  },
  [PerkId.BREATHING_ROOM]: {
    id: PerkId.BREATHING_ROOM,
    name: 'Breathing Room',
    description: 'Slow all enemies for 10 seconds',
    maxStacks: 99
  },
  [PerkId.RANDOM_WEAPON]: {
    id: PerkId.RANDOM_WEAPON,
    name: 'Random Weapon',
    description: 'Get a random weapon',
    maxStacks: 99
  },
  [PerkId.BANDAGE]: {
    id: PerkId.BANDAGE,
    name: 'Bandage',
    description: 'Heal 25% health immediately',
    maxStacks: 99
  },
  [PerkId.PERK_EXPERT]: {
    id: PerkId.PERK_EXPERT,
    name: 'Perk Expert',
    description: '5 perk choices instead of 4',
    maxStacks: 1
  },
  [PerkId.PERK_MASTER]: {
    id: PerkId.PERK_MASTER,
    name: 'Perk Master',
    description: '6 perk choices instead of 5',
    maxStacks: 1
  },
  [PerkId.POISON_BULLETS]: {
    id: PerkId.POISON_BULLETS,
    name: 'Poison Bullets',
    description: 'Bullets apply poison damage over time',
    maxStacks: 1
  }
};

export const AVAILABLE_PERKS: PerkId[] = [
  PerkId.BLOODY_MESS,
  PerkId.SHARPSHOOTER,
  PerkId.FASTLOADER,
  PerkId.LEAN_MEAN_EXP,
  PerkId.LONG_DISTANCE_RUNNER,
  PerkId.INSTANT_WINNER,
  PerkId.AMMO_MANIAC,
  PerkId.REGENERATION,
  PerkId.FASTSHOT,
  PerkId.THICK_SKINNED,
  PerkId.URANIUM_BULLETS,
  PerkId.BONUS_MAGNET,
  PerkId.BREATHING_ROOM,
  PerkId.RANDOM_WEAPON,
  PerkId.BANDAGE,
  PerkId.PERK_EXPERT,
  PerkId.PERK_MASTER,
  PerkId.POISON_BULLETS
];

export function getPerkData(id: PerkId): PerkData {
  return PERKS[id];
}
