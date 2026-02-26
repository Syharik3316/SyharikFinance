import React, { useCallback, useEffect, useRef, useState } from 'react';

// Производство за 1 поселенца в день (рынок даёт ракушки)
const PRODUCTION = { food: 4, wood: 3, stone: 2, market: 2 };
const FOOD_PER_COLONIST = 2;
const COLONISTS = 4;
const HAND_LIMIT = 60;
const WAREHOUSE_LIMIT = 200;
const RESOURCE_KEYS = ['food', 'wood', 'stone', 'coins'];

const HUT_LIMIT = 4;
const WATCHTOWER_REPAIR_WOOD = 5;
const WATCHTOWER_REPAIR_STONE = 5;
const STORM_BREAK_HUT_CHANCE = 0.5;
const VILLAGE_GIFT_DELAY_DAYS = 3;
const ZONE_UPGRADE_COST = 30; // ракушек за улучшение зоны +1 к добыче
const ZONE_UPGRADE_MAX = 2; // макс. улучшений на зону

const BUILDINGS = [
  { id: 'hut', name: 'Хижина', cost: { wood: 35 }, desc: 'Укрытие от непогоды (макс. 4 — по одной на поселенца)', emoji: '🏠', maxCount: HUT_LIMIT },
  { id: 'warehouse', name: 'Склад', cost: { wood: 60 }, desc: 'Хранить запасы на чёрный день', emoji: '🏪' },
  { id: 'workshop', name: 'Мастерская', cost: { wood: 90, stone: 30 }, desc: 'Инструменты увеличивают добычу', emoji: '🔨' },
  { id: 'watchtower', name: 'Сторожевая вышка', cost: { wood: 110, stone: 50 }, desc: 'Защита от пиратов', emoji: '🗼' },
];

const HAND_LIMIT_FULL = 60;
const WAREHOUSE_LIMIT_FULL = 200;

function isGame100Percent(g) {
  if (!g?.buildings || !g?.resources || !g?.warehouse) return false;
  const huts = typeof g.buildings.hut === 'number' ? g.buildings.hut : (g.buildings.hut === 2 ? 1 : 0);
  if (huts < HUT_LIMIT || g.buildings.warehouse !== 2 || g.buildings.workshop !== 2 || g.buildings.watchtower !== 2) return false;
  const r = g.resources;
  const w = g.warehouse;
  return (
    (r.food ?? 0) >= HAND_LIMIT_FULL && (r.wood ?? 0) >= HAND_LIMIT_FULL &&
    (r.stone ?? 0) >= HAND_LIMIT_FULL && (r.coins ?? 0) >= HAND_LIMIT_FULL &&
    (w.food ?? 0) >= WAREHOUSE_LIMIT_FULL && (w.wood ?? 0) >= WAREHOUSE_LIMIT_FULL &&
    (w.stone ?? 0) >= WAREHOUSE_LIMIT_FULL && (w.coins ?? 0) >= WAREHOUSE_LIMIT_FULL
  );
}

const EVENT_CHANCE = 0.45;

const RULES_TEXT = `Правила игры «Остров сокровищ»

Цель: развивать колонию, добывать ресурсы и переживать случайные события.

Ресурсы:
• 🍎 Еда — добывается на зоне «Сбор ягод / Рыбалка», тратится на питание (2 в день на каждого, всего 8 в день на всех). Если еды не хватает — игра заканчивается (голод).
• 🪵 Дерево — добывается в «Лесу», нужно для построек и ремонта.
• 🪨 Камень — добывается у «Скал», нужен для мастерской и вышки.
• 🐚 Ракушки — валюта. Зарабатываются на «Рынке» (поселенцы торгуют). Нужны для сделок и дани.

Лимиты:
• В руках: максимум 60 единиц каждого ресурса. Излишки автоматически переходят на склад (если склад построен).
• На складе: максимум 200 единиц каждого вида. Склад открывается кнопкой «Склад» после постройки.

Защищённый ресурс: в окне склада можно выбрать один вид ресурса — он не будет отниматься в случайных событиях (пираты, шторм и т.д.). Выбор можно менять в любой момент.

Ход игры:
1. Распредели поселенцев по зонам (перетаскиванием): лагерь — без дела, ягоды/рыбалка — еда, лес — дерево, скалы — камень, рынок — ракушки.
2. Нажми «Завершить день». Подсчитается добыча и расход еды.
3. После итогов дня может выпасть случайное событие — сделай выбор. Один вид ресурса (выбранный на складе) в событиях не теряется.
4. Строй здания в «Магазине построек», перетащи купленное только на территорию лагеря.

Постройки: Хижина — макс. 4 (по одной на поселенца; дают +1 к добыче и защиту от шторма). Склад (хранение до 200). Мастерская (улучшения зон за ракушки). Сторожевая вышка (защита от пиратов; при отражении нужен ремонт).

Цель: игру можно пройти, купив все строения и забив склад и руки ресурсами по максимуму (60 в руках и до 200 на складе каждого вида).`;

const EVENTS = [
  {
    id: 'storm',
    title: 'Шторм',
    text: 'Ночью был шторм. Хижина повреждена. Починить (36 дерева) или снести — хижина пропадёт с карты.',
    choices: [
      { label: 'Починить (36 дерева)', cost: { wood: 36 }, effect: 'fixed', voluntaryCost: true, tip: 'Затраты сейчас — спокойствие потом.' },
      { label: 'Снести (потерять хижину)', cost: {}, effect: 'hut_removed', voluntaryCost: false, tip: 'Без ремонта постройка теряется.' },
    ],
  },
  {
    id: 'storm_no_hut',
    title: 'Шторм',
    text: 'Ночью сильный шторм. Без хижин один поселенец заболел и не сможет работать 3 дня.',
    choices: [
      { label: 'Понятно', cost: {}, effect: 'sick_settler', voluntaryCost: false, tip: 'Укрытие защищает от непогоды и болезней.' },
    ],
  },
  {
    id: 'pirates',
    title: 'Пираты',
    text: 'К берегу причалили пираты. Требуют дань. Можно отдать все ракушки, отказаться (тогда заберут понемногу) или отбиться вышкой (но её придётся чинить).',
    choices: [
      { label: 'Отдать все ракушки', cost: {}, effect: 'pirates_give_all', voluntaryCost: false, tip: 'Иногда откупиться — самый разумный выбор.' },
      { label: 'Отбиться (есть вышка)', cost: {}, effect: 'fight', requireBuilding: 'watchtower', voluntaryCost: false, tip: 'Защита окупается, но ремонт стоит полцены вышки.' },
      { label: 'Отказаться (нет вышки)', cost: {}, effect: 'robbed', requireNoBuilding: 'watchtower', robbed: { coins: 24, food: 8, wood: 10 }, voluntaryCost: false, tip: 'Без защиты можно потерять ресурсы.' },
    ],
  },
  {
    id: 'trade_ship',
    title: 'Торговый корабль',
    text: 'Купцы предлагают обмен: 7 камней на 12 еды. Выгодно ли?',
    choices: [
      { label: 'Обменять (14 камня → 24 еды)', cost: { stone: 14 }, gain: { food: 24 }, effect: 'trade', voluntaryCost: true, tip: 'Обмен выгоден, когда у тебя много одного и мало другого.' },
      { label: 'Отказаться', cost: {}, effect: 'skip', voluntaryCost: false, tip: 'Не всегда нужно соглашаться на сделку.' },
    ],
  },
  {
    id: 'stranger',
    title: 'Незнакомец',
    text: 'Чужеземец предлагает обменять «золотую» монету на 6 обычных ракушек. Выглядит подозрительно...',
    choices: [
      { label: 'Согласиться', cost: { coins: 6 }, effect: 'scam', voluntaryCost: true, tip: 'Слишком выгодное предложение часто обман.' },
      { label: 'Отказаться', cost: {}, effect: 'safe', voluntaryCost: false, tip: 'Осторожность сберегла ресурсы.' },
    ],
  },
  {
    id: 'trader_debt',
    title: 'Торговец в долг',
    text: 'Торговец предлагает 60 еды сейчас — через 5 дней вернуть 80. Занять? (Режим Знаток)',
    expertOnly: true,
    choices: [
      { label: 'Взять в долг (60 еды → вернуть 80 через 5 дней)', cost: {}, effect: 'debt', gain: { food: 60 }, debt: { resource: 'food', amount: 80, dueDay: 5 }, voluntaryCost: false, tip: 'Кредит — не подарок, его нужно отдавать.' },
      { label: 'Отказаться', cost: {}, effect: 'skip', voluntaryCost: false, tip: 'Иногда лучше обойтись без долгов.' },
    ],
  },
  {
    id: 'windfall',
    title: 'Удача',
    text: 'На берегу нашли выброшенный ящик: 10 дерева и 6 ракушек.',
    choices: [
      { label: 'Забрать', cost: {}, gain: { wood: 10, coins: 6 }, effect: 'windfall', voluntaryCost: false, tip: 'Случайная удача помогает колонии.' },
    ],
  },
  {
    id: 'berries',
    title: 'Урожай ягод',
    text: 'Поселенцы нашли богатую поляну. +12 еды бесплатно.',
    choices: [
      { label: 'Собрать', cost: {}, gain: { food: 12 }, effect: 'berries', voluntaryCost: false, tip: 'Разнообразие источников еды снижает риск.' },
    ],
  },
  {
    id: 'savings_lesson',
    title: 'Совет старейшины',
    text: 'Старейшина говорит: «Кто откладывает часть добычи на склад — тот переживёт неурожай». Построить склад (60 дерева)?',
    choices: [
      { label: 'Построить склад', cost: { wood: 60 }, effect: 'warehouse_advice', voluntaryCost: true, tip: 'Накопления помогают в кризис.' },
      { label: 'Пока не буду', cost: {}, effect: 'skip', voluntaryCost: false, tip: 'Планировать запасы — основа финансовой безопасности.' },
    ],
  },
  {
    id: 'price_compare',
    title: 'Два торговца',
    text: 'Один торговец: 24 еды за 20 ракушек. Другой: 24 еды за 14 ракушек. К кому идти?',
    choices: [
      { label: 'За 14 ракушек (выгоднее)', cost: { coins: 14 }, gain: { food: 24 }, effect: 'smart_buy', voluntaryCost: true, tip: 'Сравнивай цены — так экономятся ресурсы.' },
      { label: 'За 20 ракушек', cost: { coins: 20 }, gain: { food: 24 }, effect: 'overpay', voluntaryCost: true, tip: 'Всегда сравнивай предложения перед сделкой.' },
      { label: 'Отказаться', cost: {}, effect: 'skip', voluntaryCost: false, tip: 'Не всегда нужно соглашаться на сделку.' },
    ],
  },
  {
    id: 'need_vs_want',
    title: 'Соблазн',
    text: 'Купцы везут украшения: красиво, но бесполезно для выживания. Купить за 44 ракушки?',
    choices: [
      { label: 'Купить (хочу!)', cost: { coins: 44 }, effect: 'want', voluntaryCost: true, tip: 'Сначала нужды (еда, кров), потом желания.' },
      { label: 'Нет, сэкономим на важное', cost: {}, effect: 'need', voluntaryCost: false, tip: 'Различать «нужно» и «хочу» — основа бюджета.' },
    ],
  },
  {
    id: 'insurance_idea',
    title: 'Подстраховка',
    text: 'Кто-то из поселенцев мимоходом замечает: «Запасы на чёрный день — как страховка: надеешься, что не пригодится, но спокойнее, когда они есть».',
    choices: [
      { label: 'Понял, буду копить на чёрный день', cost: {}, effect: 'lesson', voluntaryCost: false, tip: 'Резерв на кризис — часть финансовой грамотности.' },
    ],
  },
  {
    id: 'scam_offer',
    title: '«Супер-предложение»',
    text: 'Незнакомец: «Дам 50 еды за 10 ракушек! Только сейчас!» Слишком дёшево — подозрительно.',
    choices: [
      { label: 'Согласиться', cost: { coins: 10 }, effect: 'scam_lose', voluntaryCost: true, tip: 'Если предложение «слишком хорошее» — часто обман.' },
      { label: 'Отказаться', cost: {}, effect: 'scam_avoid', voluntaryCost: false, tip: 'Осторожность с незнакомыми сделками сберегла ресурсы.' },
    ],
  },
  {
    id: 'share_resources',
    title: 'Соседи просят помощи',
    text: 'Соседний лагерь голодает. Поделиться 16 едой? Доброта может вернуться помощью позже.',
    choices: [
      { label: 'Поделиться (16 еды)', cost: { food: 16 }, effect: 'share', voluntaryCost: true, tip: 'Взаимопомощь и репутация тоже ценны.' },
      { label: 'Извиниться, не можем', cost: {}, effect: 'skip', voluntaryCost: false, tip: 'Сначала обеспечивать свою колонию — разумно.' },
    ],
  },
  {
    id: 'ruins',
    title: 'Жизнь в руинах',
    text: 'Одна из хижин разрушена и не починена. Поселенцы жалуются: в руинах хуже отдыхать — работа идёт медленнее.',
    choices: [
      { label: 'Понятно', cost: {}, effect: 'skip', voluntaryCost: false, tip: 'Почини хижину в следующем шторме или потеряешь её.' },
    ],
  },
];

