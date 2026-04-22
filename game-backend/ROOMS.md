# Работа с комнатами (game-backend)

## Общая логика

Комната живет фиксированное время: **60 секунд**.

- Таймер запускается от `firstPlayerJoinedAt` (момент входа первого игрока).
- По истечении таймера:
  - если комната в статусе `FULL` (заполнена) -> выполняется розыгрыш победителя (`finish`);
  - если не заполнена -> комната отменяется (`cancel`), резервы игроков освобождаются.

## Статусы комнаты

- `WAITING` — идет набор игроков
- `FULL` — комната заполнена
- `FINISHED` — розыгрыш завершен, победитель выбран
- `CANCELLED` — комната отменена

## Финансовая модель

При входе игрока в комнату:

1. Создается резервация entry-cost (`wallet_reservations`, статус `RESERVED`).
2. Баланс пользователя:
   - `available` уменьшается,
   - `reserved` увеличивается.

При завершении комнаты (`FINISHED`):

1. Для каждого игрока резервация entry-cost коммитится (`COMMITTED`).
2. Для активированных бустов резервации буста также коммитятся (`COMMITTED`).
3. Победителю начисляется выплата `winnerPayout = totalPool * winnerPercent / 100` транзакцией `WIN`.

`prizeFund` в API и WebSocket рассчитывается фиксированно по шаблону:

`prizeFund = entryCost * maxPlayers * winnerPercent / 100`

Он не накапливается по мере входа игроков.

При отмене комнаты (`CANCELLED`):

1. Резервации entry-cost и бустов релизятся (`RELEASED`).
2. Средства возвращаются в `available`.

## API по комнатам

Основной префикс: `/api/rooms`  
Отдельный endpoint поиска/подбора комнаты: `/api/room/find`

### Короткий ID комнаты (6 цифр)

- У каждой новой комнаты есть `shortId` (пример: `042731`).
- `shortId` уникален только среди **активных** комнат (`WAITING`, `FULL`).
- После `FINISHED`/`CANCELLED` код может быть переиспользован.
- `shortId` возвращается в обычных API-ответах комнаты:
  - `GET /api/rooms`
  - `GET /api/rooms/{id}`
  - `GET /api/rooms/waiting`
  - `GET /api/rooms/filter`
  - `GET /api/rooms/{roomId}/state`
  - WebSocket `ROOM_STATE.payload.shortId`

Примеры JSON-ответов:

`GET /api/rooms` (массив комнат):

```json
[
  {
    "id": "67169950-88a5-4d7d-83e2-569ff1514971",
    "shortId": "042731",
    "templateId": "b7be5840-71fb-4c8b-9250-e5c399a4cc76",
    "maxPlayers": 4,
    "entryCost": 100,
    "prizeFund": 200,
    "boostAllowed": true,
    "timerSeconds": 60,
    "status": "WAITING",
    "currentPlayers": 2,
    "botCount": 0,
    "createdAt": "2026-04-21T13:10:00.000",
    "remainingSeconds": 41
  }
]
```

`GET /api/rooms/{id}`:

```json
{
  "id": "67169950-88a5-4d7d-83e2-569ff1514971",
  "shortId": "042731",
  "templateId": "b7be5840-71fb-4c8b-9250-e5c399a4cc76",
  "maxPlayers": 4,
  "entryCost": 100,
  "prizeFund": 200,
  "boostAllowed": true,
  "timerSeconds": 60,
  "status": "WAITING",
  "currentPlayers": 2,
  "botCount": 0,
  "createdAt": "2026-04-21T13:10:00.000",
  "remainingSeconds": 41
}
```

`GET /api/rooms/waiting`:

```json
[
  {
    "id": "67169950-88a5-4d7d-83e2-569ff1514971",
    "shortId": "042731",
    "templateId": "b7be5840-71fb-4c8b-9250-e5c399a4cc76",
    "maxPlayers": 4,
    "entryCost": 100,
    "prizeFund": 200,
    "boostAllowed": true,
    "timerSeconds": 60,
    "status": "WAITING",
    "currentPlayers": 2,
    "botCount": 0,
    "createdAt": "2026-04-21T13:10:00.000",
    "remainingSeconds": 41
  }
]
```

