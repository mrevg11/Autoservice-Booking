# Навантажувальне тестування (k6)

Відповідає вимогам дипломної роботи (розділ 4.2): навантажувальне тестування системи.

## Вимоги за дипломом

> «Час відповіді сервера не повинен перевищувати 500 мс для 95-го перцентиля при навантаженні не менше 100 одночасних користувачів»

## Встановлення k6

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows (Chocolatey)
choco install k6

# Windows (Winget)
winget install k6 --source winget
```

## Структура тестів

| Файл | Сценарій | Макс. VU | Критерій |
|------|----------|-----------|----------|
| `01-auth-load.js` | Логін + захищений профіль | 100 VU | p(95) < 500ms |
| `02-booking-load.js` | Послуги, майстри, слоти | 100 VU | p(95) < 500ms |
| `03-analytics-load.js` | Аналітичні звіти (адмін) | 20 VU | p(95) < 1000ms |

## Запуск тестів

### Проти production (Render)

```bash
# Тест автентифікації
k6 run load-tests/01-auth-load.js

# Тест бронювання
k6 run load-tests/02-booking-load.js

# Тест аналітики
k6 run load-tests/03-analytics-load.js
```

### З кастомними параметрами

```bash
k6 run \
  -e BASE_URL=https://autoservice-booking.onrender.com/api/v1 \
  -e CLIENT_EMAIL=client@demo.com \
  -e CLIENT_PASSWORD=DemoPass123! \
  load-tests/01-auth-load.js
```

### Проти локального сервера

```bash
k6 run \
  -e BASE_URL=http://localhost:3000/api/v1 \
  load-tests/01-auth-load.js
```

### Запуск усіх тестів послідовно

```bash
for test in load-tests/0*.js; do
  echo "Running $test..."
  k6 run -e BASE_URL=http://localhost:3000/api/v1 "$test"
done
```

## Результати тестів

Результати зберігаються у `load-tests/results/` у форматі JSON після запуску.

Ключові метрики:
- `http_req_duration` — тривалість запиту (p(50), p(95), p(99))
- `http_req_failed` — відсоток помилкових відповідей
- `login_duration` — спеціалізована метрика логіну
- `vus` — кількість одночасних virtual users

## Інтерпретація результатів

Тест вважається **пройденим**, якщо:
- ✅ `p(95) http_req_duration < 500ms` — відповідь сервера укладається у вимогу диплому
- ✅ `http_req_failed rate < 1%` — менше 1% помилок
- ✅ 100 VU обслуговуються без деградації сервісу

## Приклад вивідних даних

```
✓ login status 200
✓ has accessToken
✓ response time < 500ms

checks.........................: 99.80% ✓ 4990 ✗ 10
data_received..................: 3.2 MB 18 kB/s
http_req_duration..............: avg=145ms  min=87ms   med=132ms  max=487ms  p(90)=198ms p(95)=234ms
http_req_failed................: 0.20%  ✓ 10 ✗ 4990
vus............................: 100    min=0  max=100
```
