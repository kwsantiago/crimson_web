import { CreatureType } from './creatures';
import { PerkId } from './perks';

export interface SpawnEntry {
  x: number;
  y: number;
  heading: number;
  creatureType: CreatureType;
  triggerMs: number;
  count: number;
  config?: SpawnConfig;
}

export interface SpawnConfig {
  healthOverride?: number;
  speedOverride?: number;
  damageOverride?: number;
  xpOverride?: number;
  sizeOverride?: number;
  tint?: { r: number; g: number; b: number; a: number };
  isStationary?: boolean;
  spawnTimer?: number;
  spawnType?: CreatureType;
}

export interface QuestDefinition {
  level: string;
  tier: number;
  questNumber: number;
  title: string;
  description: string;
  timeLimitMs: number;
  startWeaponId: number;
  unlockPerkId?: PerkId;
  unlockWeaponId?: number;
  terrainTint?: number;
  spawns: SpawnEntry[];
}

export interface QuestProgress {
  completed: boolean;
  bestTimeMs?: number;
  attempts: number;
}

export type QuestProgressMap = Record<string, QuestProgress>;

const WORLD_SIZE = 1024;

function edgePosition(edge: 'top' | 'bottom' | 'left' | 'right'): { x: number; y: number } {
  switch (edge) {
    case 'top': return { x: WORLD_SIZE / 2, y: -32 };
    case 'bottom': return { x: WORLD_SIZE / 2, y: WORLD_SIZE + 32 };
    case 'left': return { x: -32, y: WORLD_SIZE / 2 };
    case 'right': return { x: WORLD_SIZE + 32, y: WORLD_SIZE / 2 };
  }
}

function cornerPosition(corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'): { x: number; y: number } {
  switch (corner) {
    case 'topLeft': return { x: -32, y: -32 };
    case 'topRight': return { x: WORLD_SIZE + 32, y: -32 };
    case 'bottomLeft': return { x: -32, y: WORLD_SIZE + 32 };
    case 'bottomRight': return { x: WORLD_SIZE + 32, y: WORLD_SIZE + 32 };
  }
}

function spawn(
  x: number,
  y: number,
  creatureType: CreatureType,
  triggerMs: number,
  count: number,
  config?: SpawnConfig
): SpawnEntry {
  return { x, y, heading: 0, creatureType, triggerMs, count, config };
}

