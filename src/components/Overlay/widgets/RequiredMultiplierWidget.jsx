/**
 * Required Multiplier Widget
 * Shows the multiplier needed to break even on the current hunt
 * Calculates what multiplier would make totalWon = totalCost
 */

import { useState, useEffect } from 'react';
import './RequiredMultiplierWidget.css';

export default function RequiredMultiplierWidget({ data, config, theme }) {
  const { bonuses = [], totalCost = 0, totalWon = 0, remainingBonuses = 0 } = data || {};
  const { showIcon = true, fontSize = 24, decimals = 2, animated = true } = config || {};
  const { primaryColor = '#f59e0b' } = theme || {};

  const [requiredMulti, setRequiredMulti] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [achievable, setAchievable] = useState(true);

  useEffect(() => {
    const calculatedCost = totalCost || bonuses.reduce((sum, b) => sum + (parseFloat(b.cost) || 0), 0);
    const calculatedWon = totalWon || bonuses.reduce((sum, b) => sum + (parseFloat(b.won) || 0), 0);
    const unopened = remainingBonuses || bonuses.filter(b => !b.opened).length;

    // If all bonuses opened, show what was required (1.0x = break even)
    if (unopened === 0) {
      setRequiredMulti(1.0);
      setAchievable(calculatedWon >= calculatedCost);
      return;
    }

    // Calculate what multiplier is needed considering remaining bonuses
    const deficit = calculatedCost - calculatedWon;
    const avgCost = calculatedCost / (bonuses.length || 1);
    const estimatedRemainingCost = unopened * avgCost;

    // Required multi = (totalCost) / (currentWon + remainingWinNeeded)
    // Simplified: we need totalWon to reach totalCost
    const newRequired = calculatedCost > 0 ? calculatedCost / calculatedCost : 1.0;
    
    // More accurate: what multi do remaining bonuses need to achieve?
    const remainingMultiNeeded = estimatedRemainingCost > 0 ? deficit / estimatedRemainingCost : 0;
    const finalRequired = remainingMultiNeeded > 0 ? remainingMultiNeeded : 1.0;

    if (finalRequired !== requiredMulti) {
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 700);
    }

    setRequiredMulti(finalRequired);
    setAchievable(finalRequired <= 3.0); // Arbitrary threshold for "achievable"
  }, [bonuses, totalCost, totalWon, remainingBonuses]);

  const displayValue = requiredMulti.toFixed(decimals);

  return (
    <div 
      className={`required-multiplier-widget ${animated && isUpdating ? 'updating' : ''} ${achievable ? 'achievable' : 'difficult'}`}
      style={{ '--primary-color': primaryColor }}
    >
      {showIcon && (
        <div className="widget-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
      )}
      
      <div className="widget-content">
        <div className="widget-label">Required Multi</div>
        <div className="widget-value" style={{ fontSize: `${fontSize}px` }}>
          {displayValue}x
        </div>
        <div className="widget-sublabel">
          {achievable ? 'Achievable' : 'Difficult'}
        </div>
      </div>

      <div className={`status-indicator ${achievable ? 'good' : 'warning'}`}>
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          {achievable ? (
            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
          ) : (
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          )}
        </svg>
      </div>

      <div className="widget-glow" style={{ backgroundColor: achievable ? '#10b981' : '#f59e0b' }}></div>
    </div>
  );
}
