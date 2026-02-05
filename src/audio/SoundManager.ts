import Phaser from 'phaser';
import { CreatureType } from '../data/creatures';
import { ProjectileType } from '../data/weapons';
import { MusicTrack, GAME_MUSIC } from '../data/audio';

export enum SfxCategory {
  WEAPON_FIRE = 'weapon_fire',
  WEAPON_RELOAD = 'weapon_reload',
  IMPACT = 'impact',
  CREATURE_DEATH = 'creature_death',
  CREATURE_ATTACK = 'creature_attack',
  PLAYER_HURT = 'player_hurt',
  EXPLOSION = 'explosion',
  UI = 'ui',
  PICKUP = 'pickup',
  AMBIENT = 'ambient'
}

export enum WeaponSfxId {
  PISTOL_FIRE = 'sfx_pistol_fire',
  PISTOL_RELOAD = 'sfx_pistol_reload',
  SHOTGUN_FIRE = 'sfx_shotgun_fire',
  SHOTGUN_RELOAD = 'sfx_shotgun_reload',
  AUTORIFLE_FIRE = 'sfx_autorifle_fire',
  AUTORIFLE_RELOAD = 'sfx_autorifle_reload',
  GAUSS_FIRE = 'sfx_gauss_fire',
  HRPM_FIRE = 'sfx_hrpm_fire',
  SHOCK_FIRE = 'sfx_shock_fire',
  SHOCK_RELOAD = 'sfx_shock_reload',
  PLASMA_MINIGUN_FIRE = 'sfx_plasmaminigun_fire',
  PLASMA_SHOTGUN_FIRE = 'sfx_plasmashotgun_fire',
  PULSE_FIRE = 'sfx_pulse_fire',
  FLAMER_FIRE_01 = 'sfx_flamer_fire_01',
  FLAMER_FIRE_02 = 'sfx_flamer_fire_02',
  SHOCK_MINIGUN_FIRE = 'sfx_shockminigun_fire',
  ROCKET_FIRE = 'sfx_rocket_fire',
  ROCKET_MINI_FIRE = 'sfx_rocketmini_fire'
}

export enum UiSfxId {
  BONUS = 'sfx_ui_bonus',
  BUTTON_CLICK = 'sfx_ui_buttonclick',
  PANEL_CLICK = 'sfx_ui_panelclick',
  LEVEL_UP = 'sfx_ui_levelup',
  TYPE_CLICK_01 = 'sfx_ui_typeclick_01',
  TYPE_CLICK_02 = 'sfx_ui_typeclick_02',
  TYPE_ENTER = 'sfx_ui_typeenter',
  CLINK = 'sfx_ui_clink_01'
}

export enum ImpactSfxId {
  BULLET_HIT_01 = 'sfx_bullet_hit_01',
  BULLET_HIT_02 = 'sfx_bullet_hit_02',
  BULLET_HIT_03 = 'sfx_bullet_hit_03',
  BULLET_HIT_04 = 'sfx_bullet_hit_04',
  BULLET_HIT_05 = 'sfx_bullet_hit_05',
  BULLET_HIT_06 = 'sfx_bullet_hit_06',
  SHOCK_HIT = 'sfx_shock_hit_01'
}

export enum ExplosionSfxId {
  SMALL = 'sfx_explosion_small',
  MEDIUM = 'sfx_explosion_medium',
  LARGE = 'sfx_explosion_large',
  SHOCKWAVE = 'sfx_shockwave'
}

interface SfxVariantGroup {
  variants: string[];
  lastPlayed: number;
}

interface SoundPoolEntry {
  key: string;
  volume: number;
  loaded: boolean;
}

