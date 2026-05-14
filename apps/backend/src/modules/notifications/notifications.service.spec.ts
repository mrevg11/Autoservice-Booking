import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from '../../database/entities/notification.entity';
import { Booking } from '../../database/entities/booking.entity';
import { MailService } from '../mail/mail.service';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { Role } from '../../common/enums/role.enum';

const makeUser = (id = 1) => ({
  id,
  email: `user${id}@test.com`,
  firstName: 'Іван',
  lastName: 'Петренко',
  role: Role.CLIENT,
  isBlocked: false,
});

const makeBooking = (overrides = {}): Booking =>
  ({
    id: 1,
    client: makeUser(1),
    master: { id: 1, user: { id: 2, firstName: 'Майстер', lastName: 'Ковань' } },
    status: BookingStatus.CONFIRMED,
    scheduledAt: new Date(Date.now() + 24 * 3600_000),
    estimatedDurationMinutes: 60,
    totalPrice: 500,
    bookingServices: [{ service: { name: 'ТО' } }],
    ...overrides,
  } as unknown as Booking);

const mockNotifRepo = () => ({
  create: jest.fn().mockImplementation((d) => d),
  save: jest.fn().mockImplementation(async (d) => d),
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue(undefined),
});

const mockBookingsRepo = () => ({
  find: jest.fn().mockResolvedValue([]),
});

const mockMailService = () => ({
  sendBookingConfirmed: jest.fn().mockResolvedValue(undefined),
  sendBookingReminder24h: jest.fn().mockResolvedValue(undefined),
  sendBookingReminder2h: jest.fn().mockResolvedValue(undefined),
  sendBookingCancelled: jest.fn().mockResolvedValue(undefined),
  sendStatusChanged: jest.fn().mockResolvedValue(undefined),
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notifRepo: ReturnType<typeof mockNotifRepo>;
  let bookingsRepo: ReturnType<typeof mockBookingsRepo>;
  let mailService: ReturnType<typeof mockMailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useFactory: mockNotifRepo },
        { provide: getRepositoryToken(Booking), useFactory: mockBookingsRepo },
        { provide: MailService, useFactory: mockMailService },
      ],
    }).compile();

    service = module.get(NotificationsService);
    notifRepo = module.get(getRepositoryToken(Notification));
    bookingsRepo = module.get(getRepositoryToken(Booking));
    mailService = module.get(MailService);
  });

  describe('notifyBookingConfirmed', () => {
    it('creates notification and sends email', async () => {
      const booking = makeBooking();
      await service.notifyBookingConfirmed(booking);

      expect(notifRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.BOOKING_CONFIRMED }),
      );
      expect(mailService.sendBookingConfirmed).toHaveBeenCalledWith(
        booking.client.email,
        expect.objectContaining({ bookingId: booking.id }),
      );
      expect(notifRepo.save).toHaveBeenCalledTimes(2);
    });

    it('does not throw when email send fails', async () => {
      mailService.sendBookingConfirmed.mockRejectedValue(new Error('SMTP error'));
      const booking = makeBooking();
      await expect(service.notifyBookingConfirmed(booking)).resolves.not.toThrow();
      // notifRepo.save called once (before failed send), sentAt stays null
      expect(notifRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('notifyStatusChanged', () => {
    it('sends status changed email with label', async () => {
      const booking = makeBooking();
      await service.notifyStatusChanged(booking, BookingStatus.IN_PROGRESS);

      expect(mailService.sendStatusChanged).toHaveBeenCalledWith(
        booking.client.email,
        expect.objectContaining({ newStatus: 'Виконується' }),
      );
    });
  });

  describe('notifyBookingCancelled', () => {
    it('sends cancelled email with default reason', async () => {
      const booking = makeBooking();
      await service.notifyBookingCancelled(booking);

      expect(mailService.sendBookingCancelled).toHaveBeenCalledWith(
        booking.client.email,
        expect.objectContaining({ reason: 'Скасовано користувачем' }),
      );
    });

    it('sends cancelled email with custom reason', async () => {
      const booking = makeBooking();
      await service.notifyBookingCancelled(booking, 'Майстер захворів');
      expect(mailService.sendBookingCancelled).toHaveBeenCalledWith(
        booking.client.email,
        expect.objectContaining({ reason: 'Майстер захворів' }),
      );
    });
  });

  describe('sendReminders24h', () => {
    it('sends reminder to booking scheduled tomorrow', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const booking = makeBooking({ scheduledAt: tomorrow });
      bookingsRepo.find.mockResolvedValue([booking]);

      await service.sendReminders24h();

      expect(mailService.sendBookingReminder24h).toHaveBeenCalledWith(
        booking.client.email,
        expect.objectContaining({ bookingId: booking.id }),
      );
    });

    it('skips booking if reminder already sent today', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const booking = makeBooking({ scheduledAt: tomorrow });
      bookingsRepo.find.mockResolvedValue([booking]);
      notifRepo.findOne.mockResolvedValue({ sentAt: new Date() }); // already sent today

      await service.sendReminders24h();
      expect(mailService.sendBookingReminder24h).not.toHaveBeenCalled();
    });

    it('does nothing when no bookings tomorrow', async () => {
      bookingsRepo.find.mockResolvedValue([]);
      await service.sendReminders24h();
      expect(mailService.sendBookingReminder24h).not.toHaveBeenCalled();
    });
  });

  describe('sendReminders2h', () => {
    it('sends 2h reminder for upcoming booking', async () => {
      const in2h = new Date(Date.now() + 2 * 3600_000);
      in2h.setMinutes(30, 0, 0);
      const booking = makeBooking({ scheduledAt: in2h });
      bookingsRepo.find.mockResolvedValue([booking]);
      notifRepo.findOne.mockResolvedValue(null);

      await service.sendReminders2h();
      expect(mailService.sendBookingReminder2h).toHaveBeenCalled();
    });

    it('skips if 2h reminder already sent', async () => {
      const in2h = new Date(Date.now() + 2 * 3600_000);
      in2h.setMinutes(30, 0, 0);
      const booking = makeBooking({ scheduledAt: in2h });
      bookingsRepo.find.mockResolvedValue([booking]);
      notifRepo.findOne.mockResolvedValue({ sentAt: new Date() });

      await service.sendReminders2h();
      expect(mailService.sendBookingReminder2h).not.toHaveBeenCalled();
    });
  });

  describe('getMyNotifications', () => {
    it('returns notifications for user', async () => {
      const notifs = [{ id: 1, type: NotificationType.BOOKING_CONFIRMED }];
      notifRepo.find.mockResolvedValue(notifs);
      const result = await service.getMyNotifications(1);
      expect(result).toEqual(notifs);
      expect(notifRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user: { id: 1 } } }),
      );
    });
  });

  describe('markRead', () => {
    it('updates readAt for the notification', async () => {
      await service.markRead(5, 1);
      expect(notifRepo.update).toHaveBeenCalledWith(
        { id: 5, user: { id: 1 } },
        expect.objectContaining({ readAt: expect.any(Date) }),
      );
    });
  });
});
