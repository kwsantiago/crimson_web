import { PerkId, PERKS, AVAILABLE_PERKS, getPerkData, PERK_PREREQUISITES } from '../data/perks';
import { WEAPONS, ProjectileType } from '../data/weapons';

export interface PerkCounts {
  [key: number]: number;
}

export interface PerkCallbacks {
  onXpGain?: (amount: number) => void;
  onWeaponChange?: (weaponIndex: number) => void;
  onHeal?: (amount: number) => void;
  onFreezeEnemies?: (duration: number) => void;
  onKillHalfEnemies?: () => void;
  onLoseHalfHealth?: () => void;
  onInstantDeath?: () => void;
  onAddPendingPerks?: (count: number) => void;
  onSetHealth?: (health: number) => void;
  onReduceMaxHealth?: (multiplier: number) => void;
  onGetXp?: () => number;
}

export class PerkManager {
  private perkCounts: PerkCounts = {};
  private callbacks: PerkCallbacks = {};
  private highlander: boolean = false;
  private deathClock: boolean = false;
  private manBombUsed: boolean = false;
  private bloodyMessToggle: number = 0;
  livingFortressTimer: number = 0;

  constructor() {
    for (const perkId of Object.values(PerkId)) {
      if (typeof perkId === 'number') {
        this.perkCounts[perkId] = 0;
      }
    }
  }

  setCallbacks(callbacks: PerkCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  getPerkCount(perkId: PerkId): number {
    return this.perkCounts[perkId] || 0;
  }

  hasPerk(perkId: PerkId): boolean {
    return this.getPerkCount(perkId) > 0;
  }

  canTakePerk(perkId: PerkId): boolean {
    if (this.highlander && this.getTotalPerkCount() > 0 && perkId !== PerkId.HIGHLANDER) {
      return false;
    }

    const prereq = PERK_PREREQUISITES[perkId];
    if (prereq !== undefined && !this.hasPerk(prereq)) {
      return false;
    }

    const data = getPerkData(perkId);
    return this.getPerkCount(perkId) < data.maxStacks;
  }

  getTotalPerkCount(): number {
    let total = 0;
    for (const perkId of Object.values(PerkId)) {
      if (typeof perkId === 'number' && perkId !== PerkId.ANTIPERK) {
        total += this.perkCounts[perkId] || 0;
      }
    }
    return total;
  }

  applyPerk(perkId: PerkId): boolean {
    if (!this.canTakePerk(perkId)) {
      return false;
    }

    this.perkCounts[perkId]++;

    switch (perkId) {
      case PerkId.INSTANT_WINNER:
        this.callbacks.onXpGain?.(2500);
        break;

      case PerkId.BANDAGE:
        this.callbacks.onHeal?.(25);
        break;

      case PerkId.BREATHING_ROOM:
        this.callbacks.onFreezeEnemies?.(10);
        break;

      case PerkId.RANDOM_WEAPON:
        const currentWeaponIndex = 0;
        let newIndex: number;
        do {
          newIndex = Math.floor(Math.random() * WEAPONS.length);
        } while (newIndex === currentWeaponIndex && WEAPONS.length > 1);
        this.callbacks.onWeaponChange?.(newIndex);
        break;

      case PerkId.GRIM_DEAL:
        const currentXp = this.callbacks.onGetXp?.() ?? 0;
        this.callbacks.onXpGain?.(Math.floor(currentXp * 0.18));
        this.callbacks.onInstantDeath?.();
        break;

      case PerkId.FATAL_LOTTERY:
        if (Math.random() < 0.5) {
          this.callbacks.onXpGain?.(10000);
        } else {
          this.callbacks.onInstantDeath?.();
        }
        break;

      case PerkId.LIFELINE_50_50:
        if (Math.random() < 0.5) {
          this.callbacks.onKillHalfEnemies?.();
        } else {
          this.callbacks.onLoseHalfHealth?.();
        }
        break;

      case PerkId.INFERNAL_CONTRACT:
        this.callbacks.onAddPendingPerks?.(3);
        this.callbacks.onSetHealth?.(1);
        break;

      case PerkId.DEATH_CLOCK:
        this.deathClock = true;
        break;

      case PerkId.HIGHLANDER:
        this.highlander = true;
        break;

      case PerkId.MAN_BOMB:
        this.manBombUsed = false;
        break;
    }

    return true;
  }

  getNumberOfChoices(): number {
    if (this.hasPerk(PerkId.PERK_MASTER)) return 7;
    if (this.hasPerk(PerkId.PERK_EXPERT)) return 6;
    return 5;
  }

  generatePerkChoices(): PerkId[] {
    const numChoices = this.getNumberOfChoices();
    const available = AVAILABLE_PERKS.filter(id => this.canTakePerk(id));

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, numChoices);
  }

  getEffectiveStacks(perkId: PerkId): number {
    return this.getPerkCount(perkId);
  }

