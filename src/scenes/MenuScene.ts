import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add.text(centerX, centerY - 100, 'CRIMSONLAND', {
      fontSize: '48px',
      color: '#ff6b6b',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    this.add.text(centerX, centerY, 'Click to Start', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    this.add.text(centerX, centerY + 60, 'WASD to move | Mouse to aim | Click to shoot', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    this.input.once('pointerdown', () => {
      this.scene.start('GameScene');
    });
  }
}
