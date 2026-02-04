import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../config';
import { ProjectileType } from '../data/weapons';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  damage: number = 0;
  projectileType: ProjectileType = ProjectileType.BULLET;
  penetrating: boolean = false;
  isPoisoned: boolean = false;
  isExplosive: boolean = false;
  explosionRadius: number = 0;
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
    this.isPoisoned = false;
    this.isExplosive = false;
    this.explosionRadius = 0;

    this.penetrating = type === ProjectileType.FLAME || type === ProjectileType.GAUSS;

    if (type === ProjectileType.ROCKET || type === ProjectileType.NUKE) {
      this.isExplosive = true;
      this.explosionRadius = type === ProjectileType.NUKE ? 200 : 80;
    }

    const textureKey = this.getTextureForType(type);
    this.setTexture(textureKey);

    this.setPosition(x, y);
    this.setRotation(angle);
    this.setActive(true);
    this.setVisible(true);
    this.damage = damage;
    this.lifespan = 0;

    switch (type) {
      case ProjectileType.FLAME:
        this.maxLifespan = 500;
        break;
      case ProjectileType.NUKE:
        this.maxLifespan = 4000;
        break;
      case ProjectileType.ROCKET:
        this.maxLifespan = 3000;
        break;
      default:
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
      case ProjectileType.GAUSS:
        return 'gauss';
      case ProjectileType.ROCKET:
        return 'rocket';
      case ProjectileType.NUKE:
        return 'nuke';
      case ProjectileType.ION:
        return 'ion';
      case ProjectileType.BLADE:
        return 'blade';
      case ProjectileType.PULSE:
        return 'pulse';
      case ProjectileType.SHRINK:
        return 'shrink';
      case ProjectileType.SPLITTER:
        return 'splitter';
      default:
        return 'bullet';
    }
  }

  update(_time: number, delta: number) {
    this.lifespan += delta;

    if (this.lifespan >= this.maxLifespan ||
        this.x < -50 || this.x > WORLD_WIDTH + 50 ||
        this.y < -50 || this.y > WORLD_HEIGHT + 50) {
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
