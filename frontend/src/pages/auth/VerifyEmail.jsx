import React, { useState } from 'react';

export default function VerifyEmail({ apiBase, apiFetch, defaultEmail, onBack, onVerified }) {
  const [email, setEmail] = useState(defaultEmail || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [devCode, setDevCode] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    try {
      setLoading(true);
      const res = await apiFetch(`${apiBase}/auth/verify`, {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Не удалось подтвердить email');
        return;
      }
      setInfo('Email подтверждён. Теперь можно войти.');
      onVerified();
    } catch {
      setError('Ошибка подтверждения. Проверь backend.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    setInfo('');
    setDevCode('');
    try {
      setLoading(true);
      const res = await apiFetch(`${apiBase}/auth/resend-code`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Не удалось отправить код');
        return;
      }
      if (data.devCode) setDevCode(data.devCode);
      setInfo('Код отправлен ещё раз. Проверь почту.');
    } catch {
      setError('Не удалось отправить код. Проверь backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Подтверждение почты</h2>
      <p className="text-muted" style={{ marginTop: 6 }}>
        Введи 6-значный код, который пришёл на email.
      </p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Код подтверждения"
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
            {loading ? 'Проверяем...' : 'Подтвердить'}
          </button>
          <button className="secondary-btn" type="button" disabled={loading} onClick={resend}>
            Отправить код ещё раз
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

      {info && (
        <div className="text-success" style={{ marginTop: 10, fontSize: '0.85rem' }}>
          {info}
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

