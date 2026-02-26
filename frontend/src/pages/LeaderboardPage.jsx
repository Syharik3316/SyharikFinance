import React, { useEffect, useState } from 'react';

export default function LeaderboardPage({ apiBase, user, onBack }) {
  const [leaderboard, setLeaderboard] = useState({ list: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`${apiBase}/leaderboard?by=gems`);
        if (!res.ok || !alive) return;
        const data = await res.json();
        if (alive) setLeaderboard(data);
      } catch {
        // ignore
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [apiBase]);

  const list = leaderboard.list || [];
  const currentUserRank = user ? list.findIndex((u) => u.id === user.id) + 1 : 0;

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-page__inner">
        <button type="button" className="btn btn--outline leaderboard-page__back" onClick={onBack}>
          ← Назад
        </button>
        <h1 className="leaderboard-page__title">Топ по алмазам 💎</h1>

        {loading ? (
          <p className="text-muted leaderboard-page__loading">Загрузка...</p>
        ) : (
          <>
            {user && (
              <div className="leaderboard-page__me">
                <span className="leaderboard-page__me-label">Твоё место</span>
                <div className="leaderboard-page__me-row">
                  <span className="leaderboard-page__me-rank">
                    {currentUserRank > 0 ? `#${currentUserRank}` : '—'}
                  </span>
                  <div className="leaderboard-page__me-avatar">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" />
                    ) : (
                      (user.name || user.login || '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="leaderboard-page__me-name">{user.name || user.login}</span>
                  <span className="leaderboard-page__me-gems">{Math.round(user.gems ?? 0)} 💎</span>
                </div>
              </div>
            )}

            {list.length === 0 ? (
              <p className="text-muted leaderboard-page__empty">Пока никого нет в рейтинге.</p>
            ) : (
              <div className="leaderboard-page__table-wrap">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th className="leaderboard-table__th leaderboard-table__th--rank">Место</th>
                      <th className="leaderboard-table__th leaderboard-table__th--user">Участник</th>
                      <th className="leaderboard-table__th leaderboard-table__th--gems">Алмазы</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((u, i) => (
                      <tr
                        key={u.id}
                        className={user && u.id === user.id ? 'leaderboard-table__row--me' : ''}
                      >
                        <td className="leaderboard-table__td leaderboard-table__td--rank">{i + 1}</td>
                        <td className="leaderboard-table__td leaderboard-table__td--user">
                          <div className="leaderboard-table__user">
                            <div className="leaderboard-table__avatar">
                              {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt="" />
                              ) : (
                                (u.name || u.login || '?').charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="leaderboard-table__name" title={u.name}>{u.name || u.login}</span>
                          </div>
                        </td>
                        <td className="leaderboard-table__td leaderboard-table__td--gems">{Math.round(u.gems ?? 0)} 💎</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
