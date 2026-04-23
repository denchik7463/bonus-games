# WebSocket: realtime по комнате

Документ описывает, как подключиться к realtime-каналу комнаты и какие события приходят.

## 1. Инструкция по запуску

Из корня проекта:

```bash
docker compose up --build
```

Проверка backend:

```bash
curl -s http://localhost:8081/health
```

Подготовьте токен через login:

```bash
TOKEN=$(curl -s -X POST "http://localhost:8081/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"secret123"}' | jq -r '.token')
```

## 2. Endpoint

```text
ws://localhost:8081/ws/rooms?roomId=<ROOM_ID>&token=<TOKEN>
```

Для HTTPS используйте `wss://...`.

Параметры обязательны:

- `roomId` - UUID комнаты
- `token` - токен из `POST /api/auth/login`

Если параметры не переданы или токен невалиден, соединение закрывается.

## 3. Формат сообщения

Сервер отправляет JSON вида:

```json
{
  "type": "ROOM_STATE",
  "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
  "payload": {},
  "sentAt": "2026-04-23T10:00:00.123Z"
}
```

Поля:

- `type` - тип сообщения (`ROOM_STATE` или `ROOM_EVENTS`)
- `roomId` - UUID комнаты
- `payload` - данные события
- `sentAt` - время отправки (UTC)

## 4. Какие события приходят

### 4.1 `ROOM_STATE`

Текущее состояние комнаты:

- статус (`WAITING`, `FULL`, `FINISHED`, `CANCELLED`)
- участники и их места
- занятые/свободные места
- таймер (`timerSeconds`, `remainingSeconds`)
- параметры буста и расчетные метрики
- `prizeFund`

Пример:

```json
{
  "type": "ROOM_STATE",
  "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
  "payload": {
    "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
    "shortId": "184205",
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
    "remainingSeconds": 43,
    "occupiedSeats": [1, 3],
    "freeSeats": [2, 4],
    "createdAt": "2026-04-23T09:59:10.001",
    "firstPlayerJoinedAt": "2026-04-23T09:59:20.100",
    "startedAt": null,
    "finishedAt": null,
    "players": [
      {
        "userId": "69e62862-7fd9-40f0-b135-5f6221e194a4",
        "username": "alice",
        "walletReservationId": "2d90f7f8-ddea-467b-b5ce-9d24c49b88bc",
        "boostUsed": false,
        "boostReservationId": null,
        "bot": false,
        "roundId": "room-67169950-88a5-4d7d-83e2-569ff1514971-round-1",
        "playerOrder": 1,
        "winner": false,
        "status": "JOINED",
        "joinTime": "2026-04-23T09:59:20.101"
      }
    ]
  },
  "sentAt": "2026-04-23T09:59:37.000Z"
}
```

### 4.2 `ROOM_EVENTS`

События из журнала комнаты (`round_event_logs`).

`eventType` может быть, например:

- `ROOM_CREATED`
- `PLAYER_JOINED`
- `BOOST_ACTIVATED`
- `BOTS_FILLED`
- `ROOM_FINISHED`
- `ROOM_CANCELLED`

Пример:

```json
{
  "type": "ROOM_EVENTS",
  "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
  "payload": [
    {
      "id": "dbb85ef7-e97f-4944-9e52-2e13f8c7cb30",
      "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
      "gameResultId": null,
      "eventType": "ROOM_CREATED",
      "title": "Комната создана",
      "description": "Создана новая игровая комната.",
      "payloadJson": "{\"maxPlayers\":4,\"entryCost\":100,\"boostAllowed\":true,\"timerSeconds\":60}",
      "createdAt": "2026-04-23T09:59:10.005"
    }
  ],
  "sentAt": "2026-04-23T09:59:37.002Z"
}
```

## 5. Частота отправки

### 5.1 `ROOM_STATE`

Отправляется:

1. Сразу при подключении (initial snapshot).
2. Каждую 1 секунду, только если таймер активен:
- `status` в `WAITING` или `FULL`
- `firstPlayerJoinedAt != null`
- `remainingSeconds > 0`
3. Дополнительно при изменениях комнаты (join/boost/finish/cancel/боты).

### 5.2 `ROOM_EVENTS`

Отправляется:

1. Сразу при подключении (initial snapshot).
2. При добавлении новых событий в журнал комнаты.

## 6. Минимальный пример на frontend

```javascript
const ws = new WebSocket(
  `ws://localhost:8081/ws/rooms?roomId=${encodeURIComponent(roomId)}&token=${encodeURIComponent(token)}`
);

ws.onopen = () => {
  console.log("ws connected");
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === "ROOM_STATE") {
    const state = message.payload;
    console.log("remaining", state.remainingSeconds);
    console.log("occupied", state.occupiedSeats);
    console.log("players", state.players);
  }

  if (message.type === "ROOM_EVENTS") {
    console.log("events", message.payload);
  }
};

ws.onclose = () => {
  console.log("ws disconnected");
};

ws.onerror = (error) => {
  console.error("ws error", error);
};
```

## 7. Рекомендации для UI

- Таймер всегда рисуйте из `ROOM_STATE.payload.remainingSeconds`.
- Список занятых мест берите из `occupiedSeats`.
- Состояние комнаты переключайте по `status`.
- Журнал событий показывайте из `ROOM_EVENTS.payload`.
- Не используйте HTTP polling для таймера, если WebSocket подключен.

## 8. Типичные проблемы

### Проблема: сразу `close` после подключения

Проверьте:

- в URL есть `roomId`
- в URL есть `token`
- `token` не протух

### Проблема: нет обновлений каждую секунду

Это нормально, если:

- в комнате еще никто не вошел (`firstPlayerJoinedAt = null`)
- таймер уже закончился
- статус не `WAITING/FULL`

### Проблема: CORS в браузере

Разрешенные origin настроены в `WebSocketConfig`.
Для локальной разработки используйте один из разрешенных:

- `http://localhost:63342`
- `http://127.0.0.1:63342`
- `http://localhost:3100`
- `http://127.0.0.1:3100`
- `http://localhost:8081`
- `http://127.0.0.1:8081`
