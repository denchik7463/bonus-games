# Журнал игр (общий и пользовательский)

## Что такое журнал

Журнал хранит историю завершенных раундов/комнат:

- `game_results` — итог игры (победитель, roll, random hash/seed, параметры комнаты)
- `game_result_players` — участники конкретной игры (вес, победитель/проигравший, баланс до/после)
- `round_event_logs` — события по комнате/игре

## Роли и доступ

- Общий журнал (`/api/game/journal/**`): `EXPERT` или `ADMIN`
- Пользовательский журнал (`/api/game/journal/me/**`): `USER`, `EXPERT`, `ADMIN` (только свои игры)

## 1) Общий журнал (для ADMIN/EXPERT)

### Получить весь журнал

`GET /api/game/journal`

```bash
curl -X GET "http://localhost:8081/api/game/journal" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Пример ответа:

```json
[
  {
    "id": "bb2d8f7b-bca1-4347-965d-8ee98a539b2f",
    "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
    "maxPlayers": 2,
    "entryCost": 100,
    "prizeFund": 200,
    "boostAllowed": true,
    "botCount": 0,
    "roomStatus": "FINISHED",
    "winnerPlayerExternalId": "69e62862-7fd9-40f0-b135-5f6221e194a4",
    "winnerPlayerName": "denis",
    "winnerPositionIndex": 1,
    "baseWeight": null,
    "boostBonus": null,
    "totalWeight": 210,
    "roll": 152,
    "randomHash": "abc123...",
    "randomSeed": "123456789",
    "createdAt": "2026-04-19T18:05:23.501Z",
    "participants": [
      {
        "positionIndex": 0,
        "playerExternalId": "84d8e95f-6f93-4b9f-b0ca-9f5fb7f5ebc2",
        "username": "alice",
        "bot": false,
        "boostUsed": false,
        "finalWeight": 100,
        "balanceBefore": 1000,
        "balanceAfter": 900,
        "balanceDelta": -100,
        "status": "LOST",
        "winner": false
      },
      {
        "positionIndex": 1,
        "playerExternalId": "69e62862-7fd9-40f0-b135-5f6221e194a4",
        "username": "denis",
        "bot": false,
        "boostUsed": true,
        "finalWeight": 110,
        "balanceBefore": 950,
        "balanceAfter": 1150,
        "balanceDelta": 200,
        "status": "WINNER",
        "winner": true
      }
    ],
    "events": []
  }
]
```

### Фильтр по комнате

`GET /api/game/journal?roomId=<ROOM_ID>`

```bash
curl -X GET "http://localhost:8081/api/game/journal?roomId=$ROOM_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Пример ответа:

```json
[
  {
    "id": "bb2d8f7b-bca1-4347-965d-8ee98a539b2f",
    "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
    "roomStatus": "FINISHED",
    "winnerPlayerName": "denis",
    "roll": 152,
    "totalWeight": 210
  }
]
```

### Получить конкретную запись журнала

`GET /api/game/journal/{id}`

```bash
curl -X GET "http://localhost:8081/api/game/journal/$GAME_RESULT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Пример ответа:

```json
{
  "id": "bb2d8f7b-bca1-4347-965d-8ee98a539b2f",
  "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
  "roomStatus": "FINISHED",
  "winnerPlayerName": "denis",
  "roll": 152,
  "totalWeight": 210,
  "randomHash": "abc123...",
  "randomSeed": "123456789",
  "participants": [
    {
      "username": "alice",
      "finalWeight": 100,
      "winner": false
    },
    {
      "username": "denis",
      "finalWeight": 110,
      "winner": true
    }
  ],
  "events": [
    {
      "eventType": "ROOM_FINISHED",
      "eventTitle": "Раунд завершен"
    }
  ]
}
```

### Получить события конкретной игры

`GET /api/game/journal/{id}/events`

```bash
curl -X GET "http://localhost:8081/api/game/journal/$GAME_RESULT_ID/events" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Пример ответа:

