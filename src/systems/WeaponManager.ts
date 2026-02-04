import Phaser from 'phaser';
import { WEAPONS, WeaponData, getWeaponByIndex, ProjectileType } from '../data/weapons';
import { Projectile } from '../entities/Projectile';

export class WeaponManager {
  private scene: Phaser.Scene;
  private projectiles: Phaser.Physics.Arcade.Group;
  private currentWeaponIndex: number = 0;
  private ammo: number;
  private reloadTimer: number = 0;
  private shotCooldown: number = 0;
  private isReloading: boolean = false;

  private reloadKey: Phaser.Input.Keyboard.Key;
  private numberKeys: Phaser.Input.Keyboard.Key[];

  constructor(scene: Phaser.Scene, projectiles: Phaser.Physics.Arcade.Group) {
    this.scene = scene;
    this.projectiles = projectiles;
    this.ammo = this.currentWeapon.clipSize;

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
    return getWeaponByIndex(this.currentWeaponIndex);
  }

  get currentAmmo(): number {
    return this.ammo;
  }

  get clipSize(): number {
    return this.currentWeapon.clipSize;
  }

  get isCurrentlyReloading(): boolean {
    return this.isReloading;
  }

  get reloadProgress(): number {
    if (!this.isReloading) return 1;
    return 1 - (this.reloadTimer / this.currentWeapon.reloadTime);
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
      if (this.ammo < this.currentWeapon.clipSize) {
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

    for (let i = 0; i < weapon.pelletCount; i++) {
      let spreadAngle = angle;
      spreadAngle += (Math.random() - 0.5) * weapon.spread;

      const bullet = this.projectiles.get(x, y, 'bullet') as Projectile;
      if (bullet) {
        bullet.fire(x, y, spreadAngle, weapon.projectileSpeed, weapon.damage, weapon.projectileType);
      }
    }

    this.ammo--;
    this.shotCooldown = weapon.fireRate;
    emitMuzzleFlash();

    if (this.ammo <= 0) {
      this.startReload();
    }

    return true;
  }

  private startReload() {
    if (this.isReloading) return;
    this.isReloading = true;
    this.reloadTimer = this.currentWeapon.reloadTime;
  }

  private finishReload() {
    this.ammo = this.currentWeapon.clipSize;
    this.isReloading = false;
    this.reloadTimer = 0;
  }

  switchWeapon(index: number) {
    if (index < 0 || index >= WEAPONS.length) return;
    if (index === this.currentWeaponIndex) return;

    this.currentWeaponIndex = index;
    this.ammo = this.currentWeapon.clipSize;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.shotCooldown = 0;
  }
}
