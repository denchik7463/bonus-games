# Комнаты: API и жизненный цикл

Документ описывает, как запускать модуль комнат и как с ним работать через API.

## 1. Инструкция по запуску

### 1.1 Запуск всего стека (рекомендуется)

Из корня проекта:

```bash
docker compose up --build
```

Проверка, что сервисы поднялись:

```bash
curl -s http://localhost:8081/health
curl -s http://localhost:9095/api/random/health
```

Ожидаемо:

- `game-backend` на `http://localhost:8081`
- `random-service` на `http://localhost:9095`
- `postgres` на `localhost:5432`
- `front` на `http://localhost:3000`

Остановка:

```bash
docker compose down
```

### 1.2 Подготовка токенов (admin и user)

```bash
BASE=http://localhost:8081

# admin
curl -s -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "secret123",
    "role": "ADMIN",
    "initialBalance": 10000
  }' | jq

# user1
curl -s -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "secret123",
    "role": "USER",
    "initialBalance": 5000
  }' | jq

# user2
curl -s -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "bob",
    "password": "secret123",
    "role": "USER",
    "initialBalance": 5000
  }' | jq

ADMIN_TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret123"}' | jq -r '.token')

USER1_TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"secret123"}' | jq -r '.token')

USER2_TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","password":"secret123"}' | jq -r '.token')
```

## 2. Жизненный цикл комнаты

### 2.1 Статусы

- `WAITING` - идет набор игроков
- `FULL` - все места заняты
- `FINISHED` - игра завершена, победитель определен
- `CANCELLED` - комната отменена вручную оператором

### 2.2 Таймер

- Таймер комнаты фиксированный: `60` секунд.
- Таймер стартует только после входа первого игрока (`firstPlayerJoinedAt`).
- Фоновая проверка таймаута выполняется каждые `5` секунд (`RoomScheduler`).

### 2.3 Что происходит при истечении таймера

Текущая логика:

1. Если к таймауту мест не хватает, backend автоматически заполняет свободные места ботами.
2. После этого комната завершается через `finishRoom`.
3. Победитель выбирается, пишется журнал, победителю начисляется выплата.

Имена ботов: `Бот №N`.

## 3. Финансовая логика

### 3.1 Вход в комнату

При `POST /api/rooms/{roomId}/join`:

1. Резервируется `entryCost * seatsCount`.
2. Баланс игрока:
- `available` уменьшается
- `reserved` увеличивается

### 3.2 Буст на место

При `POST /api/rooms/{roomId}/boost/activate`:

1. Проверяется, что место принадлежит игроку.
2. Резервируется `bonusPrice` (из шаблона).
3. Для конкретного места ставится `boostUsed=true`.

### 3.3 Завершение комнаты

- Все entry-резервы коммитятся (`BET`).
- Все boost-резервы коммитятся (`BET`).
- Победителю начисляется `WIN` на сумму `prizeFund`.

### 3.4 Отмена комнаты

`POST /api/rooms/{roomId}/cancel`:

- все резервы переводятся в `RELEASED`
- деньги возвращаются в `available`

## 4. Короткий ID комнаты (shortId)

- У комнаты есть `shortId` из 6 цифр, например `042731`.
- `shortId` уникален только среди активных комнат (`WAITING`, `FULL`).
- После завершения комнаты код может быть переиспользован.
- Войти в комнату можно и по `shortId`: `POST /api/rooms/code/{shortId}/join`.

## 5. Подбор комнаты (`/api/room/find`)

Endpoint: `POST /api/room/find`

Назначение: найти подходящую `WAITING` комнату или создать новую.

Важно:

- Этот endpoint не присоединяет игрока.
- Для существующей комнаты должно оставаться больше 5 секунд до конца.
- По местам:
- при `seats` все эти места должны быть свободны
- при `seatsCount` должно быть минимум `N` свободных мест

### 5.1 Request

Нужно передать либо `seats`, либо `seatsCount`.

```json
{
  "maxPlayers": 4,
  "entryCost": 100,
  "boostAllowed": true,
  "boostPrice": 50,
  "seats": [1, 3]
}
```

или:

```json
{
  "maxPlayers": 4,
  "entryCost": 100,
  "boostAllowed": true,
  "boostPrice": 50,
  "seatsCount": 2
}
```

`templateId` можно передать опционально для жесткой привязки к конкретному шаблону.

### 5.2 Response (`RoomResponse`)

```json
{
  "id": "67169950-88a5-4d7d-83e2-569ff1514971",
  "shortId": "042731",
  "templateId": "b7be5840-71fb-4c8b-9250-e5c399a4cc76",
  "maxPlayers": 4,
  "entryCost": 100,
  "prizeFund": 320,
  "boostAllowed": true,
  "boostPrice": 50,
  "boostWeight": 10,
  "currentChancePercent": 25.0,
  "chanceWithBoostPercent": 26.8293,
  "boostAbsoluteGainPercent": 1.8293,
  "timerSeconds": 60,
  "status": "WAITING",
  "currentPlayers": 2,
  "botCount": 0,
  "createdAt": "2026-04-22T15:10:00",
  "remainingSeconds": 41
}
```

## 6. Основные API комнат

Префикс: `/api/rooms`

### 6.1 Создать комнату по шаблону

`POST /api/rooms/create` (роль: `EXPERT`/`ADMIN`)

