import Phaser from 'phaser';
import { HighScoreManager } from '../systems/HighScoreManager';
import { SoundManager } from '../audio/SoundManager';
import { SettingsManager } from '../systems/SettingsManager';
import { StatsManager } from '../systems/StatsManager';
import { GameMode, GAME_MODE_CONFIGS } from '../data/gameModes';
import { SCREEN_WIDTH, SCREEN_HEIGHT, UI } from '../config';
import { MENU_MUSIC } from '../data/audio';
import {
  QUEST_DEFINITIONS,
  QuestDefinition,
  QuestProgressMap,
  getQuestsByTier,
  getTierCount,
  isQuestUnlocked,
  getCompletedQuestCount,
  getTotalQuestCount
} from '../data/quests';
import { loadQuestProgress } from './QuestScene';

type MenuState = 'main' | 'mode_select' | 'quest_select' | 'scores' | 'options' | 'statistics' | 'controls' | 'credits';

interface MenuSceneData {
  initialState?: MenuState;
  scoresMode?: GameMode;
}

interface MenuEntry {
  slot: number;
  label: string;
  action: string;
  y: number;
  hoverAmount: number;
  enabled: boolean;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
}

function widescreenYShift(screenW: number): number {
  return (screenW / 640.0) * 150.0 - 150.0;
}

export class MenuScene extends Phaser.Scene {
  private highScoreManager!: HighScoreManager;
  private settingsManager!: SettingsManager;
  private statsManager!: StatsManager;
  private menuState: MenuState = 'main';
  private selectedMode: GameMode = GameMode.SURVIVAL;
  private mainContainer!: Phaser.GameObjects.Container;
  private modeSelectContainer!: Phaser.GameObjects.Container;
  private scoresContainer!: Phaser.GameObjects.Container;
  private optionsContainer!: Phaser.GameObjects.Container;
  private statisticsContainer!: Phaser.GameObjects.Container;
  private controlsContainer!: Phaser.GameObjects.Container;
  private creditsContainer!: Phaser.GameObjects.Container;
  private questSelectContainer!: Phaser.GameObjects.Container;
  private scoresMode: GameMode = GameMode.SURVIVAL;
  private rebindingAction: string | null = null;
  private rebindText: Phaser.GameObjects.Text | null = null;
  private questProgress: QuestProgressMap = {};
  private selectedQuestTier: number = 1;

  private menuEntries: MenuEntry[] = [];
  private timelineMs: number = 0;
  private timelineMaxMs: number = 900;
  private cursorPulseTime: number = 0;
  private hoveredIndex: number = -1;
  private selectedIndex: number = 0;
  private widescreenShiftY: number = 0;
  private panelOpenSfxPlayed: boolean = false;

  private menuGraphics!: Phaser.GameObjects.Graphics;
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private menuPanelSprite!: Phaser.GameObjects.Image;
  private signSprite!: Phaser.GameObjects.Image;
  private cursorSprite!: Phaser.GameObjects.Image;
  private cursorGlowSprites: Phaser.GameObjects.Image[] = [];
  private soundManager!: SoundManager;

  constructor() {
    super('MenuScene');
  }

  private initialState: MenuState = 'main';
  private initialScoresMode: GameMode = GameMode.SURVIVAL;

  init(data?: MenuSceneData) {
    this.initialState = data?.initialState || 'main';
    this.initialScoresMode = data?.scoresMode || GameMode.SURVIVAL;
    this.menuState = 'main';
    this.selectedMode = GameMode.SURVIVAL;
    this.scoresMode = this.initialScoresMode;
    this.timelineMs = 0;
    this.cursorPulseTime = 0;
    this.hoveredIndex = -1;
    this.selectedIndex = 0;
    this.panelOpenSfxPlayed = false;
    this.widescreenShiftY = widescreenYShift(SCREEN_WIDTH);
    this.menuEntries = [];
    this.menuTexts = [];
  }

  create() {
    this.highScoreManager = new HighScoreManager();
    this.settingsManager = new SettingsManager();
    this.statsManager = new StatsManager();
    this.soundManager = new SoundManager(this);

    this.soundManager.setSfxVolume(this.settingsManager.get('sfxVolume'));
    this.soundManager.setMusicVolume(this.settingsManager.get('musicVolume'));
    this.soundManager.setSfxEnabled(this.settingsManager.get('sfxEnabled'));
    this.soundManager.setMusicEnabled(this.settingsManager.get('musicEnabled'));

    this.cameras.main.setBackgroundColor(0x1a1208);

    this.menuGraphics = this.add.graphics();
    this.menuGraphics.setDepth(10);

    if (this.textures.exists('ui_menuPanel')) {
      this.menuPanelSprite = this.add.image(0, 0, 'ui_menuPanel');
      this.menuPanelSprite.setOrigin(0, 0);
      this.menuPanelSprite.setDepth(5);
      this.menuPanelSprite.setVisible(false);
    }

    if (this.textures.exists('ui_signCrimson')) {
      this.signSprite = this.add.image(0, 0, 'ui_signCrimson');
      this.signSprite.setOrigin(0, 0);
      this.signSprite.setDepth(15);
      this.signSprite.setVisible(false);
    }

    if (this.textures.exists('ui_cursor')) {
      this.cursorSprite = this.add.image(0, 0, 'ui_cursor');
      this.cursorSprite.setOrigin(0, 0);
      this.cursorSprite.setDepth(100);
      this.cursorSprite.setDisplaySize(32, 32);
    }

    if (this.textures.exists('particles_sheet')) {
      for (let i = 0; i < 4; i++) {
        const glow = this.add.image(0, 0, 'particles_sheet', 13);
        glow.setOrigin(0, 0);
        glow.setDepth(99);
        glow.setBlendMode(Phaser.BlendModes.ADD);
        this.cursorGlowSprites.push(glow);
      }
    }

    this.createMainMenu();
    this.createModeSelect();
    this.createScoresMenu();
    this.createOptionsMenu();
    this.createStatisticsPanel();
    this.createControlsPanel();
    this.createCreditsPanel();
    this.createQuestSelect();

    this.questProgress = loadQuestProgress();

    this.input.setDefaultCursor('none');

    this.soundManager.playMusic(MENU_MUSIC, true);

    if (this.initialState === 'scores') {
      this.showScores();
    } else if (this.initialState === 'quest_select') {
      this.showQuestSelect();
    } else {
      this.showMain();
    }
  }

  update(_time: number, delta: number) {
    const dtMs = Math.min(delta, 100);
    this.cursorPulseTime += dtMs * 0.001 * 1.1;

    if (this.menuState === 'main') {
      this.timelineMs = Math.min(this.timelineMaxMs, this.timelineMs + dtMs);
      this.updateHoverAmounts(dtMs);
      this.drawMainMenu();
    }

    this.updateCursor();
  }

  private updateCursor() {
    const pointer = this.input.activePointer;
    const x = pointer.x;
    const y = pointer.y;

    const pulseAlpha = (Math.pow(2, Math.sin(this.cursorPulseTime)) + 2) * 0.32;
    const clampedAlpha = Math.min(1, Math.max(0, pulseAlpha));

    if (this.cursorGlowSprites.length >= 4) {
      const glowOffsets = [
        { dx: -28, dy: -28, size: 64 },
        { dx: -10, dy: -18, size: 64 },
        { dx: -18, dy: -10, size: 64 },
        { dx: -48, dy: -48, size: 128 },
      ];
      for (let i = 0; i < 4; i++) {
        const glow = this.cursorGlowSprites[i];
        const offset = glowOffsets[i];
        glow.setPosition(x + offset.dx, y + offset.dy);
        glow.setDisplaySize(offset.size, offset.size);
        glow.setAlpha(clampedAlpha);
        glow.setVisible(this.cursorSprite?.visible ?? true);
      }
    }

    if (this.cursorSprite && this.cursorSprite.visible) {
      this.cursorSprite.setPosition(x - 2, y - 2);
    }
  }