  hasSharpshooter(): boolean {
    return this.hasPerk(PerkId.SHARPSHOOTER);
  }

  getSharpshooterSpreadHeat(): number {
    return 0.02;
  }

  getSharpshooterFireRateMultiplier(): number {
    return 1.05;
  }

  getReloadMultiplier(): number {
    const count = this.getEffectiveStacks(PerkId.FASTLOADER);
    return Math.pow(0.7, count);
  }

  hasLongDistanceRunner(): boolean {
    return this.hasPerk(PerkId.LONG_DISTANCE_RUNNER);
  }

  getSpeedCap(): number {
    if (this.hasPerk(PerkId.LONG_DISTANCE_RUNNER)) {
      return 2.8;
    }
    return 2.0;
  }

  getFireRateMultiplier(): number {
    const count = this.getEffectiveStacks(PerkId.FASTSHOT);
    return Math.pow(0.88, count);
  }

  getDamageReduction(): number {
    if (this.hasPerk(PerkId.THICK_SKINNED)) {
      return 2 / 3;
    }
    return 1.0;
  }

  getBulletDamageMultiplier(): number {
    let multiplier = 1.0;

    if (this.hasPerk(PerkId.URANIUM_FILLED_BULLETS)) {
      multiplier *= 2.0;
    }

    if (this.hasPerk(PerkId.DOCTOR)) {
      multiplier *= 1.2;
    }

    if (this.hasPerk(PerkId.BARREL_GREASER)) {
      multiplier *= 1.4;
    }

    multiplier *= this.getLivingFortressDamageMultiplier();

    return multiplier;
  }

  getClipSizeMultiplier(): number {
    const count = this.getPerkCount(PerkId.AMMO_MANIAC);
    return count > 0 ? 1.25 : 1.0;
  }

  getPassiveXpPerTick(): number {
    const count = this.getEffectiveStacks(PerkId.LEAN_MEAN_EXP);
    return count * 10;
  }

  hasRegeneration(): boolean {
    return this.hasPerk(PerkId.REGENERATION) || this.hasPerk(PerkId.GREATER_REGENERATION);
  }

  getRegenRate(): number {
    if (this.deathClock) return 0;
    if (this.hasPerk(PerkId.GREATER_REGENERATION)) {
      return 3;
    }
    if (this.hasPerk(PerkId.REGENERATION)) {
      return 1;
    }
    return 0;
  }

  hasBonusMagnet(): boolean {
    return this.hasPerk(PerkId.BONUS_MAGNET);
  }

  hasBloodyMess(): boolean {
    return this.hasPerk(PerkId.BLOODY_MESS_QUICK_LEARNER) && this.bloodyMessToggle === 0;
  }

  hasQuickLearner(): boolean {
    return this.hasPerk(PerkId.BLOODY_MESS_QUICK_LEARNER) && this.bloodyMessToggle !== 0;
  }

  toggleBloodyMessQuickLearner(): void {
    this.bloodyMessToggle = this.bloodyMessToggle === 0 ? 1 : 0;
  }

  getXpMultiplier(): number {
    if (this.hasQuickLearner() || this.hasBloodyMess()) {
      return 1.3;
    }
    return 1.0;
  }

  hasPoisonBullets(): boolean {
    return this.hasPerk(PerkId.POISON_BULLETS);
  }

  hasAmmunitionWithin(): boolean {
    return this.hasPerk(PerkId.AMMUNITION_WITHIN);
  }

  canHeal(): boolean {
    return !this.deathClock;
  }

  hasManBomb(): boolean {
    return this.hasPerk(PerkId.MAN_BOMB) && !this.manBombUsed;
  }

  useManBomb(): boolean {
    if (this.hasManBomb()) {
      this.manBombUsed = true;
      return true;
    }
    return false;
  }

  hasPyrokinetic(): boolean {
    return this.hasPerk(PerkId.PYROKINETIC);
  }

  getPyrokineticRadius(): number {
    return 12.0;
  }

  hasRadioactive(): boolean {
    return this.hasPerk(PerkId.RADIOACTIVE);
  }

  getRadioactiveRadius(): number {
    return 100.0;
  }

  getRadioactiveDamage(distance: number): number {
    return (100 - distance) * 0.3;
  }

  hasPlaguebearer(): boolean {
    return this.hasPerk(PerkId.PLAGUEBEARER);
  }

  getPlaguebearerDamagePerTick(): number {
    return 15;
  }

  getPlaguebearerTickInterval(): number {
    return 0.5;
  }

  getPlaguebearerInfectionRadius(): number {
    return 30;
  }

  getPlaguebearerSpreadRadius(): number {
    return 45;
  }

  getPlaguebearerMaxInfectionHealth(): number {
    return 150;
  }

  hasEvilEyes(): boolean {
    return this.hasPerk(PerkId.EVIL_EYES);
  }

