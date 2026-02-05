import Phaser from 'phaser';
import { Creature, CreatureConfig, clearCreaturePool } from '../entities/Creature';
import { CreatureType } from '../data/creatures';
import { GameMode, GameModeConfig, GAME_MODE_CONFIGS } from '../data/gameModes';
import { WORLD_WIDTH, WORLD_HEIGHT, SCREEN_WIDTH, SCREEN_HEIGHT } from '../config';
import {
  AIMode,
  CreatureFlags,
  TintRGBA,
  generateRingFormation,
  generateGridFormation,
  experienceBasedTint,
  rollVariantStats,
  VARIANT_TINTS
} from './CreatureAI';

export class SpawnManager {
  private scene: Phaser.Scene;
  private creatures: Phaser.Physics.Arcade.Group;
  private enemyProjectiles: Phaser.Physics.Arcade.Group;
  private spawnTimer: number = 0;
  private waveNumber: number = 0;
  private timeElapsed: number = 0;
  private spawnStage: number = 0;
  private playerLevel: number = 1;
  private playerXp: number = 0;
  private stageNotified: boolean[] = [];
  private gameMode: GameMode = GameMode.SURVIVAL;
  private modeConfig: GameModeConfig;
  private rushSpawnTimer: number = 0;

  constructor(
    scene: Phaser.Scene,
    creatures: Phaser.Physics.Arcade.Group,
    enemyProjectiles: Phaser.Physics.Arcade.Group,
    gameMode: GameMode = GameMode.SURVIVAL
  ) {
    this.scene = scene;
    this.creatures = creatures;
    this.enemyProjectiles = enemyProjectiles;
    this.gameMode = gameMode;
    this.modeConfig = GAME_MODE_CONFIGS[gameMode];
    for (let i = 0; i < 15; i++) {
      this.stageNotified.push(false);
    }
    clearCreaturePool();
  }

  update(delta: number, playerLevel: number, playerXp?: number) {
    const dt = delta / 1000;
    this.timeElapsed += dt;
    this.spawnTimer -= dt;
    this.playerLevel = playerLevel;
    this.playerXp = playerXp ?? this.playerLevel * 1000;

    if (this.gameMode === GameMode.RUSH) {
      this.updateRush(dt);
    } else {
      this.updateSurvival(dt);
    }
  }

  private updateSurvival(dt: number) {
    this.updateStage();

    if (this.spawnTimer <= 0) {
      this.spawnWave();
      this.spawnTimer = this.getSpawnInterval();
    }
  }

  private updateRush(dt: number) {
    this.rushSpawnTimer -= dt;

    if (this.rushSpawnTimer <= 0) {
      this.spawnRushWave();
      this.rushSpawnTimer = this.getSpawnInterval();
    }

    this.updateStage();
  }

  private spawnRushWave() {
    const camera = this.scene.cameras.main;
    const elapsedMs = this.timeElapsed * 1000;

    const waveIntensity = Math.min(1.0, elapsedMs * 0.00000833 + 0.3);
    const count = Math.floor(4 + waveIntensity * 8);

    for (let i = 0; i < count; i++) {
      const pos = this.getRushSpawnPosition(elapsedMs, i);
      const type = this.pickRushCreatureType();
      this.spawnCreatureWithVariant(type, pos.x, pos.y, true);
    }
  }

  private getRushSpawnPosition(elapsedMs: number, index: number): { x: number; y: number } {
    const camera = this.scene.cameras.main;

    if (index % 2 === 0) {
      return {
        x: camera.scrollX + SCREEN_WIDTH + 64,
        y: camera.scrollY + SCREEN_HEIGHT / 2 + Math.cos(elapsedMs * 0.001 + index) * 200
      };
    } else {
      return {
        x: camera.scrollX - 64,
        y: camera.scrollY + SCREEN_HEIGHT / 2 + Math.sin(elapsedMs * 0.001 + index) * 200
      };
    }
  }