const EVENT_LESSONS = {
  storm: 'Укрытие защищает от непогоды. Ремонт вовремя сохраняет постройку.',
  storm_no_hut: 'Хижины дают крышу над головой и снижают болезни. Строй по одной на каждого поселенца (макс. 4).',
  pirates: 'Защита (вышка) или дань — два способа снизить потери. Ремонт после боя тоже часть расходов.',
  trade_ship: 'Обмен выгоден, когда у тебя много одного и мало другого. Сравнивай что отдаёшь и что получаешь.',
  stranger: 'Слишком выгодные предложения от незнакомцев часто обман. Доверяй, но проверяй.',
  price_compare: 'Сравнивай цены у разных продавцов — так экономятся деньги.',
  need_vs_want: 'Сначала нужды (еда, кров, безопасность), потом желания. Так строится бюджет.',
  share_resources: 'Доброта и репутация ценны. Помощь соседям может вернуться подарком.',
  scam_offer: '«Слишком хорошее» предложение — повод насторожиться. Осторожность сберегает ресурсы.',
  savings_lesson: 'Склад — запас на чёрный день. Один защищённый вид ресурса не отнимут в событиях.',
  berries: 'Разнообразие источников еды снижает риск. Не клади все яйца в одну корзину.',
  insurance_idea: 'Резерв на ремонт и кризис — как страховка. Копи на непредвиденное.',
  ruins: 'Разрушенная постройка без ремонта теряется. Своевременный ремонт выгоднее потери.',
};

const JOB_ZONES = ['camp', 'food', 'wood', 'stone', 'market'];

function assignmentFromSettlers(settlers) {
  const a = { camp: 0, food: 0, wood: 0, stone: 0, market: 0 };
  (settlers || []).forEach((s) => { a[s.job] = (a[s.job] || 0) + 1; });
  return a;
}

/** Количество рабочих (без лагеря), с учётом больного поселенца: один не работает пока sickSettlerDaysLeft > 0 */
function effectiveWorkers(assign, sickDaysLeft) {
  const total = (assign.food || 0) + (assign.wood || 0) + (assign.stone || 0) + (assign.market || 0);
  const sick = sickDaysLeft > 0 ? 1 : 0;
  const effective = Math.max(0, total - sick);
  const food = assign.food || 0;
  const wood = assign.wood || 0;
  const stone = assign.stone || 0;
  const market = assign.market || 0;
  let rest = effective;
  const eFood = Math.min(food, rest);
  rest -= eFood;
  const eWood = Math.min(wood, rest);
  rest -= eWood;
  const eStone = Math.min(stone, rest);
  rest -= eStone;
  const eMarket = Math.min(market, rest);
  return { food: eFood, wood: eWood, stone: eStone, market: eMarket };
}

/** Эффективное число хижин (построены и не сломаны). Для бонуса +1 к добыче на каждую хижину. */
function effectiveHuts(g) {
  const huts = typeof g?.buildings?.hut === 'number' ? g.buildings.hut : 0;
  const broken = g?.brokenHuts || 0;
  return Math.max(0, huts - broken);
}

/** Бонус производства от хижин: первые effectiveHuts рабочих получают +1 (распределяем по зонам по порядку). */
function hutBonusPerZone(assign, effectiveHutsCount) {
  let left = effectiveHutsCount;
  const food = Math.min(assign.food || 0, left);
  left -= food;
  const wood = Math.min(assign.wood || 0, left);
  left -= wood;
  const stone = Math.min(assign.stone || 0, left);
  left -= stone;
  const market = Math.min(assign.market || 0, left);
  return { food, wood, stone, market };
}

function getInitialState(difficulty) {
  return {
    resources: { food: 12, wood: 10, stone: 5, coins: 8 },
    warehouse: { food: 0, wood: 0, stone: 0, coins: 0 },
    protectedResourceType: null,
    eventLog: [],
    buildings: { hut: 0, warehouse: 0, workshop: 0, watchtower: 0 },
    buildingPlacement: {},
    brokenHuts: 0,
    sickSettlerDaysLeft: 0,
    sharedWithVillageDay: null,
    villageGiftDay: null,
    zoneUpgrades: { food: 0, wood: 0, stone: 0, market: 0 },
    settlers: [
      { id: 0, job: 'camp' },
      { id: 1, job: 'camp' },
      { id: 2, job: 'camp' },
      { id: 3, job: 'camp' },
    ],
    lastReport: null,
    debt: null,
    event: null,
    phase: 'assign',
    tipsSeen: {},
    sadPenalty: 0,
  };
}

function normalizeLoadedState(state) {
  if (!state) return state;
  const out = { ...state };
  if (!state.warehouse) out.warehouse = { food: 0, wood: 0, stone: 0, coins: 0 };
  if (state.protectedResourceType === undefined) out.protectedResourceType = null;
  if (!Array.isArray(state.eventLog)) out.eventLog = state.eventLog ? [state.eventLog] : [];
  if (out.brokenHuts == null) out.brokenHuts = 0;
  if (out.sickSettlerDaysLeft == null) out.sickSettlerDaysLeft = 0;
  if (out.sharedWithVillageDay == null) out.sharedWithVillageDay = null;
  if (out.villageGiftDay == null) out.villageGiftDay = null;
  if (!out.zoneUpgrades) out.zoneUpgrades = { food: 0, wood: 0, stone: 0, market: 0 };
  if (out.buildings && (out.buildings.hut === 1 || out.buildings.hut === 2)) {
    out.buildings = { ...out.buildings, hut: 1 };
    if (!out.buildingPlacement?.hut) out.buildingPlacement = { ...(out.buildingPlacement || {}), hut: { zoneId: 'camp', x: 50, y: 50 } };
  }
  if (typeof out.buildings?.hut === 'number' && out.buildings.hut > HUT_LIMIT) out.buildings = { ...out.buildings, hut: HUT_LIMIT };
  if (state.settlers && Array.isArray(state.settlers)) {
    out.settlers = state.settlers.map((s) => ({ ...s, job: s.job === 'build' ? 'market' : s.job }));
    return out;
  }
  const assignment = state.assignment || { food: 2, wood: 1, stone: 0, market: 1 };
  const settlers = [];
  let id = 0;
  ['food', 'wood', 'stone', 'market'].forEach((job) => {
    const n = Math.max(0, assignment[job] || assignment[job === 'market' ? 'build' : job] || 0);
    for (let i = 0; i < n; i++) settlers.push({ id: id++, job });
  });
  while (settlers.length < COLONISTS) settlers.push({ id: id++, job: 'camp' });
  out.settlers = settlers;
  return out;
}

