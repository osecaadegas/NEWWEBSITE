/**
 * Balance Display Widget
 * Shows current balance with customizable styling
 */

import React from 'react';
import './BalanceWidget.css';

export default function BalanceWidget({ config, data, theme }) {
  const balance = data?.balance || 0;
  const currency = config?.currency || '$';
  const showCurrency = config?.showCurrency !== false;
  const fontSize = config?.fontSize || 24;
  const animated = config?.animated !== false;

  const formatBalance = (amount) => {
    const formatted = parseFloat(amount).toFixed(2);
    return showCurrency ? `${currency}${formatted}` : formatted;
  };

  return (
    <div 
      className={`balance-widget ${animated ? 'animated' : ''}`}
      style={{
        '--primary-color': theme.primaryColor || '#d4af37',
        '--font-size': `${fontSize}px`
      }}
    >
      <div className="balance-header">
        <span className="balance-icon">💰</span>
        <span className="balance-label">Balance</span>
      </div>
      <div className="balance-value">
        {formatBalance(balance)}
      </div>
    </div>
  );
}
