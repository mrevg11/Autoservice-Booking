import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import * as nodemailer from 'nodemailer';

export interface BookingEmailContext {
  bookingId: number;
  clientName: string;
  masterName: string;
  services: string;
  scheduledAt: string;
  duration: number;
  totalPrice: string;
  bookingUrl: string;
}

export interface BookingCancelledContext extends BookingEmailContext {
  reason: string;
}

export interface StatusChangedContext {
  bookingId: number;
  clientName: string;
  newStatus: string;
  scheduledAt: string;
  bookingUrl: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    const secure = this.config.get<string>('MAIL_SECURE') === 'true';
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('MAIL_HOST'),
      port: this.config.get<number>('MAIL_PORT'),
      secure,
      auth: {
        user: this.config.get<string>('MAIL_USER'),
        pass: this.config.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendEmailVerification(to: string, token: string, firstName = 'Користувачу'): Promise<void> {
    const verifyUrl = `${this.config.get('FRONTEND_URL') ?? 'http://localhost:5173'}/verify-email?token=${token}`;
    const html = this.renderTemplate('email-verification', { firstName, verifyUrl });
    await this.send(to, 'Підтвердіть email — AutoService', html);
  }

  async sendPasswordReset(to: string, token: string, firstName = 'Користувачу'): Promise<void> {
    const resetUrl = `${this.config.get('FRONTEND_URL') ?? 'http://localhost:5173'}/reset-password?token=${token}`;
    const html = this.renderTemplate('password-reset', { firstName, resetUrl });
    await this.send(to, 'Скидання паролю — AutoService', html);
  }

  async sendBookingConfirmed(to: string, context: BookingEmailContext): Promise<void> {
    const html = this.renderTemplate('booking-confirmed', context);
    await this.send(to, `Запис #${context.bookingId} підтверджено — AutoService`, html);
  }

  async sendBookingReminder24h(to: string, context: BookingEmailContext): Promise<void> {
    const html = this.renderTemplate('booking-reminder-24h', context);
    await this.send(to, '🔔 Нагадування: запис завтра — AutoService', html);
  }

  async sendBookingReminder2h(to: string, context: BookingEmailContext): Promise<void> {
    const html = this.renderTemplate('booking-reminder-2h', context);
    await this.send(to, '⏰ Запис через 2 години — AutoService', html);
  }

  async sendBookingCancelled(to: string, context: BookingCancelledContext): Promise<void> {
    const html = this.renderTemplate('booking-cancelled', context);
    await this.send(to, `Запис #${context.bookingId} скасовано — AutoService`, html);
  }

  async sendStatusChanged(to: string, context: StatusChangedContext): Promise<void> {
    const html = this.renderTemplate('status-changed', context);
    await this.send(to, 'Статус запису змінено — AutoService', html);
  }

  private renderTemplate(templateName: string, context: object): string {
    const templatesDir = path.join(__dirname, '..', 'notifications', 'templates');
    const templatePath = path.join(templatesDir, `${templateName}.hbs`);
    const basePath = path.join(templatesDir, 'base.hbs');

    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const baseSource = fs.readFileSync(basePath, 'utf-8');

    const template = Handlebars.compile(templateSource);
    const body = template({ ...context, year: new Date().getFullYear() });

    const baseTemplate = Handlebars.compile(baseSource);
    return baseTemplate({ body, year: new Date().getFullYear() });
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: this.config.get<string>('MAIL_FROM'),
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
    }
  }
}
