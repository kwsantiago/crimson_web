import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Creature, CreatureConfig } from '../entities/Creature';
import { Projectile } from '../entities/Projectile';
import { Bonus } from '../entities/Bonus';
import { BonusManager } from '../systems/BonusManager';
import { PerkSelector } from '../ui/PerkSelector';
import { BitmapFont } from '../ui/BitmapFont';
import { SoundManager } from '../audio/SoundManager';
import { smallFontWidths } from './BootScene';
import { GameMode } from '../data/gameModes';
import { CreatureType } from '../data/creatures';
import { BonusType } from '../data/bonuses';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  UI
} from '../config';

const TUTORIAL_WORLD_SIZE = 1024;

const TUTORIAL_STAGE_TEXT = [
  "In this tutorial you'll learn how to play Crimsonland",
  "First learn to move by pushing the arrow keys.",
  "Now pick up the bonuses by walking over them",
  "Now learn to shoot and move at the same time.\nClick the left Mouse button to shoot.",
  "Now, move the mouse to aim at the monsters",
  "It will help you to move and shoot at the same time. Just keep moving!",
  "Now let's learn about Perks. You'll receive a perk when you gain enough experience points.",
  "Perks can give you extra abilities, or boost your skills. Choose wisely!",
  "Great! Now you are ready to start playing Crimsonland",
];

const TUTORIAL_HINT_TEXT = [
  "This is the speed powerup, it makes you move faster!",
  "This is a weapon powerup. Picking it up gives you a new weapon.",
  "This powerup doubles all experience points you gain while it's active.",
  "This is the nuke powerup, picking it up causes a huge\nexposion harming all monsters nearby!",
  "Reflex Boost powerup slows down time giving you a chance to react better",
  "",
  "",
];

interface TutorialState {
  stageIndex: number;
  stageTimerMs: number;
  stageTransitionTimerMs: number;
  hintIndex: number;
  hintAlpha: number;
  hintFadeIn: boolean;
  repeatSpawnCount: number;
  hintBonusCreatureRef: number | null;
}

interface BonusSpawnCall {
  bonusType: BonusType;
  amount: number;
  x: number;
  y: number;
}

interface CreatureSpawnCall {
  type: CreatureType;
  x: number;
  y: number;
  config?: CreatureConfig;
  carriesBonus?: { bonusType: BonusType; weaponId?: number };
}

export class TutorialScene extends Phaser.Scene {
  private player!: Player;
  private creatures!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private bonuses!: Phaser.Physics.Arcade.Group;
  private bonusManager!: BonusManager;
  private perkSelector!: PerkSelector;
  private soundManager!: SoundManager;
  private bitmapFont: BitmapFont | null = null;
  private bloodDecals!: Phaser.GameObjects.Group;

  private tutorialState!: TutorialState;
  private promptContainer!: Phaser.GameObjects.Container;
  private hintContainer!: Phaser.GameObjects.Container;
  private promptText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private skipButton!: Phaser.GameObjects.Container;
  private playButton!: Phaser.GameObjects.Container;
  private repeatButton!: Phaser.GameObjects.Container;

  private crosshair!: Phaser.GameObjects.Image;
  private menuCursor!: Phaser.GameObjects.Image;
  private isPerkMenuOpen: boolean = false;
  private pendingPerks: number = 0;

  private hitSparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bloodEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private maxBloodDecals: number = 50;

