/**
 * Bonus Hunt List Widget
 * Infinite scrolling carousel of bonuses with super bonus animations
 * Shows slot images, names, bets, payouts, and multipliers
 */

import { useState, useEffect, useRef } from 'react';
import './BonusHuntListWidget.css';

export default function BonusHuntListWidget({ data, config, theme }) {
  const { activeHuntBonuses = [], activeHunt = null } = data || {};
  const { 
    scrollSpeed = 30,
    pauseOnHover = true,
    cardHeight = 120
  } = config || {};
  const { primaryColor = '#8b5cf6' } = theme || {};

  const [isPaused, setIsPaused] = useState(false);
  const scrollContainerRef = useRef(null);

  // Debug logging
  useEffect(() => {
    console.log('🎰 BonusHuntListWidget data:', {
      activeHunt,
      activeHuntBonuses,
      bonusCount: activeHuntBonuses.length
    });
  }, [activeHunt, activeHuntBonuses]);

  // Use active hunt bonuses if available, otherwise show empty state
  const slotBonuses = activeHuntBonuses.length > 0 ? activeHuntBonuses.map(bonus => ({
    id: bonus.id,
    image: bonus.slot_image || 'https://via.placeholder.com/80',
    name: bonus.slot_name,
    bet: bonus.bet_size,
    payout: bonus.bonus_win || 0,
    is_super_bonus: bonus.is_super_bonus || false
  })) : [];

  // Duplicate the array for seamless infinite scroll (only if we have bonuses)
  const bonusData = slotBonuses.length > 0 ? [...slotBonuses, ...slotBonuses, ...slotBonuses] : [];

  const calculateMultiplier = (payout, bet) => {
    return bet > 0 ? (payout / bet).toFixed(2) : '0.00';
  };

  const formatCurrency = (value) => {
    return `€${value.toFixed(2)}`;
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || isPaused) return;

    let scrollAmount = 0;
    const maxScroll = container.scrollHeight / 3; // Scroll through one set of duplicated items

    const scroll = () => {
      if (!isPaused) {
        scrollAmount += 1;
        if (scrollAmount >= maxScroll) {
          scrollAmount = 0;
          container.scrollTop = 0;
        } else {
          container.scrollTop = scrollAmount;
        }
      }
    };

    const interval = setInterval(scroll, scrollSpeed);

    return () => clearInterval(interval);
  }, [isPaused, scrollSpeed]);

  return (
    <div 
      className="bonus-hunt-list-widget"
      style={{ '--primary-color': primaryColor }}
    >
      {bonusData.length === 0 ? (
        <div className="empty-hunt-state">
          <div className="empty-icon">🎰</div>
          <p>No active hunt</p>
          <p className="empty-hint">Start opening bonuses to see them here</p>
        </div>
      ) : (
        <div 
          className="scroll-container"
          ref={scrollContainerRef}
          onMouseEnter={() => pauseOnHover && setIsPaused(true)}
          onMouseLeave={() => pauseOnHover && setIsPaused(false)}
        >
          {bonusData.map((bonus, index) => {
          const multiplier = calculateMultiplier(bonus.payout, bonus.bet);
          const isSuper = bonus.is_super_bonus;

          return (
            <div 
              key={`${bonus.id}-${index}`}
              className={`bonus-card ${isSuper ? 'super-bonus' : 'normal-bonus'}`}
              style={{ height: `${cardHeight}px` }}
            >
              {/* Slot Image */}
              <div className="bonus-image-container">
                <img 
                  src={bonus.image} 
                  alt={bonus.name}
                  className="bonus-image"
                />
              </div>

              {/* Bonus Info */}
              <div className="bonus-content">
                <div className="bonus-header">
                  <h4 className="bonus-name">{bonus.name}</h4>
                  <div className={`multiplier-badge ${isSuper ? 'super' : 'normal'}`}>
                    {multiplier}x
                  </div>
                </div>

                <div className="bonus-stats">
                  <div className="stat">
                    <span className="stat-label">Bet:</span>
                    <span className="stat-value">{formatCurrency(bonus.bet)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Win:</span>
                    <span className="stat-value win">{formatCurrency(bonus.payout)}</span>
                  </div>
                </div>
              </div>

              {/* Super Bonus Glow Effect */}
              {isSuper && <div className="glow-effect"></div>}
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}
