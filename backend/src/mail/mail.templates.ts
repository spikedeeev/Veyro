import { Injectable } from '@nestjs/common';
import { MailService } from './mail.service';

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

type OrderMailItem = { productName: string; size: string; color: string; quantity: number; unitPrice: unknown };
type OrderMailData = { id: string; status: string; total: unknown; items: OrderMailItem[] };

@Injectable()
export class MailTemplates {
  constructor(private readonly mail: MailService) {}

  sendPasswordReset(to: string, link: string) {
    return this.mail.send({
      to,
      subject: 'Password reset',
      text: `You requested a password reset. Follow the link (valid for 1 hour):\n${link}\n\nIf this wasn't you, just ignore this email.`,
      html: `<p>You requested a password reset.</p><p><a href="${escapeHtml(link)}">Set a new password</a> (the link is valid for 1 hour).</p><p>If this wasn't you, just ignore this email.</p>`,
    });
  }

  sendPasswordChanged(to: string) {
    return this.mail.send({
      to,
      subject: 'Password changed',
      text: "Your account password was changed and all active sessions were signed out. If this wasn't you, reset your password again immediately.",
    });
  }

  sendOrderCreated(to: string, order: OrderMailData) {
    return this.mail.send({
      to,
      subject: `Order ${order.id} placed`,
      text: `Thank you for your order!\n\n${this.lines(order)}\n\nTotal: $${order.total}\nPlease pay for your order so we can start shipping it.`,
    });
  }

  sendOrderStatus(to: string, order: OrderMailData, reason?: string) {
    const titles: Record<string, string> = {
      PAID: 'paid',
      SHIPPED: 'shipped',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
    };
    const title = titles[order.status] ?? order.status;

    return this.mail.send({
      to,
      subject: `Order ${order.id}: ${title}`,
      text: `Your order ${order.id} status changed: ${title}.${reason ? `\n${reason}` : ''}\n\n${this.lines(order)}\n\nTotal: $${order.total}`,
    });
  }

  private lines(order: OrderMailData) {
    return order.items
      .map((i) => `- ${i.productName} (${i.size}, ${i.color}) x${i.quantity} — $${i.unitPrice}`)
      .join('\n');
  }
}
