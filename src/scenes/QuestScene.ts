import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Creature, CreatureConfig, clearCreaturePool } from '../entities/Creature';
import { Projectile } from '../entities/Projectile';
import { Bonus } from '../entities/Bonus';
import { BonusManager } from '../systems/BonusManager';
import { PerkSelector } from '../ui/PerkSelector';
import { BitmapFont } from '../ui/BitmapFont';
import { SoundManager } from '../audio/SoundManager';
import { smallFontWidths } from './BootScene';
import { CreatureType } from '../data/creatures';
import { PerkId } from '../data/perks';
import {
  QuestDefinition,
  QuestProgressMap,
  SpawnEntry,
  getQuestByLevel,
  isQuestUnlocked
} from '../data/quests';
import { WEAPONS } from '../data/weapons';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  getXpForLevel,
  UI
} from '../config';

const STORAGE_KEY = 'crimson_quest_progress';

interface QuestSceneData {
  questLevel: string;
}

type QuestState = 'playing' | 'completed' | 'failed' | 'paused';

export class QuestScene extends Phaser.Scene {
  private player!: Player;
  private creatures!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private bonuses!: Phaser.Physics.Arcade.Group;
  private bonusManager!: BonusManager;
  private perkSelector!: PerkSelector;
  private bloodDecals!: Phaser.GameObjects.Group;
  private killCount: number = 0;
  private questState: QuestState = 'playing';
  private hitSparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bloodEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private explosionEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private maxBloodDecals: number = 100;
  private pendingPerks: number = 0;
  private rightWasDown: boolean = false;
  private elapsedMs: number = 0;
  private bitmapFont: BitmapFont | null = null;
  private soundManager!: SoundManager;
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private hudScale: number = 1;
  private crosshair!: Phaser.GameObjects.Image;
  private crosshairGlow!: Phaser.GameObjects.Image;
  private menuCursor!: Phaser.GameObjects.Image;
  private topBarSprite!: Phaser.GameObjects.Image;
  private heartSprite!: Phaser.GameObjects.Image;
  private healthBarBg!: Phaser.GameObjects.Image;
  private healthBarFill!: Phaser.GameObjects.Image;
  private weaponIcon!: Phaser.GameObjects.Image;
  private ammoIndicators: Phaser.GameObjects.Image[] = [];
  private pauseContainer!: Phaser.GameObjects.Container;
  private pauseSelectedIndex: number = 0;
  private pauseClickHandled: boolean = false;
  private pauseButtonElements: Phaser.GameObjects.GameObject[] = [];

  private questLevel: string = '1.1';
  private quest: QuestDefinition | null = null;
  private spawnQueue: SpawnEntry[] = [];
  private totalSpawnCount: number = 0;
  private spawnedCount: number = 0;
  private questTitleTimer: number = 0;
  private questTitleDuration: number = 2000;
  private victoryTimer: number = 0;
  private victoryDuration: number = 3000;

  private healthBar!: Phaser.GameObjects.Graphics;
  private xpBar!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;
  private reloadText!: Phaser.GameObjects.Text;
  private perkPromptText!: Phaser.GameObjects.Text;
  private questTitleText!: Phaser.GameObjects.Text;
  private questSubtitleText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private powerupIcons!: Phaser.GameObjects.Container;

  constructor() {
    super('QuestScene');
  }

  init(data: QuestSceneData) {
    this.questLevel = data.questLevel || '1.1';
  }

