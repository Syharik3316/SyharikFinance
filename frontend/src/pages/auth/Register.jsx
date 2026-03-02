import React, { useState, useRef, useEffect } from 'react';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

export default function Register({ apiBase, apiFetch, onBack, onRegistered }) {
  const [login, setLogin] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const recaptchaRef = useRef(null);
  const recaptchaWidgetId = useRef(null);

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) return;
    if (typeof window.grecaptcha !== 'undefined') {
      setRecaptchaReady(true);
      return;
    }
    const onLoad = () => setRecaptchaReady(true);
    window.onRecaptchaRegisterLoad = onLoad;
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaRegisterLoad&render=explicit';
    script.async = true;
    script.defer = true;
    script.onerror = () => setRecaptchaReady(false);
    document.head.appendChild(script);
    return () => {
      window.onRecaptchaRegisterLoad = null;
      if (recaptchaWidgetId.current != null && window.grecaptcha) {
        try {
          window.grecaptcha.reset(recaptchaWidgetId.current);
        } catch (_) {}
      }
    };
  }, []);

  useEffect(() => {
    if (!recaptchaReady || !RECAPTCHA_SITE_KEY || !recaptchaRef.current || !window.grecaptcha) return;
    if (recaptchaWidgetId.current != null) return;
    try {
      recaptchaWidgetId.current = window.grecaptcha.render(recaptchaRef.current, {
        sitekey: RECAPTCHA_SITE_KEY,
        theme: 'light',
        size: 'normal',
      });
    } catch (err) {
      console.error('reCAPTCHA render error:', err);
    }
  }, [recaptchaReady]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setDevCode('');
    let recaptchaToken = '';
    if (RECAPTCHA_SITE_KEY && window.grecaptcha && recaptchaWidgetId.current != null) {
      recaptchaToken = window.grecaptcha.getResponse(recaptchaWidgetId.current) || '';
      if (!recaptchaToken) {
        setError('Подтвердите, что вы не робот (reCAPTCHA).');
        return;
      }
    }
    try {
      setLoading(true);
      const res = await apiFetch(`${apiBase}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({ login, name, email, password, recaptchaToken: recaptchaToken || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Ошибка регистрации');
        return;
      }
      if (data.devCode) setDevCode(data.devCode);
      onRegistered(data.email || email, data.devCode);
    } catch {
      setError('Не удалось зарегистрироваться. Проверь backend.');
    } finally {
      setLoading(false);
      if (RECAPTCHA_SITE_KEY && window.grecaptcha && recaptchaWidgetId.current != null) {
        try {
          window.grecaptcha.reset(recaptchaWidgetId.current);
        } catch (_) {}
      }
    }
  };

  return (
    <div className="login-page">
      <main className="login-page__main">
        <div className="container">
          <section className="login-card">
            <h1 className="login-card__title">Регистрация</h1>
            <p className="login-card__subtitle">
              {devCode
                ? 'Сайт в режиме разработки (DEV). Код на почту не отправляется — используй код ниже.'
                : 'После регистрации мы отправим код подтверждения на почту.'}
            </p>
            <form className="login-form" onSubmit={submit}>
              <label className="login-form__label">
                Логин (до 16 символов)
                <input
                  type="text"
                  className="login-form__input"
                  placeholder="Логин"
                  value={login}
                  onChange={(e) => setLogin(e.target.value.slice(0, 16))}
                  maxLength={16}
                />
              </label>
              <label className="login-form__label">
                Имя (до 12 символов)
                <input
                  type="text"
                  className="login-form__input"
                  placeholder="Имя"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 12))}
                  maxLength={12}
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
              <div className="login-form__label" style={{ minHeight: RECAPTCHA_SITE_KEY ? 78 : 'auto' }}>
                {RECAPTCHA_SITE_KEY ? (
                  <div ref={recaptchaRef} data-sitekey={RECAPTCHA_SITE_KEY} />
                ) : (
                  <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>
                    Защита reCAPTCHA не подключена. Добавь <code>VITE_RECAPTCHA_SITE_KEY</code> в .env в корне проекта и пересобери фронтенд (<code>npm run build</code>).
                  </p>
                )}
              </div>
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
