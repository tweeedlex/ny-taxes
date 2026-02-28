# FastAPI Auth + Sessions (Redis) + Postgres + Tortoise

Готовий каркас FastAPI-проєкту з:
- авторизацією через `login + password`;
- серверними сесіями в `Redis` через `HttpOnly cookie` (без JWT);
- `Postgres` як БД;
- `MinIO` для збереження імпортованих CSV;
- `Tortoise ORM`;
- ролеподібними authorities для доступу:
  - `read_users`
  - `edit_users`
  - `read_orders`
  - `edit_orders`
- ендпойнтами:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/logout`
  - `GET /auth/me`
  - `POST /orders` (розрахунок податку за координатами)
  - `POST /orders/import` (CSV імпорт у фоні)
  - `GET /orders` (список, pagination, filters)
  - `GET /orders/stats` (агрегація за період з розбивкою по днях)
  - `GET /orders/import/tasks` (всі задачі імпорту)
  - `WS /orders/import/tasks/ws` (пуш задач кожні 0.3 секунди)
  - `GET /orders/stream/coordinates` (NDJSON стрім координат ордерів)
  - `GET /static/*` для віддачі статичних файлів з `src/static`
  - CRUD `users` з перевіркою authorities.

## Структура

```text
src/
  static/
    index.html
    ny_tax_rates.json
    shapefiles/
      Cities.shp
      Cities.dbf
      Cities.shx
      Counties.shp
      Counties.dbf
      Counties.shx
  api/
    routes/
      auth.py
      orders.py
      users.py
    deps.py
    router.py
  core/
    authorities.py
    bootstrap.py
    config.py
    database.py
    security.py
    sessions.py
  models/
    file_task.py
    order.py
    user.py
  schemas/
    auth.py
    order.py
    user.py
  services/
    reporting_code_service.py
    tax_rate_service.py
  main.py
```

## Запуск через Docker Compose

1. Створи `.env`:
```bash
cp .env.example .env
```

2. Підніми сервіси:
```bash
docker compose up --build
```

Якщо задаєш `REDIS_PASSWORD` у `.env`, Redis автоматично запускається з `requirepass`,
а API підключається з `AUTH`.

3. API буде доступне на:
- `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- Приклад статики: `http://localhost:8000/static/example.txt`
- Мінімальний frontend: `http://localhost:8000/static/index.html`

Для правильного `file_path` у import tasks (повний URL до MinIO) використовуй
`MINIO_PUBLIC_BASE_URL` (наприклад `http://localhost:9000`).

`docker-compose` також автоматично запускає `minio-init`, який:
- створює bucket `MINIO_BUCKET` (якщо ще не існує),
- виставляє для нього `anonymous download`.

## Authorities і доступ

- `GET /users`, `GET /users/{id}` потребують `read_users`.
- `POST /users`, `PATCH /users/{id}`, `DELETE /users/{id}` потребують `edit_users`.
- `POST /orders` потребує `edit_orders` і створює запис у таблиці `orders`.
  - У відповіді повертає `order_id`, `author_user_id`, `author_login`.
  - Для розрахунку ставок використовується `REP_CODE`:
    - спочатку пошук по `src/static/shapefiles/Cities.shp` (пріоритет міста);
    - якщо в місті коду немає або місто не знайдено, пошук по `Counties.shp`;
    - якщо точка поза межами NY -> `422`;
    - по знайденому `REP_CODE` ставка береться з `src/static/ny_tax_rates.json`.
- `POST /orders/import` потребує `edit_orders`:
  - приймає CSV (multipart/form-data);
  - завантажує файл у MinIO;
  - створює `file_tasks` запис;
  - запускає фонову обробку;
  - прогрес task оновлюється в throttled-режимі (приблизно кожні 1000 рядків і не частіше ніж раз на ~2 секунди).
  - якщо у файлі більше 100 рядків, дані діляться на 5 chunk-ів і рахуються паралельно.
  - валідні ордери пишуться в БД через `Order.bulk_create(...)` батчами по 500.
  - якщо сервер рестартиться, `in_progress` задачі автоматично продовжуються зі зміщенням `successful_rows + failed_rows + 1`.
- `GET /orders` потребує `read_orders`.
  - Pagination: `limit`, `offset`
  - Filters: `reporting_code`, `timestamp_from`, `timestamp_to`, `subtotal_min`, `subtotal_max`
  - Для кожного елемента повертається автор: `author_user_id`, `author_login`.
- `GET /orders/stream/coordinates` потребує `read_orders`.
  - Повертає NDJSON потік, по одному JSON-обʼєкту в рядку:
    - `{ "lat": number, "lon": number }`
  - Підтримує ті ж фільтри, що і `GET /orders` (без pagination/sort).
- `GET /orders/stats` потребує `read_orders`.
  - Query params: `from_date`, `to_date` у форматі `YYYY.MM.DD` (по полю `timestamp`)
  - Response: total за період + `daily` розбивка з тими ж метриками по днях
- `GET /orders/import/tasks` і `WS /orders/import/tasks/ws` потребують `read_orders`.

За замовчуванням доступний bootstrap-адмін (якщо задані змінні):
- `BOOTSTRAP_ADMIN_LOGIN`
- `BOOTSTRAP_ADMIN_PASSWORD`

В `.env.example` вони вже вказані для локальної розробки.

## Локальний запуск без Docker

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn src.main:app --reload
```
