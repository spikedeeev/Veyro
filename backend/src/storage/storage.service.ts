import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export const UPLOADS_ROUTE = '/uploads';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  readonly rootDir: string;
  private readonly publicPrefix: string;

  constructor(config: ConfigService) {
    this.rootDir = resolve(config.get<string>('UPLOADS_DIR') ?? 'uploads');
    const base = (
      config.get<string>('PUBLIC_BASE_URL') ??
      `http://localhost:${config.get<string>('PORT') ?? 3000}`
    ).replace(/\/+$/, '');
    this.publicPrefix = `${base}${UPLOADS_ROUTE}/`;
  }

  async onModuleInit() {
    await mkdir(this.rootDir, { recursive: true });
  }

  async save(buffer: Buffer, extension: string): Promise<string> {
    const fileName = `${randomUUID()}.${extension}`;
    await writeFile(join(this.rootDir, fileName), buffer);
    return this.publicPrefix + fileName;
  }

  isOwnUrl(url: string): boolean {
    return url.startsWith(this.publicPrefix);
  }

  // Only files we created are ever removed; external URLs are ignored
  async remove(urls: string[]): Promise<void> {
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
}
