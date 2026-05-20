# AutoService Booking — Повний контекст проекту

> **Дата генерації:** 2026-05-19  
> **Статус:** Пройдено аудит Stage 1–3, всі критичні баги виправлено, код у стабільному стані.

---

## 1. ТЕХНІЧНИЙ СТЕК

### Монорепо
- **Менеджер:** npm workspaces (`apps/*`, `packages/*`)
- **Коренева директорія:** `d:\Diplom.Project\autoservice-booking`
- **Команди:**
  ```
  npm run dev:backend   → apps/backend (NestJS, порт 3000)
  npm run dev:frontend  → apps/frontend (Vite, порт 5173)
  ```

### Backend (`apps/backend`)
| Технологія | Версія/деталі |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | NestJS |
| ORM | TypeORM |
| БД | MySQL (Railway) |
| Auth | JWT (access + refresh tokens) |
| Validation | class-validator + class-transformer |
| Mail | Nodemailer (MailService) |
| Rate limiting | @nestjs/throttler |
| Cron | @nestjs/schedule |
| Docs | Swagger (@nestjs/swagger) |

**TypeORM config (app.module.ts):**
```typescript
type: 'mysql',
charset: 'utf8mb4',
timezone: 'Z',  // ← додано у Stage 3: всі дати зберігаються як UTC
synchronize: config.get('database.synchronize'),
```

### Frontend (`apps/frontend`)
| Технологія | Деталі |
|---|---|
| Framework | React 18 + TypeScript |
| Bundler | Vite |
| Routing | react-router-dom v6 |
| State | Zustand (persist → localStorage) |
| Server state | React Query (@tanstack/react-query) |
| Forms | react-hook-form |
| HTTP | axios (custom instance з interceptors) |
| Styling | Tailwind CSS |

---

## 2. СТРУКТУРА ФАЙЛІВ (тільки src/)

