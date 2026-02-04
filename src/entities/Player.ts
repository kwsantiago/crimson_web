import Phaser from 'phaser';
import { WeaponManager } from '../systems/WeaponManager';
import { PerkManager } from '../systems/PerkManager';
import {
  PLAYER_BASE_SPEED,
  PLAYER_MAX_HEALTH,
  PLAYER_RADIUS,
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
  private muzzleFlashAlpha: number = 0;
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
  private aimAngle: number = 0;
  private moveAngle: number = 0;
  private movePhase: number = 0;
  private isMoving: boolean = false;

  // Two-layer sprite system like original game
  private legSprite: Phaser.GameObjects.Sprite;
  private torsoSprite: Phaser.GameObjects.Sprite;
  private legShadow: Phaser.GameObjects.Sprite;
  private torsoShadow: Phaser.GameObjects.Sprite;

  private readonly PLAYER_SCALE = 50.0 / 64.0;  // Original: 50 world units, 64px cell

  constructor(scene: Phaser.Scene, x: number, y: number, projectiles: Phaser.Physics.Arcade.Group) {
    // Base sprite for physics only (invisible)
    super(scene, x, y, 'trooper_sheet', 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Physics body setup
    this.setScale(this.PLAYER_SCALE);
    const scaledCenter = 32 * this.PLAYER_SCALE;
    this.setCircle(PLAYER_RADIUS, scaledCenter - PLAYER_RADIUS, scaledCenter - PLAYER_RADIUS);
    this.setCollideWorldBounds(true);
    this.setVisible(false);  // Hide base sprite, we draw legs+torso separately

    // Create shadow sprites (drawn first, behind player)
    this.legShadow = scene.add.sprite(x, y, 'trooper_sheet', 0);
    this.legShadow.setScale(this.PLAYER_SCALE * 1.02);  // Shadow 1.02x
    this.legShadow.setTint(0x000000);
    this.legShadow.setAlpha(0.35);  // ~90/255
    this.legShadow.setDepth(4);

    this.torsoShadow = scene.add.sprite(x, y, 'trooper_sheet', 16);
    this.torsoShadow.setScale(this.PLAYER_SCALE * 1.03);  // Shadow 1.03x
    this.torsoShadow.setTint(0x000000);
    this.torsoShadow.setAlpha(0.35);
    this.torsoShadow.setDepth(4);

    // Create leg sprite (frames 0-15)
    this.legSprite = scene.add.sprite(x, y, 'trooper_sheet', 0);
    this.legSprite.setScale(this.PLAYER_SCALE);
    this.legSprite.setTint(0xf0f0ff);  // Original: RGB(240, 240, 255)
    this.legSprite.setDepth(5);

    // Create torso sprite (frames 16-31)
    this.torsoSprite = scene.add.sprite(x, y, 'trooper_sheet', 16);
    this.torsoSprite.setScale(this.PLAYER_SCALE);
    this.torsoSprite.setTint(0xf0f0ff);
    this.torsoSprite.setDepth(6);

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
    this.handleMovement(dt);
    this.handleAiming(pointer);
    this.handleShooting(pointer);
    this.updateSprites();
    this.updateMuzzleFlash(dt);
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
    // Decay muzzle flash
    if (this.muzzleFlashAlpha > 0) {
      this.muzzleFlashAlpha -= dt * 10;
      if (this.muzzleFlashAlpha < 0) this.muzzleFlashAlpha = 0;
    }
  }

  private handleMovement(dt: number) {
    let vx = 0;
    let vy = 0;

    if (this.keys.A.isDown) vx -= 1;
    if (this.keys.D.isDown) vx += 1;
    if (this.keys.W.isDown) vy -= 1;
    if (this.keys.S.isDown) vy += 1;

    this.isMoving = vx !== 0 || vy !== 0;

    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    if (this.isMoving) {
      this.moveAngle = Math.atan2(vy, vx);
      // Animate walk cycle (0-14 frames)
      this.movePhase += dt * 12;  // Animation speed
      if (this.movePhase >= 15) this.movePhase -= 15;
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
    this.aimAngle = Phaser.Math.Angle.Between(this.x, this.y, worldPoint.x, worldPoint.y);
  }

  private updateSprites() {
    // Calculate leg and torso frames
    const legFrame = Math.max(0, Math.min(14, Math.floor(this.movePhase)));
    const torsoFrame = legFrame + 16;

    // Sprites face UP at rotation 0, so add PI/2 to convert from heading (0=right) to sprite rotation
    const SPRITE_OFFSET = Math.PI / 2;
    const legRotation = (this.isMoving ? this.moveAngle : this.aimAngle) + SPRITE_OFFSET;
    const torsoRotation = this.aimAngle + SPRITE_OFFSET;

    // Update leg sprite
    this.legSprite.setFrame(legFrame);
    this.legSprite.setPosition(this.x, this.y);
    this.legSprite.setRotation(legRotation);

    // Calculate recoil offset for torso (perpendicular to aim)
    const recoilDir = this.aimAngle + Math.PI / 2;
    const recoilAmount = this.muzzleFlashAlpha * 3;
    const recoilX = Math.cos(recoilDir) * recoilAmount;
    const recoilY = Math.sin(recoilDir) * recoilAmount;

    // Update torso sprite
    this.torsoSprite.setFrame(torsoFrame);
    this.torsoSprite.setPosition(this.x + recoilX, this.y + recoilY);
    this.torsoSprite.setRotation(torsoRotation);

    // Update shadows with offset
    const baseSize = 50.0 * this.PLAYER_SCALE;
    const legShadowOff = 3.0 + baseSize * 0.01;
    const torsoShadowOff = 1.0 + baseSize * 0.015;

    this.legShadow.setFrame(legFrame);
    this.legShadow.setPosition(this.x + legShadowOff, this.y + legShadowOff);
    this.legShadow.setRotation(legRotation);

    this.torsoShadow.setFrame(torsoFrame);
    this.torsoShadow.setPosition(this.x + recoilX + torsoShadowOff, this.y + recoilY + torsoShadowOff);
    this.torsoShadow.setRotation(torsoRotation);
  }

  private handleShooting(pointer: Phaser.Input.Pointer) {
    if (pointer.isDown) {
      this.weaponManager.fire(this.x, this.y, this.aimAngle, () => this.showMuzzleFlash());
    }
  }

  private showMuzzleFlash() {
    this.muzzleFlashAlpha = 1.0;
    this.muzzleFlash.setVisible(true);
  }

  private updateMuzzleFlash(dt: number) {
    if (this.muzzleFlashAlpha > 0) {
      const offset = 20;
      this.muzzleFlash.setPosition(
        this.x + Math.cos(this.aimAngle) * offset,
        this.y + Math.sin(this.aimAngle) * offset
      );
      this.muzzleFlash.setRotation(this.aimAngle);
      this.muzzleFlash.setAlpha(this.muzzleFlashAlpha * 0.8);
      if (this.muzzleFlashAlpha <= 0.1) {
        this.muzzleFlash.setVisible(false);
      }
    }
  }

  private updateShieldVisual() {
    if (this.shieldTimer > 0) {
      if (!this.shieldSprite) {
        this.shieldSprite = this.scene.add.circle(this.x, this.y, 24, 0x5bb4ff, 0.3);
        this.shieldSprite.setStrokeStyle(2, 0x5bb4ff);
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
      this.legSprite.setVisible(false);
      this.torsoSprite.setVisible(false);
      this.legShadow.setVisible(false);
      this.torsoShadow.setVisible(false);
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
