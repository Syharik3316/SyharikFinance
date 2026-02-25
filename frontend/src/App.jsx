import React, { useEffect, useMemo, useState } from 'react';
import ScenarioMap from './pages/ScenarioMap.jsx';
import ScenarioSavings from './pages/ScenarioSavings.jsx';
import ScenarioBirthday from './pages/ScenarioBirthday.jsx';
import ScenarioQuiz from './pages/ScenarioQuiz.jsx';
import IslandGame from './pages/IslandGame.jsx';
import ScenarioBusiness from './pages/ScenarioBusiness.jsx';
import ScenarioInvestment from './pages/ScenarioInvestment.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import VerifyEmail from './pages/auth/VerifyEmail.jsx';
import Profile from './pages/Profile.jsx';
import { apiFetch, clearToken, getToken, setToken } from './lib/api.js';

// Используем относительный путь, чтобы в проде ходить на тот же origin,
// а в dev-е проксировать через Vite.
const API_BASE = '/api';

export const Views = {
  LOGIN: 'LOGIN',
  REGISTER: 'REGISTER',
  VERIFY: 'VERIFY',
  PROFILE: 'PROFILE',
  MAP: 'MAP',
  SAVINGS: 'SAVINGS',
  BIRTHDAY: 'BIRTHDAY',
  QUIZ: 'QUIZ',
  ISLAND_GAME: 'ISLAND_GAME',
  BUSINESS: 'BUSINESS',
  INVESTMENT: 'INVESTMENT',
};

