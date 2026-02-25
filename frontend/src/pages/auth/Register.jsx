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
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Регистрация</h2>
      <p className="text-muted" style={{ marginTop: 6 }}>
        После регистрации мы отправим код подтверждения на почту.
      </p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="Логин"
          style={{
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid rgba(148,163,184,0.7)',
            background: 'rgba(15,23,42,0.9)',
            color: '#f9fafb',
          }}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Имя"
          style={{
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid rgba(148,163,184,0.7)',
            background: 'rgba(15,23,42,0.9)',
            color: '#f9fafb',
          }}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
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
          placeholder="Пароль (мин. 6 символов)"
          type="password"
          style={{
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid rgba(148,163,184,0.7)',
            background: 'rgba(15,23,42,0.9)',
            color: '#f9fafb',
          }}
        />

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Создаём...' : 'Создать аккаунт'}
          </button>
          <button className="secondary-btn" type="button" onClick={onBack}>
            Назад
          </button>
        </div>
      </form>

      {devCode && (
        <div className="text-muted" style={{ marginTop: 10, fontSize: '0.85rem' }}>
          Dev-режим: код подтверждения <strong>{devCode}</strong>
        </div>
      )}

      {error && (
        <div className="text-danger" style={{ marginTop: 10, fontSize: '0.85rem' }}>
          {error}
        </div>
      )}
    </div>
  );
}

