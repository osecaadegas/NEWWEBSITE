/**
 * Wager Counter Widget
 * Tracks total amount wagered
 */

import React from 'react';
import './WagerCounterWidget.css';

export default function WagerCounterWidget({ config, data, theme }) {
  const totalWager = data?.totalWager || 0;
  const goal = config?.goal || 10000;
  const showGoal = config?.showGoal !== false;
  const showProgress = config?.showProgress !== false;
  const currency = config?.currency || '$';

  const progress = showGoal ? Math.min((totalWager / goal) * 100, 100) : 0;

  const formatAmount = (amount) => {
    return `${currency}${parseFloat(amount).toFixed(2)}`;
  };

  return (
    <div 
      className="wager-counter-widget"
      style={{
        '--primary-color': theme.primaryColor || '#d4af37',
        '--progress': `${progress}%`
      }}
    >
      <div className="wager-header">
        <span className="wager-icon">🎲</span>
        <span className="wager-label">Total Wagered</span>
      </div>
      <div className="wager-value">
        {formatAmount(totalWager)}
      </div>
      {showGoal && (
        <div className="wager-goal">
          <span className="goal-label">Goal: {formatAmount(goal)}</span>
        </div>
      )}
      {showProgress && showGoal && (
        <div className="wager-progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