const CREATURE_DEATH_SFX: Partial<Record<CreatureType, string[]>> = {
  [CreatureType.ZOMBIE]: [
    'sfx_zombie_die_01',
    'sfx_zombie_die_02',
    'sfx_zombie_die_03',
    'sfx_zombie_die_04'
  ],
  [CreatureType.FAST_ZOMBIE]: [
    'sfx_zombie_die_01',
    'sfx_zombie_die_02',
    'sfx_zombie_die_03',
    'sfx_zombie_die_04'
  ],
  [CreatureType.BIG_ZOMBIE]: [
    'sfx_zombie_die_01',
    'sfx_zombie_die_02',
    'sfx_zombie_die_03',
    'sfx_zombie_die_04'
  ],
  [CreatureType.LIZARD]: [
    'sfx_lizard_die_01',
    'sfx_lizard_die_02',
    'sfx_lizard_die_03',
    'sfx_lizard_die_04'
  ],
  [CreatureType.LIZARD_SPITTER]: [
    'sfx_lizard_die_01',
    'sfx_lizard_die_02',
    'sfx_lizard_die_03',
    'sfx_lizard_die_04'
  ],
  [CreatureType.ALIEN]: [
    'sfx_alien_die_01',
    'sfx_alien_die_02',
    'sfx_alien_die_03',
    'sfx_alien_die_04'
  ],
  [CreatureType.ALIEN_ELITE]: [
    'sfx_alien_die_01',
    'sfx_alien_die_02',
    'sfx_alien_die_03',
    'sfx_alien_die_04'
  ],
  [CreatureType.ALIEN_BOSS]: [
    'sfx_alien_die_01',
    'sfx_alien_die_02',
    'sfx_alien_die_03',
    'sfx_alien_die_04'
  ],
  [CreatureType.SPIDER]: [
    'sfx_spider_die_01',
    'sfx_spider_die_02',
    'sfx_spider_die_03',
    'sfx_spider_die_04'
  ],
  [CreatureType.BABY_SPIDER]: [
    'sfx_spider_die_01',
    'sfx_spider_die_02',
    'sfx_spider_die_03',
    'sfx_spider_die_04'
  ],
  [CreatureType.SPIDER_MOTHER]: [
    'sfx_spider_die_01',
    'sfx_spider_die_02',
    'sfx_spider_die_03',
    'sfx_spider_die_04'
  ],
  [CreatureType.BOSS]: [
    'sfx_trooper_die_01',
    'sfx_trooper_die_02',
    'sfx_trooper_die_03',
    'sfx_trooper_die_04'
  ]
};

const CREATURE_ATTACK_SFX: Partial<Record<CreatureType, string[]>> = {
  [CreatureType.ZOMBIE]: ['sfx_zombie_attack_01', 'sfx_zombie_attack_02'],
  [CreatureType.FAST_ZOMBIE]: ['sfx_zombie_attack_01', 'sfx_zombie_attack_02'],
  [CreatureType.BIG_ZOMBIE]: ['sfx_zombie_attack_01', 'sfx_zombie_attack_02'],
  [CreatureType.ALIEN]: ['sfx_alien_attack_01', 'sfx_alien_attack_02'],
  [CreatureType.ALIEN_ELITE]: ['sfx_alien_attack_01', 'sfx_alien_attack_02'],
  [CreatureType.LIZARD]: ['sfx_lizard_attack_01', 'sfx_lizard_attack_02'],
  [CreatureType.LIZARD_SPITTER]: ['sfx_lizard_attack_01', 'sfx_lizard_attack_02'],
  [CreatureType.SPIDER]: ['sfx_spider_attack_01', 'sfx_spider_attack_02'],
  [CreatureType.BABY_SPIDER]: ['sfx_spider_attack_01', 'sfx_spider_attack_02'],
  [CreatureType.SPIDER_MOTHER]: ['sfx_spider_attack_01', 'sfx_spider_attack_02']
};

const PLAYER_HURT_SFX = [
  'sfx_trooper_inpain_01',
  'sfx_trooper_inpain_02',
  'sfx_trooper_inpain_03',
  'sfx_trooper_inpain_04'
];

const BULLET_HIT_SFX = [
  ImpactSfxId.BULLET_HIT_01,
  ImpactSfxId.BULLET_HIT_02,
  ImpactSfxId.BULLET_HIT_03,
  ImpactSfxId.BULLET_HIT_04,
  ImpactSfxId.BULLET_HIT_05,
  ImpactSfxId.BULLET_HIT_06
];

const BLOOD_SPILL_SFX = ['sfx_bloodspill_01', 'sfx_bloodspill_02'];

const WEAPON_FIRE_SFX: Record<number, string> = {
  0: WeaponSfxId.PISTOL_FIRE,
  1: WeaponSfxId.AUTORIFLE_FIRE,
  2: WeaponSfxId.SHOTGUN_FIRE,
  3: WeaponSfxId.SHOTGUN_FIRE,
  4: WeaponSfxId.HRPM_FIRE,
  5: WeaponSfxId.GAUSS_FIRE,
  6: WeaponSfxId.AUTORIFLE_FIRE,
  7: WeaponSfxId.FLAMER_FIRE_01,
  8: WeaponSfxId.SHOCK_FIRE,
  9: WeaponSfxId.SHOCK_FIRE,
  10: WeaponSfxId.PLASMA_MINIGUN_FIRE,
  11: WeaponSfxId.ROCKET_FIRE,
  12: WeaponSfxId.ROCKET_FIRE,
  13: WeaponSfxId.PLASMA_SHOTGUN_FIRE,
  14: WeaponSfxId.FLAMER_FIRE_01,
  15: WeaponSfxId.FLAMER_FIRE_01,
  16: WeaponSfxId.ROCKET_FIRE,
  17: WeaponSfxId.ROCKET_MINI_FIRE,
  18: WeaponSfxId.PULSE_FIRE,
  19: WeaponSfxId.SHOTGUN_FIRE,
  20: WeaponSfxId.SHOCK_FIRE,
  21: WeaponSfxId.SHOCK_MINIGUN_FIRE,
  22: WeaponSfxId.SHOCK_FIRE,
  23: WeaponSfxId.SHOCK_FIRE,
  24: WeaponSfxId.SHOCK_FIRE
};

