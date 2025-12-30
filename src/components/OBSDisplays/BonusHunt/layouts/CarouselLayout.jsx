import { useState, useEffect, useRef } from 'react';
import './CarouselLayout.css';

export default function CarouselLayout({ bonuses, settings }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [rotation, setRotation] = useState(0);
  const animationRef = useRef(null);
  const hiddenUpdateDone = useRef(false);

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

  const activeBonuses = mappedBonuses.filter(b => b.status === 'active' || b.status === 'completed');
  const currentBonus = activeBonuses[currentIndex] || null;
  const nextBonus = activeBonuses[nextIndex] || null;

  // Continuous rotation animation
  useEffect(() => {
    const speed = 0.18; // degrees per millisecond (2s per rotation)
    let lastTime = performance.now();

    const animate = (timestamp) => {
      const delta = timestamp - lastTime;
      lastTime = timestamp;
      
      setRotation(prev => {
        const newRotation = (prev + delta * speed) % 360;
        
        // Magic swap: Update when back is visible (90-270°)
        const isBackVisible = newRotation > 90 && newRotation < 270;
        
        if (isBackVisible && !hiddenUpdateDone.current && activeBonuses.length > 1) {
          // Back showing, preload next bonus for front
          const next = (currentIndex + 1) % activeBonuses.length;
          setNextIndex(next);
          hiddenUpdateDone.current = true;
        } else if (!isBackVisible && hiddenUpdateDone.current) {
          // Front showing, swap to next
          setCurrentIndex(nextIndex);
          hiddenUpdateDone.current = false;
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
  }, [activeBonuses.length, currentIndex, nextIndex]);

  if (!currentBonus) {
    return (
      <div className="carousel-layout">
        <div className="carousel-empty">
          <div className="empty-icon">🎰</div>
          <h3>No Active Bonuses</h3>
          <p>Start a bonus hunt to see the magic card!</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  // Determine which bonus to show
  const displayBonus = rotation > 90 && rotation < 270 ? nextBonus || currentBonus : currentBonus;

  return (
    <div className="carousel-layout">
      <div className="card-container">
        <div 
          className="card"
          style={{ transform: `rotateY(${rotation}deg)` }}
        >
          {/* Back Face - Bonus Info */}
          <div className="back">
            <div className="back-slot-name">{displayBonus.slot_name || 'Unknown Slot'}</div>
            {displayBonus.provider && (
              <img 
                src={`/providers/${displayBonus.provider.toLowerCase().replace(/\s+/g, '-')}.png`}
                alt={displayBonus.provider}
                className="back-provider-image"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <div className="back-info">
              <div className="back-info-row">
                <span className="back-info-label">BET</span>
                <span className="back-info-value bet">{formatCurrency(displayBonus.bet)}</span>
              </div>
              <div className="back-info-row">
                <span className="back-info-label">PAYOUT</span>
                <span className="back-info-value payout">{formatCurrency(displayBonus.payout)}</span>
              </div>
            </div>
          </div>

          {/* Front Face - Slot Info */}
          <div className="front">
            <div className="red"></div>
            
            {/* Center - Slot Image */}
            <div className="text-center">
              {displayBonus.slot_image ? (
                <img 
                  src={displayBonus.slot_image} 
                  alt={displayBonus.slot_name}
                  className="slot-image"
                />
              ) : (
                <svg viewBox="0 0 48 48">
                  <path fill="#191f1f" d="m 14.743552,27.197424 -1.439826,8.888133 c -0.03174,0.195936 0.11777,0.374416 0.316237,0.377509 l 9.360641,0.145882 1.344371,-1.179158 c 0.564803,-0.495394 0.539089,-1.356019 0.138635,-1.809376 l -0.917385,-1.038581 3.767647,-3.479011 c 3.109084,-2.870901 1.057476,-6.709966 0.770567-6.996569 0.756364,1.018556 1.549631,1.587648 2.726324,0.463207 l 1.018375,-0.945401 1.436079,-8.944316 a 0.2950548,0.2950548 50.057903 0 0 -0.286204,-0.341785 l -9.366392,-0.162571 -1.255655,1.143726 c -0.463935,0.42258 -0.808482,1.236447 -0.243393,1.866828 l 0.943642,1.052673 -3.60197,3.194827 c -2.434455,2.115492 -2.358322,4.879113 -0.927458,7.357441 -1.098761,-1.90311 -2.23329,-1.355064 -3.784235,0.406542 z" />
                  <path fill="#fffffd" d="m 25.695312,15.503906 -4.234375,3.406249 c -1.206521,1.106493 -2.943121,3.745552 -0.311967,6.603761 0.05611,0.06095 0.153722,0.06567 0.216661,0.0118 l 7.454681,-6.381181 1.91767,2.327867 a 0.20414127,0.20414127 164.89444 0 0 0.359038,-0.09691 l 1.321929,-8.09898 a 0.22245666,0.22245666 49.630561 0 0 -0.219586,-0.258293 l -8.151173,0.0013 a 0.2092881,0.2092881 114.90739 0 0 -0.159876,0.344308 z" />
                  <path fill="#fffffd" d="m 25.695312,15.503906 -4.234375,3.406249 c -1.206521,1.106493 -2.943121,3.745552 -0.311967,6.603761 0.05611,0.06095 0.153722,0.06567 0.216661,0.0118 l 7.454681,-6.381181 1.91767,2.327867 a 0.20414127,0.20414127 164.89444 0 0 0.359038,-0.09691 l 1.321929,-8.09898 a 0.22245666,0.22245666 49.630561 0 0 -0.219586,-0.258293 l -8.151173,0.0013 a 0.2092881,0.2092881 114.90739 0 0 -0.159876,0.344308 z" transform="rotate(180,23.962004,23.841388)" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
