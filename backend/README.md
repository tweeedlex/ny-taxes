# FastAPI Auth + Sessions (Redis) + Postgres + Tortoise

Готовий каркас FastAPI-проєкту з:
- авторизацією через `login + password`;
- серверними сесіями в `Redis` через `HttpOnly cookie` (без JWT);
- `Postgres` як БД;
- `Tortoise ORM`;
- ролеподібними authorities для доступу:
  - `read_users`
  - `edit_users`
- ендпойнтами:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/logout`
  - `GET /auth/me`
  - `GET /static/*` для віддачі статичних файлів з `src/static`
  - CRUD `users` з перевіркою authorities.

## Структура

```text
src/
  static/
    .gitkeep
  api/
    routes/
      auth.py
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
    user.py
  schemas/
    auth.py
    user.py
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

3. API буде доступне на:
- `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- Приклад статики: `http://localhost:8000/static/example.txt`

## Authorities і доступ

- `GET /users`, `GET /users/{id}` потребують `read_users`.
- `POST /users`, `PATCH /users/{id}`, `DELETE /users/{id}` потребують `edit_users`.

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