```
apps/backend/src/
├── app.module.ts                    # Кореневий модуль
├── app.controller.ts                # GET / healthcheck
├── config/
│   ├── database.config.ts
│   ├── jwt.config.ts
│   └── intelligence.config.ts       # Ваги AI + lookaheadDays + topSlots
├── common/
│   ├── enums/
│   │   ├── role.enum.ts             # CLIENT | MASTER | ADMIN
│   │   ├── booking-status.enum.ts  # PENDING|CONFIRMED|IN_PROGRESS|COMPLETED|CANCELLED
│   │   └── notification-type.enum.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   ├── filters/global-exception.filter.ts
│   └── dto/
│       ├── pagination.dto.ts        # PaginationDto + paginate() + PaginatedResult<T>
│       └── date-range.dto.ts
├── database/entities/
│   ├── user.entity.ts
│   ├── client-profile.entity.ts
│   ├── master-profile.entity.ts     # ⚠️ Немає @OneToMany — не запитуй mp.masterServices!
│   ├── master-schedule.entity.ts
│   ├── master-day-off.entity.ts
│   ├── master-service.entity.ts
│   ├── service-category.entity.ts
│   ├── service.entity.ts
│   ├── vehicle.entity.ts
│   ├── booking.entity.ts
│   ├── booking-service.entity.ts
│   ├── booking-status-history.entity.ts
│   ├── booking-photo.entity.ts
│   ├── review.entity.ts
│   └── notification.entity.ts
└── modules/
    ├── auth/                        # JWT auth, refresh, email verification, password reset
    ├── users/                       # CRUD users + admin panel
    ├── masters/                     # Профіль майстра, розклад, вихідні, послуги, слоти
    ├── services/                    # Категорії + послуги (CRUD)
    ├── vehicles/                    # Автомобілі клієнта
    ├── bookings/                    # Бронювання + фото + статус-машина + cron
    ├── reviews/                     # Відгуки (1 відгук на 1 booking)
    ├── notifications/               # DB notifications + email + cron reminders
    ├── analytics/                   # SQL-аналітика для адміна
    ├── intelligence/
    │   ├── slot-suggester.service.ts     # SmartBooking — підбір слотів з AI-scoring
    │   ├── recommendations.service.ts   # Рекомендації майстрів для клієнта
    │   └── duration-predictor.service.ts # Оцінка тривалості (вік авто, сезон, коеф.)
    └── mail/                        # Nodemailer шаблони

apps/frontend/src/
├── main.tsx
├── router.tsx                       # Всі маршрути (публічні, CLIENT, MASTER, ADMIN)
├── pages/
│   ├── LandingPage.tsx
│   ├── NotFound.tsx
│   └── Unauthorized.tsx
├── shared/
│   ├── api/
│   │   ├── axios.ts                 # Axios instance + auth interceptors + refresh logic
│   │   └── endpoints.ts            # Всі API-методи + TS-типи відповідей
│   ├── store/
│   │   ├── auth.store.ts            # Zustand: user, accessToken, hasHydrated
│   │   └── toast.store.ts
│   ├── utils/
│   │   └── date.ts                 # kyivToUTC(), toKyivDisplay(), isoToKyivTime/Date()
│   ├── data/carData.ts             # getMakes(), getModels(), getYears()
│   └── components/
│       ├── Layout.tsx
│       ├── ProtectedRoute.tsx
│       ├── NotificationBell.tsx
│       ├── Toast.tsx
│       ├── ConfirmDialog.tsx
│       └── ui/ (Button, Input, Badge, Spinner, EmptyState, Pagination,
│               StarRating, TimeSlotPicker, DatePicker)
└── features/
    ├── auth/pages/         # Login, Register, ForgotPassword, ResetPassword, VerifyEmail
    ├── profile/pages/      # ClientDashboard, ClientProfilePage
    ├── bookings/
    │   ├── pages/
    │   │   ├── BookingWizardPage.tsx  # 5-крокова форма запису (sessionStorage draft)
    │   │   ├── SmartBookingPage.tsx   # AI-підбір часу
    │   │   ├── ClientBookingsPage.tsx
    │   │   └── BookingDetailPage.tsx
    │   ├── hooks/useBookings.ts
    │   └── components/BookingPhotosSection.tsx
    ├── vehicles/           # VehiclesPage + useVehicles hook
    ├── services/           # ServicesPage + useServices/useCategories hooks
    ├── masters/            # hooks/useMasters (useMasterSlots, useWorkingDays)
    ├── intelligence/       # RecommendationsPage + useIntelligence hooks
    ├── master/             # MasterDashboard, MasterBookingsPage, MasterSchedulePage, MasterProfilePage
    └── admin/              # AdminDashboard, Users, Services, Masters, Bookings, Analytics
```

---

## 3. БАЗА ДАНИХ — СХЕМА СУТНОСТЕЙ

### Діаграма зв'язків
```
users (1) ──── (1) client_profiles
users (1) ──── (1) master_profiles
master_profiles (1) ──── (N) master_schedules
master_profiles (1) ──── (N) master_days_off
master_profiles (1) ──── (N) master_services
master_services (N) ──── (1) services
services (N) ──── (1) service_categories

users (1) ──── (N) vehicles
bookings (N) ──── (1) users [client, SET NULL on delete]
bookings (N) ──── (1) master_profiles [RESTRICT on delete]
bookings (N) ──── (1) vehicles [SET NULL on delete]
bookings (1) ──── (N) booking_services [CASCADE]
bookings (1) ──── (N) booking_status_history [CASCADE]
bookings (1) ──── (N) booking_photos [CASCADE]
bookings (1) ──── (1) reviews [CASCADE]

users (1) ──── (N) notifications
```

### Таблиці та поля

