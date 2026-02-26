import React, { useEffect, useMemo, useState } from 'react';
import { MusicProvider } from './contexts/MusicContext.jsx';
import ScenarioMap from './pages/ScenarioMap.jsx';
import ScenarioSavings from './pages/ScenarioSavings.jsx';
import ScenarioQuiz from './pages/ScenarioQuiz.jsx';
import IslandGame from './pages/IslandGame.jsx';
import ScenarioBusiness from './pages/ScenarioBusiness.jsx';
import ScenarioInvestment from './pages/ScenarioInvestment.jsx';
import HomePage from './pages/HomePage.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import VerifyEmail from './pages/auth/VerifyEmail.jsx';
import Profile from './pages/Profile.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import { apiFetch, clearToken, getToken, setToken } from './lib/api.js';

// Используем относительный путь, чтобы в проде ходить на тот же origin,
// а в dev-е проксировать через Vite.
const API_BASE = '/api';

export const Views = {
  HOME: 'HOME',
  LOGIN: 'LOGIN',
  REGISTER: 'REGISTER',
  VERIFY: 'VERIFY',
  PROFILE: 'PROFILE',
  MAP: 'MAP',
  LEADERBOARD: 'LEADERBOARD',
  SAVINGS: 'SAVINGS',
  BIRTHDAY: 'BIRTHDAY',
  QUIZ: 'QUIZ',
  ISLAND_GAME: 'ISLAND_GAME',
  BUSINESS: 'BUSINESS',
  INVESTMENT: 'INVESTMENT',
};

const DIFFICULTY_STORAGE_KEY = 'syharik_difficulty';
const VIEW_STORAGE_KEY = 'devhack_view';
const SCENARIO_CODE_STORAGE_KEY = 'devhack_scenario_code';

const FULLSCREEN_VIEWS = [Views.SAVINGS, Views.QUIZ, Views.ISLAND_GAME, Views.BUSINESS, Views.INVESTMENT];
const SCENARIO_VIEWS = [Views.SAVINGS, Views.QUIZ, Views.BUSINESS, Views.INVESTMENT];
const RESTORABLE_VIEWS = [Views.HOME, Views.PROFILE, Views.MAP, Views.LEADERBOARD, ...SCENARIO_VIEWS, Views.ISLAND_GAME];

