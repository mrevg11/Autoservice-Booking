# AutoService Booking System

> Інтелектуальна інформаційна система автоматизації онлайн-запису та управління послугами автосервісу

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🚀 Demo

- **Frontend:** https://autoservice-frontend.onrender.com
- **Backend API:** https://autoservice-api.onrender.com/api/v1
- **Swagger:** https://autoservice-api.onrender.com/api/v1/docs

### Тестові акаунти
| Роль | Email | Пароль |
|------|-------|--------|
| Клієнт | client@demo.com | DemoPass123! |
| Майстер | master@demo.com | DemoPass123! |
| Адмін | admin@demo.com | DemoPass123! |

## 📋 Стек технологій

| Компонент | Технологія |
|-----------|-----------|
| Backend | NestJS 10 + TypeScript + TypeORM |
| Frontend | React 18 + Vite + TailwindCSS |
| Database | MySQL 8 |
| Auth | JWT (access 15m + refresh 7d) |
| Email | Nodemailer + Handlebars templates |
| Testing | Jest + Playwright + k6 |
| Deploy | Render (Web Service + Static + MySQL) |
| CI/CD | GitHub Actions |

## 🧠 Інтелектуальні модулі

1. **SlotSuggester** — Weighted scoring: рейтинг(0.35) + доступність(0.25) + досвід(0.20) + завантаженість(0.10) + спеціалізація(0.10)
2. **Recommendations** — Hybrid: content-based + collaborative filtering + ТО-інтервали + вік авто
3. **DurationPredictor** — Регресія: base × masterCoeff × vehicleAgeCoeff × seasonCoeff

## 🏗️ Архітектура

```
autoservice-booking/ (monorepo)
├── apps/
│   ├── backend/    # NestJS REST API (port 3000)
│   └── frontend/   # React SPA (port 5173)
└── packages/
    └── shared-types/
```

## 🚀 Локальний запуск

### Вимоги
- Node.js ≥ 20
- Docker Desktop
- npm ≥ 10

### Кроки

```bash
# 1. Клонування
git clone https://github.com/mrevg11/Autoservice-Booking.git
cd autoservice-booking

# 2. Залежності
npm install

# 3. MySQL через Docker
docker-compose up -d mysql

# 4. Змінні середовища
cp apps/backend/.env.example apps/backend/.env
# Відредагуй apps/backend/.env (DB_PASSWORD, JWT_SECRET тощо)

# 5. Міграції та seed
cd apps/backend
npm run migration:run
npm run seed

# 6. Запуск
cd apps/backend && npm run start:dev   # http://localhost:3000/api/v1
cd apps/frontend && npm run dev        # http://localhost:5173
```

## 🧪 Тестування

```bash
# Unit тести (backend) — покриття 72%
cd apps/backend && npm test -- --coverage

# Unit тести (frontend) — покриття 60%
cd apps/frontend && npm test -- --coverage

# E2E тести (Playwright)
cd apps/frontend && npx playwright test

# Навантажувальні тести (k6)
k6 run apps/backend/load-tests/booking-load.js
```

## 📊 Результати тестування

- Unit coverage: backend ≥72%, frontend ≥60%
- Unit тести: 121 backend + 64 frontend = 185 тестів
- E2E: 5 spec файлів, 25+ сценаріїв (Playwright)
- Load: p95 < 1000ms, error rate < 1% при 100 юзерах (k6)

## 📁 Структура документації

```
docs/
├── reports/          # звіти по кожному етапу
├── coverage/         # coverage репорти
├── screenshots/      # скриншоти UI
├── errors.md         # журнал помилок
├── openapi.json      # OpenAPI специфікація
├── er-diagram.png    # ER-діаграма БД
├── user-manual.md    # посібник клієнта/майстра
└── admin-manual.md   # посібник адміністратора
```

## 🔑 Ключові функції

- **CLIENT**: реєстрація, запис на сервіс (wizard + smart AI), перегляд авто, відгуки, рекомендації
- **MASTER**: управління записами (PENDING → CONFIRMED → IN_PROGRESS → COMPLETED), розклад, вихідні дні
- **ADMIN**: аналітика (6 графіків + CSV), управління користувачами, послугами, майстрами, записами
- **AI Intelligence**: зважений scoring слотів, hybrid-рекомендації, предикція тривалості
- **Notifications**: 7 email-шаблонів (Handlebars), cron-нагадування (24h + 2h), in-app сповіщення

## 📝 Автор

Дипломний проєкт, 2026