#### `users`
```sql
id INT PK, email VARCHAR(255) UNIQUE,
passwordHash VARCHAR(255), role ENUM('CLIENT','MASTER','ADMIN') DEFAULT 'CLIENT',
firstName VARCHAR(100), lastName VARCHAR(100), phone VARCHAR(20) NULL,
emailVerified BOOLEAN DEFAULT false, emailVerificationToken VARCHAR(255) NULL,
passwordResetToken VARCHAR(255) NULL, passwordResetExpires DATETIME NULL,
refreshTokenHash VARCHAR(500) NULL, isBlocked BOOLEAN DEFAULT false,
createdAt DATETIME, updatedAt DATETIME
```

#### `client_profiles`
```sql
id INT PK, userId INT FK → users,
dateOfBirth DATE NULL, preferredContactMethod VARCHAR(50) NULL
```

#### `master_profiles`
```sql
id INT PK, userId INT FK → users (CASCADE),
specialization VARCHAR(200) NULL, experienceYears INT DEFAULT 0,
rating DECIMAL(3,2) DEFAULT 0.00, photo VARCHAR(500) NULL, bio TEXT NULL
```
> **КРИТИЧНО:** Немає `@OneToMany` відносин. Для запиту послуг майстра використовуй `master_services` таблицю напряму або `MasterService` репозиторій.

#### `master_schedules`
```sql
id INT PK, masterId INT FK → master_profiles (CASCADE),
weekday TINYINT,  -- 0=Пн, 1=Вт, ..., 6=Нд (app convention)
startTime TIME, endTime TIME, isActive BOOLEAN DEFAULT true
```
> JS weekday: `(appWeekday + 1) % 7` → `getDay()` (0=Нд, 1=Пн, ..., 6=Сб)

#### `master_days_off`
```sql
id INT PK, masterId INT FK → master_profiles (CASCADE),
date DATE, reason VARCHAR(255) NULL
```

#### `master_services`
```sql
id INT PK, masterId INT FK → master_profiles (CASCADE),
serviceId INT FK → services (CASCADE),
priceCoefficient DECIMAL(4,2) DEFAULT 1.00,
UNIQUE (masterId, serviceId)
```

#### `service_categories`
```sql
id INT PK, name VARCHAR(100), description TEXT NULL,
icon VARCHAR(100) NULL, isActive BOOLEAN DEFAULT true
```

#### `services`
```sql
id INT PK, categoryId INT FK → service_categories (SET NULL),
name VARCHAR(200), description TEXT NULL,
basePrice DECIMAL(10,2), baseDurationMinutes INT,
isActive BOOLEAN DEFAULT true, recommendedIntervalDays INT DEFAULT 180
```

#### `vehicles`
```sql
id INT PK, clientId INT FK → users (CASCADE),
make VARCHAR(100), model VARCHAR(100), year SMALLINT,
vin VARCHAR(17) NULL, plateNumber VARCHAR(20) NULL
```

#### `bookings`
```sql
id INT PK, clientId INT FK → users (SET NULL), masterId INT FK → master_profiles (RESTRICT),
vehicleId INT FK → vehicles (SET NULL),
status ENUM('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'PENDING',
scheduledAt DATETIME,           -- зберігається в UTC
estimatedDurationMinutes INT,
totalPrice DECIMAL(10,2),
notes TEXT NULL, createdAt DATETIME, updatedAt DATETIME
INDEX: (masterId, status, scheduledAt)
```

#### `booking_services`
```sql
id INT PK, bookingId INT FK → bookings (CASCADE),
serviceId INT FK → services (RESTRICT),
actualPrice DECIMAL(10,2), actualDurationMinutes INT NULL
```

#### `booking_status_history`
```sql
id INT PK, bookingId INT FK → bookings (CASCADE),
oldStatus ENUM NULL,   -- null = початковий статус
newStatus ENUM,
changedById INT FK → users (SET NULL),
changedAt DATETIME
```

#### `booking_photos`
```sql
id INT PK, bookingId INT FK → bookings (CASCADE),
uploadedById INT FK → users (SET NULL),
dataUrl MEDIUMTEXT,   -- Base64, ліміт 7MB в коді (5MB реально)
mimeType VARCHAR(50), caption VARCHAR(200) NULL,
createdAt DATETIME
```

