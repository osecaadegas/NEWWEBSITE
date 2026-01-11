/**
 * Recent Wins Feed Widget
 * Scrolling feed of recent winning bonuses with timestamps
 * Auto-scrolls as new wins are added
 */

import { useState, useEffect, useRef } from 'react';
import './RecentWinsFeedWidget.css';

export default function RecentWinsFeedWidget({ data, config, theme }) {
  const { bonuses = [], recentWins = [] } = data || {};
  const { 
    maxHeight = 300, 
    maxItems = 10, 
    showTimestamp = true,
    animated = true,
    currency = 'USD'
  } = config || {};
  const { primaryColor = '#10b981' } = theme || {};

  const [wins, setWins] = useState([]);
  const listRef = useRef(null);

  useEffect(() => {
    // Extract recent wins from bonuses (opened with positive multiplier)
    const recentWinsList = recentWins.length > 0 ? recentWins : bonuses
      .filter(b => (b.opened || b.status === 'opened') && b.cost > 0 && b.won > 0)
      .map(b => ({
        ...b,
        multi: b.won / b.cost,
        timestamp: b.timestamp || Date.now()
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, maxItems);

    setWins(recentWinsList);

    // Auto-scroll to top when new win added
    if (listRef.current && recentWinsList.length > wins.length) {
      listRef.current.scrollTop = 0;
    }
  }, [bonuses, recentWins, maxItems]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div 
      className="recent-wins-feed-widget"
      style={{ '--primary-color': primaryColor }}
    >
      <div className="widget-header">
        <div className="header-title">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z"/>
          </svg>
          <span>Recent Wins</span>
        </div>
      </div>

      <div 
        className="wins-container" 
        ref={listRef}
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {wins.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
            <p>No wins yet</p>
          </div>
        ) : (
          <div className="win-items">
            {wins.map((win, index) => {
              const isGoodWin = win.multi >= 50;
              const isBigWin = win.multi >= 100;

              return (
                <div 
                  key={win.id || index}
                  className={`win-item ${animated ? 'animated' : ''} ${isBigWin ? 'big-win' : isGoodWin ? 'good-win' : ''}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="win-icon">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                  </div>

                  <div className="win-info">
                    <div className="win-name">
                      {win.name || win.game || `Bonus #${index + 1}`}
                    </div>
                    <div className="win-details">
                      <span className="win-amount">{formatCurrency(win.won)}</span>
                      <span className="win-multi">{win.multi.toFixed(2)}x</span>
                    </div>
                  </div>

                  {showTimestamp && (
                    <div className="win-timestamp">
                      {formatTimestamp(win.timestamp)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
