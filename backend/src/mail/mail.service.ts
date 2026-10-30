import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER');

    this.from = config.get<string>('MAIL_FROM') ?? 'Veyro <no-reply@veyro.local>';
    this.transporter = host
      ? createTransport({
          host,
          port: Number(config.get('SMTP_PORT') ?? 587),
          secure: config.get('SMTP_SECURE') === 'true',
          auth: user ? { user, pass: config.get<string>('SMTP_PASS') } : undefined,
        })
      : null;

    if (!this.transporter) {
      this.logger.warn('SMTP_HOST is not set: emails are only written to the log');
    }
  }

  // Mail problems must never break the business flow that triggered the email
  async send(message: MailMessage): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(`[mail disabled] to=${message.to} subject="${message.subject}"`);
      return false;
    }

    try {
      await this.transporter.sendMail({ from: this.from, ...message });
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send "${message.subject}" to ${message.to}: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
