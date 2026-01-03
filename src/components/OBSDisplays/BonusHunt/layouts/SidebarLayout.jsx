import { useEffect, useState, useRef } from 'react';
import './SidebarLayout.css';

export default function SidebarLayout({ bonuses, settings }) {
  const [currentBonusIndex, setCurrentBonusIndex] = useState(0);
  const [nextBonusIndex, setNextBonusIndex] = useState(1);
  const [preloadedImages, setPreloadedImages] = useState({});
  const [rotation, setRotation] = useState(0);
  const animationRef = useRef(null);

  // Map bonuses to consistent format
  const mappedBonuses = (bonuses || []).map(b => ({
    ...b,
    slot_name: b.slot_name || b.slot?.name || 'Unknown Slot',
    slot_image: b.slot_image || b.slot?.image || '',
    bet: b.bet || b.betSize || 0,
    payout: b.payout || b.result || 0,
    multiplier: b.multiplier || (b.betSize > 0 ? (b.result || 0) / b.betSize : 0),
    status: b.status || (b.opened ? 'completed' : 'active'),
    provider: b.provider || b.slot?.provider || 'Unknown'
  }));

  const activeBonuses = mappedBonuses.filter(b => b.status === 'active' || b.status === 'completed');

  // Preload images
  useEffect(() => {
    activeBonuses.forEach((bonus, index) => {
      if (bonus.slot_image && !preloadedImages[bonus.slot_image]) {
        const img = new Image();
        img.onload = () => {
          setPreloadedImages(prev => ({ ...prev, [bonus.slot_image]: true }));
        };
        img.src = bonus.slot_image;
      }
    });
  }, [activeBonuses]);

  // Continuous smooth rotation
  useEffect(() => {
    if (activeBonuses.length === 0) return;

    const speed = 0.05; // degrees per frame (slower = smoother)
    let lastTime = performance.now();
    let currentIndex = currentBonusIndex;
    let hasChangedAt90 = false;

    const animate = (timestamp) => {
      const delta = timestamp - lastTime;
      lastTime = timestamp;
      
      setRotation(prev => {
        const newRotation = (prev + (delta * speed)) % 360;
        
        // Change image when card is perfectly edge-on at 90 degrees
        const isAt90 = newRotation >= 88 && newRotation <= 92;
        
        if (isAt90 && !hasChangedAt90) {
          hasChangedAt90 = true;
          const nextIndex = (currentIndex + 1) % activeBonuses.length;
          currentIndex = nextIndex;
          setCurrentBonusIndex(nextIndex);
          setNextBonusIndex((nextIndex + 1) % activeBonuses.length);
        } else if (newRotation < 88 || newRotation > 92) {
          // Reset flag when we're away from 90 degrees
          hasChangedAt90 = false;
        }
        
        return newRotation;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [activeBonuses.length]);

  if (activeBonuses.length === 0) {
    return (
      <div className="sidebar-layout">
        <div className="sidebar-empty">
          <div className="empty-icon">🎰</div>
          <h3>No Active Bonuses</h3>
          <p>Start hunting!</p>
        </div>
      </div>
    );
  }

  const currentBonus = activeBonuses[currentBonusIndex];
  const payout = currentBonus.payout || (currentBonus.multiplier * currentBonus.bet);
  const profitLoss = payout - currentBonus.bet;

  // Calculate statistics
  const totalBet = activeBonuses.reduce((sum, b) => sum + b.bet, 0);
  const totalPayout = activeBonuses.reduce((sum, b) => {
    const pay = b.payout || (b.multiplier * b.bet);
    return sum + pay;
  }, 0);
  const totalProfit = totalPayout - totalBet;
  const completedCount = activeBonuses.filter(b => b.status === 'completed').length;
  const avgMultiplier = activeBonuses.length > 0
    ? activeBonuses.reduce((sum, b) => sum + (b.multiplier || 0), 0) / activeBonuses.length
    : 0;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  return (
    <div className="sidebar-layout">
      {/* Statistics Card */}
      <div className="sidebar-stats-card">
        <div className="sidebar-stats-header">
          <span className="stats-icon">📊</span>
          <h3>Hunt Statistics</h3>
        </div>
        <div className="sidebar-stats-grid">
          <div className="sidebar-stat-item">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-label">Total Bet</div>
              <div className="stat-value">{formatCurrency(totalBet)}</div>
            </div>
          </div>
          <div className="sidebar-stat-item">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-label">Total Win</div>
              <div className="stat-value">{formatCurrency(totalPayout)}</div>
            </div>
          </div>
          <div className="sidebar-stat-item">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <div className="stat-label">Profit/Loss</div>
              <div className={`stat-value ${totalProfit >= 0 ? 'profit' : 'loss'}`}>
                {formatCurrency(totalProfit)}
              </div>
            </div>
          </div>
          <div className="sidebar-stat-item">
            <div className="stat-icon">⚡</div>
            <div className="stat-content">
              <div className="stat-label">Avg Multi</div>
              <div className="stat-value">{avgMultiplier.toFixed(1)}x</div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Bonus Card */}
      <div className="sidebar-featured-card">
        <div className="sidebar-featured-header">
          <h3>Featured Bonus</h3>
          <span className="bonus-counter">{currentBonusIndex + 1}/{activeBonuses.length}</span>
        </div>
        
        <div className="sidebar-card-container">
          <div 
            className={`sidebar-card-flipper ${currentBonus.isSuperBonus ? 'super-bonus' : ''}`}
            style={{ transform: `rotateY(${rotation}deg)` }}
          >
            {/* Front - Slot Image */}
            <div className="sidebar-card-face sidebar-card-front">
              {preloadedImages[currentBonus.slot_image] ? (
                <img 
                  src={currentBonus.slot_image || 'https://placehold.co/400x400/1e293b/white?text=SLOT'}
                  alt={currentBonus.slot_name}
                  className="sidebar-card-image loaded"
                  onError={(e) => e.target.src = 'https://placehold.co/400x400/1e293b/white?text=SLOT'}
                />
              ) : (
                <div className="sidebar-card-loading">
                  <div className="loading-spinner"></div>
                </div>
              )}
            </div>
            
            {/* Back - Provider Info */}
            <div className="sidebar-card-face sidebar-card-back">
              <div className="provider-display">
                <div className="provider-name">{currentBonus.provider || 'Provider'}</div>
                <div className="provider-subtext">Casino Provider</div>
                {/* Preload next image during back face display */}
                {activeBonuses[nextBonusIndex] && (
                  <img 
                    src={activeBonuses[nextBonusIndex].slot_image}
                    alt="preload"
                    style={{ display: 'none' }}
                    onError={(e) => e.target.src = 'https://placehold.co/400x400/1e293b/white?text=SLOT'}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bonus Details */}
        <div className="sidebar-bonus-details">
          <div className="bonus-name">{currentBonus.slot_name || 'Unknown Slot'}</div>
          
          <div className="bonus-info-grid">
            <div className="bonus-info-item">
              <span className="info-label">Bet Size</span>
              <span className="info-value bet">{formatCurrency(currentBonus.bet)}</span>
            </div>
            <div className="bonus-info-item">
              <span className="info-label">Multiplier</span>
              <span className="info-value multi">
                {currentBonus.multiplier > 0 ? `${currentBonus.multiplier.toFixed(0)}x` : '-'}
              </span>
            </div>
            <div className="bonus-info-item">
              <span className="info-label">Payout</span>
              <span className="info-value payout">{formatCurrency(payout)}</span>
            </div>
            <div className="bonus-info-item">
              <span className="info-label">Result</span>
              <span className={`info-value result ${profitLoss >= 0 ? 'profit' : 'loss'}`}>
                {profitLoss >= 0 ? '+' : ''}{formatCurrency(profitLoss)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bonus List Preview */}
      <div className="sidebar-bonus-list">
        <div className="bonus-list-header">
          <h3>All Bonuses</h3>
        </div>
        <div className="bonus-list-items">
          <div className="bonus-list-scroll">
            {/* Render list twice for seamless infinite scroll */}
            {[...activeBonuses, ...activeBonuses].map((bonus, index) => (
              <div 
                key={`${bonus.id}-${index}`}
                className={`bonus-list-item ${index % activeBonuses.length === currentBonusIndex ? 'active' : ''} ${bonus.status === 'completed' ? 'completed' : ''}`}
              >
                <img 
                  src={bonus.slot_image || 'https://placehold.co/80x80/1e293b/white?text=SLOT'}
                  alt={bonus.slot_name}
                  className="list-item-image"
                  onError={(e) => e.target.src = 'https://placehold.co/80x80/1e293b/white?text=SLOT'}
                />
                <div className="list-item-info">
                  <div className="list-item-name">{bonus.slot_name}</div>
                  <div className="list-item-multi">
                    {bonus.multiplier > 0 ? `${bonus.multiplier.toFixed(0)}x` : 'Pending'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
