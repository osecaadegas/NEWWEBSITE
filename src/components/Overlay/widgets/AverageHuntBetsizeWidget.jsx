/**
 * Average Hunt Betsize Widget
 * Displays the average bet size of the current bonus hunt
 * Production-quality component for OBS overlay
 */

import { useState, useEffect } from 'react';
import './AverageHuntBetsizeWidget.css';

export default function AverageHuntBetsizeWidget({ data, config, theme }) {
  const { bonuses = [] } = data || {};
  const { currency = '$', showIcon = true, fontSize = 24, animated = true } = config || {};
  const { primaryColor = '#667eea' } = theme || {};

  const [averageBetsize, setAverageBetsize] = useState(0);
  const [prevValue, setPrevValue] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  // Calculate average betsize from bonuses
  useEffect(() => {
    if (!bonuses || bonuses.length === 0) {
      setAverageBetsize(0);
      return;
    }

    const totalBetsize = bonuses.reduce((sum, bonus) => {
      return sum + (parseFloat(bonus.betsize) || 0);
    }, 0);

    const newAverage = totalBetsize / bonuses.length;
    
    if (newAverage !== prevValue) {
      setIsUpdating(true);
      setPrevValue(newAverage);
      setTimeout(() => setIsUpdating(false), 600);
    }

    setAverageBetsize(newAverage);
  }, [bonuses, prevValue]);

  const formattedValue = averageBetsize.toFixed(2);

  return (
    <div 
      className={`average-betsize-widget ${animated && isUpdating ? 'updating' : ''}`}
      style={{ '--primary-color': primaryColor }}
    >
      {showIcon && (
        <div className="widget-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M3.5 18.5l6-6 4 4L22 6.92 20.59 5.5 13.5 12.6l-4-4L1 17.09z"/>
          </svg>
        </div>
      )}
      
      <div className="widget-content">
        <div className="widget-label">Avg Betsize</div>
        <div 
          className="widget-value" 
          style={{ fontSize: `${fontSize}px` }}
        >
          {currency}{formattedValue}
        </div>
      </div>

      <div className="widget-glow" style={{ backgroundColor: primaryColor }}></div>
    </div>
  );
}
