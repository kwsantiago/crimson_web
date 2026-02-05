import Phaser from "phaser";
import { Player } from "../entities/Player";
import { Creature } from "../entities/Creature";
import { Projectile } from "../entities/Projectile";
import { Bonus } from "../entities/Bonus";
import { SpawnManager } from "../systems/SpawnManager";
import { BonusManager } from "../systems/BonusManager";
import { PerkSelector } from "../ui/PerkSelector";
import { HighScoreManager } from "../systems/HighScoreManager";
import { StatsManager } from "../systems/StatsManager";
import { SaveManager } from "../systems/SaveManager";
import { BitmapFont } from "../ui/BitmapFont";
import { SoundManager } from "../audio/SoundManager";
import { smallFontWidths } from "./BootScene";
import { GameMode, GAME_MODE_CONFIGS } from "../data/gameModes";
import { CreatureType, getCorpseFrame } from "../data/creatures";
import { PerkId } from "../data/perks";
import { ProjectileType, WEAPONS } from "../data/weapons";
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  getXpForLevel,
  UI,
} from "../config";

const WEAPON_ICON_INDICES: Record<number, number> = {
  0: 7, // Fire Bullets -> Flamethrower icon
  1: 0, // Pistol
  2: 1, // Assault Rifle
  3: 4, // Submachine Gun
  4: 3, // Sawed-off Shotgun
  5: 2, // Jackhammer (Shotgun icon)
  6: 7, // Flamethrower
  7: 8, // Plasma Rifle
  8: 9, // Multi Plasma
  9: 10, // Plasma Minigun
  10: 5, // Gauss Gun
  11: 11, // Rocket Launcher
  12: 14, // Plasma Shotgun
  13: 18, // Rocket Minigun
  14: 21, // Ion Rifle
  15: 22, // Ion Minigun
  16: 23, // Ion Cannon
  17: 31, // Ion Shotgun
  18: 30, // Gauss Shotgun
  19: 28, // Plasma Cannon
  20: 25, // Blade Gun
  21: 19, // Pulse Gun
  22: 24, // Shrinkifier 5000
  23: 29, // Splitter Gun
  24: 53, // Nuke Launcher (placeholder)
};

const WEAPON_AMMO_CLASS: Record<number, number> = {
  0: 1, // Fire Bullets -> Fire
  1: 0, // Pistol -> Bullet
  2: 0, // Assault Rifle -> Bullet
  3: 0, // Submachine Gun -> Bullet
  4: 0, // Sawed-off Shotgun -> Bullet
  5: 0, // Jackhammer -> Bullet
  6: 1, // Flamethrower -> Fire
  7: 3, // Plasma Rifle -> Electric
  8: 3, // Multi Plasma -> Electric
  9: 3, // Plasma Minigun -> Electric
  10: 0, // Gauss Gun -> Bullet
  11: 2, // Rocket Launcher -> Rocket
  12: 3, // Plasma Shotgun -> Electric
  13: 2, // Rocket Minigun -> Rocket
  14: 3, // Ion Rifle -> Electric
  15: 3, // Ion Minigun -> Electric
  16: 3, // Ion Cannon -> Electric
  17: 3, // Ion Shotgun -> Electric
  18: 0, // Gauss Shotgun -> Bullet
  19: 3, // Plasma Cannon -> Electric
  20: 0, // Blade Gun -> Bullet
  21: 3, // Pulse Gun -> Electric
  22: 3, // Shrinkifier 5000 -> Electric
  23: 3, // Splitter Gun -> Electric
  24: 2, // Nuke Launcher -> Rocket
};

interface GameSceneData {
  gameMode?: GameMode;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private creatures!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private bonuses!: Phaser.Physics.Arcade.Group;
  private spawnManager!: SpawnManager;
  private bonusManager!: BonusManager;
  private perkSelector!: PerkSelector;
  private highScoreManager!: HighScoreManager;
  private statsManager!: StatsManager;
  private saveManager!: SaveManager;
  private bloodDecals!: Phaser.GameObjects.Group;
  private healthBar!: Phaser.GameObjects.Graphics;
  private xpBar!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private killCount: number = 0;
  private killText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;
  private reloadText!: Phaser.GameObjects.Text;
  private perkPromptText!: Phaser.GameObjects.Text;
  private powerupIcons!: Phaser.GameObjects.Container;
  private gameOver: boolean = false;
  private hitSparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bloodEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private maxBloodDecals: number = 100;
  private pendingPerks: number = 0;
  private rightWasDown: boolean = false;
  private gameStartTime: number = 0;
  private explosionEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private gameMode: GameMode = GameMode.SURVIVAL;
  private modeIndicator!: Phaser.GameObjects.Text;
  private hudScale: number = 1;
  private crosshair!: Phaser.GameObjects.Image;
  private crosshairGlow!: Phaser.GameObjects.Image;
  private topBarSprite!: Phaser.GameObjects.Image;
  private heartSprite!: Phaser.GameObjects.Image;
  private healthBarBg!: Phaser.GameObjects.Image;
  private healthBarFill!: Phaser.GameObjects.Image;
  private weaponIcon!: Phaser.GameObjects.Image;
  private ammoIndicators: Phaser.GameObjects.Image[] = [];
  private xpPanelSprite!: Phaser.GameObjects.Image;
  private elapsedMs: number = 0;
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private menuCursor!: Phaser.GameObjects.Image;
  private isPaused: boolean = false;
  private pauseContainer!: Phaser.GameObjects.Container;
  private pauseSelectedIndex: number = 2; // Default to "BACK"
  private pauseArrowUp!: Phaser.Input.Keyboard.Key;
  private pauseArrowDown!: Phaser.Input.Keyboard.Key;
  private pauseEnterKey!: Phaser.Input.Keyboard.Key;
  private pauseButtonElements: Phaser.GameObjects.GameObject[] = [];
  private pauseClickHandled: boolean = false;
  private bitmapFont: BitmapFont | null = null;
  private soundManager!: SoundManager;
  private pyrokineticTimer: number = 0;
  private radioactiveTimer: number = 0;
  private plaguebearerTimer: number = 0;
  private hotTemperedTimer: number = 0;
  private evilEyesTimer: number = 0;
  private manBombTriggered: boolean = false;
  private manBombRespawnPending: boolean = false;
  private nameInputActive: boolean = false;
  private nameInputText: string = "";
  private nameInputRank: number = -1;
  private shotsFired: number = 0;
  private shotsHit: number = 0;
  private cameraShakePulses: number = 0;
  private cameraShakeTimer: number = 0;
  private cameraShakeOffsetX: number = 0;
  private cameraShakeOffsetY: number = 0;

  constructor() {
    super("GameScene");
  }

  init(data: GameSceneData) {
    this.gameMode = data.gameMode || GameMode.SURVIVAL;
  }

  create() {
    this.gameOver = false;
    this.killCount = 0;
    this.pendingPerks = 0;
    this.rightWasDown = false;
    this.gameStartTime = Date.now();
    this.nameInputActive = false;
    this.nameInputText = "";
    this.nameInputRank = -1;
    this.shotsFired = 0;
    this.shotsHit = 0;

    this.game.canvas.oncontextmenu = (e) => e.preventDefault();

    this.highScoreManager = new HighScoreManager();
    this.statsManager = new StatsManager();
    this.saveManager = new SaveManager();
    this.soundManager = new SoundManager(this);

    this.saveManager.incrementModePlayCount(this.gameMode);

    if (this.textures.exists("smallFont") && smallFontWidths) {
      this.bitmapFont = new BitmapFont(this, "smallFont", smallFontWidths);
    }

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.createBackground();
    this.createParticleSystems();

    this.bloodDecals = this.add.group();

    this.projectiles = this.physics.add.group({
      classType: Projectile,
      maxSize: 500,
      runChildUpdate: true,
    });

    this.enemyProjectiles = this.physics.add.group({
      maxSize: 100,
      runChildUpdate: true,
    });

    this.creatures = this.physics.add.group({
      classType: Creature,
      runChildUpdate: false,
    });

    this.bonuses = this.physics.add.group({
      classType: Bonus,
      runChildUpdate: false,
    });

    this.player = new Player(
      this,
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      this.projectiles,
    );

    this.player.perkManager.setCallbacks({
      onXpGain: (amount) => this.player.addXp(amount),
      onWeaponChange: (index) => this.player.weaponManager.switchWeapon(index),
      onHeal: (amount) => this.player.heal(amount),
      onFreezeEnemies: (duration) => this.freezeAllEnemies(duration),
      onKillHalfEnemies: () => this.killHalfEnemies(),
      onLoseHalfHealth: () => this.player.takeDamage(this.player.health / 2),
      onInstantDeath: () => this.player.takeDamage(9999),
      onAddPendingPerks: (count) => {
        this.pendingPerks += count;
      },
      onSetHealth: (health) => {
        this.player.health = health;
      },
      onReduceMaxHealth: (mult) => {
        this.player.maxHealth *= mult;
      },
      onGetXp: () => this.player.experience,
    });

    this.setupCamera();

    this.spawnManager = new SpawnManager(
      this,
      this.creatures,
      this.enemyProjectiles,
      this.gameMode,
    );
    this.bonusManager = new BonusManager(this, this.bonuses, this.player);
    this.bonusManager.setCallbacks({
      onNuke: () => this.nukeAllEnemies(),
      onFreeze: (duration) => this.freezeAllEnemies(duration),
      onShockChain: () => this.triggerShockChain(),
      onFireblast: () => this.triggerFireblast(),
      onEnergizer: (duration) => this.triggerEnergizer(duration),
    });

    this.player.setWeaponSoundCallbacks({
      onFire: (weaponIndex) => this.soundManager.playWeaponFire(weaponIndex),
      onReload: (weaponIndex) =>
        this.soundManager.playWeaponReload(weaponIndex),
    });

    this.perkSelector = new PerkSelector(
      this,
      this.player.perkManager,
      this.soundManager,
    );
    this.perkSelector.setCallback((perkId) => {
      this.pendingPerks--;
      if (this.pendingPerks > 0) {
        this.time.delayedCall(100, () => this.perkSelector.show());
      }
    });

    this.setupCollisions();
    this.createHUD();

    this.escapeKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
    );

