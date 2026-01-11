/**
 * Cumulative Multis Widget
 * Shows the sum of all multipliers from opened bonuses
 * Used for calculating averages and overall performance
 */

import { useState, useEffect } from 'react';
import './CumulativeMultisWidget.css';

export default function CumulativeMultisWidget({ data, config, theme }) {
  const { bonuses = [] } = data || {};
  const { showIcon = true, fontSize = 28, decimals = 2, animated = true } = config || {};
  const { primaryColor = '#ec4899' } = theme || {};

  const [cumulativeMulti, setCumulativeMulti] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let sum = 0;
    bonuses.forEach(bonus => {
      if ((bonus.opened || bonus.status === 'opened') && bonus.cost > 0) {
        const multi = (bonus.won || 0) / bonus.cost;
        sum += multi;
      }
    });

    if (sum !== cumulativeMulti) {
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 600);
    }

    setCumulativeMulti(sum);
  }, [bonuses]);

  const displayValue = cumulativeMulti.toFixed(decimals);
  const openedCount = bonuses.filter(b => b.opened || b.status === 'opened').length;
  const averageMulti = openedCount > 0 ? (cumulativeMulti / openedCount).toFixed(decimals) : '0.00';

  return (
    <div 
      className={`cumulative-multis-widget ${animated && isUpdating ? 'updating' : ''}`}
      style={{ '--primary-color': primaryColor }}
    >
      {showIcon && (
        <div className="widget-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5.5 14H11v-2h2.5c.55 0 1-.45 1-1v-2c0-.55-.45-1-1-1H11V9h2.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5H10v6.5c0 .83.67 1.5 1.5 1.5h2c.83 0 1.5-.67 1.5-1.5v-3c0-.83-.67-1.5-1.5-1.5z"/>
          </svg>
        </div>
      )}
      
      <div className="widget-content">
        <div className="widget-label">Cumulative Multis</div>
        <div className="widget-value" style={{ fontSize: `${fontSize}px` }}>
          {displayValue}x
        </div>
        <div className="widget-sublabel">
          Avg: {averageMulti}x
        </div>
      </div>

      <div className="widget-glow"></div>
    </div>
  );
}