#### `reviews`
```sql
id INT PK, bookingId INT FK (OneToOne → bookings, CASCADE),
rating TINYINT UNSIGNED,  -- 1-5
comment TEXT NULL, createdAt DATETIME
```

#### `notifications`
```sql
id INT PK, userId INT FK → users (CASCADE),
type ENUM('BOOKING_CONFIRMED','BOOKING_CANCELLED','BOOKING_REMINDER_24H','BOOKING_REMINDER_2H','STATUS_CHANGED'),
title VARCHAR(255), body TEXT,
sentAt DATETIME NULL, readAt DATETIME NULL
```

---

## 4. БІЗНЕС-ЛОГІКА ТА АЛГОРИТМИ

### Статус-машина бронювань
```
PENDING → CONFIRMED (MASTER/ADMIN) → IN_PROGRESS (MASTER/ADMIN) → COMPLETED (MASTER/ADMIN)
PENDING → CANCELLED (MASTER/ADMIN)
CONFIRMED → CANCELLED (MASTER/ADMIN)
CLIENT може скасувати: тільки PENDING/CONFIRMED, за ≥2 год до початку
```

### Cron-задачі
- `0 * * * *` (щогодини) — `BookingsService.cancelExpiredBookings()` — скасує PENDING/CONFIRMED якщо `scheduledAt < now`
- `0 9 * * *` (9:00 щодня) — `NotificationsService.sendReminders24h()` — нагадування за 24 год
- `EVERY_HOUR` — `NotificationsService.sendReminders2h()` — нагадування за 2 год

### Overlap detection (бронювання)
```typescript
// Перевіряє перетин: [scheduledAt, scheduledAt + estimatedDuration]
b.scheduledAt < newEnd AND DATE_ADD(b.scheduledAt, INTERVAL b.estimatedDurationMinutes MINUTE) > newStart
// Виключає CANCELLED
// Перевіряє і майстра і авто
// Pessimistic locks: спочатку vehicle, потім master (щоб уникнути deadlock)
```

### Слоти майстра (`getAvailableSlots`)
- 30-хвилинний крок
- Перевіряє day-off, розклад, зайнятість майстра, зайнятість авто
- `slotTime <= now` → пропускає минулі слоти

### SmartBooking (`SlotSuggesterService`)
- Scoring = 0.35·rating + 0.25·availability + 0.20·experience + 0.10·load + 0.10·specialization
- `cutoff = now + 1h` — відсіює занадто близькі слоти
- `HAVING COUNT(DISTINCT s.id) = :count` — майстер має виконувати ВСІ послуги
- Lookahead: 14 днів (конфіг), top: 5 слотів
- `scheduleTimeToUTC()` — конвертує HH:MM (Київ) в UTC з урахуванням DST

### AI Recommendations (`RecommendationsService`)
- Аналізує попередні бронювання клієнта (collaborative filtering)
- Factor 1: global rating (якщо ≥5 відгуків) або profile rating
- Factor 2: кількість бронювань клієнта у цього майстра (довіра)
- Factor 3: роки досвіду / 10
- Factor 4: завантаженість за кількістю відгуків
- Factor 5: keyword-match спеціалізація vs категорія послуги
- Top 5 майстрів

### Duration Predictor
- Коефіцієнти: вік авто (старше → довше), сезон (зима → довше), майстер-коеф.
- Endpoint: `GET /intelligence/estimate-duration-multi?serviceIds=1,2&masterId=3&vehicleYear=2015`

---

## 5. API ENDPOINTS

### Базовий URL: `http://localhost:3000/api/v1`

