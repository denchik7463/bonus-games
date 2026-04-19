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

Базовый префикс: `/api/rooms`

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

### Войти по шаблону (автоподбор комнаты)

`POST /api/rooms/join-by-template`

Роль: `USER`, `EXPERT`, `ADMIN`

Логика:

1. Ищется активная (`WAITING`) комната этого шаблона, где есть свободные места.
2. Если такая комната есть — пользователь присоединяется к ней.
3. Если нет — создается новая комната по шаблону, и пользователь сразу присоединяется.

Пример body:

```json
{
  "templateId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

Важно: в этом API `boostUsed` не передается. Буст активируется отдельным действием уже после входа в комнату.

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
  -d '{
    "boostUsed": false
  }'
```

### 6) Присоединиться по `templateId` (без передачи `boostUsed`)

```bash
curl -X POST "http://localhost:8081/api/rooms/join-by-template" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"templateId\": \"$TEMPLATE_ID\"
  }"
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

В текущей версии realtime для комнат работает через HTTP polling, а не через WebSocket push.

Используй периодические запросы:

- `GET /api/rooms/{roomId}/state` — текущее состояние комнаты
- `GET /api/rooms/{roomId}/events` — журнал событий комнаты

Пример polling каждые 2 секунды:

```bash
watch -n 2 "curl -s -H 'Authorization: Bearer $USER_TOKEN' http://localhost:8081/api/rooms/$ROOM_ID/state | jq"
```

### WebSocket

В проекте есть заготовки (`WebSocketConfig`, `WebSocketHandler`, `RoomEventPublisher`), но полноценный WebSocket-канал событий комнат пока не подключен.

До подключения WS используй `test-lobby.html` или `rooms-realtime.html`, где уже встроен polling.

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
- `status`
- `finishedAt`
