# Звіт про виконану роботу — Етапи 1–4

**Проект:** Інтелектуальна інформаційна система автоматизації онлайн-запису та управління послугами автосервісу
**Дата:** 2026-05-12 (оновлено: Етап 5)
**Репозиторій:** `d:\Diplom.Project\autoservice-booking\`

---

## Технологічний стек

- **Backend:** NestJS 10 + TypeScript (strict) + TypeORM 0.3 + MySQL 8
- **Frontend:** React 18 + Vite + TailwindCSS + Zustand + React Query *(scaffold only)*
- **Monorepo:** npm workspaces (`apps/backend`, `apps/frontend`, `packages/shared-types`)
- **Infra:** Docker Compose, GitHub Actions CI/CD

---

## Етап 1 — Фундамент ✅

- 14 TypeORM entities з індексами, `DECIMAL(10,2)` для грошей, `onDelete` behaviors
- Спільна інфраструктура: `GlobalExceptionFilter`, `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()`, `@Roles()`, `PaginationDto` + `paginate<T>()`
- `AppModule` з ConfigModule, TypeOrmModule, ThrottlerModule
- `GET /api/v1/health`
- Seed скрипт: 3 юзери, 3 категорії, 9 послуг, 3 бронювання
- 12 unit тестів

---

## Етап 2 — Auth + Users CRUD ✅

- **Auth endpoints (7):** `POST /auth/register|verify-email|login|refresh|logout|forgot-password|reset-password`
- JWT (access 15m / refresh 7d), refresh token як bcrypt hash в БД
- Rate limiting: 5 req/min на login, 3 req/min на forgot-password
- Anti-enumeration захист на login та forgotPassword
- **Users endpoints (6):** `GET|PATCH /users/me`, `GET|PATCH|DELETE /users/:id` [ADMIN], `GET /users` [ADMIN] з пагінацією
- `MailService` (Nodemailer), `JwtStrategy` з перевіркою isBlocked
- 18 unit тестів + 8 e2e сценаріїв

---

## Етап 3 — CRUD бізнес-модулів ✅

**32 нових endpoints:**

| Модуль | Endpoints |
|---|---|
| **Services** | 8: categories CRUD [ADMIN] + services CRUD [ADMIN/public] з фільтрами (categoryId, isActive, search) |
| **Masters** | 10: профіль, розклад (PUT — повна заміна в transaction), days-off, assign/remove services, `GET /masters/:id/slots?date&duration` |
| **Vehicles** | 5: CRUD [CLIENT], ownership guard (403 якщо чужий) |
| **Bookings** | 6: create [CLIENT], list/get [role-based filter], `PATCH /:id/status` [MASTER/ADMIN], `POST /:id/cancel` [CLIENT], `GET /:id/history` |
| **Reviews** | 3: create [CLIENT, тільки після COMPLETED], by master [public], by booking [JWT] |

**Ключові реалізації:**

- **Race condition:** `DataSource.transaction` + `setLock('pessimistic_write')` (MySQL FOR UPDATE) при створенні бронювання
- **Статус-машина:** `STATUS_TRANSITIONS` матриця → `PENDING→CONFIRMED→IN_PROGRESS→COMPLETED` (фінальний), CLIENT має окремий `cancel()` з дедлайном 2 год
- **Access control:** перевірка в сервісі на рівні SQL WHERE (не тільки guard)
- **`getAvailableSlots`:** генерація 30-хв слотів з перевіркою day-off, розкладу, overlap
- 27 unit тестів + 10 e2e сценаріїв

---

## Поточна структура `apps/backend/src/`

```
common/           guards, filters, decorators, dto (pagination, date-range)
config/           database.config.ts, jwt.config.ts
database/
  entities/       14 entities + barrel index.ts
  seeds/          seed.ts (demo data)
modules/
  auth/           7 endpoints + JwtStrategy
  users/          6 endpoints
  mail/           MailService (Nodemailer)
  services/       8 endpoints
  masters/        10 endpoints
  vehicles/       5 endpoints
  bookings/       6 endpoints
  reviews/        3 endpoints
