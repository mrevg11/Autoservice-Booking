import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

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
  entities: [],
});

async function main() {
  await ds.initialize();
  const total = await ds.query('SELECT COUNT(*) as cnt FROM master_services');
  console.log('Total master_services:', total[0].cnt);

  const rows: { name: string; m: string }[] = await ds.query(
    'SELECT s.name, COUNT(ms.id) as m FROM services s LEFT JOIN master_services ms ON ms.serviceId = s.id GROUP BY s.id, s.name ORDER BY CAST(m AS UNSIGNED) ASC',
  );
  rows.forEach((r) => console.log(`${r.m}x  ${r.name}`));
  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
