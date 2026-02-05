import Phaser from 'phaser';
import { PerkId, getPerkData } from '../data/perks';
import { PerkManager } from '../systems/PerkManager';
import { SoundManager } from '../audio/SoundManager';
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

const MENU_PANEL_ANCHOR_X = 224;
const MENU_PANEL_ANCHOR_Y = 40;
const MENU_LIST_Y = 50;
const MENU_LIST_STEP = 19;
const MENU_DESC_X = -12;
const MENU_DESC_Y_AFTER_LIST = 32;

export class PerkSelector {
  private scene: Phaser.Scene;
  private perkManager: PerkManager;
  private container: Phaser.GameObjects.Container;
  private choices: PerkId[] = [];
  private isVisible: boolean = false;
  private selectedIndex: number = 0;
  private numberKeys: Phaser.Input.Keyboard.Key[] = [];
  private arrowUp!: Phaser.Input.Keyboard.Key;
  private arrowDown!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private escapeKey!: Phaser.Input.Keyboard.Key;
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
  private clickHandled: boolean = false;
  private descText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Rectangle;
  private soundManager: SoundManager | null = null;

  constructor(scene: Phaser.Scene, perkManager: PerkManager, soundManager?: SoundManager) {
    this.scene = scene;
    this.perkManager = perkManager;
    this.soundManager = soundManager ?? null;
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
      this.levelUpSprite.setOrigin(0, 0);
      this.levelUpSprite.setScrollFactor(0);
      this.levelUpSprite.setDepth(1001);
      this.levelUpSprite.setVisible(false);
    }

    if (scene.textures.exists('ui_textPickAPerk')) {
      this.pickPerkSprite = scene.add.image(0, 0, 'ui_textPickAPerk');
      this.pickPerkSprite.setOrigin(0, 0);
      this.pickPerkSprite.setScrollFactor(0);
      this.pickPerkSprite.setDepth(1001);
      this.pickPerkSprite.setVisible(false);
    }

    for (let i = 1; i <= 6; i++) {
      const key = `ui_num${i}`;
      if (scene.textures.exists(key)) {
        const sprite = scene.add.image(0, 0, key);
        sprite.setOrigin(0.5, 0.5);
        sprite.setScrollFactor(0);
        sprite.setDepth(1002);
        sprite.setVisible(false);
        this.numberSprites.push(sprite);
      }
    }

    this.overlay = scene.add.rectangle(
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT / 2,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
      0x000000,
      0.5
    );
    this.overlay.setScrollFactor(0);
    this.overlay.setDepth(997);
    this.overlay.setVisible(false);

    this.descText = scene.add.text(0, 0, '', {
      fontSize: '12px',
      color: '#dcdcdc',
      fontFamily: 'Arial',
      wordWrap: { width: 400 }
    });
    this.descText.setScrollFactor(0);
    this.descText.setDepth(1003);
    this.descText.setVisible(false);

