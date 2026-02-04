import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.spritesheet('trooper_sheet', '/assets/game/trooper.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('zombie_sheet', '/assets/game/zombie.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('alien_sheet', '/assets/game/alien.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('lizard_sheet', '/assets/game/lizard.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('spider_sp1_sheet', '/assets/game/spider_sp1.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('spider_sp2_sheet', '/assets/game/spider_sp2.png', { frameWidth: 64, frameHeight: 64 });

    this.load.spritesheet('projs_sheet', '/assets/game/projs.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('bonuses_sheet', '/assets/game/bonuses.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('particles_sheet', '/assets/game/particles.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('bodyset_sheet', '/assets/game/bodyset.png', { frameWidth: 64, frameHeight: 64 });
    this.load.image('muzzle_flash_img', '/assets/game/muzzleFlash.png');
    this.load.image('arrow', '/assets/game/arrow.png');
    this.load.image('terrain', '/assets/game/crimson/ter/ter_q1_base.png');

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`Failed to load: ${file.key} from ${file.url}`);
    });
  }

  create() {
    this.textures.addSpriteSheet('player', this.textures.get('trooper_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 64,
      frameHeight: 64
    });

    this.textures.addSpriteSheet('zombie', this.textures.get('zombie_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.textures.addSpriteSheet('fast_zombie', this.textures.get('zombie_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.textures.addSpriteSheet('big_zombie', this.textures.get('zombie_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 64,
      frameHeight: 64
    });

    this.textures.addSpriteSheet('spider', this.textures.get('spider_sp1_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.textures.addSpriteSheet('baby_spider', this.textures.get('spider_sp1_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.textures.addSpriteSheet('spider_mother', this.textures.get('spider_sp2_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 64,
      frameHeight: 64
    });

    this.textures.addSpriteSheet('alien', this.textures.get('alien_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.textures.addSpriteSheet('alien_elite', this.textures.get('alien_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.textures.addSpriteSheet('alien_boss', this.textures.get('alien_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 64,
      frameHeight: 64
    });

    this.textures.addSpriteSheet('lizard', this.textures.get('lizard_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.textures.addSpriteSheet('lizard_spitter', this.textures.get('lizard_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 64,
      frameHeight: 64
    });

    this.textures.addSpriteSheet('boss', this.textures.get('zombie_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 64,
      frameHeight: 64
    });

    this.textures.addSpriteSheet('bullet', this.textures.get('projs_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 16,
      frameHeight: 16
    });
    this.textures.addSpriteSheet('plasma', this.textures.get('projs_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 16,
      frameHeight: 16
    });
    this.textures.addSpriteSheet('flame', this.textures.get('projs_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 16,
      frameHeight: 16
    });
    this.textures.addSpriteSheet('rocket', this.textures.get('projs_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 16,
      frameHeight: 16
    });

    this.textures.addSpriteSheet('bonus_health', this.textures.get('bonuses_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 32,
      frameHeight: 32
    });
    this.textures.addSpriteSheet('bonus_weapon', this.textures.get('bonuses_sheet').getSourceImage() as HTMLImageElement, {
      frameWidth: 32,
      frameHeight: 32
    });

    this.createAnimations();
    this.generateFallbackTextures();
    this.scene.start('MenuScene');
  }

  private createAnimations() {
    this.anims.create({
      key: 'player_idle',
      frames: [{ key: 'trooper_sheet', frame: 0 }],
      frameRate: 1
    });

    this.anims.create({
      key: 'player_walk',
      frames: this.anims.generateFrameNumbers('trooper_sheet', { start: 0, end: 7 }),
      frameRate: 12,
      repeat: -1
    });

    this.anims.create({
      key: 'zombie_walk',
      frames: this.anims.generateFrameNumbers('zombie_sheet', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'spider_walk',
      frames: this.anims.generateFrameNumbers('spider_sp1_sheet', { start: 0, end: 7 }),
      frameRate: 12,
      repeat: -1
    });

    this.anims.create({
      key: 'alien_walk',
      frames: this.anims.generateFrameNumbers('alien_sheet', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'lizard_walk',
      frames: this.anims.generateFrameNumbers('lizard_sheet', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });
  }

  private generateFallbackTextures() {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    graphics.fillStyle(0x444444, 1);
    graphics.fillRect(0, 2, 24, 6);
    graphics.fillStyle(0x666666, 1);
    graphics.fillRect(2, 3, 20, 4);
    graphics.fillStyle(0x333333, 1);
    graphics.fillRect(22, 2, 6, 6);
    graphics.generateTexture('gun_sprite', 28, 10);
    graphics.clear();

    graphics.fillStyle(0xffcc00, 1);
    graphics.fillCircle(8, 8, 7);
    graphics.fillStyle(0xffee55, 1);
    graphics.fillCircle(8, 8, 5);
    graphics.generateTexture('xp_orb', 16, 16);
    graphics.clear();

    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(3, 3, 3);
    graphics.generateTexture('hit_spark', 6, 6);
    graphics.clear();

    graphics.fillStyle(0x880000, 1);
    graphics.fillCircle(6, 6, 6);
    graphics.generateTexture('blood_particle', 12, 12);
    graphics.clear();

    const decalCanvas = document.createElement('canvas');
    decalCanvas.width = 48;
    decalCanvas.height = 48;
    const dctx = decalCanvas.getContext('2d')!;
    const gradient = dctx.createRadialGradient(24, 24, 0, 24, 24, 24);
    gradient.addColorStop(0, 'rgba(100, 0, 0, 0.9)');
    gradient.addColorStop(0.5, 'rgba(80, 0, 0, 0.5)');
    gradient.addColorStop(1, 'rgba(40, 0, 0, 0)');
    dctx.fillStyle = gradient;
    dctx.arc(24, 24, 24, 0, Math.PI * 2);
    dctx.fill();
    this.textures.addCanvas('blood_decal', decalCanvas);

    graphics.fillStyle(0xffaa00, 1);
    graphics.fillCircle(6, 6, 6);
    graphics.fillStyle(0xffff88, 1);
    graphics.fillCircle(4, 4, 3);
    graphics.generateTexture('muzzle_flash', 12, 12);
    graphics.clear();

    const expCanvas = document.createElement('canvas');
    expCanvas.width = 96;
    expCanvas.height = 96;
    const ectx = expCanvas.getContext('2d')!;
    const expGradient = ectx.createRadialGradient(48, 48, 0, 48, 48, 48);
    expGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    expGradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.9)');
    expGradient.addColorStop(0.6, 'rgba(255, 100, 0, 0.6)');
    expGradient.addColorStop(1, 'rgba(100, 30, 0, 0)');
    ectx.fillStyle = expGradient;
    ectx.arc(48, 48, 48, 0, Math.PI * 2);
    ectx.fill();
    this.textures.addCanvas('explosion', expCanvas);

    graphics.fillStyle(0x4a3020, 1);
    graphics.fillEllipse(20, 20, 18, 14);
    graphics.generateTexture('corpse', 40, 40);
    graphics.clear();

    graphics.fillStyle(0x4a4a4a, 1);
    graphics.fillCircle(32, 32, 26);
    graphics.fillStyle(0x2a2a2a, 1);
    graphics.fillCircle(32, 32, 16);
    graphics.generateTexture('nest', 64, 64);
    graphics.clear();

    graphics.fillStyle(0x00ffaa, 1);
    graphics.fillRect(0, 1, 20, 2);
    graphics.generateTexture('gauss', 20, 4);
    graphics.clear();

    graphics.fillStyle(0xff4444, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(16, 16, 8);
    graphics.generateTexture('nuke', 32, 32);
    graphics.clear();

    graphics.fillStyle(0x8800ff, 1);
    graphics.fillCircle(6, 6, 6);
    graphics.generateTexture('ion', 12, 12);
    graphics.clear();

    graphics.fillStyle(0xaaaaaa, 1);
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
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('alien_projectile', 8, 8);
    graphics.clear();

    graphics.fillStyle(0xffcc00, 1);
    graphics.fillCircle(12, 12, 10);
    graphics.generateTexture('bonus_xp', 24, 24);
    graphics.clear();

    graphics.fillStyle(0xffaa00, 1);
    graphics.fillCircle(14, 14, 12);
    graphics.generateTexture('bonus_xp_medium', 28, 28);
    graphics.clear();

    graphics.fillStyle(0xff8800, 1);
    graphics.fillCircle(16, 16, 14);
    graphics.generateTexture('bonus_xp_large', 32, 32);
    graphics.clear();

    graphics.fillStyle(0x0088ff, 1);
    graphics.fillCircle(14, 14, 12);
    graphics.generateTexture('bonus_freeze', 28, 28);
    graphics.clear();

    graphics.fillStyle(0xff4400, 1);
    graphics.fillCircle(14, 14, 12);
    graphics.generateTexture('bonus_nuke', 28, 28);
    graphics.clear();

    graphics.fillStyle(0x00ff44, 1);
    graphics.beginPath();
    graphics.moveTo(14, 2);
    graphics.lineTo(26, 22);
    graphics.lineTo(2, 22);
    graphics.closePath();
    graphics.fillPath();
    graphics.generateTexture('bonus_speed', 28, 28);
    graphics.clear();

    graphics.lineStyle(3, 0x00aaff, 1);
    graphics.strokeCircle(14, 14, 11);
    graphics.generateTexture('bonus_shield', 28, 28);
    graphics.clear();

    graphics.fillStyle(0xff00ff, 1);
    graphics.fillCircle(14, 14, 12);
    graphics.generateTexture('bonus_reflex', 28, 28);
    graphics.clear();

    graphics.destroy();
  }
}
