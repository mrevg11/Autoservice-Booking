# Stage 5 Report — React Frontend (CLIENT + MASTER)

**Дата:** 2026-05-12
**Автор:** Claude Code (Senior Full-Stack)
**Статус:** ✅ Завершено

---

## Мета етапу

Реалізувати повноцінний клієнтський React-інтерфейс для ролей CLIENT та MASTER.
Після цього етапу проект готовий до першого запуску у браузері.

---

## Перелік сторінок

| Шлях | Роль | Компонент | Статус |
|------|------|-----------|--------|
| `/` | Public | `LandingPage` | ✅ |
| `/services` | Public | `ServicesPage` | ✅ |
| `/login` | Public | `LoginPage` | ✅ |
| `/register` | Public | `RegisterPage` | ✅ |
| `/forgot-password` | Public | `ForgotPasswordPage` | ✅ |
| `/reset-password` | Public | `ResetPasswordPage` | ✅ |
| `/verify-email` | Public | `VerifyEmailPage` | ✅ |
| `/client/dashboard` | CLIENT | `ClientDashboard` | ✅ |
| `/client/bookings` | CLIENT | `ClientBookingsPage` | ✅ |
| `/client/bookings/:id` | CLIENT | `BookingDetailPage` | ✅ |
| `/client/bookings/new` | CLIENT | `BookingWizardPage` (5 кроків) | ✅ |
| `/client/bookings/smart` | CLIENT | `SmartBookingPage` | ✅ |
| `/client/vehicles` | CLIENT | `VehiclesPage` | ✅ |
| `/client/recommendations` | CLIENT | `RecommendationsPage` | ✅ |
| `/client/profile` | CLIENT | `ClientProfilePage` | ✅ |
| `/master/dashboard` | MASTER | `MasterDashboard` | ✅ |
| `/master/bookings` | MASTER | `MasterBookingsPage` | ✅ |
| `/master/bookings/:id` | MASTER | `MasterBookingDetailPage` | ✅ |
| `/master/schedule` | MASTER | `MasterSchedulePage` | ✅ |
| `/master/profile` | MASTER | `MasterProfilePage` | ✅ |
| `/unauthorized` | Any | `Unauthorized` | ✅ |
| `*` | Any | `NotFound` | ✅ |

---

## Ключові технічні рішення

### Zustand + persist (а не Redux або Context API)

Zustand обраний через мінімальний boilerplate та зручний API `getState()`.
`persist` зберігає лише `refreshToken` та `user` в localStorage — `accessToken` залишається тільки в пам'яті (in-memory Zustand store без persist для цього поля).
Redux надлишковий для масштабу проекту. Context API не має вбудованого persist і важчий для оновлення окремих полів.

### Auto-refresh через interceptor queue

`axios.ts` реалізує класичний "queue pattern":
- При 401 ставимо `isRefreshing = true`, кладемо запити у `failedQueue`
- Один рефреш-запит → при успіху всі з черги повторюються; при помилці — відхиляються
- Запобігає race condition при паралельних запитах після закінчення accessToken

### Feature-based структура (а не layers)

Замість `controllers/`, `services/`, `views/` — папки за бізнес-доменом:
`features/bookings/`, `features/vehicles/`, `features/master/`.
Кожна фіча містить `pages/`, `hooks/`, `components/`.
Легше видалити або модифікувати одну фічу без cross-cutting змін.

### BookingWizard (local state vs URL state)

5-кроковий wizard зберігає стан локально (`useState`) — не в URL.
URL-state (через `useSearchParams`) доречний тоді коли:
a) потрібна навігація назад/вперед з браузера
b) стан треба передати через redirect (SmartBooking → Wizard)
SmartBooking передає попередньо заповнені дані через `?masterId=&date=&slot=` query params, які Wizard може прочитати.

### Lazy loading

Всі сторінки кабінетів (client/* та master/*) завантажуються через `React.lazy()` + `Suspense`.
Auth-сторінки та публічні — не lazy (щоб не блокувати перший рендер).

### TanStack React Query

- `staleTime: 5 хв` — зменшує кількість зайвих запитів
- `retry: 1` — один повтор при помилці мережі
- Query keys: `['bookings', params]`, `['booking', id]`, `['vehicles']` etc.
- `invalidateQueries` після мутацій для оновлення кешу

---

## UI Компоненти

| Компонент | Файл |
|-----------|------|
| Button | `ui/Button.tsx` |
| Input | `ui/Input.tsx` |
| Badge (booking status) | `ui/Badge.tsx` |
| StarRating | `ui/StarRating.tsx` |
| DatePicker | `ui/DatePicker.tsx` |
| TimeSlotPicker | `ui/TimeSlotPicker.tsx` |
| Spinner | `ui/Spinner.tsx` |
| EmptyState | `ui/EmptyState.tsx` |
| Pagination | `ui/Pagination.tsx` |
| Toast (global) | `Toast.tsx` + `store/toast.store.ts` |
| ConfirmDialog | `ConfirmDialog.tsx` |
| Layout (Navbar + Sidebar) | `Layout.tsx` |
| ProtectedRoute | `ProtectedRoute.tsx` |

---

## Метрики

| Показник | Значення |
|----------|----------|
| Сторінок | 22 |
| UI компонентів | 13 |
| Feature hooks | 6 файлів (bookings, vehicles, services, masters, reviews, intelligence) |
| Файлів створено/оновлено | ~55 |
| Unit тестів | 27 (Button×7, Badge×5, StarRating×5, TimeSlotPicker×4, Pagination×6) |
| ProtectedRoute тести | 4 |

---

## Дизайн-система

- **Font:** Plus Jakarta Sans (Google Fonts)
- **Brand color:** `#1a2744` (темно-синій)
- **Accent color:** `#f97316` (помаранчевий)
- **CSS Variables:** `--color-brand`, `--color-accent`, `--color-surface`, etc.
- **Responsive:** 320px / 768px / 1280px breakpoints
- **Sidebar:** тільки на desktop (≥1024px), hamburger menu на mobile

---

## Технічний борг (залишилось)

- Admin panel (CRUD для услуг, управління користувачами, аналітика)
- Notifications module (email при зміні статусу — backend вже не реалізований)
- Soft delete для Services та Users
- Refresh token rotation
- Screenshot tests / E2E (Playwright або Cypress)
- PWA / service worker для offline-підтримки
