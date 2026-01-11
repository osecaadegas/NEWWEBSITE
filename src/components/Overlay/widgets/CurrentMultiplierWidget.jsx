/**
 * Current Multiplier Widget
 * Shows the current overall multiplier of the hunt
 * Calculates total winnings / total cost
 */

import { useState, useEffect } from 'react';
import './CurrentMultiplierWidget.css';

export default function CurrentMultiplierWidget({ data, config, theme }) {
  const { bonuses = [], totalCost = 0, totalWon = 0 } = data || {};
  const { showIcon = true, fontSize = 24, decimals = 2, animated = true } = config || {};
  const { primaryColor = '#667eea' } = theme || {};

  const [multiplier, setMultiplier] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [trend, setTrend] = useState('neutral'); // 'up', 'down', 'neutral'

  useEffect(() => {
    const calculatedCost = totalCost || bonuses.reduce((sum, b) => sum + (parseFloat(b.cost) || 0), 0);
    const calculatedWon = totalWon || bonuses.reduce((sum, b) => sum + (parseFloat(b.won) || 0), 0);
    
    const newMulti = calculatedCost > 0 ? calculatedWon / calculatedCost : 0;
    
    if (newMulti !== multiplier) {
      setIsUpdating(true);
      setTrend(newMulti > multiplier ? 'up' : newMulti < multiplier ? 'down' : 'neutral');
      setTimeout(() => setIsUpdating(false), 700);
    }

    setMultiplier(newMulti);
  }, [bonuses, totalCost, totalWon]);

  const displayValue = multiplier.toFixed(decimals);
  const isProfit = multiplier >= 1;

  return (
    <div 
      className={`current-multiplier-widget ${animated && isUpdating ? 'updating' : ''} ${isProfit ? 'profit' : 'loss'} trend-${trend}`}
      style={{ '--primary-color': primaryColor }}
    >
      {showIcon && (
        <div className="widget-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-2v-4H8v-2h4V7h2v4h4v2h-4v4z"/>
          </svg>
        </div>
      )}
      
      <div className="widget-content">
        <div className="widget-label">Current Multi</div>
        <div className="widget-value" style={{ fontSize: `${fontSize}px` }}>
          {displayValue}x
        </div>
      </div>

      {trend !== 'neutral' && (
        <div className={`trend-indicator trend-${trend}`}>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {trend === 'up' ? (
              <path fill="currentColor" d="M7 14l5-5 5 5H7z"/>
            ) : (
              <path fill="currentColor" d="M7 10l5 5 5-5H7z"/>
            )}
          </svg>
        </div>
      )}

      <div className="widget-glow" style={{ backgroundColor: isProfit ? '#10b981' : '#ef4444' }}></div>
    </div>
  );
}
