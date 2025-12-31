import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabaseClient';
import './TheLife.css';

export default function TheLife() {
  const { user } = useAuth();
  const [player, setPlayer] = useState(null);
  const [robberies, setRobberies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('crimes');

  useEffect(() => {
    if (user) {
      initializePlayer();
      loadRobberies();
      startTicketRefill();
    }
  }, [user]);

  const initializePlayer = async () => {
    try {
      // Check if player exists
      let { data: playerData, error } = await supabase
        .from('the_life_players')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Create new player
        const { data: newPlayer, error: createError } = await supabase
          .from('the_life_players')
          .insert({
            user_id: user.id,
            xp: 0,
            level: 1,
            hp: 100,
            max_hp: 100,
            stamina: 100,
            max_stamina: 100,
            tickets: 20,
            cash: 1000,
            bank_balance: 0
          })
          .select()
          .single();

        if (createError) throw createError;
        playerData = newPlayer;
      }

      setPlayer(playerData);
      checkDailyBonus(playerData);
    } catch (err) {
      console.error('Error initializing player:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkDailyBonus = async (playerData) => {
    const lastBonus = playerData.last_daily_bonus;
    const now = new Date();
    
    if (!lastBonus) {
      // First login ever
      await claimDailyBonus(1);
      return;
    }

    const lastBonusDate = new Date(lastBonus);
    const hoursSinceBonus = (now - lastBonusDate) / 1000 / 60 / 60;

    if (hoursSinceBonus >= 24 && hoursSinceBonus < 48) {
      // Eligible for bonus
      await claimDailyBonus(playerData.consecutive_logins + 1);
    } else if (hoursSinceBonus >= 48) {
      // Streak broken
      await claimDailyBonus(1);
    }
  };

  const claimDailyBonus = async (newStreak) => {
    try {
      const { data, error } = await supabase
        .from('the_life_players')
        .update({
          tickets: Math.min(player.tickets + 10, player.max_tickets),
          last_daily_bonus: new Date().toISOString(),
          consecutive_logins: newStreak
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      setMessage({ 
        type: 'success', 
        text: `Daily bonus claimed! +10 tickets (${newStreak} day streak)` 
      });
    } catch (err) {
      console.error('Error claiming daily bonus:', err);
    }
  };

  const startTicketRefill = () => {
    const interval = setInterval(async () => {
      if (!player) return;

      const lastRefill = new Date(player.last_ticket_refill);
      const now = new Date();
      const hoursPassed = (now - lastRefill) / 1000 / 60 / 60;

      if (hoursPassed >= 1 && player.tickets < player.max_tickets) {
        const ticketsToAdd = Math.floor(hoursPassed) * 20;
        const newTickets = Math.min(player.tickets + ticketsToAdd, player.max_tickets);

        const { data, error } = await supabase
          .from('the_life_players')
          .update({
            tickets: newTickets,
            last_ticket_refill: now.toISOString()
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (!error) setPlayer(data);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  };

  const loadRobberies = async () => {
    try {
      const { data, error } = await supabase
        .from('the_life_robberies')
        .select('*')
        .order('min_level_required', { ascending: true });

      if (error) throw error;
      setRobberies(data);
    } catch (err) {
      console.error('Error loading robberies:', err);
    }
  };

  const attemptRobbery = async (robbery) => {
    if (player.tickets < robbery.ticket_cost) {
      setMessage({ type: 'error', text: 'Not enough tickets!' });
      return;
    }

    if (player.level < robbery.min_level_required) {
      setMessage({ type: 'error', text: `Level ${robbery.min_level_required} required!` });
      return;
    }

    if (player.jail_until && new Date(player.jail_until) > new Date()) {
      setMessage({ type: 'error', text: 'You are in jail!' });
      return;
    }

    try {
      // Calculate success chance
      const successChance = robbery.success_rate + (player.level * 2);
      const roll = Math.random() * 100;
      const success = roll < successChance;

      const reward = success 
        ? Math.floor(Math.random() * (robbery.max_reward - robbery.base_reward) + robbery.base_reward)
        : 0;

      let updates = {
        tickets: player.tickets - robbery.ticket_cost,
        total_robberies: player.total_robberies + 1,
        xp: player.xp + (success ? robbery.xp_reward : Math.floor(robbery.xp_reward / 2))
      };

      if (success) {
        updates.cash = player.cash + reward;
        updates.successful_robberies = player.successful_robberies + 1;
        setMessage({ 
          type: 'success', 
          text: `Success! You earned $${reward.toLocaleString()} and ${robbery.xp_reward} XP!` 
        });
      } else {
        const jailUntil = new Date();
        jailUntil.setMinutes(jailUntil.getMinutes() + robbery.jail_time_minutes);
        updates.jail_until = jailUntil.toISOString();
        updates.hp = Math.max(0, player.hp - robbery.hp_loss_on_fail);
        setMessage({ 
          type: 'error', 
          text: `Failed! You're in jail for ${robbery.jail_time_minutes} minutes and lost ${robbery.hp_loss_on_fail} HP` 
        });
      }

      // Check for level up
      const xpForNextLevel = player.level * 100;
      if (updates.xp >= xpForNextLevel) {
        updates.level = player.level + 1;
        updates.xp = updates.xp - xpForNextLevel;
        setMessage({ 
          type: 'success', 
          text: `Level Up! You are now level ${updates.level}!` 
        });
      }

      const { data, error } = await supabase
        .from('the_life_players')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Log robbery
      await supabase.from('the_life_robbery_history').insert({
        player_id: player.id,
        robbery_id: robbery.id,
        success,
        reward,
        xp_gained: success ? robbery.xp_reward : Math.floor(robbery.xp_reward / 2),
        jail_time_minutes: success ? 0 : robbery.jail_time_minutes
      });

      setPlayer(data);
    } catch (err) {
      console.error('Error attempting robbery:', err);
      setMessage({ type: 'error', text: 'An error occurred' });
    }
  };

  const depositToBank = async (amount) => {
    if (amount > player.cash) {
      setMessage({ type: 'error', text: 'Not enough cash!' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('the_life_players')
        .update({
          cash: player.cash - amount,
          bank_balance: player.bank_balance + amount
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      setMessage({ type: 'success', text: `Deposited $${amount.toLocaleString()}` });
    } catch (err) {
      console.error('Error depositing:', err);
    }
  };

  const withdrawFromBank = async (amount) => {
    if (amount > player.bank_balance) {
      setMessage({ type: 'error', text: 'Not enough in bank!' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('the_life_players')
        .update({
          cash: player.cash + amount,
          bank_balance: player.bank_balance - amount
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      setMessage({ type: 'success', text: `Withdrew $${amount.toLocaleString()}` });
    } catch (err) {
      console.error('Error withdrawing:', err);
    }
  };

  if (loading) {
    return (
      <div className="the-life-container">
        <div className="loading">Loading The Life...</div>
      </div>
    );
  }

  const isInJail = player?.jail_until && new Date(player.jail_until) > new Date();
  const isInHospital = player?.hospital_until && new Date(player.hospital_until) > new Date();

  return (
    <div className="the-life-container">
      <div className="the-life-header">
        <h1>🔫 The Life</h1>
        <p className="tagline">Crime RPG</p>
      </div>

      {message.text && (
        <div className={`game-message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      {/* Player Stats Bar */}
      <div className="player-stats-bar">
        <div className="stat-group">
          <span className="stat-label">Level {player?.level}</span>
          <div className="stat-bar">
            <div 
              className="stat-fill xp-fill" 
              style={{ width: `${(player?.xp / (player?.level * 100)) * 100}%` }}
            />
            <span className="stat-text">{player?.xp} / {player?.level * 100} XP</span>
          </div>
        </div>

        <div className="stat-group">
          <span className="stat-label">HP</span>
          <div className="stat-bar">
            <div 
              className="stat-fill hp-fill" 
              style={{ width: `${(player?.hp / player?.max_hp) * 100}%` }}
            />
            <span className="stat-text">{player?.hp} / {player?.max_hp}</span>
          </div>
        </div>

        <div className="stat-group">
          <span className="stat-label">Tickets</span>
          <div className="stat-bar">
            <div 
              className="stat-fill ticket-fill" 
              style={{ width: `${(player?.tickets / player?.max_tickets) * 100}%` }}
            />
            <span className="stat-text">{player?.tickets} / {player?.max_tickets}</span>
          </div>
        </div>

        <div className="cash-display">
          <div className="cash-item">
            <span className="cash-icon">💵</span>
            <span className="cash-value">${player?.cash?.toLocaleString()}</span>
            <span className="cash-label">Cash</span>
          </div>
          <div className="cash-item">
            <span className="cash-icon">🏦</span>
            <span className="cash-value">${player?.bank_balance?.toLocaleString()}</span>
            <span className="cash-label">Bank</span>
          </div>
        </div>
      </div>

      {/* Status Warnings */}
      {isInJail && (
        <div className="status-warning jail">
          ⚠️ You are in jail until {new Date(player.jail_until).toLocaleTimeString()}
        </div>
      )}

      {isInHospital && (
        <div className="status-warning hospital">
          🏥 You are in hospital until {new Date(player.hospital_until).toLocaleTimeString()}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="game-tabs">
        <button 
          className={`tab ${activeTab === 'crimes' ? 'active' : ''}`}
          onClick={() => setActiveTab('crimes')}
        >
          💰 Crimes
        </button>
        <button 
          className={`tab ${activeTab === 'bank' ? 'active' : ''}`}
          onClick={() => setActiveTab('bank')}
        >
          🏦 Bank
        </button>
        <button 
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Stats
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'crimes' && (
          <div className="crimes-section">
            <h2>Available Crimes</h2>
            <div className="robberies-grid">
              {robberies.map(robbery => (
                <div 
                  key={robbery.id} 
                  className={`robbery-card ${player.level < robbery.min_level_required ? 'locked' : ''}`}
                >
                  <h3>{robbery.name}</h3>
                  <p className="robbery-desc">{robbery.description}</p>
                  <div className="robbery-stats">
                    <span>💪 Level {robbery.min_level_required}</span>
                    <span>🎫 {robbery.ticket_cost} tickets</span>
                    <span>✅ {robbery.success_rate}% success</span>
                  </div>
                  <div className="robbery-rewards">
                    <span>💰 ${robbery.base_reward.toLocaleString()} - ${robbery.max_reward.toLocaleString()}</span>
                    <span>⭐ +{robbery.xp_reward} XP</span>
                  </div>
                  <button 
                    className="robbery-button"
                    onClick={() => attemptRobbery(robbery)}
                    disabled={player.level < robbery.min_level_required || isInJail || isInHospital || player.tickets < robbery.ticket_cost}
                  >
                    {player.level < robbery.min_level_required ? 'Locked' : 'Attempt Crime'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="bank-section">
            <h2>🏦 Bank</h2>
            <p>Keep your money safe from other players!</p>
            <div className="bank-actions">
              <div className="bank-action">
                <h3>Deposit</h3>
                <p>Cash on hand: ${player?.cash?.toLocaleString()}</p>
                <button onClick={() => depositToBank(player.cash)}>Deposit All</button>
              </div>
              <div className="bank-action">
                <h3>Withdraw</h3>
                <p>Bank balance: ${player?.bank_balance?.toLocaleString()}</p>
                <button onClick={() => withdrawFromBank(player.bank_balance)}>Withdraw All</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="stats-section">
            <h2>📊 Your Stats</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-number">{player?.level}</span>
                <span className="stat-name">Level</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{player?.total_robberies}</span>
                <span className="stat-name">Total Crimes</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{player?.successful_robberies}</span>
                <span className="stat-name">Successful</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">
                  {player?.total_robberies > 0 
                    ? Math.round((player?.successful_robberies / player?.total_robberies) * 100)
                    : 0}%
                </span>
                <span className="stat-name">Success Rate</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{player?.pvp_wins}</span>
                <span className="stat-name">PvP Wins</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{player?.consecutive_logins}</span>
                <span className="stat-name">Login Streak</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
