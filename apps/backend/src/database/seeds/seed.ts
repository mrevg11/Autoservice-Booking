import 'reflect-metadata';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { Role } from '../../common/enums/role.enum';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { User } from '../entities/user.entity';
import { ClientProfile } from '../entities/client-profile.entity';
import { MasterProfile } from '../entities/master-profile.entity';
import { MasterSchedule } from '../entities/master-schedule.entity';
import { ServiceCategory } from '../entities/service-category.entity';
import { Service } from '../entities/service.entity';
import { MasterService } from '../entities/master-service.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { Booking } from '../entities/booking.entity';
import { BookingService } from '../entities/booking-service.entity';
import { BookingStatusHistory } from '../entities/booking-status-history.entity';
import { Review } from '../entities/review.entity';
import { Notification } from '../entities/notification.entity';
import { MasterDayOff } from '../entities/master-day-off.entity';

dotenv.config({ path: `${__dirname}/../../../.env` });

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env['DB_HOST'] ?? 'localhost',
  port: parseInt(process.env['DB_PORT'] ?? '3306', 10),
  username: process.env['DB_USER'] ?? 'root',
  password: process.env['DB_PASSWORD'] ?? '',
  database: process.env['DB_NAME'] ?? 'autoservice',
  synchronize: true,
  logging: false,
  charset: 'utf8mb4',
  entities: [
    User, ClientProfile, MasterProfile, MasterSchedule, MasterDayOff,
    ServiceCategory, Service, MasterService, Vehicle,
    Booking, BookingService, BookingStatusHistory, Review, Notification,
  ],
});

