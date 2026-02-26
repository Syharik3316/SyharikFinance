import React, { useEffect, useMemo, useState } from 'react';
import { useMusic } from '../contexts/MusicContext.jsx';

const TABS = {
  PROFILE: 'PROFILE',
  SECURITY: 'SECURITY',
  ACHIEVEMENTS: 'ACHIEVEMENTS',
};

const SECTION_TO_TAB = { profile: 'PROFILE', security: 'SECURITY', achievements: 'ACHIEVEMENTS' };

export default function Profile({
  apiBase,
  apiFetch,
  user,
  initialSection = 'profile',
  onGoHome,
  onUserUpdated,
  onGoPlay,
  onGoGames,
  onGoVerifyEmail,
  onLogout,
  difficulty = 'novice',
  onDifficultyChange,
}) {
  const hasPassedScenario = useMemo(
    () => user.Progresses?.some((p) => p.status === 'passed') ?? false,
    [user.Progresses]
  );
  const [tab, setTab] = useState(SECTION_TO_TAB[initialSection] || TABS.PROFILE);
  const [name, setName] = useState(user.name || '');
  const [login, setLogin] = useState(user.login || '');
  const [email, setEmail] = useState(user.email || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passMsg, setPassMsg] = useState('');
  const [passErr, setPassErr] = useState('');

  const [uploading, setUploading] = useState(false);
  const [avatarErr, setAvatarErr] = useState('');

  const achievements = useMemo(() => user.Achievements || [], [user]);
  const gems = Math.round(user.gems || 0);
  const { musicEnabled, setMusicEnabled } = useMusic();

  useEffect(() => {
    setName(user.name || '');
    setLogin(user.login || '');
    setEmail(user.email || '');
  }, [user]);

  useEffect(() => {
    const t = SECTION_TO_TAB[initialSection] || TABS.PROFILE;
    setTab(t);
  }, [initialSection]);

  const saveProfile = async () => {
    setProfileMsg('');
    setProfileErr('');
    try {
      setSavingProfile(true);
      const res = await apiFetch(`${apiBase}/me`, {
        method: 'PATCH',
        body: JSON.stringify({ name, login, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileErr(data.message || 'Не удалось сохранить профиль');
        return;
      }
      setProfileMsg('Сохранено успешно');
      await onUserUpdated();
    } catch {
      setProfileErr('Ошибка сохранения. Проверь backend.');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    setPassMsg('');
    setPassErr('');
    try {
      setSavingPassword(true);
      const res = await apiFetch(`${apiBase}/me/password`, {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPassErr(data.message || 'Не удалось сменить пароль');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setPassMsg('Пароль успешно изменён');
    } catch {
      setPassErr('Ошибка смены пароля. Проверь backend.');
    } finally {
      setSavingPassword(false);
    }
  };

  const uploadAvatar = async (file) => {
    setAvatarErr('');
    if (!file) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await apiFetch(`${apiBase}/me/avatar`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAvatarErr(data.message || 'Не удалось загрузить аватар');
        return;
      }
      await onUserUpdated();
    } catch {
      setAvatarErr('Ошибка загрузки. Проверь backend.');
    } finally {
      setUploading(false);
    }
  };

  const sectionTitles = { [TABS.PROFILE]: 'Профиль', [TABS.SECURITY]: 'Безопасность', [TABS.ACHIEVEMENTS]: 'Достижения' };

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div className="profile-header__inner">
          {onGoHome ? (
            <>
              <button type="button" className="profile-header__back" onClick={onGoHome}>
                ← На главную
              </button>
              <h1 className="profile-header__single-title">{sectionTitles[tab]}</h1>
              <div style={{ width: 120 }} />
            </>
          ) : (
            <>
              <div className="profile-header__user">
                <div className="profile-header__avatar" style={{ overflow: 'hidden' }} aria-hidden="true">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span className="profile-header__avatar-inner">
                      {(user.name || user.login || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="profile-header__info">
                  <span className="profile-header__name">{user.name}</span>
                  <span className="profile-header__handle">@{user.login} • {user.email}</span>
                </div>
              </div>
              <div className="profile-header__actions">
                <button type="button" onClick={onGoPlay} className="btn btn--primary profile-header__btn">
                  К карте
                </button>
                {hasPassedScenario && onGoGames && (
                  <button type="button" onClick={onGoGames} className="btn btn--primary profile-header__btn">
                    Мини-игра
                  </button>
                )}
                <button type="button" onClick={onLogout} className="btn btn--outline profile-header__btn">
                  Выйти
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="profile-main">
        <div className="container">
          {!onGoHome && !user.isVerified && (
            <div className="notice warn" style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Подтверди email</div>
              <div className="text-muted" style={{ marginBottom: 10 }}>
                Некоторые функции могут быть ограничены, пока почта не подтверждена.
              </div>
              <button type="button" className="btn btn--primary" onClick={onGoVerifyEmail}>
                Подтвердить email
              </button>
            </div>
          )}

          {!onGoHome && (
            <section className="profile-section profile-section--cabinet">
              <div className="profile-section__head" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <h1 className="profile-section__title">Личный кабинет</h1>
                  <p className="profile-section__subtitle">
                    Управляй профилем, безопасностью и смотри витрину достижений.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div className="profile-tabs">
                    <button
                      type="button"
                      className={`profile-tabs__btn ${tab === TABS.PROFILE ? 'profile-tabs__btn--active' : ''}`}
                      onClick={() => setTab(TABS.PROFILE)}
                    >
                      Профиль
                    </button>
                    <button
                      type="button"
                      className={`profile-tabs__btn ${tab === TABS.SECURITY ? 'profile-tabs__btn--active' : ''}`}
                      onClick={() => setTab(TABS.SECURITY)}
                    >
                      Безопасность
                    </button>
                    <button
                      type="button"
                      className={`profile-tabs__btn ${tab === TABS.ACHIEVEMENTS ? 'profile-tabs__btn--active' : ''}`}
                      onClick={() => setTab(TABS.ACHIEVEMENTS)}
                    >
                      Достижения
                    </button>
                  </div>
                  <span className="chip">💎 {gems}</span>
                </div>
              </div>
            </section>
          )}

          {tab === TABS.PROFILE && (
            <>
              <section className="profile-section">
                <h2 className="profile-section__title">Профиль</h2>
                <p className="profile-section__subtitle">Здесь можно менять имя, логин и почту.</p>
                <div className="profile-form">
                  <div className="profile-form__row">
                    <label className="profile-form__label">
                      Имя
                      <input
                        type="text"
                        className="profile-form__input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </label>
                    <label className="profile-form__label">
                      Логин
                      <input
                        type="text"
                        className="profile-form__input"
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="profile-form__label">
                    Почта
                    <input
                      type="email"
                      className="profile-form__input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  {onDifficultyChange && (
                    <div className="profile-form__row">
                      <label className="profile-form__label">
                        Сложность игр
                        <div className="profile-form__difficulty">
                          <button
                            type="button"
                            className={`pill-option ${difficulty === 'novice' ? 'selected' : ''}`}
                            onClick={() => onDifficultyChange('novice')}
                          >
                            Новичок
                          </button>
                          <button
                            type="button"
                            className={`pill-option ${difficulty === 'expert' ? 'selected' : ''}`}
                            onClick={() => onDifficultyChange('expert')}
                          >
                            Знаток
                          </button>
                        </div>
                      </label>
                    </div>
                  )}
                  <div className="profile-form__row profile-form__music">
                    <span className="profile-form__label profile-form__music-label">Музыка в сценариях и мини-игре</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={musicEnabled}
                      className={`music-toggle ${musicEnabled ? 'music-toggle--on' : ''}`}
                      onClick={() => setMusicEnabled(!musicEnabled)}
                      title={musicEnabled ? 'Выключить музыку' : 'Включить музыку'}
                    >
                      <span className="music-toggle__track">
                        <span className="music-toggle__thumb" />
                      </span>
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn btn--primary profile-form__save"
                    onClick={saveProfile}
                    disabled={savingProfile}
                  >
                    {savingProfile ? 'Сохраняем...' : 'Сохранить'}
                  </button>
                </div>
                {profileMsg && <p className="text-success" style={{ marginTop: 12 }}>{profileMsg}</p>}
                {profileErr && <p className="text-danger" style={{ marginTop: 12 }}>{profileErr}</p>}
              </section>

              <section className="profile-section">
                <h2 className="profile-section__title">Аватар</h2>
                <p className="profile-section__subtitle">PNG/JPG/WebP/GIF до 2MB.</p>
                <label className="profile-avatar-upload">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => uploadAvatar(e.target.files?.[0])}
                    className="profile-avatar-upload__input"
                  />
                  <span className="profile-avatar-upload__btn">
                    {uploading ? 'Загрузка...' : 'Выбрать файл'}
                  </span>
                </label>
                {avatarErr && <p className="text-danger" style={{ marginTop: 12 }}>{avatarErr}</p>}
              </section>
            </>
          )}

          {tab === TABS.SECURITY && (
            <section className="profile-section">
              <h2 className="profile-section__title">Безопасность</h2>
              <p className="profile-section__subtitle">Смена пароля требует текущий пароль.</p>
              <div className="profile-form">
                <label className="profile-form__label">
                  Текущий пароль
                  <input
                    type="password"
                    className="profile-form__input"
                    placeholder="Текущий пароль"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </label>
                <label className="profile-form__label">
                  Новый пароль
                  <input
                    type="password"
                    className="profile-form__input"
                    placeholder="Новый пароль"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn--primary profile-form__save"
                  onClick={changePassword}
                  disabled={savingPassword}
                >
                  {savingPassword ? 'Меняем...' : 'Сменить пароль'}
                </button>
              </div>
              {passMsg && <p className="text-success" style={{ marginTop: 12 }}>{passMsg}</p>}
              {passErr && <p className="text-danger" style={{ marginTop: 12 }}>{passErr}</p>}
            </section>
          )}

          {tab === TABS.ACHIEVEMENTS && (
            <section className="profile-section">
              <h2 className="profile-section__title">Витрина достижений</h2>
              <p className="profile-section__subtitle">
                Здесь будут появляться ачивки за прохождение сценариев.
              </p>
              {achievements.length === 0 ? (
                <p className="text-muted">Пока достижений нет. Пройди сценарии, чтобы получить их.</p>
              ) : (
                <div className="card-grid">
                  {achievements.map((a) => {
                    let icon = a.icon || '⭐';
                    if (a.code === 'bike_no_spend') icon = '🚲';
                    if (a.code === 'smart_friend') icon = '🎁';
                    if (a.code === 'quiz_master') icon = '❓';
                    if (a.code === 'investment_champion') icon = '📈';
                    if (a.code === 'island_survivor') icon = '🏝️';
                    if (a.code === 'island_100') icon = '🌟';

                    let description = a.description;
                    if (a.code === 'quiz_master') {
                      const quizProgress = user.Progresses?.find((p) => p.Scenario?.code === 'money_quiz');
                      const best = quizProgress?.bestResult ?? null;
                      if (best != null) description = `Лучший результат: ${best}%`;
                    }
                    if (a.code === 'investment_champion') {
                      const invProgress = user.Progresses?.find((p) => p.Scenario?.code === 'investment_race');
                      const best = invProgress?.bestResult ?? null;
                      if (best != null) description = `Лучший баланс в конце игры: ${best} руб.`;
                    }
                    if (a.code === 'island_survivor') {
                      const bestDays = user.islandBestDays ?? 0;
                      description = bestDays > 0 ? `Рекорд: ${bestDays} дней` : a.description;
                    }

                    return (
                      <div key={a.id} className="card">
                        <div style={{ fontSize: 28 }}>{icon}</div>
                        <div style={{ fontWeight: 700, marginTop: 6 }}>{a.title}</div>
                        <div className="text-muted" style={{ marginTop: 6 }}>{description}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