  private elapsedMs: number = 0;
  private escapeKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('TutorialScene');
  }

  create() {
    this.resetTutorialState();

    this.game.canvas.oncontextmenu = (e) => e.preventDefault();
    this.soundManager = new SoundManager(this);

    if (this.textures.exists('smallFont') && smallFontWidths) {
      this.bitmapFont = new BitmapFont(this, 'smallFont', smallFontWidths);
    }

    this.physics.world.setBounds(0, 0, TUTORIAL_WORLD_SIZE, TUTORIAL_WORLD_SIZE);

    this.createBackground();
    this.createParticleSystems();

    this.bloodDecals = this.add.group();

    this.projectiles = this.physics.add.group({
      classType: Projectile,
      maxSize: 200,
      runChildUpdate: true
    });

    this.enemyProjectiles = this.physics.add.group({
      maxSize: 50,
      runChildUpdate: true
    });

    this.creatures = this.physics.add.group({
      classType: Creature,
      runChildUpdate: false
    });

    this.bonuses = this.physics.add.group({
      classType: Bonus,
      runChildUpdate: false
    });

    this.player = new Player(
      this,
      TUTORIAL_WORLD_SIZE / 2,
      TUTORIAL_WORLD_SIZE / 2,
      this.projectiles
    );

    this.player.perkManager.setCallbacks({
      onXpGain: (amount) => this.player.addXp(amount),
      onWeaponChange: (index) => this.player.weaponManager.switchWeapon(index),
      onHeal: (amount) => this.player.heal(amount),
      onFreezeEnemies: () => {},
      onKillHalfEnemies: () => {},
      onLoseHalfHealth: () => {},
      onInstantDeath: () => {},
      onAddPendingPerks: (count) => { this.pendingPerks += count; },
      onSetHealth: (health) => { this.player.health = health; },
      onReduceMaxHealth: (mult) => { this.player.maxHealth *= mult; },
      onGetXp: () => this.player.experience,
    });

    this.player.setWeaponSoundCallbacks({
      onFire: (weaponIndex) => this.soundManager.playWeaponFire(weaponIndex),
      onReload: (weaponIndex) => this.soundManager.playWeaponReload(weaponIndex),
    });

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, TUTORIAL_WORLD_SIZE, TUTORIAL_WORLD_SIZE);

    this.bonusManager = new BonusManager(this, this.bonuses, this.player);
    this.bonusManager.setCallbacks({
      onNuke: () => this.nukeAllEnemies(),
      onFreeze: () => {},
      onShockChain: () => {},
      onFireblast: () => {},
      onEnergizer: () => {}
    });

    this.perkSelector = new PerkSelector(this, this.player.perkManager, this.soundManager);
    this.perkSelector.setCallback(() => {
      this.pendingPerks--;
      this.isPerkMenuOpen = false;
      if (this.pendingPerks > 0) {
        this.time.delayedCall(100, () => {
          this.perkSelector.show();
          this.isPerkMenuOpen = true;
        });
      }
    });

    this.setupCollisions();
    this.createUI();

    this.escapeKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.player.weaponManager.switchWeapon(1);
    this.player.health = 100;
    this.player.experience = 0;
  }

  private resetTutorialState() {
    this.tutorialState = {
      stageIndex: -1,
      stageTimerMs: 0,
      stageTransitionTimerMs: -1000,
      hintIndex: -1,
      hintAlpha: 0,
      hintFadeIn: false,
      repeatSpawnCount: 0,
      hintBonusCreatureRef: null,
    };
    this.pendingPerks = 0;
    this.isPerkMenuOpen = false;
    this.elapsedMs = 0;
  }

  private createBackground() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x3f3819, 1);
    graphics.fillRect(0, 0, TUTORIAL_WORLD_SIZE, TUTORIAL_WORLD_SIZE);
    graphics.setDepth(-11);

    const terrain = this.textures.get('terrain');
    if (terrain && terrain.key !== '__MISSING') {
      const terrainWidth = terrain.getSourceImage().width;
      const terrainHeight = terrain.getSourceImage().height;

      for (let x = 0; x < TUTORIAL_WORLD_SIZE; x += terrainWidth) {
        for (let y = 0; y < TUTORIAL_WORLD_SIZE; y += terrainHeight) {
          const tile = this.add.image(x, y, 'terrain');
          tile.setOrigin(0, 0);
          tile.setDepth(-10);
          tile.setTint(0xb2b2b2);
          tile.setAlpha(0.9);
        }
      }
    }
  }

  private createParticleSystems() {
    this.hitSparkEmitter = this.add.particles(0, 0, 'hit_spark', {
      speed: { min: 50, max: 150 },
      scale: { start: 1, end: 0 },
      lifespan: 200,
      quantity: 5,
      emitting: false
    });
    this.hitSparkEmitter.setDepth(15);

    const bloodTexture = this.textures.exists('particles_sheet') ? 'particles_sheet' : 'blood_particle';
    this.bloodEmitter = this.add.particles(0, 0, bloodTexture, {
      frame: bloodTexture === 'particles_sheet' ? 5 : 0,
      speed: { min: 80, max: 140 },
      scale: { start: 0.5, end: 1.5 },
      lifespan: 250,
      quantity: 2,
      alpha: { start: 0.8, end: 0 },
      emitting: false
    });
    this.bloodEmitter.setDepth(15);
  }

  private setupCollisions() {
    this.physics.add.overlap(
      this.projectiles,
      this.creatures,
      this.onBulletHitCreature as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.creatures,
      this.onPlayerHitCreature as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.bonuses,
      this.onPlayerPickupBonus as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
  }

  private createUI() {
    this.promptContainer = this.add.container(SCREEN_WIDTH / 2, 80);
    this.promptContainer.setScrollFactor(0);
    this.promptContainer.setDepth(200);

    const promptBg = this.add.rectangle(0, 0, 500, 60, 0x000000, 0.8);
    promptBg.setStrokeStyle(2, 0xffffff);
    this.promptContainer.add(promptBg);

    this.promptText = this.add.text(0, 0, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial',
      align: 'center',
      wordWrap: { width: 480 }
    }).setOrigin(0.5);
    this.promptContainer.add(this.promptText);
    this.promptContainer.setAlpha(0);

    this.hintContainer = this.add.container(SCREEN_WIDTH / 2, 170);
    this.hintContainer.setScrollFactor(0);
    this.hintContainer.setDepth(200);

    const hintBg = this.add.rectangle(0, 0, 480, 50, 0x000000, 0.7);
    hintBg.setStrokeStyle(1, 0xaaaaaa);
    this.hintContainer.add(hintBg);

    this.hintText = this.add.text(0, 0, '', {
      fontSize: '12px',
      color: '#cccccc',
      fontFamily: 'Arial',
      align: 'center',
      wordWrap: { width: 460 }
    }).setOrigin(0.5);
    this.hintContainer.add(this.hintText);
    this.hintContainer.setAlpha(0);

    this.skipButton = this.createButton(80, SCREEN_HEIGHT - 40, 'Skip tutorial', () => {
      this.scene.start('MenuScene');
    });
    this.skipButton.setAlpha(0);

    this.playButton = this.createButton(SCREEN_WIDTH / 2 - 80, 160, 'Play a game', () => {
      this.scene.start('GameScene', { gameMode: GameMode.SURVIVAL });
    });
    this.playButton.setVisible(false);

    this.repeatButton = this.createButton(SCREEN_WIDTH / 2 + 80, 160, 'Repeat tutorial', () => {
      this.scene.restart();
    });
    this.repeatButton.setVisible(false);

    if (this.textures.exists('ui_aim')) {
      this.crosshair = this.add.image(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 'ui_aim');
      this.crosshair.setScrollFactor(0);
      this.crosshair.setDepth(500);
      this.crosshair.setScale(0.8);
    }

    if (this.textures.exists('ui_cursor')) {
      this.menuCursor = this.add.image(0, 0, 'ui_cursor');
      this.menuCursor.setScrollFactor(0);
      this.menuCursor.setDepth(600);
      this.menuCursor.setVisible(false);
    }

    this.input.setDefaultCursor('none');
  }

  private createButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setScrollFactor(0);
    container.setDepth(210);

    const btnW = 140;
    const btnH = 30;

    const bg = this.add.rectangle(0, 0, btnW, btnH, 0x222222, 0.9);
    bg.setStrokeStyle(2, 0x444444);
    bg.setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, label, {
      fontSize: '12px',
      color: '#dcdcdc',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x404070, 0.9);
      bg.setStrokeStyle(2, 0x8080b0);
      text.setColor('#ffffff');
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x222222, 0.9);
      bg.setStrokeStyle(2, 0x444444);
      text.setColor('#dcdcdc');
    });

    bg.on('pointerdown', callback);

    container.add([bg, text]);
    return container;
  }

  update(_time: number, delta: number) {
    const dtMs = Math.min(delta, 100);
    const dtSec = dtMs / 1000;
    this.elapsedMs += dtMs;

    if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      if (this.isPerkMenuOpen) {
        this.perkSelector.hide();
        this.isPerkMenuOpen = false;
        this.pendingPerks = 0;
        return;
      }
      this.scene.start('MenuScene');
      return;
    }

    if (this.isPerkMenuOpen) {
      this.perkSelector.update();
      this.updateCursor(true);
      return;
    }

    const anyMoveActive = this.player.getIsMoving();
    const anyFireActive = this.input.activePointer.isDown;
    const creaturesNoneActive = this.getActiveCreatureCount() === 0;
    const bonusPoolEmpty = this.getActiveBonusCount() === 0;
    const perkPendingCount = this.pendingPerks;

    const hintBonusDied = this.checkHintBonusCreatureDied();

    this.updateTutorialTimeline(dtMs, anyMoveActive, anyFireActive, creaturesNoneActive, bonusPoolEmpty, perkPendingCount, hintBonusDied);

    if (this.tutorialState.stageIndex !== 6 || this.pendingPerks === 0) {
      this.player.health = 100;
    }
    if (this.tutorialState.stageIndex !== 6) {
      this.player.experience = 0;
    }

    if (this.tutorialState.stageIndex === 6 && this.pendingPerks > 0 && !this.isPerkMenuOpen) {
      this.perkSelector.show();
      this.isPerkMenuOpen = true;
    }

    this.player.update(delta, this.input.activePointer);

    const activeCreatures = this.creatures.getChildren() as Creature[];
    for (const creature of activeCreatures) {
      if (creature.active) {
        creature.update(delta, this.player);
      }
    }

    this.bonusManager.update(dtSec);

    this.updateUI();
    this.updateCursor(false);
  }

  private updateTutorialTimeline(
    dtMs: number,
    anyMoveActive: boolean,
    anyFireActive: boolean,
    creaturesNoneActive: boolean,
    bonusPoolEmpty: boolean,
    perkPendingCount: number,
    hintBonusDied: boolean
  ) {
    this.tutorialState.stageTimerMs += dtMs;

    const { stageIndex, transitionTimerMs } = this.tickStageTransition(dtMs);
    this.tutorialState.stageIndex = stageIndex;
    this.tutorialState.stageTransitionTimerMs = transitionTimerMs;

    this.updateHintAlpha(dtMs, hintBonusDied);

    this.processStageLogic(anyMoveActive, anyFireActive, creaturesNoneActive, bonusPoolEmpty, perkPendingCount);
  }

  private tickStageTransition(dtMs: number): { stageIndex: number; transitionTimerMs: number } {
    let stageIndex = this.tutorialState.stageIndex;
    let transitionTimerMs = this.tutorialState.stageTransitionTimerMs;

    if (transitionTimerMs < -1) {
      transitionTimerMs += dtMs;
      if (transitionTimerMs >= -1) {
        stageIndex += 1;
        if (stageIndex === 9) {
          stageIndex = 0;
        }
        transitionTimerMs = 0;
      }
      return { stageIndex, transitionTimerMs };
    }

    if (transitionTimerMs > -1) {
      transitionTimerMs += dtMs;
    }
    if (transitionTimerMs > 1000) {
      transitionTimerMs = -1;
    }
    return { stageIndex, transitionTimerMs };
  }

  private updateHintAlpha(dtMs: number, hintBonusDied: boolean) {
    if (!this.tutorialState.hintFadeIn && hintBonusDied) {
      this.tutorialState.hintFadeIn = true;
      this.tutorialState.hintIndex += 1;
      this.spawnHintEnemies();
    }

    const delta = dtMs * 3;
    if (this.tutorialState.hintFadeIn) {
      this.tutorialState.hintAlpha = Math.min(1000, this.tutorialState.hintAlpha + delta);
    } else {
      this.tutorialState.hintAlpha = Math.max(0, this.tutorialState.hintAlpha - delta);
    }
  }

  private spawnHintEnemies() {
    this.spawnCreature(CreatureType.ZOMBIE, 128, 128, { healthOverride: 15, speedOverride: 35 });
    this.spawnCreature(CreatureType.ZOMBIE, 152, 160, { healthOverride: 15, speedOverride: 35 });
  }

  private processStageLogic(
    anyMoveActive: boolean,
    anyFireActive: boolean,
    creaturesNoneActive: boolean,
    bonusPoolEmpty: boolean,
    perkPendingCount: number
  ) {
    const state = this.tutorialState;

    switch (state.stageIndex) {
      case 0:
        if (state.stageTimerMs > 6000 && state.stageTransitionTimerMs === -1) {
          state.repeatSpawnCount = 0;
          state.hintIndex = -1;
          state.hintFadeIn = false;
          state.stageTransitionTimerMs = -1000;
        }
        break;

      case 1:
        if (anyMoveActive && state.stageTransitionTimerMs === -1) {
          state.stageTransitionTimerMs = -1000;
          this.soundManager.playUiLevelUp();
          this.spawnBonuses([
            { bonusType: BonusType.POINTS, amount: 500, x: 260, y: 260 },
            { bonusType: BonusType.POINTS, amount: 500, x: 600, y: 400 },
            { bonusType: BonusType.POINTS, amount: 500, x: 300, y: 400 },
          ]);
        }
        break;

      case 2:
        if (bonusPoolEmpty && state.stageTransitionTimerMs === -1) {
          state.stageTransitionTimerMs = -1000;
          this.soundManager.playUiLevelUp();
        }
        break;

      case 3:
        if (anyFireActive && state.stageTransitionTimerMs === -1) {
          state.stageTransitionTimerMs = -1000;
          this.soundManager.playUiLevelUp();
          this.spawnStage3Enemies();
        }
        break;

      case 4:
        if (creaturesNoneActive && state.stageTransitionTimerMs === -1) {
          state.stageTimerMs = 1000;
          state.stageTransitionTimerMs = -1000;
          this.soundManager.playUiLevelUp();
          state.repeatSpawnCount = 0;
          this.spawnStage4Enemies();
        }
        break;

      case 5:
        if (bonusPoolEmpty && creaturesNoneActive) {
          state.repeatSpawnCount += 1;
          if (state.repeatSpawnCount < 8) {
            state.hintFadeIn = false;
            state.hintBonusCreatureRef = null;
            this.spawnStage5Enemies(state.repeatSpawnCount);
          } else if (state.stageTransitionTimerMs === -1) {
            state.stageTransitionTimerMs = -1000;
            this.soundManager.playUiLevelUp();
            this.player.experience = 3000;
            this.checkLevelUp();
          }
        }
        break;

      case 6:
        if (perkPendingCount < 1 && state.stageTransitionTimerMs === -1) {
          state.stageTransitionTimerMs = -1000;
          this.spawnStage6Enemies();
        }
        break;

      case 7:
        if (bonusPoolEmpty && creaturesNoneActive && state.stageTransitionTimerMs === -1) {
          state.stageTransitionTimerMs = -1000;
        }
        break;
    }
  }

  private spawnBonuses(calls: BonusSpawnCall[]) {
    for (const call of calls) {
      this.bonusManager.spawnBonusAt(call.x, call.y, call.bonusType);
    }
  }

  private spawnCreature(type: CreatureType, x: number, y: number, config?: CreatureConfig): Creature {
    const creature = new Creature(this, x, y, type, this.enemyProjectiles, config);
    this.creatures.add(creature);
    return creature;
  }

  private spawnStage3Enemies() {
    this.spawnCreature(CreatureType.ZOMBIE, -64, 412, { healthOverride: 20, speedOverride: 40 });
    this.spawnCreature(CreatureType.ZOMBIE, -84, 512, { healthOverride: 25, speedOverride: 35 });
    this.spawnCreature(CreatureType.ZOMBIE, -54, 612, { healthOverride: 20, speedOverride: 40 });
  }

  private spawnStage4Enemies() {
    this.spawnCreature(CreatureType.ZOMBIE, TUTORIAL_WORLD_SIZE + 64, 412, { healthOverride: 20, speedOverride: 40 });
    this.spawnCreature(CreatureType.ZOMBIE, TUTORIAL_WORLD_SIZE + 84, 512, { healthOverride: 25, speedOverride: 35 });
    this.spawnCreature(CreatureType.ZOMBIE, TUTORIAL_WORLD_SIZE + 54, 612, { healthOverride: 20, speedOverride: 40 });
  }

  private spawnStage5Enemies(repeatCount: number) {
    const bonusConfig = this.getStage5BonusConfig(repeatCount);

    const carrier = this.spawnCreature(CreatureType.ZOMBIE, TUTORIAL_WORLD_SIZE + 64, 512, {
      healthOverride: 30,
      speedOverride: 45,
      xpOverride: 50,
    });

    if (bonusConfig) {
      carrier.setDropBonus(bonusConfig.bonusType, bonusConfig.weaponId);
      this.tutorialState.hintBonusCreatureRef = carrier.poolIndex;
    }

    this.spawnCreature(CreatureType.ZOMBIE, -64, 412, { healthOverride: 20, speedOverride: 40 });
    this.spawnCreature(CreatureType.ZOMBIE, -84, 612, { healthOverride: 20, speedOverride: 40 });
  }

  private getStage5BonusConfig(repeatCount: number): { bonusType: BonusType; weaponId?: number } | null {
    switch (repeatCount) {
      case 1: return { bonusType: BonusType.SPEED };
      case 2: return { bonusType: BonusType.WEAPON, weaponId: 5 };
      case 3: return { bonusType: BonusType.DOUBLE_EXPERIENCE };
      case 4: return { bonusType: BonusType.NUKE };
      case 5: return { bonusType: BonusType.REFLEX_BOOST };
      default: return null;
    }
  }

  private spawnStage6Enemies() {
    this.spawnCreature(CreatureType.ZOMBIE, -64, 412, { healthOverride: 20, speedOverride: 40 });
    this.spawnCreature(CreatureType.ZOMBIE, -84, 512, { healthOverride: 25, speedOverride: 35 });
    this.spawnCreature(CreatureType.ZOMBIE, -54, 612, { healthOverride: 20, speedOverride: 40 });
    this.spawnCreature(CreatureType.FAST_ZOMBIE, -32, -32, { healthOverride: 15, speedOverride: 60 });
    this.spawnCreature(CreatureType.ZOMBIE, TUTORIAL_WORLD_SIZE + 64, 412, { healthOverride: 20, speedOverride: 40 });
    this.spawnCreature(CreatureType.ZOMBIE, TUTORIAL_WORLD_SIZE + 84, 512, { healthOverride: 25, speedOverride: 35 });
    this.spawnCreature(CreatureType.ZOMBIE, TUTORIAL_WORLD_SIZE + 54, 612, { healthOverride: 20, speedOverride: 40 });
  }

  private checkLevelUp() {
    const leveledUp = this.player.update(0, this.input.activePointer);
    if (leveledUp) {
      this.pendingPerks++;
    }
  }

  private checkHintBonusCreatureDied(): boolean {
    const ref = this.tutorialState.hintBonusCreatureRef;
    if (ref === null) return false;

    const creatures = this.creatures.getChildren() as Creature[];
    for (const creature of creatures) {
      if (creature.poolIndex === ref) {
        if (!creature.active || creature.health <= 0) {
          this.tutorialState.hintBonusCreatureRef = null;
          return true;
        }
        return false;
      }
    }

    this.tutorialState.hintBonusCreatureRef = null;
    return true;
  }

  private getActiveCreatureCount(): number {
    let count = 0;
    const creatures = this.creatures.getChildren() as Creature[];
    for (const creature of creatures) {
      if (creature.active && creature.health > 0) {
        count++;
      }
    }
    return count;
  }

  private getActiveBonusCount(): number {
    let count = 0;
    const bonuses = this.bonuses.getChildren() as Bonus[];
    for (const bonus of bonuses) {
      if (bonus.active) {
        count++;
      }
    }
    return count;
  }

  private updateUI() {
    const state = this.tutorialState;
    const stageIndex = state.stageIndex;

    const promptAlpha = this.calculatePromptAlpha();
    this.promptContainer.setAlpha(promptAlpha);

    if (stageIndex >= 0 && stageIndex < TUTORIAL_STAGE_TEXT.length) {
      let text = TUTORIAL_STAGE_TEXT[stageIndex];
      if (stageIndex === 6 && this.pendingPerks < 1) {
        text = '';
      }
      this.promptText.setText(text);

      const lines = text.split('\n').length;
      const bgHeight = 40 + lines * 16;
      (this.promptContainer.first as Phaser.GameObjects.Rectangle).setSize(500, bgHeight);
    }

    const hintIdx = state.hintIndex;
    const hintAlpha = state.hintAlpha / 1000;
    if (hintIdx >= 0 && hintIdx < TUTORIAL_HINT_TEXT.length && TUTORIAL_HINT_TEXT[hintIdx]) {
      this.hintContainer.setAlpha(hintAlpha);
      this.hintText.setText(TUTORIAL_HINT_TEXT[hintIdx]);

      const lines = TUTORIAL_HINT_TEXT[hintIdx].split('\n').length;
      const bgHeight = 30 + lines * 16;
      (this.hintContainer.first as Phaser.GameObjects.Rectangle).setSize(480, bgHeight);
    } else {
      this.hintContainer.setAlpha(0);
    }

    if (stageIndex === 8) {
      this.skipButton.setVisible(false);
      this.playButton.setVisible(true);
      this.repeatButton.setVisible(true);
      this.playButton.setAlpha(promptAlpha);
      this.repeatButton.setAlpha(promptAlpha);
    } else {
      this.playButton.setVisible(false);
      this.repeatButton.setVisible(false);

      const skipAlpha = Math.max(0, Math.min(1, (state.stageTimerMs - 1000) / 1000));
      this.skipButton.setAlpha(skipAlpha);
      this.skipButton.setVisible(skipAlpha > 0.01);
    }
  }

  private calculatePromptAlpha(): number {
    const state = this.tutorialState;
    const stageIndex = state.stageIndex;
    const stageTimerMs = state.stageTimerMs;
    const transitionTimerMs = state.stageTransitionTimerMs;

    if (stageIndex < 0) return 0;

    let alpha: number;
    if (transitionTimerMs < -1) {
      alpha = -transitionTimerMs / 1000;
    } else if (transitionTimerMs < 0) {
      alpha = 1.0;
    } else {
      alpha = transitionTimerMs / 1000;
    }

    if (stageIndex === 5) {
      if (stageTimerMs > 5000 && transitionTimerMs > -2) {
        alpha = 1.0 - (stageTimerMs - 5000) / 1000;
      }
      if (stageTimerMs >= 6001) {
        alpha = 0;
      }
    }

    return Math.max(0, Math.min(1, alpha));
  }

  private updateCursor(menuMode: boolean) {
    const pointer = this.input.activePointer;

    if (menuMode) {
      if (this.crosshair) this.crosshair.setVisible(false);
      if (this.menuCursor) {
        this.menuCursor.setVisible(true);
        this.menuCursor.setPosition(pointer.x, pointer.y);
      }
    } else {
      if (this.menuCursor) this.menuCursor.setVisible(false);
      if (this.crosshair) {
        this.crosshair.setVisible(true);
        this.crosshair.setPosition(pointer.x, pointer.y);
      }
    }
  }

  private onBulletHitCreature(bullet: Phaser.GameObjects.GameObject, creature: Phaser.GameObjects.GameObject) {
    const proj = bullet as Projectile;
    const enemy = creature as Creature;

    if (!proj.active || !enemy.active) return;

    this.soundManager.triggerGameTune();
    this.soundManager.playBulletHit(proj.projectileType);

    const damage = proj.damage;
    enemy.takeDamage(damage);

    this.hitSparkEmitter.setPosition(enemy.x, enemy.y);
    this.hitSparkEmitter.explode(3);

    if (enemy.health <= 0) {
      this.bloodEmitter.setPosition(enemy.x, enemy.y);
      this.bloodEmitter.explode(5);

      if (enemy.hasDropBonus()) {
        const drop = enemy.getDropBonus();
        if (drop) {
          this.bonusManager.spawnBonusAt(enemy.x, enemy.y, drop.bonusType, drop.weaponId);
        }
      }

      this.player.addXp(enemy.xpValue);
      this.checkLevelUp();
      enemy.destroy();
    }

    if (!proj.penetrating) {
      proj.destroy();
    }
  }

  private onPlayerHitCreature(_player: Phaser.GameObjects.GameObject, creature: Phaser.GameObjects.GameObject) {
    const enemy = creature as Creature;

    if (!enemy.active || enemy.health <= 0) return;

    const damage = enemy.damage;
    if (damage > 0) {
      this.player.takeDamage(damage);
    }
  }

  private onPlayerPickupBonus(_player: Phaser.GameObjects.GameObject, bonus: Phaser.GameObjects.GameObject) {
    const bonusItem = bonus as Bonus;

    if (!bonusItem.active) return;

    this.bonusManager.collectBonus(bonusItem);
    this.checkLevelUp();
  }

  private nukeAllEnemies() {
    const creatures = this.creatures.getChildren() as Creature[];
    for (const creature of creatures) {
      if (creature.active) {
        creature.takeDamage(9999);
        if (creature.health <= 0) {
          this.bloodEmitter.setPosition(creature.x, creature.y);
          this.bloodEmitter.explode(5);
          creature.destroy();
        }
      }
    }
  }
}
