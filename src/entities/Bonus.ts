import Phaser from 'phaser';
import { BonusType, getBonusData } from '../data/bonuses';

export class Bonus extends Phaser.Physics.Arcade.Sprite {
  bonusType: BonusType;
  private lifespan: number = 0;
  private maxLifespan: number = 15000;
  private bobOffset: number = 0;
  private baseY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, type: BonusType) {
    const data = getBonusData(type);
    super(scene, x, y, data.sprite);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.bonusType = type;
    this.baseY = y;
    this.setCircle(10, 2, 2);
    this.setDepth(5);

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  update(delta: number, playerX: number, playerY: number, hasBonusMagnet: boolean) {
    if (!this.active) return;

    this.lifespan += delta;

    this.bobOffset += delta * 0.005;
    this.y = this.baseY + Math.sin(this.bobOffset) * 3;

    if (hasBonusMagnet) {
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 200 && dist > 0) {
        const pullSpeed = 150;
        this.setVelocity(
          (dx / dist) * pullSpeed,
          (dy / dist) * pullSpeed
        );
      }
    }

    if (this.lifespan > this.maxLifespan - 3000) {
      this.setAlpha(0.5 + 0.5 * Math.sin(this.lifespan * 0.01));
    }

    if (this.lifespan >= this.maxLifespan) {
      this.destroy();
    }
  }

  destroy(fromScene?: boolean) {
    this.setActive(false);
    this.setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
    }
  }
}
