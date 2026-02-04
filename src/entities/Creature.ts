import Phaser from 'phaser';
import { Player } from './Player';
import { CreatureType, CreatureData, getCreatureData, CREATURES } from '../data/creatures';

export class Creature extends Phaser.Physics.Arcade.Sprite {
  creatureType: CreatureType;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  xpValue: number;
  isRanged: boolean;
  spawnsOnDeath?: CreatureType;
  spawnCount: number;
  freezeTimer: number = 0;
  poisonTimer: number = 0;
  private attackCooldown: number = 0;
  private attackRate: number = 1.0;
  private projectileCooldown: number = 0;
  private projectileRate: number = 2.0;
  private projectiles?: Phaser.Physics.Arcade.Group;
  private poisonDamageTimer: number = 0;
  private freezePulseTimer: number = 0;
  private isDying: boolean = false;
  private shadow: Phaser.GameObjects.Sprite;
  private animPhase: number = 0;
  private readonly SHADOW_SCALE = 1.07;
  private readonly SHADOW_ALPHA = 0.4;
  private readonly SHADOW_OFFSET = 3;
  private readonly ANIM_RATE = 8;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: CreatureType = CreatureType.ZOMBIE,
    projectiles?: Phaser.Physics.Arcade.Group
  ) {
    const data = getCreatureData(type);
    const sheetMap: Record<string, string> = {
      'zombie': 'zombie_sheet',
      'fast_zombie': 'zombie_sheet',
      'big_zombie': 'zombie_sheet',
      'spider': 'spider_sp1_sheet',
      'baby_spider': 'spider_sp1_sheet',
      'spider_mother': 'spider_sp2_sheet',
      'alien': 'alien_sheet',
      'alien_elite': 'alien_sheet',
      'alien_boss': 'alien_sheet',
      'lizard': 'lizard_sheet',
      'lizard_spitter': 'lizard_sheet',
      'nest': 'nest',
      'boss': 'zombie_sheet'
    };
    const sheetKey = sheetMap[type] || type;
    super(scene, x, y, sheetKey, 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.creatureType = type;
    this.projectiles = projectiles;

    this.shadow = scene.add.sprite(x + this.SHADOW_OFFSET, y + this.SHADOW_OFFSET, sheetKey, 0);
    this.shadow.setTint(0x000000);
    this.shadow.setAlpha(this.SHADOW_ALPHA);
    this.shadow.setDepth(4);
    this.setDepth(5);

    this.setScale(data.scale);
    this.shadow.setScale(data.scale * this.SHADOW_SCALE);
    const scaledCenter = 32 * data.scale;
    this.setCircle(data.radius, scaledCenter - data.radius, scaledCenter - data.radius);

    this.health = data.health;
    this.maxHealth = data.health;
    this.speed = data.speed;
    this.damage = data.damage;
    this.xpValue = data.xp;
    this.isRanged = data.isRanged;
    this.spawnsOnDeath = data.spawnsOnDeath;
    this.spawnCount = data.spawnCount || 0;

    if (data.projectileCooldown) {
      this.projectileRate = data.projectileCooldown;
    }
  }

  update(delta: number, player: Player) {
    if (this.health <= 0 || !this.active || this.isDying) return;

    const dt = delta / 1000;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    this.shadow.setPosition(this.x + this.SHADOW_OFFSET, this.y + this.SHADOW_OFFSET);
    this.shadow.setRotation(this.rotation);
    this.shadow.setFrame(this.frame.name);

    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      this.setVelocity(0, 0);
      this.freezePulseTimer += dt;
      const pulse = 0.95 + Math.sin(this.freezePulseTimer * 8) * 0.05;
      const baseScale = getCreatureData(this.creatureType).scale;
      this.setScale(pulse * baseScale);
      this.shadow.setScale(pulse * baseScale * this.SHADOW_SCALE);
      this.setTint(0x66ddff);
      return;
    } else {
      if (this.freezePulseTimer > 0) {
        this.freezePulseTimer = 0;
        const baseScale = getCreatureData(this.creatureType).scale;
        this.setScale(baseScale);
        this.shadow.setScale(baseScale * this.SHADOW_SCALE);
      }
      this.clearTint();
    }

    if (this.poisonTimer > 0) {
      this.poisonTimer -= dt;
      this.poisonDamageTimer += dt;

      if (this.poisonDamageTimer >= 0.5) {
        this.poisonDamageTimer = 0;
        this.health -= 3;
        this.setTint(0x00ff00);
        this.scene.time.delayedCall(100, () => {
          if (this.active && this.freezeTimer <= 0) this.clearTint();
        });

        if (this.health <= 0) {
          this.die();
          return;
        }
      }
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const heading = Math.atan2(dy, dx);
      this.setRotation(heading);

      let moveSpeed = 0;

      if (this.isRanged) {
        this.projectileCooldown -= dt;
        if (dist > 150) {
          this.setVelocity(
            (dx / dist) * this.speed,
            (dy / dist) * this.speed
          );
          moveSpeed = this.speed;
        } else if (dist < 100) {
          this.setVelocity(
            -(dx / dist) * this.speed * 0.5,
            -(dy / dist) * this.speed * 0.5
          );
          moveSpeed = this.speed * 0.5;
        } else {
          this.setVelocity(0, 0);
        }

        if (this.projectileCooldown <= 0 && this.projectiles) {
          this.fireProjectile(player);
          this.projectileCooldown = this.projectileRate;
        }
      } else {
        this.setVelocity(
          (dx / dist) * this.speed,
          (dy / dist) * this.speed
        );
        moveSpeed = this.speed;
      }

      if (moveSpeed > 0) {
        const speedScale = moveSpeed / 100;
        this.animPhase += dt * this.ANIM_RATE * speedScale;
        const frameCount = 16;
        const frame = Math.floor(this.animPhase) % frameCount;
        this.setFrame(frame);
      }
    }
  }

  private fireProjectile(player: Player) {
    if (!this.projectiles) return;

    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    const bullet = this.projectiles.get(this.x, this.y, 'alien_projectile');
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setRotation(angle);
      bullet.damage = 8;
      bullet.isEnemyProjectile = true;
      const body = bullet.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.enable = true;
        body.setVelocity(
          Math.cos(angle) * 200,
          Math.sin(angle) * 200
        );
      }
    }
  }

  canAttack(): boolean {
    return this.attackCooldown <= 0;
  }

  attack(player: Player) {
    if (this.canAttack() && this.damage > 0) {
      player.takeDamage(this.damage);
      this.attackCooldown = this.attackRate;
    }
  }

  takeDamage(amount: number, applyPoison: boolean = false): boolean {
    this.health -= amount;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (this.active && this.freezeTimer <= 0) this.clearTint();
    });

    if (applyPoison && this.poisonTimer <= 0) {
      this.poisonTimer = 3.0;
      this.poisonDamageTimer = 0;
    }

    if (this.health <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  freeze(duration: number) {
    this.freezeTimer = duration;
    this.setVelocity(0, 0);
  }

  private die() {
    if (this.isDying) return;
    this.isDying = true;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
    }
    this.setVelocity(0, 0);

    this.setTint(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (!this.active) return;
      this.clearTint();

      this.scene.tweens.add({
        targets: [this, this.shadow],
        alpha: 0,
        scaleX: this.scaleX * 0.5,
        scaleY: this.scaleY * 0.5,
        duration: 250,
        ease: 'Power2',
        onComplete: () => {
          this.setActive(false);
          this.setVisible(false);
          this.shadow.destroy();
        }
      });
    });
  }
}
