/**
 * Required Average Widget
 * Shows the average payout needed from remaining bonuses to break even
 * Helps streamers understand what's needed to profit
 */

import { useState, useEffect } from 'react';
import './RequiredAverageWidget.css';

export default function RequiredAverageWidget({ data, config, theme }) {
  const { bonuses = [], totalCost = 0, totalWon = 0, remainingBonuses } = data || {};
  const { showIcon = true, fontSize = 24, animated = true, currency = 'USD' } = config || {};
  const { primaryColor = '#f97316' } = theme || {};

  const [requiredAvg, setRequiredAvg] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [achievable, setAchievable] = useState(true);

  useEffect(() => {
    const calculatedCost = totalCost || bonuses.reduce((sum, b) => sum + (parseFloat(b.cost) || 0), 0);
    const calculatedWon = totalWon || bonuses.reduce((sum, b) => sum + (parseFloat(b.won) || 0), 0);
    const unopened = remainingBonuses !== undefined 
      ? remainingBonuses 
      : bonuses.filter(b => !b.opened && b.status !== 'opened').length;

    if (unopened === 0) {
      setRequiredAvg(0);
      setAchievable(calculatedWon >= calculatedCost);
      return;
    }

    // How much more we need to win to break even
    const deficit = calculatedCost - calculatedWon;
    // Average needed per remaining bonus
    const avgNeeded = deficit / unopened;

    // Calculate average cost to determine if it's achievable
    const avgCost = calculatedCost / (bonuses.length || 1);
    const achievableMulti = avgNeeded / avgCost;

    if (avgNeeded !== requiredAvg) {
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 600);
    }

    setRequiredAvg(Math.max(0, avgNeeded));
    setAchievable(achievableMulti <= 2.5); // Arbitrary threshold
  }, [bonuses, totalCost, totalWon, remainingBonuses]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(value);
  };

  return (
    <div 
      className={`required-average-widget ${animated && isUpdating ? 'updating' : ''} ${achievable ? 'achievable' : 'difficult'}`}
      style={{ '--primary-color': primaryColor }}
    >
      {showIcon && (
        <div className="widget-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z"/>
          </svg>
        </div>
      )}
      
      <div className="widget-content">
        <div className="widget-label">Required Average</div>
        <div className="widget-value" style={{ fontSize: `${fontSize}px` }}>
          {formatCurrency(requiredAvg)}
        </div>
        <div className="widget-sublabel">
          per remaining bonus
        </div>
      </div>

      <div className={`status-indicator ${achievable ? 'good' : 'warning'}`}>
        {achievable ? '✓' : '!'}
      </div>

      <div className="widget-glow"></div>
    </div>
  );
}
