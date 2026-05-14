# Stage 1 Report — Architecture & Foundation

**Дата:** 2026-05-12
**Автор:** Claude Code (Senior Full-Stack)
**Статус:** ✅ Завершено

---

## Мета етапу

Побудувати надійний фундамент монорепо: типи, entities, конфігурація,
спільна інфраструктура (guards, filters, decorators), точки входу
застосунку та демо-дані.

---

## Перелік виконаних завдань

### Блок A — Enums
- [x] `role.enum.ts` — CLIENT / MASTER / ADMIN
- [x] `booking-status.enum.ts` — PENDING / CONFIRMED / IN_PROGRESS / COMPLETED / CANCELLED
- [x] `notification-type.enum.ts` — 7 типів: BOOKING_CONFIRMED, BOOKING_CANCELLED, BOOKING_REMINDER_24H, BOOKING_REMINDER_2H, STATUS_CHANGED, EMAIL_VERIFICATION, PASSWORD_RESET

### Блок B — Конфігурація
- [x] `database.config.ts` — реєструє `database.*` namespace через `ConfigService`
- [x] `jwt.config.ts` — реєструє `jwt.*` namespace
- [x] `.env` + `.env.example` — з `DB_SYNC=false` за замовчуванням
- [x] `.env` у `.gitignore` — секрети не потрапляють до репозиторію

### Блок C — TypeORM Entities (14 штук + barrel)
- [x] `user.entity.ts` — розширена: emailVerificationToken, passwordResetToken/Expires, refreshTokenHash, isBlocked
- [x] `client-profile.entity.ts`
- [x] `master-profile.entity.ts`
- [x] `master-schedule.entity.ts` — індекс на `master`
- [x] `master-day-off.entity.ts` — індекси на `master` та `date`
- [x] `service-category.entity.ts` — поле `isActive`
- [x] `service.entity.ts` — `onDelete: SET NULL` для category
- [x] `master-service.entity.ts` — `@Unique(['master', 'service'])`
- [x] `vehicle.entity.ts` — `smallint` для year, `length: 17` для VIN
- [x] `booking.entity.ts` — індекси на client, master, status, scheduledAt
- [x] `booking-service.entity.ts`
- [x] `booking-status-history.entity.ts` — індекс на booking
- [x] `review.entity.ts` — `onDelete: CASCADE`
- [x] `notification.entity.ts` — enum NotificationType
- [x] `index.ts` — barrel re-exports

### Блок D — Спільна інфраструктура
- [x] `GlobalExceptionFilter` — уніфікований формат: `{statusCode, timestamp, path, method, message}`; логує >= 500
- [x] `@Roles()` decorator + `ROLES_KEY`
- [x] `@CurrentUser()` param decorator
- [x] `JwtAuthGuard` — extends `AuthGuard('jwt')`
- [x] `RolesGuard` — перевіряє `user?.role`
- [x] `PaginationDto` з `paginate<T>()` utility + `PaginatedResult<T>` interface

### Блок E — AppModule та main.ts
- [x] `AppModule` — ConfigModule (global), TypeOrmModule (async), ThrottlerModule; barrel imports
- [x] `app.controller.ts` — `GET /health` повертає `{status, timestamp, version, environment}`
- [x] `main.ts` — helmet, CORS, ValidationPipe, GlobalExceptionFilter, Swagger

### Блок F — Seed
- [x] Очищення всіх таблиць (`TRUNCATE` у зворотному порядку залежностей)
- [x] 3 користувачі: admin@demo.com, master@demo.com, client@demo.com (пароль `DemoPass123!`)
- [x] MasterProfile (8 років досвіду, rating 4.75) + ClientProfile
- [x] MasterSchedule Пн–Пт 09:00–18:00
- [x] 3 ServiceCategory × 3 Service = 9 сервісів з реальними цінами (DECIMAL)
- [x] MasterService — майстер прив'язаний до всіх 9 сервісів
- [x] Vehicle — Toyota Camry 2020
- [x] 3 Booking: COMPLETED (з Review 5★), CONFIRMED, PENDING
- [x] BookingStatusHistory для всіх переходів статусів