  private pickRushCreatureType(): CreatureType {
    const roll = Math.random();
    const intensity = Math.min(1.0, this.timeElapsed / 120);

    if (intensity < 0.3) {
      if (roll < 0.6) return CreatureType.ZOMBIE;
      if (roll < 0.9) return CreatureType.FAST_ZOMBIE;
      return CreatureType.SPIDER;
    } else if (intensity < 0.6) {
      if (roll < 0.3) return CreatureType.ZOMBIE;
      if (roll < 0.5) return CreatureType.FAST_ZOMBIE;
      if (roll < 0.7) return CreatureType.SPIDER;
      if (roll < 0.85) return CreatureType.BIG_ZOMBIE;
      return CreatureType.ALIEN;
    } else {
      if (roll < 0.15) return CreatureType.ZOMBIE;
      if (roll < 0.3) return CreatureType.FAST_ZOMBIE;
      if (roll < 0.45) return CreatureType.SPIDER;
      if (roll < 0.6) return CreatureType.BIG_ZOMBIE;
      if (roll < 0.7) return CreatureType.ALIEN;
      if (roll < 0.8) return CreatureType.LIZARD;
      if (roll < 0.9) return CreatureType.ALIEN_ELITE;
      return CreatureType.LIZARD_SPITTER;
    }
  }

  private updateStage() {
    if (this.spawnStage === 0 && this.playerLevel >= 5) {
      this.spawnStage = 1;
      if (!this.stageNotified[1]) {
        this.stageNotified[1] = true;
        this.spawnRingFormation(CreatureType.ALIEN, 8, 100);
        this.spawnRingFormation(CreatureType.ALIEN, 8, 100);
      }
    }
    if (this.spawnStage === 1 && this.playerLevel >= 9) {
      this.spawnStage = 2;
      if (!this.stageNotified[2]) {
        this.stageNotified[2] = true;
        this.spawnAlienBoss(WORLD_WIDTH + 50, WORLD_HEIGHT / 2);
      }
    }
    if (this.spawnStage === 2 && this.playerLevel >= 11) {
      this.spawnStage = 3;
      if (!this.stageNotified[3]) {
        this.stageNotified[3] = true;
        const step = 128.0 / 3.0;
        for (let i = 0; i < 12; i++) {
          this.spawnCreature(CreatureType.SPIDER_MOTHER, WORLD_WIDTH + 50, i * step + 256);
        }
      }
    }
    if (this.spawnStage === 3 && this.playerLevel >= 13) {
      this.spawnStage = 4;
      if (!this.stageNotified[4]) {
        this.stageNotified[4] = true;
        for (let i = 0; i < 4; i++) {
          this.spawnFastAlien(WORLD_WIDTH + 50, i * 64 + 384);
        }
      }
    }
    if (this.spawnStage === 4 && this.playerLevel >= 15) {
      this.spawnStage = 5;
      if (!this.stageNotified[5]) {
        this.stageNotified[5] = true;
        for (let i = 0; i < 4; i++) {
          this.spawnOrbiter(WORLD_WIDTH + 50, i * 64 + 384);
          this.spawnOrbiter(-50, i * 64 + 384);
        }
      }
    }
    if (this.spawnStage === 5 && this.playerLevel >= 17) {
      this.spawnStage = 6;
      if (!this.stageNotified[6]) {
        this.stageNotified[6] = true;
        this.spawnShockBoss(WORLD_WIDTH + 50, WORLD_HEIGHT / 2);
      }
    }
    if (this.spawnStage === 6 && this.playerLevel >= 19) {
      this.spawnStage = 7;
      if (!this.stageNotified[7]) {
        this.stageNotified[7] = true;
        this.spawnSplitter(640, WORLD_HEIGHT / 2);
      }
    }
    if (this.spawnStage === 7 && this.playerLevel >= 21) {
      this.spawnStage = 8;
      if (!this.stageNotified[8]) {
        this.stageNotified[8] = true;
        this.spawnSplitter(384, 256);
        this.spawnSplitter(640, 768);
      }
    }
    if (this.spawnStage === 8 && this.playerLevel >= 26) {
      this.spawnStage = 9;
      if (!this.stageNotified[9]) {
        this.stageNotified[9] = true;
        for (let i = 0; i < 4; i++) {
          this.spawnRangedVariant(WORLD_WIDTH + 50, i * 64 + 384);
          this.spawnRangedVariant(-50, i * 64 + 384);
        }
      }
    }
    if (this.spawnStage === 9 && this.playerLevel > 31) {
      this.spawnStage = 10;
      if (!this.stageNotified[10]) {
        this.stageNotified[10] = true;
        this.spawnShockBoss(WORLD_WIDTH + 50, WORLD_HEIGHT / 2);
        this.spawnShockBoss(-50, WORLD_HEIGHT / 2);
        for (let i = 0; i < 4; i++) {
          this.spawnRangedVariant(i * 64 + 384, -50);
          this.spawnRangedVariant(i * 64 + 384, WORLD_HEIGHT + 50);
        }
      }
    }
  }

  private spawnCreatureGroup(type: CreatureType, count: number) {
    for (let i = 0; i < count; i++) {
      const pos = this.getSpawnPosition();
      this.spawnCreature(type, pos.x, pos.y);
    }
  }