async function clearTables(ds: DataSource): Promise<void> {
  await ds.query('SET FOREIGN_KEY_CHECKS = 0');
  const tables = [
    'reviews', 'booking_status_history', 'booking_services', 'bookings',
    'notifications', 'master_days_off', 'master_schedules', 'master_services',
    'vehicles', 'services', 'service_categories',
    'master_profiles', 'client_profiles', 'users',
  ];
  for (const table of tables) {
    await ds.query(`TRUNCATE TABLE \`${table}\``);
  }
  await ds.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function seedHistoricalBookings(
  ds: DataSource,
  client: User,
  master: MasterProfile,
  vehicle: Vehicle,
  services: Service[],
  bookingRepo: Repository<Booking>,
  bookingServiceRepo: Repository<BookingService>,
  historyRepo: Repository<BookingStatusHistory>,
  admin: User,
  masterUser: User,
): Promise<number> {
  const reviewRepo = ds.getRepository(Review);

  const slots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
  const ratings = [4, 4, 5, 5, 5, 3, 4, 5, 4, 5];
  let count = 0;
  const now = new Date();

  // Step ~3–5 days back from 365 days ago to generate ~100 COMPLETED bookings
  for (let daysAgo = 365; daysAgo >= 3 && count < 100; daysAgo -= 3) {
    const bookingDate = new Date(now);
    bookingDate.setDate(bookingDate.getDate() - daysAgo);

    const dow = bookingDate.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends

    const hour = slots[count % slots.length];
    const [h, m] = hour.split(':').map(Number);
    bookingDate.setHours(h, m ?? 0, 0, 0);

    const service = services[count % services.length];
    const base = service.baseDurationMinutes;
    const variance = Math.round(base * 0.2);
    const actualDuration = base + (count % 2 === 0 ? variance : -variance);

    const booking = await bookingRepo.save(
      bookingRepo.create({
        client,
        master,
        vehicle,
        status: BookingStatus.COMPLETED,
        scheduledAt: new Date(bookingDate),
        estimatedDurationMinutes: base,
        totalPrice: Number(service.basePrice),
      }),
    );

    await bookingServiceRepo.save(
      bookingServiceRepo.create({
        booking,
        service,
        actualPrice: Number(service.basePrice),
        actualDurationMinutes: actualDuration,
      }),
    );

    await historyRepo.save([
      historyRepo.create({
        booking,
        oldStatus: BookingStatus.PENDING,
        newStatus: BookingStatus.CONFIRMED,
        changedBy: admin,
      }),
      historyRepo.create({
        booking,
        oldStatus: BookingStatus.CONFIRMED,
        newStatus: BookingStatus.IN_PROGRESS,
        changedBy: masterUser,
      }),
      historyRepo.create({
        booking,
        oldStatus: BookingStatus.IN_PROGRESS,
        newStatus: BookingStatus.COMPLETED,
        changedBy: masterUser,
      }),
    ]);

    if (count % 2 === 0) {
      await reviewRepo.save(
        reviewRepo.create({
          booking,
          rating: ratings[count % ratings.length],
          comment: null,
        }),
      );
    }

    count++;
  }
  return count;
}

async function main(): Promise<void> {
  await AppDataSource.initialize();

  await clearTables(AppDataSource);

  const hash = await bcrypt.hash('DemoPass123!', 12);

  // ── Users ────────────────────────────────────────────────────────────────
  const userRepo = AppDataSource.getRepository(User);

  const admin = userRepo.create({
    email: 'admin@demo.com',
    passwordHash: hash,
    role: Role.ADMIN,
    firstName: 'Адмін',
    lastName: 'Системи',
    emailVerified: true,
  });

  const masterUser = userRepo.create({
    email: 'master@demo.com',
    passwordHash: hash,
    role: Role.MASTER,
    firstName: 'Іван',
    lastName: 'Коваль',
    phone: '+380671234567',
    emailVerified: true,
  });

  const clientUser = userRepo.create({
    email: 'client@demo.com',
    passwordHash: hash,
    role: Role.CLIENT,
    firstName: 'Олег',
    lastName: 'Петренко',
    phone: '+380507654321',
    emailVerified: true,
  });

  const [savedAdmin, savedMaster, savedClient] = await userRepo.save([admin, masterUser, clientUser]);

  // ── Profiles ─────────────────────────────────────────────────────────────
  const masterProfileRepo = AppDataSource.getRepository(MasterProfile);
  const clientProfileRepo = AppDataSource.getRepository(ClientProfile);

  const masterProfile = masterProfileRepo.create({
    user: savedMaster,
    specialization: 'Технічне обслуговування та діагностика',
    experienceYears: 8,
    rating: 4.75,
    bio: 'Досвідчений майстер з повним спектром послуг технічного обслуговування легкових автомобілів.',
  });
  const savedMasterProfile = await masterProfileRepo.save(masterProfile);

  const clientProfile = clientProfileRepo.create({
    user: savedClient,
    preferredContactMethod: 'phone',
  });
  await clientProfileRepo.save(clientProfile);

  // ── Master Schedule (Mon–Fri 09:00–18:00) ────────────────────────────────
  const scheduleRepo = AppDataSource.getRepository(MasterSchedule);
  const schedules = [0, 1, 2, 3, 4].map((weekday) =>
    scheduleRepo.create({
      master: savedMasterProfile,
      weekday,
      startTime: '09:00',
      endTime: '18:00',
      isActive: true,
    }),
  );
  await scheduleRepo.save(schedules);

  // ── Service Categories ───────────────────────────────────────────────────
  const catRepo = AppDataSource.getRepository(ServiceCategory);
  const [catTO, catBody, catDiag] = await catRepo.save([
    catRepo.create({ name: 'Технічне обслуговування', description: 'Регулярне ТО та заміна витратних матеріалів', icon: 'wrench' }),
    catRepo.create({ name: 'Кузовний ремонт', description: 'Ремонт та фарбування кузова', icon: 'car' }),
    catRepo.create({ name: 'Діагностика', description: 'Комп\'ютерна та ходова діагностика', icon: 'cpu' }),
  ]);

  // ── Services (3 per category) ─────────────────────────────────────────────
  const serviceRepo = AppDataSource.getRepository(Service);
  const services = await serviceRepo.save([
    // Технічне обслуговування
    serviceRepo.create({ category: catTO, name: 'Заміна оливи та фільтра', description: 'Заміна моторної оливи та масляного фільтра', basePrice: 650.00, baseDurationMinutes: 40 }),
    serviceRepo.create({ category: catTO, name: 'Заміна гальмівних колодок', description: 'Заміна передніх або задніх гальмівних колодок', basePrice: 800.00, baseDurationMinutes: 60 }),
    serviceRepo.create({ category: catTO, name: 'Заміна повітряного фільтра', description: 'Заміна повітряного фільтра двигуна', basePrice: 200.00, baseDurationMinutes: 20 }),
    // Кузовний ремонт
    serviceRepo.create({ category: catBody, name: 'Усунення вм\'ятини PDR', description: 'Безфарбувальне усунення вм\'ятин', basePrice: 1200.00, baseDurationMinutes: 90 }),
    serviceRepo.create({ category: catBody, name: 'Полірування кузова', description: 'Абразивне та захисне полірування', basePrice: 2500.00, baseDurationMinutes: 180 }),
    serviceRepo.create({ category: catBody, name: 'Локальне фарбування деталі', description: 'Фарбування одного елемента кузова', basePrice: 3500.00, baseDurationMinutes: 240 }),
    // Діагностика
    serviceRepo.create({ category: catDiag, name: 'Комп\'ютерна діагностика', description: 'Зчитування помилок всіх систем автомобіля', basePrice: 400.00, baseDurationMinutes: 30 }),
    serviceRepo.create({ category: catDiag, name: 'Діагностика підвіски', description: 'Перевірка ходової частини на підйомнику', basePrice: 500.00, baseDurationMinutes: 45 }),
    serviceRepo.create({ category: catDiag, name: 'Перевірка гальмівної системи', description: 'Діагностика гальм на стенді', basePrice: 350.00, baseDurationMinutes: 30 }),
  ]);

  // ── MasterService (link master to all services) ──────────────────────────
  const masterServiceRepo = AppDataSource.getRepository(MasterService);
  const masterServices = services.map((svc) =>
    masterServiceRepo.create({
      master: savedMasterProfile,
      service: svc,
      priceCoefficient: 1.00,
    }),
  );
  await masterServiceRepo.save(masterServices);

  // ── Vehicle ───────────────────────────────────────────────────────────────
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const vehicle = await vehicleRepo.save(
    vehicleRepo.create({
      client: savedClient,
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      vin: 'JT2BF28K1X0240184',
      plateNumber: 'AA1234BB',
    }),
  );

  // ── Bookings ──────────────────────────────────────────────────────────────
  const bookingRepo = AppDataSource.getRepository(Booking);
  const bookingServiceRepo = AppDataSource.getRepository(BookingService);
  const historyRepo = AppDataSource.getRepository(BookingStatusHistory);

  // Booking 1 — COMPLETED
  const b1 = await bookingRepo.save(
    bookingRepo.create({
      client: savedClient,
      master: savedMasterProfile,
      vehicle,
      status: BookingStatus.COMPLETED,
      scheduledAt: new Date('2026-04-10T10:00:00'),
      estimatedDurationMinutes: 40,
      totalPrice: 650.00,
      notes: 'Перша заміна оливи',
    }),
  );
  await bookingServiceRepo.save(
    bookingServiceRepo.create({ booking: b1, service: services[0], actualPrice: 650.00, actualDurationMinutes: 38 }),
  );
  await historyRepo.save([
    historyRepo.create({ booking: b1, oldStatus: BookingStatus.PENDING, newStatus: BookingStatus.CONFIRMED, changedBy: savedAdmin }),
    historyRepo.create({ booking: b1, oldStatus: BookingStatus.CONFIRMED, newStatus: BookingStatus.IN_PROGRESS, changedBy: savedMaster }),
    historyRepo.create({ booking: b1, oldStatus: BookingStatus.IN_PROGRESS, newStatus: BookingStatus.COMPLETED, changedBy: savedMaster }),
  ]);

  // Review for booking 1
  const reviewRepo = AppDataSource.getRepository(Review);
  await reviewRepo.save(reviewRepo.create({ booking: b1, rating: 5, comment: 'Відмінний сервіс, все швидко і якісно!' }));

  // Booking 2 — CONFIRMED
  const b2 = await bookingRepo.save(
    bookingRepo.create({
      client: savedClient,
      master: savedMasterProfile,
      vehicle,
      status: BookingStatus.CONFIRMED,
      scheduledAt: new Date('2026-05-20T14:00:00'),
      estimatedDurationMinutes: 60,
      totalPrice: 800.00,
    }),
  );
  await bookingServiceRepo.save(
    bookingServiceRepo.create({ booking: b2, service: services[1], actualPrice: 800.00 }),
  );
  await historyRepo.save(
    historyRepo.create({ booking: b2, oldStatus: BookingStatus.PENDING, newStatus: BookingStatus.CONFIRMED, changedBy: savedAdmin }),
  );

  // Booking 3 — PENDING
  const b3 = await bookingRepo.save(
    bookingRepo.create({
      client: savedClient,
      master: savedMasterProfile,
      vehicle,
      status: BookingStatus.PENDING,
      scheduledAt: new Date('2026-05-25T11:00:00'),
      estimatedDurationMinutes: 30,
      totalPrice: 400.00,
      notes: 'Горить Check Engine',
    }),
  );
  await bookingServiceRepo.save(
    bookingServiceRepo.create({ booking: b3, service: services[6], actualPrice: 400.00 }),
  );

  // ── Historical bookings (100 COMPLETED) ──────────────────────────────────
  const historicalCount = await seedHistoricalBookings(
    AppDataSource,
    savedClient,
    savedMasterProfile,
    vehicle,
    services,
    bookingRepo,
    bookingServiceRepo,
    historyRepo,
    savedAdmin,
    savedMaster,
  );

  await AppDataSource.destroy();

  console.log(
    `✅ Seed completed: 3 users, ${services.length} services, 3 demo bookings + ${historicalCount} historical bookings`,
  );
}

main().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