`GET /api/rooms/filter?maxPlayers=4&entryCost=100&boostAllowed=true`:

```json
[
  {
    "id": "67169950-88a5-4d7d-83e2-569ff1514971",
    "shortId": "042731",
    "templateId": "b7be5840-71fb-4c8b-9250-e5c399a4cc76",
    "maxPlayers": 4,
    "entryCost": 100,
    "prizeFund": 200,
    "boostAllowed": true,
    "timerSeconds": 60,
    "status": "WAITING",
    "currentPlayers": 2,
    "botCount": 0,
    "createdAt": "2026-04-21T13:10:00.000",
    "remainingSeconds": 41
  }
]
```

`GET /api/rooms/{roomId}/state`:

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
  "createdAt": "2026-04-21T13:10:00.000",
  "firstPlayerJoinedAt": "2026-04-21T13:10:19.000",
  "startedAt": null,
  "finishedAt": null,
  "players": [
    {
      "userId": "69e62862-7fd9-40f0-b135-5f6221e194a4",
      "username": "denis",
      "walletReservationId": "2d90f7f8-ddea-467b-b5ce-9d24c49b88bc",
      "boostUsed": false,
      "roundId": "room-67169950-88a5-4d7d-83e2-569ff1514971-round-1",
      "playerOrder": 1,
      "winner": false,
      "status": "JOINED",
      "joinTime": "2026-04-21T13:10:20.100"
    }
  ]
}
```

WebSocket `ROOM_STATE`:

```json
{
  "type": "ROOM_STATE",
  "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
  "payload": {
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
    "occupiedSeats": [1, 3],
    "freeSeats": [2, 4],
    "players": [
      {
        "username": "denis",
        "playerOrder": 1,
        "boostUsed": false
      }
    ]
  },
  "sentAt": "2026-04-21T13:10:20.520Z"
}
```

Формулы по шансу буста (на уровне комнаты):

- `currentChancePercent = 100 / maxPlayers`
- `chanceWithBoostPercent = (baseWeight + boostWeight) / (baseWeight * (maxPlayers - 1) + (baseWeight + boostWeight)) * 100`
- `boostAbsoluteGainPercent = chanceWithBoostPercent - currentChancePercent`
- `baseWeight = 100`

### Создать комнату

`POST /api/rooms/create`

Роль: `ADMIN` или `EXPERT`

Создание комнаты выполняется **только по шаблону** из `room_templates`.

Пример body:

```json
{
  "templateId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

### Войти в комнату

`POST /api/rooms/{roomId}/join`

Роль: `USER`, `EXPERT`, `ADMIN`

Пример body:

```json
{
  "seats": [1]
}
```

или:

```json
{
  "seatsCount": 2
}
```

Важно: вход в комнату запрещен, если до ее таймаута осталось `<= 5` секунд.
Дополнительно:

- место должно быть в диапазоне `1..maxPlayers`;
- нельзя выбрать уже занятое место;
- в одном запросе места должны быть уникальными;
- один игрок может занимать максимум `50%` мест комнаты.
- в запросе нужно передать **либо** `seats`, **либо** `seatsCount`.
- если передан `seatsCount`, backend случайно выбирает нужное количество свободных мест.

### Войти по шаблону (автоподбор комнаты)

`POST /api/room/find`

Роль: `USER`, `EXPERT`, `ADMIN`

Логика:

1. Ищется активная (`WAITING`) комната с такими параметрами, где есть свободные места.
2. У найденной комнаты должно оставаться больше 5 секунд до таймаута.
3. Если подходящая комната есть — возвращается она.
4. Если подходящей комнаты нет — создается новая и возвращается она.
5. Пользователь в комнату автоматически **не присоединяется**.

Пример body:

```json
{
  "maxPlayers": 2,
  "entryCost": 100,
  "boostAllowed": true,
  "boostPrice": 50,
  "seats": [1]
}
```

или:

```json
{
  "maxPlayers": 2,
  "entryCost": 100,
  "boostAllowed": true,
  "boostPrice": 50,
  "seatsCount": 1
}
```

Что принимает (`JoinByTemplateRequest`):

- `templateId` (UUID, optional) — если передан, поиск/создание только по этому шаблону
- `maxPlayers` (required)
- `entryCost` (required)
- `boostAllowed` (required)
- `boostPrice` (optional) — если передан, подбор выполняется также по цене буста
- `seats` (optional) — конкретные места, например `[1,3]`
- `seatsCount` (optional) — количество случайных мест

Важно: нужно передать **либо** `seats`, **либо** `seatsCount`.

Что возвращает (`RoomResponse`):

- `id`, `shortId`, `templateId`
- `maxPlayers`, `entryCost`, `prizeFund`
- `boostAllowed`, `boostPrice`, `boostWeight`
- `currentChancePercent`, `chanceWithBoostPercent`, `boostAbsoluteGainPercent`
- `timerSeconds`, `status`, `currentPlayers`, `botCount`
- `createdAt`, `remainingSeconds`

Пример ответа:

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
  "createdAt": "2026-04-22T15:10:00.000",
  "remainingSeconds": 41
}
```

Важно:

- этот API только возвращает `roomId` (подбор/создание комнаты), но не выполняет `join`;
- после этого игрок должен отдельно вызвать `POST /api/rooms/{roomId}/join`;
- в этом API передаются желаемые места `seats`; backend ищет комнату, где все эти места свободны.
- альтернативно можно передать `seatsCount`; backend ищет комнату, где есть минимум `N` свободных мест.
- `templateId` можно передавать как опциональный параметр для жесткой привязки к конкретному шаблону.

### Активировать буст в комнате

`POST /api/rooms/{roomId}/boost/activate`

Роль: `USER`, `EXPERT`, `ADMIN`

Пример body:

```json
{
  "seatNumber": 1
}
```

Условия:

1. Пользователь владеет указанным местом `seatNumber` в комнате.
2. Комната не `FINISHED` и не `CANCELLED`.
3. Для шаблона комнаты `bonusEnabled=true`.
4. У пользователя достаточно `available` баланса на `bonusPrice`.

При успешной активации (для конкретного места):

- у выбранного места игрока ставится `boostUsed=true`;
- создается резервация `bonusPrice` за это место (`RESERVED`);
- при `FINISHED` эта резервация коммитится, при `CANCELLED` — релизится;
- в ответе возвращается `boostReservationId`;
- пишется событие `BOOST_ACTIVATED` в `round_event_logs`;
- в `wallet_transactions` пишутся операции резервации/финализации.

### Получить состояние комнаты

`GET /api/rooms/{roomId}/state`

Роль: `USER`, `EXPERT`, `ADMIN`

### Получить комнату по короткому ID

`GET /api/rooms/code/{shortId}`

Роль: `USER`, `EXPERT`, `ADMIN`

Пример:

```bash
curl -H "Authorization: Bearer $USER_TOKEN" \
  "http://localhost:8081/api/rooms/code/042731"
