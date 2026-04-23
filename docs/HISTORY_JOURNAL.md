# История участий и журнал

## Где хранится история участий

История игр хранится в трёх таблицах:

- `game_results` — итог раунда (победитель, prize, hash рандома, статусы).
- `game_result_players` — данные по каждому участнику:
  - места;
  - итоговый вес;
  - участие/победа;
  - баланс до/после;
  - дельта.
- `round_event_logs` — технический журнал событий по комнате/раунду.

## Что это дает

- Аудит результата розыгрыша.
- Аналитику по игрокам и комнатам.
- Отладку инцидентов (кто вошел, какой reserve/commit был, почему выиграл конкретный игрок).

## API истории

Пользователь:

- `GET /api/game/journal/me`
- `GET /api/game/journal/me/{id}`
- `GET /api/game/journal/me/{id}/events`
- `GET /api/game/journal/me/win-streak`

Админ/эксперт:

- `GET /api/game/journal`
- `GET /api/game/journal/{id}`
- `GET /api/game/journal/{id}/events`
- `GET /api/game/journal/events/by-room?roomId=...`