| Метод | URL | Ролі | Опис |
|---|---|---|---|
| POST | /auth/register | Public | Реєстрація CLIENT |
| POST | /auth/login | Public | Логін → {accessToken, refreshToken, user} |
| POST | /auth/refresh | Public | Оновити accessToken по refreshToken |
| POST | /auth/logout | AUTH | Вихід (nullify refreshTokenHash) |
| POST | /auth/verify-email | Public | Підтвердження email |
| POST | /auth/forgot-password | Public | Запит скидання (rate: 3/хв) |
| POST | /auth/reset-password | Public | Скидання паролю |
| GET | /users/me | AUTH | Свій профіль |
| PATCH | /users/me | AUTH | Оновити свій профіль |
| GET | /users | ADMIN | Список users (paginated) |
| GET | /users/:id | ADMIN | User by ID |
| GET | /users/:id/details | ADMIN | User + vehiclesCount + bookingsCount |
| PATCH | /users/:id | ADMIN | Блокування/роль |
| DELETE | /users/:id | ADMIN | Видалення user (cascade cancel bookings) |
| POST | /users/create-master | ADMIN | Створити майстра (auto Mon-Fri 9-18 розклад) |
| GET | /masters | Public | Список майстрів (paginated) |
| GET | /masters/for-services?serviceIds=1,2 | Public | Майстри що виконують ВСІ послуги |
| GET | /masters/:id | Public | Майстер by ID |
| GET | /masters/:id/schedule | Public | Розклад |
| GET | /masters/:id/working-days | Public | Робочі дні (JS getDay формат) |
| GET | /masters/:id/slots?date=&duration=&vehicleId= | AUTH | Вільні слоти |
| PATCH | /masters/me | MASTER | Оновити профіль |
| PUT | /masters/me/schedule | MASTER | Замінити розклад |
| POST | /masters/me/days-off | MASTER | Додати вихідний |
| DELETE | /masters/me/days-off/:id | MASTER | Видалити вихідний |
| POST | /masters/me/services | MASTER/ADMIN | Призначити послугу |
| DELETE | /masters/me/services/:serviceId | MASTER/ADMIN | Відкріпити послугу |
| PATCH | /masters/:id/schedule | ADMIN | Оновити розклад майстра |
| GET | /services/categories | Public | Список категорій |
| GET | /services | Public | Список послуг (paginated, фільтри) |
| GET | /services/:id | Public | Послуга by ID |
| POST | /services/categories | ADMIN | Створити категорію |
| PATCH | /services/categories/:id | ADMIN | Оновити категорію |
| DELETE | /services/categories/:id | ADMIN | Видалити категорію |
| POST | /services | ADMIN | Створити послугу |
| PATCH | /services/:id | ADMIN | Оновити послугу |
| DELETE | /services/:id | ADMIN | Видалити послугу |
| GET | /services/admin/all | ADMIN | Всі послуги без пагінації |
| GET | /vehicles | CLIENT | Свої авто |
| POST | /vehicles | CLIENT | Додати авто |
| PATCH | /vehicles/:id | CLIENT | Оновити авто |
| DELETE | /vehicles/:id | CLIENT | Видалити авто |
| GET | /bookings | AUTH | Список (CLIENT=своє, MASTER=своє, ADMIN=все) |
| POST | /bookings | CLIENT | Створити запис |
| GET | /bookings/:id | AUTH | Деталі (перевірка доступу) |
| PATCH | /bookings/:id/status | MASTER/ADMIN | Змінити статус |
| POST | /bookings/:id/cancel | CLIENT | Скасувати (≥2год до початку) |
| DELETE | /bookings/:id/force | ADMIN | Повне видалення |
| GET | /bookings/:id/history | AUTH | Історія статусів |
| GET | /bookings/:id/photos | AUTH | Список фото |
| POST | /bookings/:id/photos | AUTH | Додати фото (Base64) |
| DELETE | /bookings/:id/photos/:photoId | AUTH | Видалити фото (автор або адмін) |
| POST | /reviews | CLIENT | Залишити відгук |
| GET | /reviews/master/:id | Public | Відгуки майстра |
| GET | /reviews/booking/:id | AUTH | Відгук на бронювання |
| GET | /intelligence/suggest-slots | AUTH | SmartBooking: підбір слотів |
| GET | /intelligence/recommendations?serviceId= | AUTH | Рекомендації майстрів |
| GET | /intelligence/estimate-duration | AUTH | Оцінка часу (1 послуга) |
| GET | /intelligence/estimate-duration-multi | AUTH | Оцінка часу (N послуг) |
| GET | /intelligence/reminders | CLIENT | Нагадування про ТО |
| GET | /analytics/summary | ADMIN | KPI дашборд |
| GET | /analytics/revenue | ADMIN | Дохід за період |
| GET | /analytics/master-load | ADMIN | Завантаженість майстрів |
| GET | /analytics/top-services | ADMIN | Топ послуги |
| GET | /analytics/clients-retention | ADMIN | Нові/постійні/відтоку клієнти |
| GET | /analytics/booking-funnel | ADMIN | Воронка статусів |
| GET | /notifications | AUTH | Мої сповіщення (top 50) |
| POST | /notifications/:id/read | AUTH | Позначити прочитаним |

