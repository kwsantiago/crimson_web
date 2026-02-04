import Phaser from 'phaser';
import { WEAPONS, WeaponData, getWeaponByIndex, ProjectileType } from '../data/weapons';
import { Projectile } from '../entities/Projectile';
import { PerkManager } from './PerkManager';

export class WeaponManager {
  private scene: Phaser.Scene;
  private projectiles: Phaser.Physics.Arcade.Group;
  private perkManager?: PerkManager;
  private _currentWeaponIndex: number = 0;
  private ammo: number;
  private reloadTimer: number = 0;
  private shotCooldown: number = 0;
  private isReloading: boolean = false;

  private reloadKey: Phaser.Input.Keyboard.Key;
  private numberKeys: Phaser.Input.Keyboard.Key[];

  constructor(scene: Phaser.Scene, projectiles: Phaser.Physics.Arcade.Group, perkManager?: PerkManager) {
    this.scene = scene;
    this.projectiles = projectiles;
    this.perkManager = perkManager;
    this.ammo = this.clipSize;

    const keyboard = scene.input.keyboard!;
    this.reloadKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.numberKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE)
    ];
  }

  get currentWeapon(): WeaponData {
    return getWeaponByIndex(this._currentWeaponIndex);
  }

  get currentWeaponIndex(): number {
    return this._currentWeaponIndex;
  }

  get currentAmmo(): number {
    return this.ammo;
  }

  get clipSize(): number {
    const base = this.currentWeapon.clipSize;
    const multiplier = this.perkManager?.getClipSizeMultiplier() ?? 1.0;
    return Math.floor(base * multiplier);
  }

  get isCurrentlyReloading(): boolean {
    return this.isReloading;
  }

  get reloadProgress(): number {
    if (!this.isReloading) return 1;
    const reloadTime = this.getReloadTime();
    return 1 - (this.reloadTimer / reloadTime);
  }

  private getReloadTime(): number {
    const base = this.currentWeapon.reloadTime;
    const multiplier = this.perkManager?.getReloadMultiplier() ?? 1.0;
    return base * multiplier;
  }

  private getFireRate(): number {
    const base = this.currentWeapon.fireRate;
    const multiplier = this.perkManager?.getFireRateMultiplier() ?? 1.0;
    return base * multiplier;
  }

  private getSpread(): number {
    const base = this.currentWeapon.spread;
    const multiplier = this.perkManager?.getSpreadMultiplier() ?? 1.0;
    return base * multiplier;
  }

  private getDamage(): number {
    const base = this.currentWeapon.damage;
    if (this.currentWeapon.projectileType === ProjectileType.BULLET) {
      const multiplier = this.perkManager?.getBulletDamageMultiplier() ?? 1.0;
      return Math.floor(base * multiplier);
    }
    return base;
  }

  update(delta: number) {
    const dt = delta / 1000;

    this.shotCooldown = Math.max(0, this.shotCooldown - dt);

    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.finishReload();
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.reloadKey) && !this.isReloading) {
      if (this.ammo < this.clipSize) {
        this.startReload();
      }
    }

    for (let i = 0; i < this.numberKeys.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.numberKeys[i])) {
        this.switchWeapon(i);
      }
    }
  }

  canFire(): boolean {
    return this.shotCooldown <= 0 && !this.isReloading && this.ammo > 0;
  }

  fire(x: number, y: number, angle: number, emitMuzzleFlash: () => void): boolean {
    if (!this.canFire()) {
      if (this.ammo <= 0 && !this.isReloading) {
        this.startReload();
      }
      return false;
    }

    const weapon = this.currentWeapon;
    const spread = this.getSpread();
    const damage = this.getDamage();
    const hasPoisonBullets = this.perkManager?.hasPoisonBullets() ?? false;

    for (let i = 0; i < weapon.pelletCount; i++) {
      let spreadAngle = angle;
      spreadAngle += (Math.random() - 0.5) * spread;

      const bullet = this.projectiles.get(x, y, 'bullet') as Projectile;
      if (bullet) {
        bullet.fire(x, y, spreadAngle, weapon.projectileSpeed, damage, weapon.projectileType);
        if (hasPoisonBullets) {
          bullet.isPoisoned = true;
        }
      }
    }

    this.ammo--;
    this.shotCooldown = this.getFireRate();
    emitMuzzleFlash();

    if (this.ammo <= 0) {
      this.startReload();
    }

    return true;
  }

  private startReload() {
    if (this.isReloading) return;
    this.isReloading = true;
    this.reloadTimer = this.getReloadTime();
  }

  private finishReload() {
    this.ammo = this.clipSize;
    this.isReloading = false;
    this.reloadTimer = 0;
  }

  switchWeapon(index: number) {
    if (index < 0 || index >= WEAPONS.length) return;
    if (index === this._currentWeaponIndex) return;

    this._currentWeaponIndex = index;
    this.ammo = this.clipSize;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.shotCooldown = 0;
  }
}