```

---

## Зведена таблиця всіх endpoints (45 шт.)

| Метод | Шлях | Ролі |
|---|---|---|
| GET | /health | Public |
| POST | /auth/register | Public |
| POST | /auth/verify-email | Public |
| POST | /auth/login | Public |
| POST | /auth/refresh | JWT |
| POST | /auth/logout | JWT |
| POST | /auth/forgot-password | Public |
| POST | /auth/reset-password | Public |
| GET | /users/me | JWT |
| PATCH | /users/me | JWT |
| GET | /users | ADMIN |
| GET | /users/:id | ADMIN |
| PATCH | /users/:id | ADMIN |
| DELETE | /users/:id | ADMIN |
| POST | /services/categories | ADMIN |
| GET | /services/categories | Public |
| PATCH | /services/categories/:id | ADMIN |
| POST | /services | ADMIN |
| GET | /services | Public |
| GET | /services/:id | Public |
| PATCH | /services/:id | ADMIN |
| DELETE | /services/:id | ADMIN |
| GET | /masters | Public |
| GET | /masters/:id | Public |
| PATCH | /masters/me | MASTER |
| GET | /masters/:id/schedule | Public |
| PUT | /masters/me/schedule | MASTER |
| POST | /masters/me/days-off | MASTER |
| DELETE | /masters/me/days-off/:id | MASTER |
| POST | /masters/me/services | MASTER, ADMIN |
| DELETE | /masters/me/services/:serviceId | MASTER, ADMIN |
| GET | /masters/:id/slots | JWT |
| POST | /vehicles | CLIENT |
| GET | /vehicles | CLIENT |
| GET | /vehicles/:id | CLIENT |
| PATCH | /vehicles/:id | CLIENT |
| DELETE | /vehicles/:id | CLIENT |
| POST | /bookings | CLIENT |
| GET | /bookings | JWT |
| GET | /bookings/:id | JWT |
| PATCH | /bookings/:id/status | MASTER, ADMIN |
| POST | /bookings/:id/cancel | CLIENT |
| GET | /bookings/:id/history | JWT |
| POST | /reviews | CLIENT |
| GET | /reviews/master/:masterId | Public |
| GET | /reviews/booking/:bookingId | JWT |

---

## Demo credentials (seed)

```
admin@demo.com   →  DemoPass123!
master@demo.com  →  DemoPass123!
client@demo.com  →  DemoPass123!
```

---

## Тести

| Етап | Unit | E2E |
|---|---|---|
| Етап 1 | 12 | — |
| Етап 2 | 18 | 8 |
| Етап 3 | 27 | 10 |
| Етап 4 | 21 | — |
| Етап 5 (frontend) | 27 | — |
| **Всього** | **105** | **18** |

---

## Етап 4 — Intelligence + Migrations ✅

**3 нові endpoints:**

| Метод | Шлях | Ролі |
|---|---|---|
| GET | /intelligence/suggest-slots | JWT |
| GET | /intelligence/recommendations | JWT |
| GET | /intelligence/estimate-duration | JWT |

**Ключові реалізації:**
- **SlotSuggesterService** — weighted scoring 5 факторів (rating/availability/experience/load/specialization), score ∈ [0..1]
- **RecommendationsService** — hybrid: content-based + collaborative filtering (personalized client history)
- **DurationPredictorService** — base × masterCoeff × vehicleAgeCoeff × seasonCoeff, коефіцієнти ∈ [0.5..2.0]
- **Fallback** при < `minDataPoints` historical records → masterCoeff = 1.0
- **Seed** розширено +100 COMPLETED бронювань з `actualDurationMinutes` за 12 місяців
- **TypeORM migrations pipeline** — `data-source.ts` + оновлені npm scripts

---

## Етап 5 — React Frontend (CLIENT + MASTER) ✅

**22 сторінки:** Landing, Services, Auth×5, Client×8, Master×5, NotFound, Unauthorized

**Ключові реалізації:**
- **Zustand** auth store з persist (refreshToken) + in-memory accessToken
- **Axios auto-refresh** interceptor з queue pattern (запобігає race condition)
- **React Router v6** з ProtectedRoute (role-based), lazy loading для всіх кабінетних сторінок
- **TanStack React Query** — staleTime 5хв, invalidateQueries після мутацій
- **React Hook Form + Zod** — всі форми з inline валідацією
- **5-кроковий BookingWizard** — вибір авто → послуги → майстер/час → підтвердження → успіх
- **SmartBookingPage** — інтеграція з `/intelligence/suggest-slots` API
- **Design system** — Plus Jakarta Sans, brand #1a2744, accent #f97316, CSS variables
- **Responsive** — 320px / 768px / 1280px, hamburger menu на mobile
- **Toast notifications** через Zustand store

**UI компонентів:** Button, Input, Badge, StarRating, DatePicker, TimeSlotPicker, Spinner, EmptyState, Pagination, Toast, ConfirmDialog, Layout, ProtectedRoute

---

## Технічний борг (не реалізовано)

- **Notifications module** — відправка push/email при зміні статусу бронювання
- **Admin panel** — CRUD для послуг, управління користувачами, аналітика
- **Soft delete** для Services та Users (зараз hard delete)
- Admin endpoint для управління сервісами будь-якого майстра (є тільки `/me`)
- Refresh token rotation (зараз refresh token не оновлюється при кожному використанні)
- Перша TypeORM migration (потрібно виконати `migration:generate` після `DB_SYNC=true` boot)