---

## 6. ФРОНТЕНД — МАРШРУТИ

```
/                         → LandingPage (public)
/login                    → LoginPage
/register                 → RegisterPage
/forgot-password          → ForgotPasswordPage
/reset-password           → ResetPasswordPage
/verify-email             → VerifyEmailPage
/services                 → ServicesPage (public)
/unauthorized             → Unauthorized

[CLIENT]
/client/dashboard         → ClientDashboard
/client/bookings          → ClientBookingsPage
/client/bookings/new      → BookingWizardPage (5 кроків)
/client/bookings/smart    → SmartBookingPage (AI-підбір)
/client/bookings/:id      → BookingDetailPage
/client/vehicles          → VehiclesPage
/client/recommendations   → RecommendationsPage
/client/profile           → ClientProfilePage

[MASTER]
/master/dashboard         → MasterDashboard
/master/bookings          → MasterBookingsPage
/master/bookings/:id      → MasterBookingDetailPage
/master/schedule          → MasterSchedulePage
/master/profile           → MasterProfilePage

[ADMIN]
/admin/dashboard          → AdminDashboard
/admin/users              → AdminUsersPage
/admin/services           → AdminServicesPage
/admin/masters            → AdminMastersPage
/admin/bookings           → AdminBookingsPage
/admin/analytics          → AdminAnalyticsPage
```

---

## 7. КЛЮЧОВІ ТЕХНІЧНІ ДЕТАЛІ

### Auth flow (виправлено у Stage 2)
```typescript
// Login → отримуєш { accessToken, refreshToken, user }
// refreshToken зберігається: useAuthStore.refreshToken (але НЕ персистується — тільки в пам'яті)
// accessToken зберігається: localStorage (Zustand persist)

// Axios interceptor (apps/frontend/src/shared/api/axios.ts):
// 1. На кожен запит додає Bearer token
// 2. При 401 — запускає refresh (POST /auth/refresh з { refreshToken })
// 3. При failedQueue: ставить у чергу, виконує після refresh
// 4. Якщо сам /auth/refresh повернув 401 → logout + redirect /login
// 5. Deadlock prevention: if (original.url?.includes('/auth/refresh')) skip
```

> **ВАЖЛИВО:** `refreshToken` НЕ зберігається в localStorage (тільки `accessToken` і `user`).
> Після перезавантаження сторінки — silent refresh неможливий, потрібен повторний логін.
> Це поточна архітектура, можливо варто зберігати refreshToken в httpOnly cookie.

### Timezone handling
- БД: UTC (`timezone: 'Z'` у TypeORM config)
- Backend генерує слоти: `scheduleTimeToUTC()` конвертує "HH:MM" (Київ) → UTC з урахуванням DST
- Frontend відображення: `toKyivDisplay(isoString)` → `timeZone: 'Europe/Kyiv'`
- Frontend відправка: `kyivToUTC(date, time)` → UTC ISO string
- SmartBooking: `s.startAt` вже є UTC ISO — передається напряму в wizard

