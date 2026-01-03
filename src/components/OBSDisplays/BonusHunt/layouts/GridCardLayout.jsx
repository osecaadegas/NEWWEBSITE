import { useState, useEffect } from 'react';
import './GridCardLayout.css';

export default function GridCardLayout({ bonuses, settings }) {
  const [slotData, setSlotData] = useState({});
  const [preloadedImages, setPreloadedImages] = useState({});

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

  // Preload all images
  useEffect(() => {
    activeBonuses.forEach((bonus) => {
      if (bonus.slot_image && !preloadedImages[bonus.slot_image]) {
        const img = new Image();
        img.onload = () => {
          setPreloadedImages(prev => ({ ...prev, [bonus.slot_image]: true }));
        };
        img.src = bonus.slot_image;
      }
    });
  }, [activeBonuses]);

  if (activeBonuses.length === 0) {
    return (
      <div className="grid-card-layout">
        <div className="grid-empty">
          <div className="empty-icon">🎰</div>
          <h3>No Active Bonuses</h3>
          <p>Start a bonus hunt to see the grid!</p>
        </div>
      </div>
    );
  }

  // Find best and worst bonuses
  const openedBonuses = activeBonuses.filter(b => b.multiplier > 0);
  let bestBonusId = null;
  let worstBonusId = null;

  if (openedBonuses.length >= 2) {
    const bestBonus = openedBonuses.reduce((best, current) => 
      current.multiplier > best.multiplier ? current : best
    );
    const worstBonus = openedBonuses.reduce((worst, current) => 
      current.multiplier < worst.multiplier ? current : worst
    );
    
    if (bestBonus.id !== worstBonus.id) {
      bestBonusId = bestBonus.id;
      worstBonusId = worstBonus.id;
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  return (
    <div className="grid-card-layout">
      <div className="card-grid">
        {activeBonuses.map((bonus) => {
          const payout = bonus.payout || (bonus.multiplier * bonus.bet);
          const profitLoss = payout - bonus.bet;
          
          let glowClass = '';
          if (bonus.id === bestBonusId) glowClass = 'best-glow';
          if (bonus.id === worstBonusId) glowClass = 'worst-glow';
          
          return (
            <div key={bonus.id} className={`grid-card ${bonus.status === 'completed' ? 'opened' : 'unopened'} ${glowClass}`}>
              <div className="grid-card-image-section">
                <div className="grid-card-flipper">
                  {/* Front - Slot Image */}
                  <div className="grid-card-face grid-card-face-front">
                    {preloadedImages[bonus.slot_image] ? (
                      <img 
                        src={bonus.slot_image || 'https://placehold.co/300x300/1e293b/white?text=SLOT'} 
                        alt={bonus.slot_name}
                        className="grid-card-slot-image loaded"
                        onError={(e) => e.target.src = 'https://placehold.co/300x300/1e293b/white?text=SLOT'}
                      />
                    ) : (
                      <div className="grid-card-loading">
                        <div className="loading-spinner"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Back - Provider Info */}
                  <div className="grid-card-face grid-card-face-back">
                    <div className="provider-info">
                      <div className="provider-name">{bonus.provider || 'Provider'}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Card Details */}
              <div className="grid-card-details">
                <div className="grid-card-slot-name">{bonus.slot_name || 'Unknown Slot'}</div>
                
                <div className="grid-card-stats">
                  <div className="grid-stat-item">
                    <span className="grid-stat-label">Bet:</span>
                    <span className="grid-stat-value">{formatCurrency(bonus.bet)}</span>
                  </div>
                  
                  <div className="grid-stat-item">
                    <span className="grid-stat-label">Multi:</span>
                    <span className="grid-stat-value multiplier">
                      {bonus.multiplier > 0 ? `${bonus.multiplier.toFixed(0)}x` : '-'}
                    </span>
                  </div>
                </div>
                
                {bonus.status === 'completed' && (
                  <div className={`grid-card-result ${profitLoss >= 0 ? 'profit' : 'loss'}`}>
                    <span className="result-label">{profitLoss >= 0 ? 'Win:' : 'Loss:'}</span>
                    <span className="result-value">{formatCurrency(Math.abs(profitLoss))}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
