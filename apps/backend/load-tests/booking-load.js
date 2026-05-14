import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const bookingErrors = new Counter('booking_errors');
const bookingSuccessRate = new Rate('booking_success_rate');
const bookingDuration = new Trend('booking_duration');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m',  target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed:   ['rate<0.01'],
    booking_success_rate: ['rate>0.95'],
  },
};

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: 'client@demo.com', password: 'DemoPass123!' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  const token = loginRes.json('accessToken');
  if (!token) {
    console.error('Login failed:', loginRes.body);
  }
  return { token };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // Scenario 1: GET /masters (public)
  const mastersRes = http.get(`${BASE_URL}/masters`, { headers });
  check(mastersRes, { 'masters 200': (r) => r.status === 200 });

  sleep(0.5);

  // Scenario 2: GET /services
  const servicesRes = http.get(`${BASE_URL}/services`, { headers });
  check(servicesRes, { 'services 200': (r) => r.status === 200 });

  sleep(0.5);

  // Scenario 3: GET /masters/1/slots
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  const slotsRes = http.get(
    `${BASE_URL}/masters/1/slots?date=${dateStr}&duration=60`,
    { headers },
  );
  check(slotsRes, { 'slots 200': (r) => r.status === 200 });

  sleep(0.5);

  // Scenario 4: POST /intelligence/suggest-slots
  const start = Date.now();
  const suggestRes = http.post(
    `${BASE_URL}/intelligence/suggest-slots`,
    JSON.stringify({ serviceIds: [1], vehicleId: 1 }),
    { headers },
  );
  bookingDuration.add(Date.now() - start);

  const suggestOk = check(suggestRes, {
    'suggest-slots 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  bookingSuccessRate.add(suggestOk);
  if (!suggestOk) bookingErrors.add(1);

  sleep(1);
}