### Wizard (BookingWizardPage) — важливі деталі
- **5 кроків:** Авто (0) → Послуги (1) → Майстер і час (2) → Підтвердження (3) → Готово (4)
- **Draft** зберігається в `sessionStorage` (ключ `booking_wizard_draft`) при кожній зміні стану
- **SmartBooking redirect:** URL params `?masterId=&scheduledAt=&serviceIds=&vehicleId=` → step=3
- **scheduledAt** = `prefilledScheduledAt || kyivToUTC(selectedDate, selectedSlot)`
- **Duration** = `durationEstimate?.totalEstimatedMinutes ?? baseDuration` (з AI або базовий)
- Confirmation step: якщо `prefilledScheduledAt` → `toKyivDisplay()`, інакше → парсинг дати вручну (UTC-safe)

### MasterProfile — відома проблема архітектури
```typescript
// MasterProfile entity НЕ має @OneToMany відносин
// НЕПРАВИЛЬНО: master.masterServices → crash
// ПРАВИЛЬНО через raw SQL:
const rows = await dataSource.query(
  `SELECT ms.masterId AS id FROM master_services ms
   WHERE s.id IN (${placeholders})
   GROUP BY ms.masterId HAVING COUNT(DISTINCT s.id) = ?`,
  [...serviceIds, serviceIds.length]
);
// АБО через MasterService repository:
await masterServicesRepo.find({ where: { master: { id: masterId } } })
```

### Sensitive fields stripping
Всі сервіси, що повертають User об'єкти, видаляють:
```typescript
delete u['passwordHash'];
delete u['refreshTokenHash'];
delete u['emailVerificationToken'];
delete u['passwordResetToken'];
```

---

## 8. ВИПРАВЛЕНІ БАГИ (Stage 1–3)

### Stage 1 — Dead code
- Видалено `apps/frontend/src/shared/i18n/ua.ts` (117 рядків, ніде не імпортувалось)
- Видалено всі `console.log/error` з frontend компонентів
- Видалено зайві onError handlers

### Stage 2 — Критичні баги Auth

**Bug 1: Login не повертав refreshToken**
- `AuthResponseDto` не мав поля `refreshToken`
- `login()` в `AuthService` не включав `refreshToken` у відповідь
- Наслідок: silent refresh ЗАВЖДИ падав з "No refresh token"
- Фікс: додано поле в DTO та в return statement

**Bug 2: /auth/refresh вимагав валідний access token**
- Ендпоінт мав `@UseGuards(JwtAuthGuard)` — з простроченим access token недосяжний
- Фікс: видалено guard, refresh token декодується всередині `AuthService.refresh()`

**Bug 3: Deadlock в axios interceptor**
- Якщо refresh token невалідний → POST /auth/refresh → 401 → знову interceptor → `isRefreshing=true` → вічне очікування
- Фікс: `if (original.url?.includes('/auth/refresh')) return Promise.reject(error)`

### Stage 3 — Timezone
- `app.module.ts`: додано `timezone: 'Z'` в TypeORM MySQL config (UTC для всіх дат)
- Перевірено: всі дати на frontend відображаються через `timeZone: 'Europe/Kiev'`
- Перевірено: `scheduledAt` відправляється тільки через `kyivToUTC()`

---

## 9. КОМАНДИ ДЛЯ АНАЛІЗУ

```powershell
# Перевірити TypeScript (0 помилок в обох)
cd apps/backend; npx tsc --noEmit
cd apps/frontend; npx tsc --noEmit

# Production build
cd apps/backend; npm run build
cd apps/frontend; npm run build

# Знайти всі console.log (мають бути 0 у src/)
Get-ChildItem -Recurse -Include "*.ts","*.tsx" apps/frontend/src,apps/backend/src | 
  Select-String "console\."

# Знайти незахищені дати (без timezone)
Get-ChildItem -Recurse -Include "*.ts","*.tsx" apps/frontend/src | 
  Select-String "toLocaleDateString|toLocaleString|toLocaleTimeString" | 
  Select-String -NotMatch "timeZone|uk-UA"

# Знайти scheduledAt без kyivToUTC (мусить бути тільки у wizard)
Get-ChildItem -Recurse -Include "*.ts","*.tsx" apps/frontend/src | 
  Select-String "scheduledAt"

# Перевірити що refreshToken не логується
Get-ChildItem -Recurse -Include "*.ts" apps/backend/src | 
  Select-String "refreshToken" | Select-String "log|console"

# Пошук entity файлів
Get-ChildItem apps/backend/src/database/entities -Filter "*.entity.ts"

# Перевірити статус git
git log --oneline -10
git status
```

