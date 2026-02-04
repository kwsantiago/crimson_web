import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../config';
import { ProjectileType } from '../data/weapons';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  damage: number = 0;
  projectileType: ProjectileType = ProjectileType.BULLET;
  penetrating: boolean = false;
  private lifespan: number = 0;
  private maxLifespan: number = 2000;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
  }

  fire(
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    type: ProjectileType = ProjectileType.BULLET
  ) {
    this.projectileType = type;
    this.penetrating = type === ProjectileType.FLAME;

    const textureKey = this.getTextureForType(type);
    this.setTexture(textureKey);

    this.setPosition(x, y);
    this.setRotation(angle);
    this.setActive(true);
    this.setVisible(true);
    this.damage = damage;
    this.lifespan = 0;

    if (type === ProjectileType.FLAME) {
      this.maxLifespan = 500;
    } else {
      this.maxLifespan = 2000;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;

    this.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
  }

  private getTextureForType(type: ProjectileType): string {
    switch (type) {
      case ProjectileType.PLASMA:
        return 'plasma';
      case ProjectileType.FLAME:
        return 'flame';
      default:
        return 'bullet';
    }
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