  getEvilEyesRadius(): number {
    return 12.0;
  }

  hasHotTempered(): boolean {
    return this.hasPerk(PerkId.HOT_TEMPERED);
  }

  getHotTemperedMultiplier(healthPercent: number): number {
    if (!this.hasHotTempered()) return 1.0;
    if (healthPercent > 0.5) return 1.0;
    const boost = 1 - healthPercent * 2;
    return 1.0 + boost;
  }

  hasFireCough(): boolean {
    return this.hasPerk(PerkId.FIRE_COUGH);
  }

  hasAnxiousLoader(): boolean {
    return this.hasPerk(PerkId.ANXIOUS_LOADER);
  }

  hasStationaryReloader(): boolean {
    return this.hasPerk(PerkId.STATIONARY_RELOADER);
  }

  hasRegressionBullets(): boolean {
    return this.hasPerk(PerkId.REGRESSION_BULLETS);
  }

  hasMyFavouriteWeapon(): boolean {
    return this.hasPerk(PerkId.MY_FAVOURITE_WEAPON);
  }

  hasLivingFortress(): boolean {
    return this.hasPerk(PerkId.LIVING_FORTRESS);
  }

  getLivingFortressDamageMultiplier(): number {
    if (!this.hasLivingFortress()) return 1.0;
    return 1.0 + this.livingFortressTimer * 0.05;
  }

  updateLivingFortress(dt: number, isMoving: boolean): void {
    if (!this.hasLivingFortress()) {
      this.livingFortressTimer = 0;
      return;
    }
    if (isMoving) {
      this.livingFortressTimer = 0;
    } else {
      this.livingFortressTimer = Math.min(30.0, this.livingFortressTimer + dt);
    }
  }

  hasDoctor(): boolean {
    return this.hasPerk(PerkId.DOCTOR);
  }

  hasBarrelGreaser(): boolean {
    return this.hasPerk(PerkId.BARREL_GREASER);
  }

  hasVeinsOfPoison(): boolean {
    return this.hasPerk(PerkId.VEINS_OF_POISON);
  }

  hasToxicAvenger(): boolean {
    return this.hasPerk(PerkId.TOXIC_AVENGER);
  }

  hasDodger(): boolean {
    return this.hasPerk(PerkId.DODGER);
  }

  hasNinja(): boolean {
    return this.hasPerk(PerkId.NINJA);
  }

  getDodgeChance(): number {
    if (this.hasNinja()) return 1 / 3;
    if (this.hasDodger()) return 1 / 5;
    return 0;
  }

  hasMrMelee(): boolean {
    return this.hasPerk(PerkId.MR_MELEE);
  }

  getMrMeleeDamage(): number {
    if (!this.hasMrMelee()) return 0;
    return 25;
  }

  hasUnstoppable(): boolean {
    return this.hasPerk(PerkId.UNSTOPPABLE);
  }

  hasToughReloader(): boolean {
    return this.hasPerk(PerkId.TOUGH_RELOADER);
  }

  hasFinalRevenge(): boolean {
    return this.hasPerk(PerkId.FINAL_REVENGE);
  }

  hasTelekinetic(): boolean {
    return this.hasPerk(PerkId.TELEKINETIC);
  }

  hasReflexBoosted(): boolean {
    return this.hasPerk(PerkId.REFLEX_BOOSTED);
  }

  getBonusDurationMultiplier(): number {
    const count = this.getPerkCount(PerkId.BONUS_ECONOMIST);
    if (count > 0) {
      return 1.0 + 0.5 * count;
    }
    return 1.0;
  }

  getFireDamageMultiplier(): number {
    if (this.hasPerk(PerkId.PYROMANIAC)) {
      return 1.5;
    }
    return 1.0;
  }

  getIonDamageMultiplier(): number {
    if (this.hasPerk(PerkId.ION_GUN_MASTER)) {
      return 1.2;
    }
    return 1.0;
  }

  getIonAoeScale(): number {
    if (this.hasPerk(PerkId.ION_GUN_MASTER)) {
      return 1.2;
    }
    return 1.0;
  }

  getDamageMultiplier(projectileType: ProjectileType): number {
    let mult = 1.0;

    if (projectileType === ProjectileType.BULLET) {
      mult *= this.getBulletDamageMultiplier();
    } else if (projectileType === ProjectileType.FLAME) {
      mult *= this.getFireDamageMultiplier();
    } else if (projectileType === ProjectileType.ION) {
      mult *= this.getIonDamageMultiplier();
    }

    return mult;
  }

  reset() {
    for (const perkId of Object.values(PerkId)) {
      if (typeof perkId === 'number') {
        this.perkCounts[perkId] = 0;
      }
    }
    this.highlander = false;
    this.deathClock = false;
    this.manBombUsed = false;
    this.bloodyMessToggle = 0;
    this.livingFortressTimer = 0;
  }
}
