import React, { useState } from 'react';

export default function Footer({ onGoHome }) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <footer className="app-footer">
      <nav className="app-footer-links">
        <button
          type="button"
          className="app-footer-logo"
          onClick={onGoHome}
          aria-label="На главную"
        >
          {logoFailed ? (
            <span className="app-footer-logo-slot" />
          ) : (
            <img
              src="/logo.png"
              alt=""
              className="app-footer-logo-img"
              onError={() => setLogoFailed(true)}
            />
          )}
        </button>
        <a href="mailto:admin@syharik.ru">Связаться с нами</a>
      </nav>
      <p className="app-footer-copy">© 2026 SyharikFinance. Все права защищены. e-mail: admin@syharik.ru</p>
      <p className="app-footer-hackathon">Проект разработан на хакатоне DevHack#6 командой 42x САУ по мотиву кейса компании Центр-Инвест.</p>
    </footer>
  );
}
