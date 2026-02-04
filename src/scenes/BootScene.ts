import Phaser from 'phaser';
import { PaqArchive, decodeJaz, jazToCanvas, decodeTga, tgaToCanvas } from '../loaders/PaqLoader';

const PAQ_URL = './crimson.paq';
const CACHE_KEY = 'crimson_paq_v1';

export let smallFontWidths: Uint8Array | null = null;

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
      const buffer = await this.fetchWithCache();

      this.loadingText.setText('Parsing archive...');
      const archive = PaqArchive.fromArrayBuffer(buffer);

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

  private async fetchWithCache(): Promise<ArrayBuffer> {
    const cached = await this.getFromCache();
    if (cached) {
      this.loadingText.setText('Loaded from cache!');
      return cached;
    }

    this.loadingText.setText('Fetching assets...');
    const response = await fetch(PAQ_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch PAQ: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();

    this.saveToCache(buffer);
    return buffer;
  }

  private async getFromCache(): Promise<ArrayBuffer | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open('CrimsonCache', 1);
      request.onerror = () => resolve(null);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('assets')) {
          db.createObjectStore('assets');
        }
      };
      request.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        try {
          const tx = db.transaction('assets', 'readonly');
          const store = tx.objectStore('assets');
          const get = store.get(CACHE_KEY);
          get.onsuccess = () => resolve(get.result || null);
          get.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
    });
  }

  private saveToCache(buffer: ArrayBuffer): void {
    const request = indexedDB.open('CrimsonCache', 1);
    request.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      try {
        const tx = db.transaction('assets', 'readwrite');
        const store = tx.objectStore('assets');
        store.put(buffer, CACHE_KEY);
      } catch (err) {
        console.warn('Failed to cache PAQ:', err);
      }
    };
  }

  private async loadTexturesFromPaq(archive: PaqArchive) {
    const textureMap: Record<string, { path: string; frameWidth: number; frameHeight: number }> = {
      // Game sprites
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
      // UI - HUD
      'ui_gameTop': { path: 'ui/ui_gameTop.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_lifeHeart': { path: 'ui/ui_lifeHeart.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_indLife': { path: 'ui/ui_indLife.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_indPanel': { path: 'ui/ui_indPanel.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_indBullet': { path: 'ui/ui_indBullet.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_indFire': { path: 'ui/ui_indFire.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_indRocket': { path: 'ui/ui_indRocket.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_indElectric': { path: 'ui/ui_indElectric.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_wicons': { path: 'ui/ui_wicons.jaz', frameWidth: 32, frameHeight: 16 },
      'ui_clockTable': { path: 'ui/ui_clockTable.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_clockPointer': { path: 'ui/ui_clockPointer.jaz', frameWidth: 0, frameHeight: 0 },
      // UI - Menu
      'ui_menuPanel': { path: 'ui/ui_menuPanel.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_menuItem': { path: 'ui/ui_menuItem.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_signCrimson': { path: 'ui/ui_signCrimson.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_cursor': { path: 'ui/ui_cursor.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_aim': { path: 'ui/ui_aim.jaz', frameWidth: 0, frameHeight: 0 },
      // UI - Buttons
      'ui_button_145x32': { path: 'ui/ui_button_145x32.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_button_128x32': { path: 'ui/ui_button_128x32.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_button_82x32': { path: 'ui/ui_button_82x32.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_button_64x32': { path: 'ui/ui_button_64x32.jaz', frameWidth: 0, frameHeight: 0 },
      // UI - Perk selection
      'ui_textLevelUp': { path: 'ui/ui_textLevelUp.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_textPickAPerk': { path: 'ui/ui_textPickAPerk.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_num1': { path: 'ui/ui_num1.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_num2': { path: 'ui/ui_num2.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_num3': { path: 'ui/ui_num3.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_num4': { path: 'ui/ui_num4.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_num5': { path: 'ui/ui_num5.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_itemTexts': { path: 'ui/ui_itemTexts.jaz', frameWidth: 0, frameHeight: 0 },
      // UI - Game over / Results
      'ui_textWellDone': { path: 'ui/ui_textWellDone.jaz', frameWidth: 0, frameHeight: 0 },
      'ui_textReaper': { path: 'ui/ui_textReaper.jaz', frameWidth: 0, frameHeight: 0 },
    };

    const entries = Object.entries(textureMap);
    const total = entries.length;

    // Decode all textures in parallel
    const decodePromises = entries.map(async ([key, config]) => {
      const data = archive.get(config.path);
      if (!data) {
        console.warn(`Missing asset in PAQ: ${config.path}`);
        return null;
      }
      try {
        const jazImage = await decodeJaz(data);
        const canvas = jazToCanvas(jazImage);
        return { key, config, canvas };
      } catch (err) {
        console.warn(`Failed to decode ${config.path}:`, err);
        return null;
      }
    });

    this.loadingText.setText(`Decoding ${total} textures...`);
    const results = await Promise.all(decodePromises);

    // Register textures (must be sequential for Phaser)
    let loaded = 0;
    for (const result of results) {
      if (!result) continue;
      const { key, config, canvas } = result;

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
    }

    this.loadingText.setText(`Loaded ${loaded} textures`);
    await this.createAliasTextures();
    await this.loadBitmapFont(archive);
  }

  private async loadBitmapFont(archive: PaqArchive) {
    const widthsData = archive.get('load/smallFnt.dat');
    const textureData = archive.get('load/smallWhite.tga');

    if (!widthsData || !textureData) {
      console.warn('Missing bitmap font assets (smallFnt.dat or smallWhite.tga)');
      return;
    }

    try {
      smallFontWidths = new Uint8Array(widthsData);
      const tgaImage = decodeTga(textureData);
      const canvas = tgaToCanvas(tgaImage);
      this.textures.addCanvas('smallFont', canvas);
      this.loadingText.setText('Loaded bitmap font');
    } catch (err) {
      console.warn('Failed to load bitmap font:', err);
    }
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
