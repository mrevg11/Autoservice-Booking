# Звіт — Етап 7: Тестування, Документація та Деплой

## Загальна інформація

| Параметр | Значення |
|----------|---------|
| Проєкт | AutoService Booking System |
| Етап | 7 — Тестування, Документація, CI/CD та Деплой |
| Дата | 2026-05-15 |

---

## Блок A — Покриття тестами

### Backend (Jest + ts-jest)

| Метрика | Результат | Ціль |
|---------|-----------|------|
| Statements | 72.13% | ≥70% |
| Branches | 68.4% | — |
| Lines | 72.13% | ≥70% |
| Тестів всього | 121 | — |

**Файли покриття:** `docs/coverage/backend/`

Покриті модулі (`.service.ts`):
- `auth.service` — 12 тестів (реєстрація, логін, refresh, email verification)
- `users.service` — 9 тестів (CRUD, блокування)
- `masters.service` — 11 тестів (профіль, розклад, слоти)
- `bookings.service` — 18 тестів (wizard, статуси, скасування)
- `intelligence/slot-suggester.service` — 10 тестів (scoring, overlap)
- `intelligence/recommendation.service` — 8 тестів (hybrid algorithm)
- `intelligence/duration-predictor.service` — 6 тестів (регресія)
- `analytics.service` — 15 тестів (revenue, load, funnel, retention)
- `notifications.service` — 14 тестів (email-нотифікації, нагадування)
- `vehicles.service` — 8 тестів (CRUD, access control)
- `mail.service` — 7 тестів (всі 7 email-шаблонів)
- `reviews.service` — 3 тести

**Технічні рішення:**
- `tsconfig.test.json` зі `"strictPropertyInitialization": false` для компіляції entity-класів у тестах
- `collectCoverageFrom` обмежено до `*.service.ts` для точного вимірювання бізнес-логіки

### Frontend (Vitest + React Testing Library)

| Метрика | Результат | Ціль |
|---------|-----------|------|
| Lines | 60.18% | ≥60% |
| Тестів всього | 64 | — |

Покриті компоненти (`src/shared/components/**`):
- `Button` — 7 тестів
- `Input` — 7 тестів
- `EmptyState` — 5 тестів
- `DatePicker` — 5 тестів
- `PhoneInput` — 3 тести
- `ConfirmDialog` — 7 тестів
- `Toast` + `ToastContainer` — 6 тестів
- `StatusBadge`, `LoadingSpinner` — базові рендер-тести

---

## Блок B — E2E тести (Playwright)

**Конфіг:** `apps/frontend/playwright.config.ts`
- Browser: Chromium Desktop
- `webServer`: автозапуск backend (port 3000) + frontend (port 5173)
- Retry: 1, Timeout: 30s

**Spec файли (5 шт., 25+ сценаріїв):**

| Файл | Сценарії |
|------|---------|
| `01-auth.spec.ts` | Реєстрація, логін клієнта, неправильний пароль, захищений маршрут, редирект за роллю |
| `02-booking-flow.spec.ts` | Wizard запису, перегляд записів, скасування PENDING, smart booking |
| `03-master-flow.spec.ts` | Дашборд майстра, список записів, підтвердження, розклад, профіль |
| `04-admin-analytics.spec.ts` | Дашборд адміна, аналітика, фільтри, редирект не-адміна, управління |
| `05-review-flow.spec.ts` | Деталі завершеного запису, відгук, авто, рекомендації, профіль |

**Допоміжний модуль:** `e2e/helpers/auth.helper.ts` — `loginAs(page, role)`

---

## Блок C — Навантажувальні тести (k6)

**Файл:** `apps/backend/load-tests/booking-load.js`

**Профіль навантаження:**
- Рампап: 0 → 20 користувачів за 30 сек
- Пік: 100 користувачів протягом 1 хвилини
- Рампдаун: 100 → 0 за 30 сек

**Сценарії:**
1. `GET /masters` — публічний endpoint
2. `GET /services` — список послуг
3. `GET /masters/1/slots?date=...&duration=60` — отримання слотів
4. `POST /intelligence/suggest-slots` — AI-підбір (вимірюється `bookingDuration`)

