import Phaser from 'phaser';
import { PerkId, getPerkData } from '../data/perks';
import { PerkManager } from '../systems/PerkManager';
import { SCREEN_WIDTH, SCREEN_HEIGHT, UI } from '../config';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
}

function uiScale(screenW: number, screenH: number): number {
  const scale = Math.min(screenW / UI.BASE_WIDTH, screenH / UI.BASE_HEIGHT);
  return Math.max(0.75, Math.min(1.5, scale));
}

function widescreenYShift(screenW: number): number {
  return (screenW / UI.BASE_WIDTH) * 150 - 150;
}

export class PerkSelector {
  private scene: Phaser.Scene;
  private perkManager: PerkManager;
  private container: Phaser.GameObjects.Container;
  private choices: PerkId[] = [];
  private isVisible: boolean = false;
  private selectedIndex: number = 0;
  private choiceButtons: Phaser.GameObjects.Rectangle[] = [];
  private numberKeys: Phaser.Input.Keyboard.Key[] = [];
  private onPerkSelected?: (perkId: PerkId) => void;

  private panelGraphics!: Phaser.GameObjects.Graphics;
  private slideTimeMs: number = 0;
  private panelTexts: Phaser.GameObjects.Text[] = [];
  private perkScale: number = 1;
  private widescreenShiftY: number = 0;
  private menuPanelSprite!: Phaser.GameObjects.Image;
  private levelUpSprite!: Phaser.GameObjects.Image;
  private pickPerkSprite!: Phaser.GameObjects.Image;
  private numberSprites: Phaser.GameObjects.Image[] = [];
  private selectCooldown: boolean = false;

  constructor(scene: Phaser.Scene, perkManager: PerkManager) {
    this.scene = scene;
    this.perkManager = perkManager;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(1000);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);

    this.panelGraphics = scene.add.graphics();
    this.panelGraphics.setScrollFactor(0);
    this.panelGraphics.setDepth(999);
    this.panelGraphics.setVisible(false);

    this.perkScale = uiScale(SCREEN_WIDTH, SCREEN_HEIGHT);
    this.widescreenShiftY = widescreenYShift(SCREEN_WIDTH);

    if (scene.textures.exists('ui_menuPanel')) {
      this.menuPanelSprite = scene.add.image(0, 0, 'ui_menuPanel');
      this.menuPanelSprite.setOrigin(0, 0);
      this.menuPanelSprite.setScrollFactor(0);
      this.menuPanelSprite.setDepth(998);
      this.menuPanelSprite.setVisible(false);
    }

    if (scene.textures.exists('ui_textLevelUp')) {
      this.levelUpSprite = scene.add.image(0, 0, 'ui_textLevelUp');
      this.levelUpSprite.setOrigin(0.5, 0.5);
      this.levelUpSprite.setScrollFactor(0);
      this.levelUpSprite.setDepth(1001);
      this.levelUpSprite.setVisible(false);
      this.levelUpSprite.setScale(this.perkScale);
    }

    if (scene.textures.exists('ui_textPickAPerk')) {
      this.pickPerkSprite = scene.add.image(0, 0, 'ui_textPickAPerk');
      this.pickPerkSprite.setOrigin(0.5, 0.5);
      this.pickPerkSprite.setScrollFactor(0);
      this.pickPerkSprite.setDepth(1001);
      this.pickPerkSprite.setVisible(false);
      this.pickPerkSprite.setScale(this.perkScale);
    }

    for (let i = 1; i <= 5; i++) {
      const key = `ui_num${i}`;
      if (scene.textures.exists(key)) {
        const sprite = scene.add.image(0, 0, key);
        sprite.setOrigin(0.5, 0.5);
        sprite.setScrollFactor(0);
        sprite.setDepth(1002);
        sprite.setVisible(false);
        sprite.setScale(this.perkScale * 0.8);
        this.numberSprites.push(sprite);
      }
    }

