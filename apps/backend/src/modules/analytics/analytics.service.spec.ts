import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AnalyticsService } from './analytics.service';

const mockDataSource = () => ({
  query: jest.fn(),
});

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let ds: ReturnType<typeof mockDataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: DataSource, useFactory: mockDataSource }],
    }).compile();
    service = module.get(AnalyticsService);
    ds = module.get(DataSource);
  });

  describe('getRevenue', () => {
    it('returns mapped revenue rows with defaults', async () => {
      ds.query.mockResolvedValue([{ period: '2026-05', revenue: '5000.00', count: '10' }]);
      const result = await service.getRevenue({});
      expect(result).toEqual([{ period: '2026-05', revenue: 5000, count: 10 }]);
      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('DATE_FORMAT'),
        expect.any(Array),
      );
    });

    it('uses provided groupBy=day format', async () => {
      ds.query.mockResolvedValue([{ period: '2026-05-14', revenue: '200.50', count: '2' }]);
      const result = await service.getRevenue({
        groupBy: 'day',
        from: '2026-05-01',
        to: '2026-05-14',
      });
      expect(result[0].revenue).toBe(200.5);
      const [fmt] = ds.query.mock.calls[0][1];
      expect(fmt).toBe('%Y-%m-%d');
    });

    it('uses week format', async () => {
      ds.query.mockResolvedValue([]);
      await service.getRevenue({ groupBy: 'week' });
      const [fmt] = ds.query.mock.calls[0][1];
      expect(fmt).toBe('%x-W%v');
    });

    it('returns empty array when no rows', async () => {
      ds.query.mockResolvedValue([]);
      const result = await service.getRevenue({});
      expect(result).toEqual([]);
    });
  });

  describe('getMasterLoad', () => {
    it('returns master load with computed loadPercent', async () => {
      ds.query.mockResolvedValue([
        {
          masterId: 1,
          masterName: 'Іван Коваль',
          avgRating: '4.5',
          totalBookings: '8',
          completedBookings: '6',
          totalRevenue: '3200.00',
        },
      ]);
      const result = await service.getMasterLoad({ from: '2026-05-01', to: '2026-05-31' });
      expect(result[0].masterId).toBe(1);
      expect(result[0].masterName).toBe('Іван Коваль');
      expect(result[0].totalBookings).toBe(8);
      expect(result[0].avgRating).toBe(4.5);
      expect(result[0].loadPercent).toBeGreaterThanOrEqual(0);
      expect(result[0].loadPercent).toBeLessThanOrEqual(100);
    });

    it('uses default date range when dto is empty', async () => {
      ds.query.mockResolvedValue([]);
      await service.getMasterLoad({});
      expect(ds.query).toHaveBeenCalled();
    });

    it('caps loadPercent at 100', async () => {
      ds.query.mockResolvedValue([
        {
          masterId: 1,
          masterName: 'X',
          avgRating: '5',
          totalBookings: '10000',
          completedBookings: '9000',
          totalRevenue: '0',
        },
      ]);
      const result = await service.getMasterLoad({ from: '2026-05-14', to: '2026-05-15' });
      expect(result[0].loadPercent).toBe(100);
    });
  });

  describe('getTopServices', () => {
    it('returns mapped service rows', async () => {
      ds.query.mockResolvedValue([
        {
          serviceId: 1,
          serviceName: 'ТО',
          categoryName: 'Сервіс',
          bookingCount: '5',
          revenue: '2500.00',
        },
      ]);
      const result = await service.getTopServices({});
      expect(result[0].serviceId).toBe(1);
      expect(result[0].bookingCount).toBe(5);
      expect(result[0].revenue).toBe(2500);
      expect(result[0].avgPrice).toBe(500);
    });

    it('sets avgPrice=0 when bookingCount=0', async () => {
      ds.query.mockResolvedValue([
        { serviceId: 2, serviceName: 'X', categoryName: 'Y', bookingCount: '0', revenue: '0' },
      ]);
      const result = await service.getTopServices({ limit: 5 });
      expect(result[0].avgPrice).toBe(0);
    });
  });

  describe('getClientsRetention', () => {
    it('returns parsed client retention metrics', async () => {
      ds.query.mockResolvedValue([
        {
          newClients: '3',
          returningClients: '7',
          churnedClients: '1',
          totalClients: '11',
          avgBookingsPerClient: '2.5',
        },
      ]);
      const result = await service.getClientsRetention();
      expect(result.newClients).toBe(3);
      expect(result.returningClients).toBe(7);
      expect(result.avgBookingsPerClient).toBe(2.5);
    });

    it('handles null values with defaults', async () => {
      ds.query.mockResolvedValue([
        {
          newClients: null,
          returningClients: null,
          churnedClients: null,
          totalClients: null,
          avgBookingsPerClient: null,
        },
      ]);
      const result = await service.getClientsRetention();
      expect(result.newClients).toBe(0);
      expect(result.avgBookingsPerClient).toBe(0);
    });
  });

  describe('getBookingFunnel', () => {
    it('returns all statuses with percent relative to PENDING', async () => {
      ds.query.mockResolvedValue([
        { status: 'PENDING', count: '10' },
        { status: 'CONFIRMED', count: '8' },
        { status: 'COMPLETED', count: '5' },
      ]);
      const result = await service.getBookingFunnel();
      expect(result).toHaveLength(5);
      const pending = result.find((r) => r.status === 'PENDING');
      expect(pending?.count).toBe(10);
      expect(pending?.percent).toBe(100);
      const confirmed = result.find((r) => r.status === 'CONFIRMED');
      expect(confirmed?.count).toBe(8);
      expect(confirmed?.percent).toBe(80);
    });

    it('returns 0% when PENDING count is 0', async () => {
      ds.query.mockResolvedValue([]);
      const result = await service.getBookingFunnel();
      expect(result.every((r) => r.percent === 0)).toBe(true);
    });
  });

  describe('getSummary', () => {
    it('returns aggregated summary data', async () => {
      ds.query
        .mockResolvedValueOnce([{ total: '20', clients: '15', masters: '5' }])
        .mockResolvedValueOnce([{ total: '30', today: '3', thisMonth: '12', pending: '4' }])
        .mockResolvedValueOnce([{ total: '15000.00', today: '500.00', thisMonth: '3000.00' }])
        .mockResolvedValueOnce([{ avg: '4.3' }]);

      const result = await service.getSummary();
      expect(result.totalUsers).toBe(20);
      expect(result.totalClients).toBe(15);
      expect(result.totalMasters).toBe(5);
      expect(result.bookingsToday).toBe(3);
      expect(result.totalRevenue).toBe(15000);
      expect(result.avgRating).toBe(4.3);
    });
  });
});
