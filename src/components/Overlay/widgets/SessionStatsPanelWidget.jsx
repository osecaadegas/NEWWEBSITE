/**
 * Session Stats Panel Widget
 * Comprehensive session overview with multiple metrics
 * Time played, total spins, biggest win, balance change
 */

import { useState, useEffect } from 'react';
import './SessionStatsPanelWidget.css';

export default function SessionStatsPanelWidget({ data, config, theme }) {
  const {
    sessionStart = Date.now(),
    totalSpins = 0,
    biggestWin = 0,
    startingBalance = 0,
    currentBalance = 0,
    bonusesOpened = 0
  } = data || {};
  const { showIcon = true, animated = true, currency = 'USD' } = config || {};
  const { primaryColor = '#8b5cf6' } = theme || {};

  const [sessionDuration, setSessionDuration] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const duration = Math.floor((Date.now() - sessionStart) / 1000);
      setSessionDuration(duration);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStart]);

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(value);
  };

  const balanceChange = currentBalance - startingBalance;
  const isProfit = balanceChange >= 0;

  return (
    <div 
      className={`session-stats-panel-widget ${animated ? 'animated' : ''}`}
      style={{ '--primary-color': primaryColor }}
    >
      <div className="panel-header">
        <div className="header-title">
          {showIcon && (
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
          )}
          <span>Session Stats</span>
        </div>
        <div className="session-time">{formatDuration(sessionDuration)}</div>
      </div>

      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-label">Total Spins</div>
          <div className="stat-value">{totalSpins.toLocaleString()}</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Bonuses Opened</div>
          <div className="stat-value">{bonusesOpened}</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Biggest Win</div>
          <div className="stat-value">{formatCurrency(biggestWin)}</div>
        </div>

        <div className={`stat-item balance-change ${isProfit ? 'profit' : 'loss'}`}>
          <div className="stat-label">Balance Change</div>
          <div className="stat-value">
            {isProfit && '+'}{formatCurrency(balanceChange)}
          </div>
        </div>
      </div>

      <div className="widget-glow"></div>
    </div>
  );
}
