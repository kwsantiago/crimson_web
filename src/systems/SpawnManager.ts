import Phaser from 'phaser';
import { Creature } from '../entities/Creature';
import { CreatureType } from '../data/creatures';
import { GameMode, GameModeConfig, GAME_MODE_CONFIGS } from '../data/gameModes';
import { WORLD_WIDTH, WORLD_HEIGHT, SCREEN_WIDTH, SCREEN_HEIGHT } from '../config';

export class SpawnManager {
  private scene: Phaser.Scene;
  private creatures: Phaser.Physics.Arcade.Group;
  private enemyProjectiles: Phaser.Physics.Arcade.Group;
  private spawnTimer: number = 0;
  private waveNumber: number = 0;
  private timeElapsed: number = 0;
  private spawnStage: number = 0;
  private playerLevel: number = 1;
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
  }

  update(delta: number, playerLevel: number) {
    const dt = delta / 1000;
    this.timeElapsed += dt;
    this.spawnTimer -= dt;
    this.playerLevel = playerLevel;

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
      this.spawnCreature(type, pos.x, pos.y, true);
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
    if (this.spawnStage === 0 && this.playerLevel >= 3) {
      this.spawnStage = 1;
      if (!this.stageNotified[1]) {
        this.stageNotified[1] = true;
        this.spawnCreatureGroup(CreatureType.FAST_ZOMBIE, 6);
      }
    }
    if (this.spawnStage === 1 && this.playerLevel >= 5) {
      this.spawnStage = 2;
      if (!this.stageNotified[2]) {
        this.stageNotified[2] = true;
        this.spawnCreatureGroup(CreatureType.SPIDER, 10);
      }
    }
    if (this.spawnStage === 2 && this.playerLevel >= 7) {
      this.spawnStage = 3;
      if (!this.stageNotified[3]) {
        this.stageNotified[3] = true;
        this.spawnCreatureGroup(CreatureType.BIG_ZOMBIE, 4);
      }
    }
    if (this.spawnStage === 3 && this.playerLevel >= 9) {
      this.spawnStage = 4;
      if (!this.stageNotified[4]) {
        this.stageNotified[4] = true;
        this.spawnCreatureGroup(CreatureType.ALIEN, 5);
      }
    }
    if (this.spawnStage === 4 && this.playerLevel >= 11) {
      this.spawnStage = 5;
      if (!this.stageNotified[5]) {
        this.stageNotified[5] = true;
        this.spawnCreatureGroup(CreatureType.SPIDER_MOTHER, 3);
      }
    }
    if (this.spawnStage === 5 && this.playerLevel >= 13) {
      this.spawnStage = 6;
      if (!this.stageNotified[6]) {
        this.stageNotified[6] = true;
        this.spawnCreatureGroup(CreatureType.LIZARD, 8);
      }
    }
    if (this.spawnStage === 6 && this.playerLevel >= 15) {
      this.spawnStage = 7;
      if (!this.stageNotified[7]) {
        this.stageNotified[7] = true;
        this.spawnCreatureGroup(CreatureType.ALIEN_ELITE, 4);
        this.spawnCreatureGroup(CreatureType.LIZARD_SPITTER, 4);
      }
    }
    if (this.spawnStage === 7 && this.playerLevel >= 17) {
      this.spawnStage = 8;
      if (!this.stageNotified[8]) {
        this.stageNotified[8] = true;
        this.spawnCreatureGroup(CreatureType.NEST, 2);
      }
    }
    if (this.spawnStage === 8 && this.playerLevel >= 20) {
      this.spawnStage = 9;
      if (!this.stageNotified[9]) {
        this.stageNotified[9] = true;
        this.spawnCreature(CreatureType.ALIEN_BOSS, WORLD_WIDTH / 2, 50);
      }
    }
    if (this.spawnStage === 9 && this.playerLevel >= 25) {
      this.spawnStage = 10;
      if (!this.stageNotified[10]) {
        this.stageNotified[10] = true;
        this.spawnCreature(CreatureType.BOSS, WORLD_WIDTH / 2, WORLD_HEIGHT - 50);
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
        this.spawnCreature(type, pos.x, pos.y);
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
      this.spawnCreature(type, pos.x, pos.y);
    }

    const pos = this.getSpawnPosition();
    const type = this.pickCreatureType();
    this.spawnCreature(type, pos.x, pos.y);
  }

  private pickCreatureType(): CreatureType {
    const roll = Math.random();

    switch (this.spawnStage) {
      case 0:
        return CreatureType.ZOMBIE;

      case 1:
        if (roll < 0.7) return CreatureType.ZOMBIE;
        return CreatureType.FAST_ZOMBIE;

      case 2:
        if (roll < 0.5) return CreatureType.ZOMBIE;
        if (roll < 0.7) return CreatureType.FAST_ZOMBIE;
        return CreatureType.SPIDER;

      case 3:
        if (roll < 0.4) return CreatureType.ZOMBIE;
        if (roll < 0.55) return CreatureType.FAST_ZOMBIE;
        if (roll < 0.7) return CreatureType.SPIDER;
        if (roll < 0.9) return CreatureType.BIG_ZOMBIE;
        return CreatureType.BABY_SPIDER;

      case 4:
        if (roll < 0.3) return CreatureType.ZOMBIE;
        if (roll < 0.45) return CreatureType.FAST_ZOMBIE;
        if (roll < 0.6) return CreatureType.SPIDER;
        if (roll < 0.75) return CreatureType.BIG_ZOMBIE;
        return CreatureType.ALIEN;

      case 5:
        if (roll < 0.25) return CreatureType.ZOMBIE;
        if (roll < 0.4) return CreatureType.FAST_ZOMBIE;
        if (roll < 0.55) return CreatureType.SPIDER;
        if (roll < 0.65) return CreatureType.BIG_ZOMBIE;
        if (roll < 0.8) return CreatureType.ALIEN;
        if (roll < 0.95) return CreatureType.SPIDER_MOTHER;
        return CreatureType.BABY_SPIDER;

      case 6:
        if (roll < 0.2) return CreatureType.ZOMBIE;
        if (roll < 0.3) return CreatureType.FAST_ZOMBIE;
        if (roll < 0.45) return CreatureType.SPIDER;
        if (roll < 0.55) return CreatureType.BIG_ZOMBIE;
        if (roll < 0.65) return CreatureType.ALIEN;
        if (roll < 0.75) return CreatureType.SPIDER_MOTHER;
        return CreatureType.LIZARD;

      case 7:
        if (roll < 0.15) return CreatureType.ZOMBIE;
        if (roll < 0.25) return CreatureType.FAST_ZOMBIE;
        if (roll < 0.35) return CreatureType.SPIDER;
        if (roll < 0.45) return CreatureType.BIG_ZOMBIE;
        if (roll < 0.55) return CreatureType.ALIEN;
        if (roll < 0.65) return CreatureType.SPIDER_MOTHER;
        if (roll < 0.75) return CreatureType.LIZARD;
        if (roll < 0.85) return CreatureType.ALIEN_ELITE;
        return CreatureType.LIZARD_SPITTER;

      case 8:
      case 9:
      case 10:
      default:
        if (roll < 0.1) return CreatureType.ZOMBIE;
        if (roll < 0.2) return CreatureType.FAST_ZOMBIE;
        if (roll < 0.3) return CreatureType.SPIDER;
        if (roll < 0.4) return CreatureType.BIG_ZOMBIE;
        if (roll < 0.5) return CreatureType.ALIEN;
        if (roll < 0.6) return CreatureType.SPIDER_MOTHER;
        if (roll < 0.7) return CreatureType.LIZARD;
        if (roll < 0.8) return CreatureType.ALIEN_ELITE;
        if (roll < 0.9) return CreatureType.LIZARD_SPITTER;
        return CreatureType.BABY_SPIDER;
    }
  }

  private spawnCreature(type: CreatureType, x: number, y: number, applyRushModifiers: boolean = false) {
    const creature = new Creature(this.scene, x, y, type, this.enemyProjectiles);

    if (applyRushModifiers || this.gameMode === GameMode.RUSH) {
      creature.speed *= this.modeConfig.enemySpeedMultiplier;
      creature.xpValue = Math.floor(creature.xpValue * this.modeConfig.xpMultiplier);
    }

    this.creatures.add(creature);
  }

  spawnBabySpiders(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 40;
      const offsetY = (Math.random() - 0.5) * 40;
      const spider = new Creature(this.scene, x + offsetX, y + offsetY, CreatureType.BABY_SPIDER);
      this.creatures.add(spider);
    }
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
  }
}
