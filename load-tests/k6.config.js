// Базова конфігурація k6 для навантажувального тестування
// Документація: https://k6.io/docs/

export const BASE_URL = __ENV.BASE_URL || 'https://autoservice-booking.onrender.com/api/v1';

// Тестові облікові дані (demo-акаунти)
export const CLIENT_CREDENTIALS = {
  email: __ENV.CLIENT_EMAIL || 'client@demo.com',
  password: __ENV.CLIENT_PASSWORD || 'DemoPass123!',
};

export const ADMIN_CREDENTIALS = {
  email: __ENV.ADMIN_EMAIL || 'admin@demo.com',
  password: __ENV.ADMIN_PASSWORD || 'DemoPass123!',
};

// Загальні налаштування для всіх тестів
export const defaultOptions = {
  thresholds: {
    // Вимога диплому: 95-й перцентиль < 500мс
    http_req_duration: ['p(95)<500'],
    // Менше 1% помилок
    http_req_failed: ['rate<0.01'],
  },
};
