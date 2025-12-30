import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { getMethodIcons } from '../../utils/depositMethods';
import './OffersPage.css';

export default function OffersPage() {
  const [flippedCards, setFlippedCards] = useState({});
  const [casinoOffers, setCasinoOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('casino_offers')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error loading offers:', error);
        setCasinoOffers([]);
      } else {
        // Transform data to match component format
        const transformedOffers = data.map(offer => ({
          id: offer.id,
          badge: offer.badge,
          badgeClass: offer.badge_class,
          casino: offer.casino_name,
          title: offer.title,
          image: offer.image_url,
          bonusLink: offer.bonus_link,
          minDeposit: offer.min_deposit,
          cashback: offer.cashback,
          bonusValue: offer.bonus_value,
          freeSpins: offer.free_spins,
          depositMethods: offer.deposit_methods,
          vpnFriendly: offer.vpn_friendly,
          isPremium: offer.is_premium,
          details: offer.details
        }));
        
        setCasinoOffers(transformedOffers || []);
      }
    } catch (err) {
      console.error('Error:', err);
      setCasinoOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlip = (id) => {
    setFlippedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (loading) {
    return (
      <div className="offers-page">
        <div className="offers-loading">Loading offers...</div>
      </div>
    );
  }

  if (casinoOffers.length === 0) {
    return (
      <div className="offers-page">
        <div className="offers-container">
          <h1>Casinos & Offers</h1>
          <div className="no-offers" style={{textAlign: 'center', padding: '60px 20px', color: 'white'}}>
            <p>No casino offers available at the moment. Check back soon!</p>
          </div>
        </div>
      </div>
    );
  }

  const offerOfTheMonth = casinoOffers[0]; // First offer is featured
  const regularOffers = casinoOffers.slice(1); // Rest of the offers

  return (
    <div className="offers-page">
      <div className="offers-container">
        <h1>Casinos & Offers</h1>
        <p className="offers-subtitle">Best offers and bonuses exclusive for you</p>
        
        <div className="offers-grid">
          {/* Premium Card */}
          {offerOfTheMonth && (
            <div className={`offer-card-wrapper premium ${flippedCards[offerOfTheMonth.id] ? 'flipped' : ''}`}>
              <div className="offer-card-inner">
                {/* Front of card */}
                <div className="offer-card-front premium-card-box">
                  {offerOfTheMonth.badge && (
                    <div className={`offer-badge ${offerOfTheMonth.badgeClass}`}>{offerOfTheMonth.badge}</div>
                  )}
                  <span />
                  <div className="casino-image-container">
                    <img src={offerOfTheMonth.image} alt={offerOfTheMonth.casino} className="casino-image" />
                    <div className="casino-overlay">
                      <h3 className="casino-name">{offerOfTheMonth.casino}</h3>
                    </div>
                  </div>
                  <p className="offer-title">{offerOfTheMonth.title}</p>
                  <p className="offer-terms">
                    +18 | T&C APPLY | <span className="vpn-indicator" title={offerOfTheMonth.vpnFriendly ? 'VPN Friendly' : 'VPN Not Allowed'}>
                      {offerOfTheMonth.vpnFriendly ? '✅ VPN OK' : '❌ NO VPN'}
                    </span>
                  </p>
                  
                  <div className="offer-stats">
                    {offerOfTheMonth.minDeposit && (
                      <div className="stat">
                        <div className="stat-icon">💳</div>
                        <div className="stat-label">Min. deposit</div>
                        <div className="stat-value">{offerOfTheMonth.minDeposit}</div>
                      </div>
                    )}
                    {offerOfTheMonth.cashback && (
                      <div className="stat">
                        <div className="stat-icon">💰</div>
                        <div className="stat-label">Cashback</div>
                        <div className="stat-value">{offerOfTheMonth.cashback}</div>
                      </div>
                    )}
                    {offerOfTheMonth.bonusValue && (
                      <div className="stat">
                        <div className="stat-icon">🎁</div>
                        <div className="stat-label">Bonus value</div>
                        <div className="stat-value">{offerOfTheMonth.bonusValue}</div>
                      </div>
                    )}
                    {offerOfTheMonth.freeSpins && (
                      <div className="stat">
                        <div className="stat-icon">🎰</div>
                        <div className="stat-label">Free spins</div>
                        <div className="stat-value">{offerOfTheMonth.freeSpins}</div>
                      </div>
                    )}
                  </div>

                  <div className="card-actions">
                    <button className="info-btn" onClick={() => toggleFlip(offerOfTheMonth.id)}>
                      MORE INFO
                    </button>
                    <a 
                      href={offerOfTheMonth.bonusLink || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="claim-btn"
                    >
                      CLAIM BONUS
                    </a>
                  </div>
                </div>

                {/* Back of card */}
                <div className="offer-card-back">
                  <h3 className="casino-name">{offerOfTheMonth.casino}</h3>
                  <div className="offer-details">
                    <h4>Terms & Conditions</h4>
                    <p>{offerOfTheMonth.details}</p>
                    {offerOfTheMonth.depositMethods && (
                      <>
                        <h4 style={{marginTop: '16px'}}>Deposit Methods</h4>
                        <div className="deposit-methods">
                          {getMethodIcons(offerOfTheMonth.depositMethods).map((method, idx) => (
                            <div key={idx} className="deposit-method-item" title={method.name}>
                              <span className="method-icon">{method.icon}</span>
                              <span className="method-label">{method.name}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <button className="back-btn" onClick={() => toggleFlip(offerOfTheMonth.id)}>
                    ← BACK
                  </button>
                </div>
              </div>
            </div>
          )}

          {regularOffers.map(offer => (
            <div key={offer.id} className={`offer-card-wrapper ${flippedCards[offer.id] ? 'flipped' : ''} ${offer.isPremium ? 'premium' : ''}`}>
              <div className="offer-card-inner">
                {/* Front of card */}
                <div className="offer-card-front">
                  {offer.badge && (
                    <div className={`offer-badge ${offer.badgeClass}`}>{offer.badge}</div>
                  )}
                  {offer.isPremium && <div className="premium-shine"></div>}
                  <div className="casino-image-container">
                    <img src={offer.image} alt={offer.casino} className="casino-image" />
                    <div className="casino-overlay">
                      <h3 className="casino-name">{offer.casino}</h3>
                    </div>
                  </div>
                  <p className="offer-title">{offer.title}</p>
                  <p className="offer-terms">
                    +18 | T&C APPLY | <span className="vpn-indicator" title={offer.vpnFriendly ? 'VPN Friendly' : 'VPN Not Allowed'}>
                      {offer.vpnFriendly ? '✅ VPN OK' : '❌ NO VPN'}
                    </span>
                  </p>
                  
                  <div className="offer-stats">
                    {offer.minDeposit && (
                      <div className="stat">
                        <div className="stat-icon">💳</div>
                        <div className="stat-label">Min. deposit</div>
                        <div className="stat-value">{offer.minDeposit}</div>
                      </div>
                    )}
                    {offer.cashback && (
                      <div className="stat">
                        <div className="stat-icon">💰</div>
                        <div className="stat-label">Cashback</div>
                        <div className="stat-value">{offer.cashback}</div>
                      </div>
                    )}
                    {offer.code && (
                      <div className="stat">
                        <div className="stat-icon">🔐</div>
                        <div className="stat-label">Code</div>
                        <div className="stat-value">{offer.code}</div>
                      </div>
                    )}
                    {offer.bonusValue && (
                      <div className="stat">
                        <div className="stat-icon">🎁</div>
                        <div className="stat-label">Bonus value</div>
                        <div className="stat-value">{offer.bonusValue}</div>
                      </div>
                    )}
                    {offer.freeSpins && (
                      <div className="stat">
                        <div className="stat-icon">🎰</div>
                        <div className="stat-label">Free spins</div>
                        <div className="stat-value">{offer.freeSpins}</div>
                      </div>
                    )}
                  </div>

                  <div className="card-actions">
                    <button className="info-btn" onClick={() => toggleFlip(offer.id)}>
                      MORE INFO
                    </button>
                    <a 
                      href={offer.bonusLink || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="claim-btn"
                    >
                      CLAIM BONUS
                    </a>
                  </div>
                </div>

                {/* Back of card */}
                <div className="offer-card-back">
                  <h3 className="casino-name">{offer.casino}</h3>
                  <div className="offer-details">
                    <h4>Terms & Conditions</h4>
                    <p>{offer.details}</p>
                    {offer.depositMethods && (
                      <>
                        <h4 style={{marginTop: '16px'}}>Deposit Methods</h4>
                        <div className="deposit-methods">
                          {getMethodIcons(offer.depositMethods).map((method, idx) => (
                            <div key={idx} className="deposit-method-item" title={method.name}>
                              <span className="method-icon">{method.icon}</span>
                              <span className="method-label">{method.name}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <button className="back-btn" onClick={() => toggleFlip(offer.id)}>
                    ← BACK
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