    const keyboard = scene.input.keyboard!;
    this.numberKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SIX)
    ];
  }

  setCallback(callback: (perkId: PerkId) => void) {
    this.onPerkSelected = callback;
  }

  show() {
    this.choices = this.perkManager.generatePerkChoices();
    this.selectedIndex = 0;
    this.isVisible = true;
    this.slideTimeMs = 0;
    this.selectCooldown = false;

    this.container.removeAll(true);
    this.choiceButtons = [];
    this.panelTexts = [];

    this.panelGraphics.setVisible(true);
    this.container.setVisible(true);
    if (this.menuPanelSprite) this.menuPanelSprite.setVisible(true);
    if (this.levelUpSprite) this.levelUpSprite.setVisible(true);
    if (this.pickPerkSprite) this.pickPerkSprite.setVisible(true);
    this.numberSprites.forEach((s, i) => s.setVisible(i < this.choices.length));
  }

  hide() {
    this.isVisible = false;
    this.container.setVisible(false);
    this.panelGraphics.setVisible(false);
    this.panelGraphics.clear();
    this.panelTexts.forEach(t => t.destroy());
    this.panelTexts = [];
    if (this.menuPanelSprite) this.menuPanelSprite.setVisible(false);
    if (this.levelUpSprite) this.levelUpSprite.setVisible(false);
    if (this.pickPerkSprite) this.pickPerkSprite.setVisible(false);
    this.numberSprites.forEach(s => s.setVisible(false));
  }

  isOpen(): boolean {
    return this.isVisible;
  }

  update() {
    if (!this.isVisible) return;

    const delta = this.scene.game.loop.delta;
    this.slideTimeMs = Math.min(UI.PERK.ANIM_START_MS, this.slideTimeMs + delta);

    this.drawPanel();

    for (let i = 0; i < this.numberKeys.length && i < this.choices.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.numberKeys[i])) {
        this.selectPerk(i);
        return;
      }
    }

    const pointer = this.scene.input.activePointer;
    const justClicked = pointer.isDown && pointer.getDuration() < 100;
    for (let i = 0; i < this.choices.length; i++) {
      const bounds = this.getItemBounds(i);
      if (pointer.x >= bounds.x && pointer.x <= bounds.x + bounds.w &&
          pointer.y >= bounds.y && pointer.y <= bounds.y + bounds.h) {
        this.selectedIndex = i;
        if (justClicked) {
          this.selectPerk(i);
          return;
        }
      }
    }
  }

  private getSlideX(): number {
    const width = UI.PERK.PANEL_W;
    const startMs = UI.PERK.ANIM_START_MS;
    const endMs = UI.PERK.ANIM_END_MS;

    if (this.slideTimeMs < endMs) {
      return -width;
    } else if (this.slideTimeMs < startMs) {
      const elapsed = this.slideTimeMs - endMs;
      const span = startMs - endMs;
      const p = elapsed / span;
      return -(1 - easeOutCubic(p)) * width;
    }
    return 0;
  }

  private drawPanel() {
    this.panelGraphics.clear();
    this.panelTexts.forEach(t => t.destroy());
    this.panelTexts = [];
    this.container.removeAll(true);
    this.choiceButtons = [];

    const slideX = this.getSlideX();
    const panelX = (UI.PERK.PANEL_X + slideX) * this.perkScale;
    const panelY = (UI.PERK.PANEL_Y + 50 + this.widescreenShiftY) * this.perkScale;
    const panelW = UI.PERK.PANEL_W * this.perkScale;
    const panelH = UI.PERK.PANEL_H * this.perkScale;

    const overlay = this.scene.add.rectangle(
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT / 2,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
      0x000000,
      0.7
    );
    overlay.setScrollFactor(0);
    this.container.add(overlay);

    if (this.menuPanelSprite) {
      this.menuPanelSprite.setPosition(panelX, panelY);
      this.menuPanelSprite.setDisplaySize(panelW, panelH);
      this.menuPanelSprite.setAlpha(UI.ALPHA.PANEL);
    } else {
      this.panelGraphics.fillStyle(UI.COLORS.SHADOW, UI.ALPHA.SHADOW);
      this.panelGraphics.fillRoundedRect(
        panelX + UI.SHADOW_OFFSET,
        panelY + UI.SHADOW_OFFSET,
        panelW,
        panelH,
        8
      );

      this.panelGraphics.fillStyle(0x1a1612, UI.ALPHA.PANEL);
      this.panelGraphics.fillRoundedRect(panelX, panelY, panelW, panelH, 8);

      this.panelGraphics.lineStyle(2, 0x3d3830, 0.8);
      this.panelGraphics.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);

      this.panelGraphics.lineStyle(1, 0x4a4438, 0.5);
      this.panelGraphics.strokeRoundedRect(panelX + 4, panelY + 4, panelW - 8, panelH - 8, 6);
    }

    const titleX = panelX + (224 + UI.PERK.TITLE_X) * this.perkScale;
    const titleY = panelY + (40 + UI.PERK.TITLE_Y) * this.perkScale;

    if (this.levelUpSprite) {
      this.levelUpSprite.setPosition(titleX, titleY);
    } else {
      const title = this.scene.add.text(titleX, titleY, 'LEVEL UP!', {
        fontSize: `${Math.floor(20 * this.perkScale)}px`,
        color: '#f0c850',
        fontFamily: 'Arial Black'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
      this.panelTexts.push(title);
    }

    const subtitleY = titleY + 28 * this.perkScale;
    if (this.pickPerkSprite) {
      this.pickPerkSprite.setPosition(titleX, subtitleY);
    } else {
      const subtitle = this.scene.add.text(titleX, subtitleY, 'Choose a perk:', {
        fontSize: `${Math.floor(14 * this.perkScale)}px`,
        color: '#dcdcdc',
        fontFamily: 'Arial'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
      this.panelTexts.push(subtitle);
    }

    const listX = panelX + 224 * this.perkScale;
    const listY = panelY + (40 + UI.PERK.LIST_Y + 30) * this.perkScale;
    const listStep = (UI.PERK.LIST_STEP + 40) * this.perkScale;

    for (let i = 0; i < this.choices.length; i++) {
      const perk = getPerkData(this.choices[i]);
      const y = listY + i * listStep;

      const isSelected = i === this.selectedIndex;
      const bgColor = isSelected ? 0x333322 : 0x222222;
      const borderColor = isSelected ? UI.COLORS.MENU_ITEM : 0x444444;

      const bg = this.scene.add.rectangle(listX, y, 420 * this.perkScale, 50 * this.perkScale, bgColor, 0.9);
      bg.setStrokeStyle(2, borderColor);
      bg.setScrollFactor(0);
      bg.setDepth(1001);
      bg.setInteractive({ useHandCursor: true });
      this.container.add(bg);
      this.choiceButtons.push(bg);

      bg.on('pointerover', () => {
        this.selectedIndex = i;
      });

      bg.on('pointerdown', () => {
        this.selectPerk(i);
      });

      if (i < this.numberSprites.length) {
        this.numberSprites[i].setPosition(listX - 190 * this.perkScale, y);
      } else {
        const keyHint = this.scene.add.text(listX - 190 * this.perkScale, y, `${i + 1}`, {
          fontSize: `${Math.floor(18 * this.perkScale)}px`,
          color: '#888888',
          fontFamily: 'Arial Black'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);
        this.panelTexts.push(keyHint);
      }

      const nameColor = isSelected ? '#ffffff' : '#46b4f0';
      const nameText = this.scene.add.text(listX - 160 * this.perkScale, y - 8 * this.perkScale, perk.name, {
        fontSize: `${Math.floor(16 * this.perkScale)}px`,
        color: nameColor,
        fontFamily: 'Arial Black'
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(1002);
      this.panelTexts.push(nameText);

      const descText = this.scene.add.text(listX - 160 * this.perkScale, y + 10 * this.perkScale, perk.description, {
        fontSize: `${Math.floor(12 * this.perkScale)}px`,
        color: '#aaaab4',
        fontFamily: 'Arial'
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(1002);
      this.panelTexts.push(descText);

      const stackCount = this.perkManager.getPerkCount(this.choices[i]);
      if (stackCount > 0) {
        const stackText = this.scene.add.text(listX + 180 * this.perkScale, y, `x${stackCount}`, {
          fontSize: `${Math.floor(14 * this.perkScale)}px`,
          color: '#f0c850',
          fontFamily: 'Arial'
        }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(1002);
        this.panelTexts.push(stackText);
      }
    }

    const cancelY = panelY + (40 + UI.PERK.BUTTON_Y) * this.perkScale;
    const cancelBtn = this.createButton(listX, cancelY, 'Cancel', () => {
      this.hide();
    });
    this.container.add(cancelBtn);
  }

  private getItemBounds(index: number): { x: number; y: number; w: number; h: number } {
    const slideX = this.getSlideX();
    const panelX = (UI.PERK.PANEL_X + slideX) * this.perkScale;
    const panelY = (UI.PERK.PANEL_Y + 50 + this.widescreenShiftY) * this.perkScale;
    const listX = panelX + 224 * this.perkScale;
    const listY = panelY + (40 + UI.PERK.LIST_Y + 30) * this.perkScale;
    const listStep = (UI.PERK.LIST_STEP + 40) * this.perkScale;

    const y = listY + index * listStep;
    return {
      x: listX - 210 * this.perkScale,
      y: y - 25 * this.perkScale,
      w: 420 * this.perkScale,
      h: 50 * this.perkScale
    };
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setScrollFactor(0);
    container.setDepth(1002);

    const btnW = 145;
    const btnH = 32;

    const bg = this.scene.add.rectangle(0, 0, btnW, btnH, 0x222222, 0.9);
    bg.setStrokeStyle(2, 0x444444);
    bg.setInteractive({ useHandCursor: true });

    const text = this.scene.add.text(0, 0, label, {
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

  private selectPerk(index: number) {
    if (index < 0 || index >= this.choices.length) return;
    if (this.selectCooldown) return;

    this.selectCooldown = true;
    const perkId = this.choices[index];
    this.perkManager.applyPerk(perkId);
    this.onPerkSelected?.(perkId);
    this.hide();
  }
}