export default function App() {
  const [view, setView] = useState(Views.HOME);
  const [user, setUser] = useState(null);
  const [profileSection, setProfileSection] = useState('profile');
  const [currentScenario, setCurrentScenario] = useState(null);
  const [budgetBump, setBudgetBump] = useState(false);
  const [booting, setBooting] = useState(true);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyInitialDevCode, setVerifyInitialDevCode] = useState('');
  const [difficulty, setDifficulty] = useState(() => {
    try {
      const v = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
      return v === 'expert' ? 'expert' : 'novice';
    } catch {
      return 'novice';
    }
  });

  const handleDifficultyChange = (v) => {
    setDifficulty(v);
    try {
      localStorage.setItem(DIFFICULTY_STORAGE_KEY, v);
    } catch {}
  };

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
          setView(Views.HOME);
          return;
        }

        const res = await authedApiFetch(`${API_BASE}/me`);
        if (!res.ok) {
          clearToken();
          if (!alive) return;
          setBooting(false);
          setView(Views.HOME);
          return;
        }
        const me = await res.json();
        if (!alive) return;
        setUser(me);

        try {
          const storedView = sessionStorage.getItem(VIEW_STORAGE_KEY);
          const storedCode = sessionStorage.getItem(SCENARIO_CODE_STORAGE_KEY);
          if (storedView && RESTORABLE_VIEWS.includes(storedView)) {
            if (SCENARIO_VIEWS.includes(storedView) && storedCode) {
              const scenariosRes = await authedApiFetch(`${API_BASE}/scenarios`);
              if (scenariosRes.ok && alive) {
                const list = await scenariosRes.json();
                const scenario = list.find((s) => s.code === storedCode);
                if (scenario) {
                  setCurrentScenario(scenario);
                  setView(storedView);
                } else {
                  setView(Views.MAP);
                }
              } else {
                setView(Views.MAP);
              }
            } else {
              setView(storedView);
            }
          } else {
            setView(Views.HOME);
          }
        } catch {
          setView(Views.HOME);
        }
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
    try {
      sessionStorage.setItem(VIEW_STORAGE_KEY, view);
      if (SCENARIO_VIEWS.includes(view) && currentScenario?.code) {
        sessionStorage.setItem(SCENARIO_CODE_STORAGE_KEY, currentScenario.code);
      } else {
        sessionStorage.removeItem(SCENARIO_CODE_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [view, currentScenario]);

  /* Обновление /me только при входе на карту, без зависимости от user — иначе цикл setUser → эффект → fetch → setUser */
  const lastViewRef = React.useRef(view);
  useEffect(() => {
    if (view !== Views.MAP) {
      lastViewRef.current = view;
      return;
    }
    if (!user) return;
    if (lastViewRef.current === Views.MAP) return;
    lastViewRef.current = Views.MAP;
    let alive = true;
    (async () => {
      try {
        const res = await authedApiFetch(`${API_BASE}/me`);
        if (!res.ok || !alive) return;
        const me = await res.json();
        if (!alive) return;
        setUser(me);
      } catch {
        // игнорируем ошибку обновления профиля при входе на карту
      }
    })();
    return () => {
      alive = false;
    };
  }, [authedApiFetch, user, view]);

  const playMusicWhen = FULLSCREEN_VIEWS.includes(view);

  return (
    <MusicProvider playWhenView={playMusicWhen}>
    <div className="app-shell">
      {!FULLSCREEN_VIEWS.includes(view) && (
        <Header
          onGoHome={() => setView(Views.HOME)}
          onOpenProfileSection={(section) => {
            setProfileSection(section || 'profile');
            setView(Views.PROFILE);
          }}
          onGoLogin={() => setView(Views.LOGIN)}
          onGoMap={() => setView(Views.MAP)}
          onGoGames={() => setView(Views.ISLAND_GAME)}
          onLogout={() => {
            clearToken();
            setUser(null);
            setView(Views.HOME);
          }}
          user={user}
        />
      )}

      <main
        className={FULLSCREEN_VIEWS.includes(view) ? 'app-main scenario-main' : 'app-main'}
      >
        {booting && <div className="container" style={{ paddingTop: 24 }}><div className="text-muted">Загрузка...</div></div>}

        {!booting && view === Views.HOME && (
          <HomePage
            apiBase={API_BASE}
            onPlay={() => setView(Views.MAP)}
            onLogin={() => setView(Views.LOGIN)}
            onShowLeaderboard={() => setView(Views.LEADERBOARD)}
            user={user}
          />
        )}

        {!booting && view === Views.LOGIN && (
          <Login
            apiBase={API_BASE}
            apiFetch={authedApiFetch}
            onRegister={() => setView(Views.REGISTER)}
            onVerified={() => setView(Views.LOGIN)}
            onLoggedIn={(token) => {
              setToken(token);
              (async () => {
                const res = await authedApiFetch(`${API_BASE}/me`);
                if (res.ok) {
                  const me = await res.json();
                  setUser(me);
                  setView(Views.HOME);
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
            onRegistered={(email, devCode) => {
              setVerifyEmail(email);
              setVerifyInitialDevCode(devCode || '');
              setView(Views.VERIFY);
            }}
          />
        )}

        {!booting && view === Views.VERIFY && (
          <VerifyEmail
            apiBase={API_BASE}
            apiFetch={authedApiFetch}
            defaultEmail={verifyEmail}
            initialDevCode={verifyInitialDevCode}
            onBack={() => { setView(user ? Views.PROFILE : Views.LOGIN); setVerifyInitialDevCode(''); }}
            onVerified={async () => {
              if (user) {
                const res = await authedApiFetch(`${API_BASE}/me`);
                if (res.ok) {
                  const me = await res.json();
                  setUser(me);
                }
                setView(Views.HOME);
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
            initialSection={profileSection}
            onGoHome={() => setView(Views.HOME)}
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
              setVerifyInitialDevCode('');
              setView(Views.VERIFY);
            }}
            onLogout={() => {
              clearToken();
              setUser(null);
              setView(Views.HOME);
            }}
            difficulty={difficulty}
            onDifficultyChange={handleDifficultyChange}
          />
        )}

        {!booting && view === Views.LEADERBOARD && (
          <LeaderboardPage
            apiBase={API_BASE}
            user={user}
            onBack={() => setView(Views.HOME)}
          />
        )}

        {view === Views.MAP && user && (
          <ScenarioMap
            apiBase={API_BASE}
            apiFetch={authedApiFetch}
            user={user}
            difficulty={difficulty}
            onOpenIslandGame={() => setView(Views.ISLAND_GAME)}
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
            user={user}
            difficulty={difficulty}
            onBack={() => setView(Views.PROFILE)}
            onUserUpdated={async () => {
              const res = await authedApiFetch(`${API_BASE}/me`);
              if (res.ok) {
                const me = await res.json();
                setUser(me);
              }
            }}
          />
        )}
      </main>
      {!FULLSCREEN_VIEWS.includes(view) && (
        <Footer onGoHome={() => setView(Views.HOME)} />
      )}
    </div>
    </MusicProvider>
  );
}
