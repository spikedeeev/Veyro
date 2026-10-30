import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { StorageService } from './storage.service';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const DEFAULT_ALLOWED_HOSTS = ['images.unsplash.com', 'images.pexels.com'];

export type UploadedImage = {
  buffer: Buffer;
  originalname: string;
  size: number;
};

export function detectImageType(buffer: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}

export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }

  const lower = address.toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);

  if (mapped) {
    return isPrivateAddress(mapped[1]);
  }

  return (
    lower === '::' ||
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80')
  );
}

@Injectable()
export class ImageStorageService {
  private readonly allowedHosts: string[];

  constructor(
    private readonly storage: StorageService,
    config: ConfigService,
  ) {
    const extra = (config.get<string>('IMAGE_IMPORT_HOSTS') ?? '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);
    this.allowedHosts = [...DEFAULT_ALLOWED_HOSTS, ...extra];
  }

  async saveUploaded(file: UploadedImage): Promise<string> {
    return this.saveBuffer(file.buffer, file.originalname);
  }

  // All-or-nothing: a failure removes files already stored in this call
  async saveUploadedMany(files: UploadedImage[]): Promise<string[]> {
    return this.all(files, (file) => this.saveUploaded(file));
  }

  async importUrls(urls: string[]): Promise<string[]> {
    return this.all(urls, (url) => this.importUrl(url));
  }

  async importUrl(rawUrl: string): Promise<string> {
    if (this.storage.isOwnUrl(rawUrl)) {
      return rawUrl;
    }

    const buffer = await this.download(rawUrl);
    return this.saveBuffer(buffer, rawUrl);
  }

  private async all<T>(
    items: T[],
    save: (item: T) => Promise<string>,
  ): Promise<string[]> {
    const saved: string[] = [];

    try {
      for (const item of items) {
        saved.push(await save(item));
      }
    } catch (error) {
      await this.storage.remove(saved);
      throw error;
    }

    return saved;
  }

  private async saveBuffer(buffer: Buffer, label: string): Promise<string> {
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException(
        `Image "${label}" must be between 1 byte and ${MAX_IMAGE_BYTES / 1024 / 1024} MB`,
      );
    }

    const type = detectImageType(buffer);

    if (!type) {
      throw new BadRequestException(
        `Image "${label}" must be a JPEG, PNG or WebP file`,
      );
    }

    return this.storage.save(buffer, type);
  }

  private async assertAllowed(url: URL) {
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new BadRequestException('Only http(s) image URLs are allowed');
    }

    const host = url.hostname.toLowerCase();

    if (!this.allowedHosts.includes(host)) {
      throw new BadRequestException(
        `Host "${host}" is not allowed. Allowed: ${this.allowedHosts.join(', ')}`,
      );
    }

    const addresses = await lookup(host, { all: true }).catch(() => []);

    if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
      throw new BadRequestException(`Host "${host}" could not be resolved safely`);
    }
  }

  private async download(rawUrl: string): Promise<Buffer> {
    let current: URL;

    try {
      current = new URL(rawUrl);
    } catch {
      throw new BadRequestException(`Invalid image URL: ${rawUrl}`);
    }

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await this.assertAllowed(current);
      const target = current;

      const response = await fetch(target, {
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { accept: 'image/jpeg,image/png,image/webp' },
      }).catch(() => {
        throw new BadRequestException(`Could not download image from ${target.hostname}`);
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');

        if (!location) {
          break;
        }

        current = new URL(location, target);
        continue;
      }

      if (!response.ok || !response.body) {
        throw new BadRequestException(
          `Download failed with status ${response.status} for ${target.hostname}`,
        );
      }

      return this.readLimited(response);
    }

    throw new BadRequestException('Too many redirects while downloading image');
  }

  private async readLimited(response: Response): Promise<Buffer> {
    const declared = Number(response.headers.get('content-length') ?? 0);

    if (declared > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Image is larger than 5 MB');
    }

    const chunks: Buffer[] = [];
    let total = 0;

    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      total += chunk.length;

      if (total > MAX_IMAGE_BYTES) {
        throw new BadRequestException('Image is larger than 5 MB');
      }

      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }
}
