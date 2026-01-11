/**
 * Average Bonus Cost Widget
 * Displays the average cost of bonuses in the current hunt
 * Shows dollar amount with currency formatting
 */

import { useState, useEffect } from 'react';
import './AverageBonusCostWidget.css';

export default function AverageBonusCostWidget({ data, config, theme }) {
  const { bonuses = [] } = data || {};
  const { currency = '$', showIcon = true, fontSize = 24, animated = true } = config || {};
  const { primaryColor = '#667eea' } = theme || {};

  const [averageCost, setAverageCost] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!bonuses || bonuses.length === 0) {
      setAverageCost(0);
      return;
    }

    const totalCost = bonuses.reduce((sum, bonus) => {
      return sum + (parseFloat(bonus.cost) || 0);
    }, 0);

    const newAverage = totalCost / bonuses.length;
    
    if (newAverage !== averageCost) {
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 600);
    }

    setAverageCost(newAverage);
  }, [bonuses]);

  return (
    <div 
      className={`average-bonus-cost-widget ${animated && isUpdating ? 'updating' : ''}`}
      style={{ '--primary-color': primaryColor }}
    >
      {showIcon && (
        <div className="widget-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
          </svg>
        </div>
      )}
      
      <div className="widget-content">
        <div className="widget-label">Avg Bonus Cost</div>
        <div className="widget-value" style={{ fontSize: `${fontSize}px` }}>
          {currency}{averageCost.toFixed(2)}
        </div>
      </div>

      <div className="widget-glow" style={{ backgroundColor: primaryColor }}></div>
    </div>
  );
}
