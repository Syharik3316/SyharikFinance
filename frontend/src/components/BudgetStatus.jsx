import React from 'react';

export default function BudgetStatus({ budget, label, difficulty, bump, unit = 'руб.' }) {
  return (
    <div className="status-bar">
      <div className="status-left">
        <div className="budget-pill">
          <span>Баланс</span>
          <span
            className={`fade-number ${bump ? 'bump' : ''}`}
            style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
          >
            {Number.isFinite(budget) ? Math.round(budget) : budget} {unit}
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
