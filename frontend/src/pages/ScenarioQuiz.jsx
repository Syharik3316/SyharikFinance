import React, { useEffect, useMemo, useRef, useState } from 'react';
import BudgetStatus from '../components/BudgetStatus.jsx';

const PASS_THRESHOLD = 0.8;
const BASE_SECONDS_EXPERT = 20;

const QUESTIONS = [
  {
    id: 'needs_vs_wants',
    text: 'Что важнее купить в первую очередь?',
    options: ['Еду и лекарства', 'Ещё одну игрушку', 'Сладости каждый день', 'Наклейки просто так'],
    correct: 0,
    hint: 'Подумай: без чего трудно прожить?',
    explain: 'Сначала важно закрывать нужды: еда, здоровье, безопасность. Желания — после.',
  },
  {
    id: 'goal',
    text: 'Зачем ставить финансовую цель (например, накопить на велосипед)?',
    options: [
      'Чтобы понимать, ради чего копишь',
      'Чтобы тратить всё сразу',
      'Чтобы деньги пропали',
      'Чтобы спорить с друзьями',
    ],
    correct: 0,
    hint: 'Цель помогает держаться плана.',
    explain: 'Цель делает накопления понятными: ты знаешь, сколько нужно и ради чего стараешься.',
  },
  {
    id: 'budget',
    text: 'Что такое бюджет?',
    options: [
      'План, куда пойдут деньги',
      'Куча денег в кармане',
      'Случайные покупки',
      'Секретный пароль',
    ],
    correct: 0,
    hint: 'Это план.',
    explain: 'Бюджет — это план доходов и расходов, чтобы денег хватало на важное.',
  },
  {
    id: 'impulse',
    text: 'Что помогает меньше делать импульсивных покупок?',
    options: ['Список покупок', 'Покупать всё, что нравится', 'Сразу тратить всю сумму', 'Не думать'],
    correct: 0,
    hint: 'Список и правило “подумай 10 минут”.',
    explain: 'Список и пауза перед покупкой помогают не тратить деньги “на эмоциях”.',
  },
  {
    id: 'compare',
    text: 'Как купить выгоднее?',
    options: ['Сравнить цены в двух магазинах', 'Взять первое, что увидел', 'Купить самое дорогое', 'Не смотреть цену'],
    correct: 0,
    hint: 'Сравнение — друг экономии.',
    explain: 'Сравнивая цены и качество, можно найти лучший вариант и сэкономить.',
  },
  {
    id: 'discount',
    text: 'Скидка — это всегда выгодно?',
    options: ['Нет, если вещь тебе не нужна', 'Да, всегда', 'Да, даже если нет денег', 'Нужно покупать сразу'],
    correct: 0,
    hint: 'Выгодно только нужное.',
    explain: 'Скидка помогает, если покупка всё равно нужна. Иначе это лишняя трата.',
  },
  {
    id: 'savings_rule',
    text: 'Как проще начать копить?',
    options: ['Откладывать небольшую сумму регулярно', 'Ждать, пока появятся “лишние” деньги', 'Не считать расходы', 'Тратить по настроению'],
    correct: 0,
    hint: 'Регулярность важнее размера.',
    explain: 'Даже маленькие регулярные суммы со временем превращаются в большую копилку.',
  },
  {
    id: 'piggy',
    text: 'Где безопаснее хранить накопления ребёнку?',
    options: ['В копилке или с родителями', 'На улице в тайнике', 'В кармане всегда', 'Раздать друзьям'],
    correct: 0,
    hint: 'Безопасность важнее.',
    explain: 'Так меньше риск потерять деньги или чтобы их украли.',
  },
  {
    id: 'loan',
    text: 'Если ты берёшь деньги в долг, что важно помнить?',
    options: ['Нужно вернуть в срок', 'Можно не возвращать', 'Сумма сама исчезнет', 'Долг — подарок'],
    correct: 0,
    hint: 'Долг нужно возвращать.',
    explain: 'Долги портят отношения, если не возвращать. Лучше занимать только если уверен(а), что вернёшь.',
  },
  {
    id: 'subscription',
    text: 'Подписка в игре — что важно сделать перед покупкой?',
    options: ['Узнать цену и как отменить', 'Купить сразу', 'Скрыть от родителей', 'Не читать условия'],
    correct: 0,
    hint: 'Условия важны.',
    explain: 'Подписки могут списывать деньги каждый месяц. Важно знать цену и как отключить.',
  },
  {
    id: 'atm',
    text: 'Можно ли говорить PIN‑код от карты друзьям?',
    options: ['Нет, никогда', 'Да, если друг хороший', 'Да, если попросили', 'Можно в чате'],
    correct: 0,
    hint: 'PIN — секрет.',
    explain: 'PIN‑код — это ключ к твоим деньгам. Его нельзя сообщать никому.',
  },
  {
    id: 'password',
    text: 'Какой пароль надёжнее?',
    options: ['Длинный и сложный (буквы+цифры)', '1234', 'qwerty', 'твоё имя'],
    correct: 0,
    hint: 'Длина и разнообразие символов.',
    explain: 'Надёжный пароль сложнее угадать и взломать.',
  },
  {
    id: 'scam',
    text: 'Тебе пишет “банк” и просит код из SMS. Что делать?',
    options: ['Не отправлять и рассказать взрослым', 'Срочно отправить', 'Переслать другу', 'Опубликовать в соцсетях'],
    correct: 0,
    hint: 'Коды из SMS — секрет.',
    explain: 'Это может быть мошенник. Коды нельзя сообщать никому.',
  },
  {
    id: 'change',
    text: 'Почему полезно просить чек в магазине?',
    options: ['Чтобы проверить покупку и цену', 'Чтобы было больше бумаги', 'Чтобы чек красивый', 'Чтобы потерять его'],
    correct: 0,
    hint: 'Чек — доказательство покупки.',
    explain: 'Чек помогает убедиться в цене и вернуть товар, если что-то не так.',
  },
  {
    id: 'plan_big',
    text: 'Ты хочешь дорогую вещь. Что лучше сделать?',
    options: ['Составить план накоплений', 'Тратить деньги на мелочи', 'Ничего не делать', 'Взять в долг у всех'],
    correct: 0,
    hint: 'План помогает.',
    explain: 'План показывает, сколько нужно откладывать и сколько времени займёт цель.',
  },
  {
    id: 'priority',
    text: 'У тебя мало денег. Как выбрать покупку?',
    options: ['Выбрать самое важное', 'Купить всё понемногу', 'Потратить на сладкое', 'Спрятаться'],
    correct: 0,
    hint: 'Приоритеты.',
    explain: 'Когда денег мало, важно выбрать главное и отказаться от лишнего.',
  },
  {
    id: 'donate',
    text: 'Благотворительность — это…',
    options: ['Помощь тем, кому сложнее', 'Покупка игрушек', 'Обман', 'Трата без смысла'],
    correct: 0,
    hint: 'Это помощь.',
    explain: 'Благотворительность — добровольная помощь людям, животным или важным делам.',
  },
  {
    id: 'earn',
    text: 'Как ребёнок может заработать честно?',
    options: ['Помочь по дому по договорённости', 'Взять чужие вещи', 'Обмануть', 'Украсть'],
    correct: 0,
    hint: 'Честно и безопасно.',
    explain: 'Можно выполнять простые дела по договорённости со взрослыми или помогать соседям.',
  },
  {
    id: 'split',
    text: 'Хороший способ тратить карманные деньги:',
    options: ['Часть — на копилку, часть — на радости', 'Сразу всё потратить', 'Никогда не копить', 'Никогда не тратить'],
    correct: 0,
    hint: 'Баланс.',
    explain: 'Баланс помогает и радоваться сейчас, и двигаться к цели.',
  },
  {
    id: 'ads',
    text: 'Реклама говорит: “Купи сейчас!”. Что лучше сделать?',
    options: ['Подумать, нужно ли тебе это', 'Купить сразу', 'Попросить ещё денег', 'Обидеться'],
    correct: 0,
    hint: 'Пауза — сила.',
    explain: 'Реклама хочет, чтобы ты купил(а) быстро. Полезно сделать паузу и подумать.',
  },
  {
    id: 'quality',
    text: 'Как выбрать вещь разумно?',
    options: ['Смотреть на качество и цену', 'Брать самое яркое', 'Брать самое дорогое', 'Не читать отзывы'],
    correct: 0,
    hint: 'Качество и цена вместе.',
    explain: 'Иногда лучше купить одну качественную вещь, чем много дешёвых, которые быстро ломаются.',
  },
  {
    id: 'overpay',
    text: 'Почему важно не тратить больше, чем у тебя есть?',
    options: ['Иначе появятся долги', 'Потому что так веселее', 'Потому что деньги бесконечны', 'Потому что так делают все'],
    correct: 0,
    hint: 'Долги — проблема.',
    explain: 'Если тратить больше, чем есть, придётся занимать и возвращать — это стресс и риск.',
  },
  {
    id: 'save_receipt',
    text: 'Купил(а) вещь. Когда полезно хранить чек?',
    options: ['Если может понадобиться обмен/возврат', 'Всегда выбрасывать сразу', 'Никогда не брать чек', 'Только ради коллекции'],
    correct: 0,
    hint: 'Чек помогает при возврате.',
    explain: 'Если товар оказался с браком или не подошёл — чек поможет вернуть или обменять.',
  },
  {
    id: 'charity_fake',
    text: 'Незнакомец просит “пожертвовать” и присылает странную ссылку. Что делать?',
    options: ['Не переходить и спросить взрослого', 'Сразу перевести', 'Отправить пароль', 'Нажать на все ссылки'],
    correct: 0,
    hint: 'Осторожно со ссылками.',
    explain: 'Мошенники часто используют “сборы”. Всегда проверяй и советуйся со взрослыми.',
  },
  {
    id: 'interest',
    text: 'Если деньги лежат в банке на вкладе, что такое “проценты”?',
    options: ['Дополнительные деньги за хранение', 'Штраф', 'Случайная сумма', 'Секретный код'],
    correct: 0,
    hint: 'Банк платит за хранение.',
    explain: 'Проценты — это прибавка к сумме вклада за то, что деньги лежат в банке.',
  },
  {
    id: 'ask_parents',
    text: 'Перед крупной покупкой ребёнку лучше…',
    options: ['Обсудить с родителями', 'Спрятать покупку', 'Попросить у незнакомых', 'Сделать вид, что ничего не было'],
    correct: 0,
    hint: 'Обсуждение помогает.',
    explain: 'Взрослые помогут оценить, нужна ли покупка, и как лучше потратить деньги.',
  },
  {
    id: 'sell_old',
    text: 'Что можно сделать со старыми вещами, которые не нужны?',
    options: ['Продать или отдать', 'Сломать', 'Выбросить новые вещи', 'Прятать навсегда'],
    correct: 0,
    hint: 'Ненужное может помочь.',
    explain: 'Можно продать на ярмарке или отдать тем, кому нужно — это полезно и разумно.',
  },
  {
    id: 'emergency',
    text: 'Зачем иметь “запас” денег (подушку безопасности)?',
    options: ['На неожиданные ситуации', 'Чтобы хвастаться', 'Чтобы всё тратить быстрее', 'Чтобы не учиться'],
    correct: 0,
    hint: 'Непредвиденные траты.',
    explain: 'Запас помогает, когда внезапно нужна важная покупка или помощь.',
  },
  {
    id: 'share_money',
    text: 'Друг просит дать деньги “на минутку”. Что лучше сделать?',
    options: ['Спросить, зачем, и решать аккуратно', 'Отдать всегда', 'Отдать и забыть', 'Взять у него ещё'],
    correct: 0,
    hint: 'Вопросы — это нормально.',
    explain: 'Можно помочь, но лучше понимать, на что деньги и как их вернут. Не стесняйся обсуждать условия.',
  },
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function ScenarioQuiz({ apiBase, apiFetch, user, scenario, difficulty, onBackToMap }) {
  const isExpert = difficulty === 'expert';
  const difficultyLabel = isExpert ? 'Знаток' : 'Новичок';

  const [loading, setLoading] = useState(true);
  const [saveInfo, setSaveInfo] = useState('');

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({});
  const [phase, setPhase] = useState('question'); // question -> feedback -> finished

  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef(null);
  const fullTextRef = useRef('');

  const [secondsLeft, setSecondsLeft] = useState(BASE_SECONDS_EXPERT);
  const timerRef = useRef(null);

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const questions = useMemo(() => QUESTIONS, []);
  const total = questions.length;
  const currentQuestion = questions[clamp(current, 0, total - 1)];
  const shuffledOptionIndices = useMemo(
    () => shuffleArray(currentQuestion.options.map((_, i) => i)),
    [current, currentQuestion.id]
  );

  const startTypewriter = (text) => {
    if (typingTimer.current) {
      clearInterval(typingTimer.current);
      typingTimer.current = null;
    }
    fullTextRef.current = text;
    setTypedText('');
    setIsTyping(true);
    let i = 0;
    typingTimer.current = setInterval(() => {
      i += 1;
      setTypedText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(typingTimer.current);
        typingTimer.current = null;
        setIsTyping(false);
      }
    }, 30);
  };

  const revealAll = () => {
    if (!isTyping) return;
    if (typingTimer.current) {
      clearInterval(typingTimer.current);
      typingTimer.current = null;
    }
    setTypedText(fullTextRef.current);
    setIsTyping(false);
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    window.speechSynthesis.speak(utterance);
  };

  const saveRun = async ({ nextIndex, nextAnswers, nextSecondsLeft }) => {
    try {
      setSaveInfo('Сохраняем...');
      await apiFetch(`${apiBase}/runs/save`, {
        method: 'POST',
        body: JSON.stringify({
          scenarioCode: scenario.code,
          dayIndex: nextIndex,
          budget: Number.isFinite(nextSecondsLeft) ? nextSecondsLeft : 0,
          earned: 0,
          spent: 0,
          state: { answers: nextAnswers, secondsLeft: Number.isFinite(nextSecondsLeft) ? nextSecondsLeft : undefined },
        }),
      });
      setSaveInfo('Сохранено');
    } catch {
      setSaveInfo('');
    } finally {
      setTimeout(() => setSaveInfo(''), 900);
    }
  };

  const initRun = async () => {
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

      const st = run?.state || {};
      const savedAnswers = st.answers && typeof st.answers === 'object' ? st.answers : {};
      const nextIndex = Number.isFinite(run?.dayIndex) ? run.dayIndex : 0;
      const savedSecondsLeft = Number.isFinite(st.secondsLeft) ? st.secondsLeft : BASE_SECONDS_EXPERT;

      setAnswers(savedAnswers);
      setCurrent(clamp(nextIndex, 0, total - 1));
      setSecondsLeft(savedSecondsLeft);
      setSelected(null);
      setPhase('question');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, apiFetch, scenario.code]);

  useEffect(() => {
    if (loading) return;
    const q = currentQuestion;
    const base = `Вопрос ${current + 1} из ${total}\n\n${q.text}`;
    const hint = !isExpert && q.hint ? `\n\nПодсказка: ${q.hint}` : '';
    startTypewriter(base + hint);
    setSelected(answers[q.id] ?? null);
    setPhase('question');

    return () => {
      if (typingTimer.current) clearInterval(typingTimer.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, loading]);

  // Таймер для режима "Знаток" запускаем только после того, как текст полностью напечатан
  useEffect(() => {
    if (!isExpert) return;
    if (loading) return;
    if (isTyping) return;
    if (phase !== 'question') return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpert, loading, isTyping, phase, current]);

  useEffect(() => {
    if (!isExpert) return;
    if (loading) return;
    if (isTyping) return;
    if (phase !== 'question') return;
    if (secondsLeft > 0) return;

    // время вышло: считаем как неверный и идём дальше
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    handleConfirm(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, isExpert, isTyping, phase, loading]);

  const handleSelect = (idx) => {
    if (phase !== 'question') return;
    if (isTyping) return;
    setSelected(idx);
  };

  const handleConfirm = async (autoTimeout = false) => {
    if (phase !== 'question') return;
    if (isTyping) return;
    if (selected == null && !autoTimeout) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const q = currentQuestion;
    const chosenOriginalIndex = selected == null ? -1 : shuffledOptionIndices[selected];
    const nextAnswers = { ...answers, [q.id]: chosenOriginalIndex };
    setAnswers(nextAnswers);

    await saveRun({ nextIndex: current, nextAnswers, nextSecondsLeft: secondsLeft });

    if (!isExpert) {
      const ok = chosenOriginalIndex === q.correct;
      const feedback = ok ? `✅ Верно.\n\n${q.explain}` : `❌ Неверно.\n\n${q.explain}`;
      startTypewriter(feedback);
      setPhase('feedback');
    } else {
      // в режиме "Знаток" не показываем подсказки/объяснения — идём дальше сразу
      goNext(nextAnswers);
    }
  };

  const goNext = async (nextAnswersOverride) => {
    const nextAnswers = nextAnswersOverride || answers;
    if (current < total - 1) {
      setCurrent((c) => c + 1);
      return;
    }

    const correctCount = questions.filter((q) => nextAnswers[q.id] === q.correct).length;
    const ratio = total > 0 ? correctCount / total : 0;
    const passed = ratio >= PASS_THRESHOLD;

    setPhase('finished');
    const summary =
      `Квиз завершён.\n\nПравильных ответов: ${correctCount} из ${total} (${Math.round(ratio * 100)}%).\n\n` +
      (passed
        ? 'Отлично! Ты прошёл(ла) уровень: основы финансовой грамотности усвоены.'
        : 'Пока не хватило до победы. Нужно 80% правильных ответов. Попробуй ещё раз — и будет лучше!');
    startTypewriter(summary);

    try {
      await apiFetch(`${apiBase}/runs/finish`, {
        method: 'POST',
        body: JSON.stringify({
          scenarioCode: scenario.code,
          status: passed ? 'passed' : 'failed',
          finalBudget: Math.round(ratio * 100), // сохраняем лучший процент в Progress.bestResult
          earned: correctCount,
          spent: total - correctCount,
        }),
      });
    } catch {
      // ignore in prototype
    }
  };

  const handleNext = () => {
    if (phase === 'feedback') {
      goNext();
    }
  };

  const handleRestart = async () => {
    try {
      await apiFetch(`${apiBase}/runs/restart`, {
        method: 'POST',
        body: JSON.stringify({ scenarioCode: scenario.code }),
      });
    } catch {
      // ignore
    }
    setCurrent(0);
    setAnswers({});
    setSelected(null);
    setPhase('question');
    await initRun();
  };

  if (loading) {
    return <div className="text-muted">Загружаем квиз...</div>;
  }

  const showOptions = !isTyping && phase === 'question';
  const showConfirm = showOptions && selected != null;
  const showNextAfterFeedback = phase === 'feedback' && !isTyping;

  const correctCountNow = questions.filter((q) => answers[q.id] === q.correct).length;

  const handleExitToMap = async () => {
    try {
      await saveRun({ nextIndex: current, nextAnswers: answers, nextSecondsLeft: secondsLeft });
    } catch {
      // ignore
    }
    onBackToMap();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <BudgetStatus
        budget={user.gems || 0}
        label="💎"
        difficulty={difficultyLabel}
        bump={false}
        unit="💎"
      />

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Финансовый квиз</h2>
          <button className="secondary-btn" type="button" onClick={handleExitToMap}>
            Выйти
          </button>
        </div>

        <div className="quiz-meta" style={{ marginBottom: 10 }}>
          <span className="chip">❓ {current + 1}/{total}</span>
          {!isExpert && <span className="chip">Подсказки: включены</span>}
          {isExpert && <span className="chip">⏱ {Math.max(0, secondsLeft)} сек</span>}
          <span className="chip">✅ {correctCountNow}</span>
          {saveInfo && <span className="chip">{saveInfo}</span>}
        </div>

        <div className="event-dialog-bubble" onClick={revealAll} style={{ cursor: isTyping ? 'pointer' : 'default' }}>
          <div className="dialog-text">
            {typedText}
            {isTyping && <span className="caret" />}
          </div>
        </div>

        {phase === 'question' && (
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="secondary-btn" type="button" onClick={() => speakText(fullTextRef.current)}>
              🔊 Зачитать
            </button>
          </div>
        )}

        {showOptions && (
          <div className="choices-list" style={{ marginTop: 12 }}>
            {shuffledOptionIndices.map((originalIndex, displayIndex) => {
              const isSelected = selected === displayIndex;
              return (
                <button
                  key={originalIndex}
                  type="button"
                  className={`quiz-option-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(displayIndex)}
                >
                  {currentQuestion.options[originalIndex]}
                </button>
              );
            })}
          </div>
        )}

        {phase === 'question' && (
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            {!isExpert ? (
              <button className="primary-btn" type="button" onClick={() => handleConfirm(false)} disabled={!showConfirm}>
                Проверить
              </button>
            ) : (
              <button className="secondary-btn" type="button" onClick={() => handleConfirm(false)} disabled={!showConfirm}>
                Дальше
              </button>
            )}
          </div>
        )}

        {showNextAfterFeedback && (
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="secondary-btn" type="button" onClick={handleNext}>
              {current < total - 1 ? 'Дальше' : 'Завершить'}
            </button>
          </div>
        )}

        {phase === 'finished' && !isTyping && (
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button className="primary-btn" type="button" onClick={onBackToMap}>
              К сценариям
            </button>
            <button className="secondary-btn" type="button" onClick={handleRestart}>
              Пройти ещё раз
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