function canAfford(resources, cost) {
  return Object.entries(cost).every(([k, v]) => (resources[k] || 0) >= v);
}

/** Учитывает руку + склад при проверке возможности оплаты (здания, сделки в событиях). */
function canAffordWithWarehouse(resources, warehouse, cost) {
  const wh = warehouse || {};
  return Object.entries(cost || {}).every(([k, v]) => ((resources[k] || 0) + (wh[k] || 0)) >= v);
}

/** Списывает cost с руки, при нехватке — со склада. Возвращает { resources, warehouse }. */
function payFromHandAndWarehouse(resources, warehouse, cost) {
  const res = { ...resources };
  const wh = { ...(warehouse || {}) };
  Object.entries(cost || {}).forEach(([k, v]) => {
    let need = v;
    const fromHand = Math.min(res[k] || 0, need);
    res[k] = (res[k] || 0) - fromHand;
    need -= fromHand;
    if (need > 0) {
      const fromWh = Math.min(wh[k] || 0, need);
      wh[k] = (wh[k] || 0) - fromWh;
    }
  });
  return { resources: res, warehouse: wh };
}

/** Добровольная оплата: списывает даже защищённый ресурс (торговля, ремонт, подарок). */
function payFromHandAndWarehouseVoluntary(resources, warehouse, cost) {
  return payFromHandAndWarehouse(resources, warehouse, cost || {});
}

/** Принудительные потери (грабёж, шторм): защищённый тип не трогаем. Списываем с руки, потом со склада. */
function takeFromHandAndWarehouseForced(resources, warehouse, amounts, protectedType) {
  const res = { ...resources };
  const wh = { ...(warehouse || {}) };
  RESOURCE_KEYS.forEach((k) => {
    if (k === protectedType) return;
    const want = amounts[k] || 0;
    if (want <= 0) return;
    let fromHand = Math.min(res[k] || 0, want);
    res[k] = (res[k] || 0) - fromHand;
    let rest = want - fromHand;
    if (rest > 0) {
      const fromWh = Math.min(wh[k] || 0, rest);
      wh[k] = (wh[k] || 0) - fromWh;
    }
  });
  return { resources: res, warehouse: wh };
}

function applyCost(resources, cost) {
  const r = { ...resources };
  Object.entries(cost).forEach(([k, v]) => { r[k] = Math.max(0, (r[k] || 0) - v); });
  return r;
}

function applyGain(resources, gain) {
  const r = { ...resources };
  Object.entries(gain || {}).forEach(([k, v]) => { r[k] = (r[k] || 0) + v; });
  return r;
}

function capHandAndWarehouse(resources, warehouse, hasWarehouse) {
  const hand = { ...resources };
  const wh = { ...warehouse };
  RESOURCE_KEYS.forEach((key) => {
    let v = hand[key] || 0;
    const excess = Math.max(0, v - HAND_LIMIT);
    if (hasWarehouse && excess > 0) {
      const toStore = Math.min(excess, WAREHOUSE_LIMIT - (wh[key] || 0));
      hand[key] = (hand[key] || 0) - toStore;
      wh[key] = (wh[key] || 0) + toStore;
    } else {
      hand[key] = Math.min(HAND_LIMIT, v);
    }
  });
  return { hand, warehouse: wh };
}

function applyCostIgnoreProtected(resources, cost, protectedType) {
  const r = { ...resources };
  Object.entries(cost || {}).forEach(([k, v]) => {
    if (k === protectedType) return;
    r[k] = Math.max(0, (r[k] || 0) - v);
  });
  return r;
}

function canAffordIgnoringProtected(resources, cost, protectedType) {
  return Object.entries(cost || {}).every(([k, v]) => k === protectedType || (resources[k] || 0) >= v);
}

function canAffordIgnoringProtectedWithWarehouse(resources, warehouse, cost, protectedType) {
  const wh = warehouse || {};
  return Object.entries(cost || {}).every(
    ([k, v]) => k === protectedType || ((resources[k] || 0) + (wh[k] || 0)) >= v
  );
}

const ZONE_IDS = ['camp', 'food', 'wood', 'stone', 'market'];
const ZONE_LABELS = {
  camp: '🏕 Лагерь',
  food: '🍎 Сбор ягод / Рыбалка',
  wood: '🪵 Лес',
  stone: '🪨 Скалы',
  market: '🐚 Рынок',
};

// Статичные картинки зон из проекта (файлы в public/island-zones/) — игроки не настраивают фоны
const ZONE_STATIC_IMAGES = {
  camp: '/island-zones/camp.jpg',
  food: '/island-zones/food.jpg',
  wood: '/island-zones/wood.jpg',
  stone: '/island-zones/stone.jpg',
  market: '/island-zones/market.jpg',
};

