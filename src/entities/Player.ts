import Phaser from 'phaser';
import { WeaponManager } from '../systems/WeaponManager';
import {
  PLAYER_BASE_SPEED,
  PLAYER_MAX_HEALTH,
  PLAYER_RADIUS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  getXpForLevel
} from '../config';

export class Player extends Phaser.Physics.Arcade.Sprite {
  health: number;
  maxHealth: number;
  experience: number;
  level: number;
  weaponManager: WeaponManager;
  private muzzleFlash: Phaser.GameObjects.Sprite;
  private muzzleFlashTimer: number = 0;
  private keys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene, x: number, y: number, projectiles: Phaser.Physics.Arcade.Group) {
    super(scene, x, y, 'player');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCircle(PLAYER_RADIUS, 16 - PLAYER_RADIUS, 16 - PLAYER_RADIUS);
    this.setCollideWorldBounds(true);

    this.health = PLAYER_MAX_HEALTH;
    this.maxHealth = PLAYER_MAX_HEALTH;
    this.experience = 0;
    this.level = 1;
    this.weaponManager = new WeaponManager(scene, projectiles);

    this.muzzleFlash = scene.add.sprite(x, y, 'muzzle_flash');
    this.muzzleFlash.setVisible(false);
    this.muzzleFlash.setDepth(10);

    const keyboard = scene.input.keyboard!;
    this.keys = {
      W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
  }

  update(delta: number, pointer: Phaser.Input.Pointer): boolean {
    if (this.health <= 0) {
      return false;
    }

    this.weaponManager.update(delta);
    this.handleMovement();
    this.handleAiming(pointer);
    this.handleShooting(pointer);
    this.updateMuzzleFlash(delta);

    return this.checkLevelUp();
  }

  private handleMovement() {
    let vx = 0;
    let vy = 0;

    if (this.keys.A.isDown) vx -= 1;
    if (this.keys.D.isDown) vx += 1;
    if (this.keys.W.isDown) vy -= 1;
    if (this.keys.S.isDown) vy += 1;

    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    this.setVelocity(vx * PLAYER_BASE_SPEED, vy * PLAYER_BASE_SPEED);
  }

  private handleAiming(pointer: Phaser.Input.Pointer) {
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, worldPoint.x, worldPoint.y);
    this.setRotation(angle);
  }

  private handleShooting(pointer: Phaser.Input.Pointer) {
    if (pointer.isDown) {
      this.weaponManager.fire(this.x, this.y, this.rotation, () => this.showMuzzleFlash());
    }
  }

  private showMuzzleFlash() {
    this.muzzleFlashTimer = 50;
    this.muzzleFlash.setVisible(true);
  }

  private updateMuzzleFlash(delta: number) {
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= delta;
      const offset = 20;
      this.muzzleFlash.setPosition(
        this.x + Math.cos(this.rotation) * offset,
        this.y + Math.sin(this.rotation) * offset
      );
      this.muzzleFlash.setRotation(this.rotation);
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlash.setVisible(false);
      }
    }
  }

  private checkLevelUp(): boolean {
    const xpNeeded = getXpForLevel(this.level);
    if (this.experience >= xpNeeded) {
      this.experience -= xpNeeded;
      this.level++;
      return true;
    }
    return false;
  }

  takeDamage(amount: number) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.setActive(false);
      this.setVisible(false);
    }
  }

  addXp(amount: number) {
    this.experience += amount;
  }
}
