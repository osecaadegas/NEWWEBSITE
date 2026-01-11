/**
 * Required Roll Average Widget
 * Shows what average roll/multiplier is needed from remaining bonuses
 * Similar to Required Average but focused on multiplier instead of currency
 */

import { useState, useEffect } from 'react';
import './RequiredRollAverageWidget.css';

export default function RequiredRollAverageWidget({ data, config, theme }) {
  const { bonuses = [], totalCost = 0, totalWon = 0, remainingBonuses } = data || {};
  const { showIcon = true, fontSize = 24, decimals = 2, animated = true } = config || {};
  const { primaryColor = '#06b6d4' } = theme || {};

  const [requiredRoll, setRequiredRoll] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const calculatedCost = totalCost || bonuses.reduce((sum, b) => sum + (parseFloat(b.cost) || 0), 0);
    const calculatedWon = totalWon || bonuses.reduce((sum, b) => sum + (parseFloat(b.won) || 0), 0);
    const unopened = remainingBonuses !== undefined 
      ? remainingBonuses 
      : bonuses.filter(b => !b.opened && b.status !== 'opened').length;

    if (unopened === 0) {
      setRequiredRoll(1.0);
      return;
    }

    const deficit = calculatedCost - calculatedWon;
    const avgCost = calculatedCost / (bonuses.length || 1);
    const totalRemainingCost = unopened * avgCost;
    
    // Required average multiplier = (deficit) / (estimated remaining cost)
    const requiredMulti = totalRemainingCost > 0 ? (deficit + totalRemainingCost) / totalRemainingCost : 1.0;

    if (requiredMulti !== requiredRoll) {
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 600);
    }

    setRequiredRoll(Math.max(0, requiredMulti));
  }, [bonuses, totalCost, totalWon, remainingBonuses]);

  const displayValue = requiredRoll.toFixed(decimals);

  return (
    <div 
      className={`required-roll-average-widget ${animated && isUpdating ? 'updating' : ''}`}
      style={{ '--primary-color': primaryColor }}
    >
      {showIcon && (
        <div className="widget-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
      )}
      
      <div className="widget-content">
        <div className="widget-label">Required Roll Avg</div>
        <div className="widget-value" style={{ fontSize: `${fontSize}px` }}>
          {displayValue}x
        </div>
        <div className="widget-sublabel">avg multiplier needed</div>
      </div>

      <div className="widget-glow"></div>
    </div>
  );
}
