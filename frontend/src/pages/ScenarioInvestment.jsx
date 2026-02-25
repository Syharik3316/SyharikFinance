import React, { useCallback, useEffect, useRef, useState } from 'react';
import ScenarioStage from '../components/ScenarioStage.jsx';

/** Поле количества с ограничением по max и изменением зажатием ЛКМ вверх/вниз */
function DragAmountInput({ value, onChange, max, min = 0, placeholder = '0', className }) {
  const maxClamp = Math.max(min, Number(max) || 0);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ y: 0, val: 0 });

  const num = parseInt(value, 10);
  const currentVal = Number.isNaN(num) ? min : Math.min(maxClamp, Math.max(min, num));

  const handleMouseDown = (e) => {
    if (maxClamp <= 0 && min === 0) return;
    e.preventDefault();
    startRef.current = { y: e.clientY, val: currentVal };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const { y, val } = startRef.current;
      const delta = Math.round((y - e.clientY) / 10);
      const next = Math.min(maxClamp, Math.max(min, val + delta));
      startRef.current = { ...startRef.current, val: next };
      onChange(String(next));
    };
    const onUp = () => setDragging(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [dragging, maxClamp, min, onChange]);

  const handleInputChange = (e) => {
    const v = e.target.value;
    if (v === '' || v === '-') {
      onChange(v);
      return;
    }
    const n = parseInt(v, 10);
    if (Number.isNaN(n)) return;
    onChange(String(Math.min(maxClamp, Math.max(min, n))));
  };

  return (
    <div
      className={`investment-drag-input-wrap ${dragging ? 'investment-drag-input-dragging' : ''}`}
      onMouseDown={handleMouseDown}
      title="Зажми и тяни вверх/вниз — число изменится"
    >
      <input
        type="number"
        min={min}
        max={maxClamp}
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        className={className}
      />
    </div>
  );
}

// Сценарий «Инвестиционная гонка»: 20 ходов, старт 1000 монет. Цель — максимизировать портфель.
const MAX_DAYS = 20;
const START_BALANCE = 1000;
const EVENT_CHANCE = 0.3;

const ASSETS = [
  { id: 'toy', name: 'Акции игрушечной компании', emoji: '🧸', startPrice: 10, volatility: 0.08 },
  { id: 'chocolate', name: 'Акции шоколадной фабрики', emoji: '🍫', startPrice: 15, volatility: 0.08 },
  { id: 'bonds', name: 'Облигации', emoji: '📜', startPrice: 5, volatility: 0.02 },
  { id: 'crypto', name: 'Криптовалюта «Койн»', emoji: '🪙', startPrice: 100, volatility: 0.15 },
];

const MARKET_EVENTS = [
  { assetId: 'toy', title: 'Игрушечная компания выпустила хит!', change: 0.2 },
  { assetId: 'toy', title: 'Провал новой линейки игрушек', change: -0.15 },
  { assetId: 'chocolate', title: 'Наводнение на плантациях какао', change: -0.15 },
  { assetId: 'chocolate', title: 'Новые сладости стали хитом', change: 0.2 },
  { assetId: 'bonds', title: 'Ставки ЦБ выросли', change: -0.05 },
  { assetId: 'bonds', title: 'Облигации пользуются спросом', change: 0.03 },
  { assetId: 'crypto', title: 'Койн резко вырос в цене!', change: 0.5 },
  { assetId: 'crypto', title: 'Койн рухнул на новостях', change: -0.4 },
];

const TIPS = [
  'Покупай дёшево, продавай дорого — но никто не знает наверняка, когда цена вырастет или упадёт.',
  'Диверсификация: не вкладывай все деньги в один актив. Если с ним случится беда, потери будут меньше.',
  'Облигации почти не колеблются — надёжно, но доход маленький. Крипта рискованна, но может дать большой рост.',
  'Новости влияют на рынок: хорошие — цена растёт, плохие — падает. Учись реагировать на события.',
  'Стоимость портфеля = свободные монеты + (количество каждого актива × его текущая цена).',
];

function getInitialPrices() {
  return ASSETS.reduce((acc, a) => ({ ...acc, [a.id]: a.startPrice }), {});
}

function getInitialHoldings() {
  return ASSETS.reduce((acc, a) => ({ ...acc, [a.id]: 0 }), {});
}

function portfolioValue(balance, holdings, prices) {
  let sum = balance;
  ASSETS.forEach((a) => {
    sum += (holdings[a.id] || 0) * (prices[a.id] || 0);
  });
  return Math.round(sum);
}

function randomChange(volatility) {
  return 1 + (Math.random() - 0.5) * 2 * volatility;
}