```

### Присоединиться к комнате по короткому ID

`POST /api/rooms/code/{shortId}/join`

Роль: `USER`, `EXPERT`, `ADMIN`

Пример:

```bash
curl -X POST "http://localhost:8081/api/rooms/code/042731/join" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "seatsCount": 1
  }'
```

### Получить события комнаты

`GET /api/rooms/{roomId}/events`

Роль: `USER`, `EXPERT`, `ADMIN`

### Завершить комнату вручную

`POST /api/rooms/{roomId}/finish`

Роль: `ADMIN` или `EXPERT`

Пример body:

```json
{
  "baseWeight": 100,
  "boostBonus": 10
}
```

### Отменить комнату вручную

`POST /api/rooms/{roomId}/cancel?reason=Manual+cancel`

Роль: `ADMIN` или `EXPERT`

### Список комнат

`GET /api/rooms`

Роль: `USER`, `EXPERT`, `ADMIN`

## Автообработка по таймеру

Фоновый scheduler проверяет комнаты в статусах `WAITING` и `FULL`.

- Если таймер истек и статус `FULL` -> `finishRoom(...)`
- Если таймер истек и статус не `FULL` -> `cancelRoom(...)`

## Логи и история раундов

При завершении раунда данные пишутся в:

- `game_results` — итог раунда (победитель, roll, hash, seed, etc.)
- `game_result_players` — данные участников раунда
- `round_event_logs` — события комнаты/раунда

`ROOM_FINISHED` в `round_event_logs` привязывается к `game_result_id`.

## История игр игрока

- `GET /api/game/journal/me` — история текущего игрока
- `GET /api/game/journal/me/{id}` — конкретный матч
- `GET /api/game/journal/me/{id}/events` — события по конкретному матчу

Все запросы требуют Bearer token.

## UI для ручного теста

- `http://localhost:8081/test-lobby.html` — форма регистрации/логина и действий с комнатами
- `http://localhost:8081/rooms-realtime.html` — realtime монитор комнаты

