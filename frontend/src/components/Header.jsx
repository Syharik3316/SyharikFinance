import React, { useState, useRef, useEffect } from 'react';

export default function Header({ onGoHome, onGoProfile, onGoLogin, onGoMap, onGoGames, onOpenProfileSection, onLogout, user }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleProfileSection = (section) => {
    setDropdownOpen(false);
    onOpenProfileSection?.(section);
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    onLogout?.();
  };

  return (
    <header className="app-header">
      <div className="header__inner">
        <button
          type="button"
          className="app-brand-link"
          onClick={onGoHome}
          style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
          aria-label="На главную"
        >
          {logoFailed ? (
            <span className="header-logo-slot" aria-hidden="true" />
          ) : (
            <img
              src="/logo.png"
              alt=""
              className="header-logo-img"
              onError={() => setLogoFailed(true)}
            />
          )}
        </button>

        {user && (
          <nav className="header-nav-center">
            <button type="button" className="header-nav-btn" onClick={onGoMap}>
              К карте
            </button>
          </nav>
        )}

        <div className="header-user-slot" ref={dropdownRef}>
          {user ? (
            <>
              <span className="header-gems" title="Алмазы">
                {Math.round(user.gems ?? 0)} 💎
              </span>
              <button
                type="button"
                className="header-user-btn"
                onClick={() => setDropdownOpen((v) => !v)}
                aria-label="Профиль"
                aria-expanded={dropdownOpen}
              >
                <div className="avatar-circle small" style={{ overflow: 'hidden' }}>
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    (user.name || user.login || '?').charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ textAlign: 'left' }} className="header-user-btn__text">
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.name}</div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>@{user.login}</div>
                </div>
              </button>
              {dropdownOpen && (
                <div className="header-dropdown">
                  <button type="button" className="header-dropdown__item" onClick={() => handleProfileSection('profile')}>
                    Профиль
                  </button>
                  <button type="button" className="header-dropdown__item" onClick={() => handleProfileSection('security')}>
                    Безопасность
                  </button>
                  <button type="button" className="header-dropdown__item" onClick={() => handleProfileSection('achievements')}>
                    Достижения
                  </button>
                  <button type="button" className="header-dropdown__item header-dropdown__item--logout" onClick={handleLogout}>
                    Выйти
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              type="button"
              className="btn btn--primary header__btn"
              onClick={onGoLogin}
            >
              Войти
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