```json
{
  "templateId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

### 6.2 Войти в комнату

`POST /api/rooms/{roomId}/join`

Request:

```json
{
  "seats": [1, 2]
}
```

или:

```json
{
  "seatsCount": 2
}
```

Ограничения:

- передать можно только один вариант: `seats` или `seatsCount`
- место в диапазоне `1..maxPlayers`
- места должны быть уникальны
- занятые места выбрать нельзя
- одному пользователю можно занять максимум 50% мест комнаты
- вход запрещен, если осталось `<= 5` секунд

Пример ответа:

```json
{
  "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
  "roomStatus": "WAITING",
  "currentPlayers": 2,
  "maxPlayers": 4,
  "entryCost": 100,
  "roundId": "room-67169950-88a5-4d7d-83e2-569ff1514971-round-1",
  "reservationId": "2d90f7f8-ddea-467b-b5ce-9d24c49b88bc",
  "balance": {
    "available": 4800,
    "reserved": 200,
    "total": 5000
  }
}
```

### 6.3 Войти по shortId

- `GET /api/rooms/code/{shortId}` - получить комнату
- `POST /api/rooms/code/{shortId}/join` - войти в комнату

### 6.4 Активировать буст

`POST /api/rooms/{roomId}/boost/activate`

```json
{
  "seatNumber": 1
}
```

### 6.5 Состояние и события

- `GET /api/rooms/{roomId}/state`
- `GET /api/rooms/{roomId}/events`
- `GET /api/rooms`
- `GET /api/rooms/waiting`
- `GET /api/rooms/filter?maxPlayers=4&entryCost=100&boostAllowed=true`

Пример `GET /api/rooms/{roomId}/state`:

```json
{
  "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
  "shortId": "042731",
  "status": "WAITING",
  "currentPlayers": 2,
  "maxPlayers": 4,
  "entryCost": 100,
  "prizeFund": 320,
  "boostPrice": 50,
  "boostWeight": 10,
  "currentChancePercent": 25.0,
  "chanceWithBoostPercent": 26.8293,
  "boostAbsoluteGainPercent": 1.8293,
  "timerSeconds": 60,
  "remainingSeconds": 41,
  "createdAt": "2026-04-22T15:10:00",
  "firstPlayerJoinedAt": "2026-04-22T15:10:15",
  "startedAt": null,
  "finishedAt": null,
  "players": [
    {
      "userId": "69e62862-7fd9-40f0-b135-5f6221e194a4",
      "username": "alice",
      "walletReservationId": "2d90f7f8-ddea-467b-b5ce-9d24c49b88bc",
      "bot": false,
      "boostUsed": false,
      "roundId": "room-67169950-88a5-4d7d-83e2-569ff1514971-round-1",
      "playerOrder": 1,
      "winner": false,
      "status": "JOINED",
      "joinTime": "2026-04-22T15:10:15"
    }
  ]
}
```

### 6.6 Ручное завершение и отмена

- `POST /api/rooms/{roomId}/finish` (роль: `EXPERT`/`ADMIN`)
- `POST /api/rooms/{roomId}/cancel?reason=...` (роль: `EXPERT`/`ADMIN`)

## 7. Формулы

### 7.1 Призовой фонд

`prizeFund = entryCost * maxPlayers * winnerPercent / 100`

`prizeFund` возвращается как расчетное значение шаблона/комнаты.

### 7.2 Метрики буста

- `currentChancePercent = 100 / maxPlayers`
- `chanceWithBoostPercent = (100 + boostWeight) / (100 * (maxPlayers - 1) + (100 + boostWeight)) * 100`
- `boostAbsoluteGainPercent = chanceWithBoostPercent - currentChancePercent`

## 8. Быстрый e2e-сценарий

### 8.1 Создать шаблон комнаты

```bash
TEMPLATE_ID=$(curl -s -X POST "$BASE/api/room-templates" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "2 seats / 100",
    "active": true,
    "entryCost": 100,
    "bonusEnabled": true,
    "bonusPrice": 50,
    "bonusWeight": 10,
    "maxPlayers": 2,
    "winnerPercent": 80,
    "gameMechanic": "STANDARD"
  }' | jq -r '.id')

echo "$TEMPLATE_ID"
```

### 8.2 Найти или создать комнату

```bash
ROOM_ID=$(curl -s -X POST "$BASE/api/room/find" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "'"$TEMPLATE_ID"'",
    "maxPlayers": 2,
    "entryCost": 100,
    "boostAllowed": true,
    "boostPrice": 50,
    "seats": [1]
  }' | jq -r '.id')

echo "$ROOM_ID"
```

### 8.3 Пользователь 1 занимает место 1

```bash
curl -s -X POST "$BASE/api/rooms/$ROOM_ID/join" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"seats":[1]}' | jq
```

### 8.4 Пользователь 2 занимает место 2

```bash
curl -s -X POST "$BASE/api/rooms/$ROOM_ID/join" \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"seats":[2]}' | jq
```

### 8.5 Активировать буст для места 2

```bash
curl -s -X POST "$BASE/api/rooms/$ROOM_ID/boost/activate" \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"seatNumber":2}' | jq
```

### 8.6 Посмотреть состояние комнаты

```bash
curl -s "$BASE/api/rooms/$ROOM_ID/state" \
  -H "Authorization: Bearer $USER1_TOKEN" | jq
```

## 9. Realtime

Для realtime по комнате используйте WebSocket-документацию:

- `game-backend/WEBSOCKET.md`