  private getSpawnInterval(): number {
    if (this.gameMode === GameMode.RUSH) {
      const decay = this.timeElapsed / 60;
      return Math.max(
        this.modeConfig.minSpawnInterval,
        this.modeConfig.baseSpawnInterval - decay * this.modeConfig.spawnDecayRate
      );
    }
    const elapsedMs = this.timeElapsed * 1000;
    const intervalMs = 500 - Math.floor(elapsedMs / 1800);
    return Math.max(0.001, intervalMs / 1000);
  }

  private spawnWave() {
    this.waveNumber++;

    if (this.gameMode === GameMode.RUSH) {
      const baseCount = 3 + Math.floor(this.waveNumber * 0.5);
      const count = Math.floor(baseCount * this.modeConfig.waveCountMultiplier);
      for (let i = 0; i < count; i++) {
        const pos = this.getSpawnPosition();
        const type = this.pickCreatureType();
        this.spawnCreatureWithVariant(type, pos.x, pos.y);
      }
      return;
    }

    const elapsedMs = this.timeElapsed * 1000;
    let intervalMs = 500 - Math.floor(elapsedMs / 1800);
    let extraSpawns = 0;

    if (intervalMs < 0) {
      extraSpawns = Math.floor((1 - intervalMs) / 2);
      intervalMs += extraSpawns * 2;
    }

    for (let i = 0; i < extraSpawns; i++) {
      const pos = this.getSpawnPosition();
      const type = this.pickCreatureType();
      this.spawnCreatureWithVariant(type, pos.x, pos.y);
    }

    const pos = this.getSpawnPosition();
    const type = this.pickCreatureType();
    this.spawnCreatureWithVariant(type, pos.x, pos.y);
  }

  private pickCreatureType(): CreatureType {
    const r10 = Math.floor(Math.random() * 10);
    const xp = this.playerXp;

    let typeId: number;

    if (xp < 12000) {
      typeId = r10 < 9 ? 2 : 3;
    } else if (xp < 25000) {
      if (r10 < 4) {
        typeId = 0;
      } else if (r10 > 8) {
        typeId = 2;
      } else {
        typeId = 3;
      }
    } else if (xp < 42000) {
      if (r10 < 5) {
        typeId = 2;
      } else {
        typeId = (Math.random() < 0.5) ? 3 : 4;
      }
    } else if (xp < 50000) {
      typeId = 2;
    } else if (xp < 90000) {
      typeId = 4;
    } else if (xp > 109999) {
      if (r10 < 6) {
        typeId = 2;
      } else if (r10 < 9) {
        typeId = 4;
      } else {
        typeId = 0;
      }
    } else {
      typeId = 0;
    }

    if ((Math.floor(Math.random() * 32) & 0x1F) === 2) {
      typeId = 3;
    }

    switch (typeId) {
      case 0: return CreatureType.ZOMBIE;
      case 1: return CreatureType.LIZARD;
      case 2: return CreatureType.ALIEN;
      case 3: return CreatureType.SPIDER;
      case 4: return CreatureType.SPIDER_MOTHER;
      default: return CreatureType.ALIEN;
    }
  }

  private spawnCreature(type: CreatureType, x: number, y: number, config?: CreatureConfig) {
    const creature = new Creature(this.scene, x, y, type, this.enemyProjectiles, config);
    this.creatures.add(creature);
    return creature;
  }

  private spawnCreatureWithVariant(
    type: CreatureType,
    x: number,
    y: number,
    applyRushModifiers: boolean = false
  ) {
    const rand = () => Math.floor(Math.random() * 0x7FFFFFFF);
    const rHealth = rand();
    const baseHealth = this.playerXp * 0.00125 + (rHealth & 0xF) + 52.0;
    const baseReward = baseHealth * 0.4 + 15;

    const variant = rollVariantStats(baseHealth, baseReward, rand);

    let config: CreatureConfig | undefined;

    if (variant.tint) {
      config = {
        tint: variant.tint,
        healthOverride: variant.health,
        xpOverride: Math.floor(variant.reward * 0.8)
      };
    } else if (this.playerXp > 5000) {
      const tint = experienceBasedTint(this.playerXp, rand);
      config = { tint };
    }

    const creature = new Creature(this.scene, x, y, type, this.enemyProjectiles, config);

    if (applyRushModifiers || this.gameMode === GameMode.RUSH) {
      creature.speed *= this.modeConfig.enemySpeedMultiplier;
      creature.xpValue = Math.floor(creature.xpValue * this.modeConfig.xpMultiplier);
    }

    this.creatures.add(creature);
    return creature;
  }

