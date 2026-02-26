import React, { useState } from 'react';

const DEV_NOTICE = 'Сайт в режиме разработки (DEV). Код на почту не отправляется.';

export default function VerifyEmail({ apiBase, apiFetch, defaultEmail, initialDevCode = '', onBack, onVerified }) {
  const email = defaultEmail || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [devCode, setDevCode] = useState(initialDevCode || '');
  const [resendTarget, setResendTarget] = useState('');
  const [isDevMode, setIsDevMode] = useState(!!initialDevCode);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email) {
      setError('Не указана почта для подтверждения.');
      return;
    }
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
    setResendTarget('');
    if (!email) {
      setError('Не указана почта.');
      return;
    }
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
      if (data.devCode) {
        setDevCode(data.devCode);
        setIsDevMode(true);
        setInfo(DEV_NOTICE);
        setResendTarget('');
      } else {
        setResendTarget(email);
        setInfo(`Код отправлен на ${email}. Проверь почту.`);
      }
    } catch {
      setError('Не удалось отправить код. Проверь backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <main className="login-page__main">
        <div className="container">
          <section className="login-card">
            <h1 className="login-card__title">Подтверждение почты</h1>
            <p className="login-card__subtitle">
              Введи 6-значный код, который пришёл на почту{email ? ` ${email}` : ''}.
            </p>
            <form className="login-form" onSubmit={submit}>
              <label className="login-form__label">
                Код подтверждения
                <input
                  type="text"
                  className="login-form__input"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="one-time-code"
                />
              </label>
              <div className="login-form__row">
                <button className="btn btn--primary btn--lg" type="submit" disabled={loading}>
                  {loading ? 'Проверяем...' : 'Подтвердить'}
                </button>
                <button className="btn btn--outline" type="button" disabled={loading || !email} onClick={resend}>
                  {isDevMode ? 'Получить код' : 'Отправить код ещё раз'}
                </button>
                <button className="btn btn--outline" type="button" onClick={onBack}>
                  Назад
                </button>
              </div>
            </form>
            {resendTarget && !isDevMode && (
              <p className="text-muted" style={{ marginTop: 12, fontSize: '0.9rem' }}>
                Код отправлен на <strong>{resendTarget}</strong>
              </p>
            )}
            {isDevMode && (
              <p className="text-muted" style={{ marginTop: 12, fontSize: '0.9rem' }}>
                {DEV_NOTICE}
              </p>
            )}
            {devCode && (
              <p className="text-muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>
                Код подтверждения: <strong>{devCode}</strong>
              </p>
            )}
            {info && (
              <p className="text-success" style={{ marginTop: 16, fontSize: '0.9rem' }}>{info}</p>
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
