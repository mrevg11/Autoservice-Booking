# Error Log

> Template: **ERR-NNN** | Date | Блок | Опис | Рішення

| ID | Дата | Блок | Опис | Рішення |
|----|------|------|------|---------|
| ERR-001 | 2026-05-12 | Stage 2 / Scaffold | Старий jwt.strategy.ts зі скаффолда не мав `role` у JwtPayload та не перевіряв `isBlocked` | Перезаписано з повною реалізацією |
| ERR-002 | 2026-05-12 | Stage 2 / Scaffold | auth.controller.ts зі скаффолда мав inline LoginDto замість окремого DTO файлу | Перезаписано з імпортом з dto/ |
| ERR-003 | 2026-05-12 | Stage 2 / Scaffold | supertest відсутній у devDependencies | Додано supertest + @types/supertest в package.json |
| ERR-004 | 2026-05-12 | Stage 3 / Entity | BookingStatusHistory.oldStatus не nullable — не дозволяло зберегти початковий запис null→PENDING | Оновлено entity: `nullable: true` |
| ERR-005 | 2026-05-12 | Stage 3 / Services | services.controller.ts імпортував `ParseBoolPipe` і `Optional` без використання | Видалено з імпортів при написанні |
| ERR-006 | 2026-05-12 | Stage 4 / Config | intelligence.config.ts існував як stub без `minDataPoints`, `lookaheadDays`, `topSlots` | Доповнено трьома полями; .env отримав відповідні змінні |
| ERR-007 | 2026-05-12 | Stage 4 / Migration | Старі migration scripts використовували `ts-node` + `typeorm/cli.js` без `-d` DataSource — несумісно з TypeORM 0.3 | Замінено на `typeorm-ts-node-commonjs -d src/config/data-source.ts` |
| ERR-008 | 2026-05-12 | Stage 4 / Seed | seedHistoricalBookings спочатку мав `ReturnType<DataSource['getRepository']>` для параметрів — не компілюється в strict TS | Замінено на явні `Repository<Entity>` типи з імпортом |
| ERR-009 | 2026-05-12 | Stage 5 / Auth Store | Початковий scaffold auth.store.ts не мав `refreshToken` і `setAccessToken` — потрібні для auto-refresh interceptor | Перезаписано з `refreshToken`, `setAccessToken`, partial persist (тільки refreshToken + user) |
| ERR-010 | 2026-05-12 | Stage 5 / ConfirmDialog | MasterBookingsPage передавав `isLoading` prop у ConfirmDialog якого не було в інтерфейсі | Видалено зайвий prop |
| ERR-011 | 2026-05-12 | Stage 5 / MasterProfile | `mastersApi.getOne(0)` як спосіб отримати свій профіль майстра — некоректно, endpoint `/masters/:id` потребує валідний ID | Замінено на пошук серед `mastersApi.getAll()` з фільтром `m.user.id === user.id` |
| ERR-012 | 2026-05-12 | Stage 5 / Testing | `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` були відсутні в package.json | Додано в devDependencies; vite.config.ts оновлено з `test.environment: jsdom` |
