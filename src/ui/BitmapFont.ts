import Phaser from 'phaser';

export class BitmapFont {
  private scene: Phaser.Scene;
  private textureKey: string;
  private widths: Uint8Array;
  private cellSize: number = 16;
  private grid: number = 16;
  private frameCache: Map<number, string> = new Map();

  constructor(scene: Phaser.Scene, textureKey: string, widths: Uint8Array) {
    this.scene = scene;
    this.textureKey = textureKey;
    this.widths = widths;
    this.createFrames();
  }

  private createFrames() {
    const texture = this.scene.textures.get(this.textureKey);
    if (!texture) return;

    for (let charCode = 0; charCode < 256; charCode++) {
      const width = this.widths[charCode];
      if (width <= 0) continue;

      const col = charCode % this.grid;
      const row = Math.floor(charCode / this.grid);
      const frameName = `char_${charCode}`;

      texture.add(
        frameName,
        0,
        col * this.cellSize,
        row * this.cellSize,
        width,
        this.cellSize
      );
      this.frameCache.set(charCode, frameName);
    }
  }

  drawText(
    text: string,
    x: number,
    y: number,
    scale: number = 1,
    color: number = 0xffffff,
    alpha: number = 1
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    let xPos = 0;
    let yPos = 0;
    const lineHeight = this.cellSize * scale;

    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);

      if (charCode === 0x0A) {
        xPos = 0;
        yPos += lineHeight;
        continue;
      }
      if (charCode === 0x0D) {
        continue;
      }

      const frameName = this.frameCache.get(charCode);
      if (!frameName) continue;

      const width = this.widths[charCode];
      const char = this.scene.add.image(xPos, yPos, this.textureKey, frameName);
      char.setOrigin(0, 0);
      char.setScale(scale);
      char.setTint(color);
      char.setAlpha(alpha);

      container.add(char);
      xPos += width * scale;
    }

    return container;
  }

  measureWidth(text: string, scale: number = 1): number {
    let maxWidth = 0;
    let currentWidth = 0;

    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);

      if (charCode === 0x0A) {
        maxWidth = Math.max(maxWidth, currentWidth);
        currentWidth = 0;
        continue;
      }
      if (charCode === 0x0D) {
        continue;
      }

      const width = this.widths[charCode] || 0;
      currentWidth += width * scale;
    }

    return Math.max(maxWidth, currentWidth);
  }

  measureHeight(text: string, scale: number = 1): number {
    const lineCount = (text.match(/\n/g) || []).length + 1;
    return this.cellSize * scale * lineCount;
  }
}
