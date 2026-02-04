import Phaser from 'phaser';

export enum SoundEffect {
  PISTOL_FIRE = 'pistol_fire',
  RIFLE_FIRE = 'rifle_fire',
  SHOTGUN_FIRE = 'shotgun_fire',
  PLASMA_FIRE = 'plasma_fire',
  ROCKET_FIRE = 'rocket_fire',
  FLAME_FIRE = 'flame_fire',
  ION_FIRE = 'ion_fire',
  EXPLOSION = 'explosion',
  EXPLOSION_BIG = 'explosion_big',
  PLAYER_HURT = 'player_hurt',
  PLAYER_DEATH = 'player_death',
  CREATURE_HIT = 'creature_hit',
  CREATURE_DEATH = 'creature_death',
  PICKUP_XP = 'pickup_xp',
  PICKUP_WEAPON = 'pickup_weapon',
  PICKUP_POWERUP = 'pickup_powerup',
  UI_CLICK = 'ui_click',
  UI_SELECT = 'ui_select',
  LEVEL_UP = 'level_up',
  RELOAD = 'reload',
  RELOAD_COMPLETE = 'reload_complete',
  FREEZE = 'freeze',
  NUKE = 'nuke'
}

export enum MusicTrack {
  MENU_THEME = 'menu_theme',
  GAMEPLAY_01 = 'gameplay_01',
  GAMEPLAY_02 = 'gameplay_02',
  BOSS_THEME = 'boss_theme'
}

export class AudioManager {
  private scene: Phaser.Scene;
  private sfxEnabled: boolean = true;
  private musicEnabled: boolean = true;
  private sfxVolume: number = 0.7;
  private musicVolume: number = 0.5;
  private currentMusic: Phaser.Sound.BaseSound | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  playSfx(effect: SoundEffect, volume?: number) {
    if (!this.sfxEnabled) return;

    const vol = (volume ?? 1) * this.sfxVolume;

    if (this.scene.cache.audio.exists(effect)) {
      this.scene.sound.play(effect, { volume: vol });
    }
  }

  playMusic(track: MusicTrack, loop: boolean = true) {
    if (!this.musicEnabled) return;

    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic = null;
    }

    if (this.scene.cache.audio.exists(track)) {
      this.currentMusic = this.scene.sound.add(track, {
        volume: this.musicVolume,
        loop
      });
      this.currentMusic.play();
    }
  }

  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic = null;
    }
  }

  pauseMusic() {
    if (this.currentMusic && (this.currentMusic as Phaser.Sound.WebAudioSound).isPlaying) {
      (this.currentMusic as Phaser.Sound.WebAudioSound).pause();
    }
  }

  resumeMusic() {
    if (this.currentMusic && (this.currentMusic as Phaser.Sound.WebAudioSound).isPaused) {
      (this.currentMusic as Phaser.Sound.WebAudioSound).resume();
    }
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
    if (this.currentMusic) {
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
}
