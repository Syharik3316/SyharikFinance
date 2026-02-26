import React, { useEffect, useMemo, useState } from 'react';

const UNLOCK_COST = 25;

const STEP_X = 220;
const STEP_Y = 240;
const ORIGIN_X = 60;
const ORIGIN_Y = 60;

const MAP_DESCRIPTION = 'Здесь твои квесты про деньги: нажимай на кружок с картинкой, читай про задание и нажимай «Начать» или «Купить», если уровень закрыт. Алмазы зарабатываешь в играх. Сложность (Новичок / Знаток) можно изменить в профиле.';

function getLevelPositions(count) {
  const positions = [];
  const cols = 3;
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = ORIGIN_X + col * STEP_X + (row % 2) * (STEP_X / 2);
    const y = ORIGIN_Y + row * STEP_Y;
    positions.push({ x, y });
  }
  return positions;
}

function getScenarioEmoji(code) {
  const map = {
    bike_dream: '🚲',
    money_quiz: '❓',
    lemonade_business: '🍋',
    investment_race: '📈',
  };
  return map[code] || '🔒';
}

function getTypeLabel(type, code) {
  if (type === 'savings') return 'накопления';
  if (type === 'budget') return 'бюджетирование';
  if (type === 'quiz' || code === 'money_quiz') return 'Тест';
  if (type === 'business') return 'бизнес';
  if (type === 'invest') return 'инвестиции';
  return type || '—';
}

