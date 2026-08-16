# POS / CRM / loyalty integration contract

Mini App не является POS, CRM или системой лояльности вендора. Application layer зависит только от provider ports. Когда появляется iiko, r_keeper, Quick Resto, CRM или payment provider, реализуется набор adapters. Frontend и use cases не переписываются.

Сейчас:

- `DATA_MODE=local` — SQLite source of truth.
- `POS_ADAPTER=external` — любой вызов POS возвращает HTTP `501` с кодом `POS_NOT_CONFIGURED`.
- `PAYMENT_ADAPTER=external` — `501 PAYMENT_NOT_CONFIGURED`.
- Тихого fallback на local внутри application layer нет.

## Source of truth

**LOCAL**

```text
Mini App → Application → Local Providers → SQLite
```

**Vendor-backed**

```text
Mini App → Application → Iiko*Provider / RKeeper*Provider → Partner API
```

Local SQLite в vendor-режиме может остаться для technical state, ID mapping и cache. Mini App не должен стать второй правдой по столам, меню и чекам.

## Ports

| Port | Local demo | Future adapter |
| --- | --- | --- |
| MenuProvider | SQLite catalog | `IikoMenuProvider`, `QuickRestoMenuProvider` |
| ReservationProvider | SQLite reservations | `IikoReservationProvider`, `RKeeperReservationProvider` |
| TableProvider | tables + combinations + blocks | floor / table management API |
| AvailabilityPort | domain engine on local occupancy | vendor availability, if it is authoritative |
| OrderProvider | SQLite orders | `IikoOrderProvider` |
| GuestProvider | SQLite guests | CRM guest / customer |
| LoyaltyProvider | ledger in SQLite | vendor loyalty or CRM bonuses |
| WaitlistProvider | SQLite waitlist | hostess / waitlist product |
| PaymentProvider | mock intent | acquiring provider |
| POSProvider | local accept | iiko / r_keeper / Quick Resto |
| EventProvider | SQLite / webhook / mock | CRM webhook, bot, CDP |

Composition: `backend/src/container.ts`. Запрещены `if (posMode)` внутри services.

## Entity mapping

### Guest

| Mini App | CRM / POS |
| --- | --- |
| id | mapping table |
| telegramUserId | telegram_id |
| name | NAME |
| phone | PHONE |
| preferences.dietaryPreferences | guest tags |
| preferences.staffNotes | CRM comment, never shown to guest |

### Reservation

| Mini App | Vendor |
| --- | --- |
| date / startTime / endTime | visit datetime + duration |
| partySize | guests |
| diningAreaId | hall / section |
| assignedTableId / combination | table / join |
| occasion | CRM custom field |
| wishes | comments / extras |
| status | pending → confirmed → seated → completed / cancelled / no_show |

Гостю не обещают номер стола, пока backend его не назначил. Admin видит assignment.

### Order

| Mini App | POS |
| --- | --- |
| type | dine_in / takeaway / delivery / reservation_preorder |
| items + modifiers | dish + modifiers |
| reservationId | preorder link |
| tableId | QR table |
| totals | POS cheque (POS authoritative after fiscalization) |

Delivery — архитектурная возможность. Логистика курьера не реализована.

### Loyalty

Баланс = сумма `LoyaltyTransaction`. Нельзя начислять бонусы минуя ledger.

Earn на `order.completed`, идемпотентно по `earn:order:{id}`.

## Outbound events

`EventProvider.publish(name, payload)`.

```text
reservation.created
reservation.cancelled
reservation.confirmed
reservation.no_show
order.created
order.ready
order.completed
guest.created
guest.returned
waitlist.created
waitlist.offered
table.call_waiter
table.request_bill
loyalty.earned
loyalty.redeemed
```

`EVENT_ADAPTER=local|webhook|mock`.

Webhook POST на `EVENT_WEBHOOK_URL`:

```json
{
  "name": "reservation.created",
  "payload": {
    "reservationId": 12,
    "guestId": 1,
    "date": "2026-08-21",
    "startTime": "19:00",
    "partySize": 2,
    "occasion": "date"
  }
}
```

## How to add IikoOrderProvider

1. Реализовать `OrderProvider` и `POSProvider` против iiko API.
2. Добавить mapping Mini App id ↔ iiko id.
3. В `container.ts` выбрать adapter по `POS_ADAPTER=iiko`.
4. Не менять routes, React pages и use cases.

То же для `IikoReservationProvider` и `IikoMenuProvider`.

## What this app does not do

Mini App не проводит фискализацию, не списывает склад, не считает кухню и не заменяет кассу. POS остаётся системой чека, когда он подключён.
