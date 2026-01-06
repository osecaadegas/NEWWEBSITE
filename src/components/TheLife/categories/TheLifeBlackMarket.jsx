import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';

export default function TheLifeBlackMarket({ 
  player,
  setPlayer,
  theLifeInventory,
  marketSubTab,
  setMarketSubTab,
  setMessage,
  loadTheLifeInventory,
  showEventMessage,
  initializePlayer,
  isInHospital,
  user
}) {
  const [activeBoats, setActiveBoats] = useState([]);
  const [upcomingBoats, setUpcomingBoats] = useState([]);

  useEffect(() => {
    if (marketSubTab === 'docks') {
      loadBoats();
      const interval = setInterval(loadBoats, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [marketSubTab]);

  const loadBoats = async () => {
    // Get active boats
    const { data: active, error: activeError } = await supabase.rpc('get_active_boats');
    if (activeError) {
      console.error('Error loading active boats:', activeError);
    }
    setActiveBoats(active || []);

    // Get upcoming boats
    const { data: upcoming, error: upcomingError } = await supabase.rpc('get_upcoming_boats');
    if (upcomingError) {
      console.error('Error loading upcoming boats:', upcomingError);
    }
    setUpcomingBoats(upcoming || []);
  };
  const buyHPService = async (cost, hpAmount) => {
    if (player.cash < cost) {
      setMessage({ type: 'error', text: 'Not enough cash!' });
      return;
    }
    
    const { error } = await supabase
      .from('the_life_players')
      .update({
        cash: player.cash - cost,
        hp: Math.min(player.max_hp, player.hp + hpAmount)
      })
      .eq('user_id', user.id);
      
    if (!error) {
      setMessage({ type: 'success', text: `Restored ${hpAmount} HP!` });
      initializePlayer();
    }
  };

  const buyFullRecovery = async () => {
    if (player.cash < 1500) {
      setMessage({ type: 'error', text: 'Not enough cash!' });
      return;
    }
    
    const { error } = await supabase
      .from('the_life_players')
      .update({
        cash: player.cash - 1500,
        hp: player.max_hp
      })
      .eq('user_id', user.id);
      
    if (!error) {
      setMessage({ type: 'success', text: 'Fully restored!' });
      initializePlayer();
    }
  };

  const sellOnStreet = async (inv) => {
    if (isInHospital) {
      setMessage({ type: 'error', text: 'You cannot sell drugs while in hospital!' });
      return;
    }
    
    const streetPrice = Math.floor(inv.quantity * 150);
    const xpReward = Math.floor(inv.quantity * 10);
    const jailRisk = 35;
    const roll = Math.random() * 100;
    const caught = roll < jailRisk;
    
    if (caught) {
      const jailTime = 45;
      const jailUntil = new Date();
      jailUntil.setMinutes(jailUntil.getMinutes() + jailTime);
      
      const { error } = await supabase
        .from('the_life_players')
        .update({
          jail_until: jailUntil.toISOString(),
          hp: Math.max(0, player.hp - 15)
        })
        .eq('user_id', user.id);
      
      if (!error) {
        await supabase
          .from('the_life_player_inventory')
          .delete()
          .eq('id', inv.id);
        
        showEventMessage('jail_street');
        setMessage({ type: 'error', text: `Busted! Cops confiscated your drugs. ${jailTime} min in jail, lost 15 HP!` });
        initializePlayer();
        loadTheLifeInventory();
      }
    } else {
      const { error } = await supabase
        .from('the_life_players')
        .update({ 
          cash: player.cash + streetPrice,
          xp: player.xp + xpReward
        })
        .eq('user_id', user.id);
      
      if (!error) {
        await supabase
          .from('the_life_player_inventory')
          .delete()
          .eq('id', inv.id);
        
        setMessage({ type: 'success', text: `Sold for $${streetPrice.toLocaleString()} and ${xpReward} XP!` });
        initializePlayer();
        loadTheLifeInventory();
      }
    }
  };

  const shipDrugs = async (inv, boat) => {
    if (isInHospital) {
      setMessage({ type: 'error', text: 'You cannot ship items while in hospital!' });
      return;
    }

    // Check if boat is full
    if (boat.current_shipments >= boat.max_shipments) {
      setMessage({ type: 'error', text: 'This boat is at full capacity!' });
      return;
    }
    
    const dockPrice = Math.floor(inv.quantity * 80);
    
    const { error } = await supabase
      .from('the_life_players')
      .update({ 
        cash: player.cash + dockPrice
      })
      .eq('user_id', user.id);
    
    if (!error) {
      // Delete from inventory
      await supabase
        .from('the_life_player_inventory')
        .delete()
        .eq('id', inv.id);

      // Record shipment
      await supabase
        .from('the_life_dock_shipments')
        .insert({
          boat_id: boat.id,
          player_id: player.id,
          item_id: inv.item_id,
          quantity: inv.quantity,
          payout: dockPrice
        });

      // Update boat capacity
      await supabase
        .from('the_life_dock_boats')
        .update({ current_shipments: boat.current_shipments + 1 })
        .eq('id', boat.id);
      
      setMessage({ type: 'success', text: `Shipped ${inv.quantity}x ${inv.item.name} for $${dockPrice.toLocaleString()}! Safe delivery confirmed.` });
      initializePlayer();
      loadTheLifeInventory();
      loadBoats();
    }
  };

  const today = new Date().toDateString();
  const lastDockUse = player?.last_dock_date ? new Date(player.last_dock_date).toDateString() : null;
  const usesToday = (lastDockUse === today) ? (player?.dock_uses_today || 0) : 0;
  const streetItems = theLifeInventory.filter(inv => inv.item.sellable_on_streets);

  return (
    <div className="market-section">
      <div className="market-sub-tabs">
        <button 
          className={`market-sub-tab ${marketSubTab === 'resell' ? 'active' : ''}`}
          onClick={() => setMarketSubTab('resell')}
        >
          <img src="/thelife/subcategories/Streets.png" alt="Street Resell" className="tab-image" />
        </button>
        <button 
          className={`market-sub-tab ${marketSubTab === 'store' ? 'active' : ''}`}
          onClick={() => setMarketSubTab('store')}
        >
          <img src="/thelife/subcategories/Monhe.png" alt="Monhe Store" className="tab-image" />
        </button>
        <button 
          className={`market-sub-tab ${marketSubTab === 'docks' ? 'active' : ''}`}
          onClick={() => setMarketSubTab('docks')}
        >
          <img src="/thelife/subcategories/Docks.png" alt="Docks" className="tab-image" />
        </button>
      </div>

      {marketSubTab === 'resell' && (
        <div className="market-content">
          <p className="market-warning">⚠️ High risk! Sell drugs one by one for maximum profit, but risk jail time</p>
          {streetItems.length === 0 ? (
            <p className="no-items">You have no items to sell on the streets</p>
          ) : (
            <div className="market-items-grid">
              {streetItems.map(inv => {
                const streetPrice = Math.floor(inv.quantity * 150);
                const xpReward = Math.floor(inv.quantity * 10);
                const jailRisk = 35;
                
                return (
                  <div key={inv.id} className="market-item resell-item">
                    <img src={inv.item.icon} alt={inv.item.name} className="item-image" />
                    <h4>{inv.item.name}</h4>
                    <p>Quantity: {inv.quantity}</p>
                    <div className="resell-stats">
                      <div className="stat">💵 ${streetPrice.toLocaleString()}</div>
                      <div className="stat">⭐ +{xpReward} XP</div>
                      <div className="stat risk">⚠️ {jailRisk}% Jail Risk</div>
                    </div>
                    <button 
                      className="market-sell-btn resell-btn"
                      onClick={() => sellOnStreet(inv)}
                    >
                      Sell on Streets
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {marketSubTab === 'store' && (
        <div className="market-content">
          <p>Buy items to restore HP and stay in the game</p>
          <div className="market-items-grid">
            <div className="market-item">
              <div className="item-icon">💊</div>
              <h4>Small Med Kit</h4>
              <p>Restores 25 HP</p>
              <div className="item-price">$500</div>
              <button 
                className="market-buy-btn"
                onClick={() => buyHPService(500, 25)}
                disabled={player.cash < 500}
              >
                Buy
              </button>
            </div>

            <div className="market-item">
              <div className="item-icon">💉</div>
              <h4>Large Med Kit</h4>
              <p>Restores 50 HP</p>
              <div className="item-price">$900</div>
              <button 
                className="market-buy-btn"
                onClick={() => buyHPService(900, 50)}
                disabled={player.cash < 900}
              >
                Buy
              </button>
            </div>

            <div className="market-item">
              <div className="item-icon">🧪</div>
              <h4>Full Recovery</h4>
              <p>Restores to MAX HP</p>
              <div className="item-price">$1,500</div>
              <button 
                className="market-buy-btn"
                onClick={buyFullRecovery}
                disabled={player.cash < 1500}
              >
                Buy
              </button>
            </div>
          </div>
        </div>
      )}

      {marketSubTab === 'docks' && (
        <div className="market-content">
          <h3>⚓ Dock Schedule</h3>
          
          {/* Active Boats */}
          {activeBoats.length > 0 && (
            <div className="docks-section">
              <h4 style={{color: '#22c55e', marginBottom: '15px'}}>🟢 Boats Currently At Dock</h4>
              {activeBoats.map(boat => {
                const myItems = theLifeInventory.filter(inv => inv.item_id === boat.item_id);
                const timeRemaining = Math.floor(boat.time_remaining_minutes);
                
                return (
                  <div key={boat.id} className="dock-boat-card active">
                    {boat.image_url && (
                      <div className="boat-image">
                        <img src={boat.image_url} alt={boat.name} />
                      </div>
                    )}
                    <div className="boat-info">
                      <h4>{boat.name}</h4>
                      <div className="boat-item-info">
                        <img src={boat.item_icon} alt={boat.item_name} style={{width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px'}} />
                        <span>Accepting: {boat.item_name}</span>
                      </div>
                      <div className="boat-timer">
                        ⏱️ Departing in {timeRemaining} minutes
                      </div>
                      <div className="boat-capacity">
                        Capacity: {boat.current_shipments}/{boat.max_shipments}
                      </div>
                    </div>

                    {myItems.length > 0 ? (
                      <div className="boat-items-grid">
                        {myItems.map(inv => {
                          const dockPrice = Math.floor(inv.quantity * 80);
                          const isFull = boat.current_shipments >= boat.max_shipments;
                          
                          return (
                            <div key={inv.id} className="market-item dock-item">
                              <img src={inv.item.icon} alt={inv.item.name} className="item-image" />
                              <h4>{inv.item.name}</h4>
                              <p>Quantity: {inv.quantity}</p>
                              <div className="dock-stats">
                                <div className="stat">💵 ${dockPrice.toLocaleString()}</div>
                                <div className="stat safe">✅ 0% Risk</div>
                              </div>
                              <button 
                                className="market-sell-btn dock-btn"
                                onClick={() => shipDrugs(inv, boat)}
                                disabled={isFull}
                              >
                                {isFull ? 'Boat Full' : 'Ship Cargo'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="no-items">You have no {boat.item_name} to ship</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Upcoming Boats */}
          {upcomingBoats.length > 0 && (
            <div className="docks-section">
              <h4 style={{color: '#fbbf24', marginTop: '30px', marginBottom: '15px'}}>🟡 Upcoming Boats</h4>
              <div className="upcoming-boats-list">
                {upcomingBoats.map(boat => {
                  const hoursUntil = Math.floor(boat.hours_until_arrival);
                  const minutesUntil = Math.floor((boat.hours_until_arrival - hoursUntil) * 60);
                  
                  return (
                    <div key={boat.id} className="upcoming-boat">
                      {boat.image_url && (
                        <img src={boat.image_url} alt={boat.name} style={{width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px'}} />
                      )}
                      <div className="upcoming-info">
                        <strong>{boat.name}</strong>
                        <span>Accepting: {boat.item_name}</span>
                      </div>
                      <div className="upcoming-time">
                        Arrives in {hoursUntil}h {minutesUntil}m
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeBoats.length === 0 && upcomingBoats.length === 0 && (
            <p className="no-items">No boats scheduled. Check back later!</p>
          )}
        </div>
      )}
    </div>
  );
}
