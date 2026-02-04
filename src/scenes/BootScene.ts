import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    graphics.fillStyle(0x4ecdc4, 1);
    graphics.fillCircle(16, 16, 12);
    graphics.generateTexture('player', 32, 32);
    graphics.clear();

    graphics.fillStyle(0xff6b6b, 1);
    graphics.fillCircle(14, 14, 14);
    graphics.generateTexture('zombie', 28, 28);
    graphics.clear();

    graphics.fillStyle(0xffd93d, 1);
    graphics.fillRect(0, 0, 8, 4);
    graphics.generateTexture('bullet', 8, 4);
    graphics.clear();

    graphics.fillStyle(0xffd93d, 1);
    graphics.fillCircle(6, 6, 6);
    graphics.generateTexture('xp_orb', 12, 12);
    graphics.clear();

    graphics.destroy();
  }

  create() {
    this.scene.start('MenuScene');
  }
}
