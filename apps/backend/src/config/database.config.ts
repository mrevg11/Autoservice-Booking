import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env['DB_HOST'] || 'localhost',
  port: parseInt(process.env['DB_PORT'] || '3306', 10),
  name: process.env['DB_NAME'] || 'autoservice',
  username: process.env['DB_USER'] || 'root',
  password: process.env['DB_PASSWORD'] || '',
  synchronize: process.env['DB_SYNC'] === 'true', // ЗАВЖДИ false у production
  logging: process.env['NODE_ENV'] === 'development',
}));
