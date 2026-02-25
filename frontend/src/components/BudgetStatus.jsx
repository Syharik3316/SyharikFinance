import React from 'react';

export default function BudgetStatus({ budget, label, difficulty, bump, unit = 'монет' }) {
  return (
    <div className="status-bar">
      <div className="status-left">
        <div className="budget-pill">
          <span>Баланс</span>
          <span
            className={`fade-number ${bump ? 'bump' : ''}`}
            style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
          >
            {budget} {unit}
          </span>
        </div>
        {label && (
          <span className="chip" style={{ borderStyle: 'dashed' }}>
            {label}
          </span>
        )}
      </div>
      <div className="status-right">
        <span className="chip">Сложность: {difficulty}</span>
      </div>
    </div>
  );
}
