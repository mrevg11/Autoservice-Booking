import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

/**
 * Integration flow:
 * client login → create vehicle → create booking → master confirms →
 * master progresses → master completes → client reviews → duplicate review 409
 *
 * Requires running MySQL. Run: npm run test:e2e
 */
describe('Bookings E2E flow', () => {
  let app: INestApplication;
  let _dataSource: DataSource;
  let clientToken: string;
  let masterToken: string;
  let vehicleId: number;
  let bookingId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
    _dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Login as client', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'client@demo.com', password: 'DemoPass123!' })
      .expect(200);
    clientToken = res.body.accessToken;
    expect(clientToken).toBeDefined();
  });

  it('2. POST /vehicles → create vehicle', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ make: 'Honda', model: 'Civic', year: 2022 })
      .expect(201);
    vehicleId = res.body.id;
    expect(vehicleId).toBeDefined();
  });

  it('3. POST /bookings → create booking', async () => {
    const future = new Date(Date.now() + 7 * 24 * 3600_000).toISOString().slice(0, 19);
    const res = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        masterId: 1,
        vehicleId,
        scheduledAt: future,
        serviceIds: [1],
      })
      .expect(201);
    bookingId = res.body.id;
    expect(res.body.status).toBe('PENDING');
  });

  it('4. GET /bookings/:id → check details', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);
    expect(res.body.id).toBe(bookingId);
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('5. Login as master', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'master@demo.com', password: 'DemoPass123!' })
      .expect(200);
    masterToken = res.body.accessToken;
  });

  it('6. PATCH /bookings/:id/status → CONFIRMED', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ status: 'CONFIRMED' })
      .expect(200);
    expect(res.body.status).toBe('CONFIRMED');
  });

  it('7. PATCH /bookings/:id/status → IN_PROGRESS', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);
    expect(res.body.status).toBe('IN_PROGRESS');
  });

  it('8. PATCH /bookings/:id/status → COMPLETED', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ status: 'COMPLETED' })
      .expect(200);
    expect(res.body.status).toBe('COMPLETED');
  });

  it('9. POST /reviews → leave review', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ bookingId, rating: 5, comment: 'Excellent!' })
      .expect(201);
    expect(res.body.rating).toBe(5);
  });

  it('10. POST /reviews again → 409 ConflictException', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ bookingId, rating: 4, comment: 'Again' })
      .expect(409);
  });
});
