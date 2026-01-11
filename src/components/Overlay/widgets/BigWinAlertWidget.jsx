/**
 * Big Win Alert Widget
 * Full-screen celebration overlay for significant wins
 * Appears temporarily with confetti and large value display
 */

import { useState, useEffect } from 'react';
import './BigWinAlertWidget.css';

export default function BigWinAlertWidget({ data, config, theme }) {
  const { lastWin = 0, threshold = 1000, bonusName = '' } = data || {};
  const { duration = 5000, animated = true, currency = 'USD' } = config || {};
  const { primaryColor = '#eab308' } = theme || {};

  const [isVisible, setIsVisible] = useState(false);
  const [displayAmount, setDisplayAmount] = useState(0);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (lastWin >= threshold) {
      setDisplayAmount(lastWin);
      setDisplayName(bonusName);
      setIsVisible(true);

      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [lastWin, threshold, bonusName, duration]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(value);
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`big-win-alert-widget ${animated ? 'animated' : ''}`}
      style={{ '--primary-color': primaryColor }}
    >
      <div className="alert-overlay">
        <div className="confetti-container">
          {[...Array(50)].map((_, i) => (
            <div key={i} className="confetti" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`
            }}></div>
          ))}
        </div>

        <div className="alert-content">
          <div className="alert-title">BIG WIN!</div>
          <div className="alert-amount">{formatCurrency(displayAmount)}</div>
          {displayName && <div className="alert-bonus-name">{displayName}</div>}
          
          <div className="alert-rays">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="ray" style={{ transform: `rotate(${i * 30}deg)` }}></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
