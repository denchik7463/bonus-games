# API Reference

Базовый URL: `http://localhost:8081`

## Health

- `GET /health`

## Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

## Профиль и кошелек

- `GET /api/profile/me`
- `GET /api/wallet/balance`
- `POST /api/wallet/deposit`
- `POST /api/wallet/reserve`
- `POST /api/wallet/reservations/{reservationId}/release`
- `POST /api/wallet/reservations/{reservationId}/commit`

## Комнаты

- `POST /api/room/find` — найти/создать подходящую комнату (без join)
- `POST /api/rooms/create` — создать комнату по `templateId` (админ)
- `POST /api/rooms/{roomId}/join` — войти в комнату и занять места
- `POST /api/rooms/code/{shortId}/join` — войти по короткому id
- `GET /api/rooms`
- `GET /api/rooms/{id}`
- `GET /api/rooms/{roomId}/state`
- `GET /api/rooms/{roomId}/events`
- `GET /api/rooms/waiting`
- `POST /api/rooms/{roomId}/boost/activate`
- `POST /api/rooms/{roomId}/finish`
- `POST /api/rooms/{roomId}/cancel`

## Шаблоны комнат

- `GET /api/room-templates` (только active)
- `GET /api/room-templates/{id}`
- `POST /api/room-templates`
- `PUT /api/room-templates/{id}`
- `DELETE /api/room-templates/{id}` (soft delete: deactivation)
- `GET /api/room-templates/entry-costs`

## Журнал и аналитика

- `GET /api/game/journal`
- `GET /api/game/journal/{id}`
- `GET /api/game/journal/{id}/events`
- `GET /api/game/journal/events/by-room`
- `GET /api/game/journal/me`
- `GET /api/game/journal/me/{id}`
- `GET /api/game/journal/me/{id}/events`
- `GET /api/game/journal/me/win-streak`
- `GET /api/dashboard`

## Конфигуратор/тест

- `POST /api/config/test`
- `GET /api/config/report`

## Сервис рандома (внешний)

Базовый URL: `http://localhost:9095`

- `POST /api/random/generate?min=1&max=100&count=1`
- `GET /api/random/replay/{hash}`
- `GET /api/random/health`
