/**
 * Goal Progress Widget
 * Visual progress bar towards a target amount or multiplier
 * Shows percentage, current vs target, and estimated completion
 */

import { useState, useEffect } from 'react';
import './GoalProgressWidget.css';

export default function GoalProgressWidget({ data, config, theme }) {
  const { currentValue = 0, targetValue = 1000, goalType = 'balance' } = data || {};
  const { showPercentage = true, showEstimate = true, animated = true, currency = 'USD' } = config || {};
  const { primaryColor = '#8b5cf6' } = theme || {};

  const [progress, setProgress] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const newProgress = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;
    
    if (newProgress !== progress) {
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 600);
    }

    setProgress(newProgress);
  }, [currentValue, targetValue]);

  const formatValue = (value) => {
    if (goalType === 'balance' || goalType === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
      }).format(value);
    }
    return value.toLocaleString();
  };

  const remaining = Math.max(targetValue - currentValue, 0);
  const isComplete = progress >= 100;

  return (
    <div 
      className={`goal-progress-widget ${animated && isUpdating ? 'updating' : ''} ${isComplete ? 'complete' : ''}`}
      style={{ '--primary-color': primaryColor }}
    >
      <div className="widget-header">
        <div className="header-title">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Goal Progress</span>
        </div>
        {showPercentage && (
          <div className="progress-percentage">{progress.toFixed(1)}%</div>
        )}
      </div>

      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          >
            {isComplete && (
              <div className="complete-checkmark">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="progress-details">
        <div className="detail-item">
          <div className="detail-label">Current</div>
          <div className="detail-value">{formatValue(currentValue)}</div>
        </div>
        <div className="detail-separator">/</div>
        <div className="detail-item">
          <div className="detail-label">Target</div>
          <div className="detail-value">{formatValue(targetValue)}</div>
        </div>
      </div>

      {showEstimate && !isComplete && (
        <div className="remaining-amount">
          {formatValue(remaining)} remaining
        </div>
      )}

      {isComplete && (
        <div className="completion-message">
          🎉 Goal Achieved!
        </div>
      )}
    </div>
  );
}
