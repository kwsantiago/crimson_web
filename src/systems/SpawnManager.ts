import Phaser from 'phaser';
import { Creature } from '../entities/Creature';
import { WORLD_WIDTH, WORLD_HEIGHT, SCREEN_WIDTH, SCREEN_HEIGHT } from '../config';

export class SpawnManager {
  private scene: Phaser.Scene;
  private creatures: Phaser.Physics.Arcade.Group;
  private spawnTimer: number = 0;
  private baseSpawnInterval: number = 2.0;
  private minSpawnInterval: number = 0.5;
  private waveNumber: number = 0;
  private timeElapsed: number = 0;

  constructor(scene: Phaser.Scene, creatures: Phaser.Physics.Arcade.Group) {
    this.scene = scene;
    this.creatures = creatures;
  }

  update(delta: number) {
    const dt = delta / 1000;
    this.timeElapsed += dt;
    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0) {
      this.spawnWave();
      this.spawnTimer = this.getSpawnInterval();
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
      const zombie = new Creature(this.scene, pos.x, pos.y);
      this.creatures.add(zombie);
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
  }
}
