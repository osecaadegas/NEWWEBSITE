/**
 * Bonus History Timeline Widget
 * Visual timeline of all bonuses with completion states
 * Shows progression through hunt with milestone markers
 */

import { useState, useEffect } from 'react';
import './BonusHistoryTimelineWidget.css';

export default function BonusHistoryTimelineWidget({ data, config, theme }) {
  const { bonuses = [] } = data || {};
  const { maxHeight = 400, showDetails = true, animated = true } = config || {};
  const { primaryColor = '#3b82f6' } = theme || {};

  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    const sorted = [...bonuses].sort((a, b) => {
      if (a.index !== undefined && b.index !== undefined) return a.index - b.index;
      if (a.timestamp && b.timestamp) return new Date(a.timestamp) - new Date(b.timestamp);
      return 0;
    });
    setTimeline(sorted);
  }, [bonuses]);

  const formatMulti = (bonus) => {
    if (!bonus.cost || bonus.cost === 0) return '0.00x';
    return ((bonus.won || 0) / bonus.cost).toFixed(2) + 'x';
  };

  return (
    <div 
      className="bonus-history-timeline-widget"
      style={{ '--primary-color': primaryColor, maxHeight: `${maxHeight}px` }}
    >
      <div className="timeline-header">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
        </svg>
        <span>Bonus Timeline</span>
      </div>

      <div className="timeline-container">
        {timeline.length === 0 ? (
          <div className="empty-state">
            <p>No bonuses in timeline</p>
          </div>
        ) : (
          <div className="timeline-items">
            {timeline.map((bonus, index) => {
              const isOpened = bonus.opened || bonus.status === 'opened';
              const multi = bonus.cost > 0 ? (bonus.won || 0) / bonus.cost : 0;
              const isProfit = multi >= 1;

              return (
                <div 
                  key={bonus.id || index}
                  className={`timeline-item ${isOpened ? 'opened' : 'pending'} ${animated ? 'animated' : ''}`}
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <div className="timeline-marker">
                    <div className={`marker-dot ${isOpened ? 'completed' : 'pending'}`}>
                      {isOpened && (
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>
                      )}
                    </div>
                    {index < timeline.length - 1 && <div className="marker-line"></div>}
                  </div>

                  <div className="timeline-content">
                    <div className="content-header">
                      <div className="bonus-name">
                        {bonus.name || bonus.game || `Bonus #${index + 1}`}
                      </div>
                      {isOpened && showDetails && (
                        <div className={`bonus-result ${isProfit ? 'profit' : 'loss'}`}>
                          {formatMulti(bonus)}
                        </div>
                      )}
                    </div>
                    {!isOpened && (
                      <div className="pending-badge">Pending</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
