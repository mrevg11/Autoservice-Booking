/**
 * Тест 3: Навантаження на аналітичні ендпоїнти (адмін-панель)
 * Сценарій: Адміністратор переглядає звіти при 20 одночасних сесіях
 * Перевіряємо складні агрегаційні SQL-запити під навантаженням
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL, ADMIN_CREDENTIALS, defaultOptions } from './k6.config.js';

const analyticsDuration = new Trend('analytics_duration', true);
const analyticsErrors = new Rate('analytics_errors');

export const options = {
  ...defaultOptions,
  stages: [
    { duration: '20s', target: 5 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    ...defaultOptions.thresholds,
    analytics_duration: ['p(95)<1000'], // Аналітика допускає 1с
    analytics_errors: ['rate<0.01'],
  },
};

export function setup() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify(ADMIN_CREDENTIALS),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (res.status !== 200) return { token: null };
  return { token: JSON.parse(res.body).accessToken };
}

export default function (data) {
  if (!data.token) {
    analyticsErrors.add(1);
    sleep(1);
    return;
  }

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  };

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);

  // Тест аналітичного дашборду (складний агрегаційний запит)
  const summaryRes = http.get(
    `${BASE_URL}/analytics/summary?from=${from}&to=${to}`,
    authHeaders,
  );

  analyticsDuration.add(summaryRes.timings.duration);

  const summaryOk = check(summaryRes, {
    'analytics summary 200': (r) => r.status === 200,
    'analytics response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  if (!summaryOk) analyticsErrors.add(1);

  sleep(2);

  // Тест завантаженості майстрів
  const loadRes = http.get(
    `${BASE_URL}/analytics/master-load?from=${from}&to=${to}`,
    authHeaders,
  );

  check(loadRes, {
    'master load 200': (r) => r.status === 200,
    'master load response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(2);
}

export function handleSummary(data) {
  return {
    'load-tests/results/03-analytics-results.json': JSON.stringify(data, null, 2),
  };
}
