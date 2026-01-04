import { useState } from 'react';
import { supabase } from '../../../config/supabaseClient';

/**
 * Brothel Category Component
 * Handles brothel management, worker hiring/selling, income collection
 * Includes worker carousel showing 5 cards at a time
 */
export default function TheLifeBrothel({ 
  player,
  setPlayer,
  brothel,
  setBrothel,
  availableWorkers,
  hiredWorkers,
  showHiredWorkers,
  setShowHiredWorkers,
  setMessage,
  loadBrothel,
  loadHiredWorkers,
  isInHospital,
  user
}) {
  // Carousel state for available workers
  const [workerScrollIndex, setWorkerScrollIndex] = useState(0);
  const workersPerPage = 5;

  // Carousel state for hired workers
  const [hiredScrollIndex, setHiredScrollIndex] = useState(0);
  const hiredPerPage = 5;

  const scrollWorkers = (direction) => {
    const newIndex = workerScrollIndex + direction;
    if (newIndex >= 0 && newIndex <= availableWorkers.length - workersPerPage) {
      setWorkerScrollIndex(newIndex);
    }
  };

  const scrollHired = (direction) => {
    const newIndex = hiredScrollIndex + direction;
    if (newIndex >= 0 && newIndex <= hiredWorkers.length - hiredPerPage) {
      setHiredScrollIndex(newIndex);
    }
  };

  const initBrothel = async () => {
    if (isInHospital) {
      setMessage({ type: 'error', text: 'You cannot manage your brothel while in hospital!' });
      return;
    }
    
    const cost = 5000;
    
    if (player.cash < cost) {
      setMessage({ type: 'error', text: 'Need $5,000 to start a brothel!' });
      return;
    }

    try {
      const initialSlots = player.level + 2;

      await supabase.from('the_life_brothels').insert({
        player_id: player.id,
        workers: 0,
        income_per_hour: 0,
        worker_slots: initialSlots,
        additional_slots: 0,
        slots_upgrade_cost: 50000
      });

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - cost })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      loadBrothel();
      setMessage({ type: 'success', text: 'Brothel opened!' });
    } catch (err) {
      console.error('Error initializing brothel:', err);
    }
  };

  const hireWorker = async (worker) => {
    if (!brothel) {
      setMessage({ type: 'error', text: 'You need to open a brothel first!' });
      return;
    }

    const totalSlots = (brothel.worker_slots || 3) + (brothel.additional_slots || 0);
    const usedSlots = brothel.workers || 0;

    if (usedSlots >= totalSlots) {
      setMessage({ type: 'error', text: `No worker slots available! (${usedSlots}/${totalSlots} used)` });
      return;
    }

    if (player.cash < worker.hire_cost) {
      setMessage({ type: 'error', text: `Need $${worker.hire_cost.toLocaleString()} to hire ${worker.name}!` });
      return;
    }

    if (player.level < worker.min_level_required) {
      setMessage({ type: 'error', text: `Need level ${worker.min_level_required} to hire ${worker.name}!` });
      return;
    }

    try {
      await supabase
        .from('the_life_player_brothel_workers')
        .insert({
          player_id: player.id,
          worker_id: worker.id
        });

      const newTotalIncome = (brothel.income_per_hour || 0) + worker.income_per_hour;
      const newWorkerCount = (brothel.workers || 0) + 1;

      await supabase
        .from('the_life_brothels')
        .update({
          workers: newWorkerCount,
          income_per_hour: newTotalIncome
        })
        .eq('id', brothel.id);

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - worker.hire_cost })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      loadBrothel();
      loadHiredWorkers();
      setMessage({ type: 'success', text: `${worker.name} hired successfully!` });
    } catch (err) {
      console.error('Error hiring worker:', err);
      setMessage({ type: 'error', text: 'Failed to hire worker!' });
    }
  };

  const sellWorker = async (hiredWorker) => {
    if (!window.confirm(`Sell ${hiredWorker.worker.name} for $${Math.floor(hiredWorker.worker.hire_cost / 3).toLocaleString()}?`)) {
      return;
    }

    try {
      await supabase
        .from('the_life_player_brothel_workers')
        .delete()
        .eq('id', hiredWorker.id);

      const newTotalIncome = (brothel.income_per_hour || 0) - hiredWorker.worker.income_per_hour;
      const newWorkerCount = (brothel.workers || 0) - 1;

      await supabase
        .from('the_life_brothels')
        .update({
          workers: Math.max(0, newWorkerCount),
          income_per_hour: Math.max(0, newTotalIncome)
        })
        .eq('id', brothel.id);

      const sellPrice = Math.floor(hiredWorker.worker.hire_cost / 3);
      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash + sellPrice })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      loadBrothel();
      loadHiredWorkers();
      setMessage({ type: 'success', text: `Sold ${hiredWorker.worker.name} for $${sellPrice.toLocaleString()}!` });
    } catch (err) {
      console.error('Error selling worker:', err);
      setMessage({ type: 'error', text: 'Failed to sell worker!' });
    }
  };

  const collectBrothelIncome = async () => {
    if (!brothel || !brothel.income_per_hour) {
      setMessage({ type: 'error', text: 'Hire some workers first!' });
      return;
    }

    const lastCollection = new Date(brothel.last_collection);
    const now = new Date();
    const hoursPassed = (now - lastCollection) / 1000 / 60 / 60;
    const income = Math.floor(hoursPassed * brothel.income_per_hour);

    if (income <= 0) {
      setMessage({ type: 'error', text: 'No income to collect yet!' });
      return;
    }

    try {
      await supabase
        .from('the_life_brothels')
        .update({
          last_collection: now.toISOString(),
          total_earned: (brothel.total_earned || 0) + income
        })
        .eq('id', brothel.id);

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash + income })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      loadBrothel();
      setMessage({ type: 'success', text: `Collected $${income.toLocaleString()}!` });
    } catch (err) {
      console.error('Error collecting income:', err);
    }
  };

  const upgradeBrothelSlots = async () => {
    if (!brothel) {
      setMessage({ type: 'error', text: 'You need to open a brothel first!' });
      return;
    }

    if (player.level < 5) {
      setMessage({ type: 'error', text: 'Need level 5 to upgrade worker slots!' });
      return;
    }

    const currentTotalSlots = (brothel.worker_slots || 3) + (brothel.additional_slots || 0);
    if (currentTotalSlots >= 50) {
      setMessage({ type: 'error', text: 'Maximum 50 worker slots reached!' });
      return;
    }

    const upgradeCost = brothel.slots_upgrade_cost || 50000;

    if (player.cash < upgradeCost) {
      setMessage({ type: 'error', text: `Need $${upgradeCost.toLocaleString()} to upgrade slots!` });
      return;
    }

    try {
      const newAdditionalSlots = (brothel.additional_slots || 0) + 2;
      const newUpgradeCost = upgradeCost * 2;

      await supabase
        .from('the_life_brothels')
        .update({
          additional_slots: newAdditionalSlots,
          slots_upgrade_cost: newUpgradeCost
        })
        .eq('id', brothel.id);

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - upgradeCost })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      loadBrothel();
      setMessage({ type: 'success', text: `Brothel upgraded! +2 worker slots` });
    } catch (err) {
      console.error('Error upgrading brothel:', err);
      setMessage({ type: 'error', text: 'Failed to upgrade brothel!' });
    }
  };

  if (!brothel) {
    return (
      <div className="brothel-section">
        <div className="brothel-init">
          <img src="https://imagens.publico.pt/imagens.aspx/1352137?tp=UH&db=IMAGENS&type=JPG" alt="Start Brothel" className="brothel-init-image" />
          <h3>Start Your Brothel Empire</h3>
          <p>Initial investment: $5,000</p>
          <p>Hire unique workers with different income rates and rarities</p>
          <button onClick={initBrothel} disabled={player?.cash < 5000}>
            Open Brothel ($5,000)
          </button>
        </div>
      </div>
    );
  }

  const totalSlots = (brothel.worker_slots || 3) + (brothel.additional_slots || 0);
  const usedSlots = brothel.workers || 0;
  const slotsFull = usedSlots >= totalSlots;

  return (
    <div className="brothel-section">
      <div className="brothel-active">
        <div className="brothel-header">
          <img src="https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2e/9d/5f/90/caption.jpg" alt="Brothel" className="brothel-banner" />
          <div className="brothel-stats-overlay">
            <div className="brothel-stat-compact">
              <span className="stat-label">WORKER SLOTS</span>
              <span className="stat-value">{usedSlots}/{totalSlots} 👯</span>
            </div>
            <div className="brothel-stat-compact">
              <span className="stat-label">INCOME PER HOUR</span>
              <span className="stat-value">${brothel.income_per_hour?.toLocaleString()}</span>
            </div>
            <div className="brothel-stat-compact">
              <span className="stat-label">AVAILABLE TO COLLECT</span>
              <span className="stat-value collectible-amount">
                ${(() => {
                  if (!brothel.last_collection) return 0;
                  const lastCollection = new Date(brothel.last_collection);
                  const now = new Date();
                  const hoursPassed = (now - lastCollection) / 1000 / 60 / 60;
                  const income = Math.floor(hoursPassed * brothel.income_per_hour);
                  return income.toLocaleString();
                })()}
              </span>
            </div>
            <div className="brothel-stat-compact">
              <span className="stat-label">TOTAL EARNED</span>
              <span className="stat-value">${brothel.total_earned?.toLocaleString()}</span>
            </div>
          </div>
          <div className="brothel-actions-overlay">
            <button onClick={collectBrothelIncome} className="compact-btn brothel-collect-btn">
              💰 Collect Income
            </button>
            {player?.level >= 5 && (() => {
              const maxReached = totalSlots >= 50;
              return (
                <button 
                  onClick={upgradeBrothelSlots} 
                  className="compact-btn brothel-upgrade-btn"
                  disabled={maxReached || player.cash < (brothel.slots_upgrade_cost || 50000)}
                >
                  {maxReached ? '✅ Max' : `⬆️ Upgrade (+2) - $${(brothel.slots_upgrade_cost || 50000).toLocaleString()}`}
                </button>
              );
            })()}
          </div>
        </div>

        {hiredWorkers.length > 0 && (
          <div className="hired-workers-section">
            <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <span>
                💼 Your Workers 
                <span style={{
                  marginLeft: '15px',
                  color: '#d4af37',
                  fontSize: '1.2rem',
                  fontWeight: 'bold'
                }}>
                  ({usedSlots}/{totalSlots} Slots)
                </span>
              </span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {hiredWorkers.length > hiredPerPage && (
                  <div className="worker-nav-arrows-edge">
                    <button 
                      className="worker-nav-btn-edge"
                      onClick={() => scrollHired(-1)}
                      disabled={hiredScrollIndex === 0}
                      title="Previous"
                    >
                      ◀
                    </button>
                    <button 
                      className="worker-nav-btn-edge"
                      onClick={() => scrollHired(1)}
                      disabled={hiredScrollIndex >= hiredWorkers.length - hiredPerPage}
                      title="Next"
                    >
                      ▶
                    </button>
                  </div>
                )}
                <button 
                  onClick={() => setShowHiredWorkers(!showHiredWorkers)}
                  style={{
                    background: 'rgba(139, 92, 246, 0.2)',
                    border: '2px solid rgba(139, 92, 246, 0.5)',
                    color: '#c4b5fd',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    transition: 'all 0.3s'
                  }}
                >
                  {showHiredWorkers ? '👁️ Hide Workers' : '👁️ Show Workers'}
                </button>
              </div>
            </h3>
            {showHiredWorkers && (
              <div className="hired-workers-grid">
                {hiredWorkers.slice(hiredScrollIndex, hiredScrollIndex + hiredPerPage).map(hw => (
                  <div key={hw.id} className="hired-worker-card">
                    <div className="hired-worker-image-container">
                      <img src={hw.worker.image_url} alt={hw.worker.name} className="hired-worker-img" />
                      <div className="hired-worker-overlay">
                        <h4>{hw.worker.name}</h4>
                        <span className="hired-income">${hw.worker.income_per_hour}/h</span>
                      </div>
                      <button 
                        onClick={() => sellWorker(hw)}
                        className="compact-btn-small sell-worker-btn"
                        title={`Sell for $${Math.floor(hw.worker.hire_cost / 3).toLocaleString()}`}
                      >
                        💰 ${Math.floor(hw.worker.hire_cost / 3).toLocaleString()}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="available-workers-header">
          <h3>🎯 Available Workers</h3>
          <div className="worker-nav-arrows-edge">
            <button 
              className="worker-nav-btn-edge"
              onClick={() => scrollWorkers(-1)}
              disabled={workerScrollIndex === 0}
              title="Previous"
            >
              ◀
            </button>
            <button 
              className="worker-nav-btn-edge"
              onClick={() => scrollWorkers(1)}
              disabled={workerScrollIndex >= availableWorkers.length - workersPerPage}
              title="Next"
            >
              ▶
            </button>
          </div>
        </div>

        {slotsFull && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '2px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '8px',
            padding: '15px',
            margin: '0 40px 20px 40px',
            textAlign: 'center'
          }}>
            <p style={{ color: '#fca5a5', margin: 0, fontWeight: 'bold' }}>
              ⚠️ All worker slots full! {player?.level >= 5 ? 'Upgrade your brothel to hire more workers.' : 'Level up or upgrade your brothel to get more slots.'}
            </p>
          </div>
        )}

        <div className="workers-grid">
          {availableWorkers.slice(workerScrollIndex, workerScrollIndex + workersPerPage).map(worker => {
            const hiredCount = hiredWorkers.filter(hw => hw.worker_id === worker.id).length;
            const canAfford = player?.cash >= worker.hire_cost;
            const meetsLevel = player?.level >= worker.min_level_required;

            return (
              <div key={worker.id} className="worker-card">
                <div className="worker-image-container">
                  <img src={worker.image_url} alt={worker.name} className="worker-image" />
                  {hiredCount > 0 && (
                    <div className="hired-badge">x{hiredCount}</div>
                  )}
                  <div className="worker-header-overlay">
                    <h4>{worker.name}</h4>
                    <div className="worker-inline-stats">
                      <span className={`rarity-badge-inline rarity-${worker.rarity}`}>
                        {worker.rarity.charAt(0).toUpperCase()}
                      </span>
                      <span className="income-inline">${worker.income_per_hour}/h</span>
                    </div>
                  </div>
                  <button 
                    className="info-tooltip-btn"
                    title={`${worker.description}\nIncome: $${worker.income_per_hour}/hour\nLevel ${worker.min_level_required} Required`}
                  >
                    ℹ️
                  </button>
                  <div className="worker-actions-overlay">
                    {slotsFull ? (
                      <div className="locked-compact-worker">🚫 No Slots</div>
                    ) : !meetsLevel ? (
                      <div className="locked-compact-worker">🔒 Lvl {worker.min_level_required}</div>
                    ) : (
                      <button 
                        onClick={() => hireWorker(worker)} 
                        disabled={!canAfford}
                        className="compact-btn hire-compact-btn"
                      >
                        {canAfford ? `💼 Hire $${worker.hire_cost.toLocaleString()}` : '🚫 No Cash'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
