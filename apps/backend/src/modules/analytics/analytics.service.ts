import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RevenueQueryDto, TopServicesQueryDto, DateRangeQueryDto } from './dto/analytics-query.dto';

@Injectable()
export class AnalyticsService {
  constructor(private dataSource: DataSource) {}

  async getRevenue(dto: RevenueQueryDto) {
    const formatMap = { day: '%Y-%m-%d', week: '%x-W%v', month: '%Y-%m' };
    const fmt = formatMap[dto.groupBy ?? 'month'];

    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setMonth(defaultFrom.getMonth() - 12);
    const from = dto.from ?? defaultFrom.toISOString().slice(0, 10);
    const to = dto.to ?? now.toISOString().slice(0, 10);

    const rows = await this.dataSource.query(
      `SELECT DATE_FORMAT(b.scheduledAt, ?) AS period,
              COALESCE(SUM(b.totalPrice), 0) AS revenue,
              COUNT(*) AS count
       FROM bookings b
       WHERE b.status = 'COMPLETED'
         AND DATE(b.scheduledAt) BETWEEN ? AND ?
       GROUP BY period
       ORDER BY period ASC`,
      [fmt, from, to],
    );
    return rows.map((r: any) => ({
      period: r.period,
      revenue: parseFloat(r.revenue),
      count: parseInt(r.count, 10),
    }));
  }

  async getMasterLoad(dto: DateRangeQueryDto) {
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 30);
    const from = dto.from ?? defaultFrom.toISOString().slice(0, 10);
    const to = dto.to ?? now.toISOString().slice(0, 10);

    const rows = await this.dataSource.query(
      `SELECT mp.id AS masterId,
              CONCAT(u.firstName, ' ', u.lastName) AS masterName,
              mp.rating AS avgRating,
              COUNT(b.id) AS totalBookings,
              SUM(CASE WHEN b.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completedBookings,
              COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' THEN b.totalPrice ELSE 0 END), 0) AS totalRevenue
       FROM master_profiles mp
       JOIN users u ON u.id = mp.userId
       LEFT JOIN bookings b ON b.masterId = mp.id
         AND (DATE(b.scheduledAt) BETWEEN ? AND ?)
       GROUP BY mp.id, u.firstName, u.lastName, mp.rating`,
      [from, to],
    );

