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
  private attackCooldown: number = 0;
  private attackRate: number = 1.0;
  private projectileCooldown: number = 0;
  private projectileRate: number = 2.0;
  private projectiles?: Phaser.Physics.Arcade.Group;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: CreatureType = CreatureType.ZOMBIE,
    projectiles?: Phaser.Physics.Arcade.Group
  ) {
    const data = getCreatureData(type);
    super(scene, x, y, type);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.creatureType = type;
    this.projectiles = projectiles;

    const offsetX = (14 - data.radius);
    const offsetY = (14 - data.radius);
    this.setCircle(data.radius, offsetX > 0 ? offsetX : 0, offsetY > 0 ? offsetY : 0);
    this.setScale(data.scale);

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
    if (this.health <= 0 || !this.active) return;

    const dt = delta / 1000;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const heading = Math.atan2(dy, dx);
      this.setRotation(heading);

      if (this.isRanged) {
        this.projectileCooldown -= dt;
        if (dist > 150) {
          this.setVelocity(
            (dx / dist) * this.speed,
            (dy / dist) * this.speed
          );
        } else if (dist < 100) {
          this.setVelocity(
            -(dx / dist) * this.speed * 0.5,
            -(dy / dist) * this.speed * 0.5
          );
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

  takeDamage(amount: number): boolean {
    this.health -= amount;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (this.active) this.clearTint();
    });

    if (this.health <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  private die() {
    this.setActive(false);
    this.setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
    }
  }
}
