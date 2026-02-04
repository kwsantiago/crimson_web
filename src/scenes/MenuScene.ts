import Phaser from 'phaser';
import { HighScoreManager } from '../systems/HighScoreManager';
import { GameMode, GAME_MODE_CONFIGS } from '../data/gameModes';
import { SCREEN_WIDTH, SCREEN_HEIGHT, UI } from '../config';

type MenuState = 'main' | 'mode_select' | 'scores';

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
  private menuState: MenuState = 'main';
  private selectedMode: GameMode = GameMode.SURVIVAL;
  private mainContainer!: Phaser.GameObjects.Container;
  private modeSelectContainer!: Phaser.GameObjects.Container;
  private scoresContainer!: Phaser.GameObjects.Container;
  private scoresMode: GameMode = GameMode.SURVIVAL;

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

  constructor() {
    super('MenuScene');
  }

  init() {
    this.menuState = 'main';
    this.selectedMode = GameMode.SURVIVAL;
    this.scoresMode = GameMode.SURVIVAL;
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
    }

    this.createMainMenu();
    this.createModeSelect();
    this.createScoresMenu();

    this.input.setDefaultCursor('none');

    this.showMain();
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
    if (this.cursorSprite && this.cursorSprite.visible) {
      this.cursorSprite.setPosition(pointer.x, pointer.y);
    }
  }

  private initMenuEntries() {
    const baseY = UI.MENU.LABEL_BASE_Y + this.widescreenShiftY;
    const step = UI.MENU.LABEL_STEP;

    this.menuEntries = [
      { slot: 1, label: 'PLAY GAME', action: 'play', y: baseY + step, hoverAmount: 0, enabled: true },
      { slot: 2, label: 'OPTIONS', action: 'options', y: baseY + step * 2, hoverAmount: 0, enabled: false },
      { slot: 3, label: 'HIGH SCORES', action: 'scores', y: baseY + step * 3, hoverAmount: 0, enabled: true },
      { slot: 4, label: 'QUIT', action: 'quit', y: baseY + step * 4, hoverAmount: 0, enabled: false },
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

    const left = posX + 200;
    const top = posY - 50;
    const w = 150;
    const h = 40;

    return { x: left, y: top, w, h };
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

    this.input.activePointer.isDown = false;

    switch (entry.action) {
      case 'play':
        this.showModeSelect();
        break;
      case 'scores':
        this.showScores();
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
        ? (100 + (entry.hoverAmount * 155) / 1000) / 255
        : 0.3;

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
    const panelH = 320;
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

    const title = this.add.text(panelX, panelY - 120, 'SELECT GAME MODE', {
      fontSize: '24px',
      color: '#f0c850',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    this.modeSelectContainer.add(title);

    const survivalConfig = GAME_MODE_CONFIGS[GameMode.SURVIVAL];
    const survivalBtn = this.createClassicButton(
      panelX,
      panelY - 40,
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
      panelY + 50,
      rushConfig.name.toUpperCase(),
      rushConfig.description,
      () => {
        this.selectedMode = GameMode.RUSH;
        this.startGame();
      }
    );
    this.modeSelectContainer.add(rushBtn);

    const backBtn = this.createClassicSmallButton(panelX, panelY + 130, 'BACK', () => {
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

    const survivalTab = this.createTabButton(panelX - 80, panelY - 140,
      'SURVIVAL', this.scoresMode === GameMode.SURVIVAL, () => {
        this.scoresMode = GameMode.SURVIVAL;
        this.rebuildScoresMenu();
      });
    this.scoresContainer.add(survivalTab);

    const rushTab = this.createTabButton(panelX + 80, panelY - 140,
      'RUSH', this.scoresMode === GameMode.RUSH, () => {
        this.scoresMode = GameMode.RUSH;
        this.rebuildScoresMenu();
      });
    this.scoresContainer.add(rushTab);

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
      const headers = this.add.text(panelX, headerY, 'RANK    SCORE    KILLS    LEVEL    TIME', {
        fontSize: '12px',
        color: '#888888',
        fontFamily: 'Arial'
      }).setOrigin(0.5);
      this.scoresContainer.add(headers);

      for (let i = 0; i < Math.min(scores.length, 10); i++) {
        const score = scores[i];
        const y = headerY + 30 + i * 28;
        const color = i === 0 ? '#f0c850' : i < 3 ? '#dcdcdc' : '#aaaab4';

        const rank = `${i + 1}.`.padStart(3);
        const scoreStr = score.score.toString().padStart(8);
        const kills = score.kills.toString().padStart(6);
        const level = score.level.toString().padStart(6);
        const time = this.highScoreManager.formatTime(score.time);

        const row = this.add.text(panelX, y, `${rank}    ${scoreStr}    ${kills}    ${level}    ${time}`, {
          fontSize: '14px',
          color,
          fontFamily: 'monospace'
        }).setOrigin(0.5);
        this.scoresContainer.add(row);
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

  private showMain() {
    this.menuState = 'main';
    this.timelineMs = 0;
    this.panelOpenSfxPlayed = false;
    this.initMenuEntries();
    this.mainContainer.setVisible(true);
    this.modeSelectContainer.setVisible(false);
    this.scoresContainer.setVisible(false);
    this.input.setDefaultCursor('none');
    if (this.menuPanelSprite) this.menuPanelSprite.setVisible(false);
    if (this.signSprite) this.signSprite.setVisible(false);
    if (this.cursorSprite) this.cursorSprite.setVisible(true);
  }

  private showModeSelect() {
    this.menuState = 'mode_select';
    this.menuGraphics.clear();
    this.menuTexts.forEach(t => t.destroy());
    this.menuTexts = [];
    this.mainContainer.setVisible(false);
    this.modeSelectContainer.setVisible(true);
    this.scoresContainer.setVisible(false);
    this.input.setDefaultCursor('none');
    if (this.menuPanelSprite) this.menuPanelSprite.setVisible(false);
    if (this.signSprite) this.signSprite.setVisible(false);
    if (this.cursorSprite) this.cursorSprite.setVisible(true);
  }

  private showScores() {
    this.menuState = 'scores';
    this.menuGraphics.clear();
    this.menuTexts.forEach(t => t.destroy());
    this.menuTexts = [];
    this.mainContainer.setVisible(false);
    this.modeSelectContainer.setVisible(false);
    this.scoresContainer.setVisible(true);
    this.rebuildScoresMenu();
    this.input.setDefaultCursor('none');
    if (this.menuPanelSprite) this.menuPanelSprite.setVisible(false);
    if (this.signSprite) this.signSprite.setVisible(false);
    if (this.cursorSprite) this.cursorSprite.setVisible(true);
  }

  private startGame() {
    this.input.setDefaultCursor('default');
    this.scene.start('GameScene', { gameMode: this.selectedMode });
  }
}