  create() {
    this.quest = getQuestByLevel(this.questLevel) ?? null;
    if (!this.quest) {
      this.scene.start('MenuScene');
      return;
    }

    this.questState = 'playing';
    this.killCount = 0;
    this.pendingPerks = 0;
    this.rightWasDown = false;
    this.elapsedMs = 0;
    this.questTitleTimer = 0;
    this.victoryTimer = 0;
    this.spawnedCount = 0;

    this.spawnQueue = [...this.quest.spawns].sort((a, b) => a.triggerMs - b.triggerMs);
    this.totalSpawnCount = this.quest.spawns.reduce((sum, s) => sum + s.count, 0);

    this.game.canvas.oncontextmenu = (e) => e.preventDefault();
    this.soundManager = new SoundManager(this);

    if (this.textures.exists('smallFont') && smallFontWidths) {
      this.bitmapFont = new BitmapFont(this, 'smallFont', smallFontWidths);
    }

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.createBackground();
    this.createParticleSystems();

    this.bloodDecals = this.add.group();

    this.projectiles = this.physics.add.group({
      classType: Projectile,
      maxSize: 500,
      runChildUpdate: true
    });

    this.enemyProjectiles = this.physics.add.group({
      maxSize: 100,
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
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      this.projectiles
    );

    this.player.perkManager.setCallbacks({
      onXpGain: (amount) => this.player.addXp(amount),
      onWeaponChange: (index) => this.player.weaponManager.switchWeapon(index),
      onHeal: (amount) => this.player.heal(amount),
      onFreezeEnemies: (duration) => this.freezeAllEnemies(duration),
      onKillHalfEnemies: () => this.killHalfEnemies(),
      onLoseHalfHealth: () => this.player.takeDamage(this.player.health / 2),
      onInstantDeath: () => this.player.takeDamage(9999),
      onAddPendingPerks: (count) => { this.pendingPerks += count; },
      onSetHealth: (health) => { this.player.health = health; },
      onReduceMaxHealth: (mult) => { this.player.maxHealth *= mult; }
    });

    if (this.quest.startWeaponId > 0) {
      this.player.weaponManager.switchWeapon(this.quest.startWeaponId);
    }

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.bonusManager = new BonusManager(this, this.bonuses, this.player);
    this.bonusManager.setCallbacks({
      onNuke: () => this.nukeAllEnemies(),
      onFreeze: (duration) => this.freezeAllEnemies(duration),
      onShockChain: () => this.triggerShockChain(),
      onFireblast: () => this.triggerFireblast(),
      onEnergizer: (duration) => this.triggerEnergizer(duration)
    });

    this.perkSelector = new PerkSelector(this, this.player.perkManager, this.soundManager);
    this.perkSelector.setCallback((_perkId) => {
      this.pendingPerks--;
      if (this.pendingPerks > 0) {
        this.time.delayedCall(100, () => this.perkSelector.show());
      }
    });

    this.setupCollisions();
    this.createHUD();
    this.createQuestUI();

    this.escapeKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    if (this.textures.exists('ui_cursor')) {
      this.menuCursor = this.add.image(0, 0, 'ui_cursor');
      this.menuCursor.setScrollFactor(0);
      this.menuCursor.setDepth(600);
      this.menuCursor.setVisible(false);
    }

    this.createPauseMenu();
    clearCreaturePool();
  }

  private createBackground() {
    const graphics = this.add.graphics();
    const tint = this.quest?.terrainTint ?? 0x3f3819;
    const r = (tint >> 16) & 0xff;
    const g = (tint >> 8) & 0xff;
    const b = tint & 0xff;
    const bgColor = Phaser.Display.Color.GetColor(
      Math.floor(r * 0.3),
      Math.floor(g * 0.3),
      Math.floor(b * 0.3)
    );
    graphics.fillStyle(bgColor, 1);
    graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    graphics.setDepth(-11);

    const terrain = this.textures.get('terrain');
    if (terrain && terrain.key !== '__MISSING') {
      const terrainWidth = terrain.getSourceImage().width;
      const terrainHeight = terrain.getSourceImage().height;

      for (let x = 0; x < WORLD_WIDTH; x += terrainWidth) {
        for (let y = 0; y < WORLD_HEIGHT; y += terrainHeight) {
          const tile = this.add.image(x, y, 'terrain');
          tile.setOrigin(0, 0);
          tile.setDepth(-10);
          tile.setTint(this.quest?.terrainTint ?? 0xb2b2b2);
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

    const explosionTexture = this.textures.exists('particles_sheet') ? 'particles_sheet' : 'explosion';
    this.explosionEmitter = this.add.particles(0, 0, explosionTexture, {
      frame: explosionTexture === 'particles_sheet' ? 5 : 0,
      speed: { min: 20, max: 80 },
      scale: { start: 1, end: 3 },
      lifespan: 700,
      quantity: 3,
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      emitting: false
    });
    this.explosionEmitter.setDepth(16);
  }

  private createHUD() {
    this.hudScale = Math.min(
      SCREEN_WIDTH / UI.HUD_BASE_WIDTH,
      SCREEN_HEIGHT / UI.HUD_BASE_HEIGHT
    );
    this.hudScale = Math.max(0.75, Math.min(1.5, this.hudScale));

    const sx = (v: number) => v * this.hudScale;

    this.healthBar = this.add.graphics();
    this.healthBar.setScrollFactor(0);
    this.healthBar.setDepth(100);

    this.xpBar = this.add.graphics();
    this.xpBar.setScrollFactor(0);
    this.xpBar.setDepth(100);

    if (this.textures.exists('ui_gameTop')) {
      this.topBarSprite = this.add.image(0, 0, 'ui_gameTop');
      this.topBarSprite.setOrigin(0, 0);
      this.topBarSprite.setScrollFactor(0);
      this.topBarSprite.setDepth(99);
      this.topBarSprite.setDisplaySize(sx(UI.HUD.TOP_BAR_SIZE.w), sx(UI.HUD.TOP_BAR_SIZE.h));
      this.topBarSprite.setAlpha(UI.ALPHA.TOP_BAR);
    }

    if (this.textures.exists('ui_lifeHeart')) {
      this.heartSprite = this.add.image(sx(UI.HUD.HEART_CENTER.x), sx(UI.HUD.HEART_CENTER.y), 'ui_lifeHeart');
      this.heartSprite.setScrollFactor(0);
      this.heartSprite.setDepth(101);
      this.heartSprite.setAlpha(UI.ALPHA.ICON);
    }

    if (this.textures.exists('ui_indLife')) {
      this.healthBarBg = this.add.image(sx(UI.HUD.HEALTH_BAR_POS.x), sx(UI.HUD.HEALTH_BAR_POS.y), 'ui_indLife');
      this.healthBarBg.setOrigin(0, 0);
      this.healthBarBg.setScrollFactor(0);
      this.healthBarBg.setDepth(100);
      this.healthBarBg.setDisplaySize(sx(UI.HUD.HEALTH_BAR_SIZE.w), sx(UI.HUD.HEALTH_BAR_SIZE.h));
      this.healthBarBg.setAlpha(UI.ALPHA.HEALTH_BG);

      this.healthBarFill = this.add.image(sx(UI.HUD.HEALTH_BAR_POS.x), sx(UI.HUD.HEALTH_BAR_POS.y), 'ui_indLife');
      this.healthBarFill.setOrigin(0, 0);
      this.healthBarFill.setScrollFactor(0);
      this.healthBarFill.setDepth(101);
      this.healthBarFill.setAlpha(UI.ALPHA.ICON);
    }

    if (this.textures.exists('ui_wicons')) {
      this.weaponIcon = this.add.image(sx(UI.HUD.WEAPON_ICON_POS.x), sx(UI.HUD.WEAPON_ICON_POS.y), 'ui_wicons');
      this.weaponIcon.setOrigin(0, 0);
      this.weaponIcon.setScrollFactor(0);
      this.weaponIcon.setDepth(101);
      this.weaponIcon.setDisplaySize(sx(UI.HUD.WEAPON_ICON_SIZE.w), sx(UI.HUD.WEAPON_ICON_SIZE.h));
      this.weaponIcon.setAlpha(UI.ALPHA.ICON);
    }

    this.levelText = this.add.text(sx(UI.HUD.SURV_LVL_VALUE_POS.x), sx(UI.HUD.SURV_LVL_VALUE_POS.y), '1', {
      fontSize: `${Math.floor(14 * this.hudScale)}px`,
      color: '#dcdcdc',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

    this.killText = this.add.text(SCREEN_WIDTH - 16, 16, 'Kills: 0', {
      fontSize: '14px',
      color: '#dcdcdc',
      fontFamily: 'Arial'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    this.weaponText = this.add.text(SCREEN_WIDTH - 16, SCREEN_HEIGHT - 42, 'Pistol', {
      fontSize: '13px',
      color: '#dcdcdc',
      fontFamily: 'Arial'
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(100);

    this.ammoText = this.add.text(SCREEN_WIDTH - 16, SCREEN_HEIGHT - 24, '12 / 12', {
      fontSize: '16px',
      color: '#dcdcdc',
      fontFamily: 'Arial Black'
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(100);

    this.reloadText = this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 50, 'RELOADING', {
      fontSize: '18px',
      color: '#f0c850',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);

    this.perkPromptText = this.add.text(SCREEN_WIDTH / 2, 60, 'Press Mouse2 to pick a perk!', {
      fontSize: '16px',
      color: '#f0c850',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);

    this.add.text(8, SCREEN_HEIGHT - 24, 'WASD Move | Mouse2 Perks | ESC Menu', {
      fontSize: '10px',
      color: '#aaaab4',
      fontFamily: 'Arial'
    }).setScrollFactor(0).setDepth(100);

    this.powerupIcons = this.add.container(8, sx(121));
    this.powerupIcons.setScrollFactor(0);
    this.powerupIcons.setDepth(100);

    if (this.textures.exists('particles_sheet')) {
      this.crosshairGlow = this.add.image(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 'particles_sheet', 13);
      this.crosshairGlow.setScrollFactor(0);
      this.crosshairGlow.setDepth(499);
      this.crosshairGlow.setDisplaySize(64, 64);
      this.crosshairGlow.setBlendMode(Phaser.BlendModes.ADD);
    }

    if (this.textures.exists('ui_aim')) {
      this.crosshair = this.add.image(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 'ui_aim');
      this.crosshair.setScrollFactor(0);
      this.crosshair.setDepth(500);
      this.crosshair.setDisplaySize(20, 20);
    }

    this.input.setDefaultCursor('none');
  }

  private createQuestUI() {
    const questLabel = this.quest ? `Quest ${this.quest.level}` : 'Quest';
    this.progressText = this.add.text(SCREEN_WIDTH - 16, 36, questLabel, {
      fontSize: '11px',
      color: '#46b4f0',
      fontFamily: 'Arial Black'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    this.timerText = this.add.text(SCREEN_WIDTH - 16, 52, '0:00', {
      fontSize: '12px',
      color: '#dcdcdc',
      fontFamily: 'Arial'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    this.questTitleText = this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 60, this.quest?.title ?? '', {
      fontSize: '32px',
      color: '#f0c850',
      fontFamily: 'Arial Black',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setAlpha(0);

    this.questSubtitleText = this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 20, this.quest?.description ?? '', {
      fontSize: '14px',
      color: '#dcdcdc',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setAlpha(0);
  }

  private createPauseMenu() {
    this.pauseContainer = this.add.container(0, 0);
    this.pauseContainer.setScrollFactor(0);
    this.pauseContainer.setDepth(300);
    this.pauseContainer.setVisible(false);

    const overlay = this.add.rectangle(
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT / 2,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
      0x000000,
      0.7
    );
    this.pauseContainer.add(overlay);
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
      this.enemyProjectiles,
      this.player,
      this.onEnemyBulletHitPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
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

  update(_time: number, delta: number) {
    const pointer = this.input.activePointer;

    if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      if (this.questState === 'completed' || this.questState === 'failed') {
        this.returnToQuestSelect();
        return;
      }
      if (this.perkSelector.isOpen()) {
        this.perkSelector.hide();
        this.pendingPerks = 0;
        return;
      }
      if (this.questState === 'paused') {
        this.resumeGame();
        return;
      }
      this.pauseGame();
      return;
    }

    if (this.menuCursor) {
      this.menuCursor.setPosition(pointer.x, pointer.y);
    }
    if (this.crosshairGlow) {
      this.crosshairGlow.setPosition(pointer.x, pointer.y);
    }
    if (this.crosshair) {
      this.crosshair.setPosition(pointer.x, pointer.y);
    }

    if (this.questState === 'completed') {
      this.updateVictoryScreen(delta);
      return;
    }

    if (this.questState === 'failed') {
      this.updateFailedScreen(delta);
      return;
    }

    if (this.questState === 'paused') {
      this.physics.pause();
      this.updatePauseMenu();
      return;
    }

    this.questTitleTimer += delta;
    this.updateQuestTitle();

    this.elapsedMs += delta;

    if (this.perkSelector.isOpen()) {
      this.physics.pause();
      this.perkSelector.update();
      if (this.menuCursor) {
        this.menuCursor.setVisible(true);
      }
      if (this.crosshair) {
        this.crosshair.setVisible(false);
      }
      if (this.crosshairGlow) {
        this.crosshairGlow.setVisible(false);
      }
      return;
    }

    if (this.physics.world.isPaused) {
      this.physics.resume();
    }

    if (this.menuCursor) {
      this.menuCursor.setVisible(false);
    }
    if (this.crosshair) {
      this.crosshair.setVisible(true);
    }
    if (this.crosshairGlow) {
      this.crosshairGlow.setVisible(true);
    }

    const rightDown = pointer.rightButtonDown();
    const rightJustPressed = rightDown && !this.rightWasDown;
    this.rightWasDown = rightDown;

    if (this.pendingPerks > 0 && rightJustPressed && !pointer.leftButtonDown()) {
      this.perkSelector.show();
      return;
    }

    const leveledUp = this.player.update(delta, pointer);
    if (leveledUp) {
      this.showLevelUpEffect();
      this.pendingPerks++;
    }

    if (this.player.health <= 0) {
      this.handleQuestFailed();
      return;
    }

    this.processSpawnQueue();

    const reflexPerkScale = this.player.perkManager.hasReflexBoosted() ? 0.9 : 1.0;
    const reflexBonusScale = this.player.hasActiveReflex() ? 0.35 : 1.0;
    const enemyTimeScale = reflexPerkScale * reflexBonusScale;

    this.creatures.getChildren().forEach((creature) => {
      const c = creature as Creature;
      if (c.active) {
        c.update(delta * enemyTimeScale, this.player);
      }
    });

    this.bonusManager.update(delta);
    this.updateEnemyProjectiles(delta, enemyTimeScale);
    this.checkVictoryCondition();
    this.updateHUD();
  }

  private processSpawnQueue() {
    while (this.spawnQueue.length > 0 && this.spawnQueue[0].triggerMs <= this.elapsedMs) {
      const entry = this.spawnQueue.shift()!;
      for (let i = 0; i < entry.count; i++) {
        const offsetX = (Math.random() - 0.5) * 40;
        const offsetY = (Math.random() - 0.5) * 40;
        this.spawnCreature(
          entry.creatureType,
          entry.x + offsetX,
          entry.y + offsetY,
          entry.config
        );
        this.spawnedCount++;
      }
    }
  }

  private spawnCreature(type: CreatureType, x: number, y: number, spawnConfig?: { healthOverride?: number; speedOverride?: number; damageOverride?: number; xpOverride?: number; sizeOverride?: number; tint?: { r: number; g: number; b: number; a: number }; isStationary?: boolean; spawnTimer?: number; spawnType?: CreatureType }) {
    const config: CreatureConfig | undefined = spawnConfig ? {
      healthOverride: spawnConfig.healthOverride,
      speedOverride: spawnConfig.speedOverride,
      damageOverride: spawnConfig.damageOverride,
      xpOverride: spawnConfig.xpOverride,
      sizeOverride: spawnConfig.sizeOverride,
      tint: spawnConfig.tint
    } : undefined;

    const creature = new Creature(this, x, y, type, this.enemyProjectiles, config);
    this.creatures.add(creature);
    return creature;
  }

  private checkVictoryCondition() {
    if (this.spawnQueue.length > 0) return;

    const activeCreatures = this.creatures.getChildren().filter(c => (c as Creature).active && (c as Creature).health > 0);
    if (activeCreatures.length === 0) {
      this.handleQuestCompleted();
    }
  }

  private handleQuestCompleted() {
    this.questState = 'completed';
    this.saveProgress(true);
    this.soundManager.playUiLevelUp();
  }

  private handleQuestFailed() {
    this.questState = 'failed';
    this.saveProgress(false);
  }

  private saveProgress(completed: boolean) {
    const progress = this.loadProgress();
    const existing = progress[this.questLevel] || { completed: false, attempts: 0 };

    progress[this.questLevel] = {
      completed: existing.completed || completed,
      bestTimeMs: completed ? Math.min(existing.bestTimeMs ?? Infinity, this.elapsedMs) : existing.bestTimeMs,
      attempts: existing.attempts + 1
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.warn('Failed to save quest progress:', e);
    }
  }

  private loadProgress(): QuestProgressMap {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  private updateQuestTitle() {
    const fadeInDuration = 500;
    const holdDuration = 1000;
    const fadeOutDuration = 500;
    const totalDuration = fadeInDuration + holdDuration + fadeOutDuration;

    if (this.questTitleTimer > totalDuration) {
      this.questTitleText.setAlpha(0);
      this.questSubtitleText.setAlpha(0);
      return;
    }

    let alpha = 0;
    if (this.questTitleTimer < fadeInDuration) {
      alpha = this.questTitleTimer / fadeInDuration;
    } else if (this.questTitleTimer < fadeInDuration + holdDuration) {
      alpha = 1;
    } else {
      alpha = 1 - (this.questTitleTimer - fadeInDuration - holdDuration) / fadeOutDuration;
    }

    this.questTitleText.setAlpha(alpha);
    this.questSubtitleText.setAlpha(alpha);
  }

  private updateVictoryScreen(delta: number) {
    this.victoryTimer += delta;

    if (this.victoryTimer < 500) return;

    if (!this.questTitleText.getData('victoryShown')) {
      this.questTitleText.setData('victoryShown', true);
      this.questTitleText.setText('QUEST COMPLETE!');
      this.questTitleText.setColor('#00ff00');
      this.questTitleText.setAlpha(1);

      const timeStr = this.formatTime(this.elapsedMs);
      this.questSubtitleText.setText(`Time: ${timeStr} | Kills: ${this.killCount}`);
      this.questSubtitleText.setAlpha(1);

      this.showContinuePrompt();
    }

    this.updateCursorVisibility(true);

    const pointer = this.input.activePointer;
    if (pointer.isDown && this.victoryTimer > 1500) {
      this.handlePostQuestAction();
    }
  }

  private updateFailedScreen(delta: number) {
    this.victoryTimer += delta;

    if (this.victoryTimer < 500) return;

    if (!this.questTitleText.getData('failedShown')) {
      this.questTitleText.setData('failedShown', true);
      this.questTitleText.setText('QUEST FAILED');
      this.questTitleText.setColor('#ff4444');
      this.questTitleText.setAlpha(1);

      this.questSubtitleText.setText('Press any key to continue...');
      this.questSubtitleText.setAlpha(1);

      this.showContinuePrompt();
    }

    this.updateCursorVisibility(true);

    const pointer = this.input.activePointer;
    if (pointer.isDown && this.victoryTimer > 1500) {
      this.handlePostQuestAction();
    }
  }

  private showContinuePrompt() {
    const container = this.add.container(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 80);
    container.setScrollFactor(0);
    container.setDepth(250);

    const retryBtn = this.createButton(0, 0, 'RETRY', () => {
      this.scene.restart({ questLevel: this.questLevel });
    });
    container.add(retryBtn);

    const menuBtn = this.createButton(0, 50, 'QUEST SELECT', () => {
      this.returnToQuestSelect();
    });
    container.add(menuBtn);
  }

  private createButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 160, 36, 0x222222, 0.9);
    bg.setStrokeStyle(2, 0x444444);
    bg.setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, text, {
      fontSize: '14px',
      color: '#dcdcdc',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x404070, 0.9);
      bg.setStrokeStyle(2, 0x8080b0);
      label.setColor('#ffffff');
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x222222, 0.9);
      bg.setStrokeStyle(2, 0x444444);
      label.setColor('#dcdcdc');
    });

    bg.on('pointerdown', callback);

    container.add([bg, label]);
    return container;
  }

  private handlePostQuestAction() {
    this.returnToQuestSelect();
  }

  private returnToQuestSelect() {
    this.scene.start('MenuScene', { openQuestSelect: true });
  }

  private pauseGame() {
    this.questState = 'paused';
    this.pauseContainer.setVisible(true);
    this.updateCursorVisibility(true);
  }

  private resumeGame() {
    this.questState = 'playing';
    this.pauseContainer.setVisible(false);
    this.pauseButtonElements.forEach(el => el.destroy());
    this.pauseButtonElements = [];
    this.updateCursorVisibility(false);
  }

  private updateCursorVisibility(showMenu: boolean) {
    if (this.menuCursor) {
      this.menuCursor.setVisible(showMenu);
    }
    if (this.crosshair) {
      this.crosshair.setVisible(!showMenu);
    }
    if (this.crosshairGlow) {
      this.crosshairGlow.setVisible(!showMenu);
    }
  }

  private updatePauseMenu() {
    this.pauseButtonElements.forEach(el => el.destroy());
    this.pauseButtonElements = [];

    const scale = Math.min(SCREEN_WIDTH / UI.BASE_WIDTH, SCREEN_HEIGHT / UI.BASE_HEIGHT);
    const clampedScale = Math.max(0.75, Math.min(1.5, scale));
    const sx = (v: number) => v * clampedScale;

    const panelW = sx(280);
    const panelH = sx(220);
    const panelX = SCREEN_WIDTH / 2;
    const panelY = SCREEN_HEIGHT / 2;

    const panel = this.add.rectangle(panelX, panelY, panelW, panelH, 0x1a1612, 0.95);
    panel.setStrokeStyle(2, 0x3d3830);
    panel.setScrollFactor(0);
    panel.setDepth(300);
    this.pauseButtonElements.push(panel);

    const title = this.add.text(panelX, panelY - sx(70), 'PAUSED', {
      fontSize: `${Math.floor(20 * clampedScale)}px`,
      color: '#f0c850',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(301);
    this.pauseButtonElements.push(title);

    const entries = [
      { label: 'RESUME', y: panelY - sx(25), action: 'resume' },
      { label: 'RETRY', y: panelY + sx(15), action: 'retry' },
      { label: 'QUIT', y: panelY + sx(55), action: 'quit' },
    ];

    const pointer = this.input.activePointer;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const btnW = sx(140);
      const btnH = sx(26);
      const bounds = {
        x: panelX - btnW / 2,
        y: entry.y - btnH / 2,
        w: btnW,
        h: btnH
      };

      const hovering = pointer.x >= bounds.x && pointer.x <= bounds.x + bounds.w &&
                       pointer.y >= bounds.y && pointer.y <= bounds.y + bounds.h;

      if (hovering) {
        this.pauseSelectedIndex = i;
      }

      const isSelected = i === this.pauseSelectedIndex;
      const color = isSelected ? '#ffffff' : '#dcdcdc';
      const bgColor = isSelected ? 0x404070 : 0x222222;
      const borderColor = isSelected ? 0x8080b0 : 0x444444;

      const bg = this.add.rectangle(panelX, entry.y, btnW, btnH, bgColor, 0.9);
      bg.setStrokeStyle(2, borderColor);
      bg.setScrollFactor(0);
      bg.setDepth(301);
      this.pauseButtonElements.push(bg);

      const text = this.add.text(panelX, entry.y, entry.label, {
        fontSize: `${Math.floor(12 * clampedScale)}px`,
        color,
        fontFamily: 'Arial Black'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(302);
      this.pauseButtonElements.push(text);

      if (hovering && pointer.isDown && !this.pauseClickHandled) {
        this.pauseClickHandled = true;
        this.handlePauseAction(entry.action);
      }
    }

    if (!pointer.isDown) {
      this.pauseClickHandled = false;
    }
  }

  private handlePauseAction(action: string) {
    switch (action) {
      case 'resume':
        this.resumeGame();
        break;
      case 'retry':
        this.scene.restart({ questLevel: this.questLevel });
        break;
      case 'quit':
        this.returnToQuestSelect();
        break;
    }
  }

  private updateHUD() {
    const sx = (v: number) => v * this.hudScale;

    this.healthBar.clear();
    this.xpBar.clear();

    const healthRatio = Math.max(0, Math.min(1, this.player.health / this.player.maxHealth));
    if (this.healthBarFill && this.textures.exists('ui_indLife')) {
      const tex = this.textures.get('ui_indLife');
      const fullWidth = sx(UI.HUD.HEALTH_BAR_SIZE.w);
      const fillWidth = fullWidth * healthRatio;
      this.healthBarFill.setDisplaySize(fillWidth, sx(UI.HUD.HEALTH_BAR_SIZE.h));
      this.healthBarFill.setCrop(0, 0, tex.getSourceImage().width * healthRatio, tex.getSourceImage().height);
    }

    if (this.heartSprite) {
      const t = this.elapsedMs / 1000;
      const pulseSpeed = this.player.health < 30 ? 5.0 : 2.0;
      const pulse = (Math.pow(Math.sin(t * pulseSpeed), 4) * 4 + 14);
      const size = pulse * 2 * this.hudScale;
      this.heartSprite.setDisplaySize(size, size);
      this.heartSprite.setPosition(sx(UI.HUD.HEART_CENTER.x), sx(UI.HUD.HEART_CENTER.y));
    }

    const xpNeeded = getXpForLevel(this.player.level);
    const xpRatio = Math.min(1, this.player.experience / xpNeeded);
    const xpBarX = sx(UI.HUD.SURV_PROGRESS_POS.x);
    const xpBarY = sx(UI.HUD.SURV_PROGRESS_POS.y);
    const xpBarWidth = sx(UI.HUD.SURV_PROGRESS_WIDTH);
    const xpBarH = 4 * this.hudScale;

    this.xpBar.fillStyle(0x0f2952, 0.6);
    this.xpBar.fillRect(xpBarX, xpBarY, xpBarWidth, xpBarH);
    this.xpBar.fillStyle(0x1a4d99, 1);
    this.xpBar.fillRect(xpBarX + this.hudScale, xpBarY + this.hudScale, Math.max(0, (xpBarWidth - 2 * this.hudScale) * xpRatio), xpBarH - 2 * this.hudScale);

    this.levelText.setText(`${this.player.level}`);
    this.killText.setText(`Kills: ${this.killCount}`);

    const progressPercent = this.totalSpawnCount > 0 ? Math.floor((this.killCount / this.totalSpawnCount) * 100) : 0;
    this.progressText.setText(`Quest ${this.quest?.level} - ${progressPercent}%`);

    this.timerText.setText(this.formatTime(this.elapsedMs));

    const wm = this.player.weaponManager;
    this.weaponText.setText(wm.currentWeapon.name);
    this.ammoText.setText(`${wm.currentAmmo} / ${wm.clipSize}`);

    if (wm.isCurrentlyReloading) {
      this.reloadText.setVisible(true);
      this.ammoText.setColor('#f0c850');
    } else {
      this.reloadText.setVisible(false);
      this.ammoText.setColor('#dcdcdc');
    }

    if (this.pendingPerks > 0 && !this.perkSelector.isOpen()) {
      this.perkPromptText.setVisible(true);
      this.perkPromptText.setText(`Press Mouse2 to pick a perk (${this.pendingPerks})`);
    } else {
      this.perkPromptText.setVisible(false);
    }

    const pointer = this.input.activePointer;
    if (this.crosshair) {
      this.crosshair.setPosition(pointer.x, pointer.y);
    }

    this.updatePowerupIcons();
  }

  private updatePowerupIcons() {
    this.powerupIcons.removeAll(true);

    let y = 0;
    const spacing = 44;

    const drawBonusSlot = (icon: Phaser.GameObjects.Sprite, label: string, timer: number, barColor: number) => {
      const panel = this.add.graphics();
      panel.fillStyle(0x1a1612, 0.7);
      panel.fillRoundedRect(-4, y - 14, 120, 40, 4);
      panel.lineStyle(1, 0x3d3830, 0.5);
      panel.strokeRoundedRect(-4, y - 14, 120, 40, 4);
      this.powerupIcons.add(panel);

      icon.setScale(0.7);
      this.powerupIcons.add(icon);

      const labelText = this.add.text(36, y - 4, label, {
        fontSize: '11px',
        color: '#dcdcdc',
        fontFamily: 'Arial'
      }).setOrigin(0, 0.5);
      this.powerupIcons.add(labelText);

      const barBg = this.add.graphics();
      barBg.fillStyle(UI.COLORS.XP_BAR_BG, 0.5);
      barBg.fillRect(36, y + 6, 70, 6);
      this.powerupIcons.add(barBg);

      const barFill = this.add.graphics();
      const ratio = Math.min(1, timer / 20);
      barFill.fillStyle(barColor, 0.8);
      barFill.fillRect(36, y + 6, 70 * ratio, 6);
      this.powerupIcons.add(barFill);
    };

    if (this.player.hasActiveShield()) {
      const icon = this.add.sprite(14, y, 'bonus_shield');
      drawBonusSlot(icon, 'Shield', this.player.shieldTimer, 0x00aaff);
      y += spacing;
    }

    if (this.player.hasActiveSpeed()) {
      const icon = this.add.sprite(14, y, 'bonus_speed');
      drawBonusSlot(icon, 'Speed', this.player.speedBoostTimer, 0x00ff44);
      y += spacing;
    }

    if (this.player.hasActiveReflex()) {
      const icon = this.add.sprite(14, y, 'bonus_reflex');
      drawBonusSlot(icon, 'Reflex', this.player.reflexBoostTimer, 0xff00ff);
      y += spacing;
    }

    if (this.player.hasActiveDoubleXp()) {
      const icon = this.add.sprite(14, y, 'bonus_double_xp');
      drawBonusSlot(icon, '2x XP', this.player.doubleXpTimer, 0xffdd00);
      y += spacing;
    }

    if (this.player.hasActiveWeaponPowerUp()) {
      const icon = this.add.sprite(14, y, 'bonus_power_up');
      drawBonusSlot(icon, 'Power Up', this.player.weaponPowerUpTimer, 0xff6600);
      y += spacing;
    }

    if (this.player.hasActiveFireBullets()) {
      const icon = this.add.sprite(14, y, 'bonus_fire_bullets');
      drawBonusSlot(icon, 'Fire Ammo', this.player.fireBulletsTimer, 0xff4400);
      y += spacing;
    }

    if (this.player.hasActiveEnergizer()) {
      const icon = this.add.sprite(14, y, 'bonus_energizer');
      drawBonusSlot(icon, 'Energizer', this.player.energizerTimer, 0xffff00);
      y += spacing;
    }
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private showLevelUpEffect() {
    this.soundManager.playUiLevelUp();

    const text = this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 100, 'LEVEL UP!', {
      fontSize: '28px',
      color: '#f0c850',
      fontFamily: 'Arial Black',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(150);

    this.tweens.add({
      targets: text,
      y: text.y - 50,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
  }

  private onBulletHitCreature(bullet: Phaser.GameObjects.GameObject, creature: Phaser.GameObjects.GameObject) {
    const projectile = bullet as Projectile;
    const enemy = creature as Creature;

    if (!projectile.active || !enemy.active) return;

    const damage = projectile.damage;
    const killed = enemy.takeDamage(damage);

    this.hitSparkEmitter.emitParticleAt(enemy.x, enemy.y);
    this.bloodEmitter.emitParticleAt(enemy.x, enemy.y);

    projectile.destroy();

    if (killed) {
      this.onCreatureKilled(enemy);
    }
  }

  private onCreatureKilled(creature: Creature) {
    this.killCount++;

    this.player.addXp(creature.xpValue);
    this.addBloodDecal(creature.x, creature.y);

    this.bonusManager.trySpawnBonus(creature.x, creature.y);

    if (creature.spawnsOnDeath && creature.spawnCount) {
      for (let i = 0; i < creature.spawnCount; i++) {
        const offsetX = (Math.random() - 0.5) * 40;
        const offsetY = (Math.random() - 0.5) * 40;
        const child = new Creature(
          this,
          creature.x + offsetX,
          creature.y + offsetY,
          creature.spawnsOnDeath
        );
        this.creatures.add(child);
      }
    }
  }

  private onPlayerHitCreature(_player: Phaser.GameObjects.GameObject, creature: Phaser.GameObjects.GameObject) {
    const enemy = creature as Creature;
    if (!enemy.active || enemy.isRanged) return;

    const damage = enemy.damage;
    if (damage > 0) {
      this.player.takeDamage(damage);
    }
  }

  private onEnemyBulletHitPlayer(playerObj: Phaser.GameObjects.GameObject, bullet: Phaser.GameObjects.GameObject) {
    const projectile = bullet as any;
    if (!projectile.active) return;

    const damage = projectile.damage || 10;
    this.player.takeDamage(damage);
    projectile.destroy();
  }

  private onPlayerPickupBonus(_player: Phaser.GameObjects.GameObject, bonus: Phaser.GameObjects.GameObject) {
    const bonusObj = bonus as Bonus;
    if (!bonusObj.active) return;

    this.bonusManager.collectBonus(bonusObj);
    bonusObj.destroy();
  }

  private addBloodDecal(x: number, y: number) {
    if (this.bloodDecals.getLength() >= this.maxBloodDecals) {
      const oldest = this.bloodDecals.getFirst(true);
      if (oldest) oldest.destroy();
    }

    const decal = this.add.circle(x, y, 8 + Math.random() * 8, 0x660000, 0.6);
    decal.setDepth(-5);
    this.bloodDecals.add(decal);
  }

  private updateEnemyProjectiles(delta: number, timeScale: number) {
    this.enemyProjectiles.getChildren().forEach((proj) => {
      const p = proj as Phaser.Physics.Arcade.Sprite;
      if (p.active) {
        const body = p.body as Phaser.Physics.Arcade.Body;
        if (body) {
          const data = p.getData('baseVelocity') as { x: number; y: number } | undefined;
          if (!data) {
            p.setData('baseVelocity', { x: body.velocity.x, y: body.velocity.y });
          } else {
            body.setVelocity(data.x * timeScale, data.y * timeScale);
          }
        }
        if ((p as any).update) {
          (p as any).update(delta * timeScale);
        }
        if (p.x < 0 || p.x > WORLD_WIDTH || p.y < 0 || p.y > WORLD_HEIGHT) {
          p.setActive(false);
          p.setVisible(false);
          if (body) body.enable = false;
        }
      }
    });
  }

  private freezeAllEnemies(duration: number) {
    this.creatures.getChildren().forEach((c) => {
      const creature = c as Creature;
      if (creature.active) {
        creature.freeze(duration);
      }
    });
  }

  private killHalfEnemies() {
    const creatures = this.creatures.getChildren().filter(c => (c as Creature).active);
    const half = Math.floor(creatures.length / 2);
    for (let i = 0; i < half; i++) {
      const creature = creatures[i] as Creature;
      creature.takeDamage(9999);
      this.onCreatureKilled(creature);
    }
  }

  private nukeAllEnemies() {
    this.creatures.getChildren().forEach((c) => {
      const creature = c as Creature;
      if (creature.active) {
        creature.takeDamage(9999);
        this.onCreatureKilled(creature);
        this.explosionEmitter.emitParticleAt(creature.x, creature.y);
      }
    });
    this.soundManager.playExplosion();
  }

  private triggerShockChain() {
    let count = 0;
    this.creatures.getChildren().forEach((c) => {
      const creature = c as Creature;
      if (creature.active && count < 10) {
        creature.takeDamage(50);
        if (creature.health <= 0) {
          this.onCreatureKilled(creature);
        }
        count++;
      }
    });
  }

  private triggerFireblast() {
    const range = 150;
    this.creatures.getChildren().forEach((c) => {
      const creature = c as Creature;
      if (!creature.active) return;
      const dx = creature.x - this.player.x;
      const dy = creature.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < range) {
        creature.takeDamage(30);
        if (creature.health <= 0) {
          this.onCreatureKilled(creature);
        }
      }
    });
  }

  private triggerEnergizer(duration: number) {
    this.player.activateEnergizer(duration);
  }
}

export function loadQuestProgress(): QuestProgressMap {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

export function saveQuestProgress(progress: QuestProgressMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn('Failed to save quest progress:', e);
  }
}
