import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Creature, CreatureConfig, clearCreaturePool } from '../entities/Creature';
import { HighScoreManager } from '../systems/HighScoreManager';
import { SoundManager } from '../audio/SoundManager';
import { GameMode, GAME_MODE_CONFIGS } from '../data/gameModes';
import { CreatureType } from '../data/creatures';
import { TintRGBA, tintToHex } from '../systems/CreatureAI';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  UI
} from '../config';

const TYPING_MAX_CHARS = 17;

const NAME_PARTS = [
  'lamb', 'gun', 'head', 'tail', 'leg', 'nose', 'road', 'stab', 'high', 'low',
  'hat', 'pie', 'hand', 'jack', 'cube', 'ice', 'cow', 'king', 'lord', 'mate',
  'mary', 'dick', 'bill', 'cat', 'harry', 'tom', 'fly', 'call', 'shot', 'gate',
  'quick', 'brown', 'fox', 'jumper', 'over', 'lazy', 'dog', 'zeta', 'unique',
  'nerd', 'earl', 'sleep', 'onyx', 'mill', 'blue', 'below', 'scape', 'reap',
  'damo', 'break', 'boom', 'the'
];

interface TypoCreature {
  creature: Creature;
  word: string;
}

export class TypoScene extends Phaser.Scene {
  private player!: Player;
  private creatures!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private typoCreatures: TypoCreature[] = [];
  private typingText: string = '';
  private highScoreManager!: HighScoreManager;
  private soundManager!: SoundManager;
  private gameOver: boolean = false;
  private elapsedMs: number = 0;
  private spawnCooldownMs: number = 0;
  private killCount: number = 0;
  private crosshair!: Phaser.GameObjects.Image;
  private menuCursor!: Phaser.GameObjects.Image;
  private typingBoxGraphics!: Phaser.GameObjects.Graphics;
  private typingTextDisplay!: Phaser.GameObjects.Text;
  private cursorPulseTime: number = 0;
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private healthBar!: Phaser.GameObjects.Graphics;
  private topBarSprite!: Phaser.GameObjects.Image;
  private heartSprite!: Phaser.GameObjects.Image;
  private healthBarBg!: Phaser.GameObjects.Image;
  private healthBarFill!: Phaser.GameObjects.Image;
  private bloodEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bloodDecals!: Phaser.GameObjects.Group;
  private gameOverContainer!: Phaser.GameObjects.Container;
  private isPaused: boolean = false;
  private pauseContainer!: Phaser.GameObjects.Container;
  private shotsFired: number = 0;
  private shotsHit: number = 0;

  constructor() {
    super('TypoScene');
  }

