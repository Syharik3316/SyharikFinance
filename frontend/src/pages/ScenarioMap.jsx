import React, { useEffect, useMemo, useState } from 'react';
import BudgetStatus from '../components/BudgetStatus.jsx';

const UNLOCK_COST = 25;

export default function ScenarioMap({
  apiBase,
  apiFetch,
  user,
  difficulty,
  onChangeDifficulty,
  onOpenScenario,
  onUserUpdated,
}) {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [runsByCode, setRunsByCode] = useState({});
  const [continueScenario, setContinueScenario] = useState(null);
  const [unlockingCode, setUnlockingCode] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${apiBase}/scenarios`);
        if (!res.ok) {
          throw new Error('Failed to load scenarios');
        }
        const data = await res.json();
        if (isMounted) {
          setScenarios(data);
        }
      } catch (err) {
        if (isMounted) {
          setError('Не удалось загрузить сценарии. Проверь backend.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  useEffect(() => {
    let alive = true;
    async function loadRuns() {
      try {
        if (!apiFetch) return;
        if (!scenarios || scenarios.length === 0) return;

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
    return () => {
      alive = false;
    };
  }, [apiBase, apiFetch, scenarios]);

  const hasActiveRun = useMemo(() => {
    return (code) => Boolean(runsByCode?.[code] && runsByCode[code].status === 'active');
  }, [runsByCode]);

  const openScenario = async (scenario) => {
    if (hasActiveRun(scenario.code)) {
      setContinueScenario(scenario);
    } else {
      onOpenScenario(scenario);
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

  const getScenarioProgress = (code) => {
    return user.Progresses?.find((p) => p.Scenario?.code === code) || null;
  };

  const difficultyLabel = difficulty === 'expert' ? 'Знаток' : 'Новичок';

  return (
    <>
      <BudgetStatus
        budget={user.gems || 0}
        label="💎"
        difficulty={difficultyLabel}
        bump={false}
        unit="💎"
      />

      <div className="card">
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Выбери сценарий</h2>
        <p className="text-muted" style={{ marginTop: 0, marginBottom: 20 }}>
          Каждый квест — это маленькая история про деньги. Начни с «Мечты о велосипеде» или
          «Дня рождения друга».
        </p>

        <div className="chips-row" style={{ marginBottom: 10 }}>
          <span className="chip">Сложность:</span>
          <button
            type="button"
            className={`pill-option ${difficulty === 'novice' ? 'selected' : ''}`}
            onClick={() => onChangeDifficulty('novice')}
          >
            Новичок
          </button>
          <button
            type="button"
            className={`pill-option ${difficulty === 'expert' ? 'selected' : ''}`}
            onClick={() => onChangeDifficulty('expert')}
          >
            Знаток
          </button>
        </div>

        {loading && <div className="text-muted">Загружаем сценарии...</div>}
        {error && <div className="text-danger">{error}</div>}

        <div className="card-grid">
          {scenarios.map((s, index) => {
            // Первые 2 сценария открыты по умолчанию; остальные — покупка за 25 💎.
            const unlockedByPurchase = (user.unlockedScenarios || []).includes(s.code);
            const isFree = index < 2;
            const locked = !isFree && !unlockedByPurchase;
            const canAfford = (user.gems || 0) >= UNLOCK_COST;

            const progress = getScenarioProgress(s.code);
            const statusChip =
              progress?.status === 'passed'
                ? '✓ Пройден'
                : progress?.status === 'in_progress'
                ? 'В процессе'
                : null;

            const emoji =
              s.code === 'bike_dream'
                ? '🚲'
                : s.code === 'friend_birthday'
                ? '🎉'
                : s.code === 'money_quiz'
                ? '❓'
                : s.code === 'lemonade_business'
                ? '🍋'
                : s.code === 'investment_race'
                ? '📈'
                : '🔒';

            return (
              <div key={s.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 26 }}>{emoji}</div>
                  <div className="chips-row">
                    <span className="chip">
                      Тип:{' '}
                      {s.type === 'savings'
                        ? 'накопления'
                        : s.type === 'budget'
                        ? 'бюджетирование'
                        : s.type === 'quiz' || s.code === 'money_quiz'
                        ? 'Тест'
                        : s.type === 'business'
                        ? 'бизнес'
                        : s.type === 'invest'
                        ? 'инвестиции'
                        : s.type || '—'}
                    </span>
                    {s.goal && <span className="chip">Цель: {s.goal} монет</span>}
                    {statusChip && <span className="chip">{statusChip}</span>}
                  </div>
                </div>
                <h3 style={{ marginBottom: 6 }}>{s.title}</h3>
                <p className="text-muted" style={{ marginTop: 0 }}>
                  {s.description}
                </p>
                {locked ? (
                  <button
                    className="primary-btn"
                    disabled={!canAfford || unlockingCode === s.code}
                    onClick={() => handleUnlock(s.code)}
                  >
                    {unlockingCode === s.code
                      ? 'Покупка...'
                      : canAfford
                      ? `Купить за ${UNLOCK_COST} 💎`
                      : `Недостаточно алмазов (${UNLOCK_COST} 💎)`}
                  </button>
                ) : (
                  <button
                    className="primary-btn"
                    onClick={() => openScenario(s)}
                  >
                    {hasActiveRun(s.code) ? 'Продолжить' : 'Играть'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {continueScenario && (
        <div className="modal-backdrop" onClick={() => setContinueScenario(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Продолжить или начать заново?</h3>
            <p className="text-muted" style={{ marginTop: 0, marginBottom: 14 }}>
              У тебя есть сохранение сценария «{continueScenario.title}». Как хочешь продолжить?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
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
    </>
  );
}