export default function App() {
  const [view, setView] = useState(Views.LOGIN);
  const [user, setUser] = useState(null);
  const [currentScenario, setCurrentScenario] = useState(null);
  const [budgetBump, setBudgetBump] = useState(false);
  const [booting, setBooting] = useState(true);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [difficulty, setDifficulty] = useState('novice'); // 'novice' | 'expert'

  const handleBudgetChangeAnimation = () => {
    setBudgetBump(true);
    setTimeout(() => setBudgetBump(false), 150);
  };

  const authedApiFetch = useMemo(() => {
    return async (path, options) => apiFetch(path, options);
  }, []);

  useEffect(() => {
    let alive = true;
    async function boot() {
      try {
        const token = getToken();
        if (!token) {
          if (!alive) return;
          setBooting(false);
          setView(Views.LOGIN);
          return;
        }

        const res = await authedApiFetch(`${API_BASE}/me`);
        if (!res.ok) {
          clearToken();
          if (!alive) return;
          setBooting(false);
          setView(Views.LOGIN);
          return;
        }
        const me = await res.json();
        if (!alive) return;
        setUser(me);
        setView(Views.PROFILE);
      } finally {
        if (alive) setBooting(false);
      }
    }
    boot();
    return () => {
      alive = false;
    };
  }, [authedApiFetch]);

  useEffect(() => {
    let alive = true;
    async function refreshOnMap() {
      if (view !== Views.MAP) return;
      if (!user) return;
      try {
        const res = await authedApiFetch(`${API_BASE}/me`);
        if (!res.ok || !alive) return;
        const me = await res.json();
        if (!alive) return;
        setUser(me);
      } catch {
        // игнорируем ошибку обновления профиля при входе на карту
      }
    }
    refreshOnMap();
    return () => {
      alive = false;
    };
  }, [authedApiFetch, user, view]);

  return (
    <div className="app-shell">
      {![Views.SAVINGS, Views.BIRTHDAY, Views.QUIZ, Views.ISLAND_GAME].includes(view) && (
        <header className="app-header">
          <div className="app-title-wrapper">
            <a
              href="https://syharik.ru"
              className="app-brand-link"
              target="_blank"
              rel="noreferrer"
            >
              <span className="header-logo-slot" />
              <span className="app-brand-text">SyharikFinance</span>
            </a>
          </div>
          <div className="header-user-slot">
            {user && (
              <button
                type="button"
                className="header-user-btn"
                onClick={() => setView(Views.PROFILE)}
              >
                <div className="avatar-circle small" style={{ overflow: 'hidden' }}>
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    (user.name || user.login || '?').charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.9rem' }}>{user.name}</div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                    @{user.login}
                  </div>
                </div>
              </button>
            )}
          </div>
        </header>
      )}

      <main
        className={[Views.SAVINGS, Views.BIRTHDAY, Views.QUIZ, Views.ISLAND_GAME, Views.BUSINESS, Views.INVESTMENT].includes(view)
          ? 'app-main scenario-main'
          : 'app-main'}
      >
        {booting && <div className="text-muted">Загрузка...</div>}

        {!booting && view === Views.LOGIN && (
          <Login
            apiBase={API_BASE}
            apiFetch={authedApiFetch}
            onRegister={() => setView(Views.REGISTER)}
            onVerified={() => setView(Views.LOGIN)}
            onLoggedIn={(token) => {
              setToken(token);
              // сразу грузим профиль
              (async () => {
                const res = await authedApiFetch(`${API_BASE}/me`);
                if (res.ok) {
                  const me = await res.json();
                  setUser(me);
                  setView(Views.PROFILE);
                }
              })();
            }}
            onNeedVerify={(email) => {
              setVerifyEmail(email);
              setView(Views.VERIFY);
            }}
          />
        )}

        {!booting && view === Views.REGISTER && (
          <Register
            apiBase={API_BASE}
            apiFetch={authedApiFetch}
            onBack={() => setView(Views.LOGIN)}
            onRegistered={(email) => {
              setVerifyEmail(email);
              setView(Views.VERIFY);
            }}
          />
        )}

        {!booting && view === Views.VERIFY && (
          <VerifyEmail
            apiBase={API_BASE}
            apiFetch={authedApiFetch}
            defaultEmail={verifyEmail}
            onBack={() => setView(user ? Views.PROFILE : Views.LOGIN)}
            onVerified={async () => {
              if (user) {
                const res = await authedApiFetch(`${API_BASE}/me`);
                if (res.ok) {
                  const me = await res.json();
                  setUser(me);
                }
                setView(Views.PROFILE);
              } else {
                setView(Views.LOGIN);
              }
            }}
          />
        )}

        {!booting && view === Views.PROFILE && user && (
          <Profile
            apiBase={API_BASE}
            apiFetch={authedApiFetch}
            user={user}
            onUserUpdated={async () => {
              const res = await authedApiFetch(`${API_BASE}/me`);
              if (res.ok) {
                const me = await res.json();
                setUser(me);
              }
            }}
            onGoPlay={() => setView(Views.MAP)}
            onGoGames={() => setView(Views.ISLAND_GAME)}
            onGoVerifyEmail={() => {
              setVerifyEmail(user.email || '');
              setView(Views.VERIFY);
            }}
            onLogout={() => {
              clearToken();
              setUser(null);
              setView(Views.LOGIN);
            }}
          />
        )}

        {view === Views.MAP && user && (
          <ScenarioMap
            apiBase={API_BASE}
            apiFetch={authedApiFetch}
            user={user}
            difficulty={difficulty}
            onChangeDifficulty={setDifficulty}
            onUserUpdated={async () => {
              const res = await authedApiFetch(`${API_BASE}/me`);
              if (res.ok) {
                const me = await res.json();
                setUser(me);
              }
            }}
            onOpenScenario={(scenario) => {
              setCurrentScenario(scenario);
              if (scenario.code === 'bike_dream') {
                setView(Views.SAVINGS);
              } else if (scenario.code === 'friend_birthday') {
                setView(Views.BIRTHDAY);
              } else if (scenario.code === 'money_quiz') {
                setView(Views.QUIZ);
              } else if (scenario.code === 'lemonade_business') {
                setView(Views.BUSINESS);
              } else if (scenario.code === 'investment_race') {
                setView(Views.INVESTMENT);
              }
            }}
          />
        )}

        {view === Views.SAVINGS && user && currentScenario && (
          <ScenarioSavings
            apiBase={API_BASE}
            apiFetch={authedApiFetch}
            user={user}
            scenario={currentScenario}
            difficulty={difficulty}
            budgetBump={budgetBump}
            onBudgetBump={handleBudgetChangeAnimation}
            onBackToMap={() => setView(Views.MAP)}
          />
        )}

        {view === Views.BIRTHDAY && user && currentScenario && (
          <ScenarioBirthday
            apiBase={API_BASE}
            apiFetch={authedApiFetch}
            user={user}
            scenario={currentScenario}
            difficulty={difficulty}
            onBackToMap={() => setView(Views.MAP)}
          />
        )}

        {view === Views.QUIZ && user && currentScenario && (
          <ScenarioQuiz
            apiBase={API_BASE}
            apiFetch={authedApiFetch}
            user={user}
            scenario={currentScenario}
            difficulty={difficulty}
            onBackToMap={() => setView(Views.MAP)}
          />
        )}

        {view === Views.BUSINESS && user && currentScenario && (
          <ScenarioBusiness
            apiBase={API_BASE}
            apiFetch={authedApiFetch}
            user={user}
            scenario={currentScenario}
            difficulty={difficulty}
            onBackToMap={() => setView(Views.MAP)}
          />
        )}

        {view === Views.INVESTMENT && user && currentScenario && (
          <ScenarioInvestment
            apiBase={API_BASE}
            apiFetch={authedApiFetch}
            user={user}
            scenario={currentScenario}
            difficulty={difficulty}
            onBackToMap={() => setView(Views.MAP)}
          />
        )}

        {view === Views.ISLAND_GAME && user && (
          <IslandGame
            apiBase={API_BASE}
            apiFetch={authedApiFetch}
            difficulty={difficulty}
            onBack={() => setView(Views.PROFILE)}
          />
        )}
      </main>
      {![Views.SAVINGS, Views.BIRTHDAY, Views.QUIZ, Views.ISLAND_GAME, Views.BUSINESS].includes(view) && (
        <footer className="app-footer">
          <nav className="app-footer-links">
            <a href="https://syharik.ru" target="_blank" rel="noreferrer">SyharikFinance</a>
            <a href="mailto:admin@syharik.ru">Связаться с нами</a>
          </nav>
          <div>© 2026 SyharikFinance. Все права защищены.</div>
          <div>e-mail: admin@syharik.ru</div>
        </footer>
      )}
    </div>
  );
}
