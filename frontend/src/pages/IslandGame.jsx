import React, { useCallback, useEffect, useRef, useState } from 'react';

// Производство за 1 поселенца в день (рынок даёт ракушки)
const PRODUCTION = { food: 4, wood: 3, stone: 2, market: 2 };
const FOOD_PER_COLONIST = 2;
const COLONISTS = 4;
const HAND_LIMIT = 30;
const WAREHOUSE_LIMIT = 100;
const RESOURCE_KEYS = ['food', 'wood', 'stone', 'coins'];

const BUILDINGS = [
  { id: 'hut', name: 'Хижина', cost: { wood: 25 }, desc: 'Укрытие от непогоды', emoji: '🏠' },
  { id: 'warehouse', name: 'Склад', cost: { wood: 30 }, desc: 'Хранить запасы на чёрный день', emoji: '🏪' },
  { id: 'workshop', name: 'Мастерская', cost: { wood: 45, stone: 15 }, desc: 'Инструменты увеличивают добычу', emoji: '🔨' },
  { id: 'watchtower', name: 'Сторожевая вышка', cost: { wood: 55, stone: 25 }, desc: 'Защита от пиратов', emoji: '🗼' },
];

const HAND_LIMIT_FULL = 30;
const WAREHOUSE_LIMIT_FULL = 100;

