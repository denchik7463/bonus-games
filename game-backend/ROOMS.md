# Работа с комнатами (game-backend)

## Общая логика

Комната живет фиксированное время: **60 секунд**.

- Таймер запускается от `createdAt` (момент создания комнаты).
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

1. Для каждого игрока резервация коммитится (`COMMITTED`).
2. Победителю начисляется `prizeFund` транзакцией `WIN`.

При отмене комнаты (`CANCELLED`):

1. Резервации игроков релизятся (`RELEASED`).
2. Средства возвращаются в `available`.

## API по комнатам

Основной префикс: `/api/rooms`  
Отдельный endpoint поиска/подбора комнаты: `/api/room/find`

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
  "boostUsed": false
}
```

Важно: вход в комнату запрещен, если до ее таймаута осталось `<= 5` секунд.

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
  "boostAllowed": true
}
```

Важно:

- этот API только возвращает `roomId` (подбор/создание комнаты), но не выполняет `join`;
- после этого игрок должен отдельно вызвать `POST /api/rooms/{roomId}/join`;
- `boostUsed` в этом API не передается.
- `templateId` можно передавать как опциональный параметр для жесткой привязки к конкретному шаблону.

### Активировать буст в комнате

`POST /api/rooms/{roomId}/boost/activate`

Роль: `USER`, `EXPERT`, `ADMIN`

Условия:

1. Пользователь уже находится в комнате.
2. Комната не `FINISHED` и не `CANCELLED`.
3. Для шаблона комнаты `bonusEnabled=true`.
4. У пользователя достаточно `available` баланса на `bonusPrice`.

При успешной активации:

- у игрока ставится `boostUsed=true`;
- с баланса списывается `bonusPrice`;
- пишется событие `BOOST_ACTIVATED` в `round_event_logs`;
- в `wallet_transactions` добавляется `BOOST_PURCHASE`.

### Получить состояние комнаты

`GET /api/rooms/{roomId}/state`

Роль: `USER`, `EXPERT`, `ADMIN`

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
    "gameMechanic": "WEIGHTED_RANDOM"
  }' | jq -r '.id')

echo "$TEMPLATE_ID"
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
  -d '{}'
```

### 6) Найти/создать комнату по параметрам (без присоединения)

```bash
curl -X POST "http://localhost:8081/api/room/find" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"maxPlayers\": 2,
    \"entryCost\": 100,
    \"boostAllowed\": true
  }"
```

Опционально можно добавить `templateId`:

```json
{
  "templateId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "maxPlayers": 2,
  "entryCost": 100,
  "boostAllowed": true
}
```

### 6.1) После этого присоединиться к комнате по ID

```bash
curl -X POST "http://localhost:8081/api/rooms/$ROOM_ID/join" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 7) Активировать буст после входа в комнату

```bash
curl -X POST "http://localhost:8081/api/rooms/$ROOM_ID/boost/activate" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
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

`rooms-realtime.html` использует только WebSocket для realtime-обновлений.

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
- Отсчет начинается от `createdAt` (момент создания комнаты).
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