function spawnAt(
  pos: { x: number; y: number },
  creatureType: CreatureType,
  triggerMs: number,
  count: number,
  config?: SpawnConfig
): SpawnEntry {
  return { ...pos, heading: 0, creatureType, triggerMs, count, config };
}

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    level: '1.1',
    tier: 1,
    questNumber: 1,
    title: 'Land Hostile',
    description: 'Eliminate all alien invaders. A simple introduction to combat.',
    timeLimitMs: 120000,
    startWeaponId: 1,
    unlockWeaponId: 2,
    terrainTint: 0xb2b2b2,
    spawns: [
      spawnAt(edgePosition('bottom'), CreatureType.ZOMBIE, 500, 1),
      spawnAt(cornerPosition('bottomLeft'), CreatureType.ZOMBIE, 2500, 2),
      spawnAt(cornerPosition('topLeft'), CreatureType.ZOMBIE, 6500, 3),
      spawnAt(cornerPosition('topRight'), CreatureType.ZOMBIE, 11500, 4),
    ]
  },
  {
    level: '1.2',
    tier: 1,
    questNumber: 2,
    title: 'Minor Alien Breach',
    description: 'More aliens are pouring in. Hold your ground!',
    timeLimitMs: 120000,
    startWeaponId: 1,
    unlockWeaponId: 3,
    terrainTint: 0xb2b2b2,
    spawns: [
      spawn(256, 256, CreatureType.ZOMBIE, 1000, 2),
      spawn(256, 128, CreatureType.ZOMBIE, 1700, 2),
      ...Array.from({ length: 16 }, (_, i) => {
        const trigger = ((i + 2) * 5 - 10) * 720;
        return spawnAt(edgePosition('right'), CreatureType.ZOMBIE, trigger, 1);
      }),
      spawnAt(edgePosition('bottom'), CreatureType.BIG_ZOMBIE, 39600, 1),
    ]
  },
  {
    level: '1.3',
    tier: 1,
    questNumber: 3,
    title: 'Target Practice',
    description: 'Fast-moving targets appear from all directions. Test your aim!',
    timeLimitMs: 65000,
    startWeaponId: 1,
    unlockPerkId: PerkId.URANIUM_BULLETS,
    terrainTint: 0xb2b2b2,
    spawns: (() => {
      const entries: SpawnEntry[] = [];
      let trigger = 2000;
      let step = 2000;
      while (step > 500) {
        const angle = Math.random() * Math.PI * 2;
        const radius = (Math.floor(Math.random() * 8) + 2) * 32;
        const x = Math.cos(angle) * radius + WORLD_SIZE / 2;
        const y = Math.sin(angle) * radius + WORLD_SIZE / 2;
        entries.push(spawn(x, y, CreatureType.FAST_ZOMBIE, trigger, 1));
        trigger += Math.max(step, 1100);
        step -= 50;
      }
      return entries;
    })()
  },
  {
    level: '1.4',
    tier: 1,
    questNumber: 4,
    title: 'Frontline Assault',
    description: 'Waves of enemies attack from multiple fronts. Stay mobile!',
    timeLimitMs: 300000,
    startWeaponId: 1,
    unlockWeaponId: 8,
    terrainTint: 0xb2b2b2,
    spawns: (() => {
      const entries: SpawnEntry[] = [];
      let step = 2500;
      for (let i = 2; i < 22; i++) {
        const type = i < 5 ? CreatureType.ZOMBIE : i < 10 ? CreatureType.FAST_ZOMBIE : CreatureType.ZOMBIE;
        const trigger = i * step - 5000;
        entries.push(spawnAt(edgePosition('bottom'), type, trigger, 1));
        if (i > 4) {
          entries.push(spawnAt(cornerPosition('topLeft'), CreatureType.ZOMBIE, trigger, 1));
        }
        if (i > 10) {
          entries.push(spawnAt(cornerPosition('topRight'), CreatureType.ZOMBIE, trigger, 1));
        }
        if (i === 10) {
          const burstTrigger = (step * 5 - 2500) * 2;
          entries.push(spawnAt(edgePosition('right'), CreatureType.BIG_ZOMBIE, burstTrigger, 1));
          entries.push(spawnAt(edgePosition('left'), CreatureType.BIG_ZOMBIE, burstTrigger, 1));
        }
        step = Math.max(step - 50, 1800);
      }
      return entries;
    })()
  },
  {
    level: '1.5',
    tier: 1,
    questNumber: 5,
    title: 'Alien Dens',
    description: 'Destroy the spawning nests before they overwhelm you.',
    timeLimitMs: 180000,
    startWeaponId: 1,
    unlockPerkId: PerkId.DOCTOR,
    terrainTint: 0xb2b2b2,
    spawns: [
      spawn(256, 256, CreatureType.NEST, 1500, 1),
      spawn(768, 768, CreatureType.NEST, 1500, 1),
      spawn(512, 512, CreatureType.NEST, 23500, 1),
      spawn(256, 768, CreatureType.NEST, 38500, 1),
      spawn(768, 256, CreatureType.NEST, 38500, 1),
    ]
  },
  {
    level: '1.6',
    tier: 1,
    questNumber: 6,
    title: 'The Random Factor',
    description: 'Face random enemy types. Expect the unexpected!',
    timeLimitMs: 300000,
    startWeaponId: 1,
    unlockWeaponId: 5,
    terrainTint: 0xa8a898,
    spawns: (() => {
      const entries: SpawnEntry[] = [];
      let trigger = 1500;
      const types = [CreatureType.ZOMBIE, CreatureType.FAST_ZOMBIE, CreatureType.SPIDER, CreatureType.BIG_ZOMBIE];
      while (trigger < 101500) {
        const type = types[Math.floor(Math.random() * types.length)];
        entries.push(spawnAt(edgePosition('right'), type, trigger, 6));
        entries.push(spawnAt(edgePosition('left'), type, trigger + 200, 6));
        if (Math.random() < 0.2) {
          entries.push(spawn(WORLD_SIZE / 2, WORLD_SIZE + 32, CreatureType.BIG_ZOMBIE, trigger, 1));
        }
        trigger += 10000;
      }
      return entries;
    })()
  },
  {
    level: '1.7',
    tier: 1,
    questNumber: 7,
    title: 'Spider Wave Syndrome',
    description: 'Endless waves of fast spiders. Keep shooting!',
    timeLimitMs: 240000,
    startWeaponId: 1,
    unlockPerkId: PerkId.MONSTER_VISION,
    terrainTint: 0xa8a898,
    spawns: (() => {
      const entries: SpawnEntry[] = [];
      let trigger = 1500;
      while (trigger < 100500) {
        entries.push(spawnAt(edgePosition('left'), CreatureType.SPIDER, trigger, 8));
        trigger += 5500;
      }
      return entries;
    })()
  },
  {
    level: '1.8',
    tier: 1,
    questNumber: 8,
    title: 'Alien Squads',
    description: 'Coordinated alien formations attack in sequence.',
    timeLimitMs: 180000,
    startWeaponId: 1,
    unlockWeaponId: 6,
    terrainTint: 0xa8a898,
    spawns: [
      spawn(-256, 256, CreatureType.ALIEN, 1500, 8),
      spawn(-256, 768, CreatureType.ALIEN, 2500, 8),
      spawn(768, -256, CreatureType.ALIEN, 5500, 8),
      spawn(768, WORLD_SIZE + 256, CreatureType.ALIEN, 8500, 8),
      spawn(WORLD_SIZE + 256, WORLD_SIZE + 256, CreatureType.ALIEN, 14500, 8),
      spawn(WORLD_SIZE + 256, 768, CreatureType.ALIEN, 18500, 8),
      spawn(-256, 256, CreatureType.ALIEN, 25000, 8),
      spawn(-256, 768, CreatureType.ALIEN, 30000, 8),
      ...(() => {
        const entries: SpawnEntry[] = [];
        let trigger = 36200;
        while (trigger < 83000) {
          entries.push(spawn(-64, -64, CreatureType.ZOMBIE, trigger - 400, 1));
          entries.push(spawn(WORLD_SIZE + 64, WORLD_SIZE + 64, CreatureType.ZOMBIE, trigger, 1));
          trigger += 1800;
        }
        return entries;
      })()
    ]
  },
  {
    level: '1.9',
    tier: 1,
    questNumber: 9,
    title: 'Nesting Grounds',
    description: 'Multiple nests spawn continuously. Clear them all!',
    timeLimitMs: 240000,
    startWeaponId: 1,
    unlockPerkId: PerkId.HOT_TEMPERED,
    terrainTint: 0xa8a898,
    spawns: [
      spawn(WORLD_SIZE / 2, WORLD_SIZE + 32, CreatureType.ZOMBIE, 1500, 8),
      spawn(256, 256, CreatureType.NEST, 8000, 1),
      spawn(512, 512, CreatureType.NEST, 13000, 1),
      spawn(768, 768, CreatureType.NEST, 18000, 1),
      spawn(WORLD_SIZE / 2, WORLD_SIZE + 32, CreatureType.ZOMBIE, 25000, 8),
      spawn(WORLD_SIZE / 2, WORLD_SIZE + 32, CreatureType.FAST_ZOMBIE, 39000, 6),
      spawn(384, 512, CreatureType.NEST, 41100, 1),
      spawn(640, 512, CreatureType.NEST, 42100, 1),
      spawn(512, 640, CreatureType.NEST, 43100, 1),
      spawn(512, 512, CreatureType.NEST, 44100, 1),
      spawn(WORLD_SIZE / 2, WORLD_SIZE + 32, CreatureType.SPIDER, 50000, 7),
      spawn(WORLD_SIZE / 2, WORLD_SIZE + 32, CreatureType.BIG_ZOMBIE, 55000, 4),
    ]
  },
  {
    level: '1.10',
    tier: 1,
    questNumber: 10,
    title: '8-Legged Terror',
    description: 'Face the spider boss and its minions. The final challenge of tier 1!',
    timeLimitMs: 240000,
    startWeaponId: 1,
    unlockWeaponId: 12,
    terrainTint: 0xa8a898,
    spawns: [
      spawn(WORLD_SIZE - 256, WORLD_SIZE / 2, CreatureType.SPIDER_MOTHER, 1000, 1, {
        healthOverride: 500,
        sizeOverride: 48,
        xpOverride: 500
      }),
      ...(() => {
        const entries: SpawnEntry[] = [];
        let trigger = 6000;
        while (trigger < 36800) {
          entries.push(spawnAt(cornerPosition('topLeft'), CreatureType.SPIDER, trigger, 2));
          entries.push(spawnAt(cornerPosition('topRight'), CreatureType.SPIDER, trigger, 1));
          entries.push(spawnAt(cornerPosition('bottomLeft'), CreatureType.SPIDER, trigger, 2));
          entries.push(spawnAt(cornerPosition('bottomRight'), CreatureType.SPIDER, trigger, 1));
          trigger += 2200;
        }
        return entries;
      })()
    ]
  },

  // Tier 2
  {
    level: '2.1',
    tier: 2,
    questNumber: 1,
    title: 'Everred Pastures',
    description: 'Spiders of all colors converge. A colorful massacre awaits!',
    timeLimitMs: 300000,
    startWeaponId: 1,
    unlockPerkId: PerkId.BONUS_ECONOMIST,
    terrainTint: 0xc8a898,
    spawns: (() => {
      const entries: SpawnEntry[] = [];
      for (let wave = 1; wave <= 8; wave++) {
        const trigger = (wave - 1) * 13000 + 1500;
        entries.push(spawnAt(edgePosition('right'), CreatureType.SPIDER, trigger, wave));
        entries.push(spawnAt(edgePosition('left'), CreatureType.SPIDER, trigger, wave));
        entries.push(spawnAt(edgePosition('bottom'), CreatureType.SPIDER, trigger, wave));
        entries.push(spawnAt(edgePosition('top'), CreatureType.BABY_SPIDER, trigger, wave));
        if (wave === 4) {
          entries.push(spawnAt(edgePosition('top'), CreatureType.SPIDER, 40500, 8));
          entries.push(spawnAt(edgePosition('bottom'), CreatureType.SPIDER, 40500, 8));
        }
      }
      return entries;
    })()
  },
  {
    level: '2.2',
    tier: 2,
    questNumber: 2,
    title: 'Spider Spawns',
    description: 'Spider nests produce endless hordes. Destroy them quickly!',
    timeLimitMs: 300000,
    startWeaponId: 1,
    unlockWeaponId: 9,
    terrainTint: 0xc8a898,
    spawns: [
      spawn(128, 128, CreatureType.NEST, 1500, 1, { spawnType: CreatureType.SPIDER, spawnTimer: 3 }),
      spawn(896, 896, CreatureType.NEST, 1500, 1, { spawnType: CreatureType.SPIDER, spawnTimer: 3 }),
      spawn(896, 128, CreatureType.NEST, 1500, 1, { spawnType: CreatureType.SPIDER, spawnTimer: 3 }),
      spawn(128, 896, CreatureType.NEST, 1500, 1, { spawnType: CreatureType.SPIDER, spawnTimer: 3 }),
      spawn(-64, 512, CreatureType.SPIDER, 3000, 2),
      spawn(512, 512, CreatureType.NEST, 18000, 1, { spawnType: CreatureType.SPIDER, spawnTimer: 2 }),
      spawn(448, 448, CreatureType.NEST, 20500, 1, { spawnType: CreatureType.SPIDER, spawnTimer: 3 }),
      spawn(576, 448, CreatureType.NEST, 26000, 1, { spawnType: CreatureType.SPIDER, spawnTimer: 3 }),
      spawn(WORLD_SIZE + 64, 512, CreatureType.SPIDER, 21000, 2),
      spawn(576, 576, CreatureType.NEST, 31500, 1, { spawnType: CreatureType.SPIDER, spawnTimer: 3 }),
      spawn(448, 576, CreatureType.NEST, 22000, 1, { spawnType: CreatureType.SPIDER, spawnTimer: 3 }),
    ]
  },
  {
    level: '2.3',
    tier: 2,
    questNumber: 3,
    title: 'Arachnoid Farm',
    description: 'A breeding ground for spider mothers. Eliminate the threat!',
    timeLimitMs: 240000,
    startWeaponId: 1,
    unlockPerkId: PerkId.THICK_SKINNED,
    terrainTint: 0xc8a898,
    spawns: [
      spawn(256, 256, CreatureType.SPIDER_MOTHER, 1500, 1),
      spawn(768, 768, CreatureType.SPIDER_MOTHER, 8000, 1),
      spawn(256, 768, CreatureType.SPIDER_MOTHER, 15000, 1),
      spawn(768, 256, CreatureType.SPIDER_MOTHER, 22000, 1),
      spawn(512, 512, CreatureType.SPIDER_MOTHER, 30000, 2),
      ...(() => {
        const entries: SpawnEntry[] = [];
        let trigger = 5000;
        while (trigger < 60000) {
          entries.push(spawnAt(edgePosition('left'), CreatureType.SPIDER, trigger, 4));
          entries.push(spawnAt(edgePosition('right'), CreatureType.SPIDER, trigger + 2500, 4));
          trigger += 8000;
        }
        return entries;
      })()
    ]
  },
  {
    level: '2.4',
    tier: 2,
    questNumber: 4,
    title: 'The Lizard Men',
    description: 'Fast and deadly lizards enter the fray!',
    timeLimitMs: 240000,
    startWeaponId: 2,
    unlockWeaponId: 10,
    terrainTint: 0xc8a898,
    spawns: (() => {
      const entries: SpawnEntry[] = [];
      let trigger = 1500;
      while (trigger < 120000) {
        entries.push(spawnAt(edgePosition('right'), CreatureType.LIZARD, trigger, 3));
        entries.push(spawnAt(edgePosition('left'), CreatureType.LIZARD, trigger + 1000, 3));
        if (trigger > 30000) {
          entries.push(spawnAt(edgePosition('top'), CreatureType.LIZARD_SPITTER, trigger + 500, 2));
        }
        trigger += 8000;
      }
      return entries;
    })()
  },
  {
    level: '2.5',
    tier: 2,
    questNumber: 5,
    title: 'Mixed Assault',
    description: 'All enemy types attack together. Stay focused!',
    timeLimitMs: 300000,
    startWeaponId: 2,
    unlockPerkId: PerkId.REGENERATION,
    terrainTint: 0xc8a898,
    spawns: (() => {
      const entries: SpawnEntry[] = [];
      const types = [
        CreatureType.ZOMBIE, CreatureType.FAST_ZOMBIE, CreatureType.SPIDER,
        CreatureType.LIZARD, CreatureType.ALIEN, CreatureType.BIG_ZOMBIE
      ];
      let trigger = 1500;
      let waveIndex = 0;
      while (trigger < 150000) {
        const type = types[waveIndex % types.length];
        entries.push(spawnAt(edgePosition('right'), type, trigger, 4));
        entries.push(spawnAt(edgePosition('left'), type, trigger + 500, 4));
        trigger += 6000;
        waveIndex++;
      }
      return entries;
    })()
  },
  {
    level: '2.6',
    tier: 2,
    questNumber: 6,
    title: 'Elite Forces',
    description: 'Tougher alien variants with ranged attacks.',
    timeLimitMs: 300000,
    startWeaponId: 3,
    unlockWeaponId: 11,
    terrainTint: 0xb8a8a8,
    spawns: (() => {
      const entries: SpawnEntry[] = [];
      let trigger = 2000;
      while (trigger < 150000) {
        entries.push(spawnAt(edgePosition('right'), CreatureType.ALIEN_ELITE, trigger, 2));
        entries.push(spawnAt(edgePosition('left'), CreatureType.ALIEN, trigger + 1000, 4));
        entries.push(spawnAt(edgePosition('bottom'), CreatureType.ZOMBIE, trigger + 500, 3));
        trigger += 10000;
      }
      return entries;
    })()
  },
  {
    level: '2.7',
    tier: 2,
    questNumber: 7,
    title: 'Swarm Intelligence',
    description: 'Coordinated enemy formations test your skills.',
    timeLimitMs: 240000,
    startWeaponId: 3,
    unlockPerkId: PerkId.FASTSHOT,
    terrainTint: 0xb8a8a8,
    spawns: [
      spawn(512, -100, CreatureType.ALIEN, 2000, 8),
      spawn(512, WORLD_SIZE + 100, CreatureType.ALIEN, 8000, 8),
      spawn(-100, 512, CreatureType.SPIDER, 15000, 12),
      spawn(WORLD_SIZE + 100, 512, CreatureType.SPIDER, 22000, 12),
      spawn(256, 256, CreatureType.LIZARD, 30000, 6),
      spawn(768, 768, CreatureType.LIZARD, 35000, 6),
      spawn(512, 512, CreatureType.BIG_ZOMBIE, 45000, 4),
      spawn(-100, -100, CreatureType.FAST_ZOMBIE, 55000, 10),
      spawn(WORLD_SIZE + 100, WORLD_SIZE + 100, CreatureType.FAST_ZOMBIE, 60000, 10),
    ]
  },
  {
    level: '2.8',
    tier: 2,
    questNumber: 8,
    title: 'Boss Rush',
    description: 'Multiple boss-tier enemies appear. Heavy firepower required!',
    timeLimitMs: 300000,
    startWeaponId: 5,
    unlockWeaponId: 13,
    terrainTint: 0xb8a8a8,
    spawns: [
      spawn(WORLD_SIZE + 100, 256, CreatureType.SPIDER_MOTHER, 5000, 1, { healthOverride: 300 }),
      spawn(-100, 768, CreatureType.SPIDER_MOTHER, 20000, 1, { healthOverride: 300 }),
      spawn(WORLD_SIZE + 100, 512, CreatureType.ALIEN_BOSS, 40000, 1),
      spawn(-100, 512, CreatureType.BIG_ZOMBIE, 60000, 3, { healthOverride: 150 }),
      spawn(512, -100, CreatureType.ALIEN_BOSS, 80000, 1),
      ...(() => {
        const entries: SpawnEntry[] = [];
        let trigger = 10000;
        while (trigger < 100000) {
          entries.push(spawnAt(edgePosition('left'), CreatureType.ZOMBIE, trigger, 5));
          entries.push(spawnAt(edgePosition('right'), CreatureType.SPIDER, trigger + 2000, 5));
          trigger += 15000;
        }
        return entries;
      })()
    ]
  },
  {
    level: '2.9',
    tier: 2,
    questNumber: 9,
    title: 'Endurance Test',
    description: 'A long battle with escalating difficulty.',
    timeLimitMs: 360000,
    startWeaponId: 2,
    unlockPerkId: PerkId.LONG_DISTANCE_RUNNER,
    terrainTint: 0xb8a8a8,
    spawns: (() => {
      const entries: SpawnEntry[] = [];
      let trigger = 1000;
      let intensity = 1;
      while (trigger < 180000) {
        const count = Math.min(intensity, 8);
        entries.push(spawnAt(edgePosition('right'), CreatureType.ZOMBIE, trigger, count));
        entries.push(spawnAt(edgePosition('left'), CreatureType.FAST_ZOMBIE, trigger + 2000, count));
        if (intensity > 3) {
          entries.push(spawnAt(edgePosition('top'), CreatureType.SPIDER, trigger + 1000, Math.floor(count / 2)));
        }
        if (intensity > 5) {
          entries.push(spawnAt(edgePosition('bottom'), CreatureType.ALIEN, trigger + 1500, Math.floor(count / 3)));
        }
        trigger += Math.max(4000, 8000 - intensity * 500);
        intensity++;
      }
      return entries;
    })()
  },
  {
    level: '2.10',
    tier: 2,
    questNumber: 10,
    title: 'The Hive Mind',
    description: 'Face the alien commander and their elite guard. Tier 2 finale!',
    timeLimitMs: 300000,
    startWeaponId: 5,
    unlockWeaponId: 14,
    terrainTint: 0xb8a8a8,
    spawns: [
      spawn(512, 512, CreatureType.ALIEN_BOSS, 3000, 1, { healthOverride: 1000, sizeOverride: 48 }),
      ...(() => {
        const entries: SpawnEntry[] = [];
        let trigger = 5000;
        while (trigger < 150000) {
          entries.push(spawnAt(edgePosition('left'), CreatureType.ALIEN_ELITE, trigger, 2));
          entries.push(spawnAt(edgePosition('right'), CreatureType.ALIEN, trigger + 1000, 4));
          entries.push(spawnAt(edgePosition('top'), CreatureType.SPIDER, trigger + 500, 3));
          entries.push(spawnAt(edgePosition('bottom'), CreatureType.ZOMBIE, trigger + 1500, 4));
          trigger += 12000;
        }
        return entries;
      })()
    ]
  },

  // Tier 3 (abbreviated - similar pattern)
  {
    level: '3.1',
    tier: 3,
    questNumber: 1,
    title: 'Desert Storm',
    description: 'Battle in the wastelands. New terrain, new challenges!',
    timeLimitMs: 300000,
    startWeaponId: 3,
    unlockPerkId: PerkId.SHARPSHOOTER,
    terrainTint: 0xd8c8a8,
    spawns: (() => {
      const entries: SpawnEntry[] = [];
      let trigger = 1500;
      while (trigger < 150000) {
        entries.push(spawnAt(edgePosition('right'), CreatureType.LIZARD, trigger, 5));
        entries.push(spawnAt(edgePosition('left'), CreatureType.LIZARD_SPITTER, trigger + 2000, 3));
        entries.push(spawnAt(edgePosition('bottom'), CreatureType.FAST_ZOMBIE, trigger + 4000, 4));
        trigger += 10000;
      }
      return entries;
    })()
  },
  {
    level: '3.2',
    tier: 3,
    questNumber: 2,
    title: 'Night Terrors',
    description: 'Visibility is low. Trust your instincts!',
    timeLimitMs: 240000,
    startWeaponId: 5,
    unlockWeaponId: 15,
    terrainTint: 0x888888,
    spawns: (() => {
      const entries: SpawnEntry[] = [];
      let trigger = 2000;
      while (trigger < 120000) {
        entries.push(spawn(
          Math.random() * WORLD_SIZE,
          Math.random() * WORLD_SIZE,
          CreatureType.SPIDER,
          trigger,
          4
        ));
        entries.push(spawnAt(edgePosition('left'), CreatureType.FAST_ZOMBIE, trigger + 1000, 3));
        trigger += 6000;
      }
      return entries;
    })()
  },
  {
    level: '3.3',
    tier: 3,
    questNumber: 3,
    title: 'Siege Warfare',
    description: 'Defend against waves from all directions.',
    timeLimitMs: 300000,
    startWeaponId: 6,
    unlockPerkId: PerkId.BREATHING_ROOM,
    terrainTint: 0xd8c8a8,
    spawns: (() => {
      const entries: SpawnEntry[] = [];
      let trigger = 1000;
      let wave = 0;
      while (trigger < 180000) {
        const edges: ('top' | 'bottom' | 'left' | 'right')[] = ['top', 'bottom', 'left', 'right'];
        for (const edge of edges) {
          entries.push(spawnAt(edgePosition(edge), CreatureType.ZOMBIE, trigger + wave * 500, 3 + wave));
        }
        trigger += 15000;
        wave++;
      }
      return entries;
    })()
  },
];

export function getQuestByLevel(level: string): QuestDefinition | undefined {
  return QUEST_DEFINITIONS.find(q => q.level === level);
}

export function getQuestsByTier(tier: number): QuestDefinition[] {
  return QUEST_DEFINITIONS.filter(q => q.tier === tier);
}

export function getTierCount(): number {
  const tiers = new Set(QUEST_DEFINITIONS.map(q => q.tier));
  return tiers.size;
}

export function isQuestUnlocked(level: string, progress: QuestProgressMap): boolean {
  const quest = getQuestByLevel(level);
  if (!quest) return false;

  if (quest.tier === 1 && quest.questNumber === 1) return true;

  if (quest.questNumber === 1) {
    const prevTierQuests = getQuestsByTier(quest.tier - 1);
    return prevTierQuests.every(q => progress[q.level]?.completed);
  }

  const prevLevel = `${quest.tier}.${quest.questNumber - 1}`;
  return progress[prevLevel]?.completed ?? false;
}

export function getTotalQuestCount(): number {
  return QUEST_DEFINITIONS.length;
}

export function getCompletedQuestCount(progress: QuestProgressMap): number {
  return Object.values(progress).filter(p => p.completed).length;
}
