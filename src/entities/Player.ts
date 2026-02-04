import Phaser from 'phaser';
import { WeaponManager } from '../systems/WeaponManager';
import { PerkManager } from '../systems/PerkManager';
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
  perkManager: PerkManager;
  private muzzleFlash: Phaser.GameObjects.Sprite;
  private muzzleFlashTimer: number = 0;
  private keys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  speedBoostTimer: number = 0;
  shieldTimer: number = 0;
  reflexBoostTimer: number = 0;
  private regenTimer: number = 0;
  private passiveXpTimer: number = 0;
  private shieldSprite?: Phaser.GameObjects.Arc;

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

    this.perkManager = new PerkManager();
    this.weaponManager = new WeaponManager(scene, projectiles, this.perkManager);

    this.perkManager.setCallbacks({
      onXpGain: (amount) => this.addXp(amount),
      onWeaponChange: (index) => this.weaponManager.switchWeapon(index),
      onHeal: (amount) => this.heal(amount)
    });

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

    const dt = delta / 1000;

    this.updateTimers(dt);
    this.weaponManager.update(delta);
    this.handleMovement();
    this.handleAiming(pointer);
    this.handleShooting(pointer);
    this.updateMuzzleFlash(delta);
    this.updateShieldVisual();

    const regenRate = this.perkManager.getRegenRate();
    if (regenRate > 0 && this.perkManager.canHeal()) {
      this.regenTimer += dt;
      if (this.regenTimer >= 1.0) {
        this.regenTimer = 0;
        this.heal(regenRate);
      }
    }

    const passiveXp = this.perkManager.getPassiveXpPerSecond();
    if (passiveXp > 0) {
      this.passiveXpTimer += dt;
      if (this.passiveXpTimer >= 1.0) {
        this.passiveXpTimer = 0;
        this.addXp(passiveXp);
      }
    }

    return this.checkLevelUp();
  }

  private updateTimers(dt: number) {
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= dt;
    }
    if (this.shieldTimer > 0) {
      this.shieldTimer -= dt;
    }
    if (this.reflexBoostTimer > 0) {
      this.reflexBoostTimer -= dt;
    }
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

    let speed = PLAYER_BASE_SPEED;
    speed *= this.perkManager.getSpeedMultiplier();

    if (this.speedBoostTimer > 0) {
      speed *= 2.0;
    }

    this.setVelocity(vx * speed, vy * speed);
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

  private updateShieldVisual() {
    if (this.shieldTimer > 0) {
      if (!this.shieldSprite) {
        this.shieldSprite = this.scene.add.circle(this.x, this.y, 24, 0x00ffff, 0.3);
        this.shieldSprite.setStrokeStyle(2, 0x00ffff);
        this.shieldSprite.setDepth(9);
      }
      this.shieldSprite.setPosition(this.x, this.y);
      this.shieldSprite.setVisible(true);
    } else if (this.shieldSprite) {
      this.shieldSprite.setVisible(false);
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
    if (this.shieldTimer > 0) {
      return;
    }

    let damage = amount * this.perkManager.getDamageReduction();
    this.health -= damage;

    if (this.health <= 0) {
      this.health = 0;
      this.setActive(false);
      this.setVisible(false);
    }
  }

  heal(amount: number) {
    if (!this.perkManager.canHeal()) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addXp(amount: number) {
    this.experience += amount;
  }

  activateSpeedBoost(duration: number) {
    const multiplier = this.perkManager.getBonusDurationMultiplier();
    this.speedBoostTimer = duration * multiplier;
  }

  activateShield(duration: number) {
    const multiplier = this.perkManager.getBonusDurationMultiplier();
    this.shieldTimer = duration * multiplier;
  }

  activateReflexBoost(duration: number) {
    const multiplier = this.perkManager.getBonusDurationMultiplier();
    this.reflexBoostTimer = duration * multiplier;
  }

  hasActiveShield(): boolean {
    return this.shieldTimer > 0;
  }

  hasActiveSpeed(): boolean {
    return this.speedBoostTimer > 0;
  }

  hasActiveReflex(): boolean {
    return this.reflexBoostTimer > 0;
  }
}
