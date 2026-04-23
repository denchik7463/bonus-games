# Запуск и окружение

## Стек

- `game-backend` (Java 17, Spring Boot)
- `random-service` (Java 17, Spring Boot)
- `front` (Next.js)
- `postgres` (PostgreSQL)

## Локальный запуск

```bash
docker compose up --build
```

## Порты

- Front: `3000`
- Game Backend: `8081`
- Random Service: `9095`
- PostgreSQL: `5432`

## Переменные окружения

`game-backend`:

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `RANDOM_SERVICE_URL`
- `app.auth.token-ttl-hours`

`random-service`:

- `APP_HASH_SECRET`

## Миграции БД

- Flyway запускается автоматически при старте `game-backend`.
- Версии миграций: `game-backend/src/main/resources/db/migration`.
- Нельзя редактировать уже примененные миграции; только добавлять новые.
