import React, { useState } from 'react';

export default function Register({ apiBase, apiFetch, onBack, onRegistered }) {
  const [login, setLogin] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setDevCode('');
    try {
      setLoading(true);
      const res = await apiFetch(`${apiBase}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({ login, name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Ошибка регистрации');
        return;
      }
      if (data.devCode) setDevCode(data.devCode);
      onRegistered(data.email || email);
    } catch {
      setError('Не удалось зарегистрироваться. Проверь backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <main className="login-page__main">
        <div className="container">
          <section className="login-card">
            <h1 className="login-card__title">Регистрация</h1>
            <p className="login-card__subtitle">
              После регистрации мы отправим код подтверждения на почту.
            </p>
            <form className="login-form" onSubmit={submit}>
              <label className="login-form__label">
                Логин
                <input
                  type="text"
                  className="login-form__input"
                  placeholder="Логин"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                />
              </label>
              <label className="login-form__label">
                Имя
                <input
                  type="text"
                  className="login-form__input"
                  placeholder="Имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="login-form__label">
                Email
                <input
                  type="email"
                  className="login-form__input"
                  placeholder="example@mail.ru"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="login-form__label">
                Пароль (мин. 6 символов)
                <input
                  type="password"
                  className="login-form__input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <div className="login-form__row">
                <button className="btn btn--primary btn--lg" type="submit" disabled={loading}>
                  {loading ? 'Создаём...' : 'Создать аккаунт'}
                </button>
                <button className="btn btn--outline" type="button" onClick={onBack}>
                  Назад
                </button>
              </div>
            </form>
            {devCode && (
              <p className="text-muted" style={{ marginTop: 16, fontSize: '0.85rem' }}>
                Dev-режим: код подтверждения <strong>{devCode}</strong>
              </p>
            )}
            {error && (
              <p className="text-danger" style={{ marginTop: 16, fontSize: '0.9rem' }}>{error}</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
