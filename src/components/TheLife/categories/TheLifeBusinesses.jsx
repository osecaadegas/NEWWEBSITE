import { supabase } from '../../../config/supabaseClient';
import { getMaxBusinessSlots, getUpgradeCost } from '../utils/gameUtils';
import { useRef } from 'react';

/**
 * Businesses Category Component
 * Handles business purchase, operations, upgrades, and sales
 */
export default function TheLifeBusinesses({ 
  player,
  setPlayer,
  businesses,
  ownedBusinesses,
  drugOps,
  setDrugOps,
  setMessage,
  loadOwnedBusinesses,
  loadDrugOps,
  isInHospital,
  user
}) {
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  const buyBusiness = async (business) => {
    if (isInHospital) {
      setMessage({ type: 'error', text: 'You cannot buy businesses while in hospital!' });
      return;
    }
    
    if (player.cash < business.purchase_price) {
      setMessage({ type: 'error', text: `Need $${business.purchase_price.toLocaleString()} to buy ${business.name}!` });
      return;
    }

    if (player.level < business.min_level_required) {
      setMessage({ type: 'error', text: `Need level ${business.min_level_required} to buy ${business.name}!` });
      return;
    }

    const maxSlots = getMaxBusinessSlots(player.level);
    if (ownedBusinesses.length >= maxSlots) {
      setMessage({ 
        type: 'error', 
        text: `Business limit reached! You can own ${maxSlots} businesses. Level up for more slots (max 7).` 
      });
      return;
    }

    try {
      await supabase
        .from('the_life_player_businesses')
        .insert({
          player_id: player.id,
          business_id: business.id
        });

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - business.purchase_price })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      loadOwnedBusinesses();
      loadDrugOps();
      setMessage({ type: 'success', text: `Purchased ${business.name}!` });
    } catch (err) {
      console.error('Error buying business:', err);
      setMessage({ type: 'error', text: 'Failed to buy business!' });
    }
  };

  const startBusiness = async (business) => {
    const ownsIt = ownedBusinesses.some(ob => ob.business_id === business.id);
    if (!ownsIt) {
      setMessage({ type: 'error', text: 'You need to buy this business first!' });
      return;
    }

    const productionCost = business.production_cost || business.cost;
    if (player.cash < productionCost) {
      setMessage({ type: 'error', text: 'Not enough cash!' });
      return;
    }

    const requiredTickets = business.ticket_cost || 5;
    if (player.tickets < requiredTickets) {
      setMessage({ type: 'error', text: `Need ${requiredTickets} tickets to start production!` });
      return;
    }

    try {
      const completedAt = new Date(Date.now() + business.duration_minutes * 60 * 1000);
      
      const { data: playerData, error: playerError } = await supabase
        .from('the_life_players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (playerError) throw playerError;

      const { error: prodError } = await supabase
        .from('the_life_business_productions')
        .upsert({
          player_id: playerData.id,
          business_id: business.id,
          reward_item_id: business.reward_item_id,
          reward_item_quantity: business.reward_item_quantity,
          completed_at: completedAt.toISOString(),
          collected: false
        }, {
          onConflict: 'player_id,business_id'
        });

      if (prodError) throw prodError;

      const opData = {
        [business.id]: true,
        [`${business.id}_completed_at`]: completedAt.toISOString(),
        [`${business.id}_reward_item_id`]: business.reward_item_id,
        [`${business.id}_reward_item_quantity`]: business.reward_item_quantity
      };

      setDrugOps(prev => ({ ...prev, ...opData }));

      const { data: updatedPlayer, error: costError } = await supabase
        .from('the_life_players')
        .update({ 
          cash: player.cash - productionCost,
          tickets: player.tickets - requiredTickets
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (costError) throw costError;
      setPlayer(updatedPlayer);
      setMessage({ type: 'success', text: `Started ${business.name}! Wait ${business.duration_minutes} minutes. (-${requiredTickets} tickets)` });
    } catch (err) {
      console.error('Error running business:', err);
      setMessage({ type: 'error', text: `Error: ${err.message}` });
    }
  };

  const collectBusiness = async (business) => {
    try {
      const { data: playerData } = await supabase
        .from('the_life_players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!playerData) return;

      const ownedBusiness = ownedBusinesses.find(ob => ob.business_id === business.id);
      const upgradeLevel = ownedBusiness?.upgrade_level || 1;

      const rewardItemId = drugOps[`${business.id}_reward_item_id`];
      const baseRewardQuantity = drugOps[`${business.id}_reward_item_quantity`];

      const quantityMultiplier = 1 + ((upgradeLevel - 1) * 0.5);
      const rewardQuantity = Math.floor(baseRewardQuantity * quantityMultiplier);

      const cashMultiplier = 1 + ((upgradeLevel - 1) * 0.3);

      if (business.reward_type === 'items' && rewardItemId && rewardQuantity) {
        const { data: existing, error: checkError } = await supabase
          .from('the_life_player_inventory')
          .select('*')
          .eq('player_id', playerData.id)
          .eq('item_id', rewardItemId)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (existing) {
          const { error: updateError } = await supabase
            .from('the_life_player_inventory')
            .update({ quantity: existing.quantity + rewardQuantity })
            .eq('id', existing.id);
          
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('the_life_player_inventory')
            .insert({
              player_id: playerData.id,
              item_id: rewardItemId,
              quantity: rewardQuantity
            });
          
          if (insertError) throw insertError;
        }

        setMessage({ 
          type: 'success', 
          text: `Collected ${rewardQuantity}x items! ${upgradeLevel > 1 ? `(Lvl ${upgradeLevel} bonus!)` : ''}` 
        });
      } else {
        const baseCashProfit = business.profit || 0;
        const cashProfit = Math.floor(baseCashProfit * cashMultiplier);
        
        const { data: updatedPlayer, error: cashError } = await supabase
          .from('the_life_players')
          .update({ cash: player.cash + cashProfit })
          .eq('user_id', user.id)
          .select()
          .single();

        if (cashError) throw cashError;
        setPlayer(updatedPlayer);
        setMessage({ 
          type: 'success', 
          text: `Collected $${cashProfit.toLocaleString()}! ${upgradeLevel > 1 ? `(Lvl ${upgradeLevel} bonus!)` : ''}` 
        });
      }

      const { error: collectError } = await supabase
        .from('the_life_business_productions')
        .update({ collected: true })
        .eq('player_id', playerData.id)
        .eq('business_id', business.id)
        .eq('collected', false);

      if (collectError) throw collectError;

      setDrugOps(prev => {
        const newOps = { ...prev };
        delete newOps[business.id];
        delete newOps[`${business.id}_completed_at`];
        delete newOps[`${business.id}_reward_item_id`];
        delete newOps[`${business.id}_reward_item_quantity`];
        return newOps;
      });
    } catch (err) {
      console.error('Error collecting business:', err);
      setMessage({ type: 'error', text: 'Failed to collect!' });
    }
  };

  const upgradeBusiness = async (business) => {
    const ownedBusiness = ownedBusinesses.find(ob => ob.business_id === business.id);
    if (!ownedBusiness) {
      setMessage({ type: 'error', text: 'You need to own this business first!' });
      return;
    }

    const currentLevel = ownedBusiness.upgrade_level || 1;
    if (currentLevel >= 10) {
      setMessage({ type: 'error', text: 'Business is already at max level!' });
      return;
    }

    const upgradeCost = getUpgradeCost(business, currentLevel);
    if (player.cash < upgradeCost) {
      setMessage({ type: 'error', text: `Need $${upgradeCost.toLocaleString()} to upgrade!` });
      return;
    }

    try {
      const { error: upgradeError } = await supabase
        .from('the_life_player_businesses')
        .update({ upgrade_level: currentLevel + 1 })
        .eq('id', ownedBusiness.id);

      if (upgradeError) throw upgradeError;

      const { data, error: cashError } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - upgradeCost })
        .eq('user_id', user.id)
        .select()
        .single();

      if (cashError) throw cashError;
      setPlayer(data);
      setMessage({ 
        type: 'success', 
        text: `${business.name} upgraded to level ${currentLevel + 1}!` 
      });
      loadOwnedBusinesses();
    } catch (err) {
      console.error('Error upgrading business:', err);
      setMessage({ type: 'error', text: `Failed to upgrade: ${err.message}` });
    }
  };

  const sellBusiness = async (business) => {
    const sellPrice = Math.floor((business.purchase_price || 5000) / 3);
    if (!window.confirm(`Sell ${business.name} for $${sellPrice.toLocaleString()}?`)) {
      return;
    }

    const ownedBusiness = ownedBusinesses.find(ob => ob.business_id === business.id);
    if (!ownedBusiness) return;

    try {
      const { error } = await supabase
        .from('the_life_player_businesses')
        .delete()
        .eq('id', ownedBusiness.id);
      
      if (error) throw error;

      const { data, error: cashError } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash + sellPrice })
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (cashError) throw cashError;
      setPlayer(data);
      setMessage({ type: 'success', text: `Sold ${business.name} for $${sellPrice.toLocaleString()}!` });
      loadOwnedBusinesses();
      loadDrugOps();
    } catch (err) {
      console.error('Error selling business:', err);
      setMessage({ type: 'error', text: 'Failed to sell business!' });
    }
  };

  return (
    <div className="businesses-section">
      <h2>💼 Business Operations</h2>
      <p>Start businesses and earn items. Higher levels unlock more profitable ventures.</p>
      <div className="business-slots-info">
        <span className="slots-label">Business Slots:</span>
        <span className="slots-count">{ownedBusinesses.length} / {getMaxBusinessSlots(player?.level || 1)}</span>
        {getMaxBusinessSlots(player?.level || 1) < 7 && (
          <span className="slots-hint">💡 Gain 1 slot every 5 levels (max 7)</span>
        )}
      </div>
      <div className="businesses-scroll-container">
        <button 
          className="scroll-arrow scroll-arrow-left" 
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          ←
        </button>
        <div className="businesses-grid" ref={scrollContainerRef}>
        {businesses.filter(b => b.is_active).map(business => {
          const imageUrl = business.image_url || 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400';
          const isRunning = drugOps?.[business.id];
          const completedAt = drugOps?.[`${business.id}_completed_at`];
          const isReady = completedAt && new Date(completedAt) <= new Date();
          const meetsLevel = player.level >= business.min_level_required;
          const ownsIt = ownedBusinesses.some(ob => ob.business_id === business.id);
          const productionCost = business.production_cost || business.cost;
          
          return (
            <div key={business.id} className="business-card">
              <div className="business-image-container">
                <img src={imageUrl} alt={business.name} className="business-image" />
                {ownsIt && <div className="hired-badge">OWNED</div>}
                <div className="business-header-overlay">
                  <h3>{business.item?.icon || '💼'} {business.name}</h3>
                  {!ownsIt && <span className="level-tag">🔒 {business.min_level_required}</span>}
                </div>
                <button 
                  className="info-tooltip-btn"
                  title={!ownsIt ? 
                    `Purchase: $${(business.purchase_price || 5000).toLocaleString()}\n${business.description}` :
                    `Cost: $${productionCost.toLocaleString()} + 5 tickets\nTime: ${business.duration_minutes}m\n${business.reward_item_id ? `Reward: Items` : `Profit: $${(business.profit || 0).toLocaleString()}`}`
                  }
                >
                  ℹ️
                </button>
              </div>
              {!ownsIt ? (
                <div className="business-compact-actions">
                  {meetsLevel ? (
                    <button 
                      onClick={() => buyBusiness(business)} 
                      disabled={player?.cash < (business.purchase_price || 5000)}
                      className="compact-btn buy-btn"
                    >
                      {player?.cash >= (business.purchase_price || 5000) ? 
                        `💵 Buy $${(business.purchase_price || 5000).toLocaleString()}` : 
                        '🚫 No Cash'
                      }
                    </button>
                  ) : (
                    <div className="locked-compact">🔒 Lvl {business.min_level_required}</div>
                  )}
                </div>
              ) : (
                <>
                  {(() => {
                    const ownedBusiness = ownedBusinesses.find(ob => ob.business_id === business.id);
                    const upgradeLevel = ownedBusiness?.upgrade_level || 1;
                    const upgradeCost = getUpgradeCost(business, upgradeLevel);
                    
                    return (
                      <div className="business-compact-actions">
                        {meetsLevel ? (
                          <>
                            {isRunning ? (
                              <>
                                {isReady ? (
                                  <button 
                                    onClick={() => collectBusiness(business)} 
                                    className="compact-btn collect-btn"
                                  >
                                    ✅ Collect
                                  </button>
                                ) : (
                                  <div className="timer-compact">
                                    ⏱️ {Math.ceil((new Date(completedAt) - new Date()) / 60000)}m
                                  </div>
                                )}
                              </>
                            ) : (
                              <button 
                                onClick={() => startBusiness(business)} 
                                disabled={player?.cash < productionCost || player?.tickets < 5}
                                className="compact-btn start-btn"
                              >
                                ▶️ Start
                              </button>
                            )}
                            <div className="compact-actions-row">
                              {upgradeLevel < 10 && (
                                <button 
                                  onClick={() => upgradeBusiness(business)}
                                  disabled={player?.cash < upgradeCost}
                                  className="compact-btn-small upgrade-btn"
                                  title={`Upgrade to Lvl ${upgradeLevel + 1}: $${upgradeCost.toLocaleString()}`}
                                >
                                  ⬆️ {upgradeLevel}
                                </button>
                              )}
                              <button 
                                onClick={() => sellBusiness(business)}
                                className="compact-btn-small sell-btn"
                                title={`Sell: $${Math.floor((business.purchase_price || 5000) / 3).toLocaleString()}`}
                              >
                                💰
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="locked-compact">🔒 Lvl {business.min_level_required}</div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          );
        })}
        </div>
        <button 
          className="scroll-arrow scroll-arrow-right" 
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          →
        </button>
      </div>
    </div>
  );
}
