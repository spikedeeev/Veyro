import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { MailTemplates } from '../mail/mail.templates';
import { RedisService } from '../redis/redis.service';

const TOKEN_TTL_MS = 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class PasswordResetService implements OnModuleInit {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly mail: MailTemplates,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const timer = setInterval(() => {
      this.prisma.passwordResetToken
        .deleteMany({ where: { expiresAt: { lt: new Date() } } })
        .catch((error: Error) => this.logger.error(`Token cleanup failed: ${error.message}`));
    }, CLEANUP_INTERVAL_MS);
    timer.unref();
  }

  // The response never reveals whether the email is registered
  async requestReset(rawEmail: string) {
    const email = rawEmail.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = randomBytes(32).toString('hex');

      await this.prisma.$transaction([
        this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
        this.prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: sha256(token),
            expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
          },
        }),
      ]);

      const base = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
      await this.mail.sendPasswordReset(
        user.email,
        `${base.replace(/\/$/, '')}/reset-password?token=${token}`,
      );
    }

    return { message: 'If this email is registered, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Atomic claim: only one concurrent request can consume the token
    const consumed = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      if (claim.count === 0) {
        return false;
      }

      await tx.user.update({ where: { id: record.userId }, data: { password: passwordHash } });
      await tx.passwordResetToken.deleteMany({
        where: { userId: record.userId, id: { not: record.id } },
      });

      return true;
    });

    if (!consumed) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.revokeAllSessions(record.userId, record.user.email);
    await this.mail.sendPasswordChanged(record.user.email);

    return { message: 'Password has been changed. Please log in again' };
  }

  private async revokeAllSessions(userId: number, email: string) {
    const redis = this.redisService.getClient();
    let cursor = '0';

    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', 'session:refresh:*', 'COUNT', 200);
      cursor = next;

      for (const key of keys) {
        const raw = await redis.get(key);

        try {
          if (raw && (JSON.parse(raw) as { userId?: number }).userId === userId) {
            await redis.del(key);
          }
        } catch {
          // skip malformed session entries
        }
      }
    } while (cursor !== '0');

    await redis.del(`used:refresh:${userId}`, `login:attempts:${email}`, `login:block:${email}`);
  }
}