    const keyboard = scene.input.keyboard!;
    this.numberKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SIX)
    ];
    this.arrowUp = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.arrowDown = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.enterKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escapeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  setCallback(callback: (perkId: PerkId) => void) {
    this.onPerkSelected = callback;
  }

  show() {
    this.choices = this.perkManager.generatePerkChoices();
    if (this.choices.length === 0) {
      return;
    }

    this.soundManager?.playUiPanelClick();

    this.selectedIndex = 0;
    this.isVisible = true;
    this.slideTimeMs = 0;
    this.clickHandled = true;

    this.container.removeAll(true);
    this.panelTexts = [];

    this.panelGraphics.setVisible(true);
    this.container.setVisible(true);
    this.overlay.setVisible(true);
    if (this.menuPanelSprite) this.menuPanelSprite.setVisible(true);
    if (this.levelUpSprite) this.levelUpSprite.setVisible(true);
    if (this.pickPerkSprite) this.pickPerkSprite.setVisible(true);
    this.numberSprites.forEach((s, i) => s.setVisible(i < this.choices.length));
    this.descText.setVisible(true);
  }

  hide() {
    this.isVisible = false;
    this.container.setVisible(false);
    this.panelGraphics.setVisible(false);
    this.panelGraphics.clear();
    this.panelTexts.forEach(t => t.destroy());
    this.panelTexts = [];
    this.overlay.setVisible(false);
    if (this.menuPanelSprite) this.menuPanelSprite.setVisible(false);
    if (this.levelUpSprite) this.levelUpSprite.setVisible(false);
    if (this.pickPerkSprite) this.pickPerkSprite.setVisible(false);
    this.numberSprites.forEach(s => s.setVisible(false));
    this.descText.setVisible(false);
  }

  isOpen(): boolean {
    return this.isVisible;
  }

  update() {
    if (!this.isVisible) return;

    const delta = this.scene.game.loop.delta;
    this.slideTimeMs = Math.min(UI.PERK.ANIM_START_MS, this.slideTimeMs + delta);

    this.drawPanel();

    if (Phaser.Input.Keyboard.JustDown(this.arrowDown)) {
      this.selectedIndex = (this.selectedIndex + 1) % this.choices.length;
    }
    if (Phaser.Input.Keyboard.JustDown(this.arrowUp)) {
      this.selectedIndex = (this.selectedIndex - 1 + this.choices.length) % this.choices.length;
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.selectPerk(this.selectedIndex);
      return;
    }

    for (let i = 0; i < this.numberKeys.length && i < this.choices.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.numberKeys[i])) {
        this.selectPerk(i);
        return;
      }
    }

    const pointer = this.scene.input.activePointer;

    if (!pointer.isDown) {
      this.clickHandled = false;
    }

    for (let i = 0; i < this.choices.length; i++) {
      const bounds = this.getItemBounds(i);
      if (pointer.x >= bounds.x && pointer.x <= bounds.x + bounds.w &&
          pointer.y >= bounds.y && pointer.y <= bounds.y + bounds.h) {
        this.selectedIndex = i;
        if (pointer.isDown && !this.clickHandled) {
          this.clickHandled = true;
          this.selectPerk(i);
          return;
        }
        break;
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

    const slideX = this.getSlideX();
    const panelX = (UI.PERK.PANEL_X + slideX) * this.perkScale;
    const panelY = (UI.PERK.PANEL_Y + this.widescreenShiftY) * this.perkScale;
    const panelW = UI.PERK.PANEL_W * this.perkScale;
    const panelH = UI.PERK.PANEL_H * this.perkScale;

    if (this.menuPanelSprite) {
      this.menuPanelSprite.setPosition(panelX, panelY);
      this.menuPanelSprite.setDisplaySize(panelW, panelH);
      this.menuPanelSprite.setAlpha(UI.ALPHA.PANEL);
    } else {
      this.panelGraphics.fillStyle(0x1a1612, UI.ALPHA.PANEL);
      this.panelGraphics.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
      this.panelGraphics.lineStyle(2, 0x3d3830, 0.8);
      this.panelGraphics.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);
    }

    const anchorX = panelX + MENU_PANEL_ANCHOR_X * this.perkScale;
    const anchorY = panelY + MENU_PANEL_ANCHOR_Y * this.perkScale;

    if (this.pickPerkSprite) {
      this.pickPerkSprite.setPosition(anchorX + 54 * this.perkScale, anchorY + 6 * this.perkScale);
      this.pickPerkSprite.setScale(this.perkScale);
    }

    const listX = anchorX;
    const listY = anchorY + MENU_LIST_Y * this.perkScale;
    const listStep = MENU_LIST_STEP * this.perkScale;

    for (let i = 0; i < this.choices.length; i++) {
      const perk = getPerkData(this.choices[i]);
      const y = listY + i * listStep;
      const isSelected = i === this.selectedIndex;

      if (i < this.numberSprites.length) {
        this.numberSprites[i].setPosition(listX - 20 * this.perkScale, y + 6 * this.perkScale);
        this.numberSprites[i].setScale(this.perkScale * 0.6);
      }

      const nameColor = isSelected ? '#ffffff' : '#46b4f0';
      const fontSize = Math.floor(14 * this.perkScale);
      const nameText = this.scene.add.text(listX, y, perk.name, {
        fontSize: `${fontSize}px`,
        color: nameColor,
        fontFamily: 'Arial'
      }).setOrigin(0, 0).setScrollFactor(0).setDepth(1002);
      this.panelTexts.push(nameText);

      const stackCount = this.perkManager.getPerkCount(this.choices[i]);
      if (stackCount > 0) {
        const stackText = this.scene.add.text(listX + 200 * this.perkScale, y, `(x${stackCount + 1})`, {
          fontSize: `${Math.floor(12 * this.perkScale)}px`,
          color: '#f0c850',
          fontFamily: 'Arial'
        }).setOrigin(0, 0).setScrollFactor(0).setDepth(1002);
        this.panelTexts.push(stackText);
      }
    }

    const selectedPerk = getPerkData(this.choices[this.selectedIndex]);
    const descY = listY + this.choices.length * listStep + MENU_DESC_Y_AFTER_LIST * this.perkScale;
    this.descText.setPosition(anchorX + MENU_DESC_X * this.perkScale, descY);
    this.descText.setText(selectedPerk.description);
    this.descText.setFontSize(Math.floor(12 * this.perkScale));
    this.descText.setWordWrapWidth(280 * this.perkScale);
  }

  private getItemBounds(index: number): { x: number; y: number; w: number; h: number } {
    const slideX = this.getSlideX();
    const panelX = (UI.PERK.PANEL_X + slideX) * this.perkScale;
    const panelY = (UI.PERK.PANEL_Y + this.widescreenShiftY) * this.perkScale;
    const anchorX = panelX + MENU_PANEL_ANCHOR_X * this.perkScale;
    const anchorY = panelY + MENU_PANEL_ANCHOR_Y * this.perkScale;
    const listX = anchorX;
    const listY = anchorY + MENU_LIST_Y * this.perkScale;
    const listStep = MENU_LIST_STEP * this.perkScale;

    const y = listY + index * listStep;
    return {
      x: listX - 25 * this.perkScale,
      y: y - 2 * this.perkScale,
      w: 280 * this.perkScale,
      h: listStep
    };
  }

  private selectPerk(index: number) {
    if (index < 0 || index >= this.choices.length) return;

    this.soundManager?.playPerkSelect();

    const perkId = this.choices[index];
    this.perkManager.applyPerk(perkId);
    this.onPerkSelected?.(perkId);
    this.hide();
  }
}