### Тести
- [x] `global-exception.filter.spec.ts` — 3 тести (формат 400, 500, ISO timestamp)
- [x] `roles.guard.spec.ts` — 4 тести (без декоратора, правильна роль, неправильна роль, без user)
- [x] `pagination.dto.spec.ts` — 5 тестів (paginate metadata, empty set, defaults, exact multiple, round-up)

---

## Ключові технічні рішення

### Чому `DB_SYNC=false` у production
`synchronize: true` в production автоматично змінює схему при старті —
це може призвести до незворотної втрати даних. Для production
використовуються явні міграції TypeORM, що дають контроль над кожною DDL-операцією.

### Чому `DECIMAL(10,2)` а не `FLOAT`
`FLOAT` — числа з плаваючою комою — накопичують помилки округлення
(напр. `0.1 + 0.2 ≠ 0.3`). Для фінансових розрахунків обов'язковий тип
`DECIMAL`, що зберігає точне десяткове значення без втрат.

### Чому barrel exports (`index.ts`)
Дозволяє імпортувати всі entities з одного місця:
`import { User, Booking } from './database/entities'` замість
14 окремих рядків. Зменшує зв'язність і спрощує рефакторинг.

### Чому `onDelete: RESTRICT` для Booking
Booking не може бути видалений, якщо на нього посилається User або Master —
захист від orphan-записів. `CASCADE` використовується лише де втрата
дочірніх записів логічна (напр., BookingService при видаленні Booking).

### Чому `@Unique(['master', 'service'])` на MasterService
Запобігає дублюванню зв'язку майстер–сервіс на рівні БД (не тільки
в коді) — database constraint надійніше за application-level validation.

---

## Метрики

| Показник | Значення |
|----------|----------|
| Файлів створено/оновлено | 47 |
| TypeORM entities | 14 |
| Unit tests | 12 (3 файли) |
| Enums | 3 |
| Config namespaces | 2 |
| Seed records | 3 users, 3 categories, 9 services, 3 bookings |

---

## Верифікація (V1–V7)

> Потребує встановленого Node.js 20+. Виконати після `npm install`.

| # | Команда | Очікуваний результат |
|---|---------|---------------------|
| V1 | `npx tsc --noEmit` | 0 помилок |
| V2 | `npm run lint` | 0 errors, 0 warnings |
| V3 | `npm test -- --coverage` | 12 тестів зелених, coverage ≥ 80% для common/ |
| V4 | `npm run build` | `dist/` створена без помилок |
| V5 | `docker-compose up -d mysql && DB_SYNC=true npm run start:dev` + `curl .../health` | `{"status":"ok",...}` |
| V6 | Відкрити `http://localhost:3000/api/v1/docs` | Swagger UI з GET /health |
| V7 | `npm run seed` | `✅ Seed completed: 3 users, 9 services, 3 bookings` |

---

## Критика

1. **auth module** не повністю реалізовано — є контролер/сервіс але без register endpoint та refresh token flow
2. **intelligence module** — лише заглушки, алгоритм scoring не реалізовано
3. **email verification** — поле `emailVerificationToken` є, але NotificationService не підключений
4. **migrations** — папка порожня; для production потрібно згенерувати початкову міграцію

## Технічний борг

- [ ] `apps/backend/src/modules/auth/` — дописати register, refresh, logout, verify-email endpoints
- [ ] `apps/backend/src/modules/services/` — CRUD для Service та ServiceCategory
- [ ] `apps/backend/src/modules/masters/` — CRUD для MasterProfile, schedule, days-off
- [ ] `apps/backend/src/modules/bookings/` — CRUD + статус-машина
- [ ] Початкова TypeORM міграція (`npm run migration:generate`)
- [ ] E2E tests для health endpoint
