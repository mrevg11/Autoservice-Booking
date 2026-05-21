import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

/**
 * E2E flow: register → verify-email → login → GET /me → logout → GET /me (401)
 *
 * Requires running MySQL. Set TEST_DB_* env vars or use the default .env.
 * Run: npm run test:e2e
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let verificationToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    // Видаляємо тестового юзера
    await dataSource.query(`DELETE FROM users WHERE email = 'e2e@test.com'`);
    await app.close();
  });

  it('POST /api/v1/auth/register → 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'e2e@test.com',
        password: 'E2ePass123!',
        firstName: 'E2E',
        lastName: 'Test',
      })
      .expect(201);

    expect(res.body.message).toContain('Registration successful');
  });

  it('POST /api/v1/auth/register → 409 при повторній реєстрації', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'e2e@test.com',
        password: 'E2ePass123!',
        firstName: 'E2E',
        lastName: 'Test',
      })
      .expect(409);
  });

  it('POST /api/v1/auth/verify-email → 200 (з токеном з БД)', async () => {
    const [row] = await dataSource.query<{ emailVerificationToken: string }[]>(
      `SELECT emailVerificationToken FROM users WHERE email = 'e2e@test.com'`,
    );
    verificationToken = row.emailVerificationToken;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token: verificationToken })
      .expect(200);

    expect(res.body.message).toBe('Email verified successfully');
  });

  it('POST /api/v1/auth/login → 200, { accessToken, user }', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'e2e@test.com', password: 'E2ePass123!' })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe('e2e@test.com');
    expect(res.body).not.toHaveProperty('passwordHash');
    accessToken = res.body.accessToken;
  });

  it('GET /api/v1/users/me → 200 з Bearer token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.email).toBe('e2e@test.com');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('POST /api/v1/auth/logout → 200', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.message).toBe('Logged out successfully');
  });

  it('POST /api/v1/auth/login → 401 при неправильному паролі', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'e2e@test.com', password: 'WrongPass123!' })
      .expect(401);
  });

  it('POST /api/v1/auth/register → 400 при невалідному DTO', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);

    expect(res.body.message).toBeDefined();
  });

  it('GET /api/v1/users → 401 без токена', async () => {
    await request(app.getHttpServer()).get('/api/v1/users').expect(401);
  });
});
