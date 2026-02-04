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

    graphics.fillStyle(0x993333, 1);
    graphics.fillCircle(18, 18, 18);
    graphics.generateTexture('big_zombie', 36, 36);
    graphics.clear();

    graphics.fillStyle(0x9b59b6, 1);
    graphics.fillCircle(8, 8, 8);
    graphics.generateTexture('spider', 16, 16);
    graphics.clear();

    graphics.fillStyle(0xbb77cc, 1);
    graphics.fillCircle(5, 5, 5);
    graphics.generateTexture('baby_spider', 10, 10);
    graphics.clear();

    graphics.fillStyle(0x8e44ad, 1);
    graphics.fillCircle(20, 20, 20);
    graphics.generateTexture('spider_mother', 40, 40);
    graphics.clear();

    graphics.fillStyle(0x27ae60, 1);
    graphics.fillCircle(14, 14, 14);
    graphics.generateTexture('alien', 28, 28);
    graphics.clear();

    graphics.fillStyle(0x2ecc71, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture('alien_elite', 32, 32);
    graphics.clear();

    graphics.fillStyle(0x1abc9c, 1);
    graphics.fillCircle(28, 28, 28);
    graphics.generateTexture('alien_boss', 56, 56);
    graphics.clear();

    graphics.fillStyle(0xe67e22, 1);
    graphics.fillCircle(12, 12, 12);
    graphics.generateTexture('lizard', 24, 24);
    graphics.clear();

    graphics.fillStyle(0xd35400, 1);
    graphics.fillCircle(12, 12, 12);
    graphics.generateTexture('lizard_spitter', 24, 24);
    graphics.clear();

    graphics.fillStyle(0x7f8c8d, 1);
    graphics.fillCircle(24, 24, 24);
    graphics.generateTexture('nest', 48, 48);
    graphics.clear();

    graphics.fillStyle(0xe74c3c, 1);
    graphics.fillCircle(32, 32, 32);
    graphics.generateTexture('boss', 64, 64);
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

    graphics.fillStyle(0x00ffaa, 1);
    graphics.fillRect(0, 1, 24, 2);
    graphics.generateTexture('gauss', 24, 4);
    graphics.clear();

    graphics.fillStyle(0xff4444, 1);
    graphics.fillRect(0, 0, 12, 6);
    graphics.fillStyle(0xffff00, 1);
    graphics.fillRect(12, 2, 4, 2);
    graphics.generateTexture('rocket', 16, 6);
    graphics.clear();

    graphics.fillStyle(0xff0000, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(16, 16, 8);
    graphics.generateTexture('nuke', 32, 32);
    graphics.clear();

    graphics.fillStyle(0x8800ff, 1);
    graphics.fillCircle(5, 5, 5);
    graphics.generateTexture('ion', 10, 10);
    graphics.clear();

    graphics.fillStyle(0xcccccc, 1);
    graphics.fillRect(0, 2, 16, 4);
    graphics.generateTexture('blade', 16, 8);
    graphics.clear();

    graphics.fillStyle(0xff00ff, 1);
    graphics.fillCircle(6, 6, 6);
    graphics.generateTexture('pulse', 12, 12);
    graphics.clear();

    graphics.fillStyle(0x00ff00, 1);
    graphics.fillCircle(6, 6, 6);
    graphics.generateTexture('shrink', 12, 12);
    graphics.clear();

    graphics.fillStyle(0xffaa00, 1);
    graphics.fillCircle(8, 8, 8);
    graphics.generateTexture('splitter', 16, 16);
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

    graphics.fillStyle(0xff8800, 1);
    graphics.fillCircle(32, 32, 32);
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(32, 32, 20);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(32, 32, 8);
    graphics.generateTexture('explosion', 64, 64);
    graphics.clear();

    graphics.fillStyle(0xffd700, 1);
    graphics.fillCircle(10, 10, 10);
    graphics.generateTexture('bonus_xp', 20, 20);
    graphics.clear();

    graphics.fillStyle(0xffa500, 1);
    graphics.fillCircle(12, 12, 12);
    graphics.generateTexture('bonus_xp_medium', 24, 24);
    graphics.clear();

    graphics.fillStyle(0xff8c00, 1);
    graphics.fillCircle(14, 14, 14);
    graphics.generateTexture('bonus_xp_large', 28, 28);
    graphics.clear();

    graphics.fillStyle(0x00ff00, 1);
    graphics.fillRoundedRect(2, 6, 20, 12, 2);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(10, 8, 4, 8);
    graphics.fillRect(8, 10, 8, 4);
    graphics.generateTexture('bonus_health', 24, 24);
    graphics.clear();

    graphics.fillStyle(0x888888, 1);
    graphics.fillRoundedRect(4, 8, 16, 8, 2);
    graphics.fillStyle(0xcccccc, 1);
    graphics.fillRect(4, 10, 16, 4);
    graphics.generateTexture('bonus_weapon', 24, 24);
    graphics.clear();

    graphics.fillStyle(0x00ffff, 1);
    graphics.fillCircle(12, 12, 12);
    graphics.fillStyle(0x88ffff, 1);
    graphics.fillCircle(12, 12, 8);
    graphics.generateTexture('bonus_freeze', 24, 24);
    graphics.clear();

    graphics.fillStyle(0xff4444, 1);
    graphics.fillCircle(12, 12, 12);
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(12, 12, 6);
    graphics.generateTexture('bonus_nuke', 24, 24);
    graphics.clear();

    graphics.fillStyle(0x00ff00, 1);
    graphics.beginPath();
    graphics.moveTo(12, 0);
    graphics.lineTo(24, 18);
    graphics.lineTo(0, 18);
    graphics.closePath();
    graphics.fillPath();
    graphics.generateTexture('bonus_speed', 24, 24);
    graphics.clear();

    graphics.lineStyle(4, 0x00ffff, 1);
    graphics.strokeCircle(12, 12, 10);
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeCircle(12, 12, 6);
    graphics.generateTexture('bonus_shield', 24, 24);
    graphics.clear();

    graphics.fillStyle(0xff00ff, 1);
    graphics.fillCircle(12, 12, 10);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(12, 12, 5);
    graphics.generateTexture('bonus_reflex', 24, 24);
    graphics.clear();

    graphics.destroy();
  }

  create() {
    this.scene.start('MenuScene');
  }
}
