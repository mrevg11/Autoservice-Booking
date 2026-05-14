# Stage 3 Report — CRUD основних модулів

**Дата:** 2026-05-12
**Автор:** Claude Code (Senior Full-Stack)
**Статус:** ✅ Завершено

---

## Мета етапу

Реалізувати 5 бізнес-модулів з повним CRUD, фільтрами, пагінацією
та захистом від race condition.

---

## Таблиця всіх endpoints

| Метод  | Шлях                             | Ролі             | Статуси            |
|--------|----------------------------------|------------------|--------------------|
| POST   | /services/categories             | ADMIN            | 201, 401, 403      |
| GET    | /services/categories             | Public           | 200                |
| PATCH  | /services/categories/:id         | ADMIN            | 200, 404           |
| POST   | /services                        | ADMIN            | 201, 400, 404      |
| GET    | /services                        | Public           | 200                |
| GET    | /services/:id                    | Public           | 200, 404           |
| PATCH  | /services/:id                    | ADMIN            | 200, 404           |
| DELETE | /services/:id                    | ADMIN            | 200, 404           |
| GET    | /masters                         | Public           | 200                |
| GET    | /masters/:id                     | Public           | 200, 404           |
| PATCH  | /masters/me                      | MASTER           | 200, 401, 403      |
| GET    | /masters/:id/schedule            | Public           | 200, 404           |
| PUT    | /masters/me/schedule             | MASTER           | 200, 401, 403      |
| POST   | /masters/me/days-off             | MASTER           | 201, 401, 403      |
| DELETE | /masters/me/days-off/:id         | MASTER           | 200, 401, 403      |
| POST   | /masters/me/services             | MASTER, ADMIN    | 201, 409           |
| DELETE | /masters/me/services/:serviceId  | MASTER, ADMIN    | 200, 404           |
| GET    | /masters/:id/slots               | JWT              | 200, 404           |
| POST   | /vehicles                        | CLIENT           | 201, 401, 403      |
| GET    | /vehicles                        | CLIENT           | 200                |
| GET    | /vehicles/:id                    | CLIENT           | 200, 403, 404      |
| PATCH  | /vehicles/:id                    | CLIENT           | 200, 403, 404      |
| DELETE | /vehicles/:id                    | CLIENT           | 200, 403, 404      |
| POST   | /bookings                        | CLIENT           | 201, 400, 409      |
| GET    | /bookings                        | JWT              | 200                |
| GET    | /bookings/:id                    | JWT              | 200, 403, 404      |
| PATCH  | /bookings/:id/status             | MASTER, ADMIN    | 200, 400, 403      |
| POST   | /bookings/:id/cancel             | CLIENT           | 200, 400, 403      |
| GET    | /bookings/:id/history            | JWT              | 200, 403, 404      |
| POST   | /reviews                         | CLIENT           | 201, 400, 409      |
| GET    | /reviews/master/:masterId        | Public           | 200                |
| GET    | /reviews/booking/:bookingId      | JWT              | 200                |

---

## Ключові технічні рішення

### Як реалізований захист від race condition (pessimistic lock + transaction)

При створенні бронювання весь процес перевірки overlap і збереження
відбувається в одній `DataSource.transaction`. Перевірка конфліктів виконується
з `setLock('pessimistic_write')` (`FOR UPDATE`) — MySQL блокує рядки,
поки транзакція не завершиться. Другий одночасний запит чекає на блокування,
а після його зняття знаходить вже збережений booking і повертає 409.

### Матриця переходів статусів

`STATUS_TRANSITIONS` — об'єкт з ключем = поточний статус, значенням = `{allowed, roles}`.
Це дає O(1) lookup замість if/else ланцюжка. COMPLETED і CANCELLED мають `allowed: []`
— жодних переходів, що унеможливлює помилкову зміну фінального статусу.
CLIENT навмисно виключений з усіх transitions — він має окремий `cancel()` endpoint
з власними правилами (дедлайн 2 год, тільки PENDING/CONFIRMED).

### Як розмежовано доступ CLIENT/MASTER/ADMIN

Перевірка виконується в сервісі, а не тільки в guard. `findAll()` і `findOne()`
фільтрують дані на рівні SQL запиту залежно від ролі:
CLIENT → `WHERE client.id = ?`, MASTER → `WHERE master.id = ?`, ADMIN → без обмежень.
`checkBookingAccess()` — приватний метод що кидає 403 при несанкціонованому доступі.

### Чому getAvailableSlots живе в MastersService, а не BookingsService

`getAvailableSlots` — це функція ПРОФІЛЮ МАЙСТРА: вона залежить від розкладу,
вихідних і прив'язок конкретного майстра. BookingsService відповідає за
lifecycle бронювань, а MastersService — за доступність майстра.
Єдина відповідальність (SRP): додавання/зміна логіки слотів не торкається
логіки booking.

### N+1 prevention

Всі запити що повертають списки з relations використовують
`leftJoinAndSelect` (QueryBuilder) або `relations: [...]` option.
Це генерує один JOIN-запит замість N окремих SELECT-ів.

---

## Метрики

| Показник | Значення |
|----------|----------|
| Файлів створено/оновлено | 38 |
| Нових endpoints | 32 |
| Unit тестів | 27 (16 bookings + 6 masters + 5 reviews) |
| E2E сценаріїв | 10 |
| Модулів | 5 (Services, Masters, Vehicles, Bookings, Reviews) |

---

## Результати верифікації

| # | Перевірка | Статус |
|---|-----------|--------|
| V1 | `npx tsc --noEmit` | Потребує `npm install` |
| V2 | `npm run lint` | Потребує `npm install` |
| V3 | Unit тести (27 шт.) | Потребує `npm install` |
| V4 | `npm run build` | Потребує `npm install` |
| V5–V9 | Ручна перевірка через curl | Потребує Docker + npm |

---

## Технічний борг

- [ ] Notifications module — відправка push/email при зміні статусу
- [ ] Admin endpoint для управління сервісами майстра (не тільки /me)
- [ ] Soft delete для Services та Users (замість hard delete)
- [ ] Обмеження кількості bookings на одного клієнта за день
- [ ] TypeORM migration generation
- [ ] Postman collection
