import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { v2 as cloudinary } from 'cloudinary';

export const UPLOADS_ROUTE = '/uploads';
const CLOUDINARY_FOLDER = 'veyro';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  readonly rootDir: string;
  private readonly publicPrefix: string;
  readonly usesCloudinary: boolean;
  private readonly cloudinaryCloudName?: string;

  constructor(config: ConfigService) {
    this.rootDir = resolve(config.get<string>('UPLOADS_DIR') ?? 'uploads');
    const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME')?.trim();
    const apiKey = config.get<string>('CLOUDINARY_API_KEY')?.trim();
    const apiSecret = config.get<string>('CLOUDINARY_API_SECRET')?.trim();
    const cloudinarySettings = [cloudName, apiKey, apiSecret];

    if (cloudinarySettings.some(Boolean) && !cloudinarySettings.every(Boolean)) {
      throw new Error(
        'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must all be configured',
      );
    }

    this.usesCloudinary = cloudinarySettings.every(Boolean);
    this.cloudinaryCloudName = cloudName;

    if (this.usesCloudinary) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }

    const base = (
      config.get<string>('PUBLIC_BASE_URL') ??
      `http://localhost:${config.get<string>('PORT') ?? 3000}`
    ).replace(/\/+$/, '');
    this.publicPrefix = `${base}${UPLOADS_ROUTE}/`;
  }

  async onModuleInit() {
    if (!this.usesCloudinary) {
      await mkdir(this.rootDir, { recursive: true });
    }
  }

  async save(buffer: Buffer, extension: string): Promise<string> {
    if (this.usesCloudinary) {
      return this.saveToCloudinary(buffer, extension);
    }

    const fileName = `${randomUUID()}.${extension}`;
    await writeFile(join(this.rootDir, fileName), buffer);
    return this.publicPrefix + fileName;
  }

  isOwnUrl(url: string): boolean {
    if (this.usesCloudinary) {
      return this.cloudinaryPublicId(url) !== null;
    }

    return url.startsWith(this.publicPrefix);
  }

  // Only files we created are ever removed; external URLs are ignored
  async remove(urls: string[]): Promise<void> {
    if (this.usesCloudinary) {
      await Promise.all(
        urls
          .filter((url) => this.isOwnUrl(url))
          .map((url) => this.removeFromCloudinary(url)),
      );
      return;
    }

    await Promise.all(
      urls
        .filter((url) => this.isOwnUrl(url))
        .map(async (url) => {
          const fileName = url.slice(this.publicPrefix.length);

          if (!/^[\w-]+\.(jpg|png|webp)$/.test(fileName)) {
            return;
          }

          try {
            await unlink(join(this.rootDir, fileName));
          } catch {
            this.logger.warn(`Could not delete stored file ${fileName}`);
          }
        }),
    );
  }

  private async saveToCloudinary(buffer: Buffer, extension: string): Promise<string> {
    const publicId = `${CLOUDINARY_FOLDER}/${randomUUID()}`;

    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          public_id: publicId,
          format: extension,
          overwrite: false,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (!result) {
            reject(new Error('Cloudinary returned no upload result'));
          } else {
            resolve(result.secure_url);
          }
        },
      );

      upload.end(buffer);
    });
  }

  private async removeFromCloudinary(url: string): Promise<void> {
    const publicId = this.cloudinaryPublicId(url);

    if (!publicId) {
      return;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true,
      });

      if (result.result !== 'ok' && result.result !== 'not found') {
        this.logger.warn(`Could not delete Cloudinary image ${publicId}`);
      }
    } catch (error) {
      this.logger.warn(
        `Could not delete Cloudinary image ${publicId}: ${(error as Error).message}`,
      );
    }
  }

  private cloudinaryPublicId(url: string): string | null {
    try {
      const parsed = new URL(url);
      const segments = parsed.pathname.split('/').filter(Boolean);

      if (
        parsed.protocol !== 'https:' ||
        parsed.hostname !== 'res.cloudinary.com' ||
        segments[0] !== this.cloudinaryCloudName ||
        segments[1] !== 'image' ||
        segments[2] !== 'upload'
      ) {
        return null;
      }

      const assetSegments = segments.slice(3);

      if (/^v\d+$/.test(assetSegments[0] ?? '')) {
        assetSegments.shift();
      }

      if (
        assetSegments.length !== 2 ||
        assetSegments[0] !== CLOUDINARY_FOLDER ||
        !/^[\w-]+\.(jpg|png|webp)$/.test(assetSegments[1])
      ) {
        return null;
      }

      return `${assetSegments[0]}/${assetSegments[1].replace(/\.(jpg|png|webp)$/, '')}`;
    } catch {
      return null;
    }
  }
}
