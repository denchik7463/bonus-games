# WebSocket API (Room Realtime)

Этот документ описывает realtime-канал комнаты: как подключаться, что приходит и как это использовать на фронтенде.

## Endpoint

- URL: `ws://localhost:8081/ws/rooms?roomId=<ROOM_ID>&token=<JWT_TOKEN>`
- Для HTTPS: `wss://...`

Параметры query:
- `roomId` — UUID комнаты
- `token` — Bearer-токен пользователя (из `/api/auth/login`)

Если `roomId` или `token` не переданы/невалидны, соединение будет закрыто.

## Что отправляет сервер

Сервер отправляет JSON-сообщения формата:

```json
{
  "type": "ROOM_STATE",
  "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
  "payload": {},
  "sentAt": "2026-04-22T12:00:00.123Z"
}
```

Поля:
- `type` — тип события (`ROOM_STATE` или `ROOM_EVENTS`)
- `roomId` — UUID комнаты
- `payload` — полезная нагрузка
- `sentAt` — время отправки события сервером (UTC)

## Типы событий

Значения поля `type`:
- `ROOM_STATE` — текущее состояние комнаты (таймер, игроки, занятые места, статус).
- `ROOM_EVENTS` — журнал событий комнаты.

Типы `eventType` внутри `ROOM_EVENTS.payload`:
- `ROOM_CREATED`
- `PLAYER_JOINED`
- `BOOST_ACTIVATED`
- `BOTS_FILLED`
- `ROOM_FINISHED`
- `ROOM_CANCELLED`

## Частота отправки

- `ROOM_STATE`: 
  - сразу после подключения (initial snapshot)
  - далее каждые ~1 секунду **только когда таймер активен**:
    - `status` = `WAITING` или `FULL`
    - `firstPlayerJoinedAt != null`
    - `remainingSeconds > 0`
  - дополнительно при изменениях в комнате (join/boost/finish/cancel/боты)
- `ROOM_EVENTS`:
  - initial snapshot при подключении
  - при изменениях журнала событий комнаты

## ROOM_STATE payload

`ROOM_STATE.payload` содержит актуальное состояние комнаты:

- `roomId`, `shortId`
- `status` (`WAITING`, `FULL`, `FINISHED`, `CANCELLED`)
- `currentPlayers`, `maxPlayers`
- `entryCost`, `prizeFund`
- `timerSeconds` — длительность таймера
- `remainingSeconds` — оставшееся время (или `null`, если таймер ещё не стартовал)
- `occupiedSeats` — массив занятых мест
- `freeSeats` — массив свободных мест
- `createdAt`, `firstPlayerJoinedAt`, `startedAt`, `finishedAt`
- `players` — массив участников

### Пример ROOM_STATE

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
    "prizeFund": 200,
    "timerSeconds": 60,
    "remainingSeconds": 43,
    "occupiedSeats": [1, 3],
    "freeSeats": [2, 4],
    "createdAt": "2026-04-22T11:59:10.001",
    "firstPlayerJoinedAt": "2026-04-22T11:59:20.100",
    "startedAt": null,
    "finishedAt": null,
    "players": [
      {
        "userId": "69e62862-7fd9-40f0-b135-5f6221e194a4",
        "username": "denis",
        "walletReservationId": "2d90f7f8-ddea-467b-b5ce-9d24c49b88bc",
        "boostUsed": false,
        "boostReservationId": null,
        "bot": false,
        "roundId": "room-67169950-88a5-4d7d-83e2-569ff1514971-round-1",
        "playerOrder": 1,
        "winner": false,
        "status": "JOINED",
        "joinTime": "2026-04-22T11:59:20.101"
      },
      {
        "userId": "a1f8b8d4-ae57-4c14-a7f5-7f96a2b42d2f",
        "username": "alex",
        "walletReservationId": "b13d8ad4-4d8e-45f1-8ef0-cc3f3d721a8e",
        "boostUsed": true,
        "boostReservationId": "de0179ea-d8ef-4b05-9dea-bf850b157514",
        "bot": false,
        "roundId": "room-67169950-88a5-4d7d-83e2-569ff1514971-round-1",
        "playerOrder": 3,
        "winner": false,
        "status": "JOINED",
        "joinTime": "2026-04-22T11:59:31.300"
      }
    ]
  },
  "sentAt": "2026-04-22T11:59:37.000Z"
}
```

## ROOM_EVENTS payload

`ROOM_EVENTS.payload` — массив событий журнала комнаты (RoundEventLog), отсортированный по времени.

### Пример ROOM_EVENTS

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
      "createdAt": "2026-04-22T11:59:10.005"
    },
    {
      "id": "7f81677f-87ab-4b11-bf13-2fcf9a31dbb7",
      "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
      "gameResultId": null,
      "eventType": "PLAYER_JOINED",
      "title": "Игрок вошёл в комнату",
      "description": "Игрок успешно вошел и места зарезервированы.",
      "payloadJson": "{\"username\":\"denis\",\"seats\":\"[1]\"}",
      "createdAt": "2026-04-22T11:59:20.120"
    }
  ],
  "sentAt": "2026-04-22T11:59:37.002Z"
}
```

## Минимальный пример подключения (frontend)

```js
const ws = new WebSocket(
  `ws://localhost:8081/ws/rooms?roomId=${encodeURIComponent(roomId)}&token=${encodeURIComponent(token)}`
);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "ROOM_STATE") {
    // data.payload.remainingSeconds
    // data.payload.occupiedSeats
    // data.payload.players
  }

  if (data.type === "ROOM_EVENTS") {
    // data.payload -> массив событий
  }
};
```

## Рекомендации для UI

- Таймер: использовать `payload.remainingSeconds` как источник истины.
- Места: брать из `payload.occupiedSeats`/`payload.freeSeats`.
- Статусы комнаты: реагировать на `WAITING/FULL/FINISHED/CANCELLED`.
- История: отображать `ROOM_EVENTS.payload` как журнал событий.
