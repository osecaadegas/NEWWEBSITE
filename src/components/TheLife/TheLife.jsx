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
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [drugOps, setDrugOps] = useState([]);
  const [brothel, setBrothel] = useState(null);
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [hiredWorkers, setHiredWorkers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [equippedItems, setEquippedItems] = useState([]);

  useEffect(() => {
    if (user) {
      initializePlayer();
      loadRobberies();
      loadInventory();
      loadDrugOps();
      loadBrothel();
      loadAvailableWorkers();
      loadHiredWorkers();
      loadOnlinePlayers();
      loadLeaderboard();
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
            tickets: 300,
            max_tickets: 300,
            cash: 500,
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

    if (player.jail_until && new Date(player.jail_until) > new Date()) {
      setMessage({ type: 'error', text: 'You are in jail!' });
      return;
    }

    try {
      // Calculate success chance based on player level vs crime difficulty
      // Base success rate starts at crime's base rate
      // For each level above min requirement, add 5% success
      // For each level below min requirement, reduce 10% success (high risk)
      const levelDifference = player.level - robbery.min_level_required;
      let successChance = robbery.success_rate;
      
      if (levelDifference >= 0) {
        // Player meets or exceeds level requirement
        successChance += (levelDifference * 5);
      } else {
        // Player is below level requirement - risky!
        successChance += (levelDifference * 10); // This will subtract
      }
      
      // Cap success chance between 5% and 95%
      successChance = Math.max(5, Math.min(95, successChance));
      
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
          text: `Success! You earned $${reward.toLocaleString()} and ${robbery.xp_reward} XP! (${Math.round(successChance)}% chance)` 
        });
      } else {
        // Failed - jail time increases if you're underleveled
        const levelDifference = player.level - robbery.min_level_required;
        let jailMultiplier = 1;
        
        if (levelDifference < 0) {
          // Underleveled? Jail time increases by 50% per level below requirement
          jailMultiplier = 1 + (Math.abs(levelDifference) * 0.5);
        }
        
        const jailTime = Math.floor(robbery.jail_time_minutes * jailMultiplier);
        const jailUntil = new Date();
        jailUntil.setMinutes(jailUntil.getMinutes() + jailTime);
        updates.jail_until = jailUntil.toISOString();
        updates.hp = Math.max(0, player.hp - robbery.hp_loss_on_fail);
        setMessage({ 
          type: 'error', 
          text: `Failed! You're in jail for ${jailTime} minutes and lost ${robbery.hp_loss_on_fail} HP (${Math.round(successChance)}% chance)` 
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

      // Log robbery with actual jail time (reuse levelDifference from above)
      let jailMultiplierForLog = levelDifference < 0 ? 1 + (Math.abs(levelDifference) * 0.5) : 1;
      const actualJailTime = success ? 0 : Math.floor(robbery.jail_time_minutes * jailMultiplierForLog);
      
      await supabase.from('the_life_robbery_history').insert({
        player_id: player.id,
        robbery_id: robbery.id,
        success,
        reward,
        xp_gained: success ? robbery.xp_reward : Math.floor(robbery.xp_reward / 2),
        jail_time_minutes: actualJailTime
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

  // Load player inventory
  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('user_inventory')
        .select(`
          id,
          quantity,
          equipped,
          items (
            id,
            name,
            type,
            icon,
            rarity
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setInventory(data || []);
      setEquippedItems(data?.filter(item => item.equipped) || []);
    } catch (err) {
      console.error('Error loading inventory:', err);
    }
  };

  // Load online players for PvP
  const loadOnlinePlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('the_life_players')
        .select('id, user_id, level, xp, cash, pvp_wins, pvp_losses')
        .neq('user_id', user.id)
        .gte('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .limit(20);

      if (error) throw error;
      setOnlinePlayers(data || []);
    } catch (err) {
      console.error('Error loading online players:', err);
    }
  };

  // Attack another player (PvP)
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
      // Calculate combat outcome based on level, HP, and equipped items
      const playerPower = player.level * 10 + player.hp + (equippedItems.length * 20);
      const targetPower = targetPlayer.level * 10 + 100; // Assume target has full HP
      
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
        updates.pvp_wins = player.pvp_wins + 1;
        
        // Send target to hospital
        await supabase
          .from('the_life_players')
          .update({
            hp: Math.max(0, 100 - hpLost),
            cash: Math.max(0, targetPlayer.cash - cashStolen),
            hospital_until: new Date(Date.now() + 30 * 60 * 1000).toISOString()
          })
          .eq('id', targetPlayer.id);

        setMessage({ 
          type: 'success', 
          text: `Victory! You stole $${cashStolen.toLocaleString()} and sent them to hospital!` 
        });
      } else {
        updates.pvp_losses = player.pvp_losses + 1;
        updates.hospital_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        setMessage({ 
          type: 'error', 
          text: `Defeated! You're in hospital for 30 minutes` 
        });
      }

      // Update player
      const { data, error } = await supabase
        .from('the_life_players')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Log PvP battle
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

  // Load drug operations
  const loadDrugOps = async () => {
    try {
      const { data: playerData } = await supabase
        .from('the_life_players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!playerData) return;

      const { data, error } = await supabase
        .from('the_life_drug_ops')
        .select('*')
        .eq('player_id', playerData.id);

      if (error && error.code !== 'PGRST116') throw error;
      setDrugOps(data || []);
    } catch (err) {
      console.error('Error loading drug ops:', err);
    }
  };

  // Start drug production
  const startDrugProduction = async (drugType, hours) => {
    const cost = hours * 100;
    
    if (player.cash < cost) {
      setMessage({ type: 'error', text: 'Not enough cash!' });
      return;
    }

    try {
      const readyAt = new Date(Date.now() + hours * 60 * 60 * 1000);
      
      await supabase.from('the_life_drug_ops').upsert({
        player_id: player.id,
        drug_type: drugType,
        quantity: hours * 10,
        production_started_at: new Date().toISOString(),
        production_ready_at: readyAt.toISOString(),
        status: 'producing'
      }, { onConflict: 'player_id,drug_type' });

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - cost })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      loadDrugOps();
      setMessage({ type: 'success', text: `Started producing ${drugType}!` });
    } catch (err) {
      console.error('Error starting production:', err);
    }
  };

  // Collect and sell drugs
  const collectDrugs = async (drugOp) => {
    if (new Date(drugOp.production_ready_at) > new Date()) {
      setMessage({ type: 'error', text: 'Production not ready yet!' });
      return;
    }

    try {
      const sellPrice = drugOp.quantity * 50;

      await supabase
        .from('the_life_drug_ops')
        .update({ status: 'idle', quantity: 0 })
        .eq('id', drugOp.id);

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash + sellPrice })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      loadDrugOps();
      setMessage({ type: 'success', text: `Sold for $${sellPrice.toLocaleString()}!` });
    } catch (err) {
      console.error('Error collecting drugs:', err);
    }
  };

  // Load brothel
  const loadBrothel = async () => {
    try {
      const { data: playerData } = await supabase
        .from('the_life_players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!playerData) return;

      const { data, error } = await supabase
        .from('the_life_brothels')
        .select('*')
        .eq('player_id', playerData.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setBrothel(data);
    } catch (err) {
      console.error('Error loading brothel:', err);
    }
  };

  // Load available workers
  const loadAvailableWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('the_life_brothel_workers')
        .select('*')
        .eq('is_active', true)
        .order('hire_cost', { ascending: true });

      if (error) throw error;
      setAvailableWorkers(data || []);
    } catch (err) {
      console.error('Error loading available workers:', err);
    }
  };

  // Load hired workers
  const loadHiredWorkers = async () => {
    try {
      const { data: playerData } = await supabase
        .from('the_life_players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!playerData) return;

      const { data, error } = await supabase
        .from('the_life_player_brothel_workers')
        .select(`
          *,
          worker:the_life_brothel_workers(*)
        `)
        .eq('player_id', playerData.id);

      if (error) throw error;
      setHiredWorkers(data || []);
    } catch (err) {
      console.error('Error loading hired workers:', err);
    }
  };

  // Initialize brothel
  const initBrothel = async () => {
    const cost = 5000;
    
    if (player.cash < cost) {
      setMessage({ type: 'error', text: 'Need $5,000 to start a brothel!' });
      return;
    }

    try {
      await supabase.from('the_life_brothels').insert({
        player_id: player.id,
        workers: 0,
        income_per_hour: 0
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

  // Hire specific worker
  const hireWorker = async (worker) => {
    if (!brothel) {
      setMessage({ type: 'error', text: 'You need to open a brothel first!' });
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

    // Check if already hired
    if (hiredWorkers.some(hw => hw.worker_id === worker.id)) {
      setMessage({ type: 'error', text: 'You already hired this worker!' });
      return;
    }

    try {
      // Add to player's hired workers
      await supabase
        .from('the_life_player_brothel_workers')
        .insert({
          player_id: player.id,
          worker_id: worker.id
        });

      // Update brothel stats
      const newTotalIncome = (brothel.income_per_hour || 0) + worker.income_per_hour;
      const newWorkerCount = (brothel.workers || 0) + 1;

      await supabase
        .from('the_life_brothels')
        .update({
          workers: newWorkerCount,
          income_per_hour: newTotalIncome
        })
        .eq('id', brothel.id);

      // Deduct cost
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

  // Collect brothel income
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
          total_earned: brothel.total_earned + income
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

  // Load leaderboard
  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('the_life_players')
        .select('user_id, level, xp, cash, bank_balance, pvp_wins, total_robberies')
        .order('xp', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    }
  };

  // Equip/unequip inventory item
  const toggleEquipItem = async (item) => {
    try {
      await supabase
        .from('user_inventory')
        .update({ equipped: !item.equipped })
        .eq('id', item.id);

      loadInventory();
      setMessage({ 
        type: 'success', 
        text: `${item.equipped ? 'Unequipped' : 'Equipped'} ${item.items.name}!` 
      });
    } catch (err) {
      console.error('Error toggling equip:', err);
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
          className={`tab ${activeTab === 'pvp' ? 'active' : ''}`}
          onClick={() => setActiveTab('pvp')}
        >
          🥊 PvP
        </button>
        <button
          className={`tab ${activeTab === 'businesses' ? 'active' : ''}`}
          onClick={() => setActiveTab('businesses')}
        >
          💼 Businesses
        </button>
        <button 
          className={`tab ${activeTab === 'brothel' ? 'active' : ''}`}
          onClick={() => setActiveTab('brothel')}
        >
          💃 Brothel
        </button>
        <button 
          className={`tab ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          🎒 Inventory
        </button>
        <button 
          className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Leaderboard
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
            <div className="robberies-grid">
              {robberies.map(robbery => {
                // Fallback to default image if none provided
                const defaultImage = 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=500';
                const imageUrl = robbery.image_url || defaultImage;
                
                // Calculate actual success chance for display
                const levelDifference = player.level - robbery.min_level_required;
                let displaySuccessChance = robbery.success_rate;
                if (levelDifference >= 0) {
                  displaySuccessChance += (levelDifference * 5);
                } else {
                  displaySuccessChance += (levelDifference * 10);
                }
                displaySuccessChance = Math.max(5, Math.min(95, displaySuccessChance));
                
                return (
                  <div 
                    key={robbery.id} 
                    className={`crime-card ${player.level < robbery.min_level_required ? 'locked' : ''}`}
                  >
                    <div className="crime-image-container">
                      <img src={imageUrl} alt={robbery.name} className="crime-image" />
                      {player.level < robbery.min_level_required && (
                        <div className="locked-overlay">
                          <span>🔒 Level {robbery.min_level_required} Required</span>
                        </div>
                      )}
                    </div>
                    <div className="crime-content">
                      <h3 className="crime-title">{robbery.name}</h3>
                      <p className="crime-desc">{robbery.description}</p>
                      <div className="crime-stats">
                        <div className="stat-item">
                          <span className="stat-icon">🎫</span>
                          <span>{robbery.ticket_cost}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-icon">✅</span>
                          <span>{Math.round(displaySuccessChance)}%</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-icon">⭐</span>
                          <span>+{robbery.xp_reward} XP</span>
                        </div>
                      </div>
                      <div className="crime-reward">
                        <span className="reward-amount">${robbery.base_reward.toLocaleString()} - ${robbery.max_reward.toLocaleString()}</span>
                      </div>
                      <button 
                        className="crime-button"
                        onClick={() => attemptRobbery(robbery)}
                        disabled={player.level < robbery.min_level_required || isInJail || isInHospital || player.tickets < robbery.ticket_cost}
                      >
                        {player.level < robbery.min_level_required ? '🔒 Locked' : 'Commit Crime'}
                      </button>
                    </div>
                  </div>
                );
              })}
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

        {activeTab === 'pvp' && (
          <div className="pvp-section">
            <h2>🥊 Player vs Player</h2>
            <p>Attack other players and steal their cash! Win chance depends on your level and HP.</p>
            <div className="online-players">
              <h3>Online Players ({onlinePlayers.length})</h3>
              {onlinePlayers.length === 0 ? (
                <p className="no-players">No other players online right now...</p>
              ) : (
                <div className="players-grid">
                  {onlinePlayers.map(target => {
                    const winChance = Math.min(95, Math.max(5, 50 + ((player?.level || 0) - target.level) * 5));
                    return (
                      <div key={target.id} className="pvp-card">
                        <div className="pvp-player-info">
                          <h4>{target.username}</h4>
                          <p>Level {target.level} | HP: {target.current_hp}/{target.max_hp}</p>
                          <p>Cash: ${target.cash?.toLocaleString()}</p>
                        </div>
                        <div className="pvp-action">
                          <p className="win-chance">Win Chance: {winChance}%</p>
                          <button 
                            onClick={() => attackPlayer(target.id)}
                            disabled={player?.current_hp <= 0}
                            className="attack-btn"
                          >
                            Attack
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'businesses' && (
          <div className="businesses-section">
            <h2>💼 Business Operations</h2>
            <p>Start businesses and earn profits. Higher levels unlock more profitable ventures.</p>
            <div className="businesses-grid">
              <div className="business-card">
                <div className="business-image-container">
                  <img src="https://images.unsplash.com/photo-1566890579320-47fad3d2880c?w=400" alt="Weed" className="business-image" />
                </div>
                <h3>🌿 Weed Farm</h3>
                <p>Cost: $500 | Profit: $1,500 | Time: 30m</p>
                {drugOps?.weed ? (
                  <>
                    <p>Status: {new Date(drugOps.weed_completed_at) > new Date() ? 'Producing...' : 'Ready!'}</p>
                    {new Date(drugOps.weed_completed_at) <= new Date() ? (
                      <button onClick={() => collectDrugs('weed')} className="collect-btn">Collect $1,500</button>
                    ) : (
                      <p className="timer">
                        {Math.ceil((new Date(drugOps.weed_completed_at) - new Date()) / 60000)} min left
                      </p>
                    )}
                  </>
                ) : (
                  <button onClick={() => startDrugProduction('weed')} disabled={player?.cash < 500}>
                    Start Production ($500)
                  </button>
                )}
              </div>

              <div className="business-card">
                <div className="business-image-container">
                  <img src="https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400" alt="Meth Lab" className="business-image" />
                </div>
                <h3>🧪 Meth Lab</h3>
                <p>Cost: $2,000 | Profit: $7,000 | Time: 1h</p>
                {player?.level >= 5 ? (
                  <>
                    {drugOps?.meth ? (
                      <>
                        <p>Status: {new Date(drugOps.meth_completed_at) > new Date() ? 'Producing...' : 'Ready!'}</p>
                        {new Date(drugOps.meth_completed_at) <= new Date() ? (
                          <button onClick={() => collectDrugs('meth')} className="collect-btn">Collect $7,000</button>
                        ) : (
                          <p className="timer">
                            {Math.ceil((new Date(drugOps.meth_completed_at) - new Date()) / 60000)} min left
                          </p>
                        )}
                      </>
                    ) : (
                      <button onClick={() => startDrugProduction('meth')} disabled={player?.cash < 2000}>
                        Start Production ($2,000)
                      </button>
                    )}
                  </>
                ) : (
                  <p className="locked">🔒 Level 5 Required</p>
                )}
              </div>

              <div className="business-card">
                <div className="business-image-container">
                  <img src="https://images.unsplash.com/photo-1519671845924-1fd18db430b8?w=400" alt="Cocaine" className="business-image" />
                </div>
                <h3>❄️ Cocaine Factory</h3>
                <p>Cost: $5,000 | Profit: $20,000 | Time: 2h</p>
                {player?.level >= 10 ? (
                  <>
                    {drugOps?.cocaine ? (
                      <>
                        <p>Status: {new Date(drugOps.cocaine_completed_at) > new Date() ? 'Producing...' : 'Ready!'}</p>
                        {new Date(drugOps.cocaine_completed_at) <= new Date() ? (
                          <button onClick={() => collectDrugs('cocaine')} className="collect-btn">Collect $20,000</button>
                        ) : (
                          <p className="timer">
                            {Math.ceil((new Date(drugOps.cocaine_completed_at) - new Date()) / 60000)} min left
                          </p>
                        )}
                      </>
                    ) : (
                      <button onClick={() => startDrugProduction('cocaine')} disabled={player?.cash < 5000}>
                        Start Production ($5,000)
                      </button>
                    )}
                  </>
                ) : (
                  <p className="locked">🔒 Level 10 Required</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'brothel' && (
          <div className="brothel-section">
            <h2>💃 Brothel Management</h2>
            <p>Run your brothel empire! Hire unique workers for passive income.</p>
            {brothel ? (
              <div className="brothel-active">
                <div className="brothel-header">
                  <img src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800" alt="Brothel" className="brothel-banner" />
                </div>
                <div className="brothel-stats">
                  <div className="brothel-stat">
                    <h3>Workers Hired</h3>
                    <p className="big-number">{brothel.workers} 👯</p>
                  </div>
                  <div className="brothel-stat">
                    <h3>Income Per Hour</h3>
                    <p className="big-number">${brothel.income_per_hour?.toLocaleString()}</p>
                  </div>
                  <div className="brothel-stat">
                    <h3>Total Earned</h3>
                    <p className="big-number">${brothel.total_earned?.toLocaleString()}</p>
                  </div>
                </div>

                {hiredWorkers.length > 0 && (
                  <div className="hired-workers-section">
                    <h3>💼 Your Workers</h3>
                    <div className="hired-workers-grid">
                      {hiredWorkers.map(hw => (
                        <div key={hw.id} className="hired-worker-card">
                          <img src={hw.worker.image_url} alt={hw.worker.name} />
                          <div className="hired-worker-info">
                            <h4>{hw.worker.name}</h4>
                            <p className="income-rate">${hw.worker.income_per_hour}/hour</p>
                            <p className="rarity-badge rarity-{hw.worker.rarity}">{hw.worker.rarity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="brothel-actions">
                  <button onClick={collectBrothelIncome} className="collect-btn">
                    Collect Income
                  </button>
                </div>

                <h3>🎯 Available Workers</h3>
                <div className="workers-grid">
                  {availableWorkers.map(worker => {
                    const alreadyHired = hiredWorkers.some(hw => hw.worker_id === worker.id);
                    const canAfford = player?.cash >= worker.hire_cost;
                    const meetsLevel = player?.level >= worker.min_level_required;

                    return (
                      <div key={worker.id} className={`worker-card ${alreadyHired ? 'hired' : ''}`}>
                        <div className="worker-image-container">
                          <img src={worker.image_url} alt={worker.name} className="worker-image" />
                          {alreadyHired && <div className="hired-badge">HIRED</div>}
                        </div>
                        <div className="worker-info">
                          <h4>{worker.name}</h4>
                          <p className="worker-description">{worker.description}</p>
                          <div className="worker-stats">
                            <div className="stat">
                              <span className="label">Income:</span>
                              <span className="value">${worker.income_per_hour}/hour</span>
                            </div>
                          </div>
                          <span className={`rarity-badge rarity-${worker.rarity}`}>
                            {worker.rarity.toUpperCase()}
                          </span>
                          {alreadyHired ? (
                            <button disabled className="hired-btn">Already Hired</button>
                          ) : !meetsLevel ? (
                            <button disabled className="locked-btn">🔒 Level {worker.min_level_required} Required</button>
                          ) : (
                            <button 
                              onClick={() => hireWorker(worker)} 
                              disabled={!canAfford}
                              className="hire-btn"
                            >
                              {canAfford ? `Hire ($${worker.hire_cost.toLocaleString()})` : 'Not Enough Cash'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="brothel-init">
                <img src="https://images.unsplash.com/photo-1519671845924-1fd18db430b8?w=600" alt="Start Brothel" className="brothel-init-image" />
                <h3>Start Your Brothel Empire</h3>
                <p>Initial investment: $5,000</p>
                <p>Hire unique workers with different income rates and rarities</p>
                <button onClick={initBrothel} disabled={player?.cash < 5000}>
                  Open Brothel ($5,000)
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="inventory-section">
            <h2>🎒 Equipment</h2>
            <p>Equip items from your inventory to boost your stats!</p>
            {inventory.length === 0 ? (
              <p className="no-items">No items in your inventory. Complete games to earn items!</p>
            ) : (
              <div className="equipment-grid">
                {inventory.map(item => {
                  const isEquipped = equippedItems.some(e => e.item_id === item.item_id);
                  return (
                    <div key={item.item_id} className={`equipment-card ${isEquipped ? 'equipped' : ''}`}>
                      <div className="item-icon">{item.icon || '📦'}</div>
                      <h4>{item.name}</h4>
                      <p className="item-description">{item.description}</p>
                      {item.attack_bonus > 0 && <p className="bonus">⚔️ +{item.attack_bonus} Attack</p>}
                      {item.defense_bonus > 0 && <p className="bonus">🛡️ +{item.defense_bonus} Defense</p>}
                      {item.luck_bonus > 0 && <p className="bonus">🍀 +{item.luck_bonus}% Luck</p>}
                      <button 
                        onClick={() => toggleEquipItem(item.item_id)}
                        className={isEquipped ? 'unequip-btn' : 'equip-btn'}
                      >
                        {isEquipped ? 'Unequip' : 'Equip'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="leaderboard-section">
            <h2>🏆 Leaderboard</h2>
            <p>Top players in The Life</p>
            {leaderboard.length === 0 ? (
              <p>Loading leaderboard...</p>
            ) : (
              <div className="leaderboard-table">
                <div className="leaderboard-header">
                  <span>Rank</span>
                  <span>Player</span>
                  <span>Level</span>
                  <span>XP</span>
                  <span>Net Worth</span>
                  <span>PvP Wins</span>
                </div>
                {leaderboard.map((player, index) => (
                  <div key={player.id} className={`leaderboard-row ${index < 3 ? 'top-three' : ''}`}>
                    <span className="rank">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </span>
                    <span className="username">{player.username}</span>
                    <span>{player.level}</span>
                    <span>{player.xp.toLocaleString()}</span>
                    <span>${player.net_worth.toLocaleString()}</span>
                    <span>{player.pvp_wins}</span>
                  </div>
                ))}
              </div>
            )}
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
