import Phaser from 'phaser';
import { Creature } from '../entities/Creature';
import { CreatureType } from '../data/creatures';
import { WORLD_WIDTH, WORLD_HEIGHT, SCREEN_WIDTH, SCREEN_HEIGHT } from '../config';

export class SpawnManager {
  private scene: Phaser.Scene;
  private creatures: Phaser.Physics.Arcade.Group;
  private enemyProjectiles: Phaser.Physics.Arcade.Group;
  private spawnTimer: number = 0;
  private baseSpawnInterval: number = 2.0;
  private minSpawnInterval: number = 0.5;
  private waveNumber: number = 0;
  private timeElapsed: number = 0;
  private spawnStage: number = 0;
  private playerLevel: number = 1;
  private stageNotified: boolean[] = [false, false, false, false];

  constructor(
    scene: Phaser.Scene,
    creatures: Phaser.Physics.Arcade.Group,
    enemyProjectiles: Phaser.Physics.Arcade.Group
  ) {
    this.scene = scene;
    this.creatures = creatures;
    this.enemyProjectiles = enemyProjectiles;
  }

  update(delta: number, playerLevel: number) {
    const dt = delta / 1000;
    this.timeElapsed += dt;
    this.spawnTimer -= dt;
    this.playerLevel = playerLevel;

    this.updateStage();

    if (this.spawnTimer <= 0) {
      this.spawnWave();
      this.spawnTimer = this.getSpawnInterval();
    }
  }

  private updateStage() {
    if (this.spawnStage === 0 && this.playerLevel >= 5) {
      this.spawnStage = 1;
      if (!this.stageNotified[1]) {
        this.stageNotified[1] = true;
        this.spawnCreatureGroup(CreatureType.SPIDER, 8);
      }
    }
    if (this.spawnStage === 1 && this.playerLevel >= 9) {
      this.spawnStage = 2;
      if (!this.stageNotified[2]) {
        this.stageNotified[2] = true;
        this.spawnCreatureGroup(CreatureType.ALIEN, 4);
      }
    }
    if (this.spawnStage === 2 && this.playerLevel >= 11) {
      this.spawnStage = 3;
      if (!this.stageNotified[3]) {
        this.stageNotified[3] = true;
        this.spawnCreatureGroup(CreatureType.SPIDER_MOTHER, 2);
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
    const decay = this.timeElapsed / 60;
    return Math.max(this.minSpawnInterval, this.baseSpawnInterval - decay * 0.3);
  }

  private spawnWave() {
    this.waveNumber++;
    const count = 3 + Math.floor(this.waveNumber * 0.5);

    for (let i = 0; i < count; i++) {
      const pos = this.getSpawnPosition();
      const type = this.pickCreatureType();
      this.spawnCreature(type, pos.x, pos.y);
    }
  }

  private pickCreatureType(): CreatureType {
    const roll = Math.random();

    switch (this.spawnStage) {
      case 0:
        if (roll < 0.8) return CreatureType.ZOMBIE;
        return CreatureType.FAST_ZOMBIE;

      case 1:
        if (roll < 0.5) return CreatureType.ZOMBIE;
        if (roll < 0.7) return CreatureType.FAST_ZOMBIE;
        return CreatureType.SPIDER;

      case 2:
        if (roll < 0.35) return CreatureType.ZOMBIE;
        if (roll < 0.5) return CreatureType.FAST_ZOMBIE;
        if (roll < 0.7) return CreatureType.SPIDER;
        return CreatureType.ALIEN;

      case 3:
      default:
        if (roll < 0.25) return CreatureType.ZOMBIE;
        if (roll < 0.4) return CreatureType.FAST_ZOMBIE;
        if (roll < 0.6) return CreatureType.SPIDER;
        if (roll < 0.8) return CreatureType.ALIEN;
        return CreatureType.SPIDER_MOTHER;
    }
  }

  private spawnCreature(type: CreatureType, x: number, y: number) {
    const creature = new Creature(this.scene, x, y, type, this.enemyProjectiles);
    this.creatures.add(creature);
  }

  spawnBabySpiders(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 40;
      const offsetY = (Math.random() - 0.5) * 40;
      const spider = new Creature(this.scene, x + offsetX, y + offsetY, CreatureType.SPIDER);
      this.creatures.add(spider);
    }
  }

  private getSpawnPosition(): { x: number; y: number } {
    const camera = this.scene.cameras.main;
    const edge = Phaser.Math.Between(0, 3);
    const margin = 50;

    let x: number, y: number;

    switch (edge) {
      case 0:
        x = camera.scrollX - margin;
        y = Phaser.Math.Between(camera.scrollY, camera.scrollY + SCREEN_HEIGHT);
        break;
      case 1:
        x = camera.scrollX + SCREEN_WIDTH + margin;
        y = Phaser.Math.Between(camera.scrollY, camera.scrollY + SCREEN_HEIGHT);
        break;
      case 2:
        x = Phaser.Math.Between(camera.scrollX, camera.scrollX + SCREEN_WIDTH);
        y = camera.scrollY - margin;
        break;
      case 3:
      default:
        x = Phaser.Math.Between(camera.scrollX, camera.scrollX + SCREEN_WIDTH);
        y = camera.scrollY + SCREEN_HEIGHT + margin;
        break;
    }

    x = Phaser.Math.Clamp(x, 0, WORLD_WIDTH);
    y = Phaser.Math.Clamp(y, 0, WORLD_HEIGHT);

    return { x, y };
  }

  reset() {
    this.spawnTimer = 2.0;
    this.waveNumber = 0;
    this.timeElapsed = 0;
    this.spawnStage = 0;
    this.stageNotified = [false, false, false, false];
  }
}