export default function IslandGame({ apiBase, apiFetch, user, difficulty, onBack, onUserUpdated }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [game, setGame] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [report, setReport] = useState(null);
  const [eventModal, setEventModal] = useState(null);
  const [gameOverModal, setGameOverModal] = useState(null);
  const [tip, setTip] = useState(null);
  const [lastEventMessage, setLastEventMessage] = useState(null);
  const [dragOverZone, setDragOverZone] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(null); // 'shop' | 'log' | null
  const [confirmReset, setConfirmReset] = useState(false);
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [workshopModalOpen, setWorkshopModalOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [showRulesBeforeStart, setShowRulesBeforeStart] = useState(false);
  const [gameOverMeta, setGameOverMeta] = useState(null);
  const [eventOutro, setEventOutro] = useState(null);

  const loadGame = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiBase}/island-game`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.state && data.gameOver) {
          await apiFetch(`${apiBase}/island-game`, { method: 'DELETE' }).catch(() => {});
          setGame(null);
          setPhase('menu');
          setLoading(false);
          return;
        }
        if (data && data.state) {
          const state = normalizeLoadedState(data.state);
          setGame({
            difficulty: data.difficulty || difficulty,
            dayCount: data.dayCount || 1,
            gameOver: data.gameOver,
            ...state,
          });
          setPhase('assign');
          setReport(null);
          setEventModal(null);
        } else {
          setGame(null);
          setPhase('menu');
        }
      } else {
        setGame(null);
        setPhase('menu');
      }
    } catch {
      setGame(null);
      setPhase('menu');
    } finally {
      setLoading(false);
    }
  }, [apiBase, apiFetch, difficulty]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  useEffect(() => {
    return () => {
      if (game && !game.gameOver && phase === 'assign') {
        apiFetch(`${apiBase}/island-game`, {
          method: 'POST',
          body: JSON.stringify({
            difficulty: game.difficulty,
            dayCount: game.dayCount,
            gameOver: null,
            state: game,
          }),
        }).catch(() => {});
      }
    };
  }, [apiBase, apiFetch, game, phase]);

  const saveGame = useCallback(async (payload) => {
    if (!payload) return;
    setSaving(true);
    try {
      const res = await apiFetch(`${apiBase}/island-game`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.ok && payload.gameOver) {
        const data = await res.json().catch(() => ({}));
        if (data.bestDaysUpdated || (data.achievementsUnlocked && data.achievementsUnlocked.length)) {
          setGameOverMeta({
            bestDaysUpdated: data.bestDaysUpdated,
            newBestDays: data.newBestDays,
            achievementsUnlocked: data.achievementsUnlocked || [],
          });
        }
      }
      return res;
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }, [apiBase, apiFetch]);

  const deleteGameSave = useCallback(async () => {
    try {
      await apiFetch(`${apiBase}/island-game`, { method: 'DELETE' });
    } catch {
      // ignore
    }
  }, [apiBase, apiFetch]);

  const startNewGame = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${apiBase}/island-game/start`, {
        method: 'POST',
        body: JSON.stringify({ difficulty }),
      });
      if (res.ok) {
        const data = await res.json();
        setGame({
          difficulty: data.difficulty,
          dayCount: data.dayCount,
          gameOver: null,
          ...data.state,
        });
        setPhase('assign');
        setReport(null);
        setEventModal(null);
        setGameOverModal(null);
        setGameOverMeta(null);
      }
    } catch {
      setPhase('menu');
    } finally {
      setLoading(false);
    }
  }, [apiBase, apiFetch, difficulty]);

  const runDay = useCallback(() => {
    if (!game || game.gameOver) return;
    const g = { ...game };
    const res = { ...g.resources };
    const wh = g.warehouse || { food: 0, wood: 0, stone: 0, coins: 0 };
    const assign = assignmentFromSettlers(g.settlers);
    const sickDays = g.sickSettlerDaysLeft || 0;
    const eff = effectiveWorkers(assign, sickDays);
    const upgrades = g.zoneUpgrades || { food: 0, wood: 0, stone: 0, market: 0 };
    const hutBonus = hutBonusPerZone(eff, effectiveHuts(g));
    const prod = {
      food: eff.food * PRODUCTION.food + (upgrades.food || 0) + hutBonus.food,
      wood: eff.wood * PRODUCTION.wood + (upgrades.wood || 0) + hutBonus.wood,
      stone: eff.stone * PRODUCTION.stone + (upgrades.stone || 0) + hutBonus.stone,
      coins: eff.market * PRODUCTION.market + (upgrades.market || 0) + hutBonus.market,
    };
    if (sickDays > 0) {
      g.sickSettlerDaysLeft = sickDays - 1;
    }
    const nextDay = (g.dayCount || 1) + 1;
    if (g.sharedWithVillageDay != null && nextDay >= g.sharedWithVillageDay + VILLAGE_GIFT_DELAY_DAYS && g.villageGiftDay == null) {
      g.villageGiftDay = nextDay;
      res.food = (res.food || 0) + 10;
      res.wood = (res.wood || 0) + 6;
      g.eventLog = (g.eventLog || []).slice(-49);
      g.eventLog.push({ day: nextDay, type: 'event', message: `День ${nextDay}: соседняя деревня прислала подарок за помощь: +10 еды, +6 дерева. Добро возвращается!` });
    }
    const consumed = COLONISTS * FOOD_PER_COLONIST;
    res.food = (res.food || 0) + prod.food - consumed;
    res.wood = (res.wood || 0) + prod.wood;
    res.stone = (res.stone || 0) + prod.stone;
    res.coins = (res.coins || 0) + prod.coins;
    const hunger = res.food < 0;
    if (hunger) {
      g.gameOver = 'hunger';
      g.resources = applyGain(applyCost(res, {}), {});
      g.resources.food = 0;
      setGame(g);
      setPhase('gameover');
      setGameOverModal({ reason: 'hunger', message: 'Еды не хватило. Колония не пережила голод.' });
      saveGame({ difficulty: g.difficulty, dayCount: g.dayCount, gameOver: 'hunger', state: g }).then(() => deleteGameSave());
      return;
    }
    const hasWarehouse = g.buildings?.warehouse === 2;
    const { hand, warehouse: newWh } = capHandAndWarehouse(res, wh, hasWarehouse);
    g.resources = hand;
    g.warehouse = newWh;
    g.dayCount = (g.dayCount || 1) + 1;
    if (g.debt && g.debt.dueDay <= g.dayCount) {
      const need = g.debt.amount;
      const have = g.resources[g.debt.resource] || 0;
      if (have < need) {
        g.gameOver = 'debt';
        setGame(g);
        setPhase('gameover');
        setGameOverModal({ reason: 'debt', message: 'Не вернули долг вовремя. Торговец забрал всё.' });
        saveGame({ difficulty: g.difficulty, dayCount: g.dayCount, gameOver: 'debt', state: g }).then(() => deleteGameSave());
        return;
      }
      g.resources[g.debt.resource] = have - need;
      g.debt = null;
    }
    g.lastReport = { produced: prod, consumed, food: hand.food, wood: hand.wood, stone: hand.stone, coins: hand.coins };
    g.phase = 'report';
    g.eventLog = (g.eventLog || []).slice(-49);
    g.eventLog.push({
      day: g.dayCount,
      type: 'day',
      message: `День ${g.dayCount}: добыто 🍎${prod.food} 🪵${prod.wood} 🪨${prod.stone} 🐚${prod.coins}, съедено ${consumed} еды. Остаток: 🍎${hand.food} 🪵${hand.wood} 🪨${hand.stone} 🐚${hand.coins}`,
    });
    if (isGame100Percent(g)) {
      g.gameOver = 'victory';
      setGame(g);
      setPhase('gameover');
      setReport(null);
      setGameOverModal({
        reason: 'victory',
        message: 'Поздравляем! Ты полностью развил колонию: все постройки на карте, руки и склад заполнены по максимуму. Игра пройдена на 100%.',
      });
      saveGame({ difficulty: g.difficulty, dayCount: g.dayCount, gameOver: 'victory', state: g }).then(() => deleteGameSave());
    } else {
      setGame(g);
      setReport(g.lastReport);
      setPhase('report');
      saveGame({ difficulty: g.difficulty, dayCount: g.dayCount, gameOver: null, state: g });
    }
    // 1 прожитый день = 1 алмаз (начисляются без уведомления)
    apiFetch(`${apiBase}/me/gems`, {
      method: 'POST',
      body: JSON.stringify({ amount: 1 }),
    }).then((res) => {
      if (res.ok && onUserUpdated) onUserUpdated();
    }).catch(() => {});
  }, [apiBase, apiFetch, game, onUserUpdated, saveGame, deleteGameSave]);

  const closeReport = useCallback(() => {
    setReport(null);
    if (!game) return;
    if (Math.random() >= EVENT_CHANCE) {
      setPhase('assign');
      return;
    }
    const huts = typeof game.buildings?.hut === 'number' ? game.buildings.hut : (game.buildings?.hut === 2 ? 1 : 0);
    const hasWarehouse = game.buildings?.warehouse === 2;
    const brokenHuts = game.brokenHuts || 0;
    let evPool = EVENTS.filter((e) => {
      if (e.expertOnly && game.difficulty !== 'expert') return false;
      if (e.id === 'savings_lesson' || e.id === 'berries') return !hasWarehouse;
      if (e.id === 'ruins') return brokenHuts > 0;
      if (e.id === 'storm_no_hut') return huts === 0;
      if (e.id === 'storm') return huts >= 1 && huts < HUT_LIMIT && brokenHuts === 0;
      if (e.id === 'pirates') return true;
      return true;
    });
    if (evPool.length === 0) evPool = EVENTS.filter((e) => !e.expertOnly || game.difficulty === 'expert');
    let ev = evPool[Math.floor(Math.random() * evPool.length)];
    if (ev.id === 'storm' && huts >= 1) {
      const breakHut = Math.random() < STORM_BREAK_HUT_CHANCE;
      if (breakHut) {
        const g = { ...game, brokenHuts: 1 };
        setGame(g);
        saveGame({ difficulty: g.difficulty, dayCount: g.dayCount, gameOver: null, state: g });
      } else {
        ev = EVENTS.find((e) => e.id === 'insurance_idea') || ev;
      }
    }
    setEventModal(ev);
    setPhase('event');
  }, [game, saveGame]);

  const pickEventChoice = useCallback((eventId, choiceIndex) => {
    if (!game || !eventModal) return;
    const ev = EVENTS.find((e) => e.id === eventId) || eventModal;
    const choice = ev.choices[choiceIndex];
    if (!choice) return;
    const voluntaryCost = choice.voluntaryCost === true;
    if (voluntaryCost && Object.keys(choice.cost || {}).some((k) => (choice.cost[k] || 0) > 0)) {
      if (!canAffordWithWarehouse(game.resources, game.warehouse, choice.cost)) return;
    }
    const g = { ...game };
    let res = { ...g.resources };
    let wh = { ...(g.warehouse || { food: 0, wood: 0, stone: 0, coins: 0 }) };
    const protectedType = g.protectedResourceType || null;
    let logMessage = '';
    const hasTower = g.buildings?.watchtower === 2;

    if (choice.effect === 'pirates_give_all') {
      const allCoins = (res.coins || 0) + (wh.coins || 0);
      const paid = payFromHandAndWarehouseVoluntary(res, wh, { coins: allCoins });
      res = paid.resources;
      wh = paid.warehouse;
      g.resources = res;
      g.warehouse = wh;
      logMessage = `День ${g.dayCount}: «${ev.title}» — отдали все ракушки (${allCoins}).`;
    } else if (choice.effect === 'fight' && hasTower) {
      const repairCost = { wood: WATCHTOWER_REPAIR_WOOD, stone: WATCHTOWER_REPAIR_STONE };
      if (!canAffordWithWarehouse(res, wh, repairCost)) return;
      const paid = payFromHandAndWarehouseVoluntary(res, wh, repairCost);
      g.resources = paid.resources;
      g.warehouse = paid.warehouse;
      logMessage = `День ${g.dayCount}: «${ev.title}» — отбились. Починка вышки: 🪵${WATCHTOWER_REPAIR_WOOD} 🪨${WATCHTOWER_REPAIR_STONE}.`;
    } else if (choice.effect === 'robbed') {
      const robbed = choice.robbed || { coins: 12, food: 4, wood: 5 };
      const taken = takeFromHandAndWarehouseForced(res, wh, robbed, protectedType);
      g.resources = taken.resources;
      g.warehouse = taken.warehouse;
      const desc = Object.entries(robbed).filter(([, v]) => v > 0).map(([k, v]) => `${k === 'coins' ? '🐚' : k === 'food' ? '🍎' : k === 'wood' ? '🪵' : '🪨'}${v}`).join(' ');
      logMessage = `День ${g.dayCount}: «${ev.title}» — отказались, пираты забрали: ${desc}.`;
    } else if (choice.effect === 'fixed') {
      if (!canAffordWithWarehouse(res, wh, choice.cost)) return;
      const paid = payFromHandAndWarehouseVoluntary(res, wh, choice.cost);
      g.resources = paid.resources;
      g.warehouse = paid.warehouse;
      g.brokenHuts = 0;
      logMessage = `День ${g.dayCount}: «${ev.title}» — починено (36 дерева).`;
    } else if (choice.effect === 'hut_removed') {
      g.buildings = { ...g.buildings, hut: Math.max(0, (g.buildings.hut || 0) - 1) };
      g.brokenHuts = 0;
      logMessage = `День ${g.dayCount}: «${ev.title}» — хижина снесена, потеряна.`;
    } else if (choice.effect === 'sick_settler') {
      g.sickSettlerDaysLeft = 3;
      logMessage = `День ${g.dayCount}: «${ev.title}» — один поселенец заболел на 3 дня.`;
    } else if (choice.effect === 'share') {
      if (!canAffordWithWarehouse(res, wh, choice.cost)) return;
      const paid = payFromHandAndWarehouseVoluntary(res, wh, choice.cost);
      g.resources = paid.resources;
      g.warehouse = paid.warehouse;
      g.sharedWithVillageDay = g.dayCount;
      logMessage = `День ${g.dayCount}: «${ev.title}» — поделились 16 едой. Деревня может отблагодарить позже.`;
    } else if (voluntaryCost && (choice.cost && Object.keys(choice.cost).length > 0 || choice.gain)) {
      if (choice.cost && Object.keys(choice.cost).length > 0 && !canAffordWithWarehouse(res, wh, choice.cost)) return;
      const costToPay = voluntaryCost ? (choice.cost || {}) : {};
      const paid = payFromHandAndWarehouseVoluntary(res, wh, costToPay);
      g.resources = applyGain(paid.resources, choice.gain);
      g.warehouse = paid.warehouse;
      if (choice.debt) g.debt = { ...choice.debt, dueDay: game.dayCount + (choice.debt.dueDay || 5) };
      if (choice.effect === 'sad') g.sadPenalty = 1;
      if (choice.effect === 'fixed') g.sadPenalty = 0;
      const costDesc = Object.entries(choice.cost || {}).filter(([, v]) => v > 0).map(([k, v]) => `${k === 'food' ? '🍎' : k === 'wood' ? '🪵' : k === 'stone' ? '🪨' : '🐚'}${v}`).join(', ') || '—';
      const gainDesc = choice.gain ? Object.entries(choice.gain).map(([k, v]) => `${k === 'food' ? '🍎' : k === 'wood' ? '🪵' : k === 'stone' ? '🪨' : '🐚'}+${v}`).join(' ') : '';
      logMessage = `День ${g.dayCount}: «${ev.title}» — ${choice.label}. Потрачено: ${costDesc}${gainDesc ? `. Получено: ${gainDesc}` : ''}`;
    } else {
      g.resources = applyGain(res, choice.gain);
      if (choice.debt) g.debt = { ...choice.debt, dueDay: game.dayCount + (choice.debt.dueDay || 5) };
      if (choice.effect === 'sad') g.sadPenalty = 1;
      const gainDesc = choice.gain ? Object.entries(choice.gain).map(([k, v]) => `${k === 'food' ? '🍎' : k === 'wood' ? '🪵' : k === 'stone' ? '🪨' : '🐚'}+${v}`).join(' ') : '';
      logMessage = `День ${g.dayCount}: «${ev.title}» — ${choice.label}${gainDesc ? `. Получено: ${gainDesc}` : ''}`;
    }

    if (logMessage) {
      g.eventLog = (g.eventLog || []).slice(-49);
      g.eventLog.push({ day: g.dayCount, type: 'event', message: logMessage });
    }
    setGame(g);
    setEventModal(null);
    const lesson = EVENT_LESSONS[ev.id] || choice.tip || '';
    setEventOutro({ title: ev.title, tip: choice.tip, lesson });
    setPhase('event_outro');
    saveGame({ difficulty: g.difficulty, dayCount: g.dayCount, gameOver: null, state: g });
  }, [game, eventModal, saveGame]);

  const getDropPercent = useCallback((e) => {
    const el = e.currentTarget;
    if (!el) return { x: 50, y: 50 };
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  }, []);

  const moveSettler = useCallback((settlerId, toJob, xPercent, yPercent) => {
    if (!game || !JOB_ZONES.includes(toJob)) return;
    const g = { ...game };
    g.settlers = (g.settlers || []).map((s) =>
      s.id === settlerId ? { ...s, job: toJob, x: xPercent, y: yPercent } : s
    );
    setGame(g);
  }, [game]);

  const placeBuilding = useCallback((buildingId, zoneId, xPercent, yPercent) => {
    if (!game) return;
    const status = game.buildings[buildingId];
    if (status !== 1) return;
    const g = { ...game };
    g.buildings = { ...g.buildings, [buildingId]: 2 };
    g.buildingPlacement = { ...(g.buildingPlacement || {}), [buildingId]: { zoneId, x: xPercent, y: yPercent } };
    setGame(g);
    saveGame({ difficulty: g.difficulty, dayCount: g.dayCount, gameOver: null, state: g });
  }, [game, saveGame]);

  const handleDrop = useCallback((targetZone, e) => {
    e.preventDefault();
    setDragOverZone(null);
    const { x, y } = getDropPercent(e);
    const type = e.dataTransfer.getData('application/island-game-type');
    const id = e.dataTransfer.getData('application/island-game-id');
    if (type === 'settler' && id !== '') {
      const settlerId = parseInt(id, 10);
      if (!Number.isNaN(settlerId)) moveSettler(settlerId, targetZone, x, y);
    }
    if (type === 'building' && id && targetZone === 'camp' && id !== 'hut') {
      placeBuilding(id, targetZone, x, y);
    }
  }, [moveSettler, placeBuilding, getDropPercent]);

  const handleDragOver = useCallback((zoneId, e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverZone(zoneId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverZone(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragOverZone(null);
  }, []);

  const [touchDrag, setTouchDrag] = useState(null);
  const touchIdRef = useRef(null);

  const resolveZoneFromPoint = useCallback((clientX, clientY) => {
    const el = document.elementFromPoint(clientX, clientY);
    let node = el;
    while (node && !node.dataset?.islandZone) node = node.parentElement;
    if (!node || !node.dataset.islandZone) return null;
    const zoneId = node.dataset.islandZone;
    const rect = node.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { zoneId, x, y };
  }, []);

  useEffect(() => {
    if (!touchDrag) return;
    const onMove = (e) => {
      if (e.touches[0]?.identifier === touchIdRef.current) e.preventDefault();
    };
    const onEnd = (e) => {
      const t = Array.from(e.changedTouches || []).find((x) => x.identifier === touchIdRef.current);
      if (!t) return;
      const zone = resolveZoneFromPoint(t.clientX, t.clientY);
      if (zone) {
        if (touchDrag.type === 'settler') {
          const settlerId = parseInt(touchDrag.id, 10);
          if (!Number.isNaN(settlerId)) moveSettler(settlerId, zone.zoneId, zone.x, zone.y);
        }
        if (touchDrag.type === 'building' && zone.zoneId === 'camp' && touchDrag.id !== 'hut') {
          placeBuilding(touchDrag.id, zone.zoneId, zone.x, zone.y);
        }
      }
      setTouchDrag(null);
      touchIdRef.current = null;
      document.removeEventListener('touchmove', onMove, { passive: false });
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
    return () => {
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };
  }, [touchDrag, resolveZoneFromPoint, moveSettler, placeBuilding]);

  const settlerTouchStart = useCallback((e, settlerId) => {
    if (e.touches.length !== 1) return;
    touchIdRef.current = e.touches[0].identifier;
    setTouchDrag({ type: 'settler', id: settlerId });
  }, []);
  const buildingTouchStart = useCallback((e, buildingId) => {
    if (e.touches.length !== 1) return;
    touchIdRef.current = e.touches[0].identifier;
    setTouchDrag({ type: 'building', id: buildingId });
  }, []);

  const build = useCallback((buildingId) => {
    if (!game) return;
    const b = BUILDINGS.find((x) => x.id === buildingId);
    if (!b) return;
    const isHut = buildingId === 'hut';
    const hutCount = typeof game.buildings?.hut === 'number' ? game.buildings.hut : (game.buildings?.hut === 2 ? 1 : 0);
    if (isHut) {
      if (hutCount >= HUT_LIMIT) return;
    } else if (game.buildings[buildingId] && game.buildings[buildingId] > 0) return;
    if (!canAffordWithWarehouse(game.resources, game.warehouse, b.cost)) return;
    const g = { ...game };
    const paid = payFromHandAndWarehouse(g.resources, g.warehouse, b.cost);
    g.resources = paid.resources;
    g.warehouse = paid.warehouse;
    if (isHut) {
      g.buildings = { ...g.buildings, hut: hutCount + 1 };
      if (hutCount === 0) {
        g.buildingPlacement = { ...(g.buildingPlacement || {}), hut: { zoneId: 'camp', x: 50, y: 50 } };
      }
    } else {
      g.buildings = { ...g.buildings, [buildingId]: 1 };
    }
    g.eventLog = (g.eventLog || []).slice(-49);
    g.eventLog.push({
      day: g.dayCount,
      type: 'build',
      message: `День ${g.dayCount}: куплено «${b.name}». Потрачено: ${Object.entries(b.cost).map(([k, v]) => `${k === 'wood' ? '🪵' : k === 'stone' ? '🪨' : '🐚'}${v}`).join(', ')}`,
    });
    setGame(g);
    saveGame({ difficulty: g.difficulty, dayCount: g.dayCount, gameOver: null, state: g });
  }, [game, saveGame]);

  const endDay = useCallback(() => {
    setLastEventMessage(null);
    runDay();
  }, [runDay]);

  const transferToWarehouse = useCallback((key, amount) => {
    if (!game || !key || amount <= 0) return;
    const g = { ...game };
    const res = { ...g.resources };
    const wh = { ...(g.warehouse || { food: 0, wood: 0, stone: 0, coins: 0 }) };
    const have = res[key] || 0;
    const space = WAREHOUSE_LIMIT - (wh[key] || 0);
    const move = Math.min(amount, have, space);
    if (move <= 0) return;
    res[key] = have - move;
    wh[key] = (wh[key] || 0) + move;
    g.resources = res;
    g.warehouse = wh;
    setGame(g);
    saveGame({ difficulty: g.difficulty, dayCount: g.dayCount, gameOver: null, state: g });
  }, [game, saveGame]);

  const transferToHand = useCallback((key, amount) => {
    if (!game || !key || amount <= 0) return;
    const g = { ...game };
    const res = { ...g.resources };
    const wh = { ...(g.warehouse || { food: 0, wood: 0, stone: 0, coins: 0 }) };
    const inWh = wh[key] || 0;
    const space = HAND_LIMIT - (res[key] || 0);
    const move = Math.min(amount, inWh, space);
    if (move <= 0) return;
    wh[key] = inWh - move;
    res[key] = (res[key] || 0) + move;
    g.resources = res;
    g.warehouse = wh;
    setGame(g);
    saveGame({ difficulty: g.difficulty, dayCount: g.dayCount, gameOver: null, state: g });
  }, [game, saveGame]);

  const setProtectedResource = useCallback((key) => {
    if (!game) return;
    const g = { ...game };
    g.protectedResourceType = key || null;
    setGame(g);
    saveGame({ difficulty: g.difficulty, dayCount: g.dayCount, gameOver: null, state: g });
  }, [game, saveGame]);

  const upgradeZone = useCallback((zoneId) => {
    if (!game || game.buildings?.workshop !== 2) return;
    const up = game.zoneUpgrades || { food: 0, wood: 0, stone: 0, market: 0 };
    if ((up[zoneId] || 0) >= ZONE_UPGRADE_MAX) return;
    const cost = { coins: ZONE_UPGRADE_COST };
    if (!canAffordWithWarehouse(game.resources, game.warehouse, cost)) return;
    const g = { ...game };
    const paid = payFromHandAndWarehouseVoluntary(g.resources, g.warehouse, cost);
    g.resources = paid.resources;
    g.warehouse = paid.warehouse;
    g.zoneUpgrades = { ...g.zoneUpgrades, [zoneId]: (g.zoneUpgrades?.[zoneId] || 0) + 1 };
    setGame(g);
    saveGame({ difficulty: g.difficulty, dayCount: g.dayCount, gameOver: null, state: g });
  }, [game, saveGame]);

  const resetProgress = useCallback(async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    try {
      const res = await apiFetch(`${apiBase}/island-game/start`, {
        method: 'POST',
        body: JSON.stringify({ difficulty: game?.difficulty || difficulty }),
      });
      if (res.ok) {
        const data = await res.json();
        setGame({ difficulty: data.difficulty, dayCount: data.dayCount, gameOver: null, ...data.state });
        setPhase('assign');
        setReport(null);
        setEventModal(null);
        setEventOutro(null);
        setGameOverModal(null);
        setLastEventMessage(null);
      }
    } catch {
      setPhase('menu');
      setGame(null);
    }
  }, [apiBase, apiFetch, difficulty, game?.difficulty, confirmReset]);

  if (loading && !game) {
    return (
      <div className="island-game-shell">
        <div className="island-game-loading">Загрузка...</div>
      </div>
    );
  }

  if (phase === 'menu') {
    return (
      <div className="island-game-shell">
        <div className="island-game-menu">
          <h1>Остров сокровищ: Экономическая колония</h1>
          <p className="text-muted">
            Распределяй поселенцев, добывай ресурсы, переживай события и учись планировать бюджет.
          </p>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>
            Сложность: <strong>{difficulty === 'expert' ? 'Знаток' : 'Новичок'}</strong> (задаётся в главном меню).
          </p>
          <button type="button" className="primary-btn" onClick={() => { setShowRulesBeforeStart(true); setRulesModalOpen(true); }}>
            Начать игру
          </button>
          <button type="button" className="secondary-btn" onClick={onBack} style={{ marginTop: 12 }}>
            Назад
          </button>
        </div>

        {rulesModalOpen && (
          <div className="island-game-modal-backdrop" onClick={() => { setRulesModalOpen(false); if (showRulesBeforeStart) { setShowRulesBeforeStart(false); startNewGame(); } }}>
            <div className="island-game-modal island-game-rules-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Правила игры</h3>
              <div className="island-game-rules-text">{RULES_TEXT}</div>
              <button type="button" className="primary-btn" onClick={() => { setRulesModalOpen(false); if (showRulesBeforeStart) { setShowRulesBeforeStart(false); startNewGame(); } }}>
                Понятно, начать
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'gameover' && gameOverModal) {
    const messages = {
      hunger: 'Еды не хватило. Колония не пережила голод. Учись планировать запасы!',
      debt: 'Не вернули долг вовремя. Торговец забрал всё. Кредиты нужно отдавать.',
      pirates: 'Пираты разграбили лагерь. Сторожевая вышка могла бы помочь.',
    };
    const msg = gameOverModal.message || messages[gameOverModal.reason] || 'Игра окончена.';
    const isVictory = gameOverModal.reason === 'victory';
    return (
      <div className="island-game-shell">
        <div className="island-game-menu">
          <h1>{isVictory ? 'Победа!' : 'Конец игры'}</h1>
          <p className="text-muted">{msg}</p>
          <p className="text-muted">Дней прожито: {game?.dayCount ?? 0}</p>
          {gameOverMeta && (gameOverMeta.bestDaysUpdated || (gameOverMeta.achievementsUnlocked && gameOverMeta.achievementsUnlocked.length > 0)) && (
            <div className="island-game-achievement-notice">
              {gameOverMeta.bestDaysUpdated && (
                <p className="island-game-achievement-notice__record">🏆 Новый рекорд: {gameOverMeta.newBestDays} дней!</p>
              )}
              {gameOverMeta.achievementsUnlocked && gameOverMeta.achievementsUnlocked.length > 0 && (
                <p className="island-game-achievement-notice__badge">
                  🎖 Получено достижение: {gameOverMeta.achievementsUnlocked.map((c) => ({ island_survivor: 'Островитянин', island_100: '100% острова' }[c] || c)).join(', ')}
                </p>
              )}
            </div>
          )}
          <button type="button" className="primary-btn" onClick={startNewGame}>
            Начать заново
          </button>
          <button type="button" className="secondary-btn" onClick={onBack} style={{ marginTop: 12 }}>
            Выйти в меню
          </button>
        </div>
      </div>
    );
  }

  if (!game) return null;

  const res = game.resources || {};
  const settlers = game.settlers || getInitialState(game.difficulty).settlers;
  const inCamp = settlers.filter((s) => s.job === 'camp');

  const settlerAvatarContent = user?.avatarUrl
    ? <img src={user.avatarUrl} alt="" className="island-game-settler-avatar-img" />
    : '👤';

  const renderSettler = (s) => (
    <div
      key={s.id}
      className="island-game-settler-avatar"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/island-game-type', 'settler');
        e.dataTransfer.setData('application/island-game-id', String(s.id));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={handleDragEnd}
      onTouchStart={(e) => settlerTouchStart(e, s.id)}
      title="Перетащи на зону работы"
    >
      {settlerAvatarContent}
    </div>
  );

  const placement = game.buildingPlacement || {};
  const getPlacementZone = (p) => (p && typeof p === 'object' ? p.zoneId : p) || 'camp';
  const getPlacementXY = (p, index = 0) => {
    if (p && typeof p === 'object' && typeof p.x === 'number' && typeof p.y === 'number') {
      const offset = index ? (index * 6) : 0;
      return { x: Math.max(5, Math.min(95, p.x + offset)), y: Math.max(5, Math.min(95, p.y)) };
    }
    return { x: 50, y: 50 };
  };
  const buildingsInZone = (zoneId) => {
    const list = [];
    BUILDINGS.forEach((b) => {
      if (b.id === 'hut') {
        const n = typeof game.buildings?.hut === 'number' ? game.buildings.hut : 0;
        if (n > 0 && getPlacementZone(placement.hut) === zoneId) {
          for (let i = 0; i < n; i++) list.push({ ...b, key: `hut_${i}`, hutIndex: i });
        }
      } else if (game.buildings[b.id] === 2 && getPlacementZone(placement[b.id]) === zoneId) {
        list.push({ ...b, key: b.id });
      }
    });
    return list;
  };

  const getZoneConfig = (zoneId) => ({
    imageUrl: ZONE_STATIC_IMAGES[zoneId] || '',
    instruction: '',
  });

  const renderZone = (zoneId, title, emoji) => {
    const here = settlers.filter((s) => s.job === zoneId);
    const buildingsHere = buildingsInZone(zoneId);
    const hereWithPos = here.filter((s) => typeof s.x === 'number' && typeof s.y === 'number');
    const hereInFlow = here.filter((s) => typeof s.x !== 'number' || typeof s.y !== 'number');
    const zoneCfg = getZoneConfig(zoneId);
    const zoneStyle = { gridArea: zoneId };
    if (zoneCfg.imageUrl) {
      const imgSrc = zoneCfg.imageUrl.startsWith('http') ? zoneCfg.imageUrl : zoneCfg.imageUrl;
      zoneStyle.backgroundImage = `url(${imgSrc})`;
      zoneStyle.backgroundSize = 'cover';
      zoneStyle.backgroundPosition = 'center';
    }
    return (
      <div
        className={`island-game-zone island-game-drop-zone ${dragOverZone === zoneId ? 'drag-over' : ''}`}
        style={zoneStyle}
        data-island-zone={zoneId}
        onDragOver={(e) => handleDragOver(zoneId, e)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(zoneId, e)}
      >
        <div className="island-game-zone-title">{emoji} {title}</div>
        {zoneCfg.instruction && (
          <div className="island-game-zone-instruction" title={zoneCfg.instruction}>
            {zoneCfg.instruction}
          </div>
        )}
        <div className="island-game-zone-layer">
          {buildingsHere.map((b) => {
            const pl = placement[b.id] || placement.hut;
            const xy = getPlacementXY(pl, b.hutIndex);
            return (
              <span
                key={b.key || b.id}
                className="island-game-placed-building island-game-placed-free"
                title={b.name}
                style={{ left: `${xy.x}%`, top: `${xy.y}%` }}
              >
                {b.emoji}
              </span>
            );
          })}
          {hereWithPos.map((s) => (
            <div
              key={s.id}
              className="island-game-settler-avatar island-game-settler-free"
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
              draggable
              onDragStart={(ev) => {
                ev.dataTransfer.setData('application/island-game-type', 'settler');
                ev.dataTransfer.setData('application/island-game-id', String(s.id));
                ev.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => settlerTouchStart(e, s.id)}
              title="Перетащи в другое место"
            >
              {settlerAvatarContent}
            </div>
          ))}
        </div>
        <div className="island-game-zone-settlers">
          {hereInFlow.map(renderSettler)}
        </div>
      </div>
    );
  };

  const openMenuAnd = (fn) => {
    setMobileMenuOpen(false);
    if (fn) fn();
  };

  return (
    <div className="island-game-shell">
      <header className="island-game-header">
        <button type="button" className="secondary-btn island-game-back island-game-header-desk-only" onClick={onBack}>
          ← Назад
        </button>
        <div className="island-game-resources">
          <span title="Еда">🍎 {res.food ?? 0}</span>
          <span title="Дерево">🪵 {res.wood ?? 0}</span>
          <span title="Камень">🪨 {res.stone ?? 0}</span>
          <span title="Ракушки">🐚 {res.coins ?? 0}</span>
        </div>
        <div className="island-game-header-right">
          <div className="island-game-day">
            День {game.dayCount}
          </div>
          <button type="button" className="secondary-btn island-game-rules-btn island-game-header-desk-only" onClick={() => setRulesModalOpen(true)} title="Правила игры">
            ?
          </button>
          <div className="island-game-menu-wrap island-game-header-mobile-only">
            <button
              type="button"
              className="secondary-btn island-game-menu-btn"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-expanded={mobileMenuOpen}
              aria-haspopup="true"
              title="Меню"
            >
              ☰ Меню
            </button>
            {mobileMenuOpen && (
              <>
                <div className="island-game-menu-backdrop" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
                <div className="island-game-menu-dropdown" role="menu">
                  {phase === 'assign' && (
                    <button type="button" className="island-game-menu-item island-game-menu-item--primary" role="menuitem" onClick={() => openMenuAnd(endDay)}>
                      ▶ Следующий день
                    </button>
                  )}
                  <button type="button" className="island-game-menu-item" role="menuitem" onClick={() => openMenuAnd(() => setMobilePanel('shop'))}>
                    🏪 Магазин построек
                  </button>
                  <button type="button" className="island-game-menu-item" role="menuitem" onClick={() => openMenuAnd(() => setMobilePanel('log'))}>
                    📋 Системные сообщения
                  </button>
                  <button type="button" className="island-game-menu-item" role="menuitem" onClick={() => openMenuAnd(resetProgress)}>
                    🔄 Сбросить прогресс
                  </button>
                  <button type="button" className="island-game-menu-item" role="menuitem" onClick={() => openMenuAnd(onBack)}>
                    ← Назад
                  </button>
                  <button type="button" className="island-game-menu-item" role="menuitem" onClick={() => openMenuAnd(() => setRulesModalOpen(true))}>
                    ? Правила
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="island-game-main">
        <aside className="island-game-settlers island-game-settlers--messages-only island-game-desk-only">
          <div className="island-game-event-log">
            <div className="island-game-event-log-title">Системные сообщения</div>
            <div className="island-game-event-log-list">
              {(game.eventLog || []).slice(-20).reverse().map((entry, idx) => (
                <div key={idx} className="island-game-event-log-entry">
                  <span className="island-game-event-log-day">День {entry.day}</span>
                  <span className="island-game-event-log-msg">{entry.message}</span>
                </div>
              ))}
              {(game.eventLog || []).length === 0 && (
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>Пока нет записей. Завершай дни и участвуй в событиях.</div>
              )}
            </div>
          </div>
        </aside>

        <section className="island-game-map">
          <div className="island-game-map-inner">
            <div
              className={`island-game-zone island-game-drop-zone island-game-camp ${dragOverZone === 'camp' ? 'drag-over' : ''}`}
              data-island-zone="camp"
              style={(() => {
                const c = getZoneConfig('camp');
                const s = { gridArea: 'camp' };
                if (c.imageUrl) {
                  s.backgroundImage = `url(${c.imageUrl})`;
                  s.backgroundSize = 'cover';
                  s.backgroundPosition = 'center';
                }
                return s;
              })()}
              onDragOver={(e) => handleDragOver('camp', e)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop('camp', e)}
            >
              <div className="island-game-zone-title">🏕 Лагерь</div>
              {getZoneConfig('camp').instruction && (
                <div className="island-game-zone-instruction" title={getZoneConfig('camp').instruction}>
                  {getZoneConfig('camp').instruction}
                </div>
              )}
              <div className="island-game-zone-layer">
                {buildingsInZone('camp').map((b) => {
                  const pl = placement[b.id] || placement.hut;
                  const xy = getPlacementXY(pl, b.hutIndex);
                  return (
                    <span
                      key={b.key || b.id}
                      className="island-game-placed-building island-game-placed-free"
                      title={b.name}
                      style={{ left: `${xy.x}%`, top: `${xy.y}%` }}
                    >
                      {b.emoji}
                    </span>
                  );
                })}
                {inCamp.filter((s) => typeof s.x === 'number' && typeof s.y === 'number').map((s) => (
                  <div
                    key={s.id}
                    className="island-game-settler-avatar island-game-settler-free"
                    style={{ left: `${s.x}%`, top: `${s.y}%` }}
                    draggable
                    onDragStart={(ev) => {
                      ev.dataTransfer.setData('application/island-game-type', 'settler');
                      ev.dataTransfer.setData('application/island-game-id', String(s.id));
                      ev.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => settlerTouchStart(e, s.id)}
                    title="Перетащи в другое место"
                  >
                    {settlerAvatarContent}
                  </div>
                ))}
              </div>
              <div className="island-game-zone-settlers">
                {inCamp.filter((s) => typeof s.x !== 'number' || typeof s.y !== 'number').map(renderSettler)}
              </div>
            </div>
            {renderZone('food', 'Сбор ягод / Рыбалка', '🍎')}
            {renderZone('wood', 'Лес', '🪵')}
            {renderZone('stone', 'Скалы', '🪨')}
            {renderZone('market', 'Рынок', '🐚')}
          </div>
        </section>

        <aside className="island-game-buildings island-game-desk-only">
          <div className="island-game-buildings-title">Магазин построек</div>
          {BUILDINGS.map((b) => {
            const isHut = b.id === 'hut';
            const hutCount = typeof game.buildings?.hut === 'number' ? game.buildings.hut : 0;
            const status = game.buildings[b.id];
            const owned = isHut ? hutCount > 0 : (status === 1 || status === 2);
            const placed = isHut ? hutCount > 0 : status === 2;
            const canBuild = isHut ? hutCount < HUT_LIMIT && canAffordWithWarehouse(game.resources, game.warehouse, b.cost) : !owned && canAffordWithWarehouse(game.resources, game.warehouse, b.cost);
            return (
              <div key={b.id} className="island-game-building-card">
                <div><strong>{b.name}</strong> {placed ? (isHut ? `✓ ${hutCount}/${HUT_LIMIT} на карте` : '✓ на карте') : owned ? '(куплено)' : ''}</div>
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>{b.desc}</div>
                {(!owned || (isHut && hutCount < HUT_LIMIT)) && (
                  <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                    {Object.entries(b.cost).map(([k, v]) => (
                      <span key={k} style={{ marginRight: 8 }}>
                        {k === 'wood' && '🪵'}
                        {k === 'stone' && '🪨'}
                        {k === 'coins' && '🐚'}
                        {v}
                      </span>
                    ))}
                  </div>
                )}
                {(!owned || (isHut && hutCount < HUT_LIMIT)) && (
                  <button
                    type="button"
                    className="primary-btn"
                    style={{ marginTop: 6 }}
                    disabled={!canBuild}
                    onClick={() => build(b.id)}
                  >
                    Купить
                  </button>
                )}
                {!isHut && status === 1 && (
                  <div
                    className="island-game-building-drag-icon"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/island-game-type', 'building');
                      e.dataTransfer.setData('application/island-game-id', b.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => buildingTouchStart(e, b.id)}
                    title="Перетащи на карту в зону Лагеря"
                  >
                    <span className="island-game-building-drag-emoji" aria-hidden>{b.emoji}</span>
                    <span className="island-game-building-drag-label">Перетащи на карту</span>
                  </div>
                )}
                {b.id === 'warehouse' && status === 2 && (
                  <button type="button" className="primary-btn" style={{ marginTop: 8 }} onClick={() => setWarehouseModalOpen(true)}>
                    Открыть склад
                  </button>
                )}
                {b.id === 'workshop' && status === 2 && (
                  <button type="button" className="primary-btn" style={{ marginTop: 8 }} onClick={() => setWorkshopModalOpen(true)}>
                    Улучшить зоны
                  </button>
                )}
              </div>
            );
          })}
          {game.debt && (
            <div className="notice warn" style={{ marginTop: 12 }}>
              Долг: {game.debt.amount} {game.debt.resource} к дню {game.debt.dueDay}
            </div>
          )}
        </aside>
      </main>

      {/* Мобильные панели: Магазин и Логи из меню */}
      {mobilePanel === 'shop' && (
        <div className="island-game-mobile-panel island-game-mobile-shop">
          <div className="island-game-mobile-panel-header">
            <h3 className="island-game-mobile-panel-title">🏪 Магазин построек</h3>
            <button type="button" className="secondary-btn island-game-mobile-panel-close" onClick={() => setMobilePanel(null)} aria-label="Закрыть">
              ✕
            </button>
          </div>
          <div className="island-game-mobile-panel-body">
            {BUILDINGS.map((b) => {
              const isHut = b.id === 'hut';
              const hutCount = typeof game.buildings?.hut === 'number' ? game.buildings.hut : 0;
              const status = game.buildings[b.id];
              const owned = isHut ? hutCount > 0 : (status === 1 || status === 2);
              const placed = isHut ? hutCount > 0 : status === 2;
              const canBuild = isHut ? hutCount < HUT_LIMIT && canAffordWithWarehouse(game.resources, game.warehouse, b.cost) : !owned && canAffordWithWarehouse(game.resources, game.warehouse, b.cost);
              return (
                <div key={b.id} className="island-game-building-card">
                  <div><strong>{b.name}</strong> {placed ? (isHut ? `✓ ${hutCount}/${HUT_LIMIT}` : '✓ на карте') : owned ? '(куплено)' : ''}</div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>{b.desc}</div>
                  {(!owned || (isHut && hutCount < HUT_LIMIT)) && (
                    <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                      {Object.entries(b.cost).map(([k, v]) => (
                        <span key={k} style={{ marginRight: 8 }}>
                          {k === 'wood' && '🪵'}
                          {k === 'stone' && '🪨'}
                          {k === 'coins' && '🐚'}
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                  {(!owned || (isHut && hutCount < HUT_LIMIT)) && (
                    <button
                      type="button"
                      className="primary-btn"
                      style={{ marginTop: 6 }}
                      disabled={!canBuild}
                      onClick={() => build(b.id)}
                    >
                      Купить
                    </button>
                  )}
                  {!isHut && status === 1 && (
                    <div
                      className="island-game-building-drag-icon"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/island-game-type', 'building');
                        e.dataTransfer.setData('application/island-game-id', b.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => buildingTouchStart(e, b.id)}
                      title="Перетащи на карту в зону Лагеря"
                    >
                      <span className="island-game-building-drag-emoji" aria-hidden>{b.emoji}</span>
                      <span className="island-game-building-drag-label">Перетащи на карту</span>
                    </div>
                  )}
                  {b.id === 'warehouse' && status === 2 && (
                    <button type="button" className="primary-btn" style={{ marginTop: 8 }} onClick={() => { setWarehouseModalOpen(true); setMobilePanel(null); }}>
                      Открыть склад
                    </button>
                  )}
                  {b.id === 'workshop' && status === 2 && (
                    <button type="button" className="primary-btn" style={{ marginTop: 8 }} onClick={() => { setWorkshopModalOpen(true); setMobilePanel(null); }}>
                      Улучшить зоны
                    </button>
                  )}
                </div>
              );
            })}
            {game.debt && (
              <div className="notice warn" style={{ marginTop: 12 }}>
                Долг: {game.debt.amount} {game.debt.resource} к дню {game.debt.dueDay}
              </div>
            )}
          </div>
        </div>
      )}
      {mobilePanel === 'log' && (
        <div className="island-game-mobile-panel island-game-mobile-log">
          <div className="island-game-mobile-panel-header">
            <h3 className="island-game-mobile-panel-title">📋 Системные сообщения</h3>
            <button type="button" className="secondary-btn island-game-mobile-panel-close" onClick={() => setMobilePanel(null)} aria-label="Закрыть">
              ✕
            </button>
          </div>
          <div className="island-game-event-log-list island-game-mobile-panel-body">
            {(game.eventLog || []).slice(-20).reverse().map((entry, idx) => (
              <div key={idx} className="island-game-event-log-entry">
                <span className="island-game-event-log-day">День {entry.day}</span>
                <span className="island-game-event-log-msg">{entry.message}</span>
              </div>
            ))}
            {(game.eventLog || []).length === 0 && (
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>Пока нет записей.</div>
            )}
          </div>
        </div>
      )}

      <footer className="island-game-footer">
        <div className="island-game-footer-actions">
          {phase === 'assign' && (
            <button type="button" className="primary-btn island-game-next-day-btn" onClick={endDay}>
              Следующий день
            </button>
          )}
          {lastEventMessage && (
            <span className="island-game-last-event-msg">{lastEventMessage}</span>
          )}
        </div>
        <button
          type="button"
          className="secondary-btn island-game-footer-reset island-game-desk-only"
          style={{ fontSize: '0.85rem' }}
          onClick={resetProgress}
        >
          {confirmReset ? 'Точно сбросить? Жми ещё раз' : 'Сбросить прогресс'}
        </button>
      </footer>

      {report && phase === 'report' && (
        <div className="island-game-modal-backdrop" onClick={closeReport}>
          <div className="island-game-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Итоги дня</h3>
            <p>Добыто: 🍎 {report.produced?.food ?? 0}, 🪵 {report.produced?.wood ?? 0}, 🪨 {report.produced?.stone ?? 0}, 🐚 {report.produced?.coins ?? 0}</p>
            <p>Съедено: {report.consumed} еды</p>
            <p>Остаток: 🍎 {report.food}, 🪵 {report.wood}, 🪨 {report.stone}, 🐚 {report.coins}</p>
            <button type="button" className="primary-btn" onClick={closeReport}>Далее</button>
          </div>
        </div>
      )}

      {eventModal && phase === 'event' && (
        <div className="island-game-modal-backdrop">
          <div className="island-game-modal event-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{eventModal.title}</h3>
            <p className="text-muted">{eventModal.text}</p>
            <div className="island-game-choices">
              {eventModal.choices.map((c, i) => {
                const hasTower = game.buildings?.watchtower === 2;
                const showRefuse = !c.requireNoBuilding || !game.buildings?.[c.requireNoBuilding];
                const showFight = !c.requireBuilding || (game.buildings?.[c.requireBuilding] && game.buildings[c.requireBuilding] >= 1);
                if (eventModal.id === 'pirates') {
                  if (c.effect === 'robbed' && hasTower) return null;
                  if (c.effect === 'fight' && !hasTower) return null;
                }
                const needPay = c.voluntaryCost && c.cost && Object.keys(c.cost).some((k) => (c.cost[k] || 0) > 0);
                const canPick = !needPay || canAffordWithWarehouse(game.resources, game.warehouse, c.cost);
                const disabled = needPay && !canPick;
                return (
                  <button
                    key={i}
                    type="button"
                    className={c.effect === 'robbed' || c.effect === 'pirates_give_all' ? 'secondary-btn' : 'primary-btn'}
                    disabled={disabled}
                    onClick={() => pickEventChoice(eventModal.id, i)}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {eventOutro && phase === 'event_outro' && (
        <div className="island-game-modal-backdrop">
          <div className="island-game-modal event-modal event-outro-modal" onClick={(e) => e.stopPropagation()}>
            <h3>💡 Чему мы научились</h3>
            <p className="text-muted" style={{ marginBottom: 8 }}>{eventOutro.lesson || eventOutro.tip}</p>
            {eventOutro.tip && eventOutro.tip !== (eventOutro.lesson || '') && (
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>{eventOutro.tip}</p>
            )}
            <button type="button" className="primary-btn" style={{ marginTop: 12 }} onClick={() => { setEventOutro(null); setPhase('assign'); }}>
              Далее
            </button>
          </div>
        </div>
      )}

      {rulesModalOpen && (
        <div className="island-game-modal-backdrop" onClick={() => setRulesModalOpen(false)}>
          <div className="island-game-modal island-game-rules-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Правила игры</h3>
            <div className="island-game-rules-text">{RULES_TEXT}</div>
            <button type="button" className="primary-btn" onClick={() => setRulesModalOpen(false)}>Закрыть</button>
          </div>
        </div>
      )}

      {warehouseModalOpen && game?.buildings?.warehouse === 2 && (
        <div className="island-game-modal-backdrop" onClick={() => setWarehouseModalOpen(false)}>
          <div className="island-game-modal island-game-warehouse-modal" onClick={(e) => e.stopPropagation()}>
            <h3>🏪 Склад</h3>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>В руках макс. {HAND_LIMIT}, на складе макс. {WAREHOUSE_LIMIT} каждого вида. Защищённый ресурс не теряется, когда ресурсы забирают без выбора (шторм, грабёж). При добровольной оплате (торговля, ремонт) списывается даже защищённый.</p>
            <div className="island-game-warehouse-protected">
              <span>Защищённый ресурс:</span>
              {RESOURCE_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={game.protectedResourceType === key ? 'primary-btn' : 'secondary-btn'}
                  style={{ fontSize: '0.85rem' }}
                  onClick={() => setProtectedResource(game.protectedResourceType === key ? null : key)}
                >
                  {key === 'food' ? '🍎' : key === 'wood' ? '🪵' : key === 'stone' ? '🪨' : '🐚'} {key === 'food' ? 'Еда' : key === 'wood' ? 'Дерево' : key === 'stone' ? 'Камень' : 'Ракушки'}
                </button>
              ))}
            </div>
            <table className="island-game-warehouse-table">
              <thead>
                <tr><th>Ресурс</th><th>В руках</th><th>На складе</th><th>Действия</th></tr>
              </thead>
              <tbody>
                {RESOURCE_KEYS.map((key) => {
                  const handVal = game.resources[key] ?? 0;
                  const whVal = game.warehouse?.[key] ?? 0;
                  const emoji = key === 'food' ? '🍎' : key === 'wood' ? '🪵' : key === 'stone' ? '🪨' : '🐚';
                  return (
                    <tr key={key}>
                      <td>{emoji}</td>
                      <td>{handVal} / {HAND_LIMIT}</td>
                      <td>{whVal} / {WAREHOUSE_LIMIT}</td>
                      <td>
                        <button type="button" className="secondary-btn" style={{ marginRight: 4 }} disabled={handVal <= 0 || whVal >= WAREHOUSE_LIMIT} onClick={() => transferToWarehouse(key, 5)}>→ Склад 5</button>
                        <button type="button" className="secondary-btn" disabled={whVal <= 0 || handVal >= HAND_LIMIT} onClick={() => transferToHand(key, 5)}>← Руки 5</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button type="button" className="primary-btn" onClick={() => setWarehouseModalOpen(false)}>Закрыть</button>
          </div>
        </div>
      )}

      {workshopModalOpen && game?.buildings?.workshop === 2 && (
        <div className="island-game-modal-backdrop" onClick={() => setWorkshopModalOpen(false)}>
          <div className="island-game-modal island-game-warehouse-modal" onClick={(e) => e.stopPropagation()}>
            <h3>🔨 Улучшения мастерской</h3>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Улучши зону — добыча там будет +1 за уровень (макс. {ZONE_UPGRADE_MAX}). Стоимость: {ZONE_UPGRADE_COST} 🐚 за улучшение.</p>
            <div className="island-game-workshop-upgrades">
              {['food', 'wood', 'stone', 'market'].map((zoneId) => {
                const level = game.zoneUpgrades?.[zoneId] || 0;
                const canUp = level < ZONE_UPGRADE_MAX && canAffordWithWarehouse(game.resources, game.warehouse, { coins: ZONE_UPGRADE_COST });
                const label = { food: '🍎 Сбор ягод', wood: '🪵 Лес', stone: '🪨 Скалы', market: '🐚 Рынок' }[zoneId];
                return (
                  <div key={zoneId} className="island-game-workshop-row">
                    <span>{label}</span>
                    <span>+{level} к добыче</span>
                    <button type="button" className="primary-btn" style={{ marginLeft: 8 }} disabled={!canUp} onClick={() => upgradeZone(zoneId)}>
                      Улучшить ({ZONE_UPGRADE_COST} 🐚)
                    </button>
                  </div>
                );
              })}
            </div>
            <button type="button" className="primary-btn" onClick={() => setWorkshopModalOpen(false)}>Закрыть</button>
          </div>
        </div>
      )}

      {tip && (
        <div className="island-game-tip">
          <span>💡 {tip}</span>
          <button type="button" onClick={() => setTip(null)}>×</button>
        </div>
      )}
    </div>
  );
}
