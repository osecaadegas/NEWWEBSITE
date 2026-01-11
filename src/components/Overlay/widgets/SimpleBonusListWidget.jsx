/**
 * Simple Bonus List Widget
 * Scrollable list of all bonuses with status indicators
 * Shows cost, multiplier, and opened/unopened state
 */

import { useState, useEffect, useRef } from 'react';
import './SimpleBonusListWidget.css';

export default function SimpleBonusListWidget({ data, config, theme }) {
  const { bonuses = [] } = data || {};
  const { 
    maxHeight = 400, 
    showCost = true, 
    showMultiplier = true,
    animated = true,
    autoScroll = false 
  } = config || {};
  const { primaryColor = '#8b5cf6' } = theme || {};

  const [sortedBonuses, setSortedBonuses] = useState([]);
  const listRef = useRef(null);
  const lastCountRef = useRef(bonuses.length);

  useEffect(() => {
    // Sort by index or timestamp, most recent first
    const sorted = [...bonuses].sort((a, b) => {
      if (a.index !== undefined && b.index !== undefined) return b.index - a.index;
      if (a.timestamp && b.timestamp) return new Date(b.timestamp) - new Date(a.timestamp);
      return 0;
    });
    setSortedBonuses(sorted);

    // Auto-scroll to bottom when new bonus added
    if (autoScroll && listRef.current && bonuses.length > lastCountRef.current) {
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
    lastCountRef.current = bonuses.length;
  }, [bonuses, autoScroll]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  return (
    <div 
      className="simple-bonus-list-widget"
      style={{ '--primary-color': primaryColor }}
    >
      <div className="widget-header">
        <div className="header-title">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
          </svg>
          <span>Bonus List</span>
        </div>
        <div className="bonus-count">{bonuses.length}</div>
      </div>

      <div 
        className="bonus-list-container" 
        ref={listRef}
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {sortedBonuses.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
            </svg>
            <p>No bonuses yet</p>
          </div>
        ) : (
          <div className="bonus-items">
            {sortedBonuses.map((bonus, index) => {
              const multi = bonus.cost > 0 ? (bonus.won || 0) / bonus.cost : 0;
              const isProfit = multi >= 1;
              const isOpened = bonus.opened || bonus.status === 'opened';

              return (
                <div 
                  key={bonus.id || index}
                  className={`bonus-item ${isOpened ? 'opened' : 'unopened'} ${animated ? 'animated' : ''}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="bonus-indicator">
                    <div className={`status-dot ${isOpened ? 'opened' : 'unopened'}`}></div>
                  </div>

                  <div className="bonus-info">
                    <div className="bonus-name">
                      {bonus.name || bonus.game || `Bonus #${index + 1}`}
                    </div>
                    <div className="bonus-details">
                      {showCost && (
                        <span className="bonus-cost">
                          {formatCurrency(bonus.cost || 0)}
                        </span>
                      )}
                      {showMultiplier && isOpened && (
                        <span className={`bonus-multi ${isProfit ? 'profit' : 'loss'}`}>
                          {multi.toFixed(2)}x
                        </span>
                      )}
                      {!isOpened && (
                        <span className="bonus-pending">Pending</span>
                      )}
                    </div>
                  </div>

                  {isOpened && (
                    <div className={`bonus-result ${isProfit ? 'profit' : 'loss'}`}>
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        {isProfit ? (
                          <path fill="currentColor" d="M7 14l5-5 5 5H7z"/>
                        ) : (
                          <path fill="currentColor" d="M7 10l5 5 5-5H7z"/>
                        )}
                      </svg>
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