function isGame100Percent(g) {
  if (!g?.buildings || !g?.resources || !g?.warehouse) return false;
  if (g.buildings.hut !== 2 || g.buildings.warehouse !== 2 || g.buildings.workshop !== 2 || g.buildings.watchtower !== 2) return false;
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
• В руках: максимум 30 единиц каждого ресурса. Излишки автоматически переходят на склад (если склад построен).
• На складе: максимум 100 единиц каждого вида. Склад открывается кнопкой «Склад» после постройки.

Защищённый ресурс: в окне склада можно выбрать один вид ресурса — он не будет отниматься в случайных событиях (пираты, шторм и т.д.). Выбор можно менять в любой момент.

Ход игры:
1. Распредели поселенцев по зонам (перетаскиванием): лагерь — без дела, ягоды/рыбалка — еда, лес — дерево, скалы — камень, рынок — ракушки.
2. Нажми «Завершить день». Подсчитается добыча и расход еды.
3. После итогов дня может выпасть случайное событие — сделай выбор. Один вид ресурса (выбранный на складе) в событиях не теряется.
4. Строй здания в «Магазине построек», перетащи купленное только на территорию лагеря.

Постройки: Хижина (укрытие), Склад (хранение до 100, лимит в руках 30), Мастерская (улучшения), Сторожевая вышка (защита от пиратов).

Цель: игру можно пройти, купив все строения и забив склад и руки ресурсами по максимуму (30 в руках и до 100 на складе каждого вида).`;

const EVENTS = [
  {
    id: 'storm',
    title: 'Шторм',
    text: 'Ночью был шторм. Хижина повреждена. Починить (18 дерева) или жить в руинах — поселенцы будут работать хуже.',
    choices: [
      { label: 'Починить (18 дерева)', cost: { wood: 18 }, effect: 'fixed', tip: 'Затраты сейчас — спокойствие потом.' },
      { label: 'Жить в руинах', cost: {}, effect: 'sad', tip: 'Экономия сейчас может обернуться потерями.' },
    ],
  },
  {
    id: 'pirates',
    title: 'Пираты',
    text: 'К берегу причалили пираты. Требуют дань: 28 ракушек. Либо отдать, либо отбиться (нужна Сторожевая вышка).',
    choices: [
      { label: 'Отдать 28 ракушек', cost: { coins: 28 }, effect: 'paid', tip: 'Иногда откупиться — самый разумный выбор.' },
      { label: 'Отбиться (есть вышка)', cost: {}, effect: 'fight', requireBuilding: 'watchtower', tip: 'Защита окупается в кризис.' },
      { label: 'Отказаться (нет вышки)', cost: {}, effect: 'robbed', tip: 'Без защиты можно потерять больше.', robbed: { coins: 28, food: 8 } },
    ],
  },
  {
    id: 'trade_ship',
    title: 'Торговый корабль',
    text: 'Купцы предлагают обмен: 7 камней на 12 еды. Выгодно ли?',
    choices: [
      { label: 'Обменять (7 камня → 12 еды)', cost: { stone: 7 }, gain: { food: 12 }, effect: 'trade', tip: 'Обмен выгоден, когда у тебя много одного и мало другого.' },
      { label: 'Отказаться', cost: {}, effect: 'skip', tip: 'Не всегда нужно соглашаться на сделку.' },
    ],
  },
  {
    id: 'stranger',
    title: 'Незнакомец',
    text: 'Чужеземец предлагает обменять «золотую» монету на 3 обычные ракушки. Выглядит подозрительно...',
    choices: [
      { label: 'Согласиться', cost: { coins: 3 }, effect: 'scam', tip: 'Слишком выгодное предложение часто обман.' },
      { label: 'Отказаться', cost: {}, effect: 'safe', tip: 'Осторожность сберегла ресурсы.' },
    ],
  },
  {
    id: 'trader_debt',
    title: 'Торговец в долг',
    text: 'Торговец предлагает 30 еды сейчас — через 5 дней вернуть 40. Занять? (Режим Знаток)',
    expertOnly: true,
    choices: [
      { label: 'Взять в долг (30 еды → вернуть 40 через 5 дней)', cost: {}, effect: 'debt', gain: { food: 30 }, debt: { resource: 'food', amount: 40, dueDay: 5 }, tip: 'Кредит — не подарок, его нужно отдавать.' },
      { label: 'Отказаться', cost: {}, effect: 'skip', tip: 'Иногда лучше обойтись без долгов.' },
    ],
  },
  {
    id: 'windfall',
    title: 'Удача',
    text: 'На берегу нашли выброшенный ящик: 5 дерева и 3 ракушки.',
    choices: [
      { label: 'Забрать', cost: {}, gain: { wood: 5, coins: 3 }, effect: 'windfall', tip: 'Случайная удача помогает колонии.' },
    ],
  },
  {
    id: 'berries',
    title: 'Урожай ягод',
    text: 'Поселенцы нашли богатую поляну. +6 еды бесплатно.',
    choices: [
      { label: 'Собрать', cost: {}, gain: { food: 6 }, effect: 'berries', tip: 'Разнообразие источников еды снижает риск.' },
    ],
  },
  {
    id: 'savings_lesson',
    title: 'Совет старейшины',
    text: 'Старейшина говорит: «Кто откладывает часть добычи на склад — тот переживёт неурожай». Построить склад (30 дерева)?',
    choices: [
      { label: 'Построить склад', cost: { wood: 30 }, effect: 'warehouse_advice', tip: 'Накопления помогают в кризис.' },
      { label: 'Пока не буду', cost: {}, effect: 'skip', tip: 'Планировать запасы — основа финансовой безопасности.' },
    ],
  },
  {
    id: 'price_compare',
    title: 'Два торговца',
    text: 'Один торговец: 12 еды за 10 ракушек. Другой: 12 еды за 7 ракушек. К кому идти?',
    choices: [
      { label: 'За 7 ракушек (выгоднее)', cost: { coins: 7 }, gain: { food: 12 }, effect: 'smart_buy', tip: 'Сравнивай цены — так экономятся ресурсы.' },
      { label: 'За 10 ракушек', cost: { coins: 10 }, gain: { food: 12 }, effect: 'overpay', tip: 'Всегда сравнивай предложения перед сделкой.' },
    ],
  },
  {
    id: 'need_vs_want',
    title: 'Соблазн',
    text: 'Купцы везут украшения: красиво, но бесполезно для выживания. Купить за 22 ракушки?',
    choices: [
      { label: 'Купить (хочу!)', cost: { coins: 22 }, effect: 'want', tip: 'Сначала нужды (еда, кров), потом желания.' },
      { label: 'Нет, сэкономим на важное', cost: {}, effect: 'need', tip: 'Различать «нужно» и «хочу» — основа бюджета.' },
    ],
  },
  {
    id: 'insurance_idea',
    title: 'Подстраховка',
    text: 'После шторма кто-то говорит: «Если бы мы копили дерево на ремонт, не пришлось бы жить в руинах». Это про то, что запасы — как страховка.',
    choices: [
      { label: 'Понял, буду копить на чёрный день', cost: {}, effect: 'lesson', tip: 'Резерв на кризис — часть финансовой грамотности.' },
    ],
  },
  {
    id: 'scam_offer',
    title: '«Супер-предложение»',
    text: 'Незнакомец: «Дам 50 еды за 5 ракушек! Только сейчас!» Слишком дёшево — подозрительно.',
    choices: [
      { label: 'Согласиться', cost: { coins: 5 }, effect: 'scam_lose', tip: 'Если предложение «слишком хорошее» — часто обман.' },
      { label: 'Отказаться', cost: {}, effect: 'scam_avoid', tip: 'Осторожность с незнакомыми сделками сберегла ресурсы.' },
    ],
  },
  {
    id: 'share_resources',
    title: 'Соседи просят помощи',
    text: 'Соседний лагерь голодает. Поделиться 8 едой? Доброта может вернуться помощью позже.',
    choices: [
      { label: 'Поделиться (8 еды)', cost: { food: 8 }, effect: 'share', tip: 'Взаимопомощь и репутация тоже ценны.' },
      { label: 'Извиниться, не можем', cost: {}, effect: 'skip', tip: 'Сначала обеспечивать свою колонию — разумно.' },
    ],
  },
];

const JOB_ZONES = ['camp', 'food', 'wood', 'stone', 'market'];

function assignmentFromSettlers(settlers) {
  const a = { camp: 0, food: 0, wood: 0, stone: 0, market: 0 };
  (settlers || []).forEach((s) => { a[s.job] = (a[s.job] || 0) + 1; });
  return a;
}

function getInitialState(difficulty) {
  return {
    resources: { food: 12, wood: 10, stone: 5, coins: 8 },
    warehouse: { food: 0, wood: 0, stone: 0, coins: 0 },
    protectedResourceType: null,
    eventLog: [],
    buildings: { hut: 0, warehouse: 0, workshop: 0, watchtower: 0 },
    buildingPlacement: {},
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

/** То же, но не списывает защищённый тип ресурса (для событий). */
function payFromHandAndWarehouseIgnoreProtected(resources, warehouse, cost, protectedType) {
  const filteredCost = { ...cost };
  if (protectedType) delete filteredCost[protectedType];
  return payFromHandAndWarehouse(resources, warehouse, filteredCost);
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
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [showRulesBeforeStart, setShowRulesBeforeStart] = useState(false);
  const [gameOverMeta, setGameOverMeta] = useState(null);

  const loadGame = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiBase}/island-game`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.state) {
          const state = normalizeLoadedState(data.state);
          setGame({
            difficulty: data.difficulty || difficulty,
            dayCount: data.dayCount || 1,
            gameOver: data.gameOver,
            ...state,
          });
          setPhase(data.gameOver ? 'gameover' : 'assign');
          setReport(null);
          setEventModal(null);
          if (data.gameOver) setGameOverModal({ reason: data.gameOver });
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
    const prod = {
      food: (assign.food || 0) * PRODUCTION.food,
      wood: (assign.wood || 0) * PRODUCTION.wood,
      stone: (assign.stone || 0) * PRODUCTION.stone,
      coins: (assign.market || 0) * PRODUCTION.market,
    };
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
      saveGame({ difficulty: g.difficulty, dayCount: g.dayCount, gameOver: 'victory', state: g });
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
    const evPool = EVENTS.filter((e) => !e.expertOnly || game.difficulty === 'expert');
    const ev = evPool[Math.floor(Math.random() * evPool.length)];
    setEventModal(ev);
    setPhase('event');
  }, [game]);

  const pickEventChoice = useCallback((eventId, choiceIndex) => {
    if (!game || !eventModal) return;
    const ev = EVENTS.find((e) => e.id === eventId) || eventModal;
    const choice = ev.choices[choiceIndex];
    if (!choice) return;
    const g = { ...game };
    const res = { ...g.resources };
    const protectedType = g.protectedResourceType || null;
    const hasRequiredBuilding = !choice.requireBuilding || (g.buildings[choice.requireBuilding] && g.buildings[choice.requireBuilding] >= 1);
    let logMessage = '';
    if (choice.effect === 'fight' && hasRequiredBuilding) {
      logMessage = `День ${g.dayCount}: событие «${ev.title}» — отбились (есть вышка).`;
      g.eventLog = (g.eventLog || []).slice(-49);
      g.eventLog.push({ day: g.dayCount, type: 'event', message: logMessage });
      setEventModal(null);
      setPhase('assign');
      setGame(g);
      saveGame({ difficulty: g.difficulty, dayCount: g.dayCount, gameOver: null, state: g });
      return;
    }
    const robbed = choice.robbed || { coins: 20, food: 5 };
    if (choice.effect === 'fight' && !hasRequiredBuilding) {
      const takeCoins = protectedType === 'coins' ? 0 : Math.min(res.coins || 0, robbed.coins || 20);
      const takeFood = protectedType === 'food' ? 0 : Math.min(res.food || 0, robbed.food || 5);
      res.coins = Math.max(0, (res.coins || 0) - takeCoins);
      res.food = Math.max(0, (res.food || 0) - takeFood);
      g.resources = res;
      logMessage = `День ${g.dayCount}: «${ev.title}» — пираты забрали 🐚${takeCoins} 🍎${takeFood}. Итог: без вышки потеряли ресурсы.`;
      setLastEventMessage(`Пираты украли: ${takeCoins} ракушек и ${takeFood} еды. Защита (вышка) могла бы помочь.`);
      setTip('Без вышки отказ от дани привёл к грабежу. Защита окупается.');
    } else if (choice.effect === 'robbed') {
      const takeCoins = protectedType === 'coins' ? 0 : Math.min(res.coins || 0, robbed.coins || 20);
      const takeFood = protectedType === 'food' ? 0 : Math.min(res.food || 0, robbed.food || 5);
      res.coins = Math.max(0, (res.coins || 0) - takeCoins);
      res.food = Math.max(0, (res.food || 0) - takeFood);
      g.resources = res;
      logMessage = `День ${g.dayCount}: «${ev.title}» — потеряно 🐚${takeCoins} 🍎${takeFood}.`;
      setLastEventMessage(`Пираты украли: ${takeCoins} ракушек и ${takeFood} еды.`);
      if (choice.tip) setTip(choice.tip);
    } else if (canAffordWithWarehouse(res, g.warehouse, choice.cost) || canAffordIgnoringProtectedWithWarehouse(res, g.warehouse, choice.cost, protectedType)) {
      const costDesc = Object.entries(choice.cost).filter(([k, v]) => v > 0).map(([k, v]) => `${k === 'food' ? '🍎' : k === 'wood' ? '🪵' : k === 'stone' ? '🪨' : '🐚'}${v}`).join(', ') || '—';
      const gainDesc = choice.gain ? Object.entries(choice.gain).map(([k, v]) => `${k === 'food' ? '🍎' : k === 'wood' ? '🪵' : k === 'stone' ? '🪨' : '🐚'}+${v}`).join(' ') : '';
      const paid = payFromHandAndWarehouseIgnoreProtected(res, g.warehouse, choice.cost, protectedType);
      g.resources = applyGain(paid.resources, choice.gain);
      g.warehouse = paid.warehouse;
      if (choice.debt) g.debt = { ...choice.debt, dueDay: game.dayCount + (choice.debt.dueDay || 5) };
      if (choice.effect === 'sad') g.sadPenalty = 1;
      if (choice.effect === 'fixed') g.sadPenalty = 0;
      if (choice.tip && !g.tipsSeen[ev.id]) { g.tipsSeen = { ...g.tipsSeen, [ev.id]: true }; setTip(choice.tip); }
      logMessage = `День ${g.dayCount}: «${ev.title}» — выбор: ${choice.label}. Потрачено: ${costDesc}${gainDesc ? `. Получено: ${gainDesc}` : ''}`;
    }
    if (logMessage) {
      g.eventLog = (g.eventLog || []).slice(-49);
      g.eventLog.push({ day: g.dayCount, type: 'event', message: logMessage });
    }
    setGame(g);
    setEventModal(null);
    setPhase('assign');
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
    if (type === 'building' && id && targetZone === 'camp') {
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
        if (touchDrag.type === 'building' && zone.zoneId === 'camp') {
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
    if (!b || (game.buildings[buildingId] && game.buildings[buildingId] > 0)) return;
    if (!canAffordWithWarehouse(game.resources, game.warehouse, b.cost)) return;
    const g = { ...game };
    const paid = payFromHandAndWarehouse(g.resources, g.warehouse, b.cost);
    g.resources = paid.resources;
    g.warehouse = paid.warehouse;
    g.buildings = { ...g.buildings, [buildingId]: 1 };
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
  const getPlacementXY = (p) => {
    if (p && typeof p === 'object' && typeof p.x === 'number' && typeof p.y === 'number') return { x: p.x, y: p.y };
    return { x: 50, y: 50 };
  };
  const buildingsInZone = (zoneId) =>
    BUILDINGS.filter((b) => game.buildings[b.id] === 2 && getPlacementZone(placement[b.id]) === zoneId);

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
            const xy = getPlacementXY(placement[b.id]);
            return (
              <span
                key={b.id}
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
                  const xy = getPlacementXY(placement[b.id]);
                  return (
                    <span
                      key={b.id}
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
            const status = game.buildings[b.id];
            const owned = status === 1 || status === 2;
            const placed = status === 2;
            const canBuild = !owned && canAffordWithWarehouse(game.resources, game.warehouse, b.cost);
            return (
              <div key={b.id} className="island-game-building-card">
                <div><strong>{b.name}</strong> {placed ? '✓ на карте' : owned ? '(куплено)' : ''}</div>
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>{b.desc}</div>
                {!owned && (
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
                {!owned && (
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
                {status === 1 && (
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
              const status = game.buildings[b.id];
              const owned = status === 1 || status === 2;
              const placed = status === 2;
              const canBuild = !owned && canAffordWithWarehouse(game.resources, game.warehouse, b.cost);
              return (
                <div key={b.id} className="island-game-building-card">
                  <div><strong>{b.name}</strong> {placed ? '✓ на карте' : owned ? '(куплено)' : ''}</div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>{b.desc}</div>
                  {!owned && (
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
                  {!owned && (
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
                  {status === 1 && (
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
                const canPick = canAffordWithWarehouse(game.resources, game.warehouse, c.cost) || canAffordIgnoringProtectedWithWarehouse(game.resources, game.warehouse, c.cost, game.protectedResourceType);
                const hasBuilding = !c.requireBuilding || game.buildings[c.requireBuilding];
                const disabled =
                  (c.effect === 'fight' && c.requireBuilding && !hasBuilding) ||
                  (!canPick && c.effect !== 'robbed' && c.effect !== 'skip' && c.effect !== 'safe');
                return (
                  <button
                    key={i}
                    type="button"
                    className={c.effect === 'robbed' || c.effect === 'fight' ? 'secondary-btn' : 'primary-btn'}
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
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>В руках макс. {HAND_LIMIT}, на складе макс. {WAREHOUSE_LIMIT} каждого вида. Выбери защищённый ресурс — он не будет теряться в событиях.</p>
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

      {tip && (
        <div className="island-game-tip">
          <span>💡 {tip}</span>
          <button type="button" onClick={() => setTip(null)}>×</button>
        </div>
      )}
    </div>
  );
}
