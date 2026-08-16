import type Database from 'better-sqlite3';

function isoDate(offsetDays: number, now = new Date()): string {
  const date = new Date(now);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nextWeekday(weekday: number, now = new Date()): string {
  const date = new Date(now);
  const current = date.getDay();
  let delta = weekday - current;
  if (delta <= 0) delta += 7;
  return isoDate(delta, now);
}

export function seed(database: Database.Database, now = new Date()): void {
  const existing = database.prepare('SELECT COUNT(*) AS count FROM restaurants').get() as {
    count: number;
  };
  if (existing.count > 0) return;

  const today = isoDate(0, now);
  const yesterday = isoDate(-1, now);
  const lastWeek = isoDate(-12, now);
  const twoWeeksAgo = isoDate(-20, now);
  const friday = nextWeekday(5, now);
  const saturday = nextWeekday(6, now);

  const run = database.transaction(() => {
    database
      .prepare(
        `INSERT INTO restaurants (id, name, description) VALUES (1, 'Nord Bistro', 'Премиум-casual кухня на Цветном: сезонное меню, открытая кухня и спокойный зал для ужина.')`,
      )
      .run();
    database
      .prepare(
        `INSERT INTO locations (id, restaurant_id, name, address, city, timezone, opening_time, closing_time)
         VALUES (1, 1, 'Цветной бульвар', 'Цветной бульвар, 15', 'Москва', 'Europe/Moscow', '12:00', '23:00')`,
      )
      .run();

    const areas = [
      [1, 'Основной зал', 'hall', 'Тёплый зал с видом на открытую кухню'],
      [2, 'Веранда', 'terrace', 'Летняя веранда, тише и светлее'],
      [3, 'VIP', 'vip', 'Закрытый зал на компанию'],
      [4, 'Бар', 'bar', 'Высокие столы у барной стойки'],
    ] as const;
    const areaStmt = database.prepare(
      `INSERT INTO dining_areas (id, location_id, name, slug, description) VALUES (?, 1, ?, ?, ?)`,
    );
    for (const area of areas) areaStmt.run(...area);

    const tables: Array<[number, number, string, number, number]> = [
      [1, 1, 'T1', 1, 2],
      [2, 1, 'T2', 1, 2],
      [3, 1, 'T3', 3, 4],
      [4, 1, 'T4', 3, 4],
      [5, 1, 'T5', 5, 6],
      [6, 1, 'T6', 3, 4],
      [7, 2, 'T7', 2, 4],
      [8, 2, 'T8', 2, 4],
      [9, 2, 'T9', 2, 2],
      [10, 3, 'T10', 6, 8],
      [11, 4, 'T11', 1, 2],
      [12, 4, 'T12', 1, 2],
    ];
    const tableStmt = database.prepare(
      `INSERT INTO tables (id, location_id, dining_area_id, code, name, min_capacity, max_capacity)
       VALUES (?, 1, ?, ?, ?, ?, ?)`,
    );
    for (const [id, areaId, code, min, max] of tables) {
      tableStmt.run(id, areaId, code, code, min, max);
    }

    database
      .prepare(
        `INSERT INTO table_combinations (id, location_id, dining_area_id, name, min_capacity, max_capacity)
         VALUES (1, 1, 1, 'T4+T5', 7, 8), (2, 1, 1, 'T1+T2', 3, 4), (3, 1, 2, 'T7+T8', 5, 8)`,
      )
      .run();
    const memberStmt = database.prepare(
      `INSERT INTO table_combination_members (combination_id, table_id) VALUES (?, ?)`,
    );
    memberStmt.run(1, 4);
    memberStmt.run(1, 5);
    memberStmt.run(2, 1);
    memberStmt.run(2, 2);
    memberStmt.run(3, 7);
    memberStmt.run(3, 8);

    database
      .prepare(
        `INSERT INTO table_blocks (table_id, date, start_time, end_time, reason)
         VALUES (6, ?, '12:00', '18:00', 'Частный банкет')`,
      )
      .run(today);

    const categories = [
      [1, 'Закуски', 'starters', 1],
      [2, 'Салаты', 'salads', 2],
      [3, 'Супы', 'soups', 3],
      [4, 'Горячее', 'mains', 4],
      [5, 'Паста', 'pasta', 5],
      [6, 'Десерты', 'desserts', 6],
      [7, 'Напитки', 'drinks', 7],
    ] as const;
    const catStmt = database.prepare(
      `INSERT INTO menu_categories (id, location_id, name, slug, sort_order) VALUES (?, 1, ?, ?, ?)`,
    );
    for (const category of categories) catStmt.run(...category);

    const items: Array<
      [number, number, string, string, number, string, number, string, string, number]
    > = [
      [1, 1, 'Брускетта с томатами', 'Хлеб на закваске, спелые томаты, базилик и оливковое масло.', 420, '/images/dishes/bruschetta.svg', 10, '["vegetarian","popular"]', '["gluten"]', 1],
      [2, 1, 'Тартар из говядины', 'Фарш ручной рубки, каперсы, желток и крутоны.', 890, '/images/dishes/tartare.svg', 12, '["popular"]', '["eggs","gluten"]', 2],
      [3, 1, 'Страчателла с печёным перцем', 'Сливочный сыр, перец, кедровые орехи и мёд.', 760, '/images/dishes/stracciatella.svg', 8, '["vegetarian"]', '["milk","nuts"]', 3],
      [4, 1, 'Устрицы с миньонетом', 'Свежие устрицы, красный лук, уксус. Цена за штуку.', 390, '/images/dishes/oysters.svg', 5, '[]', '["shellfish"]', 4],
      [5, 2, 'Салат с киноа и авокадо', 'Киноа, авокадо, огурец, лайм и мята.', 620, '/images/dishes/quinoa.svg', 10, '["vegan","vegetarian","gluten_free"]', '[]', 1],
      [6, 2, 'Цезарь с цыплёнком', 'Романо, цыплёнок на гриле, пармезан, фирменная заправка.', 680, '/images/dishes/caesar.svg', 12, '[]', '["milk","eggs","gluten"]', 2],
      [7, 2, 'Буррата с томатами', 'Буррата, черри, базилик и бальзамик.', 740, '/images/dishes/burrata.svg', 8, '["vegetarian"]', '["milk"]', 3],
      [8, 3, 'Тыквенный крем-суп', 'Печёная тыква, кокосовые сливки, тыквенные семечки.', 490, '/images/dishes/pumpkin-soup.svg', 12, '["vegan","vegetarian"]', '[]', 1],
      [9, 3, 'Уха из сибаса', 'Наваристый бульон, сибас, коренья и укроп.', 720, '/images/dishes/ukha.svg', 18, '["gluten_free"]', '["fish"]', 2],
      [10, 4, 'Стейк рибай', 'Зрелый рибай на гриле. Выберите прожарку.', 1890, '/images/dishes/ribeye.svg', 22, '["popular"]', '[]', 1],
      [11, 4, 'Цыплёнок с розмарином', 'Фермерский цыплёнок, розмарин, печёный чеснок.', 980, '/images/dishes/chicken.svg', 25, '[]', '[]', 2],
      [12, 4, 'Сибас на гриле', 'Целый сибас, лимон, фенхель и оливковое масло.', 1240, '/images/dishes/seabass.svg', 20, '["gluten_free"]', '["fish"]', 3],
      [13, 4, 'Каре ягнёнка', 'Каре, соус из красного вина, корнеплоды.', 1680, '/images/dishes/lamb.svg', 24, '[]', '[]', 4],
      [14, 5, 'Карбонара', 'Спагетти, гуанчиале, пекорино, желток.', 790, '/images/dishes/carbonara.svg', 14, '["popular"]', '["gluten","eggs","milk"]', 1],
      [15, 5, 'Паста с креветками', 'Лингвини, креветки, чеснок, перец чили.', 920, '/images/dishes/shrimp-pasta.svg', 16, '["spicy"]', '["gluten","shellfish"]', 2],
      [16, 5, 'Ризотто с белыми грибами', 'Карнароли, белые грибы, пармезан.', 860, '/images/dishes/risotto.svg', 22, '["vegetarian"]', '["milk"]', 3],
      [17, 6, 'Чизкейк', 'Классический нью-йорк с ягодным соусом.', 490, '/images/dishes/cheesecake.svg', 5, '["popular","vegetarian"]', '["milk","eggs","gluten"]', 1],
      [18, 6, 'Тирамису', 'Савоярди, маскарпоне, эспрессо.', 520, '/images/dishes/tiramisu.svg', 5, '["vegetarian"]', '["milk","eggs","gluten"]', 2],
      [19, 6, 'Шоколадный фондан', 'Тёплый фондан с ванильным мороженым.', 540, '/images/dishes/fondant.svg', 12, '["vegetarian"]', '["milk","eggs","gluten"]', 3],
      [20, 6, 'Панна-котта с ягодами', 'Ваниль, сливки, сезонные ягоды.', 460, '/images/dishes/pannacotta.svg', 5, '["vegetarian","gluten_free"]', '["milk"]', 4],
      [21, 7, 'Эспрессо', 'Двойной эспрессо на смеси Nord.', 180, '/images/dishes/espresso.svg', 3, '["fast"]', '[]', 1],
      [22, 7, 'Капучино', 'Эспрессо и бархатная молочная пенка.', 280, '/images/dishes/cappuccino.svg', 4, '["popular"]', '["milk"]', 2],
      [23, 7, 'Лимонад базилик-огурец', 'Домашний лимонад, огурец, базилик.', 320, '/images/dishes/lemonade.svg', 5, '["vegan","vegetarian"]', '[]', 3],
      [24, 7, 'Бокал Pinot Noir', 'Лёгкое красное, ягоды и специи. 150 мл.', 620, '/images/dishes/pinot.svg', 2, '[]', '[]', 4],
      [25, 7, 'Nord Spritz', 'Просекко, цитрусовый биттер, апельсин.', 540, '/images/dishes/spritz.svg', 4, '["popular"]', '[]', 5],
      [26, 7, 'Детский какао', 'Какао на молоке, маршмеллоу.', 220, '/images/dishes/cocoa.svg', 5, '["kids","vegetarian"]', '["milk"]', 6],
      [27, 4, 'Овощи гриль', 'Цукини, баклажан, перец, соус йогурт.', 540, '/images/dishes/grilled-veg.svg', 15, '["vegetarian"]', '["milk"]', 5],
      [28, 1, 'Тартар из лосося', 'Лосось, авокадо, кунжут и соевый соус.', 820, '/images/dishes/salmon-tartare.svg', 10, '[]', '["fish","soy","sesame"]', 5],
    ];
    const itemStmt = database.prepare(
      `INSERT INTO menu_items (id, category_id, name, description, price, image, prep_time_minutes, tags, allergens, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const item of items) itemStmt.run(...item);

    database
      .prepare(
        `INSERT INTO modifier_groups (id, menu_item_id, name, required, min_select, max_select, sort_order)
         VALUES
           (1, 10, 'Прожарка', 1, 1, 1, 1),
           (2, 15, 'Добавки', 0, 0, 3, 1),
           (3, 22, 'Молоко', 0, 0, 1, 1),
           (4, 14, 'Добавки', 0, 0, 2, 1)`,
      )
      .run();
    database
      .prepare(
        `INSERT INTO modifiers (id, group_id, name, price_delta, sort_order) VALUES
          (1, 1, 'Rare', 0, 1),
          (2, 1, 'Medium rare', 0, 2),
          (3, 1, 'Medium', 0, 3),
          (4, 1, 'Well done', 0, 4),
          (5, 2, 'Пармезан extra', 80, 1),
          (6, 2, 'Креветки extra', 220, 2),
          (7, 2, 'Бекон', 160, 3),
          (8, 3, 'Овсяное молоко', 40, 1),
          (9, 3, 'Дополнительный шот', 50, 2),
          (10, 4, 'Пармезан extra', 80, 1),
          (11, 4, 'Бекон extra', 140, 2)`,
      )
      .run();

    const guestStmt = database.prepare(
      `INSERT INTO guests (id, telegram_user_id, name, phone, username, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', ?))`,
    );
    guestStmt.run(1, 999000001, 'Иван Петров', '+7 903 120-44-18', 'demo_client', '-40 days');
    guestStmt.run(2, 900000002, 'Анна Соколова', '+7 916 334-21-09', 'anna_sokolova', '-90 days');
    guestStmt.run(3, 900000003, 'Дмитрий Орлов', '+7 925 441-88-30', 'dmitry_orlov', '-60 days');
    guestStmt.run(4, 900000004, 'Мария Волкова', '+7 903 772-15-64', 'maria_volkova', '-30 days');
    guestStmt.run(5, 900000005, 'Павел Кузнецов', '+7 999 210-03-41', 'pavel_kuz', '-10 days');

    const prefStmt = database.prepare(
      `INSERT INTO guest_preferences (guest_id, preferred_dining_area_id, dietary_preferences, notes, staff_notes)
       VALUES (?, ?, ?, ?, ?)`,
    );
    prefStmt.run(1, 2, '[]', 'Любит карбонару и столик у окна.', 'VIP-гость, не предлагать внутренний зал без причины.');
    prefStmt.run(2, 2, '["vegetarian"]', 'Часто приходит на свидание.', null);
    prefStmt.run(3, 1, '[]', 'Деловые обеды, обычно 2 человека.', 'Счёт всегда раздельный.');
    prefStmt.run(4, 1, '["kids"]', 'Приходит с ребёнком 5 лет.', 'Нужен детский стул.');
    prefStmt.run(5, 4, '[]', null, null);

    const resStmt = database.prepare(
      `INSERT INTO reservations (
        id, location_id, guest_id, dining_area_id, assigned_table_id, assigned_combination_id,
        date, start_time, end_time, party_size, status, occasion, wishes, created_at, updated_at
      ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))`,
    );
    resStmt.run(1, 1, 2, 7, null, today, '19:00', '21:00', 2, 'confirmed', 'date', JSON.stringify({ quietTable: true }), '-2 days', '-2 days');
    resStmt.run(2, 2, 2, 8, null, friday, '20:00', '22:00', 2, 'confirmed', 'date', JSON.stringify({}), '-1 days', '-1 days');
    resStmt.run(3, 3, 1, 3, null, today, '13:00', '15:00', 2, 'seated', 'business', JSON.stringify({}), '-1 days', '0 hours');
    resStmt.run(4, 4, 1, 5, null, saturday, '18:00', '20:00', 4, 'pending', 'family', JSON.stringify({ highChair: true, stroller: true }), '-3 hours', '-3 hours');
    resStmt.run(5, 1, 1, 3, null, lastWeek, '19:00', '21:00', 2, 'completed', 'casual', JSON.stringify({}), '-12 days', '-12 days');
    resStmt.run(6, 1, 2, 7, null, twoWeeksAgo, '20:00', '22:00', 2, 'completed', 'date', JSON.stringify({}), '-20 days', '-20 days');
    resStmt.run(7, 5, 1, 4, null, yesterday, '19:30', '21:30', 4, 'no_show', 'celebration', JSON.stringify({}), '-2 days', '-1 days');
    resStmt.run(8, 3, 1, 6, null, isoDate(-5, now), '13:30', '15:30', 3, 'completed', 'business', JSON.stringify({}), '-6 days', '-5 days');

    const histStmt = database.prepare(
      `INSERT INTO reservation_history (reservation_id, from_status, to_status, note) VALUES (?, ?, ?, ?)`,
    );
    histStmt.run(1, null, 'pending', 'Создана гостем');
    histStmt.run(1, 'pending', 'confirmed', 'Подтверждена хостес');
    histStmt.run(5, null, 'pending', 'Создана гостем');
    histStmt.run(5, 'pending', 'confirmed', null);
    histStmt.run(5, 'confirmed', 'seated', null);
    histStmt.run(5, 'seated', 'completed', null);
    histStmt.run(7, 'confirmed', 'no_show', 'Гость не пришёл');

    database.prepare(`INSERT INTO order_counters (location_id, last_number) VALUES (1, 1088)`).run();

    const orderStmt = database.prepare(
      `INSERT INTO orders (id, number, guest_id, location_id, reservation_id, table_id, type, status, pickup_at, comment, subtotal, total, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))`,
    );
    orderStmt.run(1, 'NB-1042', 1, 5, null, 'reservation_preorder', 'completed', null, 'Без лука в салате', 1760, 1760, '-12 days', '-12 days');
    orderStmt.run(2, 'NB-1051', 1, null, null, 'takeaway', 'completed', null, null, 1570, 1570, '-5 days', '-5 days');
    orderStmt.run(3, 'NB-1060', 2, 6, null, 'reservation_preorder', 'completed', null, null, 2140, 2140, '-20 days', '-20 days');
    orderStmt.run(4, 'NB-1072', 3, 8, 3, 'dine_in', 'preparing', null, null, 2660, 2660, '-1 hours', '-20 minutes');
    orderStmt.run(5, 'NB-1078', 4, null, null, 'takeaway', 'ready', isoDate(0, now) + 'T18:30:00', 'Детский какао без маршмеллоу', 1180, 1180, '-40 minutes', '-10 minutes');
    orderStmt.run(6, 'NB-1084', 1, 1, 7, 'reservation_preorder', 'confirmed', null, 'Закуски к 19:00', 1480, 1480, '-2 days', '-2 days');

    const oi = database.prepare(
      `INSERT INTO order_items (id, order_id, menu_item_id, name, quantity, unit_price, line_total, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    oi.run(1, 1, 14, 'Карбонара', 1, 790, 790, null);
    oi.run(2, 1, 17, 'Чизкейк', 1, 490, 490, null);
    oi.run(3, 1, 22, 'Капучино', 1, 280, 280, null);
    oi.run(4, 2, 14, 'Карбонара', 1, 790, 790, null);
    oi.run(5, 2, 15, 'Паста с креветками', 1, 920, 920, null);
    oi.run(6, 3, 1, 'Брускетта с томатами', 2, 420, 840, null);
    oi.run(7, 3, 7, 'Буррата с томатами', 1, 740, 740, null);
    oi.run(8, 3, 24, 'Бокал Pinot Noir', 1, 620, 620, null);
    oi.run(9, 4, 10, 'Стейк рибай', 1, 1890, 1890, null);
    oi.run(10, 4, 12, 'Сибас на гриле', 1, 1240, 1240, null);
    oi.run(11, 5, 6, 'Цезарь с цыплёнком', 1, 680, 680, null);
    oi.run(12, 5, 26, 'Детский какао', 1, 220, 220, null);
    oi.run(13, 5, 17, 'Чизкейк', 1, 490, 490, null);
    oi.run(14, 6, 1, 'Брускетта с томатами', 2, 420, 840, null);
    oi.run(15, 6, 5, 'Салат с киноа и авокадо', 1, 620, 620, null);

    database
      .prepare(
        `INSERT INTO order_item_modifiers (order_item_id, modifier_id, name, price_delta)
         VALUES (9, 2, 'Medium rare', 0), (5, 5, 'Пармезан extra', 80)`,
      )
      .run();
    database.prepare(`UPDATE order_items SET unit_price = 1000, line_total = 1000 WHERE id = 5`).run();
    database.prepare(`UPDATE orders SET subtotal = 1790, total = 1790 WHERE id = 2`).run();

    const acc = database.prepare(`INSERT INTO loyalty_accounts (id, guest_id, created_at) VALUES (?, ?, datetime('now', ?))`);
    acc.run(1, 1, '-40 days');
    acc.run(2, 2, '-90 days');
    acc.run(3, 3, '-60 days');
    acc.run(4, 4, '-30 days');

    const tx = database.prepare(
      `INSERT INTO loyalty_transactions (account_id, type, amount, order_id, note, idempotency_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))`,
    );
    tx.run(1, 'earned', 88, 1, '5% от заказа NB-1042', 'earn:order:1', '-12 days');
    tx.run(1, 'earned', 89, 2, '5% от заказа NB-1051', 'earn:order:2', '-5 days');
    tx.run(1, 'adjustment', 443, null, 'Приветственные бонусы постоянного гостя', 'adjust:welcome:1', '-30 days');
    tx.run(2, 'earned', 107, 3, '5% от заказа NB-1060', 'earn:order:3', '-20 days');
    tx.run(2, 'adjustment', 200, null, 'Компенсация за ожидание', 'adjust:wait:2', '-15 days');
    tx.run(3, 'adjustment', 180, null, 'Компенсация за задержку стейка', 'adjust:delay:3', '-8 days');
    tx.run(4, 'adjustment', 90, null, 'Приветственные бонусы', 'adjust:welcome:4', '-20 days');

    const wl = database.prepare(
      `INSERT INTO waitlist_entries (guest_id, location_id, date, preferred_time, party_size, dining_area_id, status)
       VALUES (?, 1, ?, ?, ?, ?, ?)`,
    );
    wl.run(5, friday, '19:00', 4, 2, 'waiting');
    wl.run(2, today, '21:00', 2, 2, 'offered');

    database
      .prepare(
        `INSERT INTO business_events (name, payload) VALUES
         ('guest.created', '{"guestId":1}'),
         ('reservation.created', '{"reservationId":1}'),
         ('order.completed', '{"orderId":1}')`,
      )
      .run();
  });

  run();
}
