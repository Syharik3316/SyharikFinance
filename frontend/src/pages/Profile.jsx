import React, { useEffect, useMemo, useState } from 'react';

const TABS = {
  PROFILE: 'PROFILE',
  SECURITY: 'SECURITY',
  ACHIEVEMENTS: 'ACHIEVEMENTS',
};

export default function Profile({
  apiBase,
  apiFetch,
  user,
  onUserUpdated,
  onGoPlay,
  onGoGames,
  onGoVerifyEmail,
  onLogout,
}) {
  const hasPassedScenario = useMemo(
    () => user.Progresses?.some((p) => p.status === 'passed') ?? false,
    [user.Progresses]
  );
  const [tab, setTab] = useState(TABS.PROFILE);
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
  const gems = user.gems || 0;

  useEffect(() => {
    // синхронизируем поля при обновлении user
    setName(user.name || '');
    setLogin(user.login || '');
    setEmail(user.email || '');
  }, [user]);

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
      setProfileMsg(data.message || 'Профиль обновлён');
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
      setPassMsg('Пароль обновлён');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="status-bar">
        <div className="status-left">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="avatar-circle" style={{ overflow: 'hidden' }}>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                '👤'
              )}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{user.name}</div>
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                @{user.login} • {user.email}
              </div>
            </div>
          </div>
        </div>
        <div className="status-right" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="primary-btn" onClick={onGoPlay}>
            Играть
          </button>
          {hasPassedScenario && onGoGames && (
            <button className="primary-btn" onClick={onGoGames}>
              Игры
            </button>
          )}
          <button className="secondary-btn" onClick={onLogout}>
            Выйти
          </button>
        </div>
      </div>

      {!user.isVerified && (
        <div className="notice warn">
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Подтверди email</div>
          <div className="text-muted" style={{ marginBottom: 10 }}>
            Некоторые функции могут быть ограничены, пока почта не подтверждена. Нажми кнопку —
            введёшь код из письма (или отправишь код повторно).
          </div>
          <button className="primary-btn" onClick={onGoVerifyEmail}>
            Подтвердить email
          </button>
        </div>
      )}

      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 6 }}>Личный кабинет</h2>
          <div className="text-muted">
            Управляй профилем, безопасностью и смотри витрину достижений.
          </div>
        </div>
        <div className="tabs" role="tablist" aria-label="Profile tabs">
          <button
            className={`tab-btn ${tab === TABS.PROFILE ? 'active' : ''}`}
            type="button"
            onClick={() => setTab(TABS.PROFILE)}
          >
            Профиль
          </button>
          <button
            className={`tab-btn ${tab === TABS.SECURITY ? 'active' : ''}`}
            type="button"
            onClick={() => setTab(TABS.SECURITY)}
          >
            Безопасность
          </button>
          <button
            className={`tab-btn ${tab === TABS.ACHIEVEMENTS ? 'active' : ''}`}
            type="button"
            onClick={() => setTab(TABS.ACHIEVEMENTS)}
          >
            Достижения
          </button>
        </div>
        <div className="chips-row" style={{ marginTop: 8 }}>
          <span
            className="chip"
            style={{
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            💎 {gems}
          </span>
        </div>
      </div>

      {tab === TABS.PROFILE && (
        <>
          <div className="card">
            <h2 style={{ marginTop: 0, marginBottom: 10 }}>Профиль</h2>
            <div className="text-muted" style={{ marginBottom: 14 }}>
              Здесь можно менять имя, логин и почту.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 6 }}>
                  Имя
                </div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(148,163,184,0.7)',
                    background: 'rgba(15,23,42,0.9)',
                    color: '#f9fafb',
                  }}
                />
              </div>
              <div>
                <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 6 }}>
                  Логин
                </div>
                <input
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(148,163,184,0.7)',
                    background: 'rgba(15,23,42,0.9)',
                    color: '#f9fafb',
                  }}
                />
              </div>
              <div>
                <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 6 }}>
                  Почта
                </div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(148,163,184,0.7)',
                    background: 'rgba(15,23,42,0.9)',
                    color: '#f9fafb',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
              <button className="primary-btn" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? 'Сохраняем...' : 'Сохранить'}
              </button>
            </div>

            {profileMsg && (
              <div className="text-success" style={{ marginTop: 10, fontSize: '0.85rem' }}>
                {profileMsg}
              </div>
            )}
            {profileErr && (
              <div className="text-danger" style={{ marginTop: 10, fontSize: '0.85rem' }}>
                {profileErr}
              </div>
            )}
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0, marginBottom: 10 }}>Аватар</h2>
            <div className="text-muted" style={{ marginBottom: 10 }}>
              PNG/JPG/WebP/GIF до 2MB.
            </div>
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => uploadAvatar(e.target.files?.[0])}
            />
            {avatarErr && (
              <div className="text-danger" style={{ marginTop: 10, fontSize: '0.85rem' }}>
                {avatarErr}
              </div>
            )}
          </div>

        </>
      )}

      {tab === TABS.SECURITY && (
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: 10 }}>Безопасность</h2>
          <div className="text-muted" style={{ marginBottom: 12 }}>
            Смена пароля требует текущий пароль.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Текущий пароль"
              type="password"
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(148,163,184,0.7)',
                background: 'rgba(15,23,42,0.9)',
                color: '#f9fafb',
              }}
            />
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Новый пароль"
              type="password"
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(148,163,184,0.7)',
                background: 'rgba(15,23,42,0.9)',
                color: '#f9fafb',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
            <button className="primary-btn" onClick={changePassword} disabled={savingPassword}>
              {savingPassword ? 'Меняем...' : 'Сменить пароль'}
            </button>
          </div>

          {passMsg && (
            <div className="text-success" style={{ marginTop: 10, fontSize: '0.85rem' }}>
              {passMsg}
            </div>
          )}
          {passErr && (
            <div className="text-danger" style={{ marginTop: 10, fontSize: '0.85rem' }}>
              {passErr}
            </div>
          )}
        </div>
      )}

      {tab === TABS.ACHIEVEMENTS && (
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: 10 }}>Витрина достижений</h2>
          <div className="text-muted" style={{ marginBottom: 12 }}>
            Здесь будут появляться ачивки за прохождение сценариев.
          </div>

          {achievements.length === 0 ? (
            <div className="text-muted">
              Пока достижений нет. Пройди сценарии, чтобы получить их.
            </div>
          ) : (
            <div className="card-grid">
              {achievements.map((a) => {
                let icon = a.icon || '⭐';
                if (a.code === 'bike_no_spend') {
                  icon = '🚲';
                }
                if (a.code === 'smart_friend') {
                  icon = '🎁';
                }
                if (a.code === 'quiz_master') {
                  icon = '❓';
                }

                let description = a.description;
                if (a.code === 'quiz_master') {
                  const quizProgress = user.Progresses?.find(
                    (p) => p.Scenario?.code === 'money_quiz'
                  );
                  const best = quizProgress?.bestResult ?? null;
                  if (best != null) {
                    description = `Лучший результат: ${best}%`;
                  }
                }
                if (a.code === 'investment_champion') {
                  const invProgress = user.Progresses?.find(
                    (p) => p.Scenario?.code === 'investment_race'
                  );
                  const best = invProgress?.bestResult ?? null;
                  if (best != null) {
                    description = `Лучший баланс в конце игры: ${best} монет`;
                  }
                }
                if (a.code === 'investment_champion') {
                  icon = '📈';
                }

                return (
                  <div key={a.id} className="card">
                    <div style={{ fontSize: 28 }}>{icon}</div>
                    <div style={{ fontWeight: 700, marginTop: 6 }}>{a.title}</div>
                    <div className="text-muted" style={{ marginTop: 6 }}>
                      {description}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

