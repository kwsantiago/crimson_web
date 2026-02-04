import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../config';
import { ProjectileType } from '../data/weapons';

const PROJ_FRAMES: Record<ProjectileType, number> = {
  [ProjectileType.BULLET]: 0,
  [ProjectileType.PLASMA]: 13,
  [ProjectileType.GAUSS]: 2,
  [ProjectileType.FLAME]: 2,
  [ProjectileType.ROCKET]: 8,
  [ProjectileType.NUKE]: 8,
  [ProjectileType.ION]: 2,
  [ProjectileType.BLADE]: 6,
  [ProjectileType.PULSE]: 0,
  [ProjectileType.SHRINK]: 2,
  [ProjectileType.SPLITTER]: 3,
};

const BULLET_TRAIL_TYPES = new Set([
  ProjectileType.BULLET,
  ProjectileType.GAUSS,
]);

const PLASMA_PARTICLE_TYPES = new Set([
  ProjectileType.PLASMA,
  ProjectileType.SHRINK,
]);

const BEAM_TYPES = new Set([
  ProjectileType.ION,
  ProjectileType.FLAME,
]);

const ROCKET_TYPES = new Set([
  ProjectileType.ROCKET,
  ProjectileType.NUKE,
]);

const PROJ_COLORS: Record<ProjectileType, { trail: number; head: number; rgb: [number, number, number] }> = {
  [ProjectileType.BULLET]: { trail: 0xdcdca0, head: 0xdcdca0, rgb: [0.94, 0.86, 0.63] },
  [ProjectileType.PLASMA]: { trail: 0xffffff, head: 0xffffff, rgb: [1.0, 1.0, 1.0] },
  [ProjectileType.GAUSS]: { trail: 0x78c8ff, head: 0x78c8ff, rgb: [0.47, 0.78, 1.0] },
  [ProjectileType.FLAME]: { trail: 0xffaa5a, head: 0xffffff, rgb: [1.0, 0.67, 0.35] },
  [ProjectileType.ROCKET]: { trail: 0xff6600, head: 0xffcc44, rgb: [1.0, 0.4, 0.0] },
  [ProjectileType.NUKE]: { trail: 0xff4400, head: 0xffff44, rgb: [1.0, 0.27, 0.0] },
  [ProjectileType.ION]: { trail: 0x78c8ff, head: 0x80ccff, rgb: [0.47, 0.78, 1.0] },
  [ProjectileType.BLADE]: { trail: 0xf078ff, head: 0xcccccc, rgb: [0.94, 0.47, 1.0] },
  [ProjectileType.PULSE]: { trail: 0x1a9933, head: 0x1a9933, rgb: [0.1, 0.6, 0.2] },
  [ProjectileType.SHRINK]: { trail: 0x4d4dff, head: 0xa0ffaa, rgb: [0.3, 0.3, 1.0] },
  [ProjectileType.SPLITTER]: { trail: 0xffaa44, head: 0xffe699, rgb: [1.0, 0.9, 0.1] },
};

