# Пользователь, баланс и резервирование

## 1. Какие данные о пользователе нужны модулю

Минимальный набор:

- `userId` (UUID) — первичный идентификатор.
- `username` — отображение в UI и журнале.
- `role` (`USER`, `EXPERT`, `ADMIN`) — доступ к API.
- `passwordHash` — локальная аутентификация.

Связанные данные:

- `walletAccount` (`availableBalance`, `reservedBalance`).
- активные `authSessions` (token + expiresAt).

## 2. Как передается баланс бонусных баллов

Баланс возвращается в структуре:

```json
{
  "available": 1000,
  "reserved": 200,
  "total": 1200
}
```

Где используется:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/profile/me`
- `GET /api/wallet/balance`
- операции `reserve/commit/release/deposit`

## 3. Как выполняется резервирование бонусных баллов

Поток `reserve`:

1. Проверка: `available >= amount`.
2. Перенос суммы: `available -= amount`, `reserved += amount`.
3. Создание `wallet_reservation` в статусе `RESERVED`.
4. Запись `wallet_transaction` типа `RESERVE`.

`commit`:

- `reserved -= amount`
- reservation -> `COMMITTED`
- транзакция `BET` (или `BOOST_PURCHASE` по сценарию)

`release`:

- `reserved -= amount`, `available += amount`
- reservation -> `RELEASED`
- транзакция `RELEASE`

## 4. Как фиксируются списания и начисления

История денег хранится в `wallet_transactions`.

Основные типы:

- `DEPOSIT`
- `RESERVE`
- `RELEASE`
- `BET`
- `WIN`
- `ADJUSTMENT`

Пример финализации раунда:

- всем участникам commit entry (и boost при наличии);
- победителю начисление `WIN`.

При отмене:

- release всех активных резервов.

## 5. Идемпотентность

Для внешних вызовов используется `operationId`:

- повтор одного и того же запроса не должен дублировать финансовую операцию;
- облегчает аудит и разбор инцидентов.
