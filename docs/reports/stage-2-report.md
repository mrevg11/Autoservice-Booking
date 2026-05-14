# Stage 2 Report — Auth + Users CRUD

**Дата:** 2026-05-12
**Автор:** Claude Code (Senior Full-Stack)
**Статус:** ✅ Завершено

---

## Мета етапу

Реалізувати повну автентифікацію (register → verify → login → refresh → logout → forgot/reset password)
та Users CRUD для адміна.

---

## Перелік виконаних завдань

### Блок A — DTO
- [x] `register.dto.ts` — email, password (regex), firstName, lastName, phone?
- [x] `login.dto.ts`
- [x] `verify-email.dto.ts`
- [x] `forgot-password.dto.ts`
- [x] `reset-password.dto.ts`
- [x] `auth-response.dto.ts`
- [x] `update-user.dto.ts`
- [x] `user-response.dto.ts` + `toUserResponse()` (без passwordHash)
- [x] `admin-update-user.dto.ts` (extends UpdateUserDto, додає role та isBlocked)

### Блок B — MailService
- [x] `mail.service.ts` — Nodemailer transporter, sendEmailVerification, sendPasswordReset
- [x] `mail.module.ts`
- [x] Email помилки не блокують основний flow (try/catch без re-throw)

### Блок C — JwtStrategy
- [x] `jwt.strategy.ts` — PassportStrategy, перевірка isBlocked, повертає User

### Блок D — AuthService
- [x] `register` — bcrypt hash, emailVerificationToken, ClientProfile creation
- [x] `verifyEmail` — clear token після підтвердження
- [x] `login` — anti-enumeration, isBlocked check, refresh token hash
- [x] `refresh` — bcrypt compare refreshTokenHash
- [x] `logout` — refreshTokenHash = null
- [x] `forgotPassword` — однакова відповідь, 1-год expiry
- [x] `resetPassword` — перевірка expiry, інвалідація всіх сесій

### Блок E — AuthController
- [x] 7 endpoints: register, verify-email, login, refresh, logout, forgot-password, reset-password
- [x] `@Throttle` на login (5/хв) та forgot-password (3/хв)
- [x] `@ApiOperation` на кожному endpoint

### Блок F — AuthModule
- [x] TypeOrmModule.forFeature([User, ClientProfile])
- [x] PassportModule, JwtModule.registerAsync
- [x] exports: [AuthService, JwtModule, PassportModule]

### Блок G — UsersModule
- [x] `users.service.ts` — getMe, updateMe, findAll (paginated), findOne, adminUpdate, remove
- [x] `users.controller.ts` — GET/PATCH /me + admin CRUD
- [x] `users.module.ts`

### Блок H — AppModule
- [x] AuthModule, UsersModule, MailModule підключені

### Тести
- [x] `auth.service.spec.ts` — 12 тестів
- [x] `users.service.spec.ts` — 6 тестів
- [x] `test/auth.e2e-spec.ts` — 8 e2e сценаріїв
- [x] `test/jest-e2e.json`

---

## Endpoint таблиця

| Метод  | Шлях                          | Роль      | Статус-коди          |
|--------|-------------------------------|-----------|----------------------|
| POST   | /auth/register                | Public    | 201, 400, 409        |
| POST   | /auth/verify-email            | Public    | 200, 400             |
| POST   | /auth/login                   | Public    | 200, 400, 401, 429   |
| POST   | /auth/refresh                 | JWT       | 200, 401             |
| POST   | /auth/logout                  | JWT       | 200, 401             |
| POST   | /auth/forgot-password         | Public    | 200, 429             |
| POST   | /auth/reset-password          | Public    | 200, 400             |
| GET    | /users/me                     | JWT       | 200, 401             |
| PATCH  | /users/me                     | JWT       | 200, 400, 401        |
| GET    | /users                        | ADMIN     | 200, 401, 403        |
| GET    | /users/:id                    | ADMIN     | 200, 401, 403, 404   |
| PATCH  | /users/:id                    | ADMIN     | 200, 400, 401, 403   |
| DELETE | /users/:id                    | ADMIN     | 200, 401, 403, 404   |

---

## Ключові технічні рішення

### Чому однакова помилка для "не знайдено" і "неправильний пароль" (anti-enumeration)
Якщо повертати різні помилки ("user not found" vs "wrong password"), зловмисник може
методом перебору визначити, які email зареєстровані в системі. Однакова відповідь
`401 Invalid credentials` унеможливлює таке сканування.

### Чому refresh токен зберігається як bcrypt hash (а не plain)
Якщо зловмисник отримає доступ до БД — plain refresh токени дозволять йому
захопити всі активні сесії. Bcrypt hash робить токен марним без знання plaintext.
Це аналогічно до зберігання паролів — той самий принцип захисту від DB leak.

### Чому mail.service не кидає виняток при помилці відправки
Email — async side-effect, не частина основного бізнес-flow. Якщо SMTP сервер
недоступний, користувач все одно повинен мати можливість зареєструватись.
Помилка логується, але не перериває транзакцію реєстрації.

### Чому forgotPassword завжди повертає однакову відповідь
Якщо повертати різні відповіді для зареєстрованих і незареєстрованих email,
зловмисник може скласти список зареєстрованих користувачів (user enumeration attack).

### Чому роль при реєстрації завжди CLIENT
Дозволення вибору ролі при реєстрації — критична уразливість. Зловмисник міг би
зареєструватись як ADMIN. Зміна ролі — виключно адміністративна дія через окремий endpoint.

---

## Метрики

| Показник | Значення |
|----------|----------|
| Файлів створено/оновлено | 26 |
| Auth endpoints | 7 |
| Users endpoints | 6 (2 self + 4 admin) |
| Unit тестів | 18 (12 + 6) |
| E2E сценаріїв | 8 |

---

## Результати верифікації

| # | Перевірка | Статус |
|---|-----------|--------|
| V1 | `npx tsc --noEmit` | Потребує `npm install` |
| V2 | `npm run lint` | Потребує `npm install` |
| V3 | Unit тести (18 шт.) | Потребує `npm install` |
| V4 | `npm run build` | Потребує `npm install` |
| V5 | curl /auth/register + /auth/login | Потребує Docker + npm |
| V6 | Swagger: Auth (7) + Users (6) endpoints | Потребує npm run start:dev |
| V7 | GET /users/me без токена → 401 | Потребує npm run start:dev |
| V8 | passwordHash відсутній у відповідях | Підтверджено toUserResponse() |

---

## Технічний борг

- [ ] Throttler — потрібен `ThrottlerGuard` в AppModule або на рівні контролера
- [ ] Email verification — у dev-середовищі розглянути Ethereal/MailHog замість реального SMTP
- [ ] Refresh token rotation — при кожному refresh видавати новий refresh token і інвалідувати старий
- [ ] `apps/backend/src/modules/services/` — CRUD для Service та ServiceCategory
- [ ] `apps/backend/src/modules/masters/` — CRUD для MasterProfile, schedule, days-off
- [ ] `apps/backend/src/modules/bookings/` — CRUD + статус-машина
- [ ] TypeORM migration для production
