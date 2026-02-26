import React, { useEffect, useRef, useState } from 'react';
import AIChat from '../components/AIChat.jsx';

const HERO_TITLE = 'Образовательная игра, посвящённая основам финансовой грамотности';
const HERO_SUBTITLE = 'Зарабатывай баллы, выполняй задания и копи на мечту!';
const TYPEWRITER_MS = 45;

function HeroTitle({ visibleLen }) {
  const isTyping = visibleLen < HERO_TITLE.length;
  return (
    <h1 className="hero__title">
      {HERO_TITLE.slice(0, visibleLen)}
      {isTyping && <span className="caret" />}
    </h1>
  );
}

function HeroSubtitleTypewriter({ onDone }) {
  const [visibleLen, setVisibleLen] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setVisibleLen((n) => {
        const next = n + 1;
        if (next >= HERO_SUBTITLE.length && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          onDone?.();
        }
        return next;
      });
    }, TYPEWRITER_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [onDone]);

  const isTyping = visibleLen < HERO_SUBTITLE.length;
  return (
    <>
      {HERO_SUBTITLE.slice(0, visibleLen)}
      {isTyping && <span className="caret" />}
    </>
  );
}

const FEATURES = [
  {
    id: 'expenses',
    title: 'Образовательные игры',
    text: 'Ребёнок видит, на что тратятся карманные деньги.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 4L8 12v12c0 11 7 20 16 23 9-3 16-12 16-23V12L24 4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M24 20v12M20 24h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: 'piggy',
    title: 'Обучение обращению с финансами',
    text: 'Ребёнок видит на примере игр, как стоит обращаться с деньгами.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="24" cy="34" rx="16" ry="4" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M8 34V22a4 4 0 014-4h24a4 4 0 014 4v12" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M24 18v-6a4 4 0 00-4-4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: 'invest',
    title: 'Первые инвестиции',
    text: 'Простыми словами о том, как работают вложения.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 36L24 12l8 12 8-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M12 32h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: 'quests',
    title: 'Игровые задания',
    text: 'Выполняй финансовые квесты и получай награды.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M24 14v10l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: 'parent',
    title: 'Система достижений',
    text: 'Достижения, мотивирующие проходить игру и обучаться.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 8c-4 0-8 3-8 8v4h4v-4c0-2 2-4 4-4s4 2 4 4v4h4v-4c0-5-4-8-8-8z" stroke="currentColor" strokeWidth="2" fill="none" />
        <rect x="10" y="24" width="28" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M20 32h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: 'safe',
    title: 'Безопасно и весело',
    text: 'Адаптировано для детей от 7 лет.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 42c10 0 18-8 18-18S34 6 24 6 6 14 6 24s8 18 18 18z" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M18 24l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
];

const STEPS = [
  'Зарегистрируйтесь на сайте.',
  'Проходите мини-игры.',
  'Получайте результат.',
];

const TOP_N = 5;

export default function HomePage({ apiBase, onPlay, onLogin, onShowLeaderboard, user }) {
  const [leaderboard, setLeaderboard] = useState({ list: [] });
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [heroTitleLen, setHeroTitleLen] = useState(0);
  const [subtitleDone, setSubtitleDone] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const titleDone = heroTitleLen >= HERO_TITLE.length;

  useEffect(() => {
    const t = setInterval(() => {
      setHeroTitleLen((n) => {
        if (n >= HERO_TITLE.length) return n;
        return n + 1;
      });
    }, TYPEWRITER_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`${apiBase}/leaderboard?by=gems`);
        if (!res.ok || !alive) return;
        const data = await res.json();
        if (alive) setLeaderboard(data);
      } catch {
        // ignore
      } finally {
        if (alive) setLeaderboardLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [apiBase]);

  const list = leaderboard.list || [];
  const topFive = list.slice(0, TOP_N);
  const currentUserRank = user ? list.findIndex((u) => u.id === user.id) + 1 : 0;

  const handlePlayClick = (e) => {
    e.preventDefault();
    if (user) {
      onPlay();
    } else {
      onLogin();
    }
  };

  return (
    <>
    <div className="home-page__wrap">
      <aside className="home-page__sidebar">
        <div className="leaderboard-card">
          <h2 className="leaderboard-card__title">Топ по алмазам 💎</h2>
          {leaderboardLoading ? (
            <p className="text-muted">Загрузка...</p>
          ) : (
            <>
              {topFive.length > 0 ? (
                <ul className="leaderboard-list">
                  {topFive.map((u, i) => (
                    <li key={u.id} className={`leaderboard-item ${user && u.id === user.id ? 'leaderboard-item--me' : ''}`}>
                      <span className="leaderboard-item__rank">{i + 1}</span>
                      <div className="leaderboard-item__avatar">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          (u.name || u.login || '?').charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="leaderboard-item__name" title={u.name}>{u.name || u.login}</span>
                      <span className="leaderboard-item__gems">{Math.round(u.gems ?? 0)} 💎</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">Пока никого нет в рейтинге.</p>
              )}
              <button
                type="button"
                className="btn btn--outline leaderboard-card__more"
                onClick={onShowLeaderboard}
              >
                Ещё
              </button>
            </>
          )}
        </div>
      </aside>

      <div className="home-page__content">
        <section className="hero">
          <div className="container hero__grid">
            <div className="hero__content">
              <HeroTitle visibleLen={heroTitleLen} />
            </div>
            <div className="hero__visual">
              {titleDone && (
                <button
                  type="button"
                  onClick={handlePlayClick}
                  className="hero__play-tile"
                >
                  Начать играть
                </button>
              )}
              {titleDone && (
                <p className="hero__desc">
                  <HeroSubtitleTypewriter onDone={setSubtitleDone} />
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="features" id="features">
          <div className="container">
            <h2 className="section-title">Наши возможности</h2>
            <ul className="features__grid">
              {FEATURES.map(({ id, title, text, icon }) => (
                <li key={id} className="feature-card">
                  <div className="feature-card__icon" aria-hidden="true">{icon}</div>
                  <h3 className="feature-card__title">{title}</h3>
                  <p className="feature-card__text">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="how-to" id="about">
          <div className="container">
            <h2 className="section-title how-to__section-title">Как начать</h2>
            <ol className="how-to__list">
              {STEPS.map((text, i) => (
                <li key={i} className="how-to__item">
                  <span className="how-to__num" aria-hidden="true">{i + 1}</span>
                  <p className="how-to__text">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </div>
    <button
      type="button"
      className="home-support-chat"
      title="Чат с ИИ-помощником — задать вопрос по финансам"
      aria-label="Открыть чат с ИИ-помощником"
      aria-expanded={chatOpen}
      onClick={() => setChatOpen((v) => !v)}
    >
      <span className="home-support-chat__icon">💬</span>
      <span className="home-support-chat__label">Чат с ИИ</span>
    </button>
    <AIChat open={chatOpen} onClose={() => setChatOpen(false)} apiBase={apiBase} />
    </>
  );
}
