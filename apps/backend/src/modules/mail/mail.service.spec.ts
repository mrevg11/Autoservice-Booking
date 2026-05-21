import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('{{body}} {{year}}'),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  }),
}));

const mockConfigService = () => ({
  get: jest.fn((key: string) => {
    const map: Record<string, unknown> = {
      MAIL_HOST: 'smtp.test.com',
      MAIL_PORT: 587,
      MAIL_USER: 'test@test.com',
      MAIL_PASS: 'pass',
      MAIL_FROM: 'noreply@test.com',
      FRONTEND_URL: 'http://localhost:5173',
    };
    return map[key];
  }),
});

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService, { provide: ConfigService, useFactory: mockConfigService }],
    }).compile();
    service = module.get(MailService);
  });

  it('sendEmailVerification: does not throw', async () => {
    await expect(service.sendEmailVerification('to@test.com', 'tok123')).resolves.not.toThrow();
  });

  it('sendPasswordReset: does not throw', async () => {
    await expect(service.sendPasswordReset('to@test.com', 'tok456', 'Іван')).resolves.not.toThrow();
  });

  it('sendBookingConfirmed: does not throw', async () => {
    const ctx = {
      bookingId: 1,
      clientName: 'Клієнт',
      masterName: 'Майстер',
      services: 'ТО',
      scheduledAt: '01 травня 2026',
      duration: 60,
      totalPrice: '500.00',
      bookingUrl: 'http://localhost/booking/1',
    };
    await expect(service.sendBookingConfirmed('to@test.com', ctx)).resolves.not.toThrow();
  });

  it('sendBookingCancelled: does not throw', async () => {
    const ctx = {
      bookingId: 2,
      clientName: 'Клієнт',
      masterName: 'Майстер',
      services: 'ТО',
      scheduledAt: '01 травня 2026',
      duration: 60,
      totalPrice: '500.00',
      bookingUrl: 'http://localhost/booking/2',
      reason: 'Тест',
    };
    await expect(service.sendBookingCancelled('to@test.com', ctx)).resolves.not.toThrow();
  });

  it('sendStatusChanged: does not throw', async () => {
    await expect(
      service.sendStatusChanged('to@test.com', {
        bookingId: 3,
        clientName: 'Клієнт',
        newStatus: 'Підтверджено',
        scheduledAt: '01 травня 2026',
        bookingUrl: 'http://localhost/booking/3',
      }),
    ).resolves.not.toThrow();
  });

  it('sendBookingReminder24h: does not throw', async () => {
    const ctx = {
      bookingId: 4,
      clientName: 'Клієнт',
      masterName: 'Майстер',
      services: 'ТО',
      scheduledAt: '02 травня 2026',
      duration: 60,
      totalPrice: '400.00',
      bookingUrl: 'http://localhost/booking/4',
    };
    await expect(service.sendBookingReminder24h('to@test.com', ctx)).resolves.not.toThrow();
  });

  it('sendBookingReminder2h: does not throw', async () => {
    const ctx = {
      bookingId: 5,
      clientName: 'Клієнт',
      masterName: 'Майстер',
      services: 'ТО',
      scheduledAt: '02 травня 2026',
      duration: 60,
      totalPrice: '400.00',
      bookingUrl: 'http://localhost/booking/5',
    };
    await expect(service.sendBookingReminder2h('to@test.com', ctx)).resolves.not.toThrow();
  });
});