## Быстрые curl-команды

### 1) Получить токен админа

```bash
ADMIN_TOKEN=$(curl -s -X POST "http://localhost:8081/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "secret123"
  }' | jq -r '.token')

echo "$ADMIN_TOKEN"
```

### 2) Получить токен обычного пользователя

```bash
USER_TOKEN=$(curl -s -X POST "http://localhost:8081/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "secret123"
  }' | jq -r '.token')

echo "$USER_TOKEN"
```

### 3) Создать шаблон комнаты (если еще нет)

```bash
TEMPLATE_ID=$(curl -s -X POST "http://localhost:8081/api/room-templates" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "basic-2p",
    "active": true,
    "entryCost": 100,
    "bonusEnabled": true,
    "bonusPrice": 50,
    "bonusWeight": 10,
    "maxPlayers": 2,
    "winnerPercent": 80,
    "gameMechanic": "WEIGHTED_RANDOM"
  }' | jq -r '.id')

echo "$TEMPLATE_ID"
```

### 3.1) Деактивировать шаблон комнаты

`DELETE /api/room-templates/{id}` выполняет мягкое удаление: шаблон не удаляется физически, а переводится в `active=false`.

```bash
curl -i -X DELETE "http://localhost:8081/api/room-templates/$TEMPLATE_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 4) Создать комнату по `templateId`

```bash
ROOM_ID=$(curl -s -X POST "http://localhost:8081/api/rooms/create" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"templateId\": \"$TEMPLATE_ID\"
  }" | jq -r '.id')

echo "$ROOM_ID"
```

### 5) Присоединиться к комнате обычным пользователем

```bash
curl -X POST "http://localhost:8081/api/rooms/$ROOM_ID/join" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "seats": [1]
  }'
```

### 6) Найти/создать комнату по параметрам (без присоединения)

```bash
curl -X POST "http://localhost:8081/api/room/find" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"maxPlayers\": 2,
    \"entryCost\": 100,
    \"boostAllowed\": true,
    \"seats\": [1]
  }"
```

Опционально можно добавить `templateId`:

```json
{
  "templateId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "maxPlayers": 2,
  "entryCost": 100,
  "boostAllowed": true,
  "seats": [1]
}
```

### 6.1) После этого присоединиться к комнате по ID

```bash
curl -X POST "http://localhost:8081/api/rooms/$ROOM_ID/join" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "seats": [2]
  }'
```

### 7) Активировать буст после входа в комнату

```bash
curl -X POST "http://localhost:8081/api/rooms/$ROOM_ID/boost/activate" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "seatNumber": 1
  }'
