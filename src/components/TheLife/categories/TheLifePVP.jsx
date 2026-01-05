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
  user 
}) {
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
            text: `Defeated! You lost and are in hospital for 30 minutes` 
          });
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
                  return (
                    <div key={target.id} className="pvp-card">
                      <div className="pvp-player-info">
                        <h4>{target.username || 'Player'}</h4>
                        <p>Level {target.level} | PvP Wins: {target.pvp_wins || 0}</p>
                        <p>💰 Wealth: ${targetWealth.toLocaleString()}</p>
                        <p>💵 Cash: ${target.cash?.toLocaleString()}</p>
                        <p>❤️ HP: 100</p>
                      </div>
                      <div className="pvp-action">
                        <p className="win-chance">Win Chance: {winChance}%</p>
                        <button 
                          onClick={() => attackPlayer(target)}
                          disabled={player?.hp < 20}
                          className="attack-btn"
                        >
                          ⚔️ Attack (3 🎫)
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
