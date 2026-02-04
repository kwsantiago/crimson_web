import Phaser from 'phaser';
import { PaqArchive, decodeJaz, jazToCanvas, isJazFile } from './PaqLoader';

export interface PaqLoaderConfig {
  key: string;
  url: string;
}

export interface PaqTextureConfig {
  archive: PaqArchive;
  path: string;
  key?: string;
  frameWidth?: number;
  frameHeight?: number;
}

export class PhaserPaqLoader {
  private scene: Phaser.Scene;
  private archives: Map<string, PaqArchive> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async loadArchive(key: string, url: string): Promise<PaqArchive> {
    const archive = await PaqArchive.fromUrl(url);
    this.archives.set(key, archive);
    return archive;
  }

  getArchive(key: string): PaqArchive | undefined {
    return this.archives.get(key);
  }

  async loadTexture(config: PaqTextureConfig): Promise<void> {
    const { archive, path, key, frameWidth, frameHeight } = config;
    const textureKey = key || path.replace(/[\\\/]/g, '_').replace(/\.[^.]+$/, '');

    const data = archive.get(path);
    if (!data) {
      throw new Error(`File "${path}" not found in archive`);
    }

    let canvas: HTMLCanvasElement;

    if (isJazFile(path)) {
      const jazImage = await decodeJaz(data);
      canvas = jazToCanvas(jazImage);
    } else {
      canvas = await this.decodeImageToCanvas(data, path);
    }

    if (frameWidth && frameHeight) {
      const img = await this.canvasToImage(canvas);
      this.scene.textures.addSpriteSheet(textureKey, img, {
        frameWidth,
        frameHeight,
      });
    } else {
      this.scene.textures.addCanvas(textureKey, canvas);
    }
  }

  async loadTexturesFromArchive(
    archive: PaqArchive,
    filter?: (path: string) => boolean,
    transform?: (path: string) => { key: string; frameWidth?: number; frameHeight?: number } | null
  ): Promise<string[]> {
    const loadedKeys: string[] = [];
    const paths = archive.list().filter(p => {
      const ext = p.split('.').pop()?.toLowerCase();
      return ext === 'jaz' || ext === 'png' || ext === 'jpg' || ext === 'jpeg';
    });

    for (const path of paths) {
      if (filter && !filter(path)) continue;

      const transformed = transform ? transform(path) : null;
      const key = transformed?.key || path.replace(/[\\\/]/g, '_').replace(/\.[^.]+$/, '');

      try {
        await this.loadTexture({
          archive,
          path,
          key,
          frameWidth: transformed?.frameWidth,
          frameHeight: transformed?.frameHeight,
        });
        loadedKeys.push(key);
      } catch (e) {
        console.warn(`Failed to load texture "${path}":`, e);
      }
    }

    return loadedKeys;
  }

  private async decodeImageToCanvas(data: Uint8Array, path: string): Promise<HTMLCanvasElement> {
    const ext = path.split('.').pop()?.toLowerCase();
    let mimeType = 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') {
      mimeType = 'image/jpeg';
    }

    const arrayBuffer = new ArrayBuffer(data.length);
    new Uint8Array(arrayBuffer).set(data);
    const blob = new Blob([arrayBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);

    try {
      const img = await this.loadImage(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      return canvas;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  private canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const dataUrl = canvas.toDataURL('image/png');
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to convert canvas to image'));
      img.src = dataUrl;
    });
  }
}

export async function loadPaqArchive(url: string): Promise<PaqArchive> {
  return PaqArchive.fromUrl(url);
}

export function createPaqLoader(scene: Phaser.Scene): PhaserPaqLoader {
  return new PhaserPaqLoader(scene);
}