  spawnBabySpiders(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 40;
      const offsetY = (Math.random() - 0.5) * 40;
      const spider = new Creature(this.scene, x + offsetX, y + offsetY, CreatureType.BABY_SPIDER);
      this.creatures.add(spider);
    }
  }

  spawnChildCreature(x: number, y: number, type: CreatureType) {
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = (Math.random() - 0.5) * 40;
    const creature = new Creature(this.scene, x + offsetX, y + offsetY, type, this.enemyProjectiles);
    this.creatures.add(creature);
    return creature;
  }

  spawnSplitChildren(parentX: number, parentY: number, children: {
    health: number;
    size: number;
    speed: number;
    damage: number;
    xp: number;
    heading: number;
  }[], parentType: CreatureType, parentTint: TintRGBA | null) {
    for (const child of children) {
      const config: CreatureConfig = {
        flags: CreatureFlags.SPLIT_ON_DEATH,
        sizeOverride: child.size,
        healthOverride: child.health,
        speedOverride: child.speed,
        damageOverride: child.damage,
        xpOverride: child.xp,
        phaseSeed: Math.random() * 0x17F,
        tint: parentTint ?? undefined
      };
      const creature = new Creature(
        this.scene,
        parentX,
        parentY,
        parentType,
        this.enemyProjectiles,
        config
      );
      creature.heading = child.heading;
      this.creatures.add(creature);
    }
  }

  private spawnRingFormation(type: CreatureType, count: number, radius: number) {
    const pos = this.getSpawnPosition();
    const ring = generateRingFormation(count, radius);

    const parentConfig: CreatureConfig = {
      healthOverride: 200,
      xpOverride: 600,
      tint: { r: 0.65, g: 0.85, b: 0.97, a: 1.0 }
    };
    const parent = this.spawnCreature(type, pos.x, pos.y, parentConfig);

    for (const child of ring) {
      const childConfig: CreatureConfig = {
        aiMode: AIMode.FORMATION,
        linkIndex: parent.poolIndex,
        targetOffsetX: child.offsetX,
        targetOffsetY: child.offsetY,
        healthOverride: 40,
        speedOverride: 72,
        xpOverride: 60,
        tint: { r: 0.32, g: 0.588, b: 0.426, a: 1.0 }
      };
      this.spawnCreature(type, pos.x + child.offsetX, pos.y + child.offsetY, childConfig);
    }
  }

  private spawnChainFormation(type: CreatureType, count: number) {
    const pos = this.getSpawnPosition();

    const parentConfig: CreatureConfig = {
      aiMode: AIMode.SWARM,
      healthOverride: 1500,
      xpOverride: 1000,
      damageOverride: 150,
      sizeOverride: 69,
      tint: { r: 0.99, g: 0.99, b: 0.21, a: 1.0 }
    };
    const parent = this.spawnCreature(type, pos.x, pos.y, parentConfig);

    let prevIndex = parent.poolIndex;
    for (let i = 0; i < count; i++) {
      const angle = (2 + i * 2) * (Math.PI / 8.0);
      const childX = pos.x + Math.cos(angle) * 256.0;
      const childY = pos.y + Math.sin(angle) * 256.0;

      const childConfig: CreatureConfig = {
        aiMode: AIMode.FORMATION,
        linkIndex: prevIndex,
        targetOffsetX: -256.0 + i * 64.0,
        targetOffsetY: -256.0,
        healthOverride: 60,
        speedOverride: 72,
        xpOverride: 60,
        damageOverride: 14,
        tint: { r: 0.6, g: 0.6, b: 0.31, a: 1.0 }
      };
      const child = this.spawnCreature(type, childX, childY, childConfig);
      prevIndex = child.poolIndex;
    }
  }

  private spawnGridFormation(type: CreatureType, x: number, y: number) {
    const grid = generateGridFormation([0, -576], [128, 257], -64, 16);

    const parentConfig: CreatureConfig = {
      aiMode: AIMode.BEELINE,
      healthOverride: 1500,
      xpOverride: 600,
      damageOverride: 40,
      tint: { r: 0.7, g: 0.8, b: 0.31, a: 1.0 }
    };
    const parent = this.spawnCreature(type, x, y, parentConfig);

    for (const child of grid) {
      const childConfig: CreatureConfig = {
        aiMode: AIMode.LINKED_STOP,
        linkIndex: parent.poolIndex,
        targetOffsetX: child.offsetX,
        targetOffsetY: child.offsetY,
        healthOverride: 40,
        speedOverride: 60,
        xpOverride: 60,
        damageOverride: 4,
        tint: { r: 0.4, g: 0.7, b: 0.11, a: 1.0 }
      };
      this.spawnCreature(type, x + child.offsetX, y + child.offsetY, childConfig);
    }
  }

  private spawnOrbiter(x: number, y: number) {
    const config: CreatureConfig = {
      aiMode: AIMode.HOLD,
      flags: CreatureFlags.AI7_LINK_TIMER,
      healthOverride: 10,
      speedOverride: 54,
      xpOverride: 150,
      damageOverride: 40,
      orbitRadius: 1.5,
      tint: { r: 0.65, g: 0.7, b: 0.95, a: 1.0 }
    };
    this.spawnCreature(CreatureType.ALIEN, x, y, config);
  }

  private spawnShockBoss(x: number, y: number) {
    const config: CreatureConfig = {
      flags: CreatureFlags.RANGED_ATTACK_SHOCK,
      healthOverride: 4500,
      speedOverride: 60,
      xpOverride: 4500,
      damageOverride: 50,
      sizeOverride: 64,
      orbitAngle: 0.9,
      tint: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 }
    };
    this.spawnCreature(CreatureType.SPIDER, x, y, config);
  }

  private spawnRangedVariant(x: number, y: number) {
    const config: CreatureConfig = {
      aiMode: AIMode.BEELINE,
      flags: CreatureFlags.RANGED_ATTACK_VARIANT,
      healthOverride: 200,
      speedOverride: 60,
      xpOverride: 200,
      damageOverride: 20,
      sizeOverride: 40,
      orbitAngle: 0.4,
      rangedProjectileType: 26,
      tint: { r: 0.9, g: 0.1, b: 0.1, a: 1.0 }
    };
    this.spawnCreature(CreatureType.SPIDER, x, y, config);
  }

  private spawnSplitter(x: number, y: number) {
    const config: CreatureConfig = {
      flags: CreatureFlags.SPLIT_ON_DEATH,
      healthOverride: 400,
      speedOverride: 60,
      xpOverride: 1000,
      damageOverride: 17,
      sizeOverride: 80,
      tint: { r: 0.8, g: 0.7, b: 0.4, a: 1.0 }
    };
    this.spawnCreature(CreatureType.SPIDER_MOTHER, x, y, config);
  }

  private spawnAlienBoss(x: number, y: number) {
    const config: CreatureConfig = {
      healthOverride: 600,
      speedOverride: 72,
      xpOverride: 900,
      damageOverride: 20,
      sizeOverride: 56,
      tint: { r: 0.9, g: 0.2, b: 0.2, a: 1.0 }
    };
    this.spawnCreature(CreatureType.ALIEN, x, y, config);
  }

  private spawnFastAlien(x: number, y: number) {
    const config: CreatureConfig = {
      healthOverride: 80,
      speedOverride: 120,
      xpOverride: 120,
      damageOverride: 12,
      tint: { r: 0.9, g: 0.3, b: 0.3, a: 1.0 }
    };
    this.spawnCreature(CreatureType.ALIEN, x, y, config);
  }

  private getSpawnPosition(): { x: number; y: number } {
    const edge = Phaser.Math.Between(0, 3);
    const margin = 40;

    let x: number, y: number;

    switch (edge) {
      case 0:
        x = Phaser.Math.Between(0, WORLD_WIDTH);
        y = -margin;
        break;
      case 1:
        x = Phaser.Math.Between(0, WORLD_WIDTH);
        y = WORLD_HEIGHT + margin;
        break;
      case 2:
        x = -margin;
        y = Phaser.Math.Between(0, WORLD_HEIGHT);
        break;
      case 3:
      default:
        x = WORLD_WIDTH + margin;
        y = Phaser.Math.Between(0, WORLD_HEIGHT);
        break;
    }

    return { x, y };
  }

  getXpMultiplier(): number {
    return this.modeConfig.xpMultiplier;
  }

  getGameMode(): GameMode {
    return this.gameMode;
  }

  reset() {
    this.spawnTimer = this.modeConfig.baseSpawnInterval;
    this.rushSpawnTimer = this.modeConfig.baseSpawnInterval;
    this.waveNumber = 0;
    this.timeElapsed = 0;
    this.spawnStage = 0;
    for (let i = 0; i < this.stageNotified.length; i++) {
      this.stageNotified[i] = false;
    }
    clearCreaturePool();
  }
}
