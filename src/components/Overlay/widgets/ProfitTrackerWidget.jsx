/**
 * Profit/Loss Tracker Widget
 * Shows current profit or loss with visual indicators
 */

import React from 'react';
import './ProfitTrackerWidget.css';

export default function ProfitTrackerWidget({ config, data, theme }) {
  const profit = data?.profit || 0;
  const showPercentage = config?.showPercentage !== false;
  const totalWagered = data?.totalWagered || 1;
  const currency = config?.currency || '$';

  const isProfit = profit >= 0;
  const percentage = ((profit / totalWagered) * 100).toFixed(1);

  const formatAmount = (amount) => {
    const abs = Math.abs(amount);
    return `${isProfit ? '+' : '-'}${currency}${parseFloat(abs).toFixed(2)}`;
  };

  return (
    <div 
      className={`profit-tracker-widget ${isProfit ? 'profit' : 'loss'}`}
      style={{
        '--profit-color': isProfit ? '#10b981' : '#ef4444',
        '--primary-color': theme.primaryColor || '#d4af37'
      }}
    >
      <div className="profit-header">
        <span className="profit-icon">{isProfit ? '📈' : '📉'}</span>
        <span className="profit-label">
          {isProfit ? 'Profit' : 'Loss'}
        </span>
      </div>
      <div className="profit-value">
        {formatAmount(profit)}
      </div>
      {showPercentage && (
        <div className="profit-percentage">
          {percentage}%
        </div>
      )}
    </div>
  );
}