  private initMenuEntries() {
    const baseY = UI.MENU.LABEL_BASE_Y + this.widescreenShiftY;
    const step = UI.MENU.LABEL_STEP;

    this.menuEntries = [
      { slot: 1, label: 'PLAY GAME', action: 'play', y: baseY + step, hoverAmount: 0, enabled: true },
      { slot: 2, label: 'OPTIONS', action: 'options', y: baseY + step * 2, hoverAmount: 0, enabled: true },
      { slot: 3, label: 'STATISTICS', action: 'statistics', y: baseY + step * 3, hoverAmount: 0, enabled: true },
      { slot: 4, label: 'HIGH SCORES', action: 'scores', y: baseY + step * 4, hoverAmount: 0, enabled: true },
      { slot: 5, label: 'CONTROLS', action: 'controls', y: baseY + step * 5, hoverAmount: 0, enabled: true },
      { slot: 6, label: 'CREDITS', action: 'credits', y: baseY + step * 6, hoverAmount: 0, enabled: true },
    ];
  }

  private updateHoverAmounts(dtMs: number) {
    const pointer = this.input.activePointer;
    this.hoveredIndex = -1;

    for (let i = 0; i < this.menuEntries.length; i++) {
      const entry = this.menuEntries[i];
      if (!entry.enabled) continue;
      if (!this.isEntryVisible(entry)) continue;

      const bounds = this.getEntryBounds(entry);
      const hovering = pointer.x >= bounds.x && pointer.x <= bounds.x + bounds.w &&
                       pointer.y >= bounds.y && pointer.y <= bounds.y + bounds.h;

      if (hovering) {
        this.hoveredIndex = i;
        entry.hoverAmount = Math.min(1000, entry.hoverAmount + dtMs * 6);
      } else {
        entry.hoverAmount = Math.max(0, entry.hoverAmount - dtMs * 2);
      }
    }

    if (this.input.activePointer.isDown && this.hoveredIndex >= 0) {
      this.activateEntry(this.hoveredIndex);
    }
  }

  private isEntryVisible(entry: MenuEntry): boolean {
    const startMs = (entry.slot + 2) * 100 + 300;
    return this.timelineMs >= startMs;
  }

  private getEntryBounds(entry: MenuEntry): { x: number; y: number; w: number; h: number } {
    const posX = UI.MENU.LABEL_BASE_X - entry.slot * 20;
    const posY = entry.y;

    const itemW = 342;
    const itemH = 64;
    const textOffsetX = -71 + itemW / 2 + 150;

    const left = posX + textOffsetX - 120;
    const top = posY - itemH / 2;

    return { x: left, y: top, w: 240, h: itemH };
  }

  private getAngle(slot: number): number {
    const startMs = (slot + 2) * 100 + 300;
    const endMs = (slot + 2) * 100;

    if (this.timelineMs < endMs) {
      return Math.PI / 2;
    } else if (this.timelineMs < startMs) {
      const elapsed = this.timelineMs - endMs;
      const span = startMs - endMs;
      const p = elapsed / span;
      return (Math.PI / 2) * (1 - p);
    }
    return 0;
  }

  private activateEntry(index: number) {
    const entry = this.menuEntries[index];
    if (!entry || !entry.enabled) return;

    this.soundManager.playUiClick();
    this.input.activePointer.isDown = false;

    switch (entry.action) {
      case 'play':
        this.showModeSelect();
        break;
      case 'scores':
        this.showScores();
        break;
      case 'options':
        this.showOptions();
        break;
      case 'statistics':
        this.showStatistics();
        break;
      case 'controls':
        this.showControls();
        break;
      case 'credits':
        this.showCredits();
        break;
    }
  }

  private createMainMenu() {
    this.mainContainer = this.add.container(0, 0);
    this.initMenuEntries();
  }

  private drawMainMenu() {
    this.menuGraphics.clear();
    this.menuTexts.forEach(t => t.destroy());
    this.menuTexts = [];

    this.drawMenuPanel();
    this.drawMenuSign();
    this.drawMenuItems();

    if (!this.cursorSprite || !this.textures.exists('ui_cursor')) {
      this.drawFallbackCursor();
    }
  }

