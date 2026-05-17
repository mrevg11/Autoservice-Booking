/**
 * Safe patch: adds missing master-service assignments without wiping any data.
 * Run against prod: set DB_* env vars and execute with ts-node.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../entities/user.entity';
import { ClientProfile } from '../entities/client-profile.entity';
import { MasterProfile } from '../entities/master-profile.entity';
import { MasterSchedule } from '../entities/master-schedule.entity';
import { MasterDayOff } from '../entities/master-day-off.entity';
import { ServiceCategory } from '../entities/service-category.entity';
import { Service } from '../entities/service.entity';
import { MasterService } from '../entities/master-service.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { Booking } from '../entities/booking.entity';
import { BookingService } from '../entities/booking-service.entity';
import { BookingStatusHistory } from '../entities/booking-status-history.entity';
import { Review } from '../entities/review.entity';
import { Notification } from '../entities/notification.entity';

dotenv.config({ path: `${__dirname}/../../../.env` });

const ds = new DataSource({
  type: 'mysql',
  host: process.env['DB_HOST'] ?? 'localhost',
  port: parseInt(process.env['DB_PORT'] ?? '3306', 10),
  username: process.env['DB_USER'] ?? 'root',
  password: process.env['DB_PASSWORD'] ?? '',
  database: process.env['DB_NAME'] ?? 'autoservice',
  synchronize: false,
  logging: false,
  charset: 'utf8mb4',
  entities: [
    User, ClientProfile, MasterProfile, MasterSchedule, MasterDayOff,
    ServiceCategory, Service, MasterService, Vehicle,
    Booking, BookingService, BookingStatusHistory, Review, Notification,
  ],
});

// email → service names they should be able to perform
const ASSIGNMENTS: Record<string, string[]> = {
  'master.1@demo.com': [
    'Заміна оливи та фільтра', 'Заміна гальмівних колодок', 'Заміна повітряного фільтра',
    'Усунення вм\'ятини PDR', 'Полірування кузова', 'Локальне фарбування деталі',
    'Комп\'ютерна діагностика', 'Діагностика підвіски', 'Перевірка гальмівної системи',
  ],
  'master.2@demo.com': [
    'Заміна ременя ГРМ', 'Заміна прокладки головки блоку', 'Чищення паливної системи',
    'Заміна термостата', 'Заміна оливи та фільтра', 'Заміна свічок запалювання',
  ],
  'master.3@demo.com': [
    'Фарбування бампера', 'Локальне фарбування деталі', 'Полірування кузова',
    'Усунення вм\'ятини PDR', 'Антикорозійна обробка', 'Хімчистка салону',
  ],
  'master.4@demo.com': [
    'Комп\'ютерна діагностика', 'Діагностика підвіски', 'Діагностика електрики',
    'Діагностика ходової частини', 'Перевірка гальмівної системи',
    'Заміна гальмівної рідини', 'Заміна гальмівних колодок',
  ],
  'master.5@demo.com': [
    'Регулювання кутів коліс (розвал-сходження)', 'Балансування коліс', 'Сезонна заміна шин',
    'Заміна повітряного фільтра', 'Заміна паливного фільтра',
    'Заміна охолоджувальної рідини', 'Заміна свічок запалювання',
  ],
  'master.6@demo.com': [
    'Діагностика електрики', 'Комп\'ютерна діагностика', 'Заміна термостата',
    'Чищення паливної системи', 'Заміна ременя ГРМ', 'Заміна прокладки головки блоку',
  ],
};

async function main() {
  await ds.initialize();
  console.log('✅ DB connected');

  const userRepo = ds.getRepository(User);
  const masterProfileRepo = ds.getRepository(MasterProfile);
  const serviceRepo = ds.getRepository(Service);
  const masterServiceRepo = ds.getRepository(MasterService);

  let added = 0;
  let skipped = 0;

  for (const [email, serviceNames] of Object.entries(ASSIGNMENTS)) {
    const user = await userRepo.findOne({ where: { email } });
    if (!user) { console.warn(`⚠️  User not found: ${email}`); continue; }

    const masterProfile = await masterProfileRepo.findOne({ where: { user: { id: user.id } } });
    if (!masterProfile) { console.warn(`⚠️  Master profile not found for: ${email}`); continue; }

    for (const name of serviceNames) {
      const service = await serviceRepo.findOne({ where: { name } });
      if (!service) { console.warn(`⚠️  Service not found: "${name}"`); continue; }

      const exists = await masterServiceRepo.findOne({
        where: { master: { id: masterProfile.id }, service: { id: service.id } },
      });

      if (exists) {
        skipped++;
      } else {
        await masterServiceRepo.save(
          masterServiceRepo.create({ master: masterProfile, service, priceCoefficient: 1.0 }),
        );
        console.log(`  ✅ Added "${name}" → ${email}`);
        added++;
      }
    }
  }

  console.log(`\n✅ Done. Added: ${added}, Already existed: ${skipped}`);
  await ds.destroy();
}

main().catch((err) => { console.error(err); process.exit(1); });
