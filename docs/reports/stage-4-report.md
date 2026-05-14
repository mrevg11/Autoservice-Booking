# Stage 4 Report — Intelligence Modules + TypeORM Migrations

**Дата:** 2026-05-12
**Автор:** Claude Code (Senior Full-Stack)
**Статус:** ✅ Завершено

---

## Мета етапу

Реалізувати модуль інтелектуального підбору (SlotSuggester, Recommendations, DurationPredictor),
розширити seed 100 реальними COMPLETED бронюваннями для навчальних даних,
налаштувати TypeORM migrations pipeline.

**Важливо:** алгоритми реалізовані як weighted scoring / евристика — без реального ML
(TensorFlow.js та подібних не підключається).

---

## Нові endpoints (3 шт.)

| Метод | Шлях                              | Ролі | Описання |
|-------|-----------------------------------|------|----------|
| GET   | /intelligence/suggest-slots       | JWT  | Топ-N слотів для послуги + оцінка тривалості |
| GET   | /intelligence/recommendations     | JWT  | Рекомендовані майстри для послуги |
| GET   | /intelligence/estimate-duration   | JWT  | Розрахунок тривалості: base × masterCoeff × vehicleAgeCoeff × seasonCoeff |

### Query params

**suggest-slots:** `serviceId`, `preferredDate` (ISO date), `vehicleYear?`
**recommendations:** `serviceId`
**estimate-duration:** `serviceId`, `masterId`, `vehicleYear?`

---

## Ключові технічні рішення

### Weighted scoring (5 факторів)

Кожен фактор нормалізовано до [0..1], фінальний score = зважена сума з клампуванням до [0..1]:

| Фактор         | Вага | Джерело                                         |
|----------------|------|-------------------------------------------------|
| rating         | 0.35 | Глобальний середній рейтинг майстра (відгуки)  |
| availability   | 0.25 | Близькість слоту до preferredDate              |
| experience     | 0.20 | experienceYears / 10, capped at 1.0            |
| load           | 0.10 | 1 − bookings / (maxPerDay × lookaheadDays)     |
| specialization | 0.10 | Keyword match між спеціалізацією і категорією  |

Ваги конфігурабельні через env (`SCORE_WEIGHT_*`).

### Fallback при нестачі даних

`DurationPredictorService.computeMasterCoeff()` повертає `1.0` якщо кількість
`COMPLETED` бронювань з `actualDurationMinutes` < `INTELLIGENCE_MIN_DATA_POINTS` (default: 5).
Коефіцієнт завжди клампується до `[0.5..2.0]`.

### N+1 заборонено

- `SlotSuggesterService`: всі 3 bulk-запити (bookings, dayOffs, schedules) виконуються через
  `Promise.all` до циклу по майстрах. Жодного запиту всередині циклу.
- `RecommendationsService`: 2 `Promise.all` до циклу. Агрегація — в пам'яті (Map).
- `DurationPredictorService`: єдиний aggregate SELECT з GROUP BY через raw query.

### Hybrid recommendation algorithm

1. **Content-based**: рейтинг (глобальний або профільний), досвід, спеціалізація
2. **Collaborative**: кількість попередніх COMPLETED бронювань клієнта з цим майстром
   (більше = вищий довіра-скор)
3. Fallback коли недостатньо даних → profile rating / experienceYears / 0.5 specialization

### DurationPredictor коефіцієнти

| Коефіцієнт      | Формула | Діапазон |
|-----------------|---------|----------|
| masterCoeff     | avg(actualDuration) / base | [0.5..2.0], fallback=1.0 |
| vehicleAgeCoeff | вік авто → таблиця порогів | [0.95..1.35] |
| seasonCoeff     | місяць → зима/літо/решта | {1.1, 0.95, 1.0} |

### TypeORM migrations

Створено `src/config/data-source.ts` — самостійний `DataSource` для CLI.
Оновлено `package.json` — команди використовують `typeorm-ts-node-commonjs -d src/config/data-source.ts`.

```bash
npm run migration:generate   # генерація з поточного стану entities
npm run migration:run        # застосування
npm run migration:revert     # відкат
npm run migration:show       # список застосованих
```

---

## Seed: +100 historical COMPLETED bookings

Функція `seedHistoricalBookings()` у `seed.ts`:
- 100 бронювань за останні 365 днів (крок 3 дні, будні)
- `actualDurationMinutes = base ± 20%` (чергується)
- Статус-машина: `PENDING → CONFIRMED → IN_PROGRESS → COMPLETED`
- Відгуки на кожне 2-ге бронювання (рейтинги 3–5)
- Забезпечує `minDataPoints=5` для `computeMasterCoeff`

---

## Нові файли

| Файл | Опис |
|------|------|
| `src/config/intelligence.config.ts` | Оновлено: додано `minDataPoints`, `lookaheadDays`, `topSlots` |
| `src/config/data-source.ts` | TypeORM DataSource для migrations CLI |
| `src/modules/intelligence/dto/suggest-slots-request.dto.ts` | Query DTO |
| `src/modules/intelligence/dto/suggest-slots-response.dto.ts` | Response DTO |
| `src/modules/intelligence/dto/recommendations-response.dto.ts` | Response DTO |
| `src/modules/intelligence/dto/duration-estimate-response.dto.ts` | Response DTO |
| `src/modules/intelligence/slot-suggester.service.ts` | Weighted slot scoring |
| `src/modules/intelligence/recommendations.service.ts` | Hybrid recommendations |
| `src/modules/intelligence/duration-predictor.service.ts` | Coefficient predictor |
| `src/modules/intelligence/intelligence.controller.ts` | 3 endpoints |
| `src/modules/intelligence/intelligence.module.ts` | Module wiring |

---

## Метрики

| Показник | Значення |
|----------|----------|
| Файлів створено/оновлено | 16 |
| Нових endpoints | 3 |
| Unit тестів | 21 (8 duration + 6 recommendations + 7 slots) |
| Historical bookings у seed | 100 |

---

## Тести

| Сервіс | Тестів | Покриття сценаріїв |
|--------|--------|--------------------|
| `DurationPredictorService` | 6 | NotFoundException, fallback, vehicleAgeCoeff (2), masterCoeff clamp (2) |
| `RecommendationsService` | 5 | not found, no masters, reasons count, score range, sort order, limit |
| `SlotSuggesterService` | 8 | NotFoundException, no masters, reasons, topSlots, overlap skip, score clamp, sort, day-off |

---

## Технічний борг (залишилось)

- [ ] Notifications module — push/email при зміні статусу
- [ ] Frontend — тільки scaffold, без реальних сторінок
- [ ] Soft delete для Services та Users
- [ ] Admin endpoint для управління сервісами майстра
- [ ] Refresh token rotation
- [ ] Перша TypeORM migration після `DB_SYNC=true` boot
