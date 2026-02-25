import React, { useEffect, useMemo, useRef, useState } from 'react';
import BudgetStatus from '../components/BudgetStatus.jsx';

const BASE_BUDGET = 1000;

export default function ScenarioBirthday({ apiBase, apiFetch, user, scenario, difficulty, onBackToMap }) {
  const [loading, setLoading] = useState(true);
  const [saveInfo, setSaveInfo] = useState('');

  const [gift, setGift] = useState(700); // по умолчанию: настольная игра
  const [game, setGame] = useState(true);
  const [pizza, setPizza] = useState(false);
  const [finished, setFinished] = useState(false);
  const [reaction, setReaction] = useState('');
  const [storyDone, setStoryDone] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef(null);
  const fullTextRef = useRef('');

  useEffect(() => {
    let alive = true;
    async function initRun() {
      try {
        setLoading(true);
        const r1 = await apiFetch(`${apiBase}/runs/${scenario.code}`);
        let run = r1.ok ? await r1.json() : null;
        if (!run) {
          const r2 = await apiFetch(`${apiBase}/runs/start`, {
            method: 'POST',
            body: JSON.stringify({ scenarioCode: scenario.code }),
          });
          run = await r2.json();
        }

        if (!alive) return;
        const st = run.state || {};
        setGift(Number.isFinite(st.gift) ? st.gift : 700);
        setGame(typeof st.game === 'boolean' ? st.game : true);
        setPizza(typeof st.pizza === 'boolean' ? st.pizza : false);
      } finally {
        if (alive) setLoading(false);
      }
    }
    initRun();
    return () => {
      alive = false;
    };
  }, [apiBase, apiFetch, scenario.code]);

  useEffect(() => {
    const STORY =
      'У друга скоро день рождения. Родители дали тебе 1000 монет: на подарок и, возможно, на развлечения.\n\nТы хочешь порадовать друга, но и самому провести хороший день. Подумай, что для вас обоих важнее всего.';
    startTypewriter(STORY);
    return () => {
      if (typingTimer.current) clearInterval(typingTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Автосейв выбора (чтобы можно было выйти и вернуться)
  useEffect(() => {
    if (loading) return;
    if (finished) return;
    const t = setTimeout(async () => {
      try {
        setSaveInfo('Сохраняем...');
        const total = gift + (game ? 500 : 0) + (pizza ? 200 : 0);
        const remaining = BASE_BUDGET - total;
        await apiFetch(`${apiBase}/runs/save`, {
          method: 'POST',
          body: JSON.stringify({
            scenarioCode: scenario.code,
            dayIndex: 0,
            budget: remaining,
            earned: 0,
            spent: total,
            state: { gift, game, pizza },
          }),
        });
        setSaveInfo('Сохранено');
      } catch {
        setSaveInfo('');
      } finally {
        setTimeout(() => setSaveInfo(''), 900);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [apiBase, apiFetch, finished, gift, game, loading, pizza, scenario.code]);

  const characterName = user.name || user.login || 'Игрок';

  const startTypewriter = (text) => {
    if (typingTimer.current) {
      clearInterval(typingTimer.current);
      typingTimer.current = null;
    }
    fullTextRef.current = text;
    setTypedText('');
    setIsTyping(true);
    setStoryDone(false);
    let i = 0;
    typingTimer.current = setInterval(() => {
      i += 1;
      setTypedText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(typingTimer.current);
        typingTimer.current = null;
        setIsTyping(false);
        setStoryDone(true);
      }
    }, 35);
  };

  const revealAll = () => {
    if (!isTyping) return;
    if (typingTimer.current) {
      clearInterval(typingTimer.current);
      typingTimer.current = null;
    }
    setTypedText(fullTextRef.current);
    setIsTyping(false);
    setStoryDone(true);
  };

  const speakStory = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const text = fullTextRef.current || typedText;
    if (!text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ru-RU';
    window.speechSynthesis.speak(u);
  };

  const giftLabel = (value) => {
    if (value === 300) return 'Книга (300)';
    if (value === 700) return 'Настольная игра (700)';
    if (value === 1000) return 'Радиоуправляемая машинка (1000)';
    if (value === 0) return 'Открытка своими руками (0)';
    return `${value} монет`;
  };

  const totalSpent = useMemo(() => {
    let total = gift;
    if (game) total += 500;
    if (pizza) total += 200;
    return total;
  }, [gift, game, pizza]);

  const remaining = BASE_BUDGET - totalSpent;
  const overBudget = remaining < 0;
  const isExpert = difficulty === 'expert';
  const difficultyLabel = isExpert ? 'Знаток' : 'Новичок';

  const handleFinish = async () => {
    if (finished) return;

    let text = '';
    let status = 'failed';

    if (overBudget) {
      text =
        'Ты выбрал(а) слишком много трат и вышел(ла) за пределы бюджета. В жизни так делать нельзя — долг может испортить праздник.';
    } else if (game) {
      text =
        'Ты решил(а) купить себе новую игру на его день рождения и рассказал(а) ему об этом. Другу обидно, что ты потратил(а) часть денег на себя, а не на совместный праздник.';
    } else if ((gift === 300 || gift === 700) && pizza) {
      text =
        'Ты выбрал(а) хороший подарок и сходил(а) с другом в пиццерию. Друг счастлив, вы провели время вместе — отличный баланс между подарком и впечатлениями!';
      status = 'passed';
    } else if (gift === 0 && pizza) {
      text =
        'Ты сделал(а) открытку своими руками и пошёл(ла) в пиццерию с классом. Вы провели время вместе и при этом потратили минимум — вы с другом максимально сэкономили, но всё равно хорошо отметили праздник.';
      status = 'passed';
    } else if (gift === 1000 && !pizza) {
      text =
        'Ты купил(а) другу очень дорогой подарок. Он рад и благодарен, но немного расстроен, что вы не пошли с классом в пиццерию и не провели время вместе.';
    } else {
      text =
        'Ты уложился(лась) в бюджет, но что-то в балансе между подарком и совместным временем получилось неидеально. Подумай, как в следующий раз сделать так, чтобы и друг был доволен, и ты чувствовал(а) себя комфортно.';
    }

    setReaction(text);
    setFinished(true);

    try {
      await apiFetch(`${apiBase}/runs/finish`, {
        method: 'POST',
        body: JSON.stringify({
          scenarioCode: scenario.code,
          status,
          finalBudget: remaining,
          earned: 0,
          spent: totalSpent,
        }),
      });
    } catch {
      // ignore в прототипе
    }
  };

  const exitScenario = async () => {
    // сейв уже делает эффект, но при выходе попробуем принудительно
    try {
      const total = gift + (game ? 500 : 0) + (pizza ? 200 : 0);
      const remaining = BASE_BUDGET - total;
      await apiFetch(`${apiBase}/runs/save`, {
        method: 'POST',
        body: JSON.stringify({
          scenarioCode: scenario.code,
          dayIndex: 0,
          budget: remaining,
          earned: 0,
          spent: total,
          state: { gift, game, pizza },
        }),
      });
    } catch {}
    onBackToMap();
  };

  const giftOptions = useMemo(
    () => [
      { value: 0, label: 'Открытка (0)' },
      { value: 300, label: 'Книга (300)' },
      { value: 700, label: 'Настольная игра (700)' },
      { value: 1000, label: 'Машинка (1000)' },
    ],
    []
  );

  const currentGiftIndex = giftOptions.findIndex((g) => g.value === gift) === -1
    ? 2
    : giftOptions.findIndex((g) => g.value === gift);

  const restartScenario = async () => {
    try {
      await apiFetch(`${apiBase}/runs/restart`, {
        method: 'POST',
        body: JSON.stringify({ scenarioCode: scenario.code }),
      });
    } catch {
      // ignore
    }
    setFinished(false);
    setReaction('');
    setGift(700);
    setGame(true);
    setPizza(false);
  };

  return (
    <>
      <BudgetStatus
        budget={remaining}
        label={`Бюджет: ${BASE_BUDGET} монет • Потрачено: ${totalSpent}`}
        difficulty={difficultyLabel}
        bump={false}
      />

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>«День рождения друга»</h2>
          <button className="secondary-btn" type="button" onClick={exitScenario}>
            Выйти из сценария
          </button>
        </div>

        {saveInfo && (
          <div className="text-muted" style={{ marginBottom: 10, fontSize: '0.85rem' }}>
            {saveInfo}
          </div>
        )}

        <div className="event-layout">
          <div className="event-dialog">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar-circle">
                {(characterName || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{characterName}</div>
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                  Подумай, что важнее всего
                </div>
              </div>
            </div>
            <div
              className="event-dialog-bubble"
              style={{ marginTop: 12 }}
              onClick={revealAll}
            >
              <div className="dialog-text">
                {typedText}
                {isTyping && <span className="caret" />}
              </div>
            </div>
            {!finished && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={speakStory}
                  disabled={isTyping && !storyDone}
                >
                  🔊 Зачитать
                </button>
                {!storyDone && (
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                    Дождись конца истории, чтобы сделать выбор.
                  </span>
                )}
              </div>
            )}
            {finished && (
              <div className="event-dialog-bubble" style={{ marginTop: 8 }}>
                {reaction}
              </div>
            )}
          </div>

          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Распредели бюджет</h3>

            {storyDone && (
              <>
            <div className="slider-row" style={{ marginBottom: 10 }}>
              <div>
                <div>Подарок другу (обязательно)</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                  Передвинь ползунок и выбери подарок
                </div>
              </div>
              <div style={{ flex: 1, marginLeft: 12 }}>
                <input
                  type="range"
                  min={0}
                  max={giftOptions.length - 1}
                  step={0.01}
                  value={currentGiftIndex}
                  disabled={finished}
                  onChange={(e) => {
                    const pos = Number(e.target.value);
                    const idx = Math.round(pos);
                    const opt = giftOptions[idx];
                    if (opt) setGift(opt.value);
                  }}
                  className="gift-slider"
                />
                <div className="gift-slider-labels">
                  {giftOptions.map((opt, idx) => (
                    <div
                      key={opt.value}
                      className={`gift-slider-label ${idx === currentGiftIndex ? 'active' : ''}`}
                    >
                      {giftLabel(opt.value)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="slider-row" style={{ marginBottom: 10 }}>
              <div>
                <div>Новая игра (желательно)</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                  Стоимость 500 монет
                </div>
              </div>
              <div className="slider-options">
                <button
                  type="button"
                  className={`pill-option ${game ? 'selected' : ''}`}
                  onClick={() => !finished && setGame(true)}
                >
                  Купить
                </button>
                <button
                  type="button"
                  className={`pill-option ${!game ? 'selected' : ''}`}
                  onClick={() => !finished && setGame(false)}
                >
                  Пропустить
                </button>
              </div>
            </div>

            <div className="slider-row" style={{ marginBottom: 10 }}>
              <div>
                <div>Поход в пиццерию (желательно)</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                  Стоимость 200 монет
                </div>
              </div>
              <div className="slider-options">
                <button
                  type="button"
                  className={`pill-option ${pizza ? 'selected' : ''}`}
                  onClick={() => !finished && setPizza(true)}
                >
                  Пойти
                </button>
                <button
                  type="button"
                  className={`pill-option ${!pizza ? 'selected' : ''}`}
                  onClick={() => !finished && setPizza(false)}
                >
                  Остаться дома
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div
                  className={overBudget ? 'text-danger' : 'text-muted'}
                  style={{ fontSize: '0.9rem' }}
                >
                  Остаток бюджета:{' '}
                  <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {remaining} монет
                  </strong>
                </div>
                {overBudget && (
                  <div className="text-danger" style={{ fontSize: '0.8rem' }}>
                    Ты вышел(ла) за пределы бюджета. Уменьши какую-то трату.
                  </div>
                )}
              </div>
              <button
                className={`primary-btn ${overBudget ? 'danger' : ''}`}
                type="button"
                disabled={overBudget || finished}
                onClick={handleFinish}
              >
                Готово
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      </div>

      {finished && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Итог сценария</h3>
          <p className="text-muted" style={{ marginTop: 0, marginBottom: 10 }}>
            Друг отнёсся к твоему выбору именно так, как описано выше. Ты уложился в бюджет — за это
            начисляются алмазики и сценарий считается пройденным.
          </p>
          <div className="chips-row" style={{ marginBottom: 10 }}>
            <span className="chip">
              Подарок: <strong>{giftLabel(gift)}</strong>
            </span>
            <span className="chip">
              Итоговый бюджет: <strong>{remaining} монет</strong>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="primary-btn" type="button" onClick={onBackToMap}>
              Вернуться к сценариям
            </button>
            <button className="secondary-btn" type="button" onClick={restartScenario}>
              Пройти ещё раз
            </button>
          </div>
        </div>
      )}
    </>
  );
}

