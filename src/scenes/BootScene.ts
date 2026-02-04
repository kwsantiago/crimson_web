import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.generatePlayerSprites();
    this.generateCreatureSprites();
    this.generateProjectileSprites();
    this.generateEffectSprites();
    this.generateBonusSprites();
  }

  private generatePlayerSprites() {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    const frameWidth = 48;
    const frameHeight = 48;
    const frames = 8;

    const canvas = document.createElement('canvas');
    canvas.width = frameWidth * frames;
    canvas.height = frameHeight;
    const ctx = canvas.getContext('2d')!;

    for (let f = 0; f < frames; f++) {
      const ox = f * frameWidth + frameWidth / 2;
      const oy = frameHeight / 2;
      const legPhase = (f / frames) * Math.PI * 2;
      const legOffset = Math.sin(legPhase) * 3;

      ctx.fillStyle = '#3a3a28';
      ctx.beginPath();
      ctx.ellipse(ox - 6, oy + 8 + legOffset, 5, 7, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(ox + 6, oy + 8 - legOffset, 5, 7, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#5c5c40';
      ctx.beginPath();
      ctx.ellipse(ox, oy, 12, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4a4a35';
      ctx.beginPath();
      ctx.ellipse(ox, oy - 3, 8, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d4aa70';
      ctx.beginPath();
      ctx.arc(ox, oy - 6, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#555555';
      ctx.fillRect(ox + 8, oy - 2, 14, 4);
      ctx.fillStyle = '#777777';
      ctx.fillRect(ox + 8, oy - 1, 12, 2);
      ctx.fillStyle = '#333333';
      ctx.fillRect(ox + 20, oy - 2, 4, 4);
    }

    this.textures.addCanvas('player_sheet', canvas);
    this.textures.get('player_sheet').add('walk', 0, 0, 0, frameWidth * frames, frameHeight);

    for (let i = 0; i < frames; i++) {
      this.textures.get('player_sheet').add(i, 0, i * frameWidth, 0, frameWidth, frameHeight);
    }

    graphics.fillStyle(0x5c5c40, 1);
    graphics.fillEllipse(24, 24, 24, 28);
    graphics.fillStyle(0x4a4a35, 1);
    graphics.fillEllipse(24, 21, 16, 18);
    graphics.fillStyle(0xd4aa70, 1);
    graphics.fillCircle(24, 18, 5);
    graphics.fillStyle(0x555555, 1);
    graphics.fillRect(32, 22, 14, 4);
    graphics.fillStyle(0x333333, 1);
    graphics.fillRect(44, 22, 4, 4);
    graphics.generateTexture('player', 48, 48);
    graphics.clear();

    graphics.fillStyle(0x444444, 1);
    graphics.fillRect(0, 2, 24, 6);
    graphics.fillStyle(0x666666, 1);
    graphics.fillRect(2, 3, 20, 4);
    graphics.fillStyle(0x333333, 1);
    graphics.fillRect(22, 2, 6, 6);
    graphics.fillStyle(0x222222, 1);
    graphics.fillRect(26, 3, 2, 4);
    graphics.generateTexture('gun_sprite', 28, 10);
    graphics.clear();

    graphics.destroy();
  }

  private generateCreatureSprites() {
    this.generateZombieSprites();
    this.generateSpiderSprites();
    this.generateAlienSprites();
    this.generateLizardSprites();
    this.generateBossSprites();
  }

  private generateZombieSprites() {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    this.drawZombie(graphics, 24, 24, 20, 0xb8593b, 0x8b4513);
    graphics.generateTexture('zombie', 48, 48);
    graphics.clear();

    this.drawZombie(graphics, 20, 20, 16, 0xd4654a, 0xa04020);
    graphics.generateTexture('fast_zombie', 40, 40);
    graphics.clear();

    this.drawZombie(graphics, 32, 32, 28, 0x8b3a2a, 0x5a2515);
    graphics.generateTexture('big_zombie', 64, 64);
    graphics.clear();

    graphics.destroy();
  }

  private drawZombie(graphics: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, bodyColor: number, limbColor: number) {
    const armLen = size * 0.6;
    const legSize = size * 0.25;

    graphics.fillStyle(limbColor, 1);
    graphics.fillCircle(cx - size * 0.45, cy + size * 0.35, legSize);
    graphics.fillCircle(cx + size * 0.45, cy + size * 0.35, legSize);

    graphics.fillStyle(limbColor, 1);
    graphics.beginPath();
    graphics.moveTo(cx - size * 0.5, cy - size * 0.1);
    graphics.lineTo(cx - size * 0.5 - armLen * 0.7, cy - size * 0.4);
    graphics.lineTo(cx - size * 0.5 - armLen * 0.5, cy - size * 0.2);
    graphics.closePath();
    graphics.fillPath();
    graphics.beginPath();
    graphics.moveTo(cx + size * 0.5, cy - size * 0.1);
    graphics.lineTo(cx + size * 0.5 + armLen * 0.7, cy - size * 0.4);
    graphics.lineTo(cx + size * 0.5 + armLen * 0.5, cy - size * 0.2);
    graphics.closePath();
    graphics.fillPath();

    graphics.fillStyle(bodyColor, 1);
    graphics.fillEllipse(cx, cy, size, size * 1.1);

    const headSize = size * 0.45;
    graphics.fillStyle(bodyColor, 1);
    graphics.fillCircle(cx, cy - size * 0.35, headSize);

    graphics.fillStyle(0x1a1a1a, 1);
    graphics.fillCircle(cx - headSize * 0.35, cy - size * 0.4, headSize * 0.2);
    graphics.fillCircle(cx + headSize * 0.35, cy - size * 0.4, headSize * 0.2);

    graphics.fillStyle(0x2a2a2a, 1);
    graphics.fillRect(cx - headSize * 0.25, cy - size * 0.2, headSize * 0.5, headSize * 0.15);
  }

  private generateSpiderSprites() {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    this.drawSpider(graphics, 16, 16, 12, 0x604080, 0x403060);
    graphics.generateTexture('spider', 32, 32);
    graphics.clear();

    this.drawSpider(graphics, 10, 10, 8, 0x705090, 0x503070);
    graphics.generateTexture('baby_spider', 20, 20);
    graphics.clear();

    this.drawSpider(graphics, 32, 32, 24, 0x503070, 0x302050);
    graphics.fillStyle(0xffcc00, 0.9);
    graphics.fillCircle(32, 24, 4);
    graphics.generateTexture('spider_mother', 64, 64);
    graphics.clear();

    graphics.destroy();
  }

  private drawSpider(graphics: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, bodyColor: number, legColor: number) {
    const legLength = size * 1.4;
    const legWidth = Math.max(1.5, size / 5);

    graphics.lineStyle(legWidth, legColor);
    for (let i = 0; i < 4; i++) {
      const baseAngle = (i * 0.35 - 0.525) + Math.PI / 2;

      const midX1 = cx + Math.cos(baseAngle) * legLength * 0.4;
      const midY1 = cy + Math.sin(baseAngle) * legLength * 0.4 - size * 0.1;
      const endX1 = midX1 + Math.cos(baseAngle + 0.8) * legLength * 0.5;
      const endY1 = midY1 + Math.sin(baseAngle + 0.8) * legLength * 0.5;
      graphics.beginPath();
      graphics.moveTo(cx, cy);
      graphics.lineTo(midX1, midY1);
      graphics.lineTo(endX1, endY1);
      graphics.strokePath();

      const angleL = baseAngle + Math.PI;
      const midX2 = cx + Math.cos(angleL) * legLength * 0.4;
      const midY2 = cy + Math.sin(angleL) * legLength * 0.4 - size * 0.1;
      const endX2 = midX2 + Math.cos(angleL - 0.8) * legLength * 0.5;
      const endY2 = midY2 + Math.sin(angleL - 0.8) * legLength * 0.5;
      graphics.beginPath();
      graphics.moveTo(cx, cy);
      graphics.lineTo(midX2, midY2);
      graphics.lineTo(endX2, endY2);
      graphics.strokePath();
    }

    graphics.fillStyle(bodyColor, 1);
    graphics.fillEllipse(cx, cy, size, size * 0.65);
    graphics.fillEllipse(cx, cy - size * 0.35, size * 0.55, size * 0.45);

    graphics.fillStyle(0xcc0000, 1);
    const eyeSize = Math.max(1.5, size / 7);
    graphics.fillCircle(cx - size * 0.12, cy - size * 0.4, eyeSize);
    graphics.fillCircle(cx + size * 0.12, cy - size * 0.4, eyeSize);
    graphics.fillStyle(0x880000, 1);
    graphics.fillCircle(cx - size * 0.2, cy - size * 0.32, eyeSize * 0.6);
    graphics.fillCircle(cx + size * 0.2, cy - size * 0.32, eyeSize * 0.6);
  }

  private generateAlienSprites() {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    this.drawAlien(graphics, 20, 20, 16, 0x40a060, 0x308050);
    graphics.generateTexture('alien', 40, 40);
    graphics.clear();

    this.drawAlien(graphics, 24, 24, 20, 0x50c070, 0x40a060);
    graphics.fillStyle(0xccff00, 0.9);
    graphics.fillCircle(18, 12, 3);
    graphics.fillCircle(30, 12, 3);
    graphics.generateTexture('alien_elite', 48, 48);
    graphics.clear();

    this.drawAlien(graphics, 40, 40, 32, 0x30b0a0, 0x209080);
    graphics.fillStyle(0xff3300, 1);
    graphics.fillCircle(32, 22, 5);
    graphics.fillCircle(48, 22, 5);
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(40, 58, 6);
    graphics.generateTexture('alien_boss', 80, 80);
    graphics.clear();

    graphics.destroy();
  }

  private drawAlien(graphics: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, bodyColor: number, darkColor: number) {
    graphics.fillStyle(darkColor, 1);
    graphics.fillCircle(cx - size * 0.35, cy + size * 0.45, size * 0.18);
    graphics.fillCircle(cx + size * 0.35, cy + size * 0.45, size * 0.18);

    graphics.fillStyle(bodyColor, 1);
    graphics.fillEllipse(cx, cy, size, size * 1.15);

    graphics.fillStyle(darkColor, 1);
    graphics.fillEllipse(cx, cy - size * 0.25, size * 0.85, size * 0.45);

    graphics.fillStyle(0x0a0a0a, 1);
    graphics.fillEllipse(cx - size * 0.22, cy - size * 0.32, size * 0.22, size * 0.12);
    graphics.fillEllipse(cx + size * 0.22, cy - size * 0.32, size * 0.22, size * 0.12);

    graphics.lineStyle(2, darkColor);
    graphics.beginPath();
    graphics.moveTo(cx - size * 0.45, cy - size * 0.05);
    graphics.lineTo(cx - size * 0.8, cy - size * 0.25);
    graphics.strokePath();
    graphics.beginPath();
    graphics.moveTo(cx + size * 0.45, cy - size * 0.05);
    graphics.lineTo(cx + size * 0.8, cy - size * 0.25);
    graphics.strokePath();
  }

  private generateLizardSprites() {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    this.drawLizard(graphics, 20, 20, 16, 0xc08040, 0xa06030);
    graphics.generateTexture('lizard', 40, 40);
    graphics.clear();

    this.drawLizard(graphics, 20, 20, 16, 0xb05030, 0x903020);
    graphics.fillStyle(0x40ff40, 0.9);
    graphics.fillCircle(20, 32, 4);
    graphics.generateTexture('lizard_spitter', 40, 40);
    graphics.clear();

    graphics.destroy();
  }

  private drawLizard(graphics: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, bodyColor: number, darkColor: number) {
    graphics.fillStyle(darkColor, 1);
    graphics.beginPath();
    graphics.moveTo(cx, cy + size * 0.5);
    graphics.lineTo(cx - size * 0.12, cy + size * 1.1);
    graphics.lineTo(cx + size * 0.12, cy + size * 1.1);
    graphics.closePath();
    graphics.fillPath();

    graphics.fillStyle(darkColor, 1);
    graphics.fillCircle(cx - size * 0.45, cy + size * 0.25, size * 0.14);
    graphics.fillCircle(cx + size * 0.45, cy + size * 0.25, size * 0.14);

    graphics.fillStyle(bodyColor, 1);
    graphics.fillEllipse(cx, cy, size * 0.75, size);

    graphics.fillStyle(darkColor, 1);
    graphics.fillEllipse(cx, cy - size * 0.35, size * 0.55, size * 0.38);

    graphics.fillStyle(0xffdd00, 1);
    graphics.fillCircle(cx - size * 0.18, cy - size * 0.42, size * 0.11);
    graphics.fillCircle(cx + size * 0.18, cy - size * 0.42, size * 0.11);
    graphics.fillStyle(0x000000, 1);
    graphics.fillEllipse(cx - size * 0.18, cy - size * 0.42, size * 0.04, size * 0.08);
    graphics.fillEllipse(cx + size * 0.18, cy - size * 0.42, size * 0.04, size * 0.08);
  }

  private generateBossSprites() {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    graphics.fillStyle(0x4a4a4a, 1);
    graphics.fillCircle(32, 32, 26);
    graphics.fillStyle(0x3a3a3a, 1);
    graphics.fillCircle(32, 32, 20);
    graphics.fillStyle(0x2a2a2a, 1);
    graphics.fillCircle(32, 32, 12);
    graphics.fillStyle(0x1a1a1a, 1);
    graphics.fillCircle(32, 32, 6);
    graphics.lineStyle(2, 0x5a5a5a);
    graphics.strokeCircle(32, 32, 28);
    graphics.generateTexture('nest', 64, 64);
    graphics.clear();

    this.drawZombie(graphics, 48, 48, 40, 0x703020, 0x501510);
    graphics.fillStyle(0xff2200, 1);
    graphics.fillCircle(38, 32, 4);
    graphics.fillCircle(58, 32, 4);
    graphics.generateTexture('boss', 96, 96);
    graphics.clear();

    graphics.destroy();
  }

  private generateProjectileSprites() {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    graphics.fillStyle(0xffe066, 1);
    graphics.fillRect(0, 1, 8, 2);
    graphics.fillStyle(0xffffaa, 1);
    graphics.fillRect(6, 1, 4, 2);
    graphics.generateTexture('bullet', 10, 4);
    graphics.clear();

    graphics.fillStyle(0x00aacc, 1);
    graphics.fillCircle(8, 8, 7);
    graphics.fillStyle(0x00ddff, 1);
    graphics.fillCircle(8, 8, 5);
    graphics.fillStyle(0x88ffff, 1);
    graphics.fillCircle(6, 6, 2);
    graphics.generateTexture('plasma', 16, 16);
    graphics.clear();

    graphics.fillStyle(0xff3300, 0.8);
    graphics.fillCircle(10, 10, 9);
    graphics.fillStyle(0xff6600, 0.9);
    graphics.fillCircle(10, 10, 6);
    graphics.fillStyle(0xffaa00, 1);
    graphics.fillCircle(10, 10, 4);
    graphics.fillStyle(0xffff88, 1);
    graphics.fillCircle(8, 8, 2);
    graphics.generateTexture('flame', 20, 20);
    graphics.clear();

    graphics.fillStyle(0x00ff66, 1);
    graphics.fillRect(0, 1, 24, 2);
    graphics.fillStyle(0x88ffaa, 1);
    graphics.fillRect(20, 0, 6, 4);
    graphics.generateTexture('gauss', 26, 4);
    graphics.clear();

    graphics.fillStyle(0x666666, 1);
    graphics.fillRect(0, 1, 12, 5);
    graphics.fillStyle(0x888888, 1);
    graphics.fillRect(2, 2, 8, 3);
    graphics.fillStyle(0xdd3333, 1);
    graphics.beginPath();
    graphics.moveTo(12, 3);
    graphics.lineTo(20, 0);
    graphics.lineTo(20, 7);
    graphics.closePath();
    graphics.fillPath();
    graphics.fillStyle(0xff6600, 0.9);
    graphics.fillCircle(2, 3, 4);
    graphics.generateTexture('rocket', 20, 7);
    graphics.clear();

    graphics.fillStyle(0xcc0000, 0.8);
    graphics.fillCircle(20, 20, 20);
    graphics.fillStyle(0xff3300, 0.8);
    graphics.fillCircle(20, 20, 15);
    graphics.fillStyle(0xff6600, 0.9);
    graphics.fillCircle(20, 20, 10);
    graphics.fillStyle(0xffcc00, 1);
    graphics.fillCircle(20, 20, 5);
    graphics.generateTexture('nuke', 40, 40);
    graphics.clear();

    graphics.fillStyle(0x5500aa, 1);
    graphics.fillCircle(7, 7, 7);
    graphics.fillStyle(0x7700dd, 1);
    graphics.fillCircle(7, 7, 5);
    graphics.fillStyle(0xaa66ff, 1);
    graphics.fillCircle(5, 5, 2);
    graphics.generateTexture('ion', 14, 14);
    graphics.clear();

    graphics.fillStyle(0x888888, 1);
    graphics.fillRect(0, 3, 16, 2);
    graphics.fillStyle(0xaaaaaa, 1);
    graphics.fillRect(14, 2, 4, 4);
    graphics.generateTexture('blade', 18, 8);
    graphics.clear();

    graphics.fillStyle(0xaa00aa, 1);
    graphics.fillCircle(8, 8, 8);
    graphics.fillStyle(0xdd00dd, 1);
    graphics.fillCircle(8, 8, 5);
    graphics.fillStyle(0xff66ff, 1);
    graphics.fillCircle(6, 6, 2);
    graphics.generateTexture('pulse', 16, 16);
    graphics.clear();

    graphics.fillStyle(0x009900, 1);
    graphics.fillCircle(8, 8, 8);
    graphics.fillStyle(0x00cc00, 1);
    graphics.fillCircle(8, 8, 5);
    graphics.fillStyle(0x66ff66, 1);
    graphics.fillCircle(6, 6, 2);
    graphics.generateTexture('shrink', 16, 16);
    graphics.clear();

    graphics.fillStyle(0xaa6600, 1);
    graphics.fillCircle(10, 10, 10);
    graphics.fillStyle(0xdd8800, 1);
    graphics.fillCircle(10, 10, 7);
    graphics.fillStyle(0xffaa33, 1);
    graphics.fillCircle(8, 8, 3);
    graphics.generateTexture('splitter', 20, 20);
    graphics.clear();

    graphics.fillStyle(0x00aa00, 1);
    graphics.fillCircle(4, 3, 4);
    graphics.fillStyle(0x00ff00, 0.7);
    graphics.fillCircle(3, 2, 3);
    graphics.generateTexture('alien_projectile', 8, 6);
    graphics.clear();

    graphics.destroy();
  }

  private generateEffectSprites() {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    graphics.fillStyle(0xffcc00, 1);
    graphics.fillCircle(8, 8, 7);
    graphics.fillStyle(0xffee55, 1);
    graphics.fillCircle(8, 8, 5);
    graphics.fillStyle(0xffffff, 0.8);
    graphics.fillCircle(6, 6, 2);
    graphics.generateTexture('xp_orb', 16, 16);
    graphics.clear();

    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(3, 3, 3);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(3, 3, 1);
    graphics.generateTexture('hit_spark', 6, 6);
    graphics.clear();

    graphics.fillStyle(0x880000, 1);
    graphics.fillCircle(6, 6, 6);
    graphics.fillStyle(0xcc0000, 0.8);
    graphics.fillCircle(5, 5, 4);
    graphics.fillStyle(0xff0000, 0.6);
    graphics.fillCircle(4, 4, 2);
    graphics.generateTexture('blood_particle', 12, 12);
    graphics.clear();

    const decalCanvas = document.createElement('canvas');
    decalCanvas.width = 48;
    decalCanvas.height = 48;
    const dctx = decalCanvas.getContext('2d')!;
    const gradient = dctx.createRadialGradient(24, 24, 0, 24, 24, 24);
    gradient.addColorStop(0, 'rgba(100, 0, 0, 0.9)');
    gradient.addColorStop(0.3, 'rgba(80, 0, 0, 0.7)');
    gradient.addColorStop(0.6, 'rgba(60, 0, 0, 0.4)');
    gradient.addColorStop(1, 'rgba(40, 0, 0, 0)');
    dctx.fillStyle = gradient;
    dctx.beginPath();
    dctx.arc(24, 24, 24, 0, Math.PI * 2);
    dctx.fill();
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 10;
      const x = 24 + Math.cos(angle) * dist;
      const y = 24 + Math.sin(angle) * dist;
      dctx.fillStyle = `rgba(90, 0, 0, ${0.3 + Math.random() * 0.3})`;
      dctx.beginPath();
      dctx.arc(x, y, 2 + Math.random() * 4, 0, Math.PI * 2);
      dctx.fill();
    }
    this.textures.addCanvas('blood_decal', decalCanvas);

    graphics.fillStyle(0xffaa00, 1);
    graphics.fillCircle(6, 6, 6);
    graphics.fillStyle(0xffdd00, 1);
    graphics.fillCircle(5, 5, 4);
    graphics.fillStyle(0xffff88, 1);
    graphics.fillCircle(4, 4, 2);
    graphics.generateTexture('muzzle_flash', 12, 12);
    graphics.clear();

    const expCanvas = document.createElement('canvas');
    expCanvas.width = 96;
    expCanvas.height = 96;
    const ectx = expCanvas.getContext('2d')!;
    const expGradient = ectx.createRadialGradient(48, 48, 0, 48, 48, 48);
    expGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    expGradient.addColorStop(0.15, 'rgba(255, 255, 180, 1)');
    expGradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.95)');
    expGradient.addColorStop(0.5, 'rgba(255, 120, 0, 0.8)');
    expGradient.addColorStop(0.7, 'rgba(200, 60, 0, 0.5)');
    expGradient.addColorStop(1, 'rgba(100, 30, 0, 0)');
    ectx.fillStyle = expGradient;
    ectx.beginPath();
    ectx.arc(48, 48, 48, 0, Math.PI * 2);
    ectx.fill();
    this.textures.addCanvas('explosion', expCanvas);

    graphics.fillStyle(0x4a3020, 1);
    graphics.fillEllipse(20, 20, 18, 14);
    graphics.fillStyle(0x3a2010, 1);
    graphics.fillEllipse(20, 20, 14, 10);
    graphics.fillStyle(0x2a1008, 0.8);
    graphics.fillCircle(18, 18, 5);
    graphics.generateTexture('corpse', 40, 40);
    graphics.clear();

    graphics.destroy();
  }

  private generateBonusSprites() {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    graphics.fillStyle(0xffcc00, 1);
    graphics.fillCircle(12, 12, 10);
    graphics.fillStyle(0xffee44, 1);
    graphics.fillCircle(10, 10, 6);
    graphics.fillStyle(0xffffff, 0.6);
    graphics.fillCircle(8, 8, 3);
    graphics.generateTexture('bonus_xp', 24, 24);
    graphics.clear();

    graphics.fillStyle(0xffaa00, 1);
    graphics.fillCircle(14, 14, 12);
    graphics.fillStyle(0xffcc44, 1);
    graphics.fillCircle(12, 12, 7);
    graphics.fillStyle(0xffffff, 0.6);
    graphics.fillCircle(10, 10, 3);
    graphics.generateTexture('bonus_xp_medium', 28, 28);
    graphics.clear();

    graphics.fillStyle(0xff8800, 1);
    graphics.fillCircle(16, 16, 14);
    graphics.fillStyle(0xffaa33, 1);
    graphics.fillCircle(14, 14, 8);
    graphics.fillStyle(0xffffff, 0.6);
    graphics.fillCircle(12, 12, 4);
    graphics.generateTexture('bonus_xp_large', 32, 32);
    graphics.clear();

    graphics.fillStyle(0x008800, 1);
    graphics.fillRoundedRect(2, 6, 24, 16, 4);
    graphics.fillStyle(0x00cc00, 1);
    graphics.fillRoundedRect(4, 8, 20, 12, 3);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(12, 7, 4, 14);
    graphics.fillRect(8, 11, 12, 6);
    graphics.generateTexture('bonus_health', 28, 28);
    graphics.clear();

    graphics.fillStyle(0x444444, 1);
    graphics.fillRoundedRect(2, 6, 24, 16, 3);
    graphics.fillStyle(0x666666, 1);
    graphics.fillRect(4, 8, 18, 12);
    graphics.fillStyle(0x888888, 1);
    graphics.fillRect(6, 10, 14, 8);
    graphics.fillStyle(0xffaa00, 1);
    graphics.fillCircle(22, 8, 4);
    graphics.generateTexture('bonus_weapon', 28, 28);
    graphics.clear();

    graphics.fillStyle(0x0066aa, 1);
    graphics.fillCircle(14, 14, 13);
    graphics.fillStyle(0x0099dd, 1);
    graphics.fillCircle(14, 14, 10);
    graphics.fillStyle(0x66ccff, 1);
    graphics.fillCircle(14, 14, 6);
    graphics.fillStyle(0xffffff, 0.8);
    graphics.fillCircle(10, 10, 3);
    graphics.lineStyle(1.5, 0x88ddff, 0.6);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      graphics.beginPath();
      graphics.moveTo(14, 14);
      graphics.lineTo(14 + Math.cos(angle) * 12, 14 + Math.sin(angle) * 12);
      graphics.strokePath();
    }
    graphics.generateTexture('bonus_freeze', 28, 28);
    graphics.clear();

    graphics.fillStyle(0xaa0000, 1);
    graphics.fillCircle(14, 14, 13);
    graphics.fillStyle(0xdd2222, 1);
    graphics.fillCircle(14, 14, 10);
    graphics.fillStyle(0xff6600, 1);
    graphics.fillCircle(14, 14, 6);
    graphics.fillStyle(0xffcc00, 1);
    graphics.fillCircle(14, 14, 3);
    graphics.generateTexture('bonus_nuke', 28, 28);
    graphics.clear();

    graphics.fillStyle(0x008800, 1);
    graphics.beginPath();
    graphics.moveTo(14, 2);
    graphics.lineTo(26, 22);
    graphics.lineTo(2, 22);
    graphics.closePath();
    graphics.fillPath();
    graphics.fillStyle(0x00cc00, 1);
    graphics.beginPath();
    graphics.moveTo(14, 6);
    graphics.lineTo(22, 20);
    graphics.lineTo(6, 20);
    graphics.closePath();
    graphics.fillPath();
    graphics.fillStyle(0x44ff44, 0.6);
    graphics.beginPath();
    graphics.moveTo(14, 10);
    graphics.lineTo(18, 18);
    graphics.lineTo(10, 18);
    graphics.closePath();
    graphics.fillPath();
    graphics.generateTexture('bonus_speed', 28, 28);
    graphics.clear();

    graphics.lineStyle(4, 0x0066aa, 1);
    graphics.strokeCircle(14, 14, 12);
    graphics.lineStyle(2.5, 0x0099dd, 1);
    graphics.strokeCircle(14, 14, 9);
    graphics.lineStyle(1.5, 0xffffff, 0.8);
    graphics.strokeCircle(14, 14, 5);
    graphics.fillStyle(0x0099dd, 0.35);
    graphics.fillCircle(14, 14, 10);
    graphics.generateTexture('bonus_shield', 28, 28);
    graphics.clear();

    graphics.fillStyle(0xaa00aa, 1);
    graphics.fillCircle(14, 14, 12);
    graphics.fillStyle(0xdd00dd, 1);
    graphics.fillCircle(14, 14, 9);
    graphics.fillStyle(0xff66ff, 1);
    graphics.fillCircle(14, 14, 5);
    graphics.fillStyle(0xffffff, 0.8);
    graphics.fillCircle(10, 10, 3);
    graphics.generateTexture('bonus_reflex', 28, 28);
    graphics.clear();

    graphics.destroy();
  }

  create() {
    this.scene.start('MenuScene');
  }
}
