/**
 * Best Bonus Payout Widget
 * Shows the highest single bonus payout amount
 * Star icon with premium styling
 */

import { useState, useEffect } from 'react';
import './BestBonusPayoutWidget.css';

export default function BestBonusPayoutWidget({ data, config, theme }) {
  const { bonuses = [] } = data || {};
  const { showIcon = true, fontSize = 28, animated = true, currency = 'USD' } = config || {};
  const { primaryColor = '#14b8a6' } = theme || {};

  const [bestPayout, setBestPayout] = useState(0);
  const [bestBonus, setBestBonus] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let highestPayout = 0;
    let highestBonus = null;

    bonuses.forEach(bonus => {
      const payout = parseFloat(bonus.won) || 0;
      if (payout > highestPayout) {
        highestPayout = payout;
        highestBonus = bonus;
      }
    });

    if (highestPayout !== bestPayout) {
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 800);
    }

    setBestPayout(highestPayout);
    setBestBonus(highestBonus);
  }, [bonuses]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(value);
  };

  return (
    <div 
      className={`best-bonus-payout-widget ${animated && isUpdating ? 'updating' : ''}`}
      style={{ '--primary-color': primaryColor }}
    >
      {showIcon && (
        <div className="widget-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        </div>
      )}
      
      <div className="widget-content">
        <div className="widget-label">Best Payout</div>
        <div className="widget-value" style={{ fontSize: `${fontSize}px` }}>
          {formatCurrency(bestPayout)}
        </div>
        {bestBonus && (
          <div className="widget-sublabel">
            {bestBonus.name || bestBonus.game || 'Bonus'}
          </div>
        )}
      </div>

      <div className="sparkle sparkle-1"></div>
      <div className="sparkle sparkle-2"></div>
      <div className="sparkle sparkle-3"></div>
      <div className="widget-glow"></div>
    </div>
  );
}
