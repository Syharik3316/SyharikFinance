import React, { useState } from 'react';

const characters = [
  {
    key: 'katya',
    name: 'Копилка Катя',
    emoji: '🐱',
    description: 'Любит откладывать и планировать покупки заранее.',
    difficulty: 'Новичок',
  },
  {
    key: 'tolya',
    name: 'Тратилка Толя',
    emoji: '🛴',
    description: 'Любит покупать всё подряд и жить сегодняшним днём.',
    difficulty: 'Новичок',
  },
  {
    key: 'ilya',
    name: 'Инвестор Илья',
    emoji: '🧠',
    description: 'Хочет приумножить деньги и ищет выгодные решения.',
    difficulty: 'Опытный',
  },
];

export default function CharacterSelect({ apiBase, onUserCreated }) {
  const [selectedKey, setSelectedKey] = useState(characters[0].key);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedCharacter = characters.find((c) => c.key === selectedKey);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Введите своё имя или ник.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          age: null,
          characterKey: selectedKey,
        }),
      });

      if (!res.ok) {
        throw new Error('Ошибка создания игрока');
      }

      const user = await res.json();
      onUserCreated(user);
    } catch (err) {
      setError('Не получилось создать игрока. Проверь backend и попробуй ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0, marginBottom: 8 }}>Кто ты в этой истории?</h2>
      <p className="text-muted" style={{ marginTop: 0, marginBottom: 20 }}>
        Выберите персонажа — от него зависят реплики и небольшие бонусы, но правила игры одинаковые.
      </p>

      <div className="card-grid">
        {characters.map((char) => (
          <button
            key={char.key}
            type="button"
            className="secondary-btn"
            onClick={() => setSelectedKey(char.key)}
            style={{
              textAlign: 'left',
              padding: 16,
              borderRadius: 18,
              width: '100%',
              borderColor:
                selectedKey === char.key ? 'rgba(34,197,94,0.9)' : 'rgba(148,163,184,0.6)',
              background:
                selectedKey === char.key
                  ? 'radial-gradient(circle at top left,#064e3b 0,#020617 75%)'
                  : undefined,
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="avatar-circle" style={{ fontSize: 28 }}>
                {char.emoji}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{char.name}</div>
                <div className="text-muted" style={{ marginTop: 4 }}>
                  {char.description}
                </div>
                <div className="chips-row" style={{ marginTop: 6 }}>
                  <span className="chip">Сложность: {char.difficulty}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 22, display: 'flex', gap: 12 }}>
        <input
          type="text"
          placeholder="Как тебя зовут?"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 999,
            border: '1px solid rgba(148,163,184,0.7)',
            background: 'rgba(15,23,42,0.9)',
            color: '#f9fafb',
          }}
        />
        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? 'Создаём...' : 'Начать игру'}
        </button>
      </form>

      {error && (
        <div className="text-danger" style={{ marginTop: 10, fontSize: '0.85rem' }}>
          {error}
        </div>
      )}
    </div>
  );
}
