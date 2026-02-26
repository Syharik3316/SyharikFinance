import React, { useState } from 'react';

export default function Login({ apiBase, apiFetch, onRegister, onLoggedIn, onNeedVerify }) {
  const [loginOrEmail, setLoginOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      const res = await apiFetch(`${apiBase}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ loginOrEmail, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.message === 'Email is not verified') {
          onNeedVerify(loginOrEmail.includes('@') ? loginOrEmail : '');
          return;
        }
        setError(data.message || 'Ошибка входа');
        return;
      }

      onLoggedIn(data.token);
    } catch {
      setError('Не удалось выполнить вход. Проверь backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <main className="login-page__main">
        <div className="container">
          <section className="login-card">
            <h1 className="login-card__title">Вход в аккаунт</h1>
            <p className="login-card__subtitle">
              Войди по логину или почте, чтобы сохранять прогресс и участвовать в игре.
            </p>
            <form className="login-form" onSubmit={submit}>
              <label className="login-form__label">
                Логин или email
                <input
                  type="text"
                  className="login-form__input"
                  placeholder="Логин или example@mail.ru"
                  value={loginOrEmail}
                  onChange={(e) => setLoginOrEmail(e.target.value)}
                  autoComplete="username"
                />
              </label>
              <label className="login-form__label">
                Пароль
                <input
                  type="password"
                  className="login-form__input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <div className="login-form__row">
                <button className="btn btn--primary btn--lg" type="submit" disabled={loading}>
                  {loading ? 'Входим...' : 'Войти'}
                </button>
                <button className="btn btn--outline" type="button" onClick={onRegister}>
                  Регистрация
                </button>
              </div>
            </form>
            {error && (
              <p className="text-danger" style={{ marginTop: 16, fontSize: '0.9rem' }}>{error}</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