    return rows.map((r: any) => {
      const total = parseInt(r.totalBookings, 10);
      // 8 working hours * 2 slots/hour = 16 slots per day; 30 days
      const daysRange = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
      const maxPossible = daysRange * 16;
      const loadPercent = Math.min(100, Math.round((total / maxPossible) * 100));
      return {
        masterId: r.masterId,
        masterName: r.masterName,
        totalBookings: total,
        completedBookings: parseInt(r.completedBookings, 10),
        totalRevenue: parseFloat(r.totalRevenue),
        avgRating: parseFloat(r.avgRating ?? '0'),
        loadPercent,
      };
    });
  }

  async getTopServices(dto: TopServicesQueryDto) {
    const limit = dto.limit ?? 10;
    const rows = await this.dataSource.query(
      `SELECT s.id AS serviceId, s.name AS serviceName,
              sc.name AS categoryName,
              COUNT(bs.id) AS bookingCount,
              COALESCE(SUM(bs.actualPrice), 0) AS revenue
       FROM booking_services bs
       JOIN services s ON s.id = bs.serviceId
       JOIN service_categories sc ON sc.id = s.categoryId
       JOIN bookings b ON b.id = bs.bookingId
       WHERE b.status = 'COMPLETED'
       GROUP BY s.id, s.name, sc.name
       ORDER BY bookingCount DESC
       LIMIT ?`,
      [limit],
    );
    return rows.map((r: any) => ({
      serviceId: r.serviceId,
      serviceName: r.serviceName,
      categoryName: r.categoryName,
      bookingCount: parseInt(r.bookingCount, 10),
      revenue: parseFloat(r.revenue),
      avgPrice: r.bookingCount > 0 ? parseFloat(r.revenue) / parseInt(r.bookingCount, 10) : 0,
    }));
  }

  async getClientsRetention() {
    const [result] = await this.dataSource.query(
      `SELECT
         SUM(CASE WHEN firstBooking > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS newClients,
         SUM(CASE WHEN bookingCount >= 2 THEN 1 ELSE 0 END) AS returningClients,
         SUM(CASE WHEN lastBooking < DATE_SUB(NOW(), INTERVAL 90 DAY) THEN 1 ELSE 0 END) AS churnedClients,
         COUNT(*) AS totalClients,
         COALESCE(AVG(bookingCount), 0) AS avgBookingsPerClient
       FROM (
         SELECT clientId,
                COUNT(*) AS bookingCount,
                MIN(scheduledAt) AS firstBooking,
                MAX(scheduledAt) AS lastBooking
         FROM bookings
         GROUP BY clientId
       ) sub`,
    );
    return {
      newClients: parseInt(result.newClients ?? '0', 10),
      returningClients: parseInt(result.returningClients ?? '0', 10),
      churnedClients: parseInt(result.churnedClients ?? '0', 10),
      totalClients: parseInt(result.totalClients ?? '0', 10),
      avgBookingsPerClient: parseFloat(result.avgBookingsPerClient ?? '0'),
    };
  }

  async getBookingFunnel() {
    const rows = await this.dataSource.query(
      `SELECT status, COUNT(*) AS count FROM bookings GROUP BY status`,
    );
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.status] = parseInt(r.count, 10);
    const pending = counts['PENDING'] ?? 0;
    const statuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    return statuses.map((status) => {
      const count = counts[status] ?? 0;
      return { status, count, percent: pending > 0 ? Math.round((count / pending) * 100) : 0 };
    });
  }

  async getSummary() {
    const [users, bookings, revenue] = await Promise.all([
      this.dataSource.query(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN role = 'CLIENT' THEN 1 ELSE 0 END) AS clients,
           SUM(CASE WHEN role = 'MASTER' THEN 1 ELSE 0 END) AS masters
         FROM users`,
      ),
      this.dataSource.query(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN DATE(scheduledAt) = CURDATE() THEN 1 ELSE 0 END) AS today,
           SUM(CASE WHEN MONTH(scheduledAt) = MONTH(NOW()) AND YEAR(scheduledAt) = YEAR(NOW()) THEN 1 ELSE 0 END) AS thisMonth,
           SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending
         FROM bookings`,
      ),
      this.dataSource.query(
        `SELECT
           COALESCE(SUM(totalPrice), 0) AS total,
           COALESCE(SUM(CASE WHEN DATE(scheduledAt) = CURDATE() THEN totalPrice ELSE 0 END), 0) AS today,
           COALESCE(SUM(CASE WHEN MONTH(scheduledAt) = MONTH(NOW()) AND YEAR(scheduledAt) = YEAR(NOW()) THEN totalPrice ELSE 0 END), 0) AS thisMonth
         FROM bookings WHERE status = 'COMPLETED'`,
      ),
    ]);

    const [avgRating] = await this.dataSource.query(
      `SELECT COALESCE(AVG(rating), 0) AS avg FROM master_profiles WHERE rating > 0`,
    );

    return {
      totalUsers: parseInt(users[0].total, 10),
      totalClients: parseInt(users[0].clients, 10),
      totalMasters: parseInt(users[0].masters, 10),
      totalBookings: parseInt(bookings[0].total, 10),
      bookingsToday: parseInt(bookings[0].today, 10),
      bookingsThisMonth: parseInt(bookings[0].thisMonth, 10),
      pendingBookings: parseInt(bookings[0].pending, 10),
      totalRevenue: parseFloat(revenue[0].total),
      revenueToday: parseFloat(revenue[0].today),
      revenueThisMonth: parseFloat(revenue[0].thisMonth),
      avgRating: parseFloat(avgRating.avg),
    };
  }
}
