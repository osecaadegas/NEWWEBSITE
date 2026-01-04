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

  const shipDrugs = async (inv) => {
    if (isInHospital) {
      setMessage({ type: 'error', text: 'You cannot ship drugs while in hospital!' });
      return;
    }
    
    const today = new Date().toDateString();
    const lastDockUse = player?.last_dock_date ? new Date(player.last_dock_date).toDateString() : null;
    const usesToday = (lastDockUse === today) ? (player?.dock_uses_today || 0) : 0;
    const newUsesToday = (lastDockUse === today ? usesToday : 0) + 1;
    const dockPrice = Math.floor(inv.quantity * 80);
    
    const { error } = await supabase
      .from('the_life_players')
      .update({ 
        cash: player.cash + dockPrice,
        dock_uses_today: newUsesToday,
        last_dock_date: new Date().toISOString()
      })
      .eq('user_id', user.id);
    
    if (!error) {
      await supabase
        .from('the_life_player_inventory')
        .delete()
        .eq('id', inv.id);
      
      setMessage({ type: 'success', text: `Shipped for $${dockPrice.toLocaleString()}! Safe delivery confirmed.` });
      initializePlayer();
      loadTheLifeInventory();
    }
  };

  const today = new Date().toDateString();
  const lastDockUse = player?.last_dock_date ? new Date(player.last_dock_date).toDateString() : null;
  const usesToday = (lastDockUse === today) ? (player?.dock_uses_today || 0) : 0;
  const usesRemaining = 2 - usesToday;
  const drugItems = theLifeInventory.filter(inv => inv.item.type === 'drug');

  return (
    <div className="market-section">
      <h2>🛒 Black Market</h2>
      <p>Illegal operations, supplies, and drug trafficking</p>
      
      <div className="market-sub-tabs">
        <button 
          className={`market-sub-tab ${marketSubTab === 'resell' ? 'active' : ''}`}
          onClick={() => setMarketSubTab('resell')}
        >
          🚶 Street Resell
        </button>
        <button 
          className={`market-sub-tab ${marketSubTab === 'store' ? 'active' : ''}`}
          onClick={() => setMarketSubTab('store')}
        >
          🏪 Monhe Store
        </button>
        <button 
          className={`market-sub-tab ${marketSubTab === 'docks' ? 'active' : ''}`}
          onClick={() => setMarketSubTab('docks')}
        >
          🚢 Docks
        </button>
      </div>

      {marketSubTab === 'resell' && (
        <div className="market-content">
          <h3>🚶 Street Resell</h3>
          <p className="market-warning">⚠️ High risk! Sell drugs one by one for maximum profit, but risk jail time</p>
          {drugItems.length === 0 ? (
            <p className="no-items">You have no drugs to sell on the streets</p>
          ) : (
            <div className="market-items-grid">
              {drugItems.map(inv => {
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
          <h3>🏪 Monhe Store</h3>
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
          <h3>🚢 The Docks</h3>
          <p>Ship drugs in bulk - 0 risk, cheaper prices, 2 shipments per day</p>
          <div className="dock-info">
            <span className="dock-uses">📦 Shipments Today: {usesToday}/2</span>
            <span className="dock-remaining">Remaining: {usesRemaining}</span>
          </div>
          {drugItems.length === 0 ? (
            <p className="no-items">You have no drugs to ship</p>
          ) : usesRemaining <= 0 ? (
            <p className="no-items">No more shipments available today. Come back tomorrow!</p>
          ) : (
            <div className="market-items-grid">
              {drugItems.map(inv => {
                const dockPrice = Math.floor(inv.quantity * 80);
                
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
                      onClick={() => shipDrugs(inv)}
                    >
                      Ship Cargo
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
