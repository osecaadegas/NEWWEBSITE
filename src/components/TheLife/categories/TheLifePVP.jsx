import { supabase } from '../../../config/supabaseClient';

/**
 * PVP Category Component
 * Handles player vs player battles
 */
export default function TheLifePVP({ 
  player, 
  setPlayer, 
  onlinePlayers,
  loadOnlinePlayers,
  setMessage,
  isInHospital,
  setActiveTab,
  user 
}) {
  // Generate avatar URL based on username
  const getAvatarUrl = (username, userId) => {
    const seed = userId || username || 'player';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
  };
  const attackPlayer = async (targetPlayer) => {
    if (player.tickets < 3) {
      setMessage({ type: 'error', text: 'Need 3 tickets to attack!' });
      return;
    }

    if (player.hp < 20) {
      setMessage({ type: 'error', text: 'Not enough HP to attack!' });
      return;
    }

    try {
      // Assume no equipped items for now (equippedItems not implemented)
      const playerPower = player.level * 10 + player.hp;
      const targetPower = targetPlayer.level * 10 + 100;
      
      const winChance = (playerPower / (playerPower + targetPower)) * 100;
      const roll = Math.random() * 100;
      const won = roll < winChance;

      const hpLost = Math.floor(Math.random() * 30) + 10;
      const cashStolen = won ? Math.floor(targetPlayer.cash * 0.1) : 0;

      let updates = {
        tickets: player.tickets - 3,
        hp: Math.max(0, player.hp - hpLost)
      };

      if (won) {
        updates.cash = player.cash + cashStolen;
        updates.pvp_wins = (player.pvp_wins || 0) + 1;
        
        // Update target player - send to hospital if HP reaches 0
        const targetHP = Math.max(0, 100 - hpLost);
        const targetUpdates = {
          hp: targetHP,
          cash: Math.max(0, targetPlayer.cash - cashStolen),
        };
        
        // If target's HP reaches 0, send them to hospital for 30 minutes
        if (targetHP === 0) {
          targetUpdates.hospital_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        }
        
        await supabase
          .from('the_life_players')
          .update(targetUpdates)
          .eq('id', targetPlayer.id);

        setMessage({ 
          type: 'success', 
          text: targetHP === 0 
            ? `Victory! You stole $${cashStolen.toLocaleString()} and sent them to hospital!`
            : `Victory! You stole $${cashStolen.toLocaleString()}!`
        });
      } else {
        updates.pvp_losses = (player.pvp_losses || 0) + 1;
        
        // If player loses and HP reaches 0, send them to hospital for 30 minutes
        if (updates.hp === 0) {
          updates.hospital_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
          setMessage({ 
            type: 'error', 
            text: `💀 Defeated! You're in hospital for 30 minutes` 
          });
          // Redirect to hospital tab after a short delay
          setTimeout(() => {
            if (setActiveTab) setActiveTab('hospital');
          }, 1500);
        } else {
          setMessage({ 
            type: 'error', 
            text: `Defeated! You lost ${hpLost} HP` 
          });
        }
      }

      const { data, error } = await supabase
        .from('the_life_players')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('the_life_pvp_logs').insert({
        attacker_id: player.id,
        defender_id: targetPlayer.id,
        winner_id: won ? player.id : targetPlayer.id,
        cash_stolen: cashStolen,
        attacker_hp_lost: hpLost,
        defender_hp_lost: hpLost
      });

      setPlayer(data);
      loadOnlinePlayers();
    } catch (err) {
      console.error('Error attacking player:', err);
      setMessage({ type: 'error', text: 'Attack failed' });
    }
  };

  return (
    <div className="pvp-section">
      <h2>🥊 Player vs Player</h2>
      {isInHospital ? (
        <p className="hospital-warning">🏥 You cannot attack players while in hospital!</p>
      ) : (
        <>
          <p>Attack other players and steal their cash! Win chance depends on your level and HP.</p>
          <div className="online-players">
            <h3>Online Players ({onlinePlayers.length})</h3>
            {onlinePlayers.length === 0 ? (
              <p className="no-players">No other players online right now...</p>
            ) : (
              <div className="players-grid">
                {onlinePlayers.map(target => {
                  const winChance = Math.min(95, Math.max(5, 50 + ((player?.level || 0) - target.level) * 5));
                  const targetWealth = (target.cash || 0) + (target.bank_balance || 0);
                  const potential = Math.floor(target.cash * 0.1);
                  return (
                    <div key={target.id} className="pvp-card-modern">
                      <div className="pvp-card-header">
                        <img 
                          src={getAvatarUrl(target.username, target.user_id)} 
                          alt={target.username || 'Player'}
                          className="pvp-avatar"
                        />
                        <div className="pvp-player-details">
                          <h4>{target.username || 'Player'}</h4>
                          <div className="pvp-level-badge">Lvl {target.level}</div>
                        </div>
                      </div>
                      
                      <div className="pvp-stats-grid">
                        <div className="pvp-stat">
                          <span className="stat-icon">🏆</span>
                          <div>
                            <div className="stat-value">{target.pvp_wins || 0}</div>
                            <div className="stat-label">Wins</div>
                          </div>
                        </div>
                        <div className="pvp-stat">
                          <span className="stat-icon">💰</span>
                          <div>
                            <div className="stat-value">${targetWealth.toLocaleString()}</div>
                            <div className="stat-label">Wealth</div>
                          </div>
                        </div>
                        <div className="pvp-stat">
                          <span className="stat-icon">💵</span>
                          <div>
                            <div className="stat-value">${target.cash?.toLocaleString()}</div>
                            <div className="stat-label">Cash</div>
                          </div>
                        </div>
                        <div className="pvp-stat">
                          <span className="stat-icon">❤️</span>
                          <div>
                            <div className="stat-value">100</div>
                            <div className="stat-label">HP</div>
                          </div>
                        </div>
                      </div>

                      <div className="pvp-card-footer">
                        <div className="win-chance-modern">
                          <div className="chance-bar-container">
                            <div className="chance-bar" style={{width: `${winChance}%`}}></div>
                          </div>
                          <span className="chance-text">{winChance}% Win Chance</span>
                        </div>
                        <div className="pvp-rewards">
                          <span className="potential-reward">💸 ${potential.toLocaleString()} potential</span>
                        </div>
                        <button 
                          onClick={() => attackPlayer(target)}
                          disabled={player?.hp < 20}
                          className="attack-btn-modern"
                        >
                          <span className="btn-icon">⚔️</span>
                          <span>Attack</span>
                          <span className="btn-cost">3 🎫</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
