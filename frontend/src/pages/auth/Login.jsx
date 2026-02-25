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
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Вход</h2>
      <p className="text-muted" style={{ marginTop: 6 }}>
        Войди по логину или почте.
      </p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          value={loginOrEmail}
          onChange={(e) => setLoginOrEmail(e.target.value)}
          placeholder="Логин или email"
          style={{
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid rgba(148,163,184,0.7)',
            background: 'rgba(15,23,42,0.9)',
            color: '#f9fafb',
          }}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          type="password"
          style={{
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid rgba(148,163,184,0.7)',
            background: 'rgba(15,23,42,0.9)',
            color: '#f9fafb',
          }}
        />

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Входим...' : 'Войти'}
          </button>
          <button className="secondary-btn" type="button" onClick={onRegister}>
            Регистрация
          </button>
        </div>
      </form>

      {error && (
        <div className="text-danger" style={{ marginTop: 10, fontSize: '0.85rem' }}>
          {error}
        </div>
      )}
    </div>
  );
}

