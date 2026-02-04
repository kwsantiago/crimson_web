import Phaser from 'phaser';
import { PaqArchive, decodeJaz, jazToCanvas, isJazFile } from '../loaders/PaqLoader';

const PAQ_BASE = 'https://paq.crimson.banteg.xyz/v1.9.93/crimson.paq';
const PAQ_URL = `https://corsproxy.io/?${encodeURIComponent(PAQ_BASE)}`;

export class BootScene extends Phaser.Scene {
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super('BootScene');
  }

  preload() {
    const { width, height } = this.cameras.main;
    this.loadingText = this.add.text(width / 2, height / 2, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);
  }

  async create() {
    try {
      this.loadingText.setText('Fetching assets...');
      const archive = await PaqArchive.fromUrl(PAQ_URL);

      this.loadingText.setText('Decoding textures...');
      await this.loadTexturesFromPaq(archive);

      this.createAnimations();
      this.generateFallbackTextures();
      this.scene.start('MenuScene');
    } catch (error) {
      console.error('Failed to load assets:', error);
      this.loadingText.setText('Failed to load assets. Check console.');
    }
  }

  private async loadTexturesFromPaq(archive: PaqArchive) {
    const textureMap: Record<string, { path: string; frameWidth: number; frameHeight: number }> = {
      'trooper_sheet': { path: 'game/trooper.jaz', frameWidth: 64, frameHeight: 64 },
      'zombie_sheet': { path: 'game/zombie.jaz', frameWidth: 64, frameHeight: 64 },
      'alien_sheet': { path: 'game/alien.jaz', frameWidth: 64, frameHeight: 64 },
      'lizard_sheet': { path: 'game/lizard.jaz', frameWidth: 64, frameHeight: 64 },
      'spider_sp1_sheet': { path: 'game/spider_sp1.jaz', frameWidth: 64, frameHeight: 64 },
      'spider_sp2_sheet': { path: 'game/spider_sp2.jaz', frameWidth: 64, frameHeight: 64 },
      'projs_sheet': { path: 'game/projs.jaz', frameWidth: 16, frameHeight: 16 },
      'bonuses_sheet': { path: 'game/bonuses.jaz', frameWidth: 32, frameHeight: 32 },
      'particles_sheet': { path: 'game/particles.jaz', frameWidth: 32, frameHeight: 32 },
      'bodyset_sheet': { path: 'game/bodyset.jaz', frameWidth: 64, frameHeight: 64 },
      'muzzle_flash_img': { path: 'game/muzzleflash.jaz', frameWidth: 0, frameHeight: 0 },
      'arrow': { path: 'game/arrow.jaz', frameWidth: 0, frameHeight: 0 },
      'terrain': { path: 'ter/ter_q1_base.jaz', frameWidth: 0, frameHeight: 0 },
    };

    const total = Object.keys(textureMap).length;
    let loaded = 0;

    for (const [key, config] of Object.entries(textureMap)) {
      const data = archive.get(config.path);
      if (!data) {
        console.warn(`Missing asset in PAQ: ${config.path}`);
        continue;
      }

      try {
        const jazImage = await decodeJaz(data);
        const canvas = jazToCanvas(jazImage);

        if (config.frameWidth > 0 && config.frameHeight > 0) {
          const img = await this.canvasToImage(canvas);
          this.textures.addSpriteSheet(key, img, {
            frameWidth: config.frameWidth,
            frameHeight: config.frameHeight
          });
        } else {
          this.textures.addCanvas(key, canvas);
        }

        loaded++;
        this.loadingText.setText(`Loading textures... ${loaded}/${total}`);
      } catch (err) {
        console.warn(`Failed to decode ${config.path}:`, err);
      }
    }

    await this.createAliasTextures();
  }

  private canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = canvas.toDataURL('image/png');
    });
  }

  private async createAliasTextures() {
    const aliases: Record<string, { source: string; frameWidth: number; frameHeight: number }> = {
      'player': { source: 'trooper_sheet', frameWidth: 64, frameHeight: 64 },
      'zombie': { source: 'zombie_sheet', frameWidth: 64, frameHeight: 64 },
      'fast_zombie': { source: 'zombie_sheet', frameWidth: 64, frameHeight: 64 },
      'big_zombie': { source: 'zombie_sheet', frameWidth: 64, frameHeight: 64 },
      'spider': { source: 'spider_sp1_sheet', frameWidth: 64, frameHeight: 64 },
      'baby_spider': { source: 'spider_sp1_sheet', frameWidth: 64, frameHeight: 64 },
      'spider_mother': { source: 'spider_sp2_sheet', frameWidth: 64, frameHeight: 64 },
      'alien': { source: 'alien_sheet', frameWidth: 64, frameHeight: 64 },
      'alien_elite': { source: 'alien_sheet', frameWidth: 64, frameHeight: 64 },
      'alien_boss': { source: 'alien_sheet', frameWidth: 64, frameHeight: 64 },
      'lizard': { source: 'lizard_sheet', frameWidth: 64, frameHeight: 64 },
      'lizard_spitter': { source: 'lizard_sheet', frameWidth: 64, frameHeight: 64 },
      'boss': { source: 'zombie_sheet', frameWidth: 64, frameHeight: 64 },
      'bullet': { source: 'projs_sheet', frameWidth: 16, frameHeight: 16 },
      'plasma': { source: 'projs_sheet', frameWidth: 16, frameHeight: 16 },
      'flame': { source: 'projs_sheet', frameWidth: 16, frameHeight: 16 },
      'rocket': { source: 'projs_sheet', frameWidth: 16, frameHeight: 16 },
      'bonus_health': { source: 'bonuses_sheet', frameWidth: 32, frameHeight: 32 },
      'bonus_weapon': { source: 'bonuses_sheet', frameWidth: 32, frameHeight: 32 },
    };

    for (const [key, config] of Object.entries(aliases)) {
      if (!this.textures.exists(config.source)) continue;

      const sourceTexture = this.textures.get(config.source);
      const sourceImage = sourceTexture.getSourceImage() as HTMLImageElement;

      this.textures.addSpriteSheet(key, sourceImage, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight
      });
    }
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