const WEAPON_RELOAD_SFX: Record<number, string> = {
  0: WeaponSfxId.PISTOL_RELOAD,
  1: WeaponSfxId.AUTORIFLE_RELOAD,
  2: WeaponSfxId.SHOTGUN_RELOAD,
  3: WeaponSfxId.SHOTGUN_RELOAD,
  4: WeaponSfxId.AUTORIFLE_RELOAD,
  5: WeaponSfxId.SHOTGUN_RELOAD,
  6: WeaponSfxId.AUTORIFLE_RELOAD,
  7: WeaponSfxId.AUTORIFLE_RELOAD,
  8: WeaponSfxId.AUTORIFLE_RELOAD,
  9: WeaponSfxId.AUTORIFLE_RELOAD,
  10: WeaponSfxId.AUTORIFLE_RELOAD,
  11: WeaponSfxId.AUTORIFLE_RELOAD,
  12: WeaponSfxId.AUTORIFLE_RELOAD,
  13: WeaponSfxId.SHOTGUN_RELOAD,
  14: WeaponSfxId.AUTORIFLE_RELOAD,
  15: WeaponSfxId.AUTORIFLE_RELOAD,
  16: WeaponSfxId.AUTORIFLE_RELOAD,
  17: WeaponSfxId.AUTORIFLE_RELOAD,
  18: WeaponSfxId.AUTORIFLE_RELOAD,
  19: WeaponSfxId.SHOTGUN_RELOAD,
  20: WeaponSfxId.SHOCK_RELOAD,
  21: WeaponSfxId.SHOCK_RELOAD,
  22: WeaponSfxId.SHOCK_RELOAD,
  23: WeaponSfxId.SHOCK_RELOAD,
  24: WeaponSfxId.SHOCK_RELOAD
};

const MAX_HIT_SFX_PER_FRAME = 4;
const MAX_DEATH_SFX_PER_FRAME = 3;

