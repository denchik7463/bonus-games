# Администрирование шаблонов комнат

## Что такое шаблон комнаты

`room_template` — это конфигурация, по которой создаются комнаты:

- `entryCost`
- `maxPlayers`
- `winnerPercent`
- `bonusEnabled`
- `bonusPrice`
- `bonusWeight`
- `gameMechanic`
- `active`

## Как администратор управляет шаблонами

Основные действия:

1. Создать шаблон: `POST /api/room-templates`
2. Обновить шаблон: `PUT /api/room-templates/{id}`
3. Отключить шаблон: `DELETE /api/room-templates/{id}`  
   (это не физическое удаление, а `active=false`)
4. Получить активные шаблоны: `GET /api/room-templates`
5. Получить шаблон по id: `GET /api/room-templates/{id}`

## Важные правила

- Неактивные шаблоны не участвуют в выборе комнат.
- Удаление безопасное (soft delete), чтобы не ломать исторические ссылки из `rooms`.
- В ответах шаблонов возвращается расчетный `prizeFund`.

Формула:

`prizeFund = entryCost * maxPlayers * winnerPercent / 100`
