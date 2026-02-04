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

    graphics.fillStyle(0xcc4444, 1);
    graphics.fillCircle(12, 12, 12);
    graphics.generateTexture('fast_zombie', 24, 24);
    graphics.clear();

    graphics.fillStyle(0x9b59b6, 1);
    graphics.fillCircle(8, 8, 8);
    graphics.generateTexture('spider', 16, 16);
    graphics.clear();

    graphics.fillStyle(0x8e44ad, 1);
    graphics.fillCircle(20, 20, 20);
    graphics.generateTexture('spider_mother', 40, 40);
    graphics.clear();

    graphics.fillStyle(0x27ae60, 1);
    graphics.fillCircle(14, 14, 14);
    graphics.generateTexture('alien', 28, 28);
    graphics.clear();

    graphics.fillStyle(0xffd93d, 1);
    graphics.fillRect(0, 0, 8, 4);
    graphics.generateTexture('bullet', 8, 4);
    graphics.clear();

    graphics.fillStyle(0x00ffff, 1);
    graphics.fillCircle(6, 6, 6);
    graphics.generateTexture('plasma', 12, 12);
    graphics.clear();

    graphics.fillStyle(0xff6600, 1);
    graphics.fillCircle(8, 8, 8);
    graphics.fillStyle(0xffaa00, 1);
    graphics.fillCircle(8, 8, 5);
    graphics.generateTexture('flame', 16, 16);
    graphics.clear();

    graphics.fillStyle(0x00ff00, 1);
    graphics.fillRect(0, 1, 6, 2);
    graphics.generateTexture('alien_projectile', 6, 4);
    graphics.clear();

    graphics.fillStyle(0xffd93d, 1);
    graphics.fillCircle(6, 6, 6);
    graphics.generateTexture('xp_orb', 12, 12);
    graphics.clear();

    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(2, 2, 2);
    graphics.generateTexture('hit_spark', 4, 4);
    graphics.clear();

    graphics.fillStyle(0xff0000, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('blood_particle', 8, 8);
    graphics.clear();

    graphics.fillStyle(0x8b0000, 0.6);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture('blood_decal', 32, 32);
    graphics.clear();

    graphics.fillStyle(0xffaa00, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('muzzle_flash', 8, 8);
    graphics.clear();

    graphics.destroy();
  }

  create() {
    this.scene.start('MenuScene');
  }
}