export class SoundManager {
  private scene: Phaser.Scene;
  private sfxEnabled: boolean = true;
  private musicEnabled: boolean = true;
  private sfxVolume: number = 0.7;
  private musicVolume: number = 0.5;
  private currentMusic: Phaser.Sound.WebAudioSound | null = null;
  private currentMusicKey: string | null = null;
  private soundPool: Map<string, SoundPoolEntry> = new Map();
  private variantGroups: Map<string, SfxVariantGroup> = new Map();
  private rng: () => number = Math.random;
  private hitSfxThisFrame: number = 0;
  private deathSfxThisFrame: number = 0;
  private frameCount: number = 0;
  private gameTuneStarted: boolean = false;
  private fadingOut: boolean = false;
  private fadeTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initVariantGroups();
  }

  private initVariantGroups() {
    this.variantGroups.set('bullet_hit', {
      variants: BULLET_HIT_SFX,
      lastPlayed: -1
    });
    this.variantGroups.set('blood_spill', {
      variants: BLOOD_SPILL_SFX,
      lastPlayed: -1
    });
    this.variantGroups.set('player_hurt', {
      variants: PLAYER_HURT_SFX,
      lastPlayed: -1
    });
  }

  setRng(rng: () => number) {
    this.rng = rng;
  }

  update() {
    this.frameCount++;
    this.hitSfxThisFrame = 0;
    this.deathSfxThisFrame = 0;
  }

  registerSound(key: string, volume: number = 1.0) {
    if (!this.soundPool.has(key)) {
      const loaded = this.scene.cache.audio.exists(key);
      this.soundPool.set(key, { key, volume, loaded });
    }
  }

  private playSfxInternal(key: string, volumeMultiplier: number = 1.0): boolean {
    if (!this.sfxEnabled) return false;

    const entry = this.soundPool.get(key);
    const exists = entry?.loaded ?? this.scene.cache.audio.exists(key);

    if (!exists) {
      return false;
    }

    const vol = this.sfxVolume * volumeMultiplier * (entry?.volume ?? 1.0);
    this.scene.sound.play(key, { volume: vol });
    return true;
  }

  playSfx(key: string, volumeMultiplier: number = 1.0): boolean {
    return this.playSfxInternal(key, volumeMultiplier);
  }

  private playVariant(groupName: string, volumeMultiplier: number = 1.0): boolean {
    const group = this.variantGroups.get(groupName);
    if (!group || group.variants.length === 0) return false;

    let index: number;
    if (group.variants.length === 1) {
      index = 0;
    } else {
      do {
        index = Math.floor(this.rng() * group.variants.length);
      } while (index === group.lastPlayed && group.variants.length > 1);
    }

    group.lastPlayed = index;
    return this.playSfxInternal(group.variants[index], volumeMultiplier);
  }

  playWeaponFire(weaponIndex: number) {
    const sfxKey = WEAPON_FIRE_SFX[weaponIndex];
    if (sfxKey) {
      this.playSfxInternal(sfxKey);
    }
  }

  playWeaponReload(weaponIndex: number) {
    const sfxKey = WEAPON_RELOAD_SFX[weaponIndex];
    if (sfxKey) {
      this.playSfxInternal(sfxKey);
    }
  }

  playBulletHit(projectileType?: ProjectileType) {
    if (this.hitSfxThisFrame >= MAX_HIT_SFX_PER_FRAME) return;
    this.hitSfxThisFrame++;

    if (projectileType === ProjectileType.ION || projectileType === ProjectileType.PLASMA) {
      this.playSfxInternal(ImpactSfxId.SHOCK_HIT, 0.6);
    } else {
      this.playVariant('bullet_hit', 0.5);
    }
  }

  playCreatureDeath(creatureType: CreatureType) {
    if (this.deathSfxThisFrame >= MAX_DEATH_SFX_PER_FRAME) return;
    this.deathSfxThisFrame++;

    const variants = CREATURE_DEATH_SFX[creatureType];
    if (variants && variants.length > 0) {
      const index = Math.floor(this.rng() * variants.length);
      this.playSfxInternal(variants[index], 0.7);
    }
  }

  playCreatureAttack(creatureType: CreatureType) {
    const variants = CREATURE_ATTACK_SFX[creatureType];
    if (variants && variants.length > 0) {
      const index = Math.floor(this.rng() * variants.length);
      this.playSfxInternal(variants[index], 0.5);
    }
  }

  playPlayerHurt() {
    this.playVariant('player_hurt', 0.8);
  }

  playBloodSpill() {
    this.playVariant('blood_spill', 0.4);
  }

  playExplosion(size: 'small' | 'medium' | 'large' = 'medium') {
    let sfxKey: ExplosionSfxId;
    switch (size) {
      case 'small':
        sfxKey = ExplosionSfxId.SMALL;
        break;
      case 'large':
        sfxKey = ExplosionSfxId.LARGE;
        break;
      default:
        sfxKey = ExplosionSfxId.MEDIUM;
    }
    this.playSfxInternal(sfxKey, 0.9);
  }

  playShockwave() {
    this.playSfxInternal(ExplosionSfxId.SHOCKWAVE, 0.8);
  }

  playUiClick() {
    this.playSfxInternal(UiSfxId.BUTTON_CLICK, 0.6);
  }

  playUiPanelClick() {
    this.playSfxInternal(UiSfxId.PANEL_CLICK, 0.5);
  }

  playUiLevelUp() {
    this.playSfxInternal(UiSfxId.LEVEL_UP, 1.0);
  }

  playUiBonus() {
    this.playSfxInternal(UiSfxId.BONUS, 0.8);
  }

  playUiTypeClick() {
    const variant = this.rng() > 0.5 ? UiSfxId.TYPE_CLICK_01 : UiSfxId.TYPE_CLICK_02;
    this.playSfxInternal(variant, 0.4);
  }

  playUiTypeEnter() {
    this.playSfxInternal(UiSfxId.TYPE_ENTER, 0.5);
  }

  playUiClink() {
    this.playSfxInternal(UiSfxId.CLINK, 0.5);
  }

  playPerkSelect() {
    this.playSfxInternal(UiSfxId.BUTTON_CLICK, 0.6);
    this.playSfxInternal(UiSfxId.BONUS, 0.8);
  }

  playPickupWeapon() {
    this.playSfxInternal(UiSfxId.BONUS, 0.7);
  }

  playPickupPowerup() {
    this.playSfxInternal(UiSfxId.BONUS, 0.6);
  }

  playPickupXp() {
    this.playSfxInternal(UiSfxId.CLINK, 0.2);
  }

  playNuke() {
    this.playSfxInternal(ExplosionSfxId.LARGE, 1.0);
    this.scene.time.delayedCall(100, () => {
      this.playSfxInternal(ExplosionSfxId.SHOCKWAVE, 1.0);
    });
  }

  playFreeze() {
    this.playSfxInternal(ExplosionSfxId.SHOCKWAVE, 0.7);
  }

  playQuestHit() {
    this.playSfxInternal('sfx_questhit', 0.8);
  }

  playMusic(key: string, loop: boolean = true) {
    if (!this.musicEnabled) return;
    if (this.currentMusicKey === key && this.currentMusic?.isPlaying) return;

    this.stopMusicImmediate();

    if (this.scene.cache.audio.exists(key)) {
      this.currentMusic = this.scene.sound.add(key, {
        volume: this.musicVolume,
        loop
      }) as Phaser.Sound.WebAudioSound;
      this.currentMusicKey = key;
      this.currentMusic.play();
    }
  }

  stopMusic(fadeOutMs: number = 500) {
    if (!this.currentMusic || this.fadingOut) return;

    if (fadeOutMs <= 0) {
      this.stopMusicImmediate();
      return;
    }

    this.fadingOut = true;
    const startVolume = this.currentMusic.volume;
    const steps = 20;
    const stepTime = fadeOutMs / steps;
    let step = 0;

    this.fadeTimer = this.scene.time.addEvent({
      delay: stepTime,
      repeat: steps - 1,
      callback: () => {
        step++;
        if (this.currentMusic) {
          const newVolume = startVolume * (1 - step / steps);
          this.currentMusic.setVolume(Math.max(0, newVolume));
        }
        if (step >= steps) {
          this.stopMusicImmediate();
        }
      }
    });
  }

  private stopMusicImmediate() {
    if (this.fadeTimer) {
      this.fadeTimer.destroy();
      this.fadeTimer = null;
    }
    this.fadingOut = false;
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic.destroy();
      this.currentMusic = null;
      this.currentMusicKey = null;
    }
  }

  pauseMusic() {
    if (this.currentMusic && this.currentMusic.isPlaying) {
      this.currentMusic.pause();
    }
  }

  resumeMusic() {
    if (this.currentMusic && this.currentMusic.isPaused) {
      this.currentMusic.resume();
    }
  }

  triggerGameTune(): string | null {
    if (!this.musicEnabled) return null;
    if (this.gameTuneStarted) return null;

    const availableTracks = GAME_MUSIC.filter(track =>
      this.scene.cache.audio.exists(track)
    );
    if (availableTracks.length === 0) return null;

    const idx = Math.floor(this.rng() * availableTracks.length);
    const track = availableTracks[idx];

    this.stopMusicImmediate();
    this.playMusic(track, true);
    this.gameTuneStarted = true;
    return track;
  }

  resetGameTuneState() {
    this.gameTuneStarted = false;
  }

  getCurrentMusicKey(): string | null {
    return this.currentMusicKey;
  }

  isMusicPlaying(): boolean {
    return this.currentMusic?.isPlaying ?? false;
  }

  setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopMusic();
    }
  }

  setSfxVolume(volume: number) {
    this.sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
  }

  setMusicVolume(volume: number) {
    this.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
    if (this.currentMusic && 'setVolume' in this.currentMusic) {
      (this.currentMusic as Phaser.Sound.WebAudioSound).setVolume(this.musicVolume);
    }
  }

  isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  static getSfxManifest(): string[] {
    const manifest: string[] = [];

    Object.values(WeaponSfxId).forEach(id => manifest.push(id));
    Object.values(UiSfxId).forEach(id => manifest.push(id));
    Object.values(ImpactSfxId).forEach(id => manifest.push(id));
    Object.values(ExplosionSfxId).forEach(id => manifest.push(id));

    Object.values(CREATURE_DEATH_SFX).forEach(variants => {
      if (variants) variants.forEach(v => {
        if (!manifest.includes(v)) manifest.push(v);
      });
    });
    Object.values(CREATURE_ATTACK_SFX).forEach(variants => {
      if (variants) variants.forEach(v => {
        if (!manifest.includes(v)) manifest.push(v);
      });
    });

    PLAYER_HURT_SFX.forEach(v => {
      if (!manifest.includes(v)) manifest.push(v);
    });
    BLOOD_SPILL_SFX.forEach(v => {
      if (!manifest.includes(v)) manifest.push(v);
    });

    manifest.push('sfx_questhit');

    return manifest;
  }
}