---

## 10. ENV ЗМІННІ

### Backend (`.env`)
```env
# Database (Railway MySQL)
DB_HOST=...
DB_PORT=3306
DB_NAME=...
DB_USERNAME=...
DB_PASSWORD=...
DB_SYNCHRONIZE=true    # false в продакшні
DB_LOGGING=false

# JWT
JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Mail (SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=...
MAIL_PASS=...
MAIL_FROM=...

# App
FRONTEND_URL=http://localhost:5173

# Intelligence (опціональні)
INTEL_WEIGHT_RATING=0.35
INTEL_WEIGHT_AVAILABILITY=0.25
INTEL_WEIGHT_EXPERIENCE=0.20
INTEL_WEIGHT_LOAD=0.10
INTEL_WEIGHT_SPECIALIZATION=0.10
INTEL_LOOKAHEAD_DAYS=14
INTEL_TOP_SLOTS=5
```

### Frontend (`.env`)
```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

---

## 11. REACT QUERY — КЛЮЧОВІ ДЕТАЛІ

- `QueryClient` налаштований у `main.tsx`
- Cache invalidation після mutations: `qc.invalidateQueries({ queryKey: [...] })`
- `enabled: false` у `SmartBookingPage` → запит тільки при `refetch()`
- `enabled: step === 2` у `BookingWizardPage` для завантаження майстрів
- Всі мутації використовують `useMutation` з `onSuccess/onError`

---

## 12. ZUSTAND AUTH STORE

```typescript
interface AuthState {
  user: AuthUser | null;        // { id, email, role, firstName, lastName, emailVerified }
  accessToken: string | null;  // Зберігається в localStorage
  hasHydrated: boolean;        // Guard від race condition при першому рендері
  setAuth(user, accessToken): void;
  setAccessToken(token): void;
  updateUser(partial): void;
  logout(): void;              // Очищає user + accessToken
  isAuthenticated(): boolean;
}
// persist: тільки { accessToken, user } → localStorage ('auth-storage')
// refreshToken: НЕ персистується (тільки в пам'яті)
```

---

## 13. ПОТОЧНИЙ СТАН ПРОЕКТУ

- **Аудит Stage 1 (dead code):** ✅ завершено
- **Аудит Stage 2 (module bugs):** ✅ завершено (3 критичних баги в auth виправлено)
- **Аудит Stage 3 (timezone/sync):** ✅ завершено (додано `timezone: 'Z'`)
- **TypeScript:** 0 помилок (backend + frontend)
- **Production build:** успішний (backend + frontend)
- **Git:** репозиторій на GitHub (`mrevg11/Autoservice-Booking`), гілка `main`

### Відомі TODO / потенційні покращення
1. `refreshToken` не персистується — після перезавантаження потрібен повторний логін
   - Рішення: зберігати `refreshToken` в httpOnly cookie (потребує backend змін)
2. `NotificationsService.sendReminders24h()` — перевірка дублікатів нагадувань не ідеальна (дивиться на будь-який минулий notif, а не per-booking)
3. `BookingPhoto.dataUrl` — зберігається як `MEDIUMTEXT` в MySQL (до ~16MB) — краще S3/CloudStorage для продакшн
4. Admin панель: немає можливості редагувати `priceCoefficient` майстра через UI
5. `MasterProfile.rating` оновлюється вручну (немає auto-recalculate після відгуків)
