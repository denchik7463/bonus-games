# WebSocket и realtime

## Endpoint

`ws://<host>:8081/ws/rooms?roomId=<ROOM_ID>&token=<TOKEN>`

## События

- `ROOM_STATE` — полное состояние комнаты:
  - статус;
  - игроки/места;
  - таймер (`remainingSeconds`);
  - prizeFund;
  - boost метрики.
- `ROOM_EVENTS` — список/пакет событий комнаты (вход, буст, финиш, победитель и т.д.).

## Частота push

- Сразу после подключения отправляется initial snapshot.
- Пока таймер активен: `ROOM_STATE` отправляется раз в 1 секунду.
- Для остальных изменений — событийный push (без постоянного polling по HTTP).

## Что получает фронт в realtime

- Занятые места.
- Оставшееся время.
- Появление/выход участников.
- Завершение раунда и победителя.

Подробные payload-примеры: [game-backend/WEBSOCKET.md](../game-backend/WEBSOCKET.md)
