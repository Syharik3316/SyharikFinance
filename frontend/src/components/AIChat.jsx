import React, { useRef, useEffect } from 'react';

const BOT_NAME = 'ИИ-помощник';
const MAX_HISTORY_MESSAGES = 10;

export default function AIChat({ open, onClose, apiBase = '/api', className = '' }) {
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [messages, setMessages] = React.useState(() => [
    { id: 'welcome', role: 'bot', text: 'Привет! Задавай вопросы про деньги, копилку, бюджет и финансы — с радостью помогу.', ts: Date.now() },
  ]);
  const [inputValue, setInputValue] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const buildHistory = (msgs) => {
    const out = [];
    for (const m of msgs) {
      if (m.role === 'user') out.push({ role: 'user', content: m.text });
      if (m.role === 'bot') out.push({ role: 'assistant', content: m.text });
    }
    return out.slice(-MAX_HISTORY_MESSAGES * 2);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    const history = buildHistory(messages);

    try {
      const res = await fetch(`${apiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json().catch(() => ({}));
      const replyText = res.ok && data.reply
        ? data.reply
        : data.message || 'Не удалось получить ответ. Попробуйте ещё раз.';
      const botMsg = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        text: replyText,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const botMsg = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        text: 'Ошибка связи. Проверьте интернет и попробуйте снова.',
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className={`ai-chat-panel ${className}`}
      id="support-chat"
      aria-label="Чат с ИИ-помощником"
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="ai-chat-panel__header">
        <span className="ai-chat-panel__title">
          <span className="ai-chat-panel__title-icon">🤖</span>
          {BOT_NAME}
        </span>
        <button
          type="button"
          className="ai-chat-panel__close"
          onClick={onClose}
          aria-label="Закрыть чат"
        >
          ×
        </button>
      </div>
      <div className="ai-chat-panel__messages" role="log" aria-live="polite">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`ai-chat-msg ai-chat-msg--${m.role}`}
          >
            {m.role === 'bot' && <span className="ai-chat-msg__avatar">🤖</span>}
            <div className="ai-chat-msg__bubble">
              {m.role === 'bot' && <span className="ai-chat-msg__name">{BOT_NAME}</span>}
              <p className="ai-chat-msg__text">{m.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="ai-chat-msg ai-chat-msg--bot">
            <span className="ai-chat-msg__avatar">🤖</span>
            <div className="ai-chat-msg__bubble ai-chat-msg__bubble--loading">
              <span className="ai-chat-msg__name">{BOT_NAME}</span>
              <p className="ai-chat-msg__text">Думаю...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form className="ai-chat-panel__form" onSubmit={handleSend}>
        <input
          ref={inputRef}
          type="text"
          className="ai-chat-panel__input"
          placeholder="Напишите сообщение..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          maxLength={500}
          disabled={loading}
          aria-label="Сообщение"
        />
        <button type="submit" className="ai-chat-panel__send" aria-label="Отправить" disabled={loading}>
          {loading ? '...' : 'Отправить'}
        </button>
      </form>
    </div>
  );
}
