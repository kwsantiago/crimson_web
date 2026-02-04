import pako from 'pako';

export interface PaqEntry {
  name: string;
  data: Uint8Array;
}

export class PaqArchive {
  private entries: Map<string, Uint8Array> = new Map();

  constructor(entries: Map<string, Uint8Array>) {
    this.entries = entries;
  }

  static async fromUrl(url: string): Promise<PaqArchive> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PAQ archive: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return PaqArchive.fromArrayBuffer(buffer);
  }

  static fromArrayBuffer(buffer: ArrayBuffer): PaqArchive {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    let offset = 0;

    const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (magic !== 'paq\0') {
      throw new Error(`Invalid PAQ magic: expected "paq\\0", got "${magic}"`);
    }
    offset = 4;

    const entries = new Map<string, Uint8Array>();

    while (offset < buffer.byteLength) {
      const nameStart = offset;
      while (offset < buffer.byteLength && bytes[offset] !== 0) {
        offset++;
      }
      if (offset >= buffer.byteLength) break;

      const nameBytes = bytes.slice(nameStart, offset);
      const rawName = new TextDecoder('utf-8').decode(nameBytes);
      offset++; // skip NUL terminator

      if (offset + 4 > buffer.byteLength) break;

      const size = view.getUint32(offset, true);
      offset += 4;

      if (offset + size > buffer.byteLength) {
        throw new Error(`PAQ entry "${rawName}" claims size ${size} but only ${buffer.byteLength - offset} bytes remain`);
      }

      const payload = bytes.slice(offset, offset + size);
      offset += size;

      const normalizedName = normalizePath(rawName);
      entries.set(normalizedName, payload);
    }

    return new PaqArchive(entries);
  }

  get(path: string): Uint8Array | undefined {
    return this.entries.get(normalizePath(path));
  }

  has(path: string): boolean {
    return this.entries.has(normalizePath(path));
  }

  list(): string[] {
    return Array.from(this.entries.keys());
  }

  *[Symbol.iterator](): Iterator<PaqEntry> {
    for (const [name, data] of this.entries) {
      yield { name, data };
    }
  }

  get size(): number {
    return this.entries.size;
  }
}

function normalizePath(path: string): string {
  let normalized = path.replace(/\\/g, '/');

  const segments = normalized.split('/').filter(s => s.length > 0);
  const result: string[] = [];

  for (const seg of segments) {
    if (seg === '.' || seg === '..') {
      throw new Error(`Path traversal not allowed: "${path}"`);
    }
    result.push(seg);
  }

  return result.join('/').toLowerCase();
}

export interface JazImage {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}

export async function decodeJaz(data: Uint8Array): Promise<JazImage> {
  if (data.length < 9) {
    throw new Error('JAZ data too short');
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const method = data[0];
  if (method !== 1) {
    throw new Error(`Unsupported JAZ compression method: ${method} (expected 1 for zlib)`);
  }

  const compSize = view.getUint32(1, true);
  const rawSize = view.getUint32(5, true);

  if (9 + compSize > data.length) {
    throw new Error(`JAZ compressed size ${compSize} exceeds available data`);
  }

  const zlibStream = data.slice(9, 9 + compSize);
  let decompressed: Uint8Array;
  try {
    decompressed = pako.inflate(zlibStream);
  } catch (e) {
    throw new Error(`Failed to decompress JAZ zlib stream: ${e}`);
  }

  if (decompressed.length !== rawSize) {
    throw new Error(`JAZ decompressed size ${decompressed.length} doesn't match expected ${rawSize}`);
  }

  const decompView = new DataView(decompressed.buffer, decompressed.byteOffset, decompressed.byteLength);
  const jpegLen = decompView.getUint32(0, true);

  if (4 + jpegLen > decompressed.length) {
    throw new Error(`JAZ JPEG length ${jpegLen} exceeds decompressed data`);
  }

  const jpegBytes = decompressed.slice(4, 4 + jpegLen);
  const alphaRle = decompressed.slice(4 + jpegLen);

  const { imageData, width, height } = await decodeJpegToImageData(jpegBytes);

  const expectedPixels = width * height;
  const alpha = decodeAlphaRle(alphaRle, expectedPixels);

  const rgba = imageData.data;
  for (let i = 0; i < expectedPixels; i++) {
    rgba[i * 4 + 3] = alpha[i];
  }

  return { width, height, rgba };
}

async function decodeJpegToImageData(jpegBytes: Uint8Array): Promise<{ imageData: ImageData; width: number; height: number }> {
  const arrayBuffer = new ArrayBuffer(jpegBytes.length);
  new Uint8Array(arrayBuffer).set(jpegBytes);
  const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    return { imageData, width: img.width, height: img.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

function decodeAlphaRle(rleData: Uint8Array, expectedPixels: number): Uint8Array {
  const alpha = new Uint8Array(expectedPixels);
  let pixelIndex = 0;
  let rleIndex = 0;

  while (rleIndex + 1 < rleData.length && pixelIndex < expectedPixels) {
    const count = rleData[rleIndex];
    const value = rleData[rleIndex + 1];
    rleIndex += 2;

    for (let i = 0; i < count && pixelIndex < expectedPixels; i++) {
      alpha[pixelIndex++] = value;
    }
  }

  return alpha;
}

export function jazToCanvas(jaz: JazImage): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = jaz.width;
  canvas.height = jaz.height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(jaz.width, jaz.height);
  imageData.data.set(jaz.rgba);
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export async function jazToBlob(jaz: JazImage, type = 'image/png'): Promise<Blob> {
  const canvas = jazToCanvas(jaz);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to convert canvas to blob'));
    }, type);
  });
}

export function isJazFile(name: string): boolean {
  return name.toLowerCase().endsWith('.jaz');
}