    if (this.textures.exists("ui_cursor")) {
      this.menuCursor = this.add.image(0, 0, "ui_cursor");
      this.menuCursor.setScrollFactor(0);
      this.menuCursor.setDepth(600);
      this.menuCursor.setVisible(false);
    }

    this.createPauseMenu();
  }

  private setupCamera() {
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.scrollX = this.player.x - SCREEN_WIDTH / 2;
    cam.scrollY = this.player.y - SCREEN_HEIGHT / 2;
  }

  private updateCamera(dt: number) {
    const cam = this.cameras.main;

    if (this.player.health <= 0) {
      return;
    }

    const focusX = this.player.x;
    const focusY = this.player.y;
    const desiredX = focusX - SCREEN_WIDTH / 2;
    const desiredY = focusY - SCREEN_HEIGHT / 2;

    const minX = -1;
    const minY = -1;
    const maxX = WORLD_WIDTH - SCREEN_WIDTH;
    const maxY = WORLD_HEIGHT - SCREEN_HEIGHT;

    const clampedX = Math.max(minX, Math.min(maxX, desiredX));
    const clampedY = Math.max(minY, Math.min(maxY, desiredY));

    const t = Math.min(1, dt * 6);
    cam.scrollX = cam.scrollX + (clampedX - cam.scrollX) * t;
    cam.scrollY = cam.scrollY + (clampedY - cam.scrollY) * t;
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
      0.7,
    );
    this.pauseContainer.add(overlay);
  }

  private showPauseMenu() {
    this.isPaused = true;
    this.pauseSelectedIndex = 2;
    this.pauseContainer.setVisible(true);

    if (this.menuCursor) {
      this.menuCursor.setVisible(true);
    }
    if (this.crosshair) {
      this.crosshair.setVisible(false);
    }
    if (this.crosshairGlow) {
      this.crosshairGlow.setVisible(false);
    }
  }

  private hidePauseMenu() {
    this.isPaused = false;
    this.pauseContainer.setVisible(false);

    this.pauseButtonElements.forEach((el) => el.destroy());
    this.pauseButtonElements = [];

    if (this.menuCursor) {
      this.menuCursor.setVisible(false);
    }
    if (this.crosshair) {
      this.crosshair.setVisible(true);
    }
    if (this.crosshairGlow) {
      this.crosshairGlow.setVisible(true);
    }
  }

  private drawPauseMenuButtons() {
    const scale = Math.min(
      SCREEN_WIDTH / UI.BASE_WIDTH,
      SCREEN_HEIGHT / UI.BASE_HEIGHT,
    );
    const clampedScale = Math.max(0.75, Math.min(1.5, scale));
    const sx = (v: number) => v * clampedScale;

    const panelW = sx(280);
    const panelH = sx(220);
    const panelX = SCREEN_WIDTH / 2;
    const panelY = SCREEN_HEIGHT / 2;

    const panel = this.add.rectangle(
      panelX,
      panelY,
      panelW,
      panelH,
      0x1a1612,
      0.95,
    );
    panel.setStrokeStyle(2, 0x3d3830);
    panel.setScrollFactor(0);
    panel.setDepth(300);
    this.pauseButtonElements.push(panel);

    const title = this.add
      .text(panelX, panelY - sx(70), "PAUSED", {
        fontSize: `${Math.floor(20 * clampedScale)}px`,
        color: "#f0c850",
        fontFamily: "Arial Black",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(301);
    this.pauseButtonElements.push(title);

    const buttonX = panelX;
    const entries = [
      { label: "OPTIONS", y: panelY - sx(25), action: "options" },
      { label: "QUIT TO MENU", y: panelY + sx(15), action: "quit" },
      { label: "BACK", y: panelY + sx(55), action: "back" },
    ];

    const pointer = this.input.activePointer;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const btnW = sx(140);
      const btnH = sx(26);
      const bounds = {
        x: buttonX - btnW / 2,
        y: entry.y - btnH / 2,
        w: btnW,
        h: btnH,
      };

      const hovering =
        pointer.x >= bounds.x &&
        pointer.x <= bounds.x + bounds.w &&
        pointer.y >= bounds.y &&
        pointer.y <= bounds.y + bounds.h;

      if (hovering) {
        this.pauseSelectedIndex = i;
      }

      const isSelected = i === this.pauseSelectedIndex;
      const color = isSelected ? "#ffffff" : "#dcdcdc";
      const bgColor = isSelected ? 0x404070 : 0x222222;
      const borderColor = isSelected ? 0x8080b0 : 0x444444;

      const bg = this.add.rectangle(buttonX, entry.y, btnW, btnH, bgColor, 0.9);
      bg.setStrokeStyle(2, borderColor);
      bg.setScrollFactor(0);
      bg.setDepth(301);
      this.pauseButtonElements.push(bg);

      const text = this.add
        .text(buttonX, entry.y, entry.label, {
          fontSize: `${Math.floor(12 * clampedScale)}px`,
          color,
          fontFamily: "Arial Black",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(302);
      this.pauseButtonElements.push(text);

      if (hovering && pointer.isDown && !this.pauseClickHandled) {
        this.pauseClickHandled = true;
        this.handlePauseMenuAction(entry.action);
      }
    }
  }

  private handlePauseMenuAction(action: string) {
    switch (action) {
      case "options":
        break;
      case "quit":
        this.scene.start("MenuScene");
        break;
      case "back":
        this.hidePauseMenu();
        break;
    }
  }

  private updatePauseMenu() {
    if (!this.pauseArrowUp) {
      this.pauseArrowUp = this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.UP,
      );
      this.pauseArrowDown = this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.DOWN,
      );
      this.pauseEnterKey = this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.ENTER,
      );
    }

    if (Phaser.Input.Keyboard.JustDown(this.pauseArrowDown)) {
      this.pauseSelectedIndex = (this.pauseSelectedIndex + 1) % 3;
    }
    if (Phaser.Input.Keyboard.JustDown(this.pauseArrowUp)) {
      this.pauseSelectedIndex = (this.pauseSelectedIndex - 1 + 3) % 3;
    }
    if (Phaser.Input.Keyboard.JustDown(this.pauseEnterKey)) {
      const actions = ["options", "quit", "back"];
      this.handlePauseMenuAction(actions[this.pauseSelectedIndex]);
      return;
    }

    this.pauseButtonElements.forEach((el) => el.destroy());
    this.pauseButtonElements = [];

    this.drawPauseMenuButtons();

    const pointer = this.input.activePointer;
    if (!pointer.isDown) {
      this.pauseClickHandled = false;
    }
  }

  private setupCollisions() {
    this.physics.add.overlap(
      this.projectiles,
      this.creatures,
      this
        .onBulletHitCreature as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.creatures,
      this
        .onPlayerHitCreature as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.enemyProjectiles,
      this.player,
      this
        .onEnemyBulletHitPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.bonuses,
      this
        .onPlayerPickupBonus as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );
  }

  private createBackground() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x3f3819, 1);
    graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    graphics.setDepth(-11);

    const terrain = this.textures.get("terrain");
    if (terrain && terrain.key !== "__MISSING") {
      const terrainWidth = terrain.getSourceImage().width;
      const terrainHeight = terrain.getSourceImage().height;

      for (let x = 0; x < WORLD_WIDTH; x += terrainWidth) {
        for (let y = 0; y < WORLD_HEIGHT; y += terrainHeight) {
          const tile = this.add.image(x, y, "terrain");
          tile.setOrigin(0, 0);
          tile.setDepth(-10);
          tile.setTint(0xb2b2b2);
          tile.setAlpha(0.9);
        }
      }
    }
  }

  private createParticleSystems() {
    this.hitSparkEmitter = this.add.particles(0, 0, "hit_spark", {
      speed: { min: 50, max: 150 },
      scale: { start: 1, end: 0 },
      lifespan: 200,
      quantity: 5,
      emitting: false,
    });
    this.hitSparkEmitter.setDepth(15);

    const bloodTexture = this.textures.exists("particles_sheet")
      ? "particles_sheet"
      : "blood_particle";
    this.bloodEmitter = this.add.particles(0, 0, bloodTexture, {
      frame: bloodTexture === "particles_sheet" ? 5 : 0,
      speed: { min: 80, max: 140 },
      scale: { start: 0.5, end: 1.5 },
      lifespan: 250,
      quantity: 2,
      alpha: { start: 0.8, end: 0 },
      emitting: false,
    });
    this.bloodEmitter.setDepth(15);

    const explosionTexture = this.textures.exists("particles_sheet")
      ? "particles_sheet"
      : "explosion";
    this.explosionEmitter = this.add.particles(0, 0, explosionTexture, {
      frame: explosionTexture === "particles_sheet" ? 5 : 0,
      speed: { min: 20, max: 80 },
      scale: { start: 1, end: 3 },
      lifespan: 700,
      quantity: 3,
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      emitting: false,
    });
    this.explosionEmitter.setDepth(16);
  }

  private createHUD() {
    this.hudScale = Math.min(
      SCREEN_WIDTH / UI.HUD_BASE_WIDTH,
      SCREEN_HEIGHT / UI.HUD_BASE_HEIGHT,
    );
    this.hudScale = Math.max(0.75, Math.min(1.5, this.hudScale));

    const sx = (v: number) => v * this.hudScale;

    this.healthBar = this.add.graphics();
    this.healthBar.setScrollFactor(0);
    this.healthBar.setDepth(100);

    this.xpBar = this.add.graphics();
    this.xpBar.setScrollFactor(0);
    this.xpBar.setDepth(100);

    if (this.textures.exists("ui_gameTop")) {
      this.topBarSprite = this.add.image(0, 0, "ui_gameTop");
      this.topBarSprite.setOrigin(0, 0);
      this.topBarSprite.setScrollFactor(0);
      this.topBarSprite.setDepth(99);
      this.topBarSprite.setDisplaySize(
        sx(UI.HUD.TOP_BAR_SIZE.w),
        sx(UI.HUD.TOP_BAR_SIZE.h),
      );
      this.topBarSprite.setAlpha(UI.ALPHA.TOP_BAR);
    }

    if (this.textures.exists("ui_lifeHeart")) {
      this.heartSprite = this.add.image(
        sx(UI.HUD.HEART_CENTER.x),
        sx(UI.HUD.HEART_CENTER.y),
        "ui_lifeHeart",
      );
      this.heartSprite.setScrollFactor(0);
      this.heartSprite.setDepth(101);
      this.heartSprite.setAlpha(UI.ALPHA.ICON);
    }

    if (this.textures.exists("ui_indLife")) {
      this.healthBarBg = this.add.image(
        sx(UI.HUD.HEALTH_BAR_POS.x),
        sx(UI.HUD.HEALTH_BAR_POS.y),
        "ui_indLife",
      );
      this.healthBarBg.setOrigin(0, 0);
      this.healthBarBg.setScrollFactor(0);
      this.healthBarBg.setDepth(100);
      this.healthBarBg.setDisplaySize(
        sx(UI.HUD.HEALTH_BAR_SIZE.w),
        sx(UI.HUD.HEALTH_BAR_SIZE.h),
      );
      this.healthBarBg.setAlpha(UI.ALPHA.HEALTH_BG);

      this.healthBarFill = this.add.image(
        sx(UI.HUD.HEALTH_BAR_POS.x),
        sx(UI.HUD.HEALTH_BAR_POS.y),
        "ui_indLife",
      );
      this.healthBarFill.setOrigin(0, 0);
      this.healthBarFill.setScrollFactor(0);
      this.healthBarFill.setDepth(101);
      this.healthBarFill.setAlpha(UI.ALPHA.ICON);
    }

    if (this.textures.exists("ui_wicons")) {
      this.weaponIcon = this.add.image(
        sx(UI.HUD.WEAPON_ICON_POS.x),
        sx(UI.HUD.WEAPON_ICON_POS.y),
        "ui_wicons",
      );
      this.weaponIcon.setOrigin(0, 0);
      this.weaponIcon.setScrollFactor(0);
      this.weaponIcon.setDepth(101);
      this.weaponIcon.setDisplaySize(
        sx(UI.HUD.WEAPON_ICON_SIZE.w),
        sx(UI.HUD.WEAPON_ICON_SIZE.h),
      );
      this.weaponIcon.setAlpha(UI.ALPHA.ICON);
    }

    if (this.textures.exists("ui_indPanel")) {
      this.xpPanelSprite = this.add.image(
        sx(UI.HUD.SURV_PANEL_POS.x),
        sx(UI.HUD.SURV_PANEL_POS.y),
        "ui_indPanel",
      );
      this.xpPanelSprite.setOrigin(0, 0);
      this.xpPanelSprite.setScrollFactor(0);
      this.xpPanelSprite.setDepth(99);
      this.xpPanelSprite.setDisplaySize(
        sx(UI.HUD.SURV_PANEL_SIZE.w),
        sx(UI.HUD.SURV_PANEL_SIZE.h),
      );
      this.xpPanelSprite.setAlpha(UI.ALPHA.PANEL);
    }

    this.levelText = this.add
      .text(
        sx(UI.HUD.SURV_LVL_VALUE_POS.x),
        sx(UI.HUD.SURV_LVL_VALUE_POS.y),
        "1",
        {
          fontSize: `${Math.floor(14 * this.hudScale)}px`,
          color: "#dcdcdc",
          fontFamily: "Arial Black",
        },
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.killText = this.add
      .text(SCREEN_WIDTH - 16, 16, "Kills: 0", {
        fontSize: "14px",
        color: "#dcdcdc",
        fontFamily: "Arial",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    const modeConfig = GAME_MODE_CONFIGS[this.gameMode];
    const modeColor = this.gameMode === GameMode.RUSH ? "#f0c850" : "#46b4f0";
    this.modeIndicator = this.add
      .text(SCREEN_WIDTH - 16, 36, modeConfig.name.toUpperCase(), {
        fontSize: "11px",
        color: modeColor,
        fontFamily: "Arial Black",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.weaponText = this.add
      .text(SCREEN_WIDTH - 16, SCREEN_HEIGHT - 42, "Pistol", {
        fontSize: "13px",
        color: "#dcdcdc",
        fontFamily: "Arial",
      })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(100);

    this.ammoText = this.add
      .text(SCREEN_WIDTH - 16, SCREEN_HEIGHT - 24, "12 / 12", {
        fontSize: "16px",
        color: "#dcdcdc",
        fontFamily: "Arial Black",
      })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(100);

    this.reloadText = this.add
      .text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 50, "RELOADING", {
        fontSize: "18px",
        color: "#f0c850",
        fontFamily: "Arial Black",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    this.perkPromptText = this.add
      .text(SCREEN_WIDTH / 2, 60, "Press Mouse2 to pick a perk!", {
        fontSize: "16px",
        color: "#f0c850",
        fontFamily: "Arial Black",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    this.add
      .text(
        8,
        SCREEN_HEIGHT - 24,
        "WASD Move | Mouse2 Perks | Mouse3 Reload | ESC Menu",
        {
          fontSize: "10px",
          color: "#aaaab4",
          fontFamily: "Arial",
        },
      )
      .setScrollFactor(0)
      .setDepth(100);

    this.powerupIcons = this.add.container(8, sx(121));
    this.powerupIcons.setScrollFactor(0);
    this.powerupIcons.setDepth(100);

    if (this.textures.exists("particles_sheet")) {
      this.crosshairGlow = this.add.image(
        SCREEN_WIDTH / 2,
        SCREEN_HEIGHT / 2,
        "particles_sheet",
        13,
      );
      this.crosshairGlow.setScrollFactor(0);
      this.crosshairGlow.setDepth(499);
      this.crosshairGlow.setDisplaySize(64, 64);
      this.crosshairGlow.setBlendMode(Phaser.BlendModes.ADD);
    }

    if (this.textures.exists("ui_aim")) {
      this.crosshair = this.add.image(
        SCREEN_WIDTH / 2,
        SCREEN_HEIGHT / 2,
        "ui_aim",
      );
      this.crosshair.setScrollFactor(0);
      this.crosshair.setDepth(500);
      this.crosshair.setDisplaySize(20, 20);
    }

    this.input.setDefaultCursor("none");
  }

  private updateHUD() {
    const sx = (v: number) => v * this.hudScale;

    this.healthBar.clear();
    this.xpBar.clear();

    const healthRatio = Math.max(
      0,
      Math.min(1, this.player.health / this.player.maxHealth),
    );
    if (this.healthBarFill && this.textures.exists("ui_indLife")) {
      const tex = this.textures.get("ui_indLife");
      const fullWidth = sx(UI.HUD.HEALTH_BAR_SIZE.w);
      const fillWidth = fullWidth * healthRatio;
      this.healthBarFill.setDisplaySize(
        fillWidth,
        sx(UI.HUD.HEALTH_BAR_SIZE.h),
      );
      this.healthBarFill.setCrop(
        0,
        0,
        tex.getSourceImage().width * healthRatio,
        tex.getSourceImage().height,
      );
    }

    if (this.heartSprite) {
      const t = this.elapsedMs / 1000;
      const pulseSpeed = this.player.health < 30 ? 5.0 : 2.0;
      const pulse = Math.pow(Math.sin(t * pulseSpeed), 4) * 4 + 14;
      const size = pulse * 2 * this.hudScale;
      this.heartSprite.setDisplaySize(size, size);
      this.heartSprite.setPosition(
        sx(UI.HUD.HEART_CENTER.x),
        sx(UI.HUD.HEART_CENTER.y),
      );
    }

    if (this.weaponIcon && this.textures.exists("ui_wicons")) {
      const weaponIndex = this.player.weaponManager.currentWeaponIndex;
      const iconIndex = WEAPON_ICON_INDICES[weaponIndex] ?? 0;
      const tex = this.textures.get("ui_wicons");
      const texW = tex.getSourceImage().width;
      const texH = tex.getSourceImage().height;
      const cellW = texW / 8;
      const cellH = texH / 8;
      const frame = iconIndex * 2;
      const col = frame % 8;
      const row = Math.floor(frame / 8);
      this.weaponIcon.setCrop(col * cellW, row * cellH, cellW * 2, cellH);
    }

    this.updateAmmoIndicators();

    const xpNeeded = getXpForLevel(this.player.level);
    const xpRatio = Math.min(1, this.player.experience / xpNeeded);
    const xpBarX = sx(UI.HUD.SURV_PROGRESS_POS.x);
    const xpBarY = sx(UI.HUD.SURV_PROGRESS_POS.y);
    const xpBarWidth = sx(UI.HUD.SURV_PROGRESS_WIDTH);
    const xpBarH = 4 * this.hudScale;

    this.xpBar.fillStyle(0x0f2952, 0.6);
    this.xpBar.fillRect(xpBarX, xpBarY, xpBarWidth, xpBarH);
    this.xpBar.fillStyle(0x1a4d99, 1);
    this.xpBar.fillRect(
      xpBarX + this.hudScale,
      xpBarY + this.hudScale,
      Math.max(0, (xpBarWidth - 2 * this.hudScale) * xpRatio),
      xpBarH - 2 * this.hudScale,
    );

    this.levelText.setText(`${this.player.level}`);
    this.killText.setText(`Kills: ${this.killCount}`);

    const wm = this.player.weaponManager;
    this.weaponText.setText(wm.currentWeapon.name);
    this.ammoText.setText(`${wm.currentAmmo} / ${wm.clipSize}`);

    if (wm.isCurrentlyReloading) {
      this.reloadText.setVisible(true);
      this.ammoText.setColor("#f0c850");
    } else {
      this.reloadText.setVisible(false);
      this.ammoText.setColor("#dcdcdc");
    }

    if (this.pendingPerks > 0 && !this.perkSelector.isOpen()) {
      this.perkPromptText.setVisible(true);
      this.perkPromptText.setText(
        `Press Mouse2 to pick a perk (${this.pendingPerks})`,
      );
    } else {
      this.perkPromptText.setVisible(false);
    }

    const pointer = this.input.activePointer;
    if (this.crosshairGlow) {
      this.crosshairGlow.setPosition(pointer.x, pointer.y);
    }
    if (this.crosshair) {
      this.crosshair.setPosition(pointer.x, pointer.y);
    }

    this.updatePowerupIcons();
  }

  private updateAmmoIndicators() {
    const sx = (v: number) => v * this.hudScale;

    this.ammoIndicators.forEach((ind) => ind.destroy());
    this.ammoIndicators = [];

    const wm = this.player.weaponManager;
    const weaponIndex = wm.currentWeaponIndex;
    const ammoClass = WEAPON_AMMO_CLASS[weaponIndex] ?? 0;

    let texKey = "ui_indBullet";
    if (ammoClass === 1) texKey = "ui_indFire";
    else if (ammoClass === 2) texKey = "ui_indRocket";
    else if (ammoClass === 3) texKey = "ui_indElectric";

    if (!this.textures.exists(texKey)) return;

    const maxBars = 30;
    const clampBars = 20;
    let bars = Math.min(maxBars, wm.clipSize);
    if (bars > maxBars) bars = clampBars;

    const ammoCount = wm.currentAmmo;

    for (let i = 0; i < bars; i++) {
      const alpha = i < ammoCount ? UI.ALPHA.ICON : UI.ALPHA.AMMO_DIM;
      const ind = this.add.image(
        sx(UI.HUD.AMMO_BASE_POS.x + i * UI.HUD.AMMO_BAR_STEP),
        sx(UI.HUD.AMMO_BASE_POS.y),
        texKey,
      );
      ind.setOrigin(0, 0);
      ind.setScrollFactor(0);
      ind.setDepth(101);
      ind.setDisplaySize(
        sx(UI.HUD.AMMO_BAR_SIZE.w),
        sx(UI.HUD.AMMO_BAR_SIZE.h),
      );
      ind.setAlpha(alpha);
      this.ammoIndicators.push(ind);
    }
  }

  private updatePowerupIcons() {
    this.powerupIcons.removeAll(true);

    let y = 0;
    const spacing = UI.HUD.BONUS_SPACING;

    const drawBonusSlot = (
      icon: Phaser.GameObjects.Sprite,
      label: string,
      timer: number,
      barColor: number,
    ) => {
      const panelOffsetY = UI.HUD.BONUS_PANEL_OFFSET_Y;
      const panel = this.add.graphics();
      panel.fillStyle(0x1a1612, 0.7);
      panel.fillRoundedRect(-4, y + panelOffsetY, 140, 48, 4);
      panel.lineStyle(1, 0x3d3830, 0.5);
      panel.strokeRoundedRect(-4, y + panelOffsetY, 140, 48, 4);
      this.powerupIcons.add(panel);

      icon.setDisplaySize(UI.HUD.BONUS_ICON_SIZE, UI.HUD.BONUS_ICON_SIZE);
      this.powerupIcons.add(icon);

      const textOffset = UI.HUD.BONUS_TEXT_OFFSET;
      const labelText = this.add
        .text(textOffset.x, y + textOffset.y - 10, label, {
          fontSize: "11px",
          color: "#dcdcdc",
          fontFamily: "Arial",
        })
        .setOrigin(0, 0.5);
      this.powerupIcons.add(labelText);

      const barBg = this.add.graphics();
      barBg.fillStyle(UI.COLORS.XP_BAR_BG, 0.5);
      barBg.fillRect(textOffset.x, y + 11, 100, 6);
      this.powerupIcons.add(barBg);

      const barFill = this.add.graphics();
      const ratio = Math.min(1, timer / 20);
      barFill.fillStyle(barColor, 0.8);
      barFill.fillRect(textOffset.x, y + 11, 100 * ratio, 6);
      this.powerupIcons.add(barFill);
    };

    if (this.player.hasActiveShield()) {
      const icon = this.add.sprite(14, y, "bonus_shield");
      drawBonusSlot(icon, "Shield", this.player.shieldTimer, 0x00aaff);
      y += spacing;
    }

    if (this.player.hasActiveSpeed()) {
      const icon = this.add.sprite(14, y, "bonus_speed");
      drawBonusSlot(icon, "Speed", this.player.speedBoostTimer, 0x00ff44);
      y += spacing;
    }

    if (this.player.hasActiveReflex()) {
      const icon = this.add.sprite(14, y, "bonus_reflex");
      drawBonusSlot(icon, "Reflex", this.player.reflexBoostTimer, 0xff00ff);
      y += spacing;
    }

    if (this.player.hasActiveDoubleXp()) {
      const icon = this.add.sprite(14, y, "bonus_double_xp");
      drawBonusSlot(icon, "2x XP", this.player.doubleXpTimer, 0xffdd00);
      y += spacing;
    }

    if (this.player.hasActiveWeaponPowerUp()) {
      const icon = this.add.sprite(14, y, "bonus_power_up");
      drawBonusSlot(icon, "Power Up", this.player.weaponPowerUpTimer, 0xff6600);
      y += spacing;
    }

    if (this.player.hasActiveFireBullets()) {
      const icon = this.add.sprite(14, y, "bonus_fire_bullets");
      drawBonusSlot(icon, "Fire Ammo", this.player.fireBulletsTimer, 0xff4400);
      y += spacing;
    }

    if (this.player.hasActiveEnergizer()) {
      const icon = this.add.sprite(14, y, "bonus_energizer");
      drawBonusSlot(icon, "Energizer", this.player.energizerTimer, 0xffff00);
      y += spacing;
    }
  }

  update(_time: number, delta: number) {
    const pointer = this.input.activePointer;

    if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      if (this.gameOver) {
        this.scene.start("MenuScene");
        return;
      }
      if (this.perkSelector.isOpen()) {
        this.perkSelector.hide();
        this.pendingPerks = 0;
        return;
      }
      if (this.isPaused) {
        this.hidePauseMenu();
        return;
      }
      this.showPauseMenu();
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

    if (this.gameOver) {
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

    if (this.isPaused) {
      this.physics.pause();
      this.updatePauseMenu();
      return;
    }

    this.elapsedMs += delta;
    this.soundManager.update();

    if (this.perkSelector.isOpen()) {
      this.physics.pause();
      this.perkSelector.update();
      if (this.menuCursor) {
        this.menuCursor.setVisible(true);
        this.menuCursor.setPosition(pointer.x, pointer.y);
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

    if (
      this.pendingPerks > 0 &&
      rightJustPressed &&
      !pointer.leftButtonDown()
    ) {
      this.perkSelector.show();
      return;
    }
    const leveledUp = this.player.update(delta, pointer);

    if (leveledUp) {
      this.showLevelUpEffect();
      this.pendingPerks++;
    }

    if (this.player.health <= 0) {
      if (this.player.perkManager.hasFinalRevenge()) {
        this.triggerFinalRevenge();
      }

      if (this.player.perkManager.useManBomb() && !this.manBombTriggered) {
        this.manBombTriggered = true;
        this.triggerManBombExplosion();
        return;
      }

      if (this.manBombRespawnPending) {
        this.manBombRespawnPending = false;
        return;
      }

      this.handleGameOver();
      return;
    }

    const reflexPerkScale = this.player.perkManager.hasReflexBoosted()
      ? 0.9
      : 1.0;
    let reflexBonusScale = 1.0;
    if (this.player.hasActiveReflex()) {
      const timer = this.player.reflexBoostTimer;
      reflexBonusScale = timer < 1.0 ? (1.0 - timer) * 0.7 + 0.3 : 0.3;
    }
    const enemyTimeScale = reflexPerkScale * reflexBonusScale;

    this.creatures.getChildren().forEach((creature) => {
      const c = creature as Creature;
      if (c.active) {
        c.update(delta * enemyTimeScale, this.player);
        const spawnType = c.tickSpawnSlot((delta * enemyTimeScale) / 1000);
        if (spawnType) {
          this.spawnManager.spawnChildCreature(c.x, c.y, spawnType);
        }
        this.processCreatureContactDamage(c, delta / 1000);
      }
    });

    this.bonusManager.update(delta);
    this.updateEnemyProjectiles(delta, enemyTimeScale);
    this.spawnManager.update(delta, this.player.level);
    this.updatePerkEffects(delta / 1000);
    this.updateCamera(delta / 1000);
    this.updateCameraShake(delta / 1000);
    this.updateHUD();
  }

  private startCameraShake(pulses: number, timer: number) {
    this.cameraShakePulses = pulses;
    this.cameraShakeTimer = timer;
  }

  private updateCameraShake(dt: number) {
    if (this.cameraShakeTimer <= 0) {
      this.cameraShakeOffsetX = 0;
      this.cameraShakeOffsetY = 0;
      return;
    }

    this.cameraShakeTimer -= dt * 3.0;
    if (this.cameraShakeTimer >= 0) {
      return;
    }

    this.cameraShakePulses--;
    if (this.cameraShakePulses < 1) {
      this.cameraShakeTimer = 0;
      this.cameraShakeOffsetX = 0;
      this.cameraShakeOffsetY = 0;
      return;
    }

    const timeScaleActive = this.player.reflexBoostTimer > 0;
    this.cameraShakeTimer = timeScaleActive ? 0.06 : 0.1;

    const maxAmp = this.cameraShakePulses * 3;
    if (maxAmp <= 0) {
      this.cameraShakeOffsetX = 0;
      this.cameraShakeOffsetY = 0;
      this.cameraShakeTimer = 0;
      this.cameraShakePulses = 0;
      return;
    }

    const rand = () => Math.floor(Math.random() * 0x7fffffff);
    let magX = (rand() % maxAmp) + (rand() % 10);
    if ((rand() & 1) === 0) magX = -magX;
    this.cameraShakeOffsetX = magX;

    let magY = (rand() % maxAmp) + (rand() % 10);
    if ((rand() & 1) === 0) magY = -magY;
    this.cameraShakeOffsetY = magY;

    const cam = this.cameras.main;
    cam.scrollX += this.cameraShakeOffsetX;
    cam.scrollY += this.cameraShakeOffsetY;
  }

  private updatePerkEffects(dt: number) {
    const pm = this.player.perkManager;

    if (pm.hasPyrokinetic()) {
      this.pyrokineticTimer += dt;
      if (this.pyrokineticTimer >= 0.5) {
        this.pyrokineticTimer = 0;
        const aimWorld = this.cameras.main.getWorldPoint(
          this.input.activePointer.x,
          this.input.activePointer.y,
        );
        this.creatures.getChildren().forEach((c) => {
          const creature = c as Creature;
          if (!creature.active || creature.health <= 0) return;
          const dx = creature.x - aimWorld.x;
          const dy = creature.y - aimWorld.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < pm.getPyrokineticRadius() * 4) {
            this.spawnFireEffect(creature.x, creature.y);
          }
        });
      }
    }

    if (pm.hasRadioactive()) {
      this.radioactiveTimer += dt;
      if (this.radioactiveTimer >= 0.5) {
        this.radioactiveTimer = 0;
        this.creatures.getChildren().forEach((c) => {
          const creature = c as Creature;
          if (!creature.active || creature.health <= 0) return;
          const dx = creature.x - this.player.x;
          const dy = creature.y - this.player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < pm.getRadioactiveRadius()) {
            const damage = pm.getRadioactiveDamage(dist);
            const killed = creature.takeDamage(damage);
            if (killed) this.onCreatureKilled(creature);
          }
        });
      }
    }

    if (pm.hasPlaguebearer()) {
      this.plaguebearerTimer += dt;
      if (this.plaguebearerTimer >= 0.5) {
        this.plaguebearerTimer = 0;
        this.creatures.getChildren().forEach((c) => {
          const creature = c as Creature;
          if (!creature.active || creature.health <= 0) return;
          const dx = creature.x - this.player.x;
          const dy = creature.y - this.player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (
            dist < pm.getPlaguebearerInfectionRadius() &&
            creature.health < pm.getPlaguebearerMaxInfectionHealth()
          ) {
            creature.applyPlague(pm.getPlaguebearerDamagePerTick());
          }
        });
      }
    }

    if (pm.hasHotTempered()) {
      this.hotTemperedTimer += dt;
      if (this.hotTemperedTimer >= 5.0) {
        this.hotTemperedTimer = 0;
        this.spawnHotTemperedRing();
      }
    }

    if (this.player.consumeFireCough()) {
      this.spawnFireCoughProjectile();
    }

    if (pm.hasEvilEyes()) {
      const aimWorld = this.cameras.main.getWorldPoint(
        this.input.activePointer.x,
        this.input.activePointer.y,
      );
      this.creatures.getChildren().forEach((c) => {
        const creature = c as Creature;
        if (!creature.active || creature.health <= 0) return;
        const dx = creature.x - aimWorld.x;
        const dy = creature.y - aimWorld.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < pm.getEvilEyesRadius() * 4) {
          creature.freeze(0.1);
        }
      });
    }

    if (pm.hasTelekinetic()) {
      const aimWorld = this.cameras.main.getWorldPoint(
        this.input.activePointer.x,
        this.input.activePointer.y,
      );
      this.bonuses.getChildren().forEach((b) => {
        const bonus = b as Bonus;
        if (!bonus.active) return;
        const dx = bonus.x - aimWorld.x;
        const dy = bonus.y - aimWorld.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) {
          const moveSpeed = 200 * dt;
          const dirX = this.player.x - bonus.x;
          const dirY = this.player.y - bonus.y;
          const dirDist = Math.sqrt(dirX * dirX + dirY * dirY);
          if (dirDist > 0) {
            bonus.x += (dirX / dirDist) * moveSpeed;
            bonus.y += (dirY / dirDist) * moveSpeed;
          }
        }
      });
    }
  }

  private spawnFireEffect(x: number, y: number) {
    const gfx = this.add.graphics();
    gfx.fillStyle(0xff6600, 0.6);
    gfx.fillCircle(x, y, 8);
    gfx.setDepth(15);
    this.tweens.add({
      targets: gfx,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 300,
      onComplete: () => gfx.destroy(),
    });
  }

  private spawnHotTemperedRing() {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const proj = this.projectiles.get(
        this.player.x,
        this.player.y,
        "bullet",
      ) as Projectile;
      if (proj) {
        const type = i % 2 === 0 ? ProjectileType.FLAME : ProjectileType.PLASMA;
        proj.fire(this.player.x, this.player.y, angle, 300, 15, type);
      }
    }
  }

  private spawnFireCoughProjectile() {
    const angle = this.player.getAimAngle();
    for (let i = 0; i < 3; i++) {
      const spread = (i - 1) * 0.3;
      const proj = this.projectiles.get(
        this.player.x,
        this.player.y,
        "bullet",
      ) as Projectile;
      if (proj) {
        proj.fire(
          this.player.x,
          this.player.y,
          angle + spread,
          400,
          20,
          ProjectileType.FLAME,
        );
      }
    }
  }

  private updateEnemyProjectiles(delta: number, timeScale: number) {
    this.enemyProjectiles.getChildren().forEach((proj) => {
      const p = proj as Phaser.Physics.Arcade.Sprite;
      if (p.active) {
        const body = p.body as Phaser.Physics.Arcade.Body;
        if (body) {
          const data = p.getData("baseVelocity") as
            | { x: number; y: number }
            | undefined;
          if (!data) {
            p.setData("baseVelocity", {
              x: body.velocity.x,
              y: body.velocity.y,
            });
          } else {
            body.setVelocity(data.x * timeScale, data.y * timeScale);
          }
        }
        if (p.x < 0 || p.x > WORLD_WIDTH || p.y < 0 || p.y > WORLD_HEIGHT) {
          p.setActive(false);
          p.setVisible(false);
          if (body) body.enable = false;
        }
      }
    });
  }

  private onBulletHitCreature(
    bullet: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    creature: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ) {
    const proj = bullet as Projectile;
    const enemy = creature as Creature;

    if (!proj.active || !enemy.active) return;

    this.soundManager.triggerGameTune();

    const hitAngle = proj.rotation;
    this.hitSparkEmitter.emitParticleAt(proj.x, proj.y);
    this.soundManager.playBulletHit(proj.projectileType);

    if (proj.isExplosive) {
      this.createExplosion(proj.x, proj.y, proj.explosionRadius, proj.damage);
      proj.destroy();
      return;
    }

    const applyPoison = proj.isPoisoned;
    const damage = proj.damage;
    const killed = enemy.takeDamage(damage, applyPoison);

    if (proj.projectileType === ProjectileType.ION) {
      this.trySpawnIonChain(enemy.x, enemy.y, damage, enemy);
    }

    if (!proj.penetrating) {
      proj.destroy();
    }

    if (killed) {
      if (this.player.perkManager.hasRegressionBullets()) {
        this.player.weaponManager.refundAmmo(1);
      }
      this.onCreatureKilled(enemy, hitAngle);
    } else {
      this.spawnDirectionalBlood(enemy.x, enemy.y, hitAngle, 3);
    }
  }

  private trySpawnIonChain(
    x: number,
    y: number,
    damage: number,
    hitCreature: Creature,
  ) {
    const maxDist = 100;
    let nearestCreature: Creature | null = null;
    let nearestDist = maxDist * maxDist;

    this.creatures.getChildren().forEach((c) => {
      const creature = c as Creature;
      if (!creature.active || creature === hitCreature || creature.health <= 0)
        return;

      const dx = creature.x - x;
      const dy = creature.y - y;
      const distSq = dx * dx + dy * dy;

      if (distSq < nearestDist) {
        nearestDist = distSq;
        nearestCreature = creature;
      }
    });

    if (nearestCreature !== null) {
      const target = nearestCreature as Creature;
      const angle = Math.atan2(target.y - y, target.x - x);
      const chainBullet = this.projectiles.get(x, y, "bullet") as Projectile;
      if (chainBullet) {
        chainBullet.fire(x, y, angle, 600, damage * 0.7, ProjectileType.ION);
      }
    }
  }

  private createExplosion(
    x: number,
    y: number,
    radius: number,
    damage: number,
  ) {
    const size = radius > 100 ? "large" : radius > 60 ? "medium" : "small";
    this.soundManager.playExplosion(size);

    const scale = radius / 80;
    this.spawnExplosionBurst(x, y, scale);
    const shakePulses = Math.max(5, Math.floor(radius / 10));
    this.startCameraShake(shakePulses, 0.15);
    this.cameras.main.flash(100, 255, 200, 100, false);

    this.creatures.getChildren().forEach((creature) => {
      const c = creature as Creature;
      if (!c.active) return;

      const dx = c.x - x;
      const dy = c.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        const falloff = 1 - dist / radius;
        const explosionDamage = damage * falloff;
        const killed = c.takeDamage(explosionDamage);

        if (killed) {
          this.onCreatureKilled(c);
        }
      }
    });
  }

  private onCreatureKilled(enemy: Creature, hitAngle?: number) {
    this.soundManager.playCreatureDeath(enemy.creatureType);

    const xpMultiplier = this.spawnManager.getXpMultiplier();
    this.player.addXp(Math.floor(enemy.xpValue * xpMultiplier));
    this.killCount++;

    this.statsManager.recordKill(enemy.creatureType);

    const bloodyMess = this.player.perkManager.hasBloodyMess();
    const angle =
      hitAngle ?? Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
    this.spawnDirectionalBlood(enemy.x, enemy.y, angle, bloodyMess ? 18 : 4);
    this.spawnBloodDecal(enemy.x, enemy.y, bloodyMess, angle);
    this.spawnCorpse(enemy.x, enemy.y, enemy.creatureType);

    if (enemy.spawnsOnDeath && enemy.spawnCount > 0) {
      this.spawnManager.spawnBabySpiders(enemy.x, enemy.y, enemy.spawnCount);
    }

    if (enemy.shouldSplitOnDeath()) {
      const children = enemy.getSplitChildren();
      this.spawnManager.spawnSplitChildren(
        enemy.x,
        enemy.y,
        children,
        enemy.creatureType,
        enemy.customTint,
      );
    }

    this.bonusManager.trySpawnBonus(enemy.x, enemy.y);
    this.spawnXpOrb(enemy.x, enemy.y);
  }

  private onPlayerHitCreature(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    creature: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ) {
    const p = player as Player;
    const enemy = creature as Creature;

    if (!enemy.active || p.health <= 0) return;

    if (p.hasActiveEnergizer() && enemy.isFleeing()) {
      this.onCreatureKilled(enemy);
      enemy.takeDamage(9999);
      this.cameras.main.flash(50, 255, 255, 0, false);
      return;
    }

    enemy.setInContactThisFrame(true);

    if (!p.perkManager.hasUnstoppable()) {
      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        p.x += (dx / dist) * 5;
        p.y += (dy / dist) * 5;
      }
    }
  }

  private processCreatureContactDamage(creature: Creature, dt: number) {
    if (!creature.active || creature.health <= 0) return;
    if (this.player.health <= 0) return;
    if (this.player.hasActiveEnergizer()) return;

    const shouldDamage = creature.tickContactDamage(
      dt,
      creature.wasInContactThisFrame(),
    );
    creature.setInContactThisFrame(false);

    if (shouldDamage && this.player.shieldTimer <= 0) {
      this.player.takeDamage(creature.getContactDamage());

      if (this.player.perkManager.hasToxicAvenger()) {
        creature.applyContactPoison(true);
      } else if (this.player.perkManager.hasVeinsOfPoison()) {
        creature.applyContactPoison(false);
      }

      const meleeDamage = this.player.perkManager.getMrMeleeDamage();
      if (meleeDamage > 0) {
        const killed = creature.takeDamage(meleeDamage);
        if (killed) {
          this.onCreatureKilled(creature);
        }
      }

      this.soundManager.playPlayerHurt();
      this.startCameraShake(3, 0.1);
      this.cameras.main.flash(50, 255, 0, 0, false);
    }
  }

  private onEnemyBulletHitPlayer(
    proj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ) {
    const bullet = proj as Phaser.Physics.Arcade.Sprite & {
      damage: number;
      isEnemyProjectile?: boolean;
    };
    const p = player as Player;

    if (!bullet.active || !bullet.isEnemyProjectile) return;

    this.soundManager.playPlayerHurt();
    p.takeDamage(bullet.damage || 8);
    this.hitSparkEmitter.emitParticleAt(bullet.x, bullet.y);
    this.startCameraShake(3, 0.1);
    this.cameras.main.flash(50, 255, 0, 0, false);

    bullet.setActive(false);
    bullet.setVisible(false);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    if (body) body.enable = false;
  }

  private onPlayerPickupBonus(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    bonus: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ) {
    const b = bonus as Bonus;
    if (!b.active) return;

    this.soundManager.playPickupPowerup();
    this.bonusManager.collectBonus(b);
    this.cameras.main.flash(100, 100, 255, 100, false);
  }

  private spawnDirectionalBlood(
    x: number,
    y: number,
    angle: number,
    quantity: number,
  ) {
    const baseAngle = angle + Math.PI;
    const lifetime = 0.25;
    const callCount = Math.ceil(quantity / 2);

    const spawnBloodParticle = (particleAngle: number) => {
      const dirX = Math.cos(particleAngle);
      const dirY = Math.sin(particleAngle);
      for (let i = 0; i < 2; i++) {
        const r0 = Math.floor(Math.random() * 256);
        const rotation = ((r0 & 0x3f) - 0x20) * 0.1 + particleAngle;
        const r1 = Math.floor(Math.random() * 256);
        const halfSize = (r1 & 7) + 1;
        const r2 = Math.floor(Math.random() * 256);
        const velX = ((r2 & 0x3f) + 100) * dirX;
        const r3 = Math.floor(Math.random() * 256);
        const velY = ((r3 & 0x3f) + 100) * dirY;
        const r4 = Math.floor(Math.random() * 256);
        const scaleStep = (r4 & 0x7f) * 0.03 + 0.1;

        if (this.textures.exists("particles_sheet")) {
          const particle = this.add.image(x, y, "particles_sheet", 5);
          particle.setDepth(14);
          particle.setRotation(rotation);
          particle.setScale(halfSize / 32);
          particle.setAlpha(0.5);

          this.tweens.add({
            targets: particle,
            x: x + velX * lifetime,
            y: y + velY * lifetime,
            scaleX: particle.scaleX + scaleStep * lifetime,
            scaleY: particle.scaleY + scaleStep * lifetime,
            alpha: 0,
            duration: 250,
            ease: "Linear",
            onComplete: () => particle.destroy(),
          });
        } else {
          const particle = this.add.circle(x, y, halfSize, 0xbb0000);
          particle.setDepth(14);

          this.tweens.add({
            targets: particle,
            x: x + velX * lifetime,
            y: y + velY * lifetime,
            alpha: 0,
            scaleX: 1 + scaleStep * lifetime,
            scaleY: 1 + scaleStep * lifetime,
            duration: 250,
            ease: "Linear",
            onComplete: () => particle.destroy(),
          });
        }
      }
    };

    for (let call = 0; call < callCount; call++) {
      spawnBloodParticle(baseAngle);
      if ((Math.floor(Math.random() * 8) & 7) === 2) {
        spawnBloodParticle(baseAngle + Math.PI);
      }
    }
  }

  private spawnBloodDecal(
    x: number,
    y: number,
    extraBlood: boolean = false,
    angle?: number,
  ) {
    while (this.bloodDecals.getLength() >= this.maxBloodDecals) {
      const oldest = this.bloodDecals.getFirst(
        true,
      ) as Phaser.GameObjects.Sprite;
      if (oldest) oldest.destroy();
    }

    const decalCount = extraBlood ? 3 : 1;
    for (let i = 0; i < decalCount; i++) {
      let offsetX = i === 0 ? 0 : (Math.random() - 0.5) * 30;
      let offsetY = i === 0 ? 0 : (Math.random() - 0.5) * 30;

      if (angle !== undefined && i === 0) {
        offsetX = Math.cos(angle) * 15;
        offsetY = Math.sin(angle) * 15;
      }

      const decal = this.add.sprite(x + offsetX, y + offsetY, "blood_decal");
      decal.setDepth(1);
      decal.setRotation(angle ?? Math.random() * Math.PI * 2);
      decal.setScale(0.5 + Math.random() * 0.5);
      decal.setAlpha(0.8);
      this.bloodDecals.add(decal);

      this.tweens.add({
        targets: decal,
        alpha: 0,
        duration: 10000,
        delay: 5000,
        onComplete: () => decal.destroy(),
      });
    }
  }

  private spawnExplosionBurst(x: number, y: number, scale: number) {
    const shockwaveRing = this.add.graphics();
    shockwaveRing.setDepth(16);
    shockwaveRing.fillStyle(0x999999, 1.0);
    shockwaveRing.fillCircle(0, 0, 32);
    shockwaveRing.setPosition(x, y);

    this.tweens.add({
      targets: shockwaveRing,
      scaleX: 1 + scale * 25 * 0.35,
      scaleY: 1 + scale * 25 * 0.35,
      alpha: 0,
      duration: 350,
      delay: 100,
      ease: "Linear",
      onComplete: () => shockwaveRing.destroy(),
    });

    const brightFlash = this.add.graphics();
    brightFlash.setDepth(17);
    brightFlash.fillStyle(0xffffff, 1.0);
    brightFlash.fillCircle(0, 0, 32);
    brightFlash.setPosition(x, y);

    this.tweens.add({
      targets: brightFlash,
      scaleX: 1 + scale * 45 * 0.3,
      scaleY: 1 + scale * 45 * 0.3,
      alpha: 0,
      duration: 300,
      ease: "Linear",
      onComplete: () => brightFlash.destroy(),
    });

    for (let i = 0; i < 2; i++) {
      const darkPuff = this.add.graphics();
      darkPuff.setDepth(14);
      darkPuff.fillStyle(0x1a1a1a, 1.0);
      darkPuff.fillCircle(0, 0, 32);
      darkPuff.setPosition(x, y);

      const age = i * 0.2 - 0.5;
      const lifetime = i * 0.2 + 0.6;
      const rotation = Math.floor(Math.random() * 0x266) * 0.02;

      this.tweens.add({
        targets: darkPuff,
        scaleX: 1 + scale * 5 * lifetime,
        scaleY: 1 + scale * 5 * lifetime,
        rotation: rotation + 1.4 * lifetime,
        alpha: 0,
        duration: lifetime * 1000,
        delay: Math.max(0, -age * 1000),
        ease: "Linear",
        onComplete: () => darkPuff.destroy(),
      });
    }

    const puffCount = 3;
    for (let i = 0; i < puffCount; i++) {
      const rotation = Math.floor(Math.random() * 0x13a) * 0.02;
      const velX = (Math.floor(Math.random() * 64) & 0x3f) * 2 - 0x40;
      const velY = (Math.floor(Math.random() * 64) & 0x3f) * 2 - 0x40;
      const scaleStep = ((Math.floor(Math.random() * 256) - 3) & 7) * scale;
      const rotStep = (Math.floor(Math.random() * 256) + 3) & 7;

      if (this.textures.exists("particles_sheet")) {
        const puff = this.add.image(x, y, "particles_sheet", 5);
        puff.setDepth(15);
        puff.setRotation(rotation);
        puff.setAlpha(1.0);

        this.tweens.add({
          targets: puff,
          x: x + velX * 0.7,
          y: y + velY * 0.7,
          scaleX: 1 + scaleStep * 0.7,
          scaleY: 1 + scaleStep * 0.7,
          rotation: rotation + rotStep * 0.7,
          alpha: 0,
          duration: 700,
          ease: "Linear",
          onComplete: () => puff.destroy(),
        });
      }
    }
  }

  private spawnCorpse(x: number, y: number, creatureType: CreatureType) {
    const frame = getCorpseFrame(creatureType);
    let sizeScale = 1.0;

    switch (creatureType) {
      case CreatureType.BIG_ZOMBIE:
      case CreatureType.BOSS:
        sizeScale = 1.5;
        break;
      case CreatureType.ALIEN_BOSS:
      case CreatureType.SPIDER_MOTHER:
        sizeScale = 1.8;
        break;
      case CreatureType.BABY_SPIDER:
        sizeScale = 0.5;
        break;
      case CreatureType.SPIDER:
        sizeScale = 0.7;
        break;
    }

    if (this.textures.exists("bodyset_sheet")) {
      const corpse = this.add.sprite(x, y, "bodyset_sheet", frame);
      corpse.setDepth(2);
      corpse.setRotation(Math.random() * Math.PI * 2);
      corpse.setAlpha(0.7);
      corpse.setScale(sizeScale * (0.8 + Math.random() * 0.4));
      corpse.setTint(0xaa6666);

      this.bloodDecals.add(corpse);

      this.tweens.add({
        targets: corpse,
        alpha: 0,
        duration: 8000,
        delay: 4000,
        onComplete: () => corpse.destroy(),
      });
    } else {
      const corpse = this.add.sprite(x, y, "corpse");
      corpse.setDepth(2);
      corpse.setRotation(Math.random() * Math.PI * 2);
      corpse.setAlpha(0.7);
      corpse.setScale(sizeScale * (0.8 + Math.random() * 0.4));

      this.bloodDecals.add(corpse);

      this.tweens.add({
        targets: corpse,
        alpha: 0,
        duration: 8000,
        delay: 4000,
        onComplete: () => corpse.destroy(),
      });
    }
  }

  private spawnXpOrb(x: number, y: number) {
    const orb = this.add.sprite(x, y, "xp_orb");
    orb.setDepth(5);

    this.tweens.add({
      targets: orb,
      x: this.player.x,
      y: this.player.y,
      duration: 300,
      ease: "Quad.easeIn",
      onComplete: () => {
        orb.destroy();
      },
    });
  }

  private showLevelUpEffect() {
    this.soundManager.playUiLevelUp();

    const text = this.add
      .text(this.player.x, this.player.y - 40, "LEVEL UP!", {
        fontSize: "24px",
        color: "#ffd93d",
        fontFamily: "Arial Black",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: this.player.y - 80,
      alpha: 0,
      duration: 1000,
      ease: "Quad.easeOut",
      onComplete: () => text.destroy(),
    });

    this.cameras.main.flash(100, 255, 217, 61, false);
    this.cameras.main.shake(100, 0.01);
  }

  private freezeAllEnemies(duration: number) {
    this.soundManager.playFreeze();

    this.creatures.getChildren().forEach((creature) => {
      const c = creature as Creature;
      if (c.active) {
        c.freeze(duration);
      }
    });

    this.cameras.main.flash(200, 100, 200, 255, false);
    this.cameras.main.shake(100, 0.005);
  }

  private killHalfEnemies() {
    const activeCreatures = this.creatures
      .getChildren()
      .filter((c) => (c as Creature).active);
    const halfCount = Math.floor(activeCreatures.length / 2);

    for (let i = 0; i < halfCount; i++) {
      const c = activeCreatures[i] as Creature;
      this.onCreatureKilled(c);
      c.takeDamage(9999);
    }

    this.cameras.main.shake(200, 0.02);
    this.cameras.main.flash(200, 255, 255, 100, false);
  }

  private nukeAllEnemies() {
    this.soundManager.playNuke();
    this.startCameraShake(0x14, 0.2);
    this.cameras.main.flash(300, 255, 255, 200, false);
    this.spawnExplosionBurst(this.player.x, this.player.y, 1.0);

    const bloodyMess = this.player.perkManager.hasBloodyMess();
    const xpMultiplier = this.spawnManager.getXpMultiplier();
    this.creatures.getChildren().forEach((creature) => {
      const c = creature as Creature;
      if (c.active) {
        this.player.addXp(Math.floor(c.xpValue * xpMultiplier));
        this.killCount++;
        const angle = Math.random() * Math.PI * 2;
        this.spawnDirectionalBlood(c.x, c.y, angle, bloodyMess ? 18 : 4);
        this.spawnBloodDecal(c.x, c.y, bloodyMess, angle);
        this.spawnCorpse(c.x, c.y, c.creatureType);
        c.takeDamage(9999);
      }
    });
  }

  private triggerShockChain() {
    this.cameras.main.flash(200, 100, 150, 255, false);
    this.cameras.main.shake(150, 0.01);

    const activeCreatures = this.creatures
      .getChildren()
      .filter((c) => (c as Creature).active)
      .map((c) => c as Creature);

    if (activeCreatures.length === 0) return;

    let currentTarget = activeCreatures.reduce((nearest, c) => {
      const distA = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        nearest.x,
        nearest.y,
      );
      const distB = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        c.x,
        c.y,
      );
      return distB < distA ? c : nearest;
    }, activeCreatures[0]);

    const chainedTargets = new Set<Creature>();
    const maxChainLinks = 15;
    const chainDamage = 50;
    const maxChainDist = 150;

    let prevX = this.player.x;
    let prevY = this.player.y;

    for (let i = 0; i < maxChainLinks && currentTarget; i++) {
      chainedTargets.add(currentTarget);

      this.drawLightningBolt(prevX, prevY, currentTarget.x, currentTarget.y);

      const killed = currentTarget.takeDamage(chainDamage);
      if (killed) {
        this.onCreatureKilled(currentTarget);
      }

      prevX = currentTarget.x;
      prevY = currentTarget.y;

      let nextTarget: Creature | null = null;
      let nearestDist = maxChainDist;

      for (const c of activeCreatures) {
        if (chainedTargets.has(c) || !c.active || c.health <= 0) continue;
        const dist = Phaser.Math.Distance.Between(prevX, prevY, c.x, c.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nextTarget = c;
        }
      }

      currentTarget = nextTarget!;
    }
  }

  private drawLightningBolt(x1: number, y1: number, x2: number, y2: number) {
    const graphics = this.add.graphics();
    graphics.setDepth(20);

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const segments = Math.max(3, Math.floor(dist / 20));

    graphics.lineStyle(3, 0x8888ff, 1);
    graphics.beginPath();
    graphics.moveTo(x1, y1);

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const px = x1 + dx * t + (Math.random() - 0.5) * 20;
      const py = y1 + dy * t + (Math.random() - 0.5) * 20;
      graphics.lineTo(px, py);
    }

    graphics.lineTo(x2, y2);
    graphics.strokePath();

    graphics.lineStyle(1, 0xffffff, 0.8);
    graphics.beginPath();
    graphics.moveTo(x1, y1);

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const px = x1 + dx * t + (Math.random() - 0.5) * 10;
      const py = y1 + dy * t + (Math.random() - 0.5) * 10;
      graphics.lineTo(px, py);
    }

    graphics.lineTo(x2, y2);
    graphics.strokePath();

    this.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 200,
      onComplete: () => graphics.destroy(),
    });
  }

  private triggerFireblast() {
    this.cameras.main.flash(200, 255, 150, 50, false);
    this.cameras.main.shake(200, 0.02);

    const fireballCount = 16;
    const damage = 40;
    const speed = 300;

    for (let i = 0; i < fireballCount; i++) {
      const angle = (i / fireballCount) * Math.PI * 2;
      const fireball = this.projectiles.get(
        this.player.x,
        this.player.y,
        "bullet",
      ) as Projectile;
      if (fireball) {
        fireball.fire(
          this.player.x,
          this.player.y,
          angle,
          speed,
          damage,
          ProjectileType.FLAME,
        );
      }
    }

    this.spawnExplosionBurst(this.player.x, this.player.y, 0.5);
  }

  private triggerEnergizer(duration: number) {
    this.cameras.main.flash(200, 255, 255, 100, false);

    this.creatures.getChildren().forEach((creature) => {
      const c = creature as Creature;
      if (c.active) {
        c.flee(duration);
      }
    });
  }

  private triggerManBombExplosion() {
    this.cameras.main.flash(400, 255, 200, 100, false);
    this.cameras.main.shake(400, 0.05);

    const explosionRadius = 200;
    const explosionDamage = 500;

    this.spawnExplosionBurst(this.player.x, this.player.y, 2.5);

    this.creatures.getChildren().forEach((creature) => {
      const c = creature as Creature;
      if (!c.active) return;

      const dx = c.x - this.player.x;
      const dy = c.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < explosionRadius) {
        const falloff = 1 - dist / explosionRadius;
        const damage = explosionDamage * falloff;
        const killed = c.takeDamage(damage);
        if (killed) {
          this.onCreatureKilled(c);
        }
      }
    });

    this.time.delayedCall(1000, () => {
      this.player.respawn(0.5);
      this.manBombRespawnPending = true;
    });
  }

  private triggerFinalRevenge() {
    this.cameras.main.flash(500, 255, 100, 50, false);
    this.cameras.main.shake(500, 0.06);

    const explosionRadius = 300;
    const explosionDamage = 1000;

    this.spawnExplosionBurst(this.player.x, this.player.y, 3.5);

    this.creatures.getChildren().forEach((creature) => {
      const c = creature as Creature;
      if (!c.active) return;

      const dx = c.x - this.player.x;
      const dy = c.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < explosionRadius) {
        const falloff = 1 - dist / explosionRadius;
        const damage = explosionDamage * falloff;
        const killed = c.takeDamage(damage);
        if (killed) {
          this.onCreatureKilled(c);
        }
      }
    });
  }

  private handleGameOver() {
    this.gameOver = true;

    const timePlayed = Math.floor(this.elapsedMs);
    const defaultName = this.saveManager.getPlayerName();
    const accuracy = this.statsManager.getAccuracy();
    const weaponId = this.player.weaponManager.currentWeaponIndex;

    const { rank, isHighScore } = this.highScoreManager.addScore(
      this.killCount,
      this.player.level,
      timePlayed,
      this.gameMode,
      defaultName,
      accuracy,
      weaponId,
      this.player.experience,
    );

    this.statsManager.recordGameEnd(timePlayed, this.player.level);
    this.nameInputRank = isHighScore ? rank : -1;
    this.nameInputText = defaultName;

    const scale = Math.min(
      SCREEN_WIDTH / UI.BASE_WIDTH,
      SCREEN_HEIGHT / UI.BASE_HEIGHT,
    );
    const clampedScale = Math.max(0.75, Math.min(1.5, scale));
    const sx = (v: number) => v * clampedScale;

    const widescreenShiftY = (SCREEN_WIDTH / 640) * 150 - 150;
    const panelW = UI.GAME_OVER.PANEL_W * clampedScale;
    const panelH = UI.GAME_OVER.PANEL_H * clampedScale;
    const panelX =
      (UI.GAME_OVER.PANEL_X + UI.GAME_OVER.PANEL_OFFSET_X) * clampedScale;
    const panelY =
      (UI.GAME_OVER.PANEL_Y + UI.GAME_OVER.PANEL_OFFSET_Y + widescreenShiftY) *
      clampedScale;

    this.add
      .rectangle(
        SCREEN_WIDTH / 2,
        SCREEN_HEIGHT / 2,
        SCREEN_WIDTH,
        SCREEN_HEIGHT,
        0x000000,
        0.5,
      )
      .setScrollFactor(0)
      .setDepth(200);

    if (this.textures.exists("ui_menuPanel")) {
      const panel = this.add.image(panelX, panelY, "ui_menuPanel");
      panel.setOrigin(0, 0);
      panel.setDisplaySize(panelW, panelH);
      panel.setScrollFactor(0);
      panel.setDepth(200);
    } else {
      const panelGraphics = this.add.graphics();
      panelGraphics.setScrollFactor(0);
      panelGraphics.setDepth(200);
      panelGraphics.fillStyle(0x1a1612, UI.ALPHA.PANEL);
      panelGraphics.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
      panelGraphics.lineStyle(2, 0x3d3830, 0.8);
      panelGraphics.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);
    }

    const bannerX = panelX + (panelW - sx(UI.GAME_OVER.BANNER_W)) * 0.5;
    const bannerY = panelY + sx(40);

    if (this.textures.exists("ui_textReaper")) {
      const reaper = this.add.image(bannerX, bannerY, "ui_textReaper");
      reaper.setOrigin(0, 0);
      reaper.setDisplaySize(
        sx(UI.GAME_OVER.BANNER_W),
        sx(UI.GAME_OVER.BANNER_H),
      );
      reaper.setScrollFactor(0);
      reaper.setDepth(201);
    } else {
      this.add
        .text(bannerX + sx(128), bannerY + sx(32), "THE REAPER", {
          fontSize: `${Math.floor(28 * clampedScale)}px`,
          color: "#cc3333",
          fontFamily: "Arial Black",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(201);
    }

    const scoreCardX = bannerX + sx(30);
    const scoreCardY = bannerY + sx(80);

    const scoreText =
      this.gameMode === GameMode.RUSH
        ? `${(timePlayed / 1000).toFixed(2)} secs`
        : `${this.player.experience}`;

    this.add
      .text(scoreCardX + sx(32), scoreCardY, "Score", {
        fontSize: `${Math.floor(13 * clampedScale)}px`,
        color: "#e6e6e6",
        fontFamily: "Arial",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(201);

    this.add
      .text(scoreCardX + sx(32), scoreCardY + sx(15), scoreText, {
        fontSize: `${Math.floor(16 * clampedScale)}px`,
        color: "#e6e6ff",
        fontFamily: "Arial Black",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(201);

    this.add
      .text(
        scoreCardX + sx(32),
        scoreCardY + sx(30),
        `Rank: ${this.getOrdinal(rank + 1)}`,
        {
          fontSize: `${Math.floor(12 * clampedScale)}px`,
          color: isHighScore ? "#f0c850" : "#e6e6e6",
          fontFamily: "Arial",
        },
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(201);

    const sepX = scoreCardX + sx(80);
    const lineGraphics = this.add.graphics();
    lineGraphics.setScrollFactor(0);
    lineGraphics.setDepth(201);
    lineGraphics.lineStyle(1, 0xe6e6e6, 0.5);
    lineGraphics.lineBetween(sepX, scoreCardY, sepX, scoreCardY + sx(48));

    const col2X = scoreCardX + sx(96);
    this.add
      .text(col2X + sx(6), scoreCardY, "Game time", {
        fontSize: `${Math.floor(13 * clampedScale)}px`,
        color: "#e6e6e6",
        fontFamily: "Arial",
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(201);

    if (this.textures.exists("ui_clockTable")) {
      const clock = this.add.image(
        col2X + sx(8),
        scoreCardY + sx(14),
        "ui_clockTable",
      );
      clock.setOrigin(0, 0);
      clock.setDisplaySize(sx(32), sx(32));
      clock.setScrollFactor(0);
      clock.setDepth(201);
    }

    if (this.textures.exists("ui_clockPointer")) {
      const seconds = Math.floor(timePlayed / 1000);
      const rotation = seconds * 6 * (Math.PI / 180);
      const pointer = this.add.image(
        col2X + sx(24),
        scoreCardY + sx(30),
        "ui_clockPointer",
      );
      pointer.setDisplaySize(sx(32), sx(32));
      pointer.setScrollFactor(0);
      pointer.setDepth(202);
      pointer.setRotation(rotation);
    }

    const timeText = this.highScoreManager.formatTime(timePlayed);
    this.add
      .text(col2X + sx(40), scoreCardY + sx(19), timeText, {
        fontSize: `${Math.floor(13 * clampedScale)}px`,
        color: "#e6e6e6",
        fontFamily: "Arial",
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(201);

    const row2Y = scoreCardY + sx(52);

    if (this.weaponIcon && this.textures.exists("ui_wicons")) {
      const weaponIndex = this.player.weaponManager.currentWeaponIndex;
      const iconIndex = WEAPON_ICON_INDICES[weaponIndex] ?? 0;
      const tex = this.textures.get("ui_wicons");
      const texW = tex.getSourceImage().width;
      const texH = tex.getSourceImage().height;
      const cellW = texW / 8;
      const cellH = texH / 8;
      const frame = iconIndex * 2;
      const col = frame % 8;
      const row = Math.floor(frame / 8);

      const wicon = this.add.image(scoreCardX, row2Y, "ui_wicons");
      wicon.setOrigin(0, 0);
      wicon.setDisplaySize(sx(64), sx(32));
      wicon.setCrop(col * cellW, row * cellH, cellW * 2, cellH);
      wicon.setScrollFactor(0);
      wicon.setDepth(201);
    }

    this.add
      .text(scoreCardX + sx(110), row2Y + sx(1), `Frags: ${this.killCount}`, {
        fontSize: `${Math.floor(13 * clampedScale)}px`,
        color: "#e6e6e6",
        fontFamily: "Arial",
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(201);

    this.add
      .text(
        scoreCardX + sx(110),
        row2Y + sx(15),
        `Level: ${this.player.level}`,
        {
          fontSize: `${Math.floor(13 * clampedScale)}px`,
          color: "#e6e6e6",
          fontFamily: "Arial",
        },
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(201);

    let buttonY = scoreCardY + sx(100);
    const buttonX = bannerX + sx(52);

    if (isHighScore && rank < 10) {
      this.add
        .text(buttonX + sx(75), buttonY - sx(8), "NEW HIGH SCORE!", {
          fontSize: `${Math.floor(14 * clampedScale)}px`,
          color: "#f0c850",
          fontFamily: "Arial Black",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(201);

      this.add
        .text(buttonX + sx(75), buttonY + sx(12), "Enter your name:", {
          fontSize: `${Math.floor(11 * clampedScale)}px`,
          color: "#e6e6e6",
          fontFamily: "Arial",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(201);

      const inputW = sx(UI.GAME_OVER.INPUT_BOX_W);
      const inputH = sx(UI.GAME_OVER.INPUT_BOX_H);

      const inputBg = this.add.rectangle(
        buttonX + sx(75),
        buttonY + sx(32),
        inputW,
        inputH,
        0x1a1a1a,
        0.9,
      );
      inputBg.setStrokeStyle(2, 0x46b4f0);
      inputBg.setScrollFactor(0);
      inputBg.setDepth(201);

      const inputText = this.add
        .text(
          buttonX + sx(75),
          buttonY + sx(32),
          this.nameInputText || "Player",
          {
            fontSize: `${Math.floor(12 * clampedScale)}px`,
            color: "#ffffff",
            fontFamily: "Arial",
          },
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(202);

      this.nameInputActive = true;
      this.input.keyboard!.on("keydown", (event: KeyboardEvent) => {
        if (!this.nameInputActive) return;

        if (event.key === "Backspace") {
          this.nameInputText = this.nameInputText.slice(0, -1);
        } else if (event.key === "Enter") {
          this.submitHighScoreName();
        } else if (event.key.length === 1 && this.nameInputText.length < 20) {
          this.nameInputText += event.key;
        }

        inputText.setText(this.nameInputText || "Player");
      });

      buttonY += sx(50);
    }

    const playAgainBtn = this.createGameOverButton(
      buttonX + sx(75),
      buttonY,
      "Play Again",
      () => {
        this.submitHighScoreName();
        this.scene.start("GameScene", { gameMode: this.gameMode });
      },
    );
    playAgainBtn.setScrollFactor(0);
    playAgainBtn.setDepth(201);

    const highScoresBtn = this.createGameOverButton(
      buttonX + sx(75),
      buttonY + sx(32),
      "High Scores",
      () => {
        this.submitHighScoreName();
        this.scene.start("MenuScene", {
          initialState: "scores",
          scoresMode: this.gameMode,
        });
      },
    );
    highScoresBtn.setScrollFactor(0);
    highScoresBtn.setDepth(201);

    const menuBtn = this.createGameOverButton(
      buttonX + sx(75),
      buttonY + sx(64),
      "Main Menu",
      () => {
        this.submitHighScoreName();
        this.scene.start("MenuScene");
      },
    );
    menuBtn.setScrollFactor(0);
    menuBtn.setDepth(201);
  }

  private submitHighScoreName() {
    if (this.nameInputActive && this.nameInputRank >= 0) {
      const name = this.nameInputText.trim() || "Player";
      this.highScoreManager.updateEntryName(
        this.gameMode,
        this.nameInputRank,
        name,
      );
      this.saveManager.setPlayerName(name);
      this.nameInputActive = false;
    }
  }

  private createGameOverButton(
    x: number,
    y: number,
    label: string,
    callback: () => void,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const scale = Math.min(
      SCREEN_WIDTH / UI.BASE_WIDTH,
      SCREEN_HEIGHT / UI.BASE_HEIGHT,
    );
    const clampedScale = Math.max(0.75, Math.min(1.5, scale));
    const btnW = 145 * clampedScale;
    const btnH = 32 * clampedScale;

    let bg: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
    if (this.textures.exists("ui_button_145x32")) {
      bg = this.add.image(0, 0, "ui_button_145x32");
      bg.setDisplaySize(btnW, btnH);
      bg.setInteractive({ useHandCursor: true });
    } else {
      const rect = this.add.rectangle(0, 0, btnW, btnH, 0x222222, 0.9);
      rect.setStrokeStyle(2, 0x444444);
      rect.setInteractive({ useHandCursor: true });
      bg = rect;
    }

    const text = this.add
      .text(0, 0, label, {
        fontSize: `${Math.floor(13 * clampedScale)}px`,
        color: "#dcdcdc",
        fontFamily: "Arial Black",
      })
      .setOrigin(0.5);

    bg.on("pointerover", () => {
      text.setColor("#ffffff");
      if (bg instanceof Phaser.GameObjects.Rectangle) {
        bg.setFillStyle(0x404070, 0.9);
        bg.setStrokeStyle(2, 0x8080b0);
      } else {
        bg.setTint(0x8080ff);
      }
    });

    bg.on("pointerout", () => {
      text.setColor("#dcdcdc");
      if (bg instanceof Phaser.GameObjects.Rectangle) {
        bg.setFillStyle(0x222222, 0.9);
        bg.setStrokeStyle(2, 0x444444);
      } else {
        bg.clearTint();
      }
    });

    bg.on("pointerdown", callback);

    container.add([bg, text]);
    return container;
  }

  private getOrdinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
}
