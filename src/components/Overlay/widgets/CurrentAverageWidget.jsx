/**
 * Current Average Widget
 * Shows the current average win per bonus
 * Calculates total won / number of opened bonuses
 */

import { useState, useEffect } from 'react';
import './CurrentAverageWidget.css';

export default function CurrentAverageWidget({ data, config, theme }) {
  const { bonuses = [], totalWon = 0 } = data || {};
  const { showIcon = true, fontSize = 24, animated = true, currency = 'USD' } = config || {};
  const { primaryColor = '#8b5cf6' } = theme || {};

  const [average, setAverage] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const openedBonuses = bonuses.filter(b => b.opened || b.status === 'opened');
    const calculatedWon = totalWon || bonuses.reduce((sum, b) => sum + (parseFloat(b.won) || 0), 0);
    const newAverage = openedBonuses.length > 0 ? calculatedWon / openedBonuses.length : 0;

    if (newAverage !== average) {
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 600);
    }

    setAverage(newAverage);
  }, [bonuses, totalWon]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(value);
  };

  return (
    <div 
      className={`current-average-widget ${animated && isUpdating ? 'updating' : ''}`}
      style={{ '--primary-color': primaryColor }}
    >
      {showIcon && (
        <div className="widget-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M5 15h14v2H5v-2zm7.5-2.5L9 9h2.5V3h1v6H15l-2.5 3.5z"/>
          </svg>
        </div>
      )}
      
      <div className="widget-content">
        <div className="widget-label">Current Average</div>
        <div className="widget-value" style={{ fontSize: `${fontSize}px` }}>
          {formatCurrency(average)}
        </div>
      </div>

      <div className="widget-glow"></div>
    </div>
  );
}