  create() {
    this.gameOver = false;
    this.killCount = 0;
    this.elapsedMs = 0;
    this.spawnCooldownMs = 0;
    this.typingText = '';
    this.typoCreatures = [];
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.isPaused = false;

    this.game.canvas.oncontextmenu = (e) => e.preventDefault();

    this.highScoreManager = new HighScoreManager();
    this.soundManager = new SoundManager(this);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    clearCreaturePool();

    this.createBackground();
    this.createParticleSystems();

    this.bloodDecals = this.add.group();

    this.projectiles = this.physics.add.group({
      maxSize: 50,
      runChildUpdate: true
    });

    this.creatures = this.physics.add.group({
      classType: Creature,
      runChildUpdate: false
    });

    this.player = new Player(
      this,
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      this.projectiles
    );

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.physics.add.overlap(
      this.player,
      this.creatures,
      this.onPlayerHitCreature as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    this.createHUD();
    this.createTypingBox();
    this.createPauseMenu();
    this.createGameOverUI();

    this.escapeKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.input.keyboard!.on('keydown', this.handleKeyDown, this);

    if (this.textures.exists('crosshair')) {
      this.crosshair = this.add.image(0, 0, 'crosshair');
      this.crosshair.setScrollFactor(0);
      this.crosshair.setDepth(500);
    }

    if (this.textures.exists('ui_cursor')) {
      this.menuCursor = this.add.image(0, 0, 'ui_cursor');
      this.menuCursor.setScrollFactor(0);
      this.menuCursor.setDepth(600);
      this.menuCursor.setVisible(false);
    }

    this.input.setDefaultCursor('none');
  }

  private createBackground() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x3f3819, 1);
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
          tile.setTint(0xb2b2b2);
          tile.setAlpha(0.9);
        }
      }
    }
  }

  private createParticleSystems() {
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

  private createHUD() {
    const scale = Math.min(SCREEN_WIDTH / UI.HUD_BASE_WIDTH, SCREEN_HEIGHT / UI.HUD_BASE_HEIGHT);
    const clampedScale = Math.max(0.75, Math.min(1.5, scale));

    if (this.textures.exists('ui_topbar')) {
      this.topBarSprite = this.add.image(0, 0, 'ui_topbar');
      this.topBarSprite.setOrigin(0, 0);
      this.topBarSprite.setScrollFactor(0);
      this.topBarSprite.setDepth(100);
      this.topBarSprite.setAlpha(UI.ALPHA.TOP_BAR);
    }

    if (this.textures.exists('ui_heart')) {
      this.heartSprite = this.add.image(
        UI.HUD.HEART_CENTER.x * clampedScale,
        UI.HUD.HEART_CENTER.y * clampedScale,
        'ui_heart'
      );
      this.heartSprite.setScrollFactor(0);
      this.heartSprite.setDepth(101);
      this.heartSprite.setScale(clampedScale);
    }

    if (this.textures.exists('ui_hpbar_bg')) {
      this.healthBarBg = this.add.image(
        UI.HUD.HEALTH_BAR_POS.x * clampedScale,
        UI.HUD.HEALTH_BAR_POS.y * clampedScale,
        'ui_hpbar_bg'
      );
      this.healthBarBg.setOrigin(0, 0);
      this.healthBarBg.setScrollFactor(0);
      this.healthBarBg.setDepth(101);
      this.healthBarBg.setScale(clampedScale);
    }

    if (this.textures.exists('ui_hpbar_fill')) {
      this.healthBarFill = this.add.image(
        UI.HUD.HEALTH_BAR_POS.x * clampedScale,
        UI.HUD.HEALTH_BAR_POS.y * clampedScale,
        'ui_hpbar_fill'
      );
      this.healthBarFill.setOrigin(0, 0);
      this.healthBarFill.setScrollFactor(0);
      this.healthBarFill.setDepth(102);
      this.healthBarFill.setScale(clampedScale);
    }

    this.healthBar = this.add.graphics();
    this.healthBar.setScrollFactor(0);
    this.healthBar.setDepth(103);
  }

  private createTypingBox() {
    const boxX = 0;
    const boxY = SCREEN_HEIGHT - 60;
    const boxW = 200;
    const boxH = 50;

    this.typingBoxGraphics = this.add.graphics();
    this.typingBoxGraphics.setScrollFactor(0);
    this.typingBoxGraphics.setDepth(200);

    this.typingBoxGraphics.fillStyle(0x000000, 0.7);
    this.typingBoxGraphics.fillRect(boxX, boxY, boxW, boxH);
    this.typingBoxGraphics.lineStyle(2, 0x3d3830);
    this.typingBoxGraphics.strokeRect(boxX, boxY, boxW, boxH);

    this.typingTextDisplay = this.add.text(boxX + 10, boxY + 15, '>', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'monospace'
    });
    this.typingTextDisplay.setScrollFactor(0);
    this.typingTextDisplay.setDepth(201);
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

    const title = this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 60, 'PAUSED', {
      fontSize: '32px',
      color: '#f0c850',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    this.pauseContainer.add(title);

    const resumeBtn = this.createButton(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 'RESUME', () => {
      this.isPaused = false;
      this.pauseContainer.setVisible(false);
      if (this.crosshair) this.crosshair.setVisible(true);
      if (this.menuCursor) this.menuCursor.setVisible(false);
    });
    this.pauseContainer.add(resumeBtn);

    const quitBtn = this.createButton(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 50, 'QUIT TO MENU', () => {
      this.scene.start('MenuScene');
    });
    this.pauseContainer.add(quitBtn);
  }

  private createGameOverUI() {
    this.gameOverContainer = this.add.container(0, 0);
    this.gameOverContainer.setScrollFactor(0);
    this.gameOverContainer.setDepth(400);
    this.gameOverContainer.setVisible(false);
  }

  private showGameOver() {
    this.gameOver = true;
    this.gameOverContainer.removeAll(true);

    const overlay = this.add.rectangle(
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT / 2,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
      0x000000,
      0.8
    );
    this.gameOverContainer.add(overlay);

    const panelW = 400;
    const panelH = 320;
    const panelX = SCREEN_WIDTH / 2;
    const panelY = SCREEN_HEIGHT / 2;

    const panel = this.add.rectangle(panelX, panelY, panelW, panelH, 0x1a1612, 0.95);
    panel.setStrokeStyle(2, 0x3d3830);
    this.gameOverContainer.add(panel);

    const title = this.add.text(panelX, panelY - 120, 'GAME OVER', {
      fontSize: '32px',
      color: '#cc3333',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    this.gameOverContainer.add(title);

    const { rank, isHighScore } = this.highScoreManager.addScore(
      this.killCount,
      this.player.level,
      this.elapsedMs,
      GameMode.TYPO
    );

    const timeStr = this.highScoreManager.formatTime(this.elapsedMs);
    const accuracy = this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0;

    const stats = [
      `Time: ${timeStr}`,
      `Kills: ${this.killCount}`,
      `Words Typed: ${this.shotsFired}`,
      `Accuracy: ${accuracy}%`
    ];

    stats.forEach((stat, i) => {
      const text = this.add.text(panelX, panelY - 60 + i * 30, stat, {
        fontSize: '18px',
        color: '#dcdcdc',
        fontFamily: 'Arial'
      }).setOrigin(0.5);
      this.gameOverContainer.add(text);
    });

    if (isHighScore) {
      const hsText = this.add.text(panelX, panelY + 70, `New High Score! Rank #${rank}`, {
        fontSize: '20px',
        color: '#f0c850',
        fontFamily: 'Arial Black'
      }).setOrigin(0.5);
      this.gameOverContainer.add(hsText);
    }

    const backBtn = this.createButton(panelX, panelY + 120, 'BACK TO MENU', () => {
      this.scene.start('MenuScene');
    });
    this.gameOverContainer.add(backBtn);

    this.gameOverContainer.setVisible(true);
    if (this.crosshair) this.crosshair.setVisible(false);
    if (this.menuCursor) this.menuCursor.setVisible(true);
  }

  private createButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const btnW = 180;
    const btnH = 36;

    const bg = this.add.rectangle(0, 0, btnW, btnH, 0x222222, 0.9);
    bg.setStrokeStyle(2, 0x444444);
    bg.setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, label, {
      fontSize: '14px',
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

  private handleKeyDown(event: KeyboardEvent) {
    if (this.gameOver || this.isPaused) return;

    if (event.key === 'Escape' || event.key === 'Tab') {
      this.isPaused = true;
      this.pauseContainer.setVisible(true);
      if (this.crosshair) this.crosshair.setVisible(false);
      if (this.menuCursor) this.menuCursor.setVisible(true);
      return;
    }

    if (event.key === 'Backspace') {
      if (this.typingText.length > 0) {
        this.typingText = this.typingText.slice(0, -1);
        this.soundManager.playUiTypeClick();
      }
      return;
    }

    if (event.key === 'Enter') {
      this.submitWord();
      return;
    }

    if (event.key.length === 1 && this.typingText.length < TYPING_MAX_CHARS) {
      const char = event.key.toLowerCase();
      if (/[a-z]/.test(char)) {
        this.typingText += char;
        this.soundManager.playUiTypeClick();
      }
    }
  }

  private submitWord() {
    if (!this.typingText) return;

    this.shotsFired++;
    const enteredWord = this.typingText;
    this.typingText = '';
    this.soundManager.playUiTypeEnter();

    const target = this.typoCreatures.find(tc =>
      tc.creature.active && tc.word === enteredWord
    );

    if (target) {
      this.shotsHit++;
      this.killCreature(target);
    }
  }

  private killCreature(typoCreature: TypoCreature) {
    const creature = typoCreature.creature;

    this.bloodEmitter.emitParticleAt(creature.x, creature.y, 8);

    creature.health = 0;
    creature.setActive(false);
    creature.setVisible(false);
    creature.destroy();

    this.killCount++;
    this.player.addXp(creature.xpValue);

    const idx = this.typoCreatures.indexOf(typoCreature);
    if (idx >= 0) {
      this.typoCreatures.splice(idx, 1);
    }
  }

  private onPlayerHitCreature(
    playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    creatureObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    if (this.gameOver) return;

    const creature = creatureObj as Creature;
    if (!creature.active) return;

    if (creature.canAttack()) {
      const damageDealt = creature.attack(this.player);
      if (damageDealt) {
        this.cameras.main.shake(100, 0.01);
      }
    }

    if (this.player.health <= 0) {
      this.showGameOver();
    }
  }

  private generateWord(scoreXp: number): string {
    const rand = () => Math.floor(Math.random() * 0x7FFFFFFF);

    const pickPart = (allowThe: boolean): string => {
      const mod = allowThe ? 52 : 51;
      const idx = rand() % mod;
      return NAME_PARTS[idx] || 'nerd';
    };

    if (scoreXp > 120) {
      if (rand() % 100 < 80) {
        return pickPart(true) + pickPart(false) + pickPart(false) + pickPart(false);
      }
    }

    if ((scoreXp > 80 && rand() % 100 < 80) || (scoreXp > 60 && rand() % 100 < 40)) {
      return pickPart(true) + pickPart(false) + pickPart(false);
    }

    if ((scoreXp > 40 && rand() % 100 < 80) || (scoreXp > 20 && rand() % 100 < 40)) {
      return pickPart(true) + pickPart(false);
    }

    return pickPart(false);
  }

  private isWordUnique(word: string): boolean {
    return !this.typoCreatures.some(tc => tc.creature.active && tc.word === word);
  }

  private assignWord(creature: Creature): string {
    let word: string;
    let attempts = 0;

    do {
      word = this.generateWord(this.player.experience);
      attempts++;
    } while (!this.isWordUnique(word) && attempts < 200);

    return word;
  }

  private spawnTypoCreature() {
    const t = this.elapsedMs * 0.001;
    const y = Math.cos(t) * 256 + WORLD_HEIGHT * 0.5;

    const tintT = this.elapsedMs + 1;
    const tintR = Math.min(1, Math.max(0, tintT * 0.0000083333334 + 0.3));
    const tintG = Math.min(1, Math.max(0, 0.3));
    const tintB = Math.min(1, Math.max(0, Math.sin(tintT * 0.0001) + 0.3));
    const tint: TintRGBA = { r: tintR, g: tintG, b: tintB, a: 1.0 };

    const config: CreatureConfig = {
      tint,
      speedOverride: 50,
      healthOverride: 1,
      damageOverride: 100
    };

    const spawnRight = Math.random() > 0.5;
    const spawnX = spawnRight ? WORLD_WIDTH + 64 : -64;

    const types = [CreatureType.SPIDER, CreatureType.ALIEN, CreatureType.ZOMBIE, CreatureType.FAST_ZOMBIE];
    const type = types[Math.floor(Math.random() * types.length)];

    const creature = new Creature(this, spawnX, y, type, undefined, config);
    this.creatures.add(creature);

    const word = this.assignWord(creature);
    this.typoCreatures.push({ creature, word });
  }

  private tickSpawns(dtMs: number) {
    this.spawnCooldownMs -= dtMs;

    while (this.spawnCooldownMs < 0) {
      this.spawnCooldownMs += Math.max(100, 3500 - Math.floor(this.elapsedMs / 800));

      this.spawnTypoCreature();
      this.spawnTypoCreature();
    }
  }

  update(_time: number, delta: number) {
    if (this.gameOver) {
      this.updateCursor();
      return;
    }

    if (this.isPaused) {
      this.updateCursor();
      return;
    }

    const dt = delta / 1000;
    this.elapsedMs += delta;
    this.cursorPulseTime += dt;

    this.player.update(delta, this.input.activePointer);
    this.updateCreatures(delta);
    this.tickSpawns(delta);
    this.updateHUD();
    this.updateTypingDisplay();
    this.updateCursor();
    this.drawWordLabels();
  }

  private updateCreatures(delta: number) {
    this.creatures.getChildren().forEach((child) => {
      const creature = child as Creature;
      if (creature.active) {
        creature.update(delta, this.player);
      }
    });

    this.typoCreatures = this.typoCreatures.filter(tc => tc.creature.active);
  }

  private updateHUD() {
    const scale = Math.min(SCREEN_WIDTH / UI.HUD_BASE_WIDTH, SCREEN_HEIGHT / UI.HUD_BASE_HEIGHT);
    const clampedScale = Math.max(0.75, Math.min(1.5, scale));

    if (this.healthBarFill) {
      const healthPercent = Math.max(0, this.player.health / this.player.maxHealth);
      this.healthBarFill.setCrop(0, 0, this.healthBarFill.width * healthPercent, this.healthBarFill.height);
    }
  }

  private updateTypingDisplay() {
    const cursorBlink = Math.sin(this.cursorPulseTime * 4) > 0;
    const cursor = cursorBlink ? '_' : '';
    this.typingTextDisplay.setText('>' + this.typingText + cursor);
  }

  private updateCursor() {
    const pointer = this.input.activePointer;

    if (this.crosshair && this.crosshair.visible) {
      this.crosshair.setPosition(pointer.x, pointer.y);
    }

    if (this.menuCursor && this.menuCursor.visible) {
      this.menuCursor.setPosition(pointer.x, pointer.y);
    }
  }

  private drawWordLabels() {
    this.children.getAll().forEach(child => {
      if ((child as any).isWordLabel) {
        child.destroy();
      }
    });

    for (const tc of this.typoCreatures) {
      if (!tc.creature.active) continue;

      const screenX = tc.creature.x - this.cameras.main.scrollX;
      const screenY = tc.creature.y - this.cameras.main.scrollY;
      const labelY = screenY - 50;

      const matchLen = this.getMatchLength(tc.word, this.typingText);

      const bg = this.add.rectangle(
        screenX,
        labelY,
        tc.word.length * 10 + 16,
        20,
        0x000000,
        0.67
      );
      bg.setScrollFactor(0);
      bg.setDepth(50);
      (bg as any).isWordLabel = true;

      if (matchLen > 0 && matchLen < tc.word.length) {
        const typedPart = tc.word.substring(0, matchLen);
        const remainingPart = tc.word.substring(matchLen);

        const typedText = this.add.text(
          screenX - (tc.word.length * 5),
          labelY,
          typedPart,
          {
            fontSize: '14px',
            color: '#00ff00',
            fontFamily: 'monospace'
          }
        );
        typedText.setOrigin(0, 0.5);
        typedText.setScrollFactor(0);
        typedText.setDepth(51);
        (typedText as any).isWordLabel = true;

        const remainingText = this.add.text(
          screenX - (tc.word.length * 5) + matchLen * 8.4,
          labelY,
          remainingPart,
          {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'monospace'
          }
        );
        remainingText.setOrigin(0, 0.5);
        remainingText.setScrollFactor(0);
        remainingText.setDepth(51);
        (remainingText as any).isWordLabel = true;
      } else {
        const text = this.add.text(screenX, labelY, tc.word, {
          fontSize: '14px',
          color: '#ffffff',
          fontFamily: 'monospace'
        });
        text.setOrigin(0.5, 0.5);
        text.setScrollFactor(0);
        text.setDepth(51);
        (text as any).isWordLabel = true;
      }
    }
  }

  private getMatchLength(word: string, typed: string): number {
    let match = 0;
    for (let i = 0; i < Math.min(word.length, typed.length); i++) {
      if (word[i] === typed[i]) {
        match++;
      } else {
        break;
      }
    }
    return match;
  }

  shutdown() {
    this.input.keyboard?.off('keydown', this.handleKeyDown, this);
  }
}