const BEAM_SCALES: Record<ProjectileType, number> = {
  [ProjectileType.ION]: 2.2,
  [ProjectileType.FLAME]: 0.8,
  [ProjectileType.BULLET]: 0.8,
  [ProjectileType.PLASMA]: 0.8,
  [ProjectileType.GAUSS]: 0.8,
  [ProjectileType.ROCKET]: 0.8,
  [ProjectileType.NUKE]: 0.8,
  [ProjectileType.BLADE]: 0.8,
  [ProjectileType.PULSE]: 0.8,
  [ProjectileType.SHRINK]: 0.8,
  [ProjectileType.SPLITTER]: 0.8,
};

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
  private projIndex: number = 0;
  private static indexCounter: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setActive(false);
    this.setVisible(false);
    this.projIndex = Projectile.indexCounter++;
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
    const frame = PROJ_FRAMES[type] ?? 0;
    const colors = PROJ_COLORS[type] ?? PROJ_COLORS[ProjectileType.BULLET];
    this.trailColor = colors.trail;

    const isBeamType = BEAM_TYPES.has(type);
    const isPlasmaType = PLASMA_PARTICLE_TYPES.has(type);

    if (type === ProjectileType.NUKE) {
      this.setTexture('nuke');
      this.setScale(1.0);
      this.setTint(colors.head);
      this.setAlpha(1.0);
      return;
    }

    if (type === ProjectileType.ROCKET) {
      this.setTexture('projs_sheet', frame);
      this.setScale(1.2);
      this.setTint(colors.head);
      this.setAlpha(1.0);
      return;
    }

    if (isPlasmaType || isBeamType) {
      this.setTexture('projs_sheet', frame);
      this.setScale(0.0);
      this.setAlpha(0.0);
      return;
    }

    if (BULLET_TRAIL_TYPES.has(type)) {
      this.setTexture('projs_sheet', frame);
      this.setScale(0.6);
      this.setTint(colors.head);
      this.setAlpha(1.0);
      return;
    }

    let scale = 0.7;
    if (type === ProjectileType.BLADE) scale = 0.8;
    if (type === ProjectileType.PULSE) scale = 0.6;
    if (type === ProjectileType.SPLITTER) scale = 0.7;

    this.setTexture('projs_sheet', frame);
    this.setScale(scale);
    this.setTint(colors.head);
    this.setAlpha(1.0);
  }

  private shouldDrawTrail(type: ProjectileType): boolean {
    return BULLET_TRAIL_TYPES.has(type) ||
           PLASMA_PARTICLE_TYPES.has(type) ||
           BEAM_TYPES.has(type) ||
           ROCKET_TYPES.has(type);
  }

  update(_time: number, delta: number) {
    if (!this.active) return;

    this.lifespan += delta;

    const lifeRatio = this.lifespan / this.maxLifespan;
    const life = 1.0 - lifeRatio;

    if (lifeRatio > 0.7 && !PLASMA_PARTICLE_TYPES.has(this.projectileType) && !BEAM_TYPES.has(this.projectileType)) {
      this.setAlpha(1 - ((lifeRatio - 0.7) / 0.3));
    }

    if (this.trail && this.shouldDrawTrail(this.projectileType)) {
      this.trail.clear();

      const dx = this.x - this.startX;
      const dy = this.y - this.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        const colors = PROJ_COLORS[this.projectileType] ?? PROJ_COLORS[ProjectileType.BULLET];
        const baseAlpha = Math.min(1.0, life);

        if (BULLET_TRAIL_TYPES.has(this.projectileType)) {
          this.drawBulletTrail(dist, baseAlpha, colors);
        } else if (PLASMA_PARTICLE_TYPES.has(this.projectileType)) {
          this.drawPlasmaParticles(dist, baseAlpha, colors);
        } else if (BEAM_TYPES.has(this.projectileType)) {
          this.drawBeamEffect(dist, baseAlpha, colors);
        } else if (ROCKET_TYPES.has(this.projectileType)) {
          this.drawRocketTrail(baseAlpha, colors);
        }
      }
    }

    if (this.projectileType === ProjectileType.BLADE) {
      const spinAngle = this.projIndex * 0.1 + this.lifespan * 0.01;
      this.setRotation(spinAngle);
    }

    if (this.projectileType === ProjectileType.PULSE) {
      const dist = Math.hypot(this.x - this.startX, this.y - this.startY);
      const size = Math.min(dist * 0.16, 56) / 16;
      this.setScale(Math.max(0.3, size));
      this.setAlpha(0.7 * life);
    }

    if (this.lifespan >= this.maxLifespan ||
        this.x < -50 || this.x > WORLD_WIDTH + 50 ||
        this.y < -50 || this.y > WORLD_HEIGHT + 50) {
      this.destroy();
    }
  }

  private drawBulletTrail(dist: number, alpha: number, colors: { trail: number; head: number; rgb: [number, number, number] }) {
    if (!this.trail) return;

    const trailAlpha = alpha * 0.6;
    this.trail.lineStyle(2, colors.trail, trailAlpha);
    this.trail.beginPath();
    this.trail.moveTo(this.startX, this.startY);
    this.trail.lineTo(this.x, this.y);
    this.trail.strokePath();
  }

  private drawPlasmaParticles(dist: number, alpha: number, colors: { trail: number; head: number; rgb: [number, number, number] }) {
    if (!this.trail) return;

    const spacing = this.projectileType === ProjectileType.SHRINK ? 2.1 : 2.5;
    const segLimit = this.projectileType === ProjectileType.SHRINK ? 3 : 8;
    const tailSize = this.projectileType === ProjectileType.SHRINK ? 12 : 22;
    const headSize = this.projectileType === ProjectileType.SHRINK ? 16 : 56;
    const auraSize = 256;

    let segCount = Math.floor(this.damage / 5);
    segCount = Math.min(segCount, segLimit);

    const angle = this.rotation - Math.PI / 2;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    const tailAlpha = alpha * 0.4;
    for (let i = 0; i < segCount; i++) {
      const px = this.x + dirX * spacing * i * 3;
      const py = this.y + dirY * spacing * i * 3;
      const size = tailSize * 0.5;

      this.trail.fillStyle(colors.trail, tailAlpha);
      this.trail.fillCircle(px, py, size);
    }

    const headAlpha = alpha * 0.45;
    this.trail.fillStyle(colors.head, headAlpha);
    this.trail.fillCircle(this.x, this.y, headSize * 0.5);

    const auraAlpha = alpha * 0.15;
    this.trail.fillStyle(colors.head, auraAlpha);
    this.trail.fillCircle(this.x, this.y, auraSize * 0.25);
  }

  private drawBeamEffect(dist: number, alpha: number, colors: { trail: number; head: number; rgb: [number, number, number] }) {
    if (!this.trail) return;

    const isFireBullets = this.projectileType === ProjectileType.FLAME;
    const effectScale = BEAM_SCALES[this.projectileType] ?? 0.8;

    const dx = this.x - this.startX;
    const dy = this.y - this.startY;
    const dirX = dx / dist;
    const dirY = dy / dist;

    const maxLen = 256;
    const start = dist > maxLen ? dist - maxLen : 0;
    const span = Math.min(dist, maxLen);
    const step = Math.min(effectScale * 3.1, 9.0);
    const lineWidth = effectScale * 3;

    const streakColor = isFireBullets ? 0xffaa5a : 0x80ccff;

    for (let s = start; s < dist; s += step) {
      const t = span > 0 ? (s - start) / span : 1.0;
      const segAlpha = t * alpha * 0.6;

      if (segAlpha > 0.01) {
        const px = this.startX + dirX * s;
        const py = this.startY + dirY * s;

        this.trail.fillStyle(streakColor, segAlpha);
        this.trail.fillCircle(px, py, lineWidth);
      }
    }

    this.trail.fillStyle(colors.head, alpha * 0.8);
    this.trail.fillCircle(this.x, this.y, lineWidth * 2);
  }

  private drawRocketTrail(alpha: number, colors: { trail: number; head: number; rgb: [number, number, number] }) {
    if (!this.trail) return;

    const angle = this.rotation - Math.PI / 2;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    const isNuke = this.projectileType === ProjectileType.NUKE;
    const bloomSize = isNuke ? 180 : 140;
    const innerSize = isNuke ? 80 : 60;
    const bloomOffset = isNuke ? 8 : 5;
    const innerOffset = isNuke ? 12 : 9;

    const bloomX = this.x - dirX * bloomOffset;
    const bloomY = this.y - dirY * bloomOffset;
    this.trail.fillStyle(0xffffff, alpha * 0.35);
    this.trail.fillCircle(bloomX, bloomY, bloomSize * 0.5);

    const innerX = this.x - dirX * innerOffset;
    const innerY = this.y - dirY * innerOffset;
    const innerColor = isNuke ? 0xffaa44 : 0xffffff;
    this.trail.fillStyle(innerColor, alpha * 0.5);
    this.trail.fillCircle(innerX, innerY, innerSize * 0.5);

    const coreColor = isNuke ? 0xffff88 : 0xffcc44;
    this.trail.fillStyle(coreColor, alpha * 0.7);
    this.trail.fillCircle(this.x, this.y, 8);
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