export default function ScenarioMap({
  apiBase,
  apiFetch,
  user,
  difficulty,
  onOpenScenario,
  onOpenIslandGame,
  onUserUpdated,
}) {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [runsByCode, setRunsByCode] = useState({});
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [continueScenario, setContinueScenario] = useState(null);
  const [unlockingCode, setUnlockingCode] = useState(null);

  const scenariosFiltered = useMemo(() => (scenarios || []).filter((s) => s.code !== 'friend_birthday'), [scenarios]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${apiBase}/scenarios`);
        if (!res.ok) throw new Error('Failed to load scenarios');
        const data = await res.json();
        if (isMounted) setScenarios(data);
      } catch (err) {
        if (isMounted) setError('Не удалось загрузить сценарии. Проверь backend.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [apiBase]);

  useEffect(() => {
    let alive = true;
    async function loadRuns() {
      try {
        if (!apiFetch || !scenarios?.length) return;
        const pairs = await Promise.all(
          scenarios.map(async (s) => {
            const res = await apiFetch(`${apiBase}/runs/${s.code}`);
            if (!res.ok) return [s.code, null];
            const run = await res.json();
            return [s.code, run];
          })
        );
        if (!alive) return;
        const map = {};
        for (const [code, run] of pairs) map[code] = run;
        setRunsByCode(map);
      } catch {
        // ignore
      }
    }
    loadRuns();
    return () => { alive = false; };
  }, [apiBase, apiFetch, scenarios]);

  const hasActiveRun = useMemo(() => {
    return (code) => Boolean(runsByCode?.[code] && runsByCode[code].status === 'active');
  }, [runsByCode]);

  const getScenarioProgress = (code) => {
    return user.Progresses?.find((p) => p.Scenario?.code === code) || null;
  };

  const openScenario = (scenario) => {
    if (hasActiveRun(scenario.code)) {
      setSelectedScenario(null);
      setContinueScenario(scenario);
    } else {
      onOpenScenario(scenario);
      setSelectedScenario(null);
    }
  };

  const handleResume = () => {
    if (!continueScenario) return;
    onOpenScenario(continueScenario);
    setContinueScenario(null);
  };

  const handleRestart = async () => {
    if (!continueScenario) return;
    try {
      await apiFetch(`${apiBase}/runs/restart`, {
        method: 'POST',
        body: JSON.stringify({ scenarioCode: continueScenario.code }),
      });
    } catch {
      // ignore
    }
    onOpenScenario(continueScenario);
    setContinueScenario(null);
  };

  const handleUnlock = async (scenarioCode) => {
    if ((user.gems || 0) < UNLOCK_COST || unlockingCode) return;
    setUnlockingCode(scenarioCode);
    try {
      const res = await apiFetch(`${apiBase}/scenarios/unlock`, {
        method: 'POST',
        body: JSON.stringify({ scenarioCode }),
      });
      if (res.ok && onUserUpdated) await onUserUpdated();
    } catch {
      // ignore
    } finally {
      setUnlockingCode(null);
    }
  };

  const positions = getLevelPositions(Math.max(scenariosFiltered.length, 1));
  const mapWidth = ORIGIN_X * 2 + STEP_X * 2 + STEP_X / 2;
  const mapHeight = scenariosFiltered.length
    ? ORIGIN_Y * 2 + STEP_Y * (Math.ceil(scenariosFiltered.length / 3) - 1) + 40
    : 160;

  return (
    <div className="play-page">
      <div className="play-page__main">
        <aside className="play-page__sidebar">
          <div className="play-page__balance">
            <span className="play-page__balance-label">Баланс:</span>
            <span className="play-page__balance-value">{Math.round(user.gems ?? 0)} 💎</span>
          </div>
          <div className="play-page__difficulty">
            <span className="play-page__difficulty-label">Сложность:</span>
            <span className="play-page__difficulty-value">{difficulty === 'expert' ? 'Знаток' : 'Новичок'}</span>
          </div>
          <p className="play-page__map-desc">{MAP_DESCRIPTION}</p>
        </aside>

        <div className="play-page__map-wrap play-page__map-wrap--bg">
          {loading && <div className="text-muted">Загружаем сценарии...</div>}
          {error && <div className="text-danger">{error}</div>}
          {!loading && !error && scenariosFiltered.length > 0 && (
            <div className="play-map" style={{ width: mapWidth, height: mapHeight }}>
              <svg
                className="play-map__lines"
                viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {positions.slice(0, Math.max(0, scenariosFiltered.length - 1)).map((pos, i) => {
                  const next = positions[i + 1];
                  return (
                    <line
                      key={i}
                      x1={pos.x}
                      y1={pos.y}
                      x2={next.x}
                      y2={next.y}
                      stroke="var(--color-green)"
                      strokeWidth="2"
                      strokeDasharray="6 6"
                      opacity="0.7"
                    />
                  );
                })}
              </svg>
              {scenariosFiltered.map((s, index) => {
                const unlockedByPurchase = (user.unlockedScenarios || []).includes(s.code);
                const freeCount = 2;
                const isFree = index < freeCount;
                const locked = !isFree && !unlockedByPurchase;
                const isSelected = selectedScenario?.id === s.id;
                const progress = getScenarioProgress(s.code);
                const passed = progress?.status === 'passed';

                return (
                  <div
                    key={s.id}
                    className="play-map__node-wrap"
                    style={{ left: positions[index].x, top: positions[index].y }}
                  >
                    <button
                      type="button"
                      className={`play-map__node ${isSelected ? 'play-map__node--active' : ''} ${locked ? 'play-map__node--locked' : ''} ${passed ? 'play-map__node--passed' : ''}`}
                      onClick={() => setSelectedScenario(s)}
                      aria-label={`${s.title}. ${locked ? 'Заблокировано.' : ''}`}
                      aria-pressed={isSelected}
                    >
                      <span className="play-map__node-num">{getScenarioEmoji(s.code)}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {onOpenIslandGame && !loading && !error && (
            <div className="play-page__island-entry">
              <button type="button" className="primary-btn play-page__island-btn" onClick={onOpenIslandGame}>
                🏝 Остров сокровищ (мини-игра)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно сценария */}
      {selectedScenario && (
        <div
          className="scenario-modal-backdrop"
          onClick={() => setSelectedScenario(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="scenario-modal-title"
        >
          <div
            className="scenario-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="scenario-modal-title" className="scenario-modal__title">
              {getScenarioEmoji(selectedScenario.code)} {selectedScenario.title}
            </h2>
            <div className="scenario-modal__meta">
              <span className="chip">Тип: {getTypeLabel(selectedScenario.type, selectedScenario.code)}</span>
              {selectedScenario.goal && (
                <span className="chip">Цель: {selectedScenario.goal} руб.</span>
              )}
              {(() => {
                const progress = getScenarioProgress(selectedScenario.code);
                const status =
                  progress?.status === 'passed'
                    ? '✓ Пройден'
                    : progress?.status === 'in_progress'
                    ? 'В процессе'
                    : null;
                return status ? <span className="chip">{status}</span> : null;
              })()}
            </div>
            <p className="scenario-modal__desc">{selectedScenario.description}</p>
            <div className="scenario-modal__actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setSelectedScenario(null)}
              >
                Закрыть
              </button>
              {(() => {
                const unlockedByPurchase = (user.unlockedScenarios || []).includes(selectedScenario.code);
                const isFree = scenariosFiltered.findIndex((x) => x.id === selectedScenario.id) < 2;
                const locked = !isFree && !unlockedByPurchase;
                const canAfford = (user.gems || 0) >= UNLOCK_COST;

                if (locked) {
                  return (
                    <button
                      type="button"
                      className="primary-btn"
                      disabled={!canAfford || unlockingCode === selectedScenario.code}
                      onClick={() => handleUnlock(selectedScenario.code)}
                    >
                      {unlockingCode === selectedScenario.code
                        ? 'Покупка...'
                        : canAfford
                        ? `Купить за ${UNLOCK_COST} 💎`
                        : `Недостаточно алмазов (${UNLOCK_COST} 💎)`}
                    </button>
                  );
                }
                return (
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => openScenario(selectedScenario)}
                  >
                    {hasActiveRun(selectedScenario.code) ? 'Продолжить' : 'Начать игру'}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно: продолжить или начать заново */}
      {continueScenario && (
        <div className="modal-backdrop" onClick={() => setContinueScenario(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Продолжить или начать заново?</h3>
            <p className="text-muted" style={{ marginTop: 0, marginBottom: 14 }}>
              У тебя есть сохранение сценария «{continueScenario.title}». Как хочешь продолжить?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className="secondary-btn" type="button" onClick={() => setContinueScenario(null)}>
                Отмена
              </button>
              <button className="secondary-btn" type="button" onClick={handleRestart}>
                Начать заново
              </button>
              <button className="primary-btn" type="button" onClick={handleResume}>
                Продолжить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
