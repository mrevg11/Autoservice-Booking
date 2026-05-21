import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Notification } from '../../database/entities/notification.entity';
import { Booking } from '../../database/entities/booking.entity';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { MailService } from '../mail/mail.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
    @InjectRepository(Booking) private bookingsRepo: Repository<Booking>,
    private mailService: MailService,
  ) {}

  async notifyBookingConfirmed(booking: Booking): Promise<void> {
    if (!booking.client) return;
    await this.sendAndLog(
      booking.client,
      NotificationType.BOOKING_CONFIRMED,
      'Запис підтверджено',
      `Ваш запис #${booking.id} підтверджено майстром`,
      async () => {
        await this.mailService.sendBookingConfirmed(
          booking.client!.email,
          this.buildBookingContext(booking),
        );
      },
    );
  }

  async notifyStatusChanged(booking: Booking, newStatus: BookingStatus): Promise<void> {
    if (!booking.client) return;
    const statusLabels: Record<BookingStatus, string> = {
      [BookingStatus.PENDING]: 'Очікує',
      [BookingStatus.CONFIRMED]: 'Підтверджено',
      [BookingStatus.IN_PROGRESS]: 'Виконується',
      [BookingStatus.COMPLETED]: 'Завершено',
      [BookingStatus.CANCELLED]: 'Скасовано',
    };
    await this.sendAndLog(
      booking.client,
      NotificationType.STATUS_CHANGED,
      'Статус запису змінено',
      `Запис #${booking.id}: ${statusLabels[newStatus]}`,
      async () => {
        await this.mailService.sendStatusChanged(booking.client!.email, {
          bookingId: booking.id,
          clientName: `${booking.client!.firstName} ${booking.client!.lastName}`,
          newStatus: statusLabels[newStatus],
          scheduledAt: this.formatDate(booking.scheduledAt),
          bookingUrl: `${process.env['FRONTEND_URL'] ?? 'http://localhost:5173'}/client/bookings/${booking.id}`,
        });
      },
    );
  }

  async notifyBookingCancelled(booking: Booking, reason = 'Скасовано користувачем'): Promise<void> {
    if (!booking.client) return;
    await this.sendAndLog(
      booking.client,
      NotificationType.BOOKING_CANCELLED,
      'Запис скасовано',
      `Запис #${booking.id} скасовано`,
      async () => {
        await this.mailService.sendBookingCancelled(booking.client!.email, {
          ...this.buildBookingContext(booking),
          reason,
        });
      },
    );
  }

  @Cron('0 9 * * *')
  async sendReminders24h(): Promise<void> {
    this.logger.log('Running 24h reminder cron...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(tomorrow);
    start.setHours(0, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(23, 59, 59, 999);

    const bookings = await this.bookingsRepo.find({
      where: { status: BookingStatus.CONFIRMED },
      relations: ['client', 'master', 'master.user', 'bookingServices', 'bookingServices.service'],
    });

    const tomorrowBookings = bookings.filter((b) => {
      const d = new Date(b.scheduledAt);
      return d >= start && d <= end;
    });

    let sent = 0;
    for (const booking of tomorrowBookings) {
      if (!booking.client) continue;
      const alreadySent = await this.notifRepo.findOne({
        where: { user: { id: booking.client.id }, type: NotificationType.BOOKING_REMINDER_24H },
      });
      if (alreadySent?.sentAt) {
        const sentDay = new Date(alreadySent.sentAt).toDateString();
        if (sentDay === new Date().toDateString()) continue;
      }
      await this.sendAndLog(
        booking.client,
        NotificationType.BOOKING_REMINDER_24H,
        'Нагадування: запис завтра',
        `Запис #${booking.id} — ${this.formatDate(booking.scheduledAt)}`,
        async () => {
          await this.mailService.sendBookingReminder24h(
            booking.client!.email,
            this.buildBookingContext(booking),
          );
        },
      );
      sent++;
    }
    this.logger.log(`24h reminders sent: ${sent}`);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sendReminders2h(): Promise<void> {
    const now = new Date();
    const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const windowStart = new Date(in2h);
    windowStart.setMinutes(0, 0, 0);
    const windowEnd = new Date(in2h);
    windowEnd.setMinutes(59, 59, 999);

    const bookings = await this.bookingsRepo.find({
      where: { status: BookingStatus.CONFIRMED },
      relations: ['client', 'master', 'master.user', 'bookingServices', 'bookingServices.service'],
    });

    const upcoming = bookings.filter((b) => {
      const d = new Date(b.scheduledAt);
      return d >= windowStart && d <= windowEnd;
    });

    for (const booking of upcoming) {
      if (!booking.client) continue;
      const alreadySent = await this.notifRepo.findOne({
        where: { user: { id: booking.client.id }, type: NotificationType.BOOKING_REMINDER_2H },
      });
      if (alreadySent?.sentAt) continue;
      await this.sendAndLog(
        booking.client,
        NotificationType.BOOKING_REMINDER_2H,
        'Запис через 2 години',
        `Запис #${booking.id} — ${this.formatDate(booking.scheduledAt)}`,
        async () => {
          await this.mailService.sendBookingReminder2h(
            booking.client!.email,
            this.buildBookingContext(booking),
          );
        },
      );
    }
  }

  async getMyNotifications(userId: number) {
    return this.notifRepo.find({
      where: { user: { id: userId } },
      order: { sentAt: 'DESC' },
      take: 50,
    });
  }

  async markRead(notifId: number, userId: number): Promise<void> {
    await this.notifRepo.update({ id: notifId, user: { id: userId } }, { readAt: new Date() });
  }

  private async sendAndLog(
    user: { id: number; email?: string },
    type: NotificationType,
    title: string,
    body: string,
    sendFn: () => Promise<void>,
  ): Promise<void> {
    const notif = this.notifRepo.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: user.id } as any,
      type,
      title,
      body,
      sentAt: null,
    });
    await this.notifRepo.save(notif);
    try {
      await sendFn();
      notif.sentAt = new Date();
      await this.notifRepo.save(notif);
    } catch (err) {
      this.logger.error(`Failed to send notification ${type} to user ${user.id}`, err);
    }
  }

  private buildBookingContext(booking: Booking) {
    const services =
      booking.bookingServices
        ?.map((bs) => bs.service?.name)
        .filter(Boolean)
        .join(', ') ?? '';
    return {
      bookingId: booking.id,
      clientName: booking.client
        ? `${booking.client.firstName} ${booking.client.lastName}`
        : 'Клієнт',
      masterName: booking.master?.user
        ? `${booking.master.user.firstName} ${booking.master.user.lastName}`
        : 'Майстер',
      services,
      scheduledAt: this.formatDate(booking.scheduledAt),
      duration: booking.estimatedDurationMinutes,
      totalPrice: Number(booking.totalPrice).toFixed(2),
      bookingUrl: `${process.env['FRONTEND_URL'] ?? 'http://localhost:5173'}/client/bookings/${booking.id}`,
    };
  }

  private formatDate(date: Date | string): string {
    return new Date(date).toLocaleString('uk-UA', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
