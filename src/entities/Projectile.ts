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
  isEnemyProjectile: boolean = false;

  private lifespan: number = 0;
  private maxLifespan: number = 2000;
  private startX: number = 0;
  private startY: number = 0;
  private trail?: Phaser.GameObjects.Graphics;
  private trailColor: number = 0xcccccc;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setActive(false);
    this.setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
    }
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
    this.isEnemyProjectile = false;
    this.startX = x;
    this.startY = y;
    this.lifespan = 0;

    this.penetrating = type === ProjectileType.FLAME || type === ProjectileType.GAUSS;

    if (type === ProjectileType.ROCKET || type === ProjectileType.NUKE) {
      this.isExplosive = true;
      this.explosionRadius = type === ProjectileType.NUKE ? 200 : 80;
    }

    this.setupVisuals(type);
    this.damage = damage;

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

    this.setActive(true);
    this.setVisible(true);
    this.setPosition(x, y);
    this.setRotation(angle + Math.PI / 2);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = true;
      body.reset(x, y);
      body.setCircle(8);
    }

    this.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );

    if (this.shouldDrawTrail(type)) {
      if (!this.trail) {
        this.trail = this.scene.add.graphics();
        this.trail.setDepth(3);
      }
      this.trail.clear();
    }
  }

  private setupVisuals(type: ProjectileType) {
    let frame = 0;
    let scale = 0.6;
    let tint = 0xffffff;
    this.trailColor = 0x808080;

    switch (type) {
      case ProjectileType.BULLET:
        this.setTexture('projs_sheet', 0);
        scale = 0.5;
        tint = 0xffffcc;
        this.trailColor = 0xaaaaaa;
        break;
      case ProjectileType.PLASMA:
        this.setTexture('projs_sheet', 3);
        scale = 0.8;
        tint = 0x44ffaa;
        this.trailColor = 0x00ff88;
        break;
      case ProjectileType.FLAME:
        this.setTexture('projs_sheet', 8);
        scale = 0.9;
        tint = 0xff8844;
        this.trailColor = 0xff4400;
        break;
      case ProjectileType.GAUSS:
        this.setTexture('projs_sheet', 1);
        scale = 0.6;
        tint = 0x66aaff;
        this.trailColor = 0x3388ff;
        break;
      case ProjectileType.ROCKET:
        this.setTexture('projs_sheet', 16);
        scale = 1.0;
        tint = 0xffcc44;
        this.trailColor = 0xff6600;
        break;
      case ProjectileType.ION:
        this.setTexture('projs_sheet', 2);
        scale = 0.7;
        tint = 0xaa66ff;
        this.trailColor = 0x8800ff;
        break;
      case ProjectileType.PULSE:
        this.setTexture('projs_sheet', 0);
        scale = 0.7;
        tint = 0xff66ff;
        this.trailColor = 0xff00ff;
        break;
      case ProjectileType.NUKE:
        this.setTexture('nuke');
        scale = 1.0;
        tint = 0xffff44;
        break;
      case ProjectileType.BLADE:
        this.setTexture('projs_sheet', 6);
        scale = 0.8;
        tint = 0xcccccc;
        break;
      case ProjectileType.SHRINK:
        this.setTexture('projs_sheet', 2);
        scale = 0.6;
        tint = 0x44ff44;
        break;
      case ProjectileType.SPLITTER:
        this.setTexture('projs_sheet', 3);
        scale = 0.7;
        tint = 0xffaa44;
        break;
      default:
        this.setTexture('projs_sheet', 0);
        scale = 0.5;
        tint = 0xffffff;
    }

    this.setScale(scale);
    this.setTint(tint);
    this.setAlpha(1.0);
  }

  private shouldDrawTrail(type: ProjectileType): boolean {
    return type === ProjectileType.BULLET ||
           type === ProjectileType.GAUSS ||
           type === ProjectileType.PLASMA ||
           type === ProjectileType.ION;
  }

  update(_time: number, delta: number) {
    if (!this.active) return;

    this.lifespan += delta;

    const lifeRatio = this.lifespan / this.maxLifespan;
    if (lifeRatio > 0.7) {
      this.setAlpha(1 - ((lifeRatio - 0.7) / 0.3));
    }

    if (this.trail && this.shouldDrawTrail(this.projectileType)) {
      this.trail.clear();

      const dx = this.x - this.startX;
      const dy = this.y - this.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        const alpha = Math.min(1.0, this.lifespan / 100) * (1 - lifeRatio * 0.5);
        this.trail.lineStyle(2, this.trailColor, alpha);
        this.trail.beginPath();
        this.trail.moveTo(this.startX, this.startY);
        this.trail.lineTo(this.x, this.y);
        this.trail.strokePath();
      }
    }

    if (this.lifespan >= this.maxLifespan ||
        this.x < -50 || this.x > WORLD_WIDTH + 50 ||
        this.y < -50 || this.y > WORLD_HEIGHT + 50) {
      this.destroy();
    }
  }

  destroy(fromScene?: boolean) {
    if (this.trail) {
      this.trail.clear();
    }
    this.setActive(false);
    this.setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
    }
  }
}
