/**
 * Bonuses Count Widget
 * Shows total number of bonuses collected in current hunt
 * Animated counter with trend indicator
 */

import { useState, useEffect } from 'react';
import './BonusesCountWidget.css';

export default function BonusesCountWidget({ data, config, theme }) {
  const { bonuses = [] } = data || {};
  const { showIcon = true, fontSize = 32, animated = true } = config || {};
  const { primaryColor = '#06b6d4' } = theme || {};

  const [count, setCount] = useState(0);
  const [prevCount, setPrevCount] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const newCount = bonuses.length;
    if (newCount !== count) {
      setPrevCount(count);
      setCount(newCount);
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 600);
    }
  }, [bonuses]);

  const trend = count > prevCount ? 'up' : count < prevCount ? 'down' : 'neutral';

  return (
    <div 
      className={`bonuses-count-widget ${animated && isUpdating ? 'updating' : ''} trend-${trend}`}
      style={{ '--primary-color': primaryColor }}
    >
      {showIcon && (
        <div className="widget-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
        </div>
      )}
      
      <div className="widget-content">
        <div className="widget-label">Total Bonuses</div>
        <div className="widget-value" style={{ fontSize: `${fontSize}px` }}>
          {count}
        </div>
      </div>

      {trend !== 'neutral' && (
        <div className={`trend-arrow trend-${trend}`}>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {trend === 'up' ? (
              <path fill="currentColor" d="M7 14l5-5 5 5H7z"/>
            ) : (
              <path fill="currentColor" d="M7 10l5 5 5-5H7z"/>
            )}
          </svg>
        </div>
      )}

      <div className="widget-glow"></div>
    </div>
  );
}
