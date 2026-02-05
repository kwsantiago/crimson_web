export enum PerkId {
  ANTIPERK = 0,
  BLOODY_MESS_QUICK_LEARNER = 1,
  SHARPSHOOTER = 2,
  FASTLOADER = 3,
  LEAN_MEAN_EXP = 4,
  LONG_DISTANCE_RUNNER = 5,
  PYROKINETIC = 6,
  INSTANT_WINNER = 7,
  GRIM_DEAL = 8,
  ALTERNATE_WEAPON = 9,
  PLAGUEBEARER = 10,
  EVIL_EYES = 11,
  AMMO_MANIAC = 12,
  REGENERATION = 13,
  GREATER_REGENERATION = 14,
  FASTSHOT = 15,
  DOCTOR = 16,
  THICK_SKINNED = 17,
  MY_FAVOURITE_WEAPON = 18,
  MAN_BOMB = 19,
  URANIUM_BULLETS = 20,
  LIVING_FORTRESS = 21,
  BONUS_MAGNET = 22,
  JINXED = 23,
  MONSTER_VISION = 24,
  PYROMANIAC = 25,
  ION_GUN_MASTER = 26,
  BARREL_GREASER = 27,
  FATAL_LOTTERY = 28,
  BREATHING_ROOM = 29,
  LIFELINE_50_50 = 30,
  RANDOM_WEAPON = 31,
  INFERNAL_CONTRACT = 32,
  DEATH_CLOCK = 33,
  BANDAGE = 34,
  HOT_TEMPERED = 35,
  FIRE_COUGH = 36,
  STATIONARY_RELOADER = 37,
  ANGRY_RELOADER = 38,
  ANXIOUS_LOADER = 39,
  PERK_EXPERT = 40,
  PERK_MASTER = 41,
  RADIOACTIVE = 42,
  REFLEX_BOOSTED = 43,
  BONUS_ECONOMIST = 44,
  AMMUNITION_WITHIN = 45,
  POISON_BULLETS = 46,
  REGRESSION_BULLETS = 47,
  HIGHLANDER = 48,
  VEINS_OF_POISON = 49,
  TOXIC_AVENGER = 50,
  DODGER = 51,
  NINJA = 52,
  TOUGH_RELOADER = 53,
  MR_MELEE = 54,
  UNSTOPPABLE = 55,
  FINAL_REVENGE = 56,
  TELEKINETIC = 57
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
  [PerkId.BLOODY_MESS_QUICK_LEARNER]: {
    id: PerkId.BLOODY_MESS_QUICK_LEARNER,
    name: 'Bloody Mess',
    description: 'More blood and 30% more experience points.',
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
  [PerkId.PYROKINETIC]: {
    id: PerkId.PYROKINETIC,
    name: 'Pyrokinetic',
    description: 'Fire aura damages nearby enemies',
    maxStacks: 3
  },
  [PerkId.INSTANT_WINNER]: {
    id: PerkId.INSTANT_WINNER,
    name: 'Instant Winner',
    description: 'Gain 2500 XP immediately',
    maxStacks: 99
  },
  [PerkId.GRIM_DEAL]: {
    id: PerkId.GRIM_DEAL,
    name: 'Grim Deal',
    description: 'Trade 25% max health for +5000 XP',
    maxStacks: 3
  },
  [PerkId.ALTERNATE_WEAPON]: {
    id: PerkId.ALTERNATE_WEAPON,
    name: 'Alternate Weapon',
    description: 'Carry a second weapon (press Q to swap)',
    maxStacks: 1
  },
  [PerkId.PLAGUEBEARER]: {
    id: PerkId.PLAGUEBEARER,
    name: 'Plaguebearer',
    description: 'Poison enemies that get close to you',
    maxStacks: 3
  },
  [PerkId.EVIL_EYES]: {
    id: PerkId.EVIL_EYES,
    name: 'Evil Eyes',
    description: 'Damage enemies by looking at them',
    maxStacks: 3
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
  [PerkId.GREATER_REGENERATION]: {
    id: PerkId.GREATER_REGENERATION,
    name: 'Greater Regeneration',
    description: 'Faster health regeneration',
    maxStacks: 1
  },
  [PerkId.FASTSHOT]: {
    id: PerkId.FASTSHOT,
    name: 'Fastshot',
    description: '+25% fire rate',
    maxStacks: 3
  },
  [PerkId.DOCTOR]: {
    id: PerkId.DOCTOR,
    name: 'Doctor',
    description: 'Heal 1% of fire damage dealt',
    maxStacks: 3
  },
  [PerkId.THICK_SKINNED]: {
    id: PerkId.THICK_SKINNED,
    name: 'Thick Skinned',
    description: 'Take 33% less damage',
    maxStacks: 1
  },
  [PerkId.MY_FAVOURITE_WEAPON]: {
    id: PerkId.MY_FAVOURITE_WEAPON,
    name: 'My Favourite Weapon',
    description: 'Keep your current weapon forever',
    maxStacks: 1
  },
  [PerkId.MAN_BOMB]: {
    id: PerkId.MAN_BOMB,
    name: 'Man Bomb',
    description: 'Explode on death, then respawn once',
    maxStacks: 1
  },
  [PerkId.URANIUM_BULLETS]: {
    id: PerkId.URANIUM_BULLETS,
    name: 'Uranium Filled Bullets',
    description: '+25% bullet damage',
    maxStacks: 3
  },
  [PerkId.LIVING_FORTRESS]: {
    id: PerkId.LIVING_FORTRESS,
    name: 'Living Fortress',
    description: "Can't move, but massive damage resist",
    maxStacks: 1
  },
  [PerkId.BONUS_MAGNET]: {
    id: PerkId.BONUS_MAGNET,
    name: 'Bonus Magnet',
    description: 'Pickups are attracted to you',
    maxStacks: 1
  },
  [PerkId.JINXED]: {
    id: PerkId.JINXED,
    name: 'Jinxed',
    description: 'Random bad effects, but more XP',
    maxStacks: 1
  },
  [PerkId.MONSTER_VISION]: {
    id: PerkId.MONSTER_VISION,
    name: 'Monster Vision',
    description: 'See enemies through the fog',
    maxStacks: 1
  },
  [PerkId.PYROMANIAC]: {
    id: PerkId.PYROMANIAC,
    name: 'Pyromaniac',
    description: '+50% fire damage',
    maxStacks: 1
  },
  [PerkId.ION_GUN_MASTER]: {
    id: PerkId.ION_GUN_MASTER,
    name: 'Ion Gun Master',
    description: '+50% ion weapon damage',
    maxStacks: 1
  },
  [PerkId.BARREL_GREASER]: {
    id: PerkId.BARREL_GREASER,
    name: 'Barrel Greaser',
    description: 'Weapons never jam',
    maxStacks: 1
  },
  [PerkId.FATAL_LOTTERY]: {
    id: PerkId.FATAL_LOTTERY,
    name: 'Fatal Lottery',
    description: '50% chance: +10000 XP or instant death',
    maxStacks: 1
  },
  [PerkId.BREATHING_ROOM]: {
    id: PerkId.BREATHING_ROOM,
    name: 'Breathing Room',
    description: 'Freeze all enemies for 10 seconds',
    maxStacks: 99
  },
  [PerkId.LIFELINE_50_50]: {
    id: PerkId.LIFELINE_50_50,
    name: 'Lifeline 50/50',
    description: 'Kill half enemies, or lose half health',
    maxStacks: 99
  },
  [PerkId.RANDOM_WEAPON]: {
    id: PerkId.RANDOM_WEAPON,
    name: 'Random Weapon',
    description: 'Get a random weapon',
    maxStacks: 99
  },
  [PerkId.INFERNAL_CONTRACT]: {
    id: PerkId.INFERNAL_CONTRACT,
    name: 'Infernal Contract',
    description: '+3 levels, but health drops to 1',
    maxStacks: 1
  },
  [PerkId.DEATH_CLOCK]: {
    id: PerkId.DEATH_CLOCK,
    name: 'Death Clock',
    description: 'No healing, but +100% damage',
    maxStacks: 1
  },
  [PerkId.BANDAGE]: {
    id: PerkId.BANDAGE,
    name: 'Bandage',
    description: 'Heal 25% health immediately',
    maxStacks: 99
  },
  [PerkId.HOT_TEMPERED]: {
    id: PerkId.HOT_TEMPERED,
    name: 'Hot Tempered',
    description: 'More damage when health is low',
    maxStacks: 1
  },
  [PerkId.FIRE_COUGH]: {
    id: PerkId.FIRE_COUGH,
    name: 'Fire Cough',
    description: 'Occasionally shoot fireballs when hit',
    maxStacks: 1
  },
  [PerkId.STATIONARY_RELOADER]: {
    id: PerkId.STATIONARY_RELOADER,
    name: 'Stationary Reloader',
    description: 'Faster reload when not moving',
    maxStacks: 1
  },
  [PerkId.ANGRY_RELOADER]: {
    id: PerkId.ANGRY_RELOADER,
    name: 'Angry Reloader',
    description: 'Faster reload when surrounded',
    maxStacks: 1
  },
  [PerkId.ANXIOUS_LOADER]: {
    id: PerkId.ANXIOUS_LOADER,
    name: 'Anxious Loader',
    description: 'Auto-reload when not firing',
    maxStacks: 1
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
  [PerkId.RADIOACTIVE]: {
    id: PerkId.RADIOACTIVE,
    name: 'Radioactive',
    description: 'Damage aura around you',
    maxStacks: 3
  },
  [PerkId.REFLEX_BOOSTED]: {
    id: PerkId.REFLEX_BOOSTED,
    name: 'Reflex Boosted',
    description: 'Brief slow-mo when nearly hit',
    maxStacks: 1
  },
  [PerkId.BONUS_ECONOMIST]: {
    id: PerkId.BONUS_ECONOMIST,
    name: 'Bonus Economist',
    description: 'Bonuses last 50% longer',
    maxStacks: 1
  },
  [PerkId.AMMUNITION_WITHIN]: {
    id: PerkId.AMMUNITION_WITHIN,
    name: 'Ammunition Within',
    description: 'Never need to reload',
    maxStacks: 1
  },
  [PerkId.POISON_BULLETS]: {
    id: PerkId.POISON_BULLETS,
    name: 'Poison Bullets',
    description: 'Bullets apply poison damage over time',
    maxStacks: 1
  },
  [PerkId.REGRESSION_BULLETS]: {
    id: PerkId.REGRESSION_BULLETS,
    name: 'Regression Bullets',
    description: 'Kills refund ammo',
    maxStacks: 1
  },
  [PerkId.HIGHLANDER]: {
    id: PerkId.HIGHLANDER,
    name: 'Highlander',
    description: 'Only one perk total, but 10x effective',
    maxStacks: 1
  },
  [PerkId.VEINS_OF_POISON]: {
    id: PerkId.VEINS_OF_POISON,
    name: 'Veins of Poison',
    description: 'Monsters taking a bite of you are eventually to experience an agonizing death.',
    maxStacks: 1
  },
  [PerkId.TOXIC_AVENGER]: {
    id: PerkId.TOXIC_AVENGER,
    name: 'Toxic Avenger',
    description: 'Most monsters touching you will just drop dead within seconds!',
    maxStacks: 1
  },
  [PerkId.DODGER]: {
    id: PerkId.DODGER,
    name: 'Dodger',
    description: 'Each time a monster attacks you have a chance to dodge the attack.',
    maxStacks: 1
  },
  [PerkId.NINJA]: {
    id: PerkId.NINJA,
    name: 'Ninja',
    description: 'Monsters have really hard time hitting you.',
    maxStacks: 1
  },
  [PerkId.TOUGH_RELOADER]: {
    id: PerkId.TOUGH_RELOADER,
    name: 'Tough Reloader',
    description: 'Damage received during reloading a weapon is halved.',
    maxStacks: 1
  },
  [PerkId.MR_MELEE]: {
    id: PerkId.MR_MELEE,
    name: 'Mr. Melee',
    description: 'You hit back when monsters come near. Hard.',
    maxStacks: 1
  },
  [PerkId.UNSTOPPABLE]: {
    id: PerkId.UNSTOPPABLE,
    name: 'Unstoppable',
    description: 'Monsters cannot slow you down with their attacks.',
    maxStacks: 1
  },
  [PerkId.FINAL_REVENGE]: {
    id: PerkId.FINAL_REVENGE,
    name: 'Final Revenge',
    description: 'Pick this and you will get your revenge. It is a promise.',
    maxStacks: 1
  },
  [PerkId.TELEKINETIC]: {
    id: PerkId.TELEKINETIC,
    name: 'Telekinetic',
    description: 'Pick up bonuses by aiming at them.',
    maxStacks: 1
  }
};

export const AVAILABLE_PERKS: PerkId[] = [
  PerkId.BLOODY_MESS_QUICK_LEARNER,
  PerkId.SHARPSHOOTER,
  PerkId.FASTLOADER,
  PerkId.LEAN_MEAN_EXP,
  PerkId.LONG_DISTANCE_RUNNER,
  PerkId.PYROKINETIC,
  PerkId.INSTANT_WINNER,
  PerkId.GRIM_DEAL,
  PerkId.PLAGUEBEARER,
  PerkId.EVIL_EYES,
  PerkId.AMMO_MANIAC,
  PerkId.REGENERATION,
  PerkId.GREATER_REGENERATION,
  PerkId.FASTSHOT,
  PerkId.DOCTOR,
  PerkId.THICK_SKINNED,
  PerkId.MY_FAVOURITE_WEAPON,
  PerkId.MAN_BOMB,
  PerkId.URANIUM_BULLETS,
  PerkId.BONUS_MAGNET,
  PerkId.PYROMANIAC,
  PerkId.ION_GUN_MASTER,
  PerkId.FATAL_LOTTERY,
  PerkId.BREATHING_ROOM,
  PerkId.LIFELINE_50_50,
  PerkId.RANDOM_WEAPON,
  PerkId.INFERNAL_CONTRACT,
  PerkId.DEATH_CLOCK,
  PerkId.BANDAGE,
  PerkId.HOT_TEMPERED,
  PerkId.FIRE_COUGH,
  PerkId.STATIONARY_RELOADER,
  PerkId.ANGRY_RELOADER,
  PerkId.ANXIOUS_LOADER,
  PerkId.PERK_EXPERT,
  PerkId.PERK_MASTER,
  PerkId.RADIOACTIVE,
  PerkId.REFLEX_BOOSTED,
  PerkId.BONUS_ECONOMIST,
  PerkId.AMMUNITION_WITHIN,
  PerkId.POISON_BULLETS,
  PerkId.REGRESSION_BULLETS,
  PerkId.HIGHLANDER,
  PerkId.VEINS_OF_POISON,
  PerkId.TOXIC_AVENGER,
  PerkId.DODGER,
  PerkId.NINJA,
  PerkId.TOUGH_RELOADER,
  PerkId.MR_MELEE,
  PerkId.UNSTOPPABLE,
  PerkId.FINAL_REVENGE,
  PerkId.TELEKINETIC,
  PerkId.LIVING_FORTRESS
];

export const PERK_PREREQUISITES: Partial<Record<PerkId, PerkId>> = {
  [PerkId.TOXIC_AVENGER]: PerkId.VEINS_OF_POISON,
  [PerkId.NINJA]: PerkId.DODGER,
  [PerkId.PERK_MASTER]: PerkId.PERK_EXPERT,
  [PerkId.GREATER_REGENERATION]: PerkId.REGENERATION
};

export function getPerkData(id: PerkId): PerkData {
  return PERKS[id];
}
