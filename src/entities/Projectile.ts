import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../config';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  damage: number = 0;
  private lifespan: number = 0;
  private maxLifespan: number = 2000;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
  }

  fire(x: number, y: number, angle: number, speed: number, damage: number) {
    this.setPosition(x, y);
    this.setRotation(angle);
    this.setActive(true);
    this.setVisible(true);
    this.damage = damage;
    this.lifespan = 0;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;

    this.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
  }

  update(_time: number, delta: number) {
    this.lifespan += delta;

    if (this.lifespan >= this.maxLifespan ||
        this.x < 0 || this.x > WORLD_WIDTH ||
        this.y < 0 || this.y > WORLD_HEIGHT) {
      this.destroy();
    }
  }

  destroy(fromScene?: boolean) {
    this.setActive(false);
    this.setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
    }
  }
}
