import Phaser from 'phaser';
import { Bonus } from '../entities/Bonus';
import { BonusType, getBonusData, pickRandomBonusType } from '../data/bonuses';
import { Player } from '../entities/Player';
import { WEAPONS } from '../data/weapons';

export class BonusManager {
  private scene: Phaser.Scene;
  private bonuses: Phaser.Physics.Arcade.Group;
  private player: Player;

  private onNuke?: () => void;
  private onFreeze?: (duration: number) => void;
  private onShockChain?: () => void;
  private onFireblast?: () => void;
  private onEnergizer?: (duration: number) => void;

  constructor(
    scene: Phaser.Scene,
    bonuses: Phaser.Physics.Arcade.Group,
    player: Player
  ) {
    this.scene = scene;
    this.bonuses = bonuses;
    this.player = player;
  }

  setCallbacks(callbacks: {
    onNuke?: () => void;
    onFreeze?: (duration: number) => void;
    onShockChain?: () => void;
    onFireblast?: () => void;
    onEnergizer?: (duration: number) => void;
  }) {
    this.onNuke = callbacks.onNuke;
    this.onFreeze = callbacks.onFreeze;
    this.onShockChain = callbacks.onShockChain;
    this.onFireblast = callbacks.onFireblast;
    this.onEnergizer = callbacks.onEnergizer;
  }

  trySpawnBonus(x: number, y: number) {
    const baseRoll = Math.floor(Math.random() * 9);
    if (baseRoll !== 1) {
      if (!this.player.perkManager.hasBonusMagnet()) return;
      if (Math.floor(Math.random() * 10) !== 2) return;
    }

    const type = pickRandomBonusType();
    this.spawnBonus(x, y, type);
  }

  spawnBonus(x: number, y: number, type: BonusType) {
    const bonus = new Bonus(this.scene, x, y, type);
    this.bonuses.add(bonus);
  }

  spawnBonusAt(x: number, y: number, type: BonusType, weaponId?: number) {
    const bonus = new Bonus(this.scene, x, y, type, weaponId);
    this.bonuses.add(bonus);
  }

  update(delta: number) {
    const hasMagnet = this.player.perkManager.hasBonusMagnet();

    this.bonuses.getChildren().forEach((obj) => {
      const bonus = obj as Bonus;
      if (bonus.active) {
        bonus.update(delta, this.player.x, this.player.y, hasMagnet);
      }
    });
  }

  collectBonus(bonus: Bonus) {
    if (!bonus.active) return;

    const data = getBonusData(bonus.bonusType);

    switch (bonus.bonusType) {
      case BonusType.POINTS:
        const xpValue = (Math.floor(Math.random() * 8) < 3) ? 1000 : 500;
        this.player.addXp(xpValue);
        break;

      case BonusType.MEDIKIT:
        if (data.healAmount) {
          this.player.heal(data.healAmount);
        }
        break;

      case BonusType.WEAPON:
        if (bonus.weaponId !== undefined) {
          this.player.weaponManager.switchWeapon(bonus.weaponId);
        } else {
          const currentIndex = this.player.weaponManager.currentWeaponIndex;
          let newIndex: number;
          do {
            newIndex = Math.floor(Math.random() * WEAPONS.length);
          } while (newIndex === currentIndex && WEAPONS.length > 1);
          this.player.weaponManager.switchWeapon(newIndex);
        }
        break;

      case BonusType.SPEED:
        this.player.activateSpeedBoost(data.duration);
        break;

      case BonusType.SHIELD:
        this.player.activateShield(data.duration);
        break;

      case BonusType.FREEZE:
        this.onFreeze?.(data.duration);
        break;

      case BonusType.REFLEX_BOOST:
        this.player.activateReflexBoost(data.duration);
        break;

      case BonusType.NUKE:
        this.onNuke?.();
        break;

      case BonusType.DOUBLE_EXPERIENCE:
        this.player.activateDoubleXp(data.duration);
        break;

      case BonusType.WEAPON_POWER_UP:
        this.player.activateWeaponPowerUp(data.duration);
        break;

      case BonusType.SHOCK_CHAIN:
        this.onShockChain?.();
        break;

      case BonusType.FIREBLAST:
        this.onFireblast?.();
        break;

      case BonusType.FIRE_BULLETS:
        this.player.activateFireBullets(data.duration);
        break;

      case BonusType.ENERGIZER:
        this.player.activateEnergizer(data.duration);
        this.onEnergizer?.(data.duration);
        break;
    }

    bonus.destroy();
  }
}
