/**
 * BH Tracker List Vertical Widget
 * Vertical scrolling list of bonuses from active hunt
 * Shows slot images, bets, payouts, and multipliers with super bonus animations
 */

import { useState, useEffect } from 'react';
import './BHTrackerListVertical.css';

export default function BHTrackerListVertical({ data, config, theme }) {
  const { 
    scrollSpeed = 30,
    pauseOnHover = true,
    widgetHeight = 500,
    widgetWidth = 320
  } = config || {};

  const [isPaused, setIsPaused] = useState(false);

  // Extract data properties (don't destructure at top to ensure fresh values)
  const activeHuntBonuses = data?.activeHuntBonuses || [];
  const activeHunt = data?.activeHunt || null;

  // Debug logging
  useEffect(() => {
    console.log('🎰 BHTrackerListVertical received:', {
      dataObject: data ? 'YES' : 'NO',
      activeHunt: activeHunt ? 'YES' : 'NO',
      bonusCount: activeHuntBonuses.length,
      allDataKeys: data ? Object.keys(data) : []
    });
  }, [data, activeHunt, activeHuntBonuses]);

  // Map active hunt bonuses to display format
  const bonuses = activeHuntBonuses.length > 0 ? activeHuntBonuses.map(bonus => ({
    id: bonus.id,
    name: bonus.slot_name,
    image: bonus.slot_image || 'https://via.placeholder.com/60',
    bet: bonus.bet_size,
    payout: bonus.bonus_win || 0,
    isSuper: bonus.is_super_bonus || false
  })) : [];

  // Duplicate for seamless scroll
  const scrollBonuses = bonuses.length > 0 ? [...bonuses, ...bonuses] : [];

  const formatCurrency = (value) => {
    return `€${value.toFixed(2)}`;
  };

  const calculateMultiplier = (payout, bet) => {
    return bet > 0 ? (payout / bet).toFixed(0) : '0';
  };

  if (bonuses.length === 0) {
    return (
      <div className="bh-tracker-vertical" style={{ width: `${widgetWidth}px`, height: `${widgetHeight}px` }}>
        <div className="empty-hunt-state">
          <div className="empty-icon">🎰</div>
          <p>No active hunt</p>
          <p className="empty-hint">Start opening bonuses to see them here</p>
          <div style={{ color: 'yellow', fontSize: '10px', marginTop: '20px', textAlign: 'left', padding: '10px', lineHeight: '1.5' }}>
            <div>activeHunt: {activeHunt ? JSON.stringify(activeHunt).substring(0, 50) : 'NO'}</div>
            <div>bonuses: {activeHuntBonuses.length}</div>
            <div>data received: {data ? 'YES' : 'NO'}</div>
            {data && <div>all bonuses: {data.bonuses?.length || 0}</div>}
            {data && <div>bonusStats: {data.bonusStats ? 'YES' : 'NO'}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bh-tracker-vertical" 
      style={{ width: `${widgetWidth}px`, height: `${widgetHeight}px` }}
    >
      {/* Gradient overlays */}
      <div className="gradient-top"></div>
      <div className="gradient-bottom"></div>

      {/* Scrolling container */}
      <div 
        className={`scroll-container ${isPaused ? 'paused' : ''}`}
        style={{ animationDuration: `${scrollSpeed}s` }}
        onMouseEnter={() => pauseOnHover && setIsPaused(true)}
        onMouseLeave={() => pauseOnHover && setIsPaused(false)}
      >
        {scrollBonuses.map((bonus, index) => {
          const multiplier = calculateMultiplier(bonus.payout, bonus.bet);
          const cardClass = bonus.isSuper ? 'super-bonus' : 'normal-bonus';

          return (
            <div key={`${bonus.id}-${index}`} className={`bonus-card ${cardClass}`}>
              <img 
                src={bonus.image} 
                alt={bonus.name} 
                className="slot-image"
              />
              <div className="bonus-info">
                <h3 className="bonus-name">{bonus.name}</h3>
                <p className="bonus-bet">Bet: {formatCurrency(bonus.bet)}</p>
                <p className="bonus-payout">Win: {formatCurrency(bonus.payout)}</p>
              </div>
              <div className={`multiplier ${bonus.isSuper ? 'super' : 'normal'}`}>
                <span className="multiplier-value">{multiplier}x</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
