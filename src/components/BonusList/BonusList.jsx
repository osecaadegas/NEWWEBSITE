import { useEffect, useRef } from 'react';
import './BonusList.css';

const BonusList = ({ bonuses, showStatistics, startMoney, targetMoney, onBonusClick }) => {
  const carouselRef = useRef(null);

  // Map bonuses to consistent format
  const mappedBonuses = (bonuses || []).map(b => ({
    ...b,
    slot_name: b.slot_name || b.slot?.name || 'Unknown Slot',
    slot_image: b.slot_image || b.slot?.image || '',
    bet: b.bet || b.betSize || 0,
    payout: b.payout || b.result || 0,
    multiplier: b.multiplier || (b.betSize > 0 ? (b.result || 0) / b.betSize : 0),
    status: b.status || (b.opened ? 'completed' : 'active')
  }));

  useEffect(() => {
    if (!carouselRef.current || mappedBonuses.length === 0) return;

    // Create infinite loop by duplicating bonuses
    let baseBlock = [...mappedBonuses];
    
    // If list is short, repeat until we have at least 6 items
    if (baseBlock.length < 6) {
      const original = [...baseBlock];
      while (baseBlock.length < 6) {
        baseBlock = [...baseBlock, ...original];
      }
    }

    // Calculate animation duration based on number of items
    const itemHeight = 190; // approximate card height + gap
    const baseBlockHeight = baseBlock.length * itemHeight;
    const speed = 30; // pixels per second
    const duration = baseBlockHeight / speed;
    carouselRef.current.style.animationDuration = `${duration}s`;
  }, [mappedBonuses.length]);

  // Create render list - duplicate for infinite scroll
  let baseBlock = mappedBonuses.length > 0 ? [...mappedBonuses] : [];
  if (baseBlock.length < 6 && baseBlock.length > 0) {
    const original = [...baseBlock];
    while (baseBlock.length < 6) {
      baseBlock = [...baseBlock, ...original];
    }
  }
  const renderList = [...baseBlock, ...baseBlock];

  return (
    <div className="bonus-hunter-wrapper">
      {/* Header */}
      <div className="bonus-hunter-header">
        <h1 className="bonus-hunter-title">
          <span className="title-accent">BONUS</span> HUNTER
        </h1>
        <div className="item-count">{mappedBonuses.length} ITEMS</div>
      </div>

      {/* Carousel */}
      <div className="bonus-hunter-carousel">
        {bonuses.length === 0 ? (
          <div className="empty-state-hunter">No bonuses yet...</div>
        ) : (
          <div 
            ref={carouselRef} 
            className="carousel-content"
          >
            {renderList.map((bonus, index) => {
              const multiplier = bonus.multiplier || 0;
              const bet = bonus.betSize || bonus.bet || 0;
              const payout = bonus.result || bonus.payout || (bet * multiplier);
              const slotImage = bonus.slot?.image || bonus.slot_image;
              const slotName = bonus.slot?.name || bonus.slot_name || 'Unknown Slot';

              return (
                <div 
                  key={`${bonus.id}-${index}`} 
                  className="slot-card"
                  onClick={() => onBonusClick && onBonusClick(bonus)}
                >
                  <div className="slot-name-pill">{slotName}</div>
                  <div className="slot-image-container">
                    <img 
                      src={slotImage || 'https://placehold.co/200x200/1e293b/white?text=SLOT'} 
                      alt={slotName} 
                      className="slot-image"
                      onError={(e) => e.target.src = 'https://placehold.co/200x200/1e293b/white?text=SLOT'}
                    />
                    <div className="slot-overlay-info">
                      <span className="slot-bet">€{bet.toFixed(2)}</span>
                      <span className="slot-payout">€{payout.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BonusList;
