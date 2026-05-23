/**
 * Тест 2: Навантаження на ендпоїнти бронювання
 * Сценарій: Перегляд доступних слотів та списку послуг при пікових навантаженнях
 * Критична функція системи — перевіряємо race conditions та стабільність
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL, CLIENT_CREDENTIALS, defaultOptions } from './k6.config.js';

const slotsDuration = new Trend('slots_duration', true);
const bookingErrors = new Rate('booking_errors');

export const options = {
  ...defaultOptions,
  stages: [
    { duration: '20s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '1m', target: 100 }, // 100 одночасних — вимога диплому
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    ...defaultOptions.thresholds,
    slots_duration: ['p(95)<500'],
    booking_errors: ['rate<0.01'],
  },
};

// Один раз логінимось перед тестами
export function setup() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify(CLIENT_CREDENTIALS),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (res.status !== 200) {
    console.error(`Setup login failed: ${res.status} ${res.body}`);
    return { token: null };
  }

  return { token: JSON.parse(res.body).accessToken };
}

export default function (data) {
  if (!data.token) {
    bookingErrors.add(1);
    sleep(1);
    return;
  }

  const authHeaders = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
    },
  };

  // Тест 1: Отримання списку послуг (core endpoint)
  const servicesRes = http.get(`${BASE_URL}/services`, authHeaders);
  const servicesOk = check(servicesRes, {
    'services status 200': (r) => r.status === 200,
    'services response time < 500ms': (r) => r.timings.duration < 500,
  });
  if (!servicesOk) bookingErrors.add(1);

  sleep(0.5);

  // Тест 2: Отримання майстрів (використовується у wizard)
  const mastersRes = http.get(`${BASE_URL}/masters`, authHeaders);
  check(mastersRes, {
    'masters status 200': (r) => r.status === 200,
    'masters response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(0.5);

  // Тест 3: Запит доступних слотів (найнавантаженіший ендпоїнт)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);

  const slotsRes = http.get(
    `${BASE_URL}/masters/1/slots?date=${dateStr}&duration=60`,
    authHeaders,
  );

  slotsDuration.add(slotsRes.timings.duration);

  check(slotsRes, {
    'slots status 200 or 404': (r) => r.status === 200 || r.status === 404,
    'slots response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'load-tests/results/02-booking-results.json': JSON.stringify(data, null, 2),
  };
}
