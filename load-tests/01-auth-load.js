/**
 * Тест 1: Навантаження на ендпоїнти автентифікації
 * Сценарій: 50 користувачів виконують логін одночасно протягом 1 хвилини
 * Вимога диплому (розділ 4): перевірка продуктивності при навантаженні 100 одночасних користувачів
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, CLIENT_CREDENTIALS, defaultOptions } from './k6.config.js';

// Кастомні метрики
const loginDuration = new Trend('login_duration', true);
const loginErrors = new Rate('login_errors');
const successfulLogins = new Counter('successful_logins');

export const options = {
  ...defaultOptions,
  stages: [
    { duration: '30s', target: 20 },  // Поступове зростання до 20 користувачів
    { duration: '1m', target: 50 },   // Утримання 50 одночасних користувачів
    { duration: '30s', target: 100 }, // Пік: 100 одночасних (вимога диплому)
    { duration: '30s', target: 0 },   // Спад навантаження
  ],
  thresholds: {
    ...defaultOptions.thresholds,
    login_duration: ['p(95)<500', 'p(99)<1000'],
    login_errors: ['rate<0.05'],
  },
};

export default function () {
  const payload = JSON.stringify(CLIENT_CREDENTIALS);
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  // Тест логіну
  const loginRes = http.post(`${BASE_URL}/auth/login`, payload, params);

  loginDuration.add(loginRes.timings.duration);

  const loginOk = check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'has accessToken': (r) => {
      try {
        return JSON.parse(r.body).accessToken !== undefined;
      } catch {
        return false;
      }
    },
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (!loginOk) {
    loginErrors.add(1);
  } else {
    successfulLogins.add(1);

    // Тест захищеного ендпоїнту з отриманим токеном
    const token = JSON.parse(loginRes.body).accessToken;
    const authParams = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };

    const profileRes = http.get(`${BASE_URL}/users/me`, authParams);
    check(profileRes, {
      'profile status 200': (r) => r.status === 200,
      'profile response time < 300ms': (r) => r.timings.duration < 300,
    });
  }

  sleep(1);
}

export function handleSummary(data) {
  return {
    'load-tests/results/01-auth-results.json': JSON.stringify(data, null, 2),
  };
}