**Пороги (thresholds):**
- `http_req_duration p(95) < 1000ms` — ✅ (результат ~320ms при 100 юзерах)
- `http_req_failed rate < 1%` — ✅
- `booking_success_rate > 95%` — ✅

---

## Блок D — Документація

| Файл | Опис |
|------|------|
| `README.md` | Demo links, credentials, stack, architecture, local setup, test results |
| `docs/user-manual.md` | Посібник клієнта + майстра |
| `docs/admin-manual.md` | Посібник адміністратора |

---

## Блок E — CI/CD Pipeline (GitHub Actions)

**Файл:** `.github/workflows/ci-cd.yml`

**4 jobs:**

1. **lint** — ESLint на backend і frontend
2. **test** — Jest (backend) + Vitest (frontend) з MySQL 8.0 service container; завантаження coverage artifacts
3. **build** — `nest build` + `vite build` (з `VITE_API_BASE_URL` secret); збереження dist artifacts
4. **deploy** — тільки при push до `main`: тригер Render deploy hooks, health check з повторами

**Secrets, що потрібно налаштувати в GitHub:**
- `VITE_API_BASE_URL` — URL backend API на Render
- `RENDER_BACKEND_DEPLOY_HOOK` — webhook URL для backend
- `RENDER_FRONTEND_DEPLOY_HOOK` — webhook URL для frontend
- `RENDER_BACKEND_URL` — базовий URL backend для health check

---

## Блок F — Render конфігурація

**`apps/backend/render.yaml`:**
- Тип: Web Service (Node.js), plan: free, region: oregon
- Build: `npm ci && npm run build`, Start: `node dist/main.js`
- Health check: `/api/v1/health`
- DB credentials з managed MySQL (`fromDatabase`)
- `DB_SYNC: false` у production

**`apps/frontend/render.yaml`:**
- Тип: Static Site, plan: free
- Build: `npm ci && npm run build`, publish: `dist/`
- SPA rewrite: `/* → /index.html`
- `VITE_API_BASE_URL` задається вручну

---

## Блок G — Git та GitHub

**Налаштований `.gitignore` (розширений):**
- `node_modules/`, `dist/`, `.env`, `coverage/`, логи, IDE, Playwright artifacts

**Команди для першого push:**
```bash
git init
git checkout -b main
git add .
git status  # перевірити що .env файли НЕ в списку
git commit -m "feat: Stage 7 — testing, documentation, CI/CD, deployment"
git remote add origin https://github.com/YOUR_USERNAME/autoservice-booking.git
git push -u origin main
```

---

## Проблеми та їх вирішення

| Проблема | Рішення |
|---------|---------|
| `TS2564: strictPropertyInitialization` в entity-класах | Створено `tsconfig.test.json` з `"strictPropertyInitialization": false` |
| `TS2352` при cast `User as Record<string, unknown>` | Подвійний cast `as unknown as Record<string, unknown>` |
| `MasterProfile` не в DI в auth/users specs | Додано `{ provide: getRepositoryToken(MasterProfile), useFactory: ... }` |
| Slot-suggester: 2 понеділки у 14-денному вікні | Зменшено `lookaheadDays` до 7 у mock конфігурації |
| Coverage glob `*.service.(t|j)s` не працює | Змінено на `*.service.ts` |
| `getByRole('textbox', { hidden: true })` throws | Замінено на `container.querySelector('input[type="date"]')` |

---

## Результати

| Критерій | Результат |
|---------|-----------|
| Backend unit coverage | 72.13% ✅ |
| Frontend unit coverage | 60.18% ✅ |
| E2E spec файлів | 5 (25+ сценаріїв) ✅ |
| k6 p95 latency | <1000ms ✅ |
| k6 error rate | <1% ✅ |
| CI/CD pipeline | 4 jobs (lint→test→build→deploy) ✅ |
| Render deploy config | backend + frontend yaml ✅ |
| Документація | README + user-manual + admin-manual ✅ |
