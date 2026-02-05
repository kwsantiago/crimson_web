import Phaser from 'phaser';
import { WEAPONS, WeaponData, getWeaponByIndex, ProjectileType } from '../data/weapons';
import { Projectile } from '../entities/Projectile';
import { PerkManager } from './PerkManager';

export interface BonusTimers {
  weaponPowerUpTimer: number;
  fireBulletsTimer: number;
  healthPercent: number;
}

export class WeaponManager {
  private scene: Phaser.Scene;
  private projectiles: Phaser.Physics.Arcade.Group;
  private perkManager?: PerkManager;
  private bonusTimers?: () => BonusTimers;
  private _currentWeaponIndex: number = 1;
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
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SIX),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SEVEN),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.EIGHT),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NINE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ZERO)
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
    let multiplier = this.perkManager?.getReloadMultiplier() ?? 1.0;
    if (this.hasWeaponPowerUp()) {
      multiplier *= 0.5;
    }
    return base * multiplier;
  }

  private getFireRate(): number {
    const base = this.currentWeapon.fireRate;
    let multiplier = this.perkManager?.getFireRateMultiplier() ?? 1.0;
    if (this.hasWeaponPowerUp()) {
      multiplier *= 0.5;
    }
    return base * multiplier;
  }

  private getSpread(): number {
    const base = this.currentWeapon.spread;
    const multiplier = this.perkManager?.getSpreadMultiplier() ?? 1.0;
    return base * multiplier;
  }

  private getDamage(): number {
    const base = this.currentWeapon.damage;
    let multiplier = this.perkManager?.getDamageMultiplier(this.currentWeapon.projectileType) ?? 1.0;
    multiplier *= this.perkManager?.getLivingFortressDamageMultiplier() ?? 1.0;
    const healthPercent = this.bonusTimers ? this.bonusTimers().healthPercent : 1.0;
    multiplier *= this.perkManager?.getHotTemperedMultiplier(healthPercent) ?? 1.0;
    return Math.floor(base * multiplier);
  }

  update(delta: number, isMoving: boolean = false, isFiring: boolean = false) {
    const dt = delta / 1000;

    this.shotCooldown = Math.max(0, this.shotCooldown - dt);

    if (this.isReloading) {
      let reloadMultiplier = 1.0;
      if (!isMoving && this.perkManager?.hasStationaryReloader()) {
        reloadMultiplier = 3.0;
      }
      this.reloadTimer -= dt * reloadMultiplier;
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
        const weaponIndex = i === 9 ? 0 : i + 1;
        if (weaponIndex < WEAPONS.length) {
          this.switchWeapon(weaponIndex);
        }
      }
    }
  }

  triggerAutoReload() {
    if (!this.isReloading && this.ammo < this.clipSize) {
      this.startReload();
    }
  }

  canFire(): boolean {
    if (this.perkManager?.hasAmmunitionWithin()) {
      return this.shotCooldown <= 0 && !this.isReloading;
    }
    return this.shotCooldown <= 0 && !this.isReloading && this.ammo > 0;
  }

  fire(x: number, y: number, angle: number, emitMuzzleFlash: () => void): boolean {
    if (!this.canFire()) {
      if (this.ammo <= 0 && !this.isReloading && !this.perkManager?.hasAmmunitionWithin()) {
        this.startReload();
      }
      return false;
    }

    const weapon = this.currentWeapon;
    const spread = this.getSpread();
    const damage = this.getDamage();
    const hasPoisonBullets = this.perkManager?.hasPoisonBullets() ?? false;
    const useFireBullets = this.hasFireBullets();
    const projectileType = useFireBullets ? ProjectileType.FLAME : weapon.projectileType;

    for (let i = 0; i < weapon.pelletCount; i++) {
      let spreadAngle = angle;
      spreadAngle += (Math.random() - 0.5) * spread;

      const bullet = this.projectiles.get(x, y, 'bullet') as Projectile;
      if (bullet) {
        bullet.fire(x, y, spreadAngle, weapon.projectileSpeed, damage, projectileType);
        if (hasPoisonBullets) {
          bullet.isPoisoned = true;
        }
      }
    }

    if (!this.perkManager?.hasAmmunitionWithin()) {
      this.ammo--;
    }
    this.shotCooldown = this.getFireRate();
    emitMuzzleFlash();

    if (this.ammo <= 0 && !this.perkManager?.hasAmmunitionWithin()) {
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

    if (this.perkManager?.hasMyFavouriteWeapon()) return;

    this._currentWeaponIndex = index;
    this.ammo = this.clipSize;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.shotCooldown = 0;
  }

  refundAmmo(count: number = 1) {
    this.ammo = Math.min(this.clipSize, this.ammo + count);
  }

  setBonusTimers(getter: () => BonusTimers) {
    this.bonusTimers = getter;
  }

  private hasWeaponPowerUp(): boolean {
    return this.bonusTimers ? this.bonusTimers().weaponPowerUpTimer > 0 : false;
  }

  private hasFireBullets(): boolean {
    return this.bonusTimers ? this.bonusTimers().fireBulletsTimer > 0 : false;
  }
}
