import { PerkId, PERKS, AVAILABLE_PERKS, getPerkData } from '../data/perks';
import { WEAPONS } from '../data/weapons';

export interface PerkCounts {
  [key: number]: number;
}

export class PerkManager {
  private perkCounts: PerkCounts = {};
  private onXpGain?: (amount: number) => void;
  private onWeaponChange?: (weaponIndex: number) => void;
  private onHeal?: (amount: number) => void;
  private onFreezeEnemies?: (duration: number) => void;

  constructor() {
    for (const perkId of Object.values(PerkId)) {
      if (typeof perkId === 'number') {
        this.perkCounts[perkId] = 0;
      }
    }
  }

  setCallbacks(callbacks: {
    onXpGain?: (amount: number) => void;
    onWeaponChange?: (weaponIndex: number) => void;
    onHeal?: (amount: number) => void;
    onFreezeEnemies?: (duration: number) => void;
  }) {
    this.onXpGain = callbacks.onXpGain;
    this.onWeaponChange = callbacks.onWeaponChange;
    this.onHeal = callbacks.onHeal;
    this.onFreezeEnemies = callbacks.onFreezeEnemies;
  }

  getPerkCount(perkId: PerkId): number {
    return this.perkCounts[perkId] || 0;
  }

  hasPerk(perkId: PerkId): boolean {
    return this.getPerkCount(perkId) > 0;
  }

  canTakePerk(perkId: PerkId): boolean {
    const data = getPerkData(perkId);
    return this.getPerkCount(perkId) < data.maxStacks;
  }

  applyPerk(perkId: PerkId): boolean {
    if (!this.canTakePerk(perkId)) {
      return false;
    }

    this.perkCounts[perkId]++;

    switch (perkId) {
      case PerkId.INSTANT_WINNER:
        this.onXpGain?.(2500);
        break;

      case PerkId.BANDAGE:
        this.onHeal?.(25);
        break;

      case PerkId.BREATHING_ROOM:
        this.onFreezeEnemies?.(10);
        break;

      case PerkId.RANDOM_WEAPON:
        const currentWeaponIndex = 0;
        let newIndex: number;
        do {
          newIndex = Math.floor(Math.random() * WEAPONS.length);
        } while (newIndex === currentWeaponIndex && WEAPONS.length > 1);
        this.onWeaponChange?.(newIndex);
        break;
    }

    return true;
  }

  getNumberOfChoices(): number {
    if (this.hasPerk(PerkId.PERK_MASTER)) return 6;
    if (this.hasPerk(PerkId.PERK_EXPERT)) return 5;
    return 4;
  }

  generatePerkChoices(): PerkId[] {
    const numChoices = this.getNumberOfChoices();
    const available = AVAILABLE_PERKS.filter(id => this.canTakePerk(id));

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, numChoices);
  }

  getSpreadMultiplier(): number {
    const count = this.getPerkCount(PerkId.SHARPSHOOTER);
    return Math.pow(0.5, count);
  }

  getReloadMultiplier(): number {
    const count = this.getPerkCount(PerkId.FASTLOADER);
    return Math.pow(0.75, count);
  }

  getSpeedMultiplier(): number {
    if (this.hasPerk(PerkId.LONG_DISTANCE_RUNNER)) return 1.5;
    return 1.0;
  }

  getFireRateMultiplier(): number {
    const count = this.getPerkCount(PerkId.FASTSHOT);
    return Math.pow(0.75, count);
  }

  getDamageReduction(): number {
    if (this.hasPerk(PerkId.THICK_SKINNED)) return 0.67;
    return 1.0;
  }

  getBulletDamageMultiplier(): number {
    const count = this.getPerkCount(PerkId.URANIUM_BULLETS);
    return 1.0 + count * 0.25;
  }

  getClipSizeMultiplier(): number {
    const count = this.getPerkCount(PerkId.AMMO_MANIAC);
    return 1.0 + count * 0.5;
  }

  getPassiveXpPerSecond(): number {
    const count = this.getPerkCount(PerkId.LEAN_MEAN_EXP);
    return count * 10;
  }

  hasRegeneration(): boolean {
    return this.hasPerk(PerkId.REGENERATION);
  }

  hasBonusMagnet(): boolean {
    return this.hasPerk(PerkId.BONUS_MAGNET);
  }

  hasBloodyMess(): boolean {
    return this.hasPerk(PerkId.BLOODY_MESS);
  }

  hasPoisonBullets(): boolean {
    return this.hasPerk(PerkId.POISON_BULLETS);
  }

  reset() {
    for (const perkId of Object.values(PerkId)) {
      if (typeof perkId === 'number') {
        this.perkCounts[perkId] = 0;
      }
    }
  }
}
