import { supabase } from '../../../config/supabaseClient';
import { useState, useEffect } from 'react';

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
  const [storeItems, setStoreItems] = useState([]);
  const [storeCategory, setStoreCategory] = useState('all');
  const [loadingStore, setLoadingStore] = useState(false);

  // Load store items
  useEffect(() => {
    if (marketSubTab === 'store') {
      loadStoreItems();
    }
  }, [marketSubTab, storeCategory]);

  const loadStoreItems = async () => {
    setLoadingStore(true);
    try {
      let query = supabase
        .from('the_life_store_items')
        .select(`
          *,
          item:the_life_items(*)
        `)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      // Filter by category if not 'all'
      if (storeCategory !== 'all') {
        query = query.eq('category', storeCategory);
      }

      // Filter out expired limited time items
      const now = new Date().toISOString();
      query = query.or(`limited_time_until.is.null,limited_time_until.gte.${now}`);

      const { data, error } = await query;

      if (error) throw error;
      setStoreItems(data || []);
    } catch (err) {
      console.error('Error loading store items:', err);
    } finally {
      setLoadingStore(false);
    }
  };

  const buyStoreItem = async (storeItem) => {
    if (player.cash < storeItem.price) {
      setMessage({ type: 'error', text: 'Not enough cash!' });
      return;
    }

    // Check stock
    if (storeItem.stock_quantity !== null && storeItem.stock_quantity <= 0) {
      setMessage({ type: 'error', text: 'Out of stock!' });
      return;
    }

    try {
      // Update player cash
      const { error: playerError } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - storeItem.price })
        .eq('user_id', user.id);

      if (playerError) throw playerError;

      // Add item to inventory
      const { data: playerData } = await supabase
        .from('the_life_players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (playerData) {
        // Check if item exists in inventory
        const { data: existing } = await supabase
          .from('the_life_player_inventory')
          .select('*')
          .eq('player_id', playerData.id)
          .eq('item_id', storeItem.item_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('the_life_player_inventory')
            .update({ quantity: existing.quantity + 1 })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('the_life_player_inventory')
            .insert({
              player_id: playerData.id,
              item_id: storeItem.item_id,
              quantity: 1
            });
        }
      }

      // Update stock if limited
      if (storeItem.stock_quantity !== null) {
        await supabase
          .from('the_life_store_items')
          .update({ stock_quantity: storeItem.stock_quantity - 1 })
          .eq('id', storeItem.id);
      }

      setMessage({ type: 'success', text: `Purchased ${storeItem.item.name}!` });
      initializePlayer();
      loadTheLifeInventory();
      loadStoreItems();
    } catch (err) {
      console.error('Error buying item:', err);
      setMessage({ type: 'error', text: 'Failed to purchase item' });
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
          <div className="store-category-filters">
            <button 
              className={`category-filter-btn ${storeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setStoreCategory('all')}
            >
              All
            </button>
            <button 
              className={`category-filter-btn ${storeCategory === 'weapons' ? 'active' : ''}`}
              onClick={() => setStoreCategory('weapons')}
            >
              ⚔️ Weapons
            </button>
            <button 
              className={`category-filter-btn ${storeCategory === 'gear' ? 'active' : ''}`}
              onClick={() => setStoreCategory('gear')}
            >
              🛡️ Gear
            </button>
            <button 
              className={`category-filter-btn ${storeCategory === 'healing' ? 'active' : ''}`}
              onClick={() => setStoreCategory('healing')}
            >
              💊 Healing
            </button>
            <button 
              className={`category-filter-btn ${storeCategory === 'valuable' ? 'active' : ''}`}
              onClick={() => setStoreCategory('valuable')}
            >
              💎 Valuable
            </button>
            <button 
              className={`category-filter-btn ${storeCategory === 'limited_time' ? 'active' : ''}`}
              onClick={() => setStoreCategory('limited_time')}
            >
              ⏰ Limited Time
            </button>
          </div>

          {loadingStore ? (
            <div className="loading">Loading store...</div>
          ) : storeItems.length === 0 ? (
            <p className="no-items">No items available in this category</p>
          ) : (
            <div className="market-items-grid">
              {storeItems.map(storeItem => (
                <div key={storeItem.id} className="market-item">
                  <img src={storeItem.item.icon} alt={storeItem.item.name} className="item-image" />
                  <h4>{storeItem.item.name}</h4>
                  <p>{storeItem.item.description || 'No description'}</p>
                  {storeItem.stock_quantity !== null && (
                    <div className="stock-info">
                      Stock: {storeItem.stock_quantity}
                    </div>
                  )}
                  {storeItem.limited_time_until && (
                    <div className="limited-time-badge">
                      ⏰ Limited Time
                    </div>
                  )}
                  <div className="item-price">${storeItem.price.toLocaleString()}</div>
                  <button 
                    className="market-buy-btn"
                    onClick={() => buyStoreItem(storeItem)}
                    disabled={player.cash < storeItem.price || (storeItem.stock_quantity !== null && storeItem.stock_quantity <= 0)}
                  >
                    {storeItem.stock_quantity !== null && storeItem.stock_quantity <= 0 ? 'Out of Stock' : 'Buy'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
