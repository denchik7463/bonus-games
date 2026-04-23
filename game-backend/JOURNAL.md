# Журнал игр: общий и пользовательский

Документ описывает, как смотреть историю игр и события раундов.

## 1. Инструкция по запуску

Из корня проекта:

```bash
docker compose up --build
```

Проверка backend:

```bash
curl -s http://localhost:8081/health
```

Подготовка токенов:

```bash
BASE=http://localhost:8081

ADMIN_TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret123"}' | jq -r '.token')

USER_TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"secret123"}' | jq -r '.token')
```

## 2. Что хранится в журнале

История формируется из трёх таблиц:

- `game_results` - итог раунда
- `game_result_players` - участники и их итоговые показатели
- `round_event_logs` - события комнаты/игры

Когда комната завершается, backend сохраняет:

- победителя
- `roll`, `totalWeight`, `randomHash`, `randomSeed`
- участников с `finalWeight`, `balanceBefore/After`, `balanceDelta`
- ленту событий по комнате

## 3. Права доступа

- Общий журнал (`/api/game/journal/**`): `EXPERT` или `ADMIN`
- Пользовательский журнал (`/api/game/journal/me/**`): `USER`, `EXPERT`, `ADMIN`

Пользователь в `/me/{id}` видит только те игры, где участвовал.

## 4. API общего журнала (ADMIN/EXPERT)

### 4.1 Получить список всех игр

`GET /api/game/journal`

```bash
curl -s -X GET "$BASE/api/game/journal" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

Пример ответа:

```json
[
  {
    "id": "bb2d8f7b-bca1-4347-965d-8ee98a539b2f",
    "roomId": "67169950-88a5-4d7d-83e2-569ff1514971",
    "maxPlayers": 2,
    "entryCost": 100,
    "prizeFund": 160,
    "boostAllowed": true,
    "botCount": 0,
    "roomStatus": "FINISHED",
    "winnerPlayerExternalId": "69e62862-7fd9-40f0-b135-5f6221e194a4",
    "winnerPlayerName": "alice",
    "winnerPositionIndex": 1,
    "baseWeight": null,
    "boostBonus": null,
    "totalWeight": 210,
    "roll": 152,
    "randomHash": "abc123...",
    "randomSeed": "123456789",
    "createdAt": "2026-04-23T11:05:23.501Z",
    "participants": [
      {
        "positionIndex": 0,
        "playerExternalId": "84d8e95f-6f93-4b9f-b0ca-9f5fb7f5ebc2",
        "username": "bob",
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
        "username": "alice",
        "bot": false,
        "boostUsed": true,
        "finalWeight": 110,
        "balanceBefore": 950,
        "balanceAfter": 1110,
        "balanceDelta": 160,
        "status": "WINNER",
        "winner": true
      }
    ],
    "events": []
  }
]
```

### 4.2 Фильтр по комнате

`GET /api/game/journal?roomId=<ROOM_ID>`

```bash
curl -s -X GET "$BASE/api/game/journal?roomId=$ROOM_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

### 4.3 Получить одну запись журнала

`GET /api/game/journal/{id}`

```bash
curl -s -X GET "$BASE/api/game/journal/$GAME_RESULT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

### 4.4 События конкретной игры

`GET /api/game/journal/{id}/events`

```bash
curl -s -X GET "$BASE/api/game/journal/$GAME_RESULT_ID/events" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
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
    "payloadJson": "{\"winnerUsername\":\"alice\"}",
    "actorUserId": null,
    "actorUsername": "system",
    "actorRole": "SYSTEM",
    "createdAt": "2026-04-23T11:05:23.530Z"
  }
]
```

### 4.5 События по roomId

`GET /api/game/journal/events/by-room?roomId=<ROOM_ID>`

```bash
curl -s -X GET "$BASE/api/game/journal/events/by-room?roomId=$ROOM_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

## 5. API пользовательского журнала

### 5.1 Мои игры

`GET /api/game/journal/me`

```bash
curl -s -X GET "$BASE/api/game/journal/me" \
  -H "Authorization: Bearer $USER_TOKEN" | jq
```

### 5.2 Моя конкретная игра

`GET /api/game/journal/me/{id}`

```bash
curl -s -X GET "$BASE/api/game/journal/me/$GAME_RESULT_ID" \
  -H "Authorization: Bearer $USER_TOKEN" | jq
```

### 5.3 События моей игры

`GET /api/game/journal/me/{id}/events`

```bash
curl -s -X GET "$BASE/api/game/journal/me/$GAME_RESULT_ID/events" \
  -H "Authorization: Bearer $USER_TOKEN" | jq
```

### 5.4 Мой винстрик

`GET /api/game/journal/me/win-streak`

```bash
curl -s -X GET "$BASE/api/game/journal/me/win-streak" \
  -H "Authorization: Bearer $USER_TOKEN" | jq
```

Пример ответа:

```json
{
  "userId": "69e62862-7fd9-40f0-b135-5f6221e194a4",
  "username": "alice",
  "currentWinStreak": 2,
  "latestGameResultId": "bb2d8f7b-bca1-4347-965d-8ee98a539b2f",
  "latestGameAt": "2026-04-23T11:05:23.501Z",
  "calculatedAt": "2026-04-23T11:06:10.113Z"
}
```

## 6. Как читать веса (`finalWeight`)

`finalWeight` в `participants` - это абсолютный вес участника в раунде на момент розыгрыша.

Пример:

- без буста: `100`
- с бустом (при bonusWeight=10): `110`

`totalWeight` - сумма весов всех участников.

`roll` выбирается в диапазоне `1..totalWeight`, после чего определяется победитель.

## 7. Быстрый сценарий проверки

1. Создайте/найдите комнату и заполните ее игроками.
2. Дождитесь завершения (или вызовите `POST /api/rooms/{roomId}/finish` как ADMIN/EXPERT).
3. Получите журнал админом:

```bash
curl -s -X GET "$BASE/api/game/journal" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

4. Возьмите `id` (это `gameResultId`) и проверьте детали/события.
5. Тем же `id` проверьте пользовательские `/me/{id}` и `/me/{id}/events`.

## 8. Типичные причины ошибок

- `403` на `/me/{id}`: пользователь не участвовал в этой игре.
- `401` на любом endpoint: отсутствует/протух Bearer token.
- пустой список журнала: еще нет завершенных раундов.