```

## Realtime (WebSocket) и таймер

### Что сейчас реализовано

Реaltime для комнаты работает через WebSocket:

- endpoint: `/ws/rooms`
- query params: `roomId`, `token`
- формат сообщений: `WsEvent`
  - `ROOM_STATE` — актуальный `RoomStateResponse`
  - `ROOM_EVENTS` — список `RoundEventResponse`

Пример подключения из браузера:

```text
ws://localhost:8081/ws/rooms?roomId=<ROOM_ID>&token=<TOKEN>
```

`rooms-realtime.html` использует только WebSocket для realtime-обновлений и показывает занятые/свободные места в блоке `Occupied Seats`.

### Как работать с WebSocket (практика)

1. Подключись к комнате:

```text
ws://localhost:8081/ws/rooms?roomId=<ROOM_ID>&token=<TOKEN>
```

2. После подключения сервер отправит initial snapshot:

- `ROOM_STATE`
- `ROOM_EVENTS`

3. Дальше слушай входящие сообщения:

- при изменении комнаты приходит новый `ROOM_STATE`
- список участников всегда в `ROOM_STATE.payload.players`

Пример JS-клиента:

```javascript
const roomId = "67169950-88a5-4d7d-83e2-569ff1514971";
const token = "YOUR_TOKEN";

const ws = new WebSocket(
  `ws://localhost:8081/ws/rooms?roomId=${encodeURIComponent(roomId)}&token=${encodeURIComponent(token)}`
);

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === "ROOM_STATE") {
    console.log("Room state:", msg.payload);
    console.log("Players:", msg.payload.players);
  }

  if (msg.type === "ROOM_EVENTS") {
    console.log("Room events:", msg.payload);
  }
};
```

### Что приходит от WebSocket

Сообщения приходят в формате `WsEvent`:

```json
{
  "type": "ROOM_STATE",
  "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
  "payload": {},
  "sentAt": "2026-04-20T09:30:00Z"
}
```

Поля:

- `type` — тип события (`ROOM_STATE` или `ROOM_EVENTS`)
- `roomId` — ID комнаты
- `payload` — данные события
- `sentAt` — время отправки события сервером

#### `ROOM_STATE`

`payload` содержит текущее состояние комнаты:

- `roomId`, `status`, `currentPlayers`, `maxPlayers`
- `entryCost`, `prizeFund`, `timerSeconds`
- `createdAt`, `firstPlayerJoinedAt`, `startedAt`, `finishedAt`
- `players` — список участников в комнате

Пример:

```json
{
  "type": "ROOM_STATE",
  "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
  "payload": {
    "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
    "status": "WAITING",
    "currentPlayers": 1,
    "maxPlayers": 2,
    "entryCost": 100,
    "prizeFund": 100,
    "timerSeconds": 60,
    "createdAt": "2026-04-20T09:29:10.001",
    "players": [
      {
        "userId": "69e62862-7fd9-40f0-b135-5f6221e194a4",
        "username": "denis",
        "walletReservationId": "2d90f7f8-ddea-467b-b5ce-9d24c49b88bc",
        "boostUsed": false,
        "playerOrder": 1,
        "winner": false,
        "status": "JOINED",
        "joinTime": "2026-04-20T09:29:15.501"
      }
    ]
  },
  "sentAt": "2026-04-20T09:29:15.520Z"
}
```

#### `ROOM_EVENTS`

`payload` содержит массив событий комнаты (аналог `GET /api/rooms/{roomId}/events`).

Пример:

```json
{
  "type": "ROOM_EVENTS",
  "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
  "payload": [
    {
      "eventType": "ROOM_CREATED",
      "eventTitle": "Комната создана"
    },
    {
      "eventType": "PLAYER_JOINED",
      "eventTitle": "Игрок вошёл в комнату"
    }
  ],
  "sentAt": "2026-04-20T09:29:15.521Z"
}
```

### Как работает таймер комнаты

- Таймер комнаты фиксированный: `60` секунд.
- Отсчет начинается от `firstPlayerJoinedAt` (момент входа первого игрока).
- Scheduler проверяет комнаты в статусах `WAITING` и `FULL`.
- По истечении таймера:
  - если статус `FULL` -> выполняется розыгрыш победителя (`FINISHED`);
  - иначе -> комната отменяется (`CANCELLED`), резервации освобождаются.

Проверка таймера через API:

```bash
curl -s -H "Authorization: Bearer $USER_TOKEN" \
  "http://localhost:8081/api/rooms/$ROOM_ID/state" | jq
```

Полезные поля ответа:

- `createdAt`
- `timerSeconds`
- `remainingSeconds`
- `status`
- `finishedAt`