  private drawMenuPanel() {
    const panelBaseX = UI.MENU.PANEL_BASE_X + UI.MENU.PANEL_OFFSET_X;
    const panelBaseY = UI.MENU.PANEL_BASE_Y + UI.MENU.PANEL_OFFSET_Y + this.widescreenShiftY;
    const panelW = UI.MENU.PANEL_WIDTH;
    const panelH = UI.MENU.PANEL_HEIGHT;

    const slideProgress = easeOutCubic(this.timelineMs / this.timelineMaxMs);
    const slideOffset = -panelW * (1 - slideProgress);

    const panelX = panelBaseX + slideOffset;
    const panelY = panelBaseY;

    if (this.menuPanelSprite && this.textures.exists('ui_menuPanel')) {
      this.menuPanelSprite.setVisible(true);
      this.menuPanelSprite.setPosition(panelX, panelY);
      this.menuPanelSprite.setDisplaySize(panelW, panelH);
      this.menuPanelSprite.setAlpha(UI.ALPHA.PANEL);
    } else {
      this.menuGraphics.fillStyle(UI.COLORS.SHADOW, UI.ALPHA.SHADOW);
      this.menuGraphics.fillRoundedRect(
        panelX + UI.SHADOW_OFFSET,
        panelY + UI.SHADOW_OFFSET,
        panelW,
        panelH,
        8
      );

      this.menuGraphics.fillStyle(0x1a1612, UI.ALPHA.PANEL);
      this.menuGraphics.fillRoundedRect(panelX, panelY, panelW, panelH, 8);

      this.menuGraphics.lineStyle(2, 0x3d3830, 0.8);
      this.menuGraphics.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);

      this.menuGraphics.lineStyle(1, 0x4a4438, 0.5);
      this.menuGraphics.strokeRoundedRect(panelX + 4, panelY + 4, panelW - 8, panelH - 8, 6);
    }
  }

  private drawMenuSign() {
    const SIGN_POS_X_PAD = 4;
    const SIGN_POS_Y = SCREEN_WIDTH > 640 ? 70 : 60;
    const SIGN_OFFSET_X = -576.44;
    const SIGN_OFFSET_Y = -61;

    const signStartMs = 300;
    const signEndMs = 0;

    let signAngle = 0;
    if (this.timelineMs < signEndMs) {
      signAngle = -Math.PI / 2;
    } else if (this.timelineMs < signStartMs) {
      const p = (this.timelineMs - signEndMs) / (signStartMs - signEndMs);
      signAngle = -(Math.PI / 2) * (1 - p);
    }

    const posX = SCREEN_WIDTH + SIGN_POS_X_PAD;
    const posY = SIGN_POS_Y;
    const signW = UI.MENU.SIGN_WIDTH;
    const signH = UI.MENU.SIGN_HEIGHT;

    if (this.signSprite && this.textures.exists('ui_signCrimson')) {
      this.signSprite.setVisible(true);
      this.signSprite.setDisplaySize(signW, signH);
      this.signSprite.setPosition(posX + SIGN_OFFSET_X, posY + SIGN_OFFSET_Y);
      this.signSprite.setRotation(signAngle);
      this.signSprite.setOrigin(0, 0);
    } else {
      const titleText = this.add.text(
        posX + SIGN_OFFSET_X + 80,
        posY + SIGN_OFFSET_Y + 40,
        'CRIMSONLAND',
        {
          fontSize: '42px',
          color: '#cc3333',
          fontFamily: 'Arial Black',
          stroke: '#000000',
          strokeThickness: 4,
        }
      ).setOrigin(0, 0).setRotation(signAngle).setDepth(15);
      this.menuTexts.push(titleText);

      const subtitleText = this.add.text(
        posX + SIGN_OFFSET_X + 80,
        posY + SIGN_OFFSET_Y + 98,
        'Browser Edition',
        {
          fontSize: '16px',
          color: '#888888',
          fontFamily: 'Arial',
        }
      ).setOrigin(0, 0).setRotation(signAngle).setDepth(15);
      this.menuTexts.push(subtitleText);
    }
  }

  private drawMenuItems() {
    const hasItemTexture = this.textures.exists('ui_menuItem');
    let itemW = 342, itemH = 64;
    if (hasItemTexture) {
      const tex = this.textures.get('ui_menuItem');
      itemW = tex.getSourceImage().width;
      itemH = tex.getSourceImage().height;
    }

    for (let i = this.menuEntries.length - 1; i >= 0; i--) {
      const entry = this.menuEntries[i];
      if (!this.isEntryVisible(entry)) continue;

      const posX = UI.MENU.LABEL_BASE_X - entry.slot * 20;
      const posY = entry.y;
      const angle = this.getAngle(entry.slot);

      const container = this.add.container(posX, posY);
      container.setDepth(15);
      container.setRotation(angle);

      if (hasItemTexture) {
        const itemSprite = this.add.image(-71, -59, 'ui_menuItem');
        itemSprite.setOrigin(0, 0);
        container.add(itemSprite);
      }

      const alpha = entry.enabled
        ? UI.ALPHA.MENU_ITEM_IDLE + (entry.hoverAmount / 1000) * (UI.ALPHA.MENU_ITEM_HOVER - UI.ALPHA.MENU_ITEM_IDLE)
        : 0.4;

      const baseColor = entry.enabled ? UI.COLORS.MENU_ITEM : 0x666666;
      const r = ((baseColor >> 16) & 0xff);
      const g = ((baseColor >> 8) & 0xff);
      const b = (baseColor & 0xff);
      const colorStr = `rgba(${r}, ${g}, ${b}, ${alpha})`;

      const textOffsetX = -71 + itemW / 2 + 150;
      const textOffsetY = -59 + itemH / 2 + 6;

      const text = this.add.text(textOffsetX, textOffsetY, entry.label, {
        fontSize: '14px',
        color: colorStr,
        fontFamily: 'Arial Black',
      });
      text.setOrigin(0.5, 0.5);
      text.setDepth(20);
      container.add(text);

      this.menuTexts.push(container as any);
    }
  }

  private drawFallbackCursor() {
    const pointer = this.input.activePointer;
    const x = pointer.x;
    const y = pointer.y;

    const pulseAlpha = (Math.pow(2, Math.sin(this.cursorPulseTime)) + 2) * 0.32;
    const clampedAlpha = Math.min(1, Math.max(0, pulseAlpha));

    this.menuGraphics.fillStyle(0xffcc00, clampedAlpha * 0.3);
    this.menuGraphics.fillCircle(x, y, 24);
    this.menuGraphics.fillStyle(0xffcc00, clampedAlpha * 0.5);
    this.menuGraphics.fillCircle(x, y, 16);

    this.menuGraphics.fillStyle(0xffffff, 1);
    this.menuGraphics.fillTriangle(
      x, y,
      x + 12, y + 14,
      x + 4, y + 14
    );
    this.menuGraphics.fillTriangle(
      x, y,
      x + 4, y + 14,
      x + 4, y + 18
    );
  }

  private createModeSelect() {
    this.modeSelectContainer = this.add.container(0, 0);
    this.modeSelectContainer.setVisible(false);
    this.modeSelectContainer.setDepth(50);

    const overlay = this.add.rectangle(
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT / 2,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
      0x000000,
      0.8
    );
    this.modeSelectContainer.add(overlay);

    const panelW = 450;
    const panelH = 560;
    const panelX = SCREEN_WIDTH / 2;
    const panelY = SCREEN_HEIGHT / 2;

    const shadowPanel = this.add.rectangle(
      panelX + UI.SHADOW_OFFSET,
      panelY + UI.SHADOW_OFFSET,
      panelW,
      panelH,
      UI.COLORS.SHADOW,
      UI.ALPHA.SHADOW
    );
    this.modeSelectContainer.add(shadowPanel);

    const panel = this.add.rectangle(panelX, panelY, panelW, panelH, 0x1a1612, UI.ALPHA.PANEL);
    panel.setStrokeStyle(2, 0x3d3830);
    this.modeSelectContainer.add(panel);

    const title = this.add.text(panelX, panelY - 230, 'SELECT GAME MODE', {
      fontSize: '24px',
      color: '#f0c850',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    this.modeSelectContainer.add(title);

    const questConfig = GAME_MODE_CONFIGS[GameMode.QUEST];
    const questBtn = this.createClassicButton(
      panelX,
      panelY - 165,
      questConfig.name.toUpperCase(),
      questConfig.description,
      () => {
        this.showQuestSelect();
      }
    );
    this.modeSelectContainer.add(questBtn);

    const tutorialConfig = GAME_MODE_CONFIGS[GameMode.TUTORIAL];
    const tutorialBtn = this.createClassicButton(
      panelX,
      panelY - 80,
      tutorialConfig.name.toUpperCase(),
      tutorialConfig.description,
      () => {
        this.startTutorial();
      }
    );
    this.modeSelectContainer.add(tutorialBtn);

    const survivalConfig = GAME_MODE_CONFIGS[GameMode.SURVIVAL];
    const survivalBtn = this.createClassicButton(
      panelX,
      panelY + 5,
      survivalConfig.name.toUpperCase(),
      survivalConfig.description,
      () => {
        this.selectedMode = GameMode.SURVIVAL;
        this.startGame();
      }
    );
    this.modeSelectContainer.add(survivalBtn);

    const rushConfig = GAME_MODE_CONFIGS[GameMode.RUSH];
    const rushBtn = this.createClassicButton(
      panelX,
      panelY + 90,
      rushConfig.name.toUpperCase(),
      rushConfig.description,
      () => {
        this.selectedMode = GameMode.RUSH;
        this.startGame();
      }
    );
    this.modeSelectContainer.add(rushBtn);

    const typoConfig = GAME_MODE_CONFIGS[GameMode.TYPO];
    const typoBtn = this.createClassicButton(
      panelX,
      panelY + 175,
      typoConfig.name.toUpperCase(),
      typoConfig.description,
      () => {
        this.startTypo();
      }
    );
    this.modeSelectContainer.add(typoBtn);

    const backBtn = this.createClassicSmallButton(panelX, panelY + 250, 'BACK', () => {
      this.showMain();
    });
    this.modeSelectContainer.add(backBtn);
  }

  private createClassicButton(
    x: number,
    y: number,
    name: string,
    description: string,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const btnW = 380;
    const btnH = 65;

    const bg = this.add.rectangle(0, 0, btnW, btnH, 0x222222, 0.9);
    bg.setStrokeStyle(2, 0x444444);
    bg.setInteractive({ useHandCursor: true });

    const nameText = this.add.text(0, -12, name, {
      fontSize: '20px',
      color: '#46b4f0',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    const descText = this.add.text(0, 12, description, {
      fontSize: '13px',
      color: '#aaaab4',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x333322, 0.9);
      bg.setStrokeStyle(2, UI.COLORS.MENU_ITEM);
      nameText.setColor('#ffffff');
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x222222, 0.9);
      bg.setStrokeStyle(2, 0x444444);
      nameText.setColor('#46b4f0');
    });

    bg.on('pointerdown', callback);

    container.add([bg, nameText, descText]);
    return container;
  }

  private createClassicSmallButton(
    x: number,
    y: number,
    label: string,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const btnW = 145;
    const btnH = 32;

    const bg = this.add.rectangle(0, 0, btnW, btnH, 0x222222, 0.9);
    bg.setStrokeStyle(2, 0x444444);
    bg.setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, label, {
      fontSize: '14px',
      color: '#dcdcdc',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x8080b3, 0.9);
      bg.setStrokeStyle(2, 0x8080b3);
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

  private createScoresMenu() {
    this.scoresContainer = this.add.container(0, 0);
    this.scoresContainer.setVisible(false);
    this.scoresContainer.setDepth(50);
  }

  private rebuildScoresMenu() {
    this.scoresContainer.removeAll(true);

    const overlay = this.add.rectangle(
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT / 2,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
      0x000000,
      0.8
    );
    this.scoresContainer.add(overlay);

    const panelW = 500;
    const panelH = 420;
    const panelX = SCREEN_WIDTH / 2;
    const panelY = SCREEN_HEIGHT / 2;

    const shadowPanel = this.add.rectangle(
      panelX + UI.SHADOW_OFFSET,
      panelY + UI.SHADOW_OFFSET,
      panelW,
      panelH,
      UI.COLORS.SHADOW,
      UI.ALPHA.SHADOW
    );
    this.scoresContainer.add(shadowPanel);

    const panel = this.add.rectangle(panelX, panelY, panelW, panelH, 0x1a1612, UI.ALPHA.PANEL);
    panel.setStrokeStyle(2, 0x3d3830);
    this.scoresContainer.add(panel);

    const title = this.add.text(panelX, panelY - 180, 'HIGH SCORES', {
      fontSize: '24px',
      color: '#f0c850',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    this.scoresContainer.add(title);

    const survivalTab = this.createTabButton(panelX - 120, panelY - 140,
      'SURVIVAL', this.scoresMode === GameMode.SURVIVAL, () => {
        this.scoresMode = GameMode.SURVIVAL;
        this.rebuildScoresMenu();
      });
    this.scoresContainer.add(survivalTab);

    const rushTab = this.createTabButton(panelX, panelY - 140,
      'RUSH', this.scoresMode === GameMode.RUSH, () => {
        this.scoresMode = GameMode.RUSH;
        this.rebuildScoresMenu();
      });
    this.scoresContainer.add(rushTab);

    const typoTab = this.createTabButton(panelX + 120, panelY - 140,
      'TYPO', this.scoresMode === GameMode.TYPO, () => {
        this.scoresMode = GameMode.TYPO;
        this.rebuildScoresMenu();
      });
    this.scoresContainer.add(typoTab);

    const scores = this.highScoreManager.getScores(this.scoresMode);

    if (scores.length === 0) {
      const noScores = this.add.text(panelX, panelY - 40, 'No scores yet!', {
        fontSize: '18px',
        color: '#aaaab4',
        fontFamily: 'Arial'
      }).setOrigin(0.5);
      this.scoresContainer.add(noScores);
    } else {
      const headerY = panelY - 100;
      const colX = panelX - 200;

      const headerItems = [
        { text: '#', x: colX, w: 30 },
        { text: 'NAME', x: colX + 35, w: 100 },
        { text: 'SCORE', x: colX + 145, w: 70 },
        { text: 'KILLS', x: colX + 220, w: 50 },
        { text: 'LVL', x: colX + 275, w: 40 },
        { text: 'TIME', x: colX + 320, w: 60 },
        { text: 'DATE', x: colX + 380, w: 80 }
      ];

      for (const h of headerItems) {
        const hdr = this.add.text(h.x, headerY, h.text, {
          fontSize: '11px',
          color: '#888888',
          fontFamily: 'Arial'
        }).setOrigin(0, 0.5);
        this.scoresContainer.add(hdr);
      }

      for (let i = 0; i < Math.min(scores.length, 10); i++) {
        const score = scores[i];
        const y = headerY + 25 + i * 26;
        const color = i === 0 ? '#f0c850' : i < 3 ? '#dcdcdc' : '#aaaab4';

        const name = (score.name || 'Player').substring(0, 12);
        const dateStr = this.highScoreManager.formatDate(score.date);

        const rowItems = [
          { text: `${i + 1}`, x: colX },
          { text: name, x: colX + 35 },
          { text: this.highScoreManager.formatScore(score.score), x: colX + 145 },
          { text: `${score.kills}`, x: colX + 220 },
          { text: `${score.level}`, x: colX + 275 },
          { text: this.highScoreManager.formatTime(score.time), x: colX + 320 },
          { text: dateStr, x: colX + 380 }
        ];

        for (const item of rowItems) {
          const cell = this.add.text(item.x, y, item.text, {
            fontSize: '13px',
            color,
            fontFamily: 'monospace'
          }).setOrigin(0, 0.5);
          this.scoresContainer.add(cell);
        }
      }
    }

    const backButton = this.createClassicSmallButton(panelX, panelY + 170, 'BACK', () => {
      this.showMain();
    });
    this.scoresContainer.add(backButton);
  }

  private createTabButton(
    x: number,
    y: number,
    text: string,
    active: boolean,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bgColor = active ? 0x333322 : 0x222222;
    const borderColor = active ? UI.COLORS.MENU_ITEM : 0x444444;

    const bg = this.add.rectangle(0, 0, 140, 30, bgColor, 0.9)
      .setStrokeStyle(2, borderColor)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, text, {
      fontSize: '13px',
      color: active ? '#46b4f0' : '#aaaab4',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    if (!active) {
      bg.on('pointerover', () => {
        bg.setFillStyle(0x2a2a2a, 0.9);
      });

      bg.on('pointerout', () => {
        bg.setFillStyle(0x222222, 0.9);
      });
    }

    bg.on('pointerdown', callback);

    container.add([bg, label]);
    return container;
  }

  private hideAllContainers() {
    this.mainContainer.setVisible(false);
    this.modeSelectContainer.setVisible(false);
    this.scoresContainer.setVisible(false);
    this.optionsContainer.setVisible(false);
    this.statisticsContainer.setVisible(false);
    this.controlsContainer.setVisible(false);
    this.creditsContainer.setVisible(false);
    this.questSelectContainer.setVisible(false);
    if (this.menuPanelSprite) this.menuPanelSprite.setVisible(false);
    if (this.signSprite) this.signSprite.setVisible(false);
  }

  private showMain() {
    this.menuState = 'main';
    this.timelineMs = 0;
    this.panelOpenSfxPlayed = false;
    this.initMenuEntries();
    this.hideAllContainers();
    this.mainContainer.setVisible(true);
    this.input.setDefaultCursor('none');
    if (this.cursorSprite) this.cursorSprite.setVisible(true);
  }

  private showModeSelect() {
    this.menuState = 'mode_select';
    this.menuGraphics.clear();
    this.menuTexts.forEach(t => t.destroy());
    this.menuTexts = [];
    this.hideAllContainers();
    this.modeSelectContainer.setVisible(true);
    this.input.setDefaultCursor('none');
    if (this.cursorSprite) this.cursorSprite.setVisible(true);
  }

  private showScores() {
    this.menuState = 'scores';
    this.menuGraphics.clear();
    this.menuTexts.forEach(t => t.destroy());
    this.menuTexts = [];
    this.hideAllContainers();
    this.scoresContainer.setVisible(true);
    this.rebuildScoresMenu();
    this.input.setDefaultCursor('none');
    if (this.cursorSprite) this.cursorSprite.setVisible(true);
  }

  private showOptions() {
    this.menuState = 'options';
    this.menuGraphics.clear();
    this.menuTexts.forEach(t => t.destroy());
    this.menuTexts = [];
    this.hideAllContainers();
    this.optionsContainer.setVisible(true);
    this.rebuildOptionsMenu();
    this.input.setDefaultCursor('none');
    if (this.cursorSprite) this.cursorSprite.setVisible(true);
  }

  private showStatistics() {
    this.menuState = 'statistics';
    this.menuGraphics.clear();
    this.menuTexts.forEach(t => t.destroy());
    this.menuTexts = [];
    this.hideAllContainers();
    this.statisticsContainer.setVisible(true);
    this.rebuildStatisticsPanel();
    this.input.setDefaultCursor('none');
    if (this.cursorSprite) this.cursorSprite.setVisible(true);
  }

  private showControls() {
    this.menuState = 'controls';
    this.menuGraphics.clear();
    this.menuTexts.forEach(t => t.destroy());
    this.menuTexts = [];
    this.hideAllContainers();
    this.controlsContainer.setVisible(true);
    this.rebuildControlsPanel();
    this.input.setDefaultCursor('none');
    if (this.cursorSprite) this.cursorSprite.setVisible(true);
  }

  private showCredits() {
    this.menuState = 'credits';
    this.menuGraphics.clear();
    this.menuTexts.forEach(t => t.destroy());
    this.menuTexts = [];
    this.hideAllContainers();
    this.creditsContainer.setVisible(true);
    this.rebuildCreditsPanel();
    this.input.setDefaultCursor('none');
    if (this.cursorSprite) this.cursorSprite.setVisible(true);
  }

  private createOptionsMenu() {
    this.optionsContainer = this.add.container(0, 0);
    this.optionsContainer.setVisible(false);
    this.optionsContainer.setDepth(50);
  }

  private rebuildOptionsMenu() {
    this.optionsContainer.removeAll(true);

    const overlay = this.add.rectangle(
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT / 2,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
      0x000000,
      0.8
    );
    this.optionsContainer.add(overlay);

    const panelW = 500;
    const panelH = 420;
    const panelX = SCREEN_WIDTH / 2;
    const panelY = SCREEN_HEIGHT / 2;

    const shadowPanel = this.add.rectangle(
      panelX + UI.SHADOW_OFFSET,
      panelY + UI.SHADOW_OFFSET,
      panelW,
      panelH,
      UI.COLORS.SHADOW,
      UI.ALPHA.SHADOW
    );
    this.optionsContainer.add(shadowPanel);

    const panel = this.add.rectangle(panelX, panelY, panelW, panelH, 0x1a1612, UI.ALPHA.PANEL);
    panel.setStrokeStyle(2, 0x3d3830);
    this.optionsContainer.add(panel);

    const title = this.add.text(panelX, panelY - 180, 'OPTIONS', {
      fontSize: '24px',
      color: '#f0c850',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    this.optionsContainer.add(title);

    let rowY = panelY - 120;
    const rowStep = 50;

    const sfxSlider = this.createSlider(
      panelX,
      rowY,
      'SFX VOLUME',
      this.settingsManager.get('sfxVolume'),
      (value) => {
        this.settingsManager.set('sfxVolume', value);
        this.soundManager.setSfxVolume(value);
      }
    );
    this.optionsContainer.add(sfxSlider);
    rowY += rowStep;

    const musicSlider = this.createSlider(
      panelX,
      rowY,
      'MUSIC VOLUME',
      this.settingsManager.get('musicVolume'),
      (value) => {
        this.settingsManager.set('musicVolume', value);
        this.soundManager.setMusicVolume(value);
      }
    );
    this.optionsContainer.add(musicSlider);
    rowY += rowStep;

    const sfxToggle = this.createToggle(
      panelX,
      rowY,
      'SFX ENABLED',
      this.settingsManager.get('sfxEnabled'),
      (enabled) => {
        this.settingsManager.set('sfxEnabled', enabled);
        this.soundManager.setSfxEnabled(enabled);
      }
    );
    this.optionsContainer.add(sfxToggle);
    rowY += rowStep;

    const musicToggle = this.createToggle(
      panelX,
      rowY,
      'MUSIC ENABLED',
      this.settingsManager.get('musicEnabled'),
      (enabled) => {
        this.settingsManager.set('musicEnabled', enabled);
        this.soundManager.setMusicEnabled(enabled);
      }
    );
    this.optionsContainer.add(musicToggle);
    rowY += rowStep;

    const shakeToggle = this.createToggle(
      panelX,
      rowY,
      'SCREEN SHAKE',
      this.settingsManager.get('screenShake'),
      (enabled) => {
        this.settingsManager.set('screenShake', enabled);
      }
    );
    this.optionsContainer.add(shakeToggle);
    rowY += rowStep;

    const fpsToggle = this.createToggle(
      panelX,
      rowY,
      'SHOW FPS',
      this.settingsManager.get('showFps'),
      (enabled) => {
        this.settingsManager.set('showFps', enabled);
      }
    );
    this.optionsContainer.add(fpsToggle);

    const backButton = this.createClassicSmallButton(panelX, panelY + 170, 'BACK', () => {
      this.showMain();
    });
    this.optionsContainer.add(backButton);
  }

  private createSlider(
    x: number,
    y: number,
    label: string,
    initialValue: number,
    onChange: (value: number) => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const labelText = this.add.text(-180, 0, label, {
      fontSize: '14px',
      color: '#dcdcdc',
      fontFamily: 'Arial'
    }).setOrigin(0, 0.5);
    container.add(labelText);

    const sliderWidth = 200;
    const sliderHeight = 12;
    const sliderX = 40;

    const sliderBg = this.add.rectangle(sliderX, 0, sliderWidth, sliderHeight, 0x333333, 0.9);
    sliderBg.setStrokeStyle(1, 0x555555);
    container.add(sliderBg);

    const fillWidth = sliderWidth * initialValue;
    const sliderFill = this.add.rectangle(
      sliderX - sliderWidth / 2 + fillWidth / 2,
      0,
      fillWidth,
      sliderHeight - 4,
      UI.COLORS.MENU_ITEM,
      0.9
    );
    container.add(sliderFill);

    const valueText = this.add.text(sliderX + sliderWidth / 2 + 20, 0, `${Math.round(initialValue * 100)}%`, {
      fontSize: '12px',
      color: '#aaaab4',
      fontFamily: 'Arial'
    }).setOrigin(0, 0.5);
    container.add(valueText);

    const hitArea = this.add.rectangle(sliderX, 0, sliderWidth, 30, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const localX = pointer.x - (x + sliderX - sliderWidth / 2);
      const newValue = Phaser.Math.Clamp(localX / sliderWidth, 0, 1);
      onChange(newValue);
      this.soundManager.playUiClick();
      this.rebuildOptionsMenu();
    });

    return container;
  }

  private createToggle(
    x: number,
    y: number,
    label: string,
    initialValue: boolean,
    onChange: (enabled: boolean) => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const labelText = this.add.text(-180, 0, label, {
      fontSize: '14px',
      color: '#dcdcdc',
      fontFamily: 'Arial'
    }).setOrigin(0, 0.5);
    container.add(labelText);

    const toggleWidth = 60;
    const toggleHeight = 24;
    const toggleX = 40;

    const bgColor = initialValue ? 0x333322 : 0x222222;
    const borderColor = initialValue ? UI.COLORS.MENU_ITEM : 0x444444;

    const toggleBg = this.add.rectangle(toggleX, 0, toggleWidth, toggleHeight, bgColor, 0.9);
    toggleBg.setStrokeStyle(2, borderColor);
    toggleBg.setInteractive({ useHandCursor: true });
    container.add(toggleBg);

    const toggleText = this.add.text(toggleX, 0, initialValue ? 'ON' : 'OFF', {
      fontSize: '12px',
      color: initialValue ? '#46b4f0' : '#888888',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    container.add(toggleText);

    toggleBg.on('pointerdown', () => {
      onChange(!initialValue);
      this.soundManager.playUiClick();
      this.rebuildOptionsMenu();
    });

    toggleBg.on('pointerover', () => {
      toggleBg.setFillStyle(0x3a3a3a, 0.9);
    });

    toggleBg.on('pointerout', () => {
      toggleBg.setFillStyle(bgColor, 0.9);
    });

    return container;
  }

  private createStatisticsPanel() {
    this.statisticsContainer = this.add.container(0, 0);
    this.statisticsContainer.setVisible(false);
    this.statisticsContainer.setDepth(50);
  }

  private rebuildStatisticsPanel() {
    this.statisticsContainer.removeAll(true);

    const overlay = this.add.rectangle(
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT / 2,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
      0x000000,
      0.8
    );
    this.statisticsContainer.add(overlay);

    const panelW = 550;
    const panelH = 480;
    const panelX = SCREEN_WIDTH / 2;
    const panelY = SCREEN_HEIGHT / 2;

    const shadowPanel = this.add.rectangle(
      panelX + UI.SHADOW_OFFSET,
      panelY + UI.SHADOW_OFFSET,
      panelW,
      panelH,
      UI.COLORS.SHADOW,
      UI.ALPHA.SHADOW
    );
    this.statisticsContainer.add(shadowPanel);

    const panel = this.add.rectangle(panelX, panelY, panelW, panelH, 0x1a1612, UI.ALPHA.PANEL);
    panel.setStrokeStyle(2, 0x3d3830);
    this.statisticsContainer.add(panel);

    const title = this.add.text(panelX, panelY - 210, 'STATISTICS', {
      fontSize: '24px',
      color: '#f0c850',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    this.statisticsContainer.add(title);

    const stats = this.statsManager.getStats();
    let rowY = panelY - 160;
    const rowStep = 26;
    const leftX = panelX - 220;
    const rightX = panelX + 100;

    const addStatRow = (labelStr: string, value: string, y: number) => {
      const labelTxt = this.add.text(leftX, y, labelStr, {
        fontSize: '13px',
        color: '#aaaab4',
        fontFamily: 'Arial'
      }).setOrigin(0, 0.5);
      this.statisticsContainer.add(labelTxt);

      const valueText = this.add.text(rightX, y, value, {
        fontSize: '13px',
        color: '#dcdcdc',
        fontFamily: 'Arial'
      }).setOrigin(0, 0.5);
      this.statisticsContainer.add(valueText);
    };

    addStatRow('Total Kills:', stats.totalKills.toLocaleString(), rowY);
    rowY += rowStep;

    addStatRow('Total Play Time:', this.statsManager.formatPlayTime(stats.totalPlayTimeMs), rowY);
    rowY += rowStep;

    addStatRow('Games Played:', stats.totalGamesPlayed.toString(), rowY);
    rowY += rowStep;

    addStatRow('Shots Fired:', stats.totalShotsFired.toLocaleString(), rowY);
    rowY += rowStep;

    addStatRow('Shots Hit:', stats.totalShotsHit.toLocaleString(), rowY);
    rowY += rowStep;

    addStatRow('Accuracy:', `${this.statsManager.getAccuracy().toFixed(1)}%`, rowY);
    rowY += rowStep;

    addStatRow('Highest Level:', stats.highestLevel.toString(), rowY);
    rowY += rowStep;

    addStatRow('Longest Survival:', this.statsManager.formatPlayTime(stats.longestSurvivalMs), rowY);
    rowY += rowStep;

    addStatRow('Total Damage Dealt:', stats.totalDamageDealt.toLocaleString(), rowY);
    rowY += rowStep;

    addStatRow('Perks Selected:', stats.perksSelected.toString(), rowY);
    rowY += rowStep + 10;

    const killsTitle = this.add.text(panelX, rowY, 'KILLS BY CREATURE', {
      fontSize: '14px',
      color: '#f0c850',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    this.statisticsContainer.add(killsTitle);
    rowY += rowStep;

    const killsByCreature = this.statsManager.getKillsByCreature();
    const maxDisplay = 5;
    for (let i = 0; i < Math.min(killsByCreature.length, maxDisplay); i++) {
      const entry = killsByCreature[i];
      addStatRow(`${entry.name}:`, entry.count.toLocaleString(), rowY);
      rowY += rowStep - 4;
    }

    if (killsByCreature.length === 0) {
      const noKills = this.add.text(panelX, rowY, 'No kills recorded yet', {
        fontSize: '12px',
        color: '#888888',
        fontFamily: 'Arial'
      }).setOrigin(0.5);
      this.statisticsContainer.add(noKills);
    }

    const backButton = this.createClassicSmallButton(panelX, panelY + 200, 'BACK', () => {
      this.showMain();
    });
    this.statisticsContainer.add(backButton);
  }

  private createControlsPanel() {
    this.controlsContainer = this.add.container(0, 0);
    this.controlsContainer.setVisible(false);
    this.controlsContainer.setDepth(50);
  }

  private rebuildControlsPanel() {
    this.controlsContainer.removeAll(true);
    this.rebindingAction = null;

    const overlay = this.add.rectangle(
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT / 2,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
      0x000000,
      0.8
    );
    this.controlsContainer.add(overlay);

    const panelW = 500;
    const panelH = 450;
    const panelX = SCREEN_WIDTH / 2;
    const panelY = SCREEN_HEIGHT / 2;

    const shadowPanel = this.add.rectangle(
      panelX + UI.SHADOW_OFFSET,
      panelY + UI.SHADOW_OFFSET,
      panelW,
      panelH,
      UI.COLORS.SHADOW,
      UI.ALPHA.SHADOW
    );
    this.controlsContainer.add(shadowPanel);

    const panel = this.add.rectangle(panelX, panelY, panelW, panelH, 0x1a1612, UI.ALPHA.PANEL);
    panel.setStrokeStyle(2, 0x3d3830);
    this.controlsContainer.add(panel);

    const title = this.add.text(panelX, panelY - 190, 'CONTROLS', {
      fontSize: '24px',
      color: '#f0c850',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    this.controlsContainer.add(title);

    const bindings = [
      { action: 'moveUp', label: 'Move Up' },
      { action: 'moveDown', label: 'Move Down' },
      { action: 'moveLeft', label: 'Move Left' },
      { action: 'moveRight', label: 'Move Right' },
      { action: 'reload', label: 'Reload' },
      { action: 'pause', label: 'Pause' }
    ];

    let rowY = panelY - 140;
    const rowStep = 40;

    for (const binding of bindings) {
      const row = this.createKeyBindingRow(
        panelX,
        rowY,
        binding.label,
        binding.action
      );
      this.controlsContainer.add(row);
      rowY += rowStep;
    }

    const fixedControls = this.add.text(panelX, rowY + 10, 'Fixed Controls', {
      fontSize: '14px',
      color: '#f0c850',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    this.controlsContainer.add(fixedControls);
    rowY += 35;

    const fixedList = [
      'Fire: Left Mouse Button',
      'Select Perk: Right Mouse Button',
      'Reload: Middle Mouse Button',
      'Quick Select Perk: 1-6 Keys'
    ];

    for (const item of fixedList) {
      const txt = this.add.text(panelX, rowY, item, {
        fontSize: '12px',
        color: '#aaaab4',
        fontFamily: 'Arial'
      }).setOrigin(0.5);
      this.controlsContainer.add(txt);
      rowY += 20;
    }

    const resetBtn = this.createClassicSmallButton(panelX - 80, panelY + 185, 'RESET', () => {
      this.settingsManager.resetKeyBindings();
      this.soundManager.playUiClick();
      this.rebuildControlsPanel();
    });
    this.controlsContainer.add(resetBtn);

    const backButton = this.createClassicSmallButton(panelX + 80, panelY + 185, 'BACK', () => {
      this.showMain();
    });
    this.controlsContainer.add(backButton);
  }

  private createKeyBindingRow(
    x: number,
    y: number,
    label: string,
    action: string
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const labelText = this.add.text(-150, 0, label, {
      fontSize: '14px',
      color: '#dcdcdc',
      fontFamily: 'Arial'
    }).setOrigin(0, 0.5);
    container.add(labelText);

    const currentKey = this.settingsManager.getKeyBinding(action);
    const isRebinding = this.rebindingAction === action;

    const btnWidth = 100;
    const btnHeight = 28;
    const btnX = 80;

    const bgColor = isRebinding ? 0x444422 : 0x222222;
    const borderColor = isRebinding ? 0xf0c850 : 0x444444;

    const keyBg = this.add.rectangle(btnX, 0, btnWidth, btnHeight, bgColor, 0.9);
    keyBg.setStrokeStyle(2, borderColor);
    keyBg.setInteractive({ useHandCursor: true });
    container.add(keyBg);

    const keyText = this.add.text(btnX, 0, isRebinding ? 'PRESS KEY...' : currentKey, {
      fontSize: '12px',
      color: isRebinding ? '#f0c850' : '#46b4f0',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    container.add(keyText);

    if (!isRebinding) {
      keyBg.on('pointerdown', () => {
        this.rebindingAction = action;
        this.soundManager.playUiClick();
        this.rebuildControlsPanel();
        this.startKeyRebind(action);
      });

      keyBg.on('pointerover', () => {
        keyBg.setFillStyle(0x333333, 0.9);
      });

      keyBg.on('pointerout', () => {
        keyBg.setFillStyle(0x222222, 0.9);
      });
    }

    return container;
  }

  private startKeyRebind(action: string) {
    const listener = (event: KeyboardEvent) => {
      event.preventDefault();

      if (event.key === 'Escape') {
        this.rebindingAction = null;
        this.rebuildControlsPanel();
        return;
      }

      let keyName = event.key.toUpperCase();
      if (keyName === ' ') keyName = 'SPACE';
      if (keyName === 'ARROWUP') keyName = 'UP';
      if (keyName === 'ARROWDOWN') keyName = 'DOWN';
      if (keyName === 'ARROWLEFT') keyName = 'LEFT';
      if (keyName === 'ARROWRIGHT') keyName = 'RIGHT';

      this.settingsManager.setKeyBinding(action, keyName);
      this.rebindingAction = null;
      this.soundManager.playUiClick();
      this.rebuildControlsPanel();
    };

    this.input.keyboard!.once('keydown', listener);
  }

  private createCreditsPanel() {
    this.creditsContainer = this.add.container(0, 0);
    this.creditsContainer.setVisible(false);
    this.creditsContainer.setDepth(50);
  }

  private rebuildCreditsPanel() {
    this.creditsContainer.removeAll(true);

    const overlay = this.add.rectangle(
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT / 2,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
      0x000000,
      0.8
    );
    this.creditsContainer.add(overlay);

    const panelW = 450;
    const panelH = 380;
    const panelX = SCREEN_WIDTH / 2;
    const panelY = SCREEN_HEIGHT / 2;

    const shadowPanel = this.add.rectangle(
      panelX + UI.SHADOW_OFFSET,
      panelY + UI.SHADOW_OFFSET,
      panelW,
      panelH,
      UI.COLORS.SHADOW,
      UI.ALPHA.SHADOW
    );
    this.creditsContainer.add(shadowPanel);

    const panel = this.add.rectangle(panelX, panelY, panelW, panelH, 0x1a1612, UI.ALPHA.PANEL);
    panel.setStrokeStyle(2, 0x3d3830);
    this.creditsContainer.add(panel);

    const title = this.add.text(panelX, panelY - 160, 'CREDITS', {
      fontSize: '24px',
      color: '#f0c850',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    this.creditsContainer.add(title);

    const credits = [
      { role: 'Original Game', name: '10tons Ltd' },
      { role: '', name: '' },
      { role: 'Web Port', name: 'Crimsonland Community' },
      { role: '', name: '' },
      { role: 'Game Design', name: 'Crimsonland Team' },
      { role: 'Programming', name: '10tons Ltd' },
      { role: 'Art & Graphics', name: '10tons Ltd' },
      { role: 'Music & Sound', name: '10tons Ltd' },
      { role: '', name: '' },
      { role: 'Built with', name: 'Phaser 3' }
    ];

    let rowY = panelY - 110;
    const rowStep = 28;

    for (const credit of credits) {
      if (credit.role === '' && credit.name === '') {
        rowY += 10;
        continue;
      }

      if (credit.role) {
        const roleText = this.add.text(panelX, rowY, credit.role, {
          fontSize: '12px',
          color: '#aaaab4',
          fontFamily: 'Arial'
        }).setOrigin(0.5);
        this.creditsContainer.add(roleText);
        rowY += 18;
      }

      const nameText = this.add.text(panelX, rowY, credit.name, {
        fontSize: '14px',
        color: '#dcdcdc',
        fontFamily: 'Arial Black'
      }).setOrigin(0.5);
      this.creditsContainer.add(nameText);
      rowY += rowStep;
    }

    const backButton = this.createClassicSmallButton(panelX, panelY + 150, 'BACK', () => {
      this.showMain();
    });
    this.creditsContainer.add(backButton);
  }

  private startGame() {
    this.soundManager.stopMusic(0);
    this.input.setDefaultCursor('default');
    this.scene.start('GameScene', { gameMode: this.selectedMode });
  }

  private startTutorial() {
    this.soundManager.stopMusic(0);
    this.input.setDefaultCursor('default');
    this.scene.start('TutorialScene');
  }

  private startTypo() {
    this.soundManager.stopMusic(0);
    this.input.setDefaultCursor('default');
    this.scene.start('TypoScene');
  }

  private createQuestSelect() {
    this.questSelectContainer = this.add.container(0, 0);
    this.questSelectContainer.setVisible(false);
    this.questSelectContainer.setDepth(50);
  }

  private rebuildQuestSelect() {
    this.questSelectContainer.removeAll(true);

    const overlay = this.add.rectangle(
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT / 2,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
      0x000000,
      0.8
    );
    this.questSelectContainer.add(overlay);

    const panelW = 600;
    const panelH = 520;
    const panelX = SCREEN_WIDTH / 2;
    const panelY = SCREEN_HEIGHT / 2;

    const shadowPanel = this.add.rectangle(
      panelX + UI.SHADOW_OFFSET,
      panelY + UI.SHADOW_OFFSET,
      panelW,
      panelH,
      UI.COLORS.SHADOW,
      UI.ALPHA.SHADOW
    );
    this.questSelectContainer.add(shadowPanel);

    const panel = this.add.rectangle(panelX, panelY, panelW, panelH, 0x1a1612, UI.ALPHA.PANEL);
    panel.setStrokeStyle(2, 0x3d3830);
    this.questSelectContainer.add(panel);

    const completedCount = getCompletedQuestCount(this.questProgress);
    const totalCount = getTotalQuestCount();
    const title = this.add.text(panelX, panelY - 230, `QUEST MODE (${completedCount}/${totalCount})`, {
      fontSize: '24px',
      color: '#f0c850',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    this.questSelectContainer.add(title);

    const tierCount = getTierCount();
    const tabWidth = 80;
    const tabStartX = panelX - ((tierCount - 1) * tabWidth) / 2;

    for (let tier = 1; tier <= tierCount; tier++) {
      const tabX = tabStartX + (tier - 1) * tabWidth;
      const isActive = tier === this.selectedQuestTier;
      const tierQuests = getQuestsByTier(tier);
      const tierCompleted = tierQuests.filter(q => this.questProgress[q.level]?.completed).length;

      const tab = this.createTabButton(
        tabX,
        panelY - 190,
        `Tier ${tier}`,
        isActive,
        () => {
          this.selectedQuestTier = tier;
          this.rebuildQuestSelect();
        }
      );
      this.questSelectContainer.add(tab);

      const progressText = this.add.text(tabX, panelY - 170, `${tierCompleted}/${tierQuests.length}`, {
        fontSize: '10px',
        color: '#888888',
        fontFamily: 'Arial'
      }).setOrigin(0.5);
      this.questSelectContainer.add(progressText);
    }

    const quests = getQuestsByTier(this.selectedQuestTier);
    const questsPerRow = 5;
    const questSpacingX = 110;
    const questSpacingY = 80;

    for (let i = 0; i < quests.length; i++) {
      const quest = quests[i];
      const row = Math.floor(i / questsPerRow);
      const col = i % questsPerRow;

      const questX = panelX - ((questsPerRow - 1) * questSpacingX) / 2 + col * questSpacingX;
      const questY = panelY - 100 + row * questSpacingY;

      const isUnlocked = isQuestUnlocked(quest.level, this.questProgress);
      const isCompleted = this.questProgress[quest.level]?.completed ?? false;

      const btn = this.createQuestButton(questX, questY, quest, isUnlocked, isCompleted);
      this.questSelectContainer.add(btn);
    }

    const backBtn = this.createClassicSmallButton(panelX, panelY + 220, 'BACK', () => {
      this.showModeSelect();
    });
    this.questSelectContainer.add(backBtn);
  }

  private createQuestButton(
    x: number,
    y: number,
    quest: QuestDefinition,
    isUnlocked: boolean,
    isCompleted: boolean
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const btnW = 100;
    const btnH = 70;

    let bgColor = 0x222222;
    let borderColor = 0x444444;
    let textColor = '#666666';
    let statusIcon = '';

    if (isCompleted) {
      bgColor = 0x224422;
      borderColor = 0x44aa44;
      textColor = '#88ff88';
      statusIcon = '[v]';
    } else if (isUnlocked) {
      bgColor = 0x222244;
      borderColor = 0x4444aa;
      textColor = '#8888ff';
      statusIcon = '';
    } else {
      statusIcon = '[X]';
    }

    const bg = this.add.rectangle(0, 0, btnW, btnH, bgColor, 0.9);
    bg.setStrokeStyle(2, borderColor);

    if (isUnlocked) {
      bg.setInteractive({ useHandCursor: true });

      bg.on('pointerover', () => {
        bg.setFillStyle(isCompleted ? 0x336633 : 0x333366, 0.9);
        bg.setStrokeStyle(2, isCompleted ? 0x66cc66 : 0x6666cc);
      });

      bg.on('pointerout', () => {
        bg.setFillStyle(bgColor, 0.9);
        bg.setStrokeStyle(2, borderColor);
      });

      bg.on('pointerdown', () => {
        this.startQuest(quest.level);
      });
    }

    const levelLabel = this.add.text(0, -20, quest.level, {
      fontSize: '14px',
      color: textColor,
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    const titleLabel = this.add.text(0, 5, this.truncateText(quest.title, 12), {
      fontSize: '10px',
      color: isUnlocked ? '#dcdcdc' : '#666666',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    if (statusIcon) {
      const statusLabel = this.add.text(0, 22, statusIcon, {
        fontSize: '10px',
        color: isCompleted ? '#44ff44' : '#ff4444',
        fontFamily: 'Arial'
      }).setOrigin(0.5);
      container.add(statusLabel);
    }

    if (isCompleted && this.questProgress[quest.level]?.bestTimeMs) {
      const timeStr = this.formatQuestTime(this.questProgress[quest.level].bestTimeMs!);
      const timeLabel = this.add.text(0, 22, timeStr, {
        fontSize: '9px',
        color: '#888888',
        fontFamily: 'Arial'
      }).setOrigin(0.5);
      container.add(timeLabel);
    }

    container.add([bg, levelLabel, titleLabel]);
    return container;
  }

  private truncateText(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen - 2) + '..';
  }

  private formatQuestTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private showQuestSelect() {
    this.menuState = 'quest_select';
    this.menuGraphics.clear();
    this.menuTexts.forEach(t => t.destroy());
    this.menuTexts = [];
    this.hideAllContainers();
    this.questSelectContainer.setVisible(true);
    this.questProgress = loadQuestProgress();
    this.rebuildQuestSelect();
    this.input.setDefaultCursor('none');
    if (this.cursorSprite) this.cursorSprite.setVisible(true);
  }

  private startQuest(questLevel: string) {
    this.soundManager.stopMusic(0);
    this.input.setDefaultCursor('default');
    this.scene.start('QuestScene', { questLevel });
  }
}
