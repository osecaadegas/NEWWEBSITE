/**
 * Best Multiplier Widget
 * Shows the highest multiplier achieved in the current hunt
 * Trophy icon with gold styling for standout achievement
 */

import { useState, useEffect } from 'react';
import './BestMultiplierWidget.css';

export default function BestMultiplierWidget({ data, config, theme }) {
  const { bonuses = [] } = data || {};
  const { showIcon = true, fontSize = 28, decimals = 2, animated = true } = config || {};
  const { primaryColor = '#eab308' } = theme || {};

  const [bestMulti, setBestMulti] = useState(0);
  const [bestBonus, setBestBonus] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let highestMulti = 0;
    let highestBonus = null;

    bonuses.forEach(bonus => {
      if (bonus.cost > 0) {
        const multi = (bonus.won || 0) / bonus.cost;
        if (multi > highestMulti) {
          highestMulti = multi;
          highestBonus = bonus;
        }
      }
    });

    if (highestMulti !== bestMulti) {
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 800);
    }

    setBestMulti(highestMulti);
    setBestBonus(highestBonus);
  }, [bonuses]);

  const displayValue = bestMulti.toFixed(decimals);

  return (
    <div 
      className={`best-multiplier-widget ${animated && isUpdating ? 'updating' : ''} ${bestMulti >= 100 ? 'legendary' : bestMulti >= 50 ? 'epic' : ''}`}
      style={{ '--primary-color': primaryColor }}
    >
      {showIcon && (
        <div className="widget-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
      )}
      
      <div className="widget-content">
        <div className="widget-label">Best Multi</div>
        <div className="widget-value" style={{ fontSize: `${fontSize}px` }}>
          {displayValue}x
        </div>
        {bestBonus && (
          <div className="widget-sublabel">
            {bestBonus.name || bestBonus.game || 'Bonus'}
          </div>
        )}
      </div>

      <div className="shimmer"></div>
      <div className="widget-glow"></div>
    </div>
  );
}