```json
[
  {
    "id": "f118a857-a22c-4b1d-bb2f-726bd70f7a9d",
    "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
    "gameResultId": "bb2d8f7b-bca1-4347-965d-8ee98a539b2f",
    "eventType": "ROOM_FINISHED",
    "eventTitle": "Раунд завершен",
    "description": "Комната завершена, выбран победитель и начислен призовой фонд.",
    "payloadJson": "{\"winnerUsername\":\"denis\"}",
    "actorUserId": null,
    "actorUsername": "system",
    "actorRole": "SYSTEM",
    "createdAt": "2026-04-19T18:05:23.530Z"
  }
]
```

### Получить события по комнате

`GET /api/game/journal/events/by-room?roomId=<ROOM_ID>`

```bash
curl -X GET "http://localhost:8081/api/game/journal/events/by-room?roomId=$ROOM_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Пример ответа:

```json
[
  {
    "eventType": "ROOM_CREATED",
    "eventTitle": "Комната создана"
  },
  {
    "eventType": "PLAYER_JOINED",
    "eventTitle": "Игрок вошёл в комнату"
  },
  {
    "eventType": "BOOST_ACTIVATED",
    "eventTitle": "Буст активирован"
  },
  {
    "eventType": "ROOM_FINISHED",
    "eventTitle": "Раунд завершен"
  }
]
```

## 2) Пользовательский журнал (для игрока)

### Получить свои игры

`GET /api/game/journal/me`

```bash
curl -X GET "http://localhost:8081/api/game/journal/me" \
  -H "Authorization: Bearer $USER_TOKEN"
```

Пример ответа:

```json
[
  {
    "id": "bb2d8f7b-bca1-4347-965d-8ee98a539b2f",
    "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
    "winnerPlayerName": "denis",
    "participants": [
      {
        "username": "denis",
        "winner": true
      }
    ]
  }
]
```

### Получить свою конкретную игру

`GET /api/game/journal/me/{id}`

```bash
curl -X GET "http://localhost:8081/api/game/journal/me/$GAME_RESULT_ID" \
  -H "Authorization: Bearer $USER_TOKEN"
```

Пример ответа:

```json
{
  "id": "bb2d8f7b-bca1-4347-965d-8ee98a539b2f",
  "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
  "winnerPlayerName": "denis",
  "roll": 152,
  "participants": [
    {
      "username": "denis",
      "balanceBefore": 950,
      "balanceAfter": 1150,
      "balanceDelta": 200,
      "winner": true
    }
  ]
}
```

### Получить события своей конкретной игры

`GET /api/game/journal/me/{id}/events`

```bash
curl -X GET "http://localhost:8081/api/game/journal/me/$GAME_RESULT_ID/events" \
  -H "Authorization: Bearer $USER_TOKEN"
```

Пример ответа:

```json
[
  {
    "eventType": "ROOM_CREATED",
    "eventTitle": "Комната создана"
  },
  {
    "eventType": "PLAYER_JOINED",
    "eventTitle": "Игрок вошёл в комнату"
  },
  {
    "eventType": "ROOM_FINISHED",
    "eventTitle": "Раунд завершен"
  }
]
```

Если пользователь не участвовал в игре, доступ к `/me/{id}` и `/me/{id}/events` будет запрещен.

## Быстрый сценарий проверки

1. Заверши комнату (вручную или дождись таймера), чтобы появилась запись в журнале.
2. Админом проверь общий журнал: `GET /api/game/journal`.
3. Возьми `id` записи (`gameResultId`).
4. Пользователем, участвовавшим в игре, проверь `GET /api/game/journal/me`.
5. Проверь события игры у админа и у пользователя через `/events`.

## Полезные поля в ответе

- `id` — ID записи в `game_results`
- `roomId` — ID комнаты
- `winnerPlayerName`, `winnerPlayerExternalId`
- `roll`, `totalWeight`, `randomHash`, `randomSeed`
- `participants[]` — участники с `balanceBefore`, `balanceAfter`, `balanceDelta`, `winner`
- `events[]` — события из `round_event_logs`
