import 'reflect-metadata';
import { DataSource } from 'typeorm';
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
  synchronize: process.env['DB_SYNC'] !== 'false',
  logging: false,
  charset: 'utf8mb4',
  entities: [
    User,
    ClientProfile,
    MasterProfile,
    MasterSchedule,
    MasterDayOff,
    ServiceCategory,
    Service,
    MasterService,
    Vehicle,
    Booking,
    BookingService,
    BookingStatusHistory,
    Review,
    Notification,
  ],
});

async function clearTables(ds: DataSource): Promise<void> {
  await ds.query('SET FOREIGN_KEY_CHECKS = 0');
  const tables = [
    'reviews',
    'booking_status_history',
    'booking_services',
    'bookings',
    'notifications',
    'master_days_off',
    'master_schedules',
    'master_services',
    'vehicles',
    'services',
    'service_categories',
    'master_profiles',
    'client_profiles',
    'users',
  ];
  for (const table of tables) {
    await ds.query(`TRUNCATE TABLE \`${table}\``);
  }
  await ds.query('SET FOREIGN_KEY_CHECKS = 1');
}

function getWorkingDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur < end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

async function main(): Promise<void> {
  await AppDataSource.initialize();
  console.log('✅ DB connected');
  await clearTables(AppDataSource);
  console.log('✅ Tables cleared');

  const hash = await bcrypt.hash('DemoPass123!', 12);
  const userRepo = AppDataSource.getRepository(User);

  // ── Admin ─────────────────────────────────────────────────────────────────
  const savedAdmin = await userRepo.save(
    userRepo.create({
      email: 'admin@demo.com',
      passwordHash: hash,
      role: Role.ADMIN,
      firstName: 'Адмін',
      lastName: 'Системи',
      emailVerified: true,
    }),
  );

  // ── Master Users (master.1 – master.6) ───────────────────────────────────
  const masterUserData = [
    { email: 'master.1@demo.com', firstName: 'Іван', lastName: 'Коваль', phone: '+380671234501' },
    {
      email: 'master.2@demo.com',
      firstName: 'Михайло',
      lastName: 'Бондаренко',
      phone: '+380671234502',
    },
    {
      email: 'master.3@demo.com',
      firstName: 'Олексій',
      lastName: 'Шевченко',
      phone: '+380671234503',
    },
    {
      email: 'master.4@demo.com',
      firstName: 'Василь',
      lastName: 'Мельник',
      phone: '+380671234504',
    },
    {
      email: 'master.5@demo.com',
      firstName: 'Андрій',
      lastName: 'Ткаченко',
      phone: '+380671234505',
    },
    {
      email: 'master.6@demo.com',
      firstName: 'Сергій',
      lastName: 'Кравченко',
      phone: '+380671234506',
    },
  ];
  const savedMasterUsers = await userRepo.save(
    masterUserData.map((d) =>
      userRepo.create({ ...d, passwordHash: hash, role: Role.MASTER, emailVerified: true }),
    ),
  );

  // ── Client Users (client.1 – client.10) ──────────────────────────────────
  const clientUserData = [
    { email: 'client.1@demo.com', firstName: 'Олег', lastName: 'Петренко', phone: '+380501234501' },
    {
      email: 'client.2@demo.com',
      firstName: 'Марія',
      lastName: 'Іваненко',
      phone: '+380501234502',
    },
    {
      email: 'client.3@demo.com',
      firstName: 'Дмитро',
      lastName: 'Сидоренко',
      phone: '+380501234503',
    },
    {
      email: 'client.4@demo.com',
      firstName: 'Наталія',
      lastName: 'Поліщук',
      phone: '+380501234504',
    },
    {
      email: 'client.5@demo.com',
      firstName: 'Тарас',
      lastName: 'Гончаренко',
      phone: '+380501234505',
    },
    {
      email: 'client.6@demo.com',
      firstName: 'Оксана',
      lastName: 'Захаренко',
      phone: '+380501234506',
    },
    { email: 'client.7@demo.com', firstName: 'Роман', lastName: 'Лисенко', phone: '+380501234507' },
    { email: 'client.8@demo.com', firstName: 'Юлія', lastName: 'Савченко', phone: '+380501234508' },
    {
      email: 'client.9@demo.com',
      firstName: 'Ігор',
      lastName: 'Кузьменко',
      phone: '+380501234509',
    },
    {
      email: 'client.10@demo.com',
      firstName: 'Вікторія',
      lastName: 'Назаренко',
      phone: '+380501234510',
    },
  ];
  const savedClientUsers = await userRepo.save(
    clientUserData.map((d) =>
      userRepo.create({ ...d, passwordHash: hash, role: Role.CLIENT, emailVerified: true }),
    ),
  );

  // ── Master Profiles ───────────────────────────────────────────────────────
  const masterProfileRepo = AppDataSource.getRepository(MasterProfile);
  const masterProfileData = [
    {
      spec: 'Технічне обслуговування та діагностика',
      exp: 8,
      rating: 4.75,
      bio: 'Досвідчений майстер з повним спектром послуг технічного обслуговування легкових автомобілів.',
    },
    {
      spec: 'Ремонт двигуна, Технічне обслуговування',
      exp: 8,
      rating: 4.8,
      bio: 'Спеціаліст з ремонту двигунів та технічного обслуговування будь-якої складності.',
    },
    {
      spec: 'Кузовні роботи',
      exp: 6,
      rating: 4.6,
      bio: 'Майстер кузовного ремонту та фарбування. Повернемо вашому авто первинний вигляд.',
    },
    {
      spec: 'Діагностика, Технічне обслуговування',
      exp: 10,
      rating: 4.9,
      bio: "Точна комп'ютерна діагностика та кваліфіковане обслуговування. 10 років досвіду.",
    },
    {
      spec: 'Технічне обслуговування',
      exp: 5,
      rating: 4.5,
      bio: 'Спеціаліст з шинних робіт та регулювання ходової частини.',
    },
    {
      spec: 'Ремонт двигуна, Діагностика',
      exp: 12,
      rating: 4.85,
      bio: 'Провідний спеціаліст з діагностики та капітального ремонту двигунів. 12 років практики.',
    },
  ];
  const savedMasterProfiles = await masterProfileRepo.save(
    masterProfileData.map((d, i) =>
      masterProfileRepo.create({
        user: savedMasterUsers[i],
        specialization: d.spec,
        experienceYears: d.exp,
        rating: d.rating,
        bio: d.bio,
      }),
    ),
  );

  // ── Client Profiles ───────────────────────────────────────────────────────
  const clientProfileRepo = AppDataSource.getRepository(ClientProfile);
  await clientProfileRepo.save(
    savedClientUsers.map((u) =>
      clientProfileRepo.create({ user: u, preferredContactMethod: 'phone' }),
    ),
  );

  // ── Master Schedules ──────────────────────────────────────────────────────
  const scheduleRepo = AppDataSource.getRepository(MasterSchedule);

  // master.1: Mon–Fri 09:00–18:00 (original)
  await scheduleRepo.save(
    [0, 1, 2, 3, 4].map((wd) =>
      scheduleRepo.create({
        master: savedMasterProfiles[0],
        weekday: wd,
        startTime: '09:00',
        endTime: '18:00',
        isActive: true,
      }),
    ),
  );

  // masters 2–6: Mon–Fri 08:00–18:30, Sat–Sun closed
  for (let i = 1; i < 6; i++) {
    await scheduleRepo.save([
      ...[0, 1, 2, 3, 4].map((wd) =>
        scheduleRepo.create({
          master: savedMasterProfiles[i],
          weekday: wd,
          startTime: '08:00',
          endTime: '18:30',
          isActive: true,
        }),
      ),
      ...[5, 6].map((wd) =>
        scheduleRepo.create({
          master: savedMasterProfiles[i],
          weekday: wd,
          startTime: '09:00',
          endTime: '18:00',
          isActive: false,
        }),
      ),
    ]);
  }

  // ── Service Categories (4) ────────────────────────────────────────────────
  const catRepo = AppDataSource.getRepository(ServiceCategory);
  const [catTO, catBody, catDiag, catEngine] = await catRepo.save([
    catRepo.create({
      name: 'Технічне обслуговування',
      description: 'Регулярне ТО та заміна витратних матеріалів',
      icon: 'wrench',
    }),
    catRepo.create({
      name: 'Кузовний ремонт',
      description: 'Ремонт та фарбування кузова',
      icon: 'car',
    }),
    catRepo.create({
      name: 'Діагностика',
      description: "Комп'ютерна та ходова діагностика",
      icon: 'cpu',
    }),
    catRepo.create({
      name: 'Ремонт двигуна',
      description: 'Ремонт та обслуговування двигунів',
      icon: 'settings',
    }),
  ]);

  // ── Services (25 total) ───────────────────────────────────────────────────
  const serviceRepo = AppDataSource.getRepository(Service);
  const allServices = await serviceRepo.save([
    // Технічне обслуговування (10)
    serviceRepo.create({
      category: catTO,
      name: 'Заміна оливи та фільтра',
      basePrice: 650,
      baseDurationMinutes: 40,
    }),
    serviceRepo.create({
      category: catTO,
      name: 'Заміна гальмівних колодок',
      basePrice: 800,
      baseDurationMinutes: 60,
    }),
    serviceRepo.create({
      category: catTO,
      name: 'Заміна повітряного фільтра',
      basePrice: 200,
      baseDurationMinutes: 20,
    }),
    serviceRepo.create({
      category: catTO,
      name: 'Заміна свічок запалювання',
      basePrice: 400,
      baseDurationMinutes: 40,
    }),
    serviceRepo.create({
      category: catTO,
      name: 'Заміна паливного фільтра',
      basePrice: 300,
      baseDurationMinutes: 30,
    }),
    serviceRepo.create({
      category: catTO,
      name: 'Заміна охолоджувальної рідини',
      basePrice: 500,
      baseDurationMinutes: 45,
    }),
    serviceRepo.create({
      category: catTO,
      name: 'Заміна гальмівної рідини',
      basePrice: 350,
      baseDurationMinutes: 30,
    }),
    serviceRepo.create({
      category: catTO,
      name: 'Регулювання кутів коліс (розвал-сходження)',
      basePrice: 800,
      baseDurationMinutes: 60,
    }),
    serviceRepo.create({
      category: catTO,
      name: 'Балансування коліс',
      basePrice: 400,
      baseDurationMinutes: 40,
    }),
    serviceRepo.create({
      category: catTO,
      name: 'Сезонна заміна шин',
      basePrice: 600,
      baseDurationMinutes: 60,
    }),
    // Кузовний ремонт (6)
    serviceRepo.create({
      category: catBody,
      name: "Усунення вм'ятини PDR",
      basePrice: 1200,
      baseDurationMinutes: 90,
    }),
    serviceRepo.create({
      category: catBody,
      name: 'Полірування кузова',
      basePrice: 2500,
      baseDurationMinutes: 180,
    }),
    serviceRepo.create({
      category: catBody,
      name: 'Локальне фарбування деталі',
      basePrice: 3500,
      baseDurationMinutes: 240,
    }),
    serviceRepo.create({
      category: catBody,
      name: 'Фарбування бампера',
      basePrice: 3000,
      baseDurationMinutes: 240,
    }),
    serviceRepo.create({
      category: catBody,
      name: 'Антикорозійна обробка',
      basePrice: 2000,
      baseDurationMinutes: 120,
    }),
    serviceRepo.create({
      category: catBody,
      name: 'Хімчистка салону',
      basePrice: 1500,
      baseDurationMinutes: 180,
    }),
    // Діагностика (5)
    serviceRepo.create({
      category: catDiag,
      name: "Комп'ютерна діагностика",
      basePrice: 400,
      baseDurationMinutes: 30,
    }),
    serviceRepo.create({
      category: catDiag,
      name: 'Діагностика підвіски',
      basePrice: 500,
      baseDurationMinutes: 45,
    }),
    serviceRepo.create({
      category: catDiag,
      name: 'Перевірка гальмівної системи',
      basePrice: 350,
      baseDurationMinutes: 30,
    }),
    serviceRepo.create({
      category: catDiag,
      name: 'Діагностика електрики',
      basePrice: 600,
      baseDurationMinutes: 60,
    }),
    serviceRepo.create({
      category: catDiag,
      name: 'Діагностика ходової частини',
      basePrice: 450,
      baseDurationMinutes: 45,
    }),
    // Ремонт двигуна (4)
    serviceRepo.create({
      category: catEngine,
      name: 'Заміна ременя ГРМ',
      basePrice: 3500,
      baseDurationMinutes: 180,
    }),
    serviceRepo.create({
      category: catEngine,
      name: 'Заміна прокладки головки блоку',
      basePrice: 5000,
      baseDurationMinutes: 300,
    }),
    serviceRepo.create({
      category: catEngine,
      name: 'Чищення паливної системи',
      basePrice: 1200,
      baseDurationMinutes: 90,
    }),
    serviceRepo.create({
      category: catEngine,
      name: 'Заміна термостата',
      basePrice: 800,
      baseDurationMinutes: 60,
    }),
  ]);

  const svc = new Map<string, Service>(allServices.map((s) => [s.name, s]));

  // ── Master-Service Assignments ────────────────────────────────────────────
  const masterServiceRepo = AppDataSource.getRepository(MasterService);

  const masterAssignments: { idx: number; names: string[] }[] = [
    {
      idx: 0,
      names: [
        'Заміна оливи та фільтра',
        'Заміна гальмівних колодок',
        'Заміна повітряного фільтра',
        "Усунення вм'ятини PDR",
        'Полірування кузова',
        'Локальне фарбування деталі',
        "Комп'ютерна діагностика",
        'Діагностика підвіски',
        'Перевірка гальмівної системи',
      ],
    },
    {
      idx: 1,
      names: [
        'Заміна ременя ГРМ',
        'Заміна прокладки головки блоку',
        'Чищення паливної системи',
        'Заміна термостата',
        'Заміна оливи та фільтра',
        'Заміна свічок запалювання',
      ],
    },
    {
      idx: 2,
      names: [
        'Фарбування бампера',
        'Локальне фарбування деталі',
        'Полірування кузова',
        "Усунення вм'ятини PDR",
        'Антикорозійна обробка',
        'Хімчистка салону',
      ],
    },
    {
      idx: 3,
      names: [
        "Комп'ютерна діагностика",
        'Діагностика підвіски',
        'Діагностика електрики',
        'Діагностика ходової частини',
        'Перевірка гальмівної системи',
        'Заміна гальмівної рідини',
        'Заміна гальмівних колодок',
      ],
    },
    {
      idx: 4,
      names: [
        'Регулювання кутів коліс (розвал-сходження)',
        'Балансування коліс',
        'Сезонна заміна шин',
        'Заміна повітряного фільтра',
        'Заміна паливного фільтра',
        'Заміна охолоджувальної рідини',
        'Заміна свічок запалювання',
      ],
    },
    {
      idx: 5,
      names: [
        'Діагностика електрики',
        "Комп'ютерна діагностика",
        'Заміна термостата',
        'Чищення паливної системи',
        'Заміна ременя ГРМ',
        'Заміна прокладки головки блоку',
      ],
    },
  ];

  for (const { idx, names } of masterAssignments) {
    await masterServiceRepo.save(
      names.map((name) =>
        masterServiceRepo.create({
          master: savedMasterProfiles[idx],
          service: svc.get(name)!,
          priceCoefficient: 1.0,
        }),
      ),
    );
  }

  // ── Vehicles (2 per client = 20 total) ────────────────────────────────────
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const vehicleCatalog = [
    { make: 'Toyota', model: 'Camry', year: 2020 },
    { make: 'Volkswagen', model: 'Passat', year: 2018 },
    { make: 'BMW', model: '3 Series', year: 2019 },
    { make: 'Ford', model: 'Focus', year: 2015 },
    { make: 'Skoda', model: 'Octavia', year: 2017 },
    { make: 'Renault', model: 'Megane', year: 2016 },
    { make: 'Hyundai', model: 'Elantra', year: 2021 },
    { make: 'Kia', model: 'Sportage', year: 2020 },
    { make: 'Mazda', model: 'CX-5', year: 2019 },
    { make: 'Honda', model: 'Civic', year: 2018 },
    { make: 'Mercedes', model: 'C-Class', year: 2017 },
    { make: 'Audi', model: 'A4', year: 2016 },
    { make: 'Peugeot', model: '308', year: 2015 },
    { make: 'Nissan', model: 'Qashqai', year: 2021 },
    { make: 'Subaru', model: 'Forester', year: 2018 },
    { make: 'Mitsubishi', model: 'Outlander', year: 2017 },
    { make: 'Chevrolet', model: 'Cruze', year: 2014 },
    { make: 'Opel', model: 'Astra', year: 2016 },
    { make: 'Fiat', model: 'Punto', year: 2013 },
    { make: 'Seat', model: 'Leon', year: 2019 },
  ];

  const clientVehicles: Vehicle[][] = [];
  let plateCounter = 1001;
  for (let i = 0; i < 10; i++) {
    const v1 = await vehicleRepo.save(
      vehicleRepo.create({
        client: savedClientUsers[i],
        ...vehicleCatalog[i * 2],
        plateNumber: `AA${plateCounter++}BB`,
      }),
    );
    const v2 = await vehicleRepo.save(
      vehicleRepo.create({
        client: savedClientUsers[i],
        ...vehicleCatalog[i * 2 + 1],
        plateNumber: `AA${plateCounter++}BB`,
      }),
    );
    clientVehicles.push([v1, v2]);
  }

  // ── Demo Bookings (future dates for manual testing) ───────────────────────
  const bookingRepo = AppDataSource.getRepository(Booking);
  const bookingServiceRepo = AppDataSource.getRepository(BookingService);
  const historyRepo = AppDataSource.getRepository(BookingStatusHistory);

  const svcOil = svc.get('Заміна оливи та фільтра')!;
  const svcDiag = svc.get("Комп'ютерна діагностика")!;
  const svcBrake = svc.get('Заміна гальмівних колодок')!;
  const svcWheel = svc.get('Балансування коліс')!;

  // CONFIRMED: master.1 / client.1
  const bConf = await bookingRepo.save(
    bookingRepo.create({
      client: savedClientUsers[0],
      master: savedMasterProfiles[0],
      vehicle: clientVehicles[0][0],
      status: BookingStatus.CONFIRMED,
      scheduledAt: new Date('2026-05-22T14:00:00'),
      estimatedDurationMinutes: svcOil.baseDurationMinutes,
      totalPrice: Number(svcOil.basePrice),
      notes: 'Перша заміна оливи',
    }),
  );
  await bookingServiceRepo.save(
    bookingServiceRepo.create({
      booking: bConf,
      service: svcOil,
      actualPrice: Number(svcOil.basePrice),
      actualDurationMinutes: null,
    }),
  );
  await historyRepo.save([
    historyRepo.create({
      booking: bConf,
      oldStatus: null,
      newStatus: BookingStatus.PENDING,
      changedBy: savedClientUsers[0],
    }),
    historyRepo.create({
      booking: bConf,
      oldStatus: BookingStatus.PENDING,
      newStatus: BookingStatus.CONFIRMED,
      changedBy: savedAdmin,
    }),
  ]);

  // PENDING: master.1 / client.1
  const bPend1 = await bookingRepo.save(
    bookingRepo.create({
      client: savedClientUsers[0],
      master: savedMasterProfiles[0],
      vehicle: clientVehicles[0][0],
      status: BookingStatus.PENDING,
      scheduledAt: new Date('2026-05-28T11:00:00'),
      estimatedDurationMinutes: svcDiag.baseDurationMinutes,
      totalPrice: Number(svcDiag.basePrice),
      notes: 'Горить Check Engine',
    }),
  );
  await bookingServiceRepo.save(
    bookingServiceRepo.create({
      booking: bPend1,
      service: svcDiag,
      actualPrice: Number(svcDiag.basePrice),
      actualDurationMinutes: null,
    }),
  );
  await historyRepo.save(
    historyRepo.create({
      booking: bPend1,
      oldStatus: null,
      newStatus: BookingStatus.PENDING,
      changedBy: savedClientUsers[0],
    }),
  );

  // PENDING: master.4 / client.2
  const bPend2 = await bookingRepo.save(
    bookingRepo.create({
      client: savedClientUsers[1],
      master: savedMasterProfiles[3],
      vehicle: clientVehicles[1][0],
      status: BookingStatus.PENDING,
      scheduledAt: new Date('2026-05-23T10:00:00'),
      estimatedDurationMinutes: svcBrake.baseDurationMinutes,
      totalPrice: Number(svcBrake.basePrice),
    }),
  );
  await bookingServiceRepo.save(
    bookingServiceRepo.create({
      booking: bPend2,
      service: svcBrake,
      actualPrice: Number(svcBrake.basePrice),
      actualDurationMinutes: null,
    }),
  );
  await historyRepo.save(
    historyRepo.create({
      booking: bPend2,
      oldStatus: null,
      newStatus: BookingStatus.PENDING,
      changedBy: savedClientUsers[1],
    }),
  );

  // PENDING: master.5 / client.3
  const bPend3 = await bookingRepo.save(
    bookingRepo.create({
      client: savedClientUsers[2],
      master: savedMasterProfiles[4],
      vehicle: clientVehicles[2][0],
      status: BookingStatus.PENDING,
      scheduledAt: new Date('2026-05-26T09:00:00'),
      estimatedDurationMinutes: svcWheel.baseDurationMinutes,
      totalPrice: Number(svcWheel.basePrice),
    }),
  );
  await bookingServiceRepo.save(
    bookingServiceRepo.create({
      booking: bPend3,
      service: svcWheel,
      actualPrice: Number(svcWheel.basePrice),
      actualDurationMinutes: null,
    }),
  );
  await historyRepo.save(
    historyRepo.create({
      booking: bPend3,
      oldStatus: null,
      newStatus: BookingStatus.PENDING,
      changedBy: savedClientUsers[2],
    }),
  );

  console.log('✅ Demo bookings created');

  // ── Historical COMPLETED Bookings (126) ───────────────────────────────────
  const reviewRepo = AppDataSource.getRepository(Review);

  const reviewComments: (string | null)[] = [
    'Відмінний сервіс, все швидко і якісно!',
    null,
    'Майстер пояснив усі роботи, залишився задоволений.',
    null,
    'Хороша робота, рекомендую.',
    null,
    'Швидко і якісно, дякую!',
    'Все чудово, приїду ще.',
    null,
    'Професійний підхід, якісна робота.',
  ];
  const ratings = [5, 5, 4, 5, 4, 3, 5, 4, 5, 4];

  // Booking distribution: service name → count → valid master indices (0-based)
  const bookingDist: { name: string; count: number; masterIdxs: number[] }[] = [
    { name: 'Заміна оливи та фільтра', count: 18, masterIdxs: [0, 1] },
    { name: "Комп'ютерна діагностика", count: 15, masterIdxs: [0, 3, 5] },
    { name: 'Заміна гальмівних колодок', count: 12, masterIdxs: [0, 3] },
    { name: 'Балансування коліс', count: 10, masterIdxs: [4] },
    { name: 'Сезонна заміна шин', count: 10, masterIdxs: [4] },
    { name: 'Діагностика підвіски', count: 8, masterIdxs: [0, 3] },
    { name: 'Заміна повітряного фільтра', count: 8, masterIdxs: [0, 4] },
    { name: 'Перевірка гальмівної системи', count: 7, masterIdxs: [0, 3] },
    { name: 'Заміна свічок запалювання', count: 6, masterIdxs: [1, 4] },
    { name: 'Полірування кузова', count: 5, masterIdxs: [0, 2] },
    { name: 'Регулювання кутів коліс (розвал-сходження)', count: 5, masterIdxs: [4] },
    { name: 'Заміна охолоджувальної рідини', count: 4, masterIdxs: [4] },
    { name: 'Діагностика електрики', count: 4, masterIdxs: [3, 5] },
    { name: 'Заміна ременя ГРМ', count: 3, masterIdxs: [1, 5] },
    { name: 'Локальне фарбування деталі', count: 3, masterIdxs: [0, 2] },
    { name: "Усунення вм'ятини PDR", count: 2, masterIdxs: [0, 2] },
    { name: 'Хімчистка салону', count: 2, masterIdxs: [2] },
    { name: 'Фарбування бампера', count: 2, masterIdxs: [2] },
    { name: 'Заміна прокладки головки блоку', count: 1, masterIdxs: [1, 5] },
    { name: 'Антикорозійна обробка', count: 1, masterIdxs: [2] },
  ];

  const workingDays = getWorkingDays(new Date('2025-06-01'), new Date('2026-05-01'));
  const timeSlots = [
    '08:30',
    '09:00',
    '09:30',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
  ];
  const usedSlots = new Set<string>();

  let globalIdx = 0;
  let totalCreated = 0;

  for (const { name, count, masterIdxs } of bookingDist) {
    const service = svc.get(name);
    if (!service) {
      console.warn(`  ⚠️  Service not found: "${name}"`);
      continue;
    }

    for (let i = 0; i < count; i++) {
      const masterIdx = masterIdxs[i % masterIdxs.length];
      const masterProfile = savedMasterProfiles[masterIdx];
      const masterUser = savedMasterUsers[masterIdx];

      // Find a free (master, day, slot) combination
      let booked = false;
      const startDay = (globalIdx * 11) % workingDays.length;
      outer: for (let di = 0; di < workingDays.length; di++) {
        const day = workingDays[(startDay + di) % workingDays.length];
        const startSlot = (globalIdx * 7 + masterIdx * 3) % timeSlots.length;
        for (let si = 0; si < timeSlots.length; si++) {
          const slot = timeSlots[(startSlot + si) % timeSlots.length];
          const key = `${masterIdx}|${day.toISOString().slice(0, 10)}|${slot}`;
          if (!usedSlots.has(key)) {
            usedSlots.add(key);

            const bookingDate = new Date(day);
            const [h, m] = slot.split(':').map(Number);
            bookingDate.setHours(h, m ?? 0, 0, 0);

            const clientIdx = globalIdx % 10;
            const client = savedClientUsers[clientIdx];
            const vehicle = clientVehicles[clientIdx][globalIdx % 2];

            const booking = await bookingRepo.save(
              bookingRepo.create({
                client,
                master: masterProfile,
                vehicle,
                status: BookingStatus.COMPLETED,
                scheduledAt: bookingDate,
                estimatedDurationMinutes: service.baseDurationMinutes,
                totalPrice: Number(service.basePrice),
              }),
            );

            await bookingServiceRepo.save(
              bookingServiceRepo.create({
                booking,
                service,
                actualPrice: Number(service.basePrice),
                actualDurationMinutes: service.baseDurationMinutes,
              }),
            );

            await historyRepo.save([
              historyRepo.create({
                booking,
                oldStatus: null,
                newStatus: BookingStatus.PENDING,
                changedBy: client,
              }),
              historyRepo.create({
                booking,
                oldStatus: BookingStatus.PENDING,
                newStatus: BookingStatus.CONFIRMED,
                changedBy: savedAdmin,
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

            // Review for every other booking (~63 reviews total)
            if (globalIdx % 2 === 0) {
              await reviewRepo.save(
                reviewRepo.create({
                  booking,
                  rating: ratings[globalIdx % ratings.length],
                  comment: reviewComments[globalIdx % reviewComments.length],
                }),
              );
            }

            booked = true;
            totalCreated++;
            break outer;
          }
        }
      }

      if (!booked) console.warn(`  ⚠️  No free slot for "${name}" booking ${i + 1}`);
      globalIdx++;
    }

    console.log(`  ✅ ${name}: ${count} bookings created`);
  }

  await AppDataSource.destroy();

  console.log('\n✅ Seed completed successfully!');
  console.log(`   👤 17 users  (1 admin + 6 masters + 10 clients)`);
  console.log(`   🛠️  25 services in 4 categories`);
  console.log(`   🚗 20 vehicles (2 per client)`);
  console.log(`   📅 4 demo bookings + ${totalCreated} historical COMPLETED bookings`);
  console.log(`   ⭐ ~${Math.floor(totalCreated / 2)} reviews`);
}

main().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
