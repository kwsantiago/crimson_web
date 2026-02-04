import Phaser from 'phaser';
import { PerkId, getPerkData } from '../data/perks';
import { PerkManager } from '../systems/PerkManager';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../config';

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

  constructor(scene: Phaser.Scene, perkManager: PerkManager) {
    this.scene = scene;
    this.perkManager = perkManager;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(1000);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);

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

    this.container.removeAll(true);
    this.choiceButtons = [];

    const overlay = this.scene.add.rectangle(
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT / 2,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
      0x000000,
      0.7
    );
    this.container.add(overlay);

    const title = this.scene.add.text(
      SCREEN_WIDTH / 2,
      50,
      'CHOOSE A PERK',
      {
        fontSize: '28px',
        color: '#ffd93d',
        fontFamily: 'Arial Black'
      }
    ).setOrigin(0.5);
    this.container.add(title);

    const startY = 120;
    const spacing = 75;

    for (let i = 0; i < this.choices.length; i++) {
      const perk = getPerkData(this.choices[i]);
      const y = startY + i * spacing;

      const bg = this.scene.add.rectangle(
        SCREEN_WIDTH / 2,
        y + 25,
        600,
        65,
        0x222222,
        0.9
      );
      bg.setStrokeStyle(2, 0x444444);
      bg.setInteractive({ useHandCursor: true });
      this.container.add(bg);
      this.choiceButtons.push(bg);

      bg.on('pointerover', () => {
        this.selectedIndex = i;
        this.updateSelection();
      });

      bg.on('pointerdown', () => {
        this.selectPerk(i);
      });

      const keyHint = this.scene.add.text(
        120,
        y + 25,
        `${i + 1}`,
        {
          fontSize: '24px',
          color: '#888888',
          fontFamily: 'Arial Black'
        }
      ).setOrigin(0.5);
      this.container.add(keyHint);

      const nameText = this.scene.add.text(
        160,
        y + 15,
        perk.name,
        {
          fontSize: '18px',
          color: '#ffffff',
          fontFamily: 'Arial Black'
        }
      );
      this.container.add(nameText);

      const descText = this.scene.add.text(
        160,
        y + 38,
        perk.description,
        {
          fontSize: '14px',
          color: '#aaaaaa',
          fontFamily: 'Arial'
        }
      );
      this.container.add(descText);

      const stackCount = this.perkManager.getPerkCount(this.choices[i]);
      if (stackCount > 0) {
        const stackText = this.scene.add.text(
          680,
          y + 25,
          `x${stackCount}`,
          {
            fontSize: '16px',
            color: '#ffd93d',
            fontFamily: 'Arial'
          }
        ).setOrigin(1, 0.5);
        this.container.add(stackText);
      }
    }

    this.updateSelection();
    this.container.setVisible(true);
  }

  hide() {
    this.isVisible = false;
    this.container.setVisible(false);
  }

  isOpen(): boolean {
    return this.isVisible;
  }

  update() {
    if (!this.isVisible) return;

    for (let i = 0; i < this.numberKeys.length && i < this.choices.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.numberKeys[i])) {
        this.selectPerk(i);
        return;
      }
    }
  }

  private updateSelection() {
    for (let i = 0; i < this.choiceButtons.length; i++) {
      const btn = this.choiceButtons[i];
      if (i === this.selectedIndex) {
        btn.setFillStyle(0x444400, 0.9);
        btn.setStrokeStyle(2, 0xffd93d);
      } else {
        btn.setFillStyle(0x222222, 0.9);
        btn.setStrokeStyle(2, 0x444444);
      }
    }
  }

  private selectPerk(index: number) {
    if (index < 0 || index >= this.choices.length) return;

    const perkId = this.choices[index];
    this.perkManager.applyPerk(perkId);
    this.onPerkSelected?.(perkId);
    this.hide();
  }
}
