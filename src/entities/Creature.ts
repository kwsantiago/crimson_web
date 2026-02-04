import Phaser from 'phaser';
import { Player } from './Player';
import { ZOMBIE_SPEED, ZOMBIE_HEALTH, ZOMBIE_DAMAGE, ZOMBIE_XP, ZOMBIE_RADIUS } from '../config';

export class Creature extends Phaser.Physics.Arcade.Sprite {
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  xpValue: number;
  private attackCooldown: number = 0;
  private attackRate: number = 1.0;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string = 'zombie') {
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCircle(ZOMBIE_RADIUS, 14 - ZOMBIE_RADIUS, 14 - ZOMBIE_RADIUS);

    this.health = ZOMBIE_HEALTH;
    this.maxHealth = ZOMBIE_HEALTH;
    this.speed = ZOMBIE_SPEED;
    this.damage = ZOMBIE_DAMAGE;
    this.xpValue = ZOMBIE_XP;
  }

  update(delta: number, player: Player) {
    if (this.health <= 0 || !this.active) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta / 1000);

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const heading = Math.atan2(dy, dx);
      this.setRotation(heading);
      this.setVelocity(
        (dx / dist) * this.speed,
        (dy / dist) * this.speed
      );
    }
  }

  canAttack(): boolean {
    return this.attackCooldown <= 0;
  }

  attack(player: Player) {
    if (this.canAttack()) {
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
