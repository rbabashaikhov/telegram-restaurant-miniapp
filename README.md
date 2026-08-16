# Nord Bistro — Telegram Mini App для ресторана

Telegram Mini App, который связывает гостя, бронь, заказ, повторный визит, лояльность и операции ресторана. Это не электронное меню и не отдельный виджет бронирования.

Вымышленный ресторан демо: **Nord Bistro**, Москва, Цветной бульвар. Премиум-casual кухня, тёплый зал, веранда, VIP и бар.

Продуктовая идея:

```text
guest → reservation/order → visit → repeat visit → loyalty → revenue
```

Для гостя: быстро забронировать, заказать, повторить любимое и общаться с рестораном без отдельного мобильного приложения.

## Product

Nord Bistro — digital-канал ресторана. Гость открывает Mini App из Telegram, бронирует стол, может сделать предзаказ, забрать еду с собой, вернуться к любимым блюдам и копить бонусы.

Ресторан видит те же данные в admin: брони, столы, waitlist, заказы, гостей и ledger лояльности.

## Business Value

- Бронь с настоящим availability, а не со статичным списком времени.
- Предзаказ увеличивает средний чек до прихода гостя.
- Repeat order возвращает takeaway и ужин без трения.
- История визитов, повод посещения и предпочтения — готовые данные для CRM.
- Лояльность считается по транзакциям, не «числом в профиле».
- QR за столом: меню, заказ, официант, счёт.

## Customer Experience

```text
Home
├── Забронировать стол
├── Заказать с собой
├── Меню
├── Мои брони / заказы
└── Мой ресторан / бонусы
```

Новый гость видит приглашение забронировать и заказать. Постоянный гость видит следующую бронь, любимое блюдо, баланс бонусов и повтор заказа.

Повод визита (свидание, семья, день рождения) сохраняется в брони и истории.

Если слота нет — можно встать в лист ожидания, а не получить глухую ошибку.

QR `/?table=T12` открывает режим стола.

## Restaurant Operations

Admin:

- Dashboard KPI из живой SQLite, без hardcoded цифр
- Брони: confirm / seat / complete / cancel / no-show / reschedule
- План столов по зонам
- Waitlist: ручной offer
- Заказы: confirm → preparing → ready → complete
- Меню: цена, описание, availability, теги
- Карточка гостя и timeline
- Корректировка бонусов только через ledger

Публичный read-only контур: `/demo/admin`. Write-запросы отвечают `405 DEMO_READ_ONLY`.

## Architecture

```text
Frontend
    ↓
REST API
    ↓
Application Layer
    ↓
Domain Ports
    ↓
Providers
```

Application services не знают, что источник — SQLite, POS или webhook. Выбор implementation только в composition layer (`backend/src/container.ts`).

```text
Providers
├── MenuProvider
├── ReservationProvider
├── TableProvider
├── AvailabilityPort
├── OrderProvider
├── GuestProvider
├── LoyaltyProvider
├── WaitlistProvider
├── PaymentProvider
├── POSProvider
└── EventProvider
```

```env
DATA_MODE=local
POS_ADAPTER=local
PAYMENT_ADAPTER=mock
EVENT_ADAPTER=local
```

`POS_ADAPTER=external` возвращает контролируемый `501 POS_NOT_CONFIGURED`, а не падает.

Availability — доменный движок: дата, время, party size, duration, dining area, текущие брони, capacity, table combinations, blocks, buffer. Параметры задаются через env.

## Domain Model

Restaurant → Location → DiningArea → Table / TableCombination

Guest, GuestPreference

MenuCategory → MenuItem → ModifierGroup → Modifier

Reservation (+ history, wishes, occasion, optional preorder Order)

WaitlistEntry

Order → OrderItem → OrderItemModifier

LoyaltyAccount → LoyaltyTransaction (earned / redeemed / adjustment)

BusinessEvent

## Local Development

```bash
cp .env.example .env
npm install
npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:3000

Browser demo использует гостя Ивана Петрова (`ALLOW_DEMO_MODE=true`).

Сброс базы:

```bash
npm run seed:reset -w backend
```

## Environment

См. `.env.example`.

Ключевые переменные:

- `ALLOW_DEMO_MODE=true` — явный browser demo. Production без этого флага не принимает fake Telegram user.
- `TELEGRAM_BOT_TOKEN` — HMAC-проверка `initData`.
- `ADMIN_TOKEN` — fail closed. Пустой токен не открывает write-admin.
- `RESERVATION_DURATION_MINUTES`, `RESERVATION_BUFFER_MINUTES`
- `LOYALTY_EARN_PERCENT`
- `POS_ADAPTER`, `PAYMENT_ADAPTER`, `EVENT_ADAPTER`

## Demo Mode

Browser demo: `ALLOW_DEMO_MODE=true`.

Sales Demo Mode идёт по живому UI, не slideshow. Тур заполняет пятничный ужин и предзаказ, но **не создаёт бронь** без кнопки «Подтвердить».

## Admin

- `/admin` — полный admin, нужен `ADMIN_TOKEN` (`nord-bistro-demo` в example).
- `/demo/admin` — те же живые данные, только чтение.

## POS/CRM Integration

Контракт портов и mapping: [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md).

Сейчас нет production adapter для iiko / r_keeper / Quick Resto. Их подключают как новые providers, без переписывания frontend и use cases.

## Tests

```bash
npm test
npm run typecheck
npm run build
```

Backend покрывает availability, overlap, combinations, cancel/reschedule/no-show, concurrency, orders, modifiers, repeat, loyalty ledger, waitlist, Telegram auth и admin security.

## Deployment

Один процесс отдаёт `/api/*` и frontend static.

```bash
docker compose up --build
```

Healthcheck: `GET /api/health`.

SQLite живёт в volume `/data/restaurant.db`.

Для production:

1. Выставить `TELEGRAM_BOT_TOKEN`.
2. Выставить сильный `ADMIN_TOKEN`.
3. `ALLOW_DEMO_MODE` только если нужен public demo.
4. HTTPS URL Mini App в BotFather.
5. При необходимости `EVENT_ADAPTER=webhook`.

## Known Limitations

- нет production iiko / r_keeper / Quick Resto adapter;
- нет реального payment provider / эквайринга;
- нет полноценной delivery-логистики;
- нет kitchen display system;
- нет учёта, фискализации и склада;
- нет сложного multi-location routing;
- нет production notification bot;
- waitlist не ловит освободившийся стол автоматически — admin предлагает слот вручную.
