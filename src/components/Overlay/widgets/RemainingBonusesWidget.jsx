/**
 * Remaining Bonuses Widget
 * Shows count of unopened bonuses in current hunt
 * Visual indicator for pending work
 */

import { useState, useEffect } from 'react';
import './RemainingBonusesWidget.css';

export default function RemainingBonusesWidget({ data, config, theme }) {
  const { bonuses = [], remainingBonuses } = data || {};
  const { showIcon = true, fontSize = 32, animated = true } = config || {};
  const { primaryColor = '#f59e0b' } = theme || {};

  const [remaining, setRemaining] = useState(0);
  const [prevRemaining, setPrevRemaining] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const newRemaining = remainingBonuses !== undefined 
      ? remainingBonuses 
      : bonuses.filter(b => !b.opened && b.status !== 'opened').length;

    if (newRemaining !== remaining) {
      setPrevRemaining(remaining);
      setRemaining(newRemaining);
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 600);
    }
  }, [bonuses, remainingBonuses]);

  const trend = remaining < prevRemaining ? 'down' : remaining > prevRemaining ? 'up' : 'neutral';
  const percentComplete = bonuses.length > 0 ? ((bonuses.length - remaining) / bonuses.length) * 100 : 0;

  return (
    <div 
      className={`remaining-bonuses-widget ${animated && isUpdating ? 'updating' : ''} trend-${trend}`}
      style={{ '--primary-color': primaryColor }}
    >
      {showIcon && (
        <div className="widget-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        </div>
      )}
      
      <div className="widget-content">
        <div className="widget-label">Remaining</div>
        <div className="widget-value" style={{ fontSize: `${fontSize}px` }}>
          {remaining}
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${percentComplete}%` }}
          ></div>
        </div>
      </div>

      {remaining === 0 && bonuses.length > 0 && (
        <div className="complete-indicator">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
          </svg>
        </div>
      )}

      <div className="widget-glow"></div>
    </div>
  );
}