/** Линейный график по точкам (SVG). points = [y0, y1, ...], height/width в px. */
function MiniLineChart({ points, width = 120, height = 44, color = '#60a5fa' }) {
  if (!points.length) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  const d = points
    .map((y, i) => {
      const x = pad + i * step;
      const yy = pad + h - ((y - min) / range) * h;
      return `${i === 0 ? 'M' : 'L'} ${x} ${yy}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} className="investment-mini-chart">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ScenarioInvestment({ apiBase, apiFetch, user, scenario, difficulty, onBackToMap }) {
  const maxDays = scenario?.maxDays ?? MAX_DAYS;
  const startCapital = scenario?.baseBudget ?? START_BALANCE;
  const [loading, setLoading] = useState(true);
  const [introSeen, setIntroSeen] = useState(false);
  const [day, setDay] = useState(1);
  const [balance, setBalance] = useState(startCapital);
  const [holdings, setHoldings] = useState(getInitialHoldings);
  const [prices, setPrices] = useState(getInitialPrices);
  const [portfolioHistory, setPortfolioHistory] = useState([startCapital]);
  const [priceHistory, setPriceHistory] = useState([{ day: 1, prices: getInitialPrices() }]);
  const [lastEvent, setLastEvent] = useState(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const [finished, setFinished] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [buyAmounts, setBuyAmounts] = useState({});
  const [sellAmounts, setSellAmounts] = useState({});
  const [dayReport, setDayReport] = useState(null);

  const totalValue = portfolioValue(balance, holdings, prices);

  const loadRun = useCallback(async () => {
    try {
      setLoading(true);
      const r = await apiFetch(`${apiBase}/runs/${scenario.code}`);
      let run = r.ok ? await r.json() : null;
      if (!run) {
        const r2 = await apiFetch(`${apiBase}/runs/start`, {
          method: 'POST',
          body: JSON.stringify({ scenarioCode: scenario.code }),
        });
        run = await r2.json();
      }
      const state = run.state || {};
      setIntroSeen(Boolean(state.introSeen));
      setDay(Math.min(maxDays, Math.max(1, state.day ?? 1)));
      setBalance(Number.isFinite(state.balance) ? state.balance : startCapital);
      setHoldings(state.holdings ? { ...getInitialHoldings(), ...state.holdings } : getInitialHoldings());
      setPrices(state.prices ? { ...getInitialPrices(), ...state.prices } : getInitialPrices());
      setPortfolioHistory(Array.isArray(state.portfolioHistory) && state.portfolioHistory.length ? state.portfolioHistory : [startCapital]);
      if (Array.isArray(state.priceHistory) && state.priceHistory.length) {
        setPriceHistory(state.priceHistory);
      } else {
        const p = state.prices ? { ...getInitialPrices(), ...state.prices } : getInitialPrices();
        setPriceHistory([{ day: state.day ?? 1, prices: p }]);
      }
    } finally {
      setLoading(false);
    }
  }, [apiBase, apiFetch, scenario?.code, maxDays, startCapital]);

  useEffect(() => {
    loadRun();
  }, [loadRun]);

  const saveRun = useCallback(
    async (nextDay, nextBalance, nextHoldings, nextPrices, nextHistory, nextPriceHistory) => {
      try {
        await apiFetch(`${apiBase}/runs/save`, {
          method: 'POST',
          body: JSON.stringify({
            scenarioCode: scenario.code,
            dayIndex: nextDay - 1,
            budget: nextBalance,
            earned: 0,
            spent: 0,
            state: {
              introSeen: true,
              day: nextDay,
              balance: nextBalance,
              holdings: nextHoldings,
              prices: nextPrices,
              portfolioHistory: nextHistory,
              priceHistory: nextPriceHistory || undefined,
            },
          }),
        });
      } catch {}
    },
    [apiBase, apiFetch, scenario?.code]
  );

  const buy = useCallback(
    (assetId, amount) => {
      const a = ASSETS.find((x) => x.id === assetId);
      if (!a || amount <= 0) return;
      const cost = Math.round((prices[assetId] || 0) * amount);
      if (cost > balance) return;
      setBalance((b) => b - cost);
      setHoldings((h) => ({ ...h, [assetId]: (h[assetId] || 0) + amount }));
      setBuyAmounts((prev) => ({ ...prev, [assetId]: '' }));
    },
    [prices, balance]
  );

  const sell = useCallback(
    (assetId, amount) => {
      const have = holdings[assetId] || 0;
      if (amount <= 0 || amount > have) return;
      const revenue = Math.round((prices[assetId] || 0) * amount);
      setBalance((b) => b + revenue);
      setHoldings((h) => ({ ...h, [assetId]: (h[assetId] || 0) - amount }));
      setSellAmounts((prev) => ({ ...prev, [assetId]: '' }));
    },
    [prices, holdings]
  );

  const nextDay = useCallback(() => {
    const nextPrices = { ...prices };
    ASSETS.forEach((a) => {
      nextPrices[a.id] = Math.max(1, Math.round((nextPrices[a.id] || a.startPrice) * randomChange(a.volatility) * 100) / 100);
    });

    let eventMessage = null;
    if (Math.random() < EVENT_CHANCE && MARKET_EVENTS.length > 0) {
      const ev = MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)];
      const prev = nextPrices[ev.assetId] || 1;
      nextPrices[ev.assetId] = Math.max(1, Math.round(prev * (1 + ev.change) * 100) / 100);
      eventMessage = ev.title;
    }

    const nextDayNum = day + 1;
    const nextVal = portfolioValue(balance, holdings, nextPrices);
    const nextHistory = [...portfolioHistory, nextVal];
    const nextPriceHistory = [...priceHistory, { day: nextDayNum, prices: { ...nextPrices } }];

    setPrices(nextPrices);
    setDay(nextDayNum);
    setPortfolioHistory(nextHistory);
    setPriceHistory(nextPriceHistory);
    setLastEvent(null);
    setDayReport({
      reportDay: day,
      event: eventMessage,
      prevPrices: { ...prices },
      newPrices: nextPrices,
      prevValue: totalValue,
      newValue: nextVal,
      isLastDay: nextDayNum > maxDays,
    });

    saveRun(nextDayNum, balance, holdings, nextPrices, nextHistory, nextPriceHistory);

    if (nextDayNum > maxDays) {
      const profit = nextVal - startCapital;
      setResultMessage(
        `Игра окончена! Стоимость твоего портфеля: ${nextVal} монет. ${profit >= 0 ? `Прибыль: +${profit}` : `Убыток: ${profit}`}. Ты узнал(а), что доходность, риск и диверсификация — основы инвестирования.`
      );
    }
  }, [day, balance, holdings, prices, portfolioHistory, priceHistory, totalValue, maxDays, startCapital, saveRun]);

  const closeDayReport = useCallback(() => {
    if (dayReport?.isLastDay) {
      setFinished(true);
      apiFetch(`${apiBase}/runs/finish`, {
        method: 'POST',
        body: JSON.stringify({
          scenarioCode: scenario.code,
          status: (dayReport.newValue - startCapital) > 0 ? 'passed' : 'failed',
          finalBudget: dayReport.newValue,
          earned: dayReport.newValue - startCapital,
          spent: 0,
        }),
      }).catch(() => {});
    }
    setDayReport(null);
  }, [dayReport, apiBase, apiFetch, scenario?.code, startCapital]);

  const exitScenario = useCallback(async () => {
    try {
      await apiFetch(`${apiBase}/runs/save`, {
        method: 'POST',
        body: JSON.stringify({
          scenarioCode: scenario.code,
          dayIndex: day - 1,
          budget: balance,
          earned: 0,
          spent: 0,
          state: { introSeen: true, day, balance, holdings, prices, portfolioHistory, priceHistory },
        }),
      });
    } catch {}
    onBackToMap();
  }, [apiBase, apiFetch, scenario?.code, day, balance, holdings, prices, portfolioHistory, priceHistory, onBackToMap]);

  if (loading) return <div className="text-muted">Загрузка...</div>;

  const INTRO_TEXT = `Инвестиционная гонка — обучающая игра, в которой ты пробуешь себя в роли начинающего инвестора. Цель: за ${maxDays} ходов превратить стартовые ${startCapital} монет в как можно большую сумму, покупая и продавая активы.

Доступны 4 актива:
• 🧸 Акции игрушечной компании — волатильны, реагируют на хиты и провалы.
• 🍫 Акции шоколадной фабрики — тоже волатильны (урожай какао, новые сладости).
• 📜 Облигации — надёжный, малодоходный актив, цена меняется слабо.
• 🪙 Криптовалюта «Койн» — самая рискованная: резкие взлёты и падения.

Цены меняются каждый ход. С вероятностью ~30% случается новость, влияющая на один из активов. Учись диверсификации и учёту риска!`;

  if (!introSeen) {
    return (
      <ScenarioStage
        leftHud={
          <>
            <div className="hud-pill"><span className="hud-label">День</span><span className="hud-value">0/{maxDays}</span></div>
            <div className="hud-pill"><span className="hud-label">💰</span><span className="hud-value">{startCapital}</span></div>
          </>
        }
        onExit={exitScenario}
      >
        <div className="dialog-area">
          <div className="dialog-box">
            <div className="speaker-row"><div className="speaker-name">📈 Инвестиционная гонка</div></div>
            <div className="dialog-text" style={{ whiteSpace: 'pre-line' }}>{INTRO_TEXT}</div>
          </div>
          <div className="dialog-box">
            <button type="button" className="primary-btn" onClick={() => { setIntroSeen(true); const ip = getInitialPrices(); saveRun(1, startCapital, getInitialHoldings(), ip, [startCapital], [{ day: 1, prices: ip }]); }}>Начать</button>
          </div>
        </div>
      </ScenarioStage>
    );
  }

  if (finished) {
    return (
      <ScenarioStage leftHud={null} onExit={onBackToMap}>
        <div className="dialog-area">
          <div className="dialog-box">
            <h3>Итоги</h3>
            <p>{resultMessage}</p>
            <button type="button" className="primary-btn" onClick={onBackToMap}>К сценариям</button>
          </div>
        </div>
      </ScenarioStage>
    );
  }

  const maxVal = Math.max(...portfolioHistory, totalValue, 1);
  const chartHeight = 72;
  const assetChartColors = { toy: '#f472b6', chocolate: '#a78bfa', bonds: '#4ade80', crypto: '#fbbf24' };

  const leftHud = (
    <>
      <div className="hud-pill">
        <span className="hud-label">День</span>
        <span className="hud-value">{day}/{maxDays}</span>
      </div>
      <div className="hud-pill">
        <span className="hud-label">💰</span>
        <span className="hud-value">{balance}</span>
      </div>
      <div className="hud-pill">
        <span className="hud-label">📊 Портфель</span>
        <span className="hud-value">{totalValue}</span>
      </div>
    </>
  );

  return (
    <ScenarioStage leftHud={leftHud} onExit={exitScenario}>
      <div className="dialog-area investment-dialog-area">
        <div className="dialog-box investment-charts-box">
          <div className="speaker-row">
            <div className="speaker-name">📈 Графики</div>
          </div>
            <div className="investment-chart-wrap">
            <div className="investment-chart-label">Стоимость портфеля (монеты)</div>
            <div className="investment-chart investment-chart-line-wrap" style={{ height: chartHeight }}>
              <svg viewBox={`0 0 ${Math.max(100, portfolioHistory.length * 4)} ${chartHeight}`} preserveAspectRatio="none" className="investment-line-chart">
                <path
                  d={portfolioHistory.length > 1
                    ? (() => {
                        const w = Math.max(100, portfolioHistory.length * 4);
                        const h = chartHeight;
                        return portfolioHistory
                          .map((val, i) => {
                            const x = portfolioHistory.length > 1 ? (i / (portfolioHistory.length - 1)) * w : 0;
                            const y = h - (val / maxVal) * h;
                            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                          })
                          .join(' ');
                      })()
                    : `M 0 ${chartHeight / 2} L 100 ${chartHeight / 2}`}
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <div className="investment-asset-charts">
            <div className="investment-chart-label">Цены активов по дням</div>
            <div className="investment-asset-charts-grid">
              {ASSETS.map((a) => {
                const pts = priceHistory.map((h) => h.prices[a.id] || a.startPrice);
                return (
                  <div key={a.id} className="investment-asset-chart-item">
                    <span className="investment-asset-chart-emoji" title={a.name}>{a.emoji}</span>
                    <MiniLineChart points={pts} width={100} height={40} color={assetChartColors[a.id] || '#94a3b8'} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="dialog-box investment-assets-box">
          <div className="speaker-row">
            <div className="speaker-name">🛒 Покупка и продажа</div>
          </div>
          <p className="investment-kid-hint">Введи количество и нажми «Купить» или «Продать»</p>
          <div className="investment-asset-cards">
            {ASSETS.map((a) => {
              const price = prices[a.id] || 0;
              const qty = holdings[a.id] || 0;
              const maxBuy = price > 0 ? Math.floor(balance / price) : 0;
              const maxSell = qty;
              const buyAmt = buyAmounts[a.id] ?? '';
              const sellAmt = sellAmounts[a.id] ?? '';
              const buyNum = parseInt(buyAmt, 10) || 0;
              const sellNum = parseInt(sellAmt, 10) || 0;
              const canBuy = buyNum > 0 && buyNum <= maxBuy;
              const canSell = sellNum > 0 && sellNum <= maxSell;
              const setBuyAmt = (val) => {
                if (val === '' || val === '-') {
                  setBuyAmounts((p) => ({ ...p, [a.id]: val }));
                  return;
                }
                const n = parseInt(val, 10);
                if (Number.isNaN(n)) return;
                setBuyAmounts((p) => ({ ...p, [a.id]: String(Math.max(0, Math.min(maxBuy, n))) }));
              };
              const setSellAmt = (val) => {
                if (val === '' || val === '-') {
                  setSellAmounts((p) => ({ ...p, [a.id]: val }));
                  return;
                }
                const n = parseInt(val, 10);
                if (Number.isNaN(n)) return;
                setSellAmounts((p) => ({ ...p, [a.id]: String(Math.max(0, Math.min(maxSell, n))) }));
              };
              return (
                <div key={a.id} className="investment-asset-card">
                  <div className="investment-asset-card-header">
                    <span className="investment-asset-card-emoji">{a.emoji}</span>
                    <span className="investment-asset-card-name">{a.name}</span>
                  </div>
                  <div className="investment-asset-card-price">Цена: <strong>{price.toFixed(2)}</strong> монет</div>
                  <div className="investment-asset-card-qty">У тебя: <strong>{qty}</strong> шт.</div>
                  <div className="investment-asset-card-actions">
                    <div className="investment-asset-row">
                      <DragAmountInput
                        value={buyAmt}
                        onChange={setBuyAmt}
                        max={maxBuy}
                        className="investment-input investment-input-kid"
                      />
                      <button type="button" className="primary-btn investment-btn-kid" disabled={!canBuy} onClick={() => buy(a.id, buyNum)}>Купить</button>
                    </div>
                    <div className="investment-asset-row">
                      <DragAmountInput
                        value={sellAmt}
                        onChange={setSellAmt}
                        max={maxSell}
                        className="investment-input investment-input-kid"
                      />
                      <button type="button" className="secondary-btn investment-btn-kid" disabled={!canSell} onClick={() => sell(a.id, sellNum)}>Продать</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dialog-box choices-row investment-actions-row">
          <button type="button" className="primary-btn investment-btn-next" onClick={nextDay} disabled={day > maxDays}>
            Следующий день
          </button>
          <button type="button" className="secondary-btn" onClick={() => { setShowTip(true); setTipIndex((i) => (i + 1) % TIPS.length); }}>
            💡 Совет
          </button>
        </div>
      </div>

      {dayReport && (
        <div className="investment-day-report-overlay" onClick={(e) => e.target === e.currentTarget && closeDayReport()}>
          <div className="dialog-box investment-day-report" onClick={(e) => e.stopPropagation()}>
            <h3 className="investment-day-report-title">📋 Отчёт за день {dayReport.reportDay}</h3>
            {dayReport.event && (
              <div className="investment-event-banner" style={{ marginBottom: 12 }}>
                📰 {dayReport.event}
              </div>
            )}
            <div className="investment-day-report-section">
              <div className="investment-chart-label">Изменение цен</div>
              <ul className="investment-day-report-list">
                {ASSETS.map((a) => {
                  const prev = dayReport.prevPrices[a.id] ?? 0;
                  const next = dayReport.newPrices[a.id] ?? 0;
                  const diff = next - prev;
                  const sign = diff >= 0 ? '+' : '';
                  return (
                    <li key={a.id}>
                      {a.emoji} {a.name}: {prev.toFixed(2)} → <strong>{next.toFixed(2)}</strong> ({sign}{diff.toFixed(2)})
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="investment-day-report-section">
              <div className="investment-chart-label">Твой портфель</div>
              <p className="investment-day-report-portfolio">
                Было: <strong>{dayReport.prevValue}</strong> монет → стало: <strong>{dayReport.newValue}</strong> монет
                {dayReport.newValue !== dayReport.prevValue && (
                  <span className={dayReport.newValue >= dayReport.prevValue ? 'text-success' : 'text-danger'}>
                    {' '}({dayReport.newValue >= dayReport.prevValue ? '+' : ''}{dayReport.newValue - dayReport.prevValue})
                  </span>
                )}
              </p>
            </div>
            <button type="button" className="primary-btn investment-btn-next" onClick={closeDayReport}>
              {dayReport.isLastDay ? 'Смотреть итоги' : 'Продолжить'}
            </button>
          </div>
        </div>
      )}

      {showTip && (
        <div className="investment-tip-overlay" onClick={() => setShowTip(false)}>
          <div className="investment-tip-box" onClick={(e) => e.stopPropagation()}>
            <p>💡 {TIPS[tipIndex]}</p>
            <button type="button" className="primary-btn" onClick={() => setShowTip(false)}>Понятно</button>
          </div>
        </div>
      )}
    </ScenarioStage>
  );
}
