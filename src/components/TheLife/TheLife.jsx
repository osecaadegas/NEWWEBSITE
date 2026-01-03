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
  const [showHiredWorkers, setShowHiredWorkers] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [ownedBusinesses, setOwnedBusinesses] = useState([]);
  const [theLifeInventory, setTheLifeInventory] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [jailTimeRemaining, setJailTimeRemaining] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [marketSubTab, setMarketSubTab] = useState('store');
  const [showEventPopup, setShowEventPopup] = useState(false);
  const [eventPopupData, setEventPopupData] = useState(null);

  useEffect(() => {
    if (user) {
      initializePlayer();
      loadRobberies();
      loadTheLifeInventory();
      loadBusinesses();
      loadDrugOps();
      loadBrothel();
      loadAvailableWorkers();
      loadHiredWorkers();
      loadOwnedBusinesses();
      loadOnlinePlayers();
      loadLeaderboard();
      startTicketRefill();
    }
  }, [user]);

  // Subscribe to real-time updates for robberies
  useEffect(() => {
    const channel = supabase
      .channel('robberies-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'the_life_robberies' 
        }, 
        (payload) => {
          console.log('Robbery data changed, reloading...', payload);
          loadRobberies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Jail countdown timer
  useEffect(() => {
    if (!player?.jail_until) return;

    const interval = setInterval(() => {
      const now = new Date();
      const jailEnd = new Date(player.jail_until);
      const diff = jailEnd - now;

      if (diff <= 0) {
        setJailTimeRemaining(null);
        // Reload player to clear jail status
        initializePlayer();
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setJailTimeRemaining({ minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player?.jail_until]);

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
        .eq('is_active', true)
        .order('min_level_required', { ascending: true });

      if (error) throw error;
      setRobberies(data);
    } catch (err) {
      console.error('Error loading robberies:', err);
    }
  };

  const loadBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('the_life_businesses')
        .select('*')
        .eq('is_active', true)
        .order('min_level_required', { ascending: true });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (err) {
      console.error('Error loading businesses:', err);
    }
  };

  const showEventMessage = async (eventType) => {
    try {
      const { data, error } = await supabase
        .from('the_life_event_messages')
        .select('*')
        .eq('event_type', eventType)
        .eq('is_active', true);

      if (!error && data && data.length > 0) {
        const randomMessage = data[Math.floor(Math.random() * data.length)];
        setEventPopupData(randomMessage);
        setShowEventPopup(true);
        
        setTimeout(() => {
          setShowEventPopup(false);
        }, 5000);
      }
    } catch (err) {
      console.error('Error loading event message:', err);
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
      
      // HP affects success rate - low HP reduces success chance
      const hpPercentage = player.hp / player.max_hp;
      if (hpPercentage < 0.5) {
        // Below 50% HP: reduce success by up to 15%
        const hpPenalty = (0.5 - hpPercentage) * 30; // 0-15% penalty
        successChance -= hpPenalty;
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
        // Failed - jail time increases if you're underleveled OR low HP
        const levelDifference = player.level - robbery.min_level_required;
        let jailMultiplier = 1;
        
        if (levelDifference < 0) {
          // Underleveled? Jail time increases by 50% per level below requirement
          jailMultiplier = 1 + (Math.abs(levelDifference) * 0.5);
        }
        
        // Low HP increases jail time - you're weak and easier to catch
        const hpPercentage = player.hp / player.max_hp;
        if (hpPercentage < 0.5) {
          // Below 50% HP: jail time increases by up to 50%
          const hpPenalty = (0.5 - hpPercentage) * 1.0; // 0-0.5 multiplier
          jailMultiplier += hpPenalty;
        }
        
        const jailTime = Math.floor(robbery.jail_time_minutes * jailMultiplier);
        const jailUntil = new Date();
        jailUntil.setMinutes(jailUntil.getMinutes() + jailTime);
        updates.jail_until = jailUntil.toISOString();
        updates.hp = Math.max(0, player.hp - robbery.hp_loss_on_fail);
        
        // Show event popup for jail
        showEventMessage('jail_crime');
        
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

  // Load TheLife player inventory
  const loadTheLifeInventory = async () => {
    try {
      const { data: playerData } = await supabase
        .from('the_life_players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!playerData) return;

      const { data, error } = await supabase
        .from('the_life_player_inventory')
        .select(`
          *,
          item:the_life_items(*)
        `)
        .eq('player_id', playerData.id);

      if (error) throw error;
      setTheLifeInventory(data || []);
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

      // Load active productions from database
      const { data, error } = await supabase
        .from('the_life_business_productions')
        .select('*')
        .eq('player_id', playerData.id)
        .eq('collected', false);

      if (error && error.code !== 'PGRST116') throw error;
      
      // Convert to old format for UI compatibility
      const opsData = {};
      if (data) {
        data.forEach(prod => {
          opsData[prod.business_id] = true;
          opsData[`${prod.business_id}_completed_at`] = prod.completed_at;
          opsData[`${prod.business_id}_reward_item_id`] = prod.reward_item_id;
          opsData[`${prod.business_id}_reward_item_quantity`] = prod.reward_item_quantity;
        });
      }
      setDrugOps(opsData);
    } catch (err) {
      console.error('Error loading drug ops:', err);
    }
  };

  // Load owned businesses
  const loadOwnedBusinesses = async () => {
    try {
      const { data: playerData } = await supabase
        .from('the_life_players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!playerData) return;

      const { data, error } = await supabase
        .from('the_life_player_businesses')
        .select(`
          *,
          business:the_life_businesses(*)
        `)
        .eq('player_id', playerData.id);

      if (error) throw error;
      setOwnedBusinesses(data || []);
    } catch (err) {
      console.error('Error loading owned businesses:', err);
    }
  };

  // Calculate max business slots based on level
  const getMaxBusinessSlots = (level) => {
    // Start with 1 slot, gain 1 slot every 5 levels, max 7
    const baseSlots = 1;
    const bonusSlots = Math.floor(level / 5);
    return Math.min(baseSlots + bonusSlots, 7);
  };

  // Calculate business upgrade cost
  const getUpgradeCost = (business, currentLevel) => {
    // Base cost is 2x the purchase price
    const baseCost = (business.purchase_price || 5000) * 2;
    // Each level multiplies cost by 1.8 (exponential scaling)
    return Math.floor(baseCost * Math.pow(1.8, currentLevel - 1));
  };

  // Upgrade a business
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
      // Update business level
      const { error: upgradeError } = await supabase
        .from('the_life_player_businesses')
        .update({ upgrade_level: currentLevel + 1 })
        .eq('id', ownedBusiness.id);

      if (upgradeError) throw upgradeError;

      // Deduct cost
      const { error: cashError } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - upgradeCost })
        .eq('user_id', user.id);

      if (cashError) throw cashError;

      // Update local state immediately
      setOwnedBusinesses(prev => 
        prev.map(ob => 
          ob.id === ownedBusiness.id 
            ? { ...ob, upgrade_level: currentLevel + 1 }
            : ob
        )
      );
      setPlayer(prev => ({ ...prev, cash: prev.cash - upgradeCost }));

      setMessage({ 
        type: 'success', 
        text: `${business.name} upgraded to level ${currentLevel + 1}!` 
      });
      loadPlayer();
      loadOwnedBusinesses();
    } catch (err) {
      console.error('Error upgrading business:', err);
      setMessage({ type: 'error', text: `Failed to upgrade: ${err.message}` });
    }
  };

  // Buy a business
  const buyBusiness = async (business) => {
    if (player.cash < business.purchase_price) {
      setMessage({ type: 'error', text: `Need $${business.purchase_price.toLocaleString()} to buy ${business.name}!` });
      return;
    }

    if (player.level < business.min_level_required) {
      setMessage({ type: 'error', text: `Need level ${business.min_level_required} to buy ${business.name}!` });
      return;
    }

    // Check business slot limit
    const maxSlots = getMaxBusinessSlots(player.level);
    if (ownedBusinesses.length >= maxSlots) {
      setMessage({ 
        type: 'error', 
        text: `Business limit reached! You can own ${maxSlots} businesses. Level up for more slots (max 7).` 
      });
      return;
    }

    try {
      // Add to owned businesses
      await supabase
        .from('the_life_player_businesses')
        .insert({
          player_id: player.id,
          business_id: business.id
        });

      // Deduct purchase price
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

  // Run business to produce items
  const startBusiness = async (business) => {
    // Check if player owns this business
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
      
      // Get player ID
      const { data: playerData, error: playerError } = await supabase
        .from('the_life_players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (playerError) throw playerError;

      // Save production to database (upsert to handle restarts)
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

      // Set timer in state
      const opData = {
        [business.id]: true,
        [`${business.id}_completed_at`]: completedAt.toISOString(),
        [`${business.id}_reward_item_id`]: business.reward_item_id,
        [`${business.id}_reward_item_quantity`]: business.reward_item_quantity
      };

      setDrugOps(prev => ({ ...prev, ...opData }));

      // Deduct production cost and tickets
      const requiredTickets = business.ticket_cost || 5;
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

  // Use Jail Free Card to escape jail
  const useJailFreeCard = async () => {
    try {
      const { data: playerData } = await supabase
        .from('the_life_players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!playerData) return;

      // Find Jail Free Card in inventory
      const jailCard = theLifeInventory.find(inv => 
        inv.item?.name === 'Jail Free Card' && inv.quantity > 0
      );

      if (!jailCard) {
        setMessage({ type: 'error', text: 'You don\'t have a Jail Free Card!' });
        return;
      }

      // Remove one card from inventory
      if (jailCard.quantity === 1) {
        await supabase
          .from('the_life_player_inventory')
          .delete()
          .eq('id', jailCard.id);
      } else {
        await supabase
          .from('the_life_player_inventory')
          .update({ quantity: jailCard.quantity - 1 })
          .eq('id', jailCard.id);
      }

      // Free player from jail
      const { data, error } = await supabase
        .from('the_life_players')
        .update({ jail_until: null })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      await loadTheLifeInventory();
      setMessage({ type: 'success', text: '🔓 You escaped jail using a Jail Free Card!' });
    } catch (err) {
      console.error('Error using jail free card:', err);
      setMessage({ type: 'error', text: 'Failed to use card!' });
    }
  };

  // Calculate bribe amount based on remaining jail time
  const calculateBribeAmount = () => {
    if (!player?.jail_until) return { bribeAmount: 0, percentage: 0, remainingMinutes: 0 };
    
    const now = new Date();
    const jailEnd = new Date(player.jail_until);
    const remainingMinutes = Math.max(0, Math.ceil((jailEnd - now) / 1000 / 60));
    
    // Base percentage starts at 5% and increases by 2% per 30 minutes of jail time
    // Cap at 50% for very long sentences
    const basePercentage = 5;
    const increasePerHalfHour = 2;
    const percentageIncrease = Math.floor(remainingMinutes / 30) * increasePerHalfHour;
    const totalPercentage = Math.min(50, basePercentage + percentageIncrease);
    
    const totalWealth = (player.cash || 0) + (player.bank_balance || 0);
    const bribeAmount = Math.floor(totalWealth * (totalPercentage / 100));
    
    return { bribeAmount, percentage: totalPercentage, remainingMinutes };
  };

  // Pay bribe to escape jail
  const payBribe = async () => {
    try {
      const { bribeAmount, percentage } = calculateBribeAmount();
      const totalWealth = (player.cash || 0) + (player.bank_balance || 0);
      
      if (totalWealth < bribeAmount) {
        setMessage({ type: 'error', text: 'You don\'t have enough money to pay the bribe!' });
        return;
      }

      if (bribeAmount === 0) {
        setMessage({ type: 'error', text: 'Invalid bribe amount!' });
        return;
      }

      // Deduct from cash first, then bank if needed
      let newCash = player.cash;
      let newBank = player.bank_balance;
      let remaining = bribeAmount;

      if (newCash >= remaining) {
        newCash -= remaining;
      } else {
        remaining -= newCash;
        newCash = 0;
        newBank -= remaining;
      }

      // Update player - free from jail and deduct money
      const { data, error } = await supabase
        .from('the_life_players')
        .update({ 
          jail_until: null,
          cash: newCash,
          bank_balance: newBank
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      setMessage({ 
        type: 'success', 
        text: `💰 You bribed the cops with $${bribeAmount.toLocaleString()} (${percentage}% of your wealth) and escaped jail!` 
      });
    } catch (err) {
      console.error('Error paying bribe:', err);
      setMessage({ type: 'error', text: 'Failed to pay bribe!' });
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

      // Get the owned business with upgrade level
      const ownedBusiness = ownedBusinesses.find(ob => ob.business_id === business.id);
      const upgradeLevel = ownedBusiness?.upgrade_level || 1;

      // Get stored reward info from drugOps
      const rewardItemId = drugOps[`${business.id}_reward_item_id`];
      const baseRewardQuantity = drugOps[`${business.id}_reward_item_quantity`];

      // Calculate multipliers based on upgrade level
      // Each level adds 50% to quantity (1.5x per level)
      const quantityMultiplier = 1 + ((upgradeLevel - 1) * 0.5);
      const rewardQuantity = Math.floor(baseRewardQuantity * quantityMultiplier);

      // Each level adds 30% to cash (1.3x per level)
      const cashMultiplier = 1 + ((upgradeLevel - 1) * 0.3);

      // Check reward type: items or cash
      if (business.reward_type === 'items' && rewardItemId && rewardQuantity) {
        // Add items to inventory
        const { data: existing, error: checkError } = await supabase
          .from('the_life_player_inventory')
          .select('*')
          .eq('player_id', playerData.id)
          .eq('item_id', rewardItemId)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (existing) {
          // Update quantity
          const { error: updateError } = await supabase
            .from('the_life_player_inventory')
            .update({ quantity: existing.quantity + rewardQuantity })
            .eq('id', existing.id);
          
          if (updateError) throw updateError;
        } else {
          // Insert new item
          const { error: insertError } = await supabase
            .from('the_life_player_inventory')
            .insert({
              player_id: playerData.id,
              item_id: rewardItemId,
              quantity: rewardQuantity
            });
          
          if (insertError) throw insertError;
        }

        await loadTheLifeInventory();
        setMessage({ 
          type: 'success', 
          text: `Collected ${rewardQuantity}x items! ${upgradeLevel > 1 ? `(Lvl ${upgradeLevel} bonus!)` : ''}` 
        });
      } else {
        // Give cash reward with upgrade multiplier
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

      // Mark production as collected in database
      const { error: collectError } = await supabase
        .from('the_life_business_productions')
        .update({ collected: true })
        .eq('player_id', playerData.id)
        .eq('business_id', business.id)
        .eq('collected', false);

      if (collectError) throw collectError;

      // Remove from state
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
      // Calculate initial slots based on level (level + 2)
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

  // Hire specific worker
  const hireWorker = async (worker) => {
    if (!brothel) {
      setMessage({ type: 'error', text: 'You need to open a brothel first!' });
      return;
    }

    // Calculate total available slots
    const totalSlots = (brothel.worker_slots || 3) + (brothel.additional_slots || 0);
    const usedSlots = brothel.workers || 0;

    // Check if slots are full
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

  // Upgrade brothel slots
  const upgradeBrothelSlots = async () => {
    if (!brothel) {
      setMessage({ type: 'error', text: 'You need to open a brothel first!' });
      return;
    }

    if (player.level < 5) {
      setMessage({ type: 'error', text: 'Need level 5 to upgrade worker slots!' });
      return;
    }

    // Check max slots (50 total)
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
      // Add 2 additional slots and double upgrade cost
      const newAdditionalSlots = (brothel.additional_slots || 0) + 2;
      const newUpgradeCost = upgradeCost * 2;

      await supabase
        .from('the_life_brothels')
        .update({
          additional_slots: newAdditionalSlots,
          slots_upgrade_cost: newUpgradeCost
        })
        .eq('id', brothel.id);

      // Deduct cost
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

  // Sell worker for 1/3 of hire cost
  const sellWorker = async (hiredWorker) => {
    if (!confirm(`Sell ${hiredWorker.worker.name} for $${Math.floor(hiredWorker.worker.hire_cost / 3).toLocaleString()}?`)) {
      return;
    }

    try {
      // Remove from hired workers
      await supabase
        .from('the_life_player_brothel_workers')
        .delete()
        .eq('id', hiredWorker.id);

      // Update brothel stats
      const newTotalIncome = (brothel.income_per_hour || 0) - hiredWorker.worker.income_per_hour;
      const newWorkerCount = (brothel.workers || 0) - 1;

      await supabase
        .from('the_life_brothels')
        .update({
          workers: Math.max(0, newWorkerCount),
          income_per_hour: Math.max(0, newTotalIncome)
        })
        .eq('id', brothel.id);

      // Add sell price (1/3 of hire cost)
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
        .select(`
          id,
          user_id,
          level,
          xp,
          cash,
          bank_balance,
          pvp_wins,
          total_robberies
        `)
        .order('xp', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch Twitch usernames for each player
      if (data && data.length > 0) {
        const enrichedData = await Promise.all(
          data.map(async (playerData) => {
            // Get user metadata to extract Twitch username
            let metadata = null;
            try {
              const result = await supabase
                .rpc('get_user_metadata', { user_id: playerData.user_id });
              metadata = result.data;
            } catch (err) {
              console.error('Error fetching metadata:', err);
            }
            
            let twitchUsername = 'Player';
            
            if (metadata) {
              // Check if user logged in via Twitch
              if (metadata.identities && metadata.identities.length > 0) {
                const twitchIdentity = metadata.identities.find(i => i.provider === 'twitch');
                if (twitchIdentity?.identity_data) {
                  twitchUsername = twitchIdentity.identity_data.preferred_username || 
                                  twitchIdentity.identity_data.user_name ||
                                  twitchIdentity.identity_data.full_name;
                }
              }
              // Fallback to user_metadata
              if (twitchUsername === 'Player' && metadata.user_metadata) {
                twitchUsername = metadata.user_metadata.preferred_username || 
                                metadata.user_metadata.user_name ||
                                metadata.user_metadata.full_name ||
                                metadata.email?.split('@')[0] ||
                                'Player';
              }
            }
            
            return {
              ...playerData,
              username: twitchUsername,
              net_worth: (playerData.cash || 0) + (playerData.bank_balance || 0)
            };
          })
        );
        setLeaderboard(enrichedData);
      } else {
        setLeaderboard([]);
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setLeaderboard([]);
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
        <img src="/thelife/thelife.png" alt="The Life" className="game-logo" />
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

        {/* Quick Access Buttons Inside Stats Card */}
        <div className="quick-access-tabs-inline">
          <button 
            className={`quick-tab-inline ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            🏆 Leaderboard
          </button>
          <button 
            className={`quick-tab-inline ${activeTab === 'bank' ? 'active' : ''}`}
            onClick={() => !isInJail && setActiveTab('bank')}
            disabled={isInJail}
            style={{opacity: isInJail ? 0.5 : 1, cursor: isInJail ? 'not-allowed' : 'pointer'}}
          >
            🏦 Bank
          </button>
          <button 
            className={`quick-tab-inline ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📊 Stats
          </button>
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
          className={`tab tab-image ${activeTab === 'crimes' ? 'active' : ''}`}
          onClick={() => !isInJail && setActiveTab('crimes')}
          disabled={isInJail}
          style={{opacity: isInJail ? 0.5 : 1, cursor: isInJail ? 'not-allowed' : 'pointer'}}
        >
          <img src="/thelife/crimes.png" alt="Crimes" />
        </button>
        <button 
          className={`tab tab-image ${activeTab === 'pvp' ? 'active' : ''}`}
          onClick={() => !isInJail && setActiveTab('pvp')}
          disabled={isInJail}
          style={{opacity: isInJail ? 0.5 : 1, cursor: isInJail ? 'not-allowed' : 'pointer'}}
        >
          <img src="/thelife/pvp.png" alt="PvP" />
        </button>
        <button
          className={`tab tab-image ${activeTab === 'businesses' ? 'active' : ''}`}
          onClick={() => !isInJail && setActiveTab('businesses')}
          disabled={isInJail}
          style={{opacity: isInJail ? 0.5 : 1, cursor: isInJail ? 'not-allowed' : 'pointer'}}
        >
          <img src="/thelife/businesses.png" alt="Businesses" />
        </button>
        <button 
          className={`tab tab-image ${activeTab === 'brothel' ? 'active' : ''}`}
          onClick={() => !isInJail && setActiveTab('brothel')}
          disabled={isInJail}
          style={{opacity: isInJail ? 0.5 : 1, cursor: isInJail ? 'not-allowed' : 'pointer'}}
        >
          <img src="/thelife/brothel.png" alt="Brothel" />
        </button>
        <button 
          className={`tab tab-image ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => !isInJail && setActiveTab('inventory')}
          disabled={isInJail}
          style={{opacity: isInJail ? 0.5 : 1, cursor: isInJail ? 'not-allowed' : 'pointer'}}
        >
          <img src="/thelife/Inventory.png" alt="Inventory" />
        </button>
        <button 
          className={`tab tab-image ${activeTab === 'jail' ? 'active' : ''}`}
          onClick={() => setActiveTab('jail')}
        >
          <img src="/thelife/Jail.png" alt="Jail" />
        </button>
        <button 
          className={`tab tab-image ${activeTab === 'hospital' ? 'active' : ''}`}
          onClick={() => setActiveTab('hospital')}
        >
          <img src="/thelife/Hospital.png" alt="Hospital" />
        </button>
        <button 
          className={`tab tab-image ${activeTab === 'market' ? 'active' : ''}`}
          onClick={() => !isInJail && !isInHospital && setActiveTab('market')}
        >
          <img src="/thelife/BlackMarket.png" alt="Black Market" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Jail Screen - Overrides all tabs when player is in jail */}
        {isInJail ? (
          <div className="jail-section">
            <div className="jail-container">
              <div className="jail-icon">🔒</div>
              <h1 className="jail-title">YOU ARE IN JAIL</h1>
              <p className="jail-message">You were caught committing a crime and must serve your time.</p>
              
              <div className="jail-timer">
                <div className="timer-label">Time Remaining:</div>
                <div className="timer-display">
                  {jailTimeRemaining ? (
                    <>
                      <span className="timer-number">{String(jailTimeRemaining.minutes).padStart(2, '0')}</span>
                      <span className="timer-separator">:</span>
                      <span className="timer-number">{String(jailTimeRemaining.seconds).padStart(2, '0')}</span>
                    </>
                  ) : (
                    <span className="timer-number">Loading...</span>
                  )}
                </div>
                <div className="timer-units">minutes : seconds</div>
              </div>

              <div className="jail-info">
                <p>⚠️ You cannot access any game features while in jail.</p>
                <p>💡 Wait for the timer to reach zero to continue playing.</p>
                <p>🎯 Be more careful next time!</p>
              </div>

              {/* Escape Options */}
              <div className="jail-escape-options">
                {/* Jail Free Card Option */}
                {theLifeInventory.some(inv => inv.item?.name === 'Jail Free Card' && inv.quantity > 0) && (
                  <div className="jail-escape-option">
                    <h4>🔓 Jail Free Card</h4>
                    <p>Use your legendary card to escape instantly!</p>
                    <p className="escape-cost">Cost: 1 Jail Free Card</p>
                    <button onClick={useJailFreeCard} className="escape-jail-btn card-btn">
                      Use Jail Free Card
                    </button>
                  </div>
                )}

                {/* Bribe Option */}
                {(() => {
                  const { bribeAmount, percentage } = calculateBribeAmount();
                  const totalWealth = (player.cash || 0) + (player.bank_balance || 0);
                  const canAfford = totalWealth >= bribeAmount;
                  
                  return (
                    <div className="jail-escape-option">
                      <h4>💰 Bribe the Cops</h4>
                      <p>Pay off the police to look the other way...</p>
                      <p className="escape-cost">
                        Cost: ${bribeAmount.toLocaleString()} ({percentage}% of your wealth)
                      </p>
                      <p className="escape-info">
                        💡 Longer jail time = Higher bribe cost
                      </p>
                      <button 
                        onClick={payBribe} 
                        className={`escape-jail-btn bribe-btn ${!canAfford ? 'disabled' : ''}`}
                        disabled={!canAfford}
                      >
                        {canAfford ? 'Pay Bribe' : 'Not Enough Money'}
                      </button>
                    </div>
                  );
                })()}
              </div>

              <div className="jail-release-time">
                Release time: {new Date(player.jail_until).toLocaleString()}
              </div>
            </div>
          </div>
        ) : (
          <>
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
                
                // HP affects success rate
                const hpPercentage = player.hp / player.max_hp;
                if (hpPercentage < 0.5) {
                  const hpPenalty = (0.5 - hpPercentage) * 30;
                  displaySuccessChance -= hpPenalty;
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
                      <div className="crime-overlay-top">
                        <h3 className="crime-title">{robbery.name}</h3>
                        <div className="crime-inline-stats">
                          <span className="inline-stat">🎫 {robbery.ticket_cost}</span>
                          <span className="inline-stat">✅ {Math.round(displaySuccessChance)}%</span>
                        </div>
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
                <div className="amount-input-group">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Enter amount..."
                    min="0"
                    max={player?.cash || 0}
                    className="amount-input"
                  />
                  <button 
                    onClick={() => {
                      const amount = parseInt(depositAmount);
                      if (amount > 0) {
                        depositToBank(amount);
                        setDepositAmount('');
                      }
                    }}
                    disabled={!depositAmount || parseInt(depositAmount) <= 0 || parseInt(depositAmount) > player?.cash}
                    className="deposit-btn"
                  >
                    Deposit
                  </button>
                </div>
                <button onClick={() => {
                  depositToBank(player.cash);
                  setDepositAmount('');
                }} className="deposit-all-btn">Deposit All</button>
              </div>
              <div className="bank-action">
                <h3>Withdraw</h3>
                <p>Bank balance: ${player?.bank_balance?.toLocaleString()}</p>
                <div className="amount-input-group">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount..."
                    min="0"
                    max={player?.bank_balance || 0}
                    className="amount-input"
                  />
                  <button 
                    onClick={() => {
                      const amount = parseInt(withdrawAmount);
                      if (amount > 0) {
                        withdrawFromBank(amount);
                        setWithdrawAmount('');
                      }
                    }}
                    disabled={!withdrawAmount || parseInt(withdrawAmount) <= 0 || parseInt(withdrawAmount) > player?.bank_balance}
                    className="withdraw-btn"
                  >
                    Withdraw
                  </button>
                </div>
                <button onClick={() => {
                  withdrawFromBank(player.bank_balance);
                  setWithdrawAmount('');
                }} className="withdraw-all-btn">Withdraw All</button>
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
            <p>Start businesses and earn items. Higher levels unlock more profitable ventures.</p>
            <div className="business-slots-info">
              <span className="slots-label">Business Slots:</span>
              <span className="slots-count">{ownedBusinesses.length} / {getMaxBusinessSlots(player?.level || 1)}</span>
              {getMaxBusinessSlots(player?.level || 1) < 7 && (
                <span className="slots-hint">💡 Gain 1 slot every 5 levels (max 7)</span>
              )}
            </div>
            <div className="businesses-grid">
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
                    </div>
                    <h3>{business.item?.icon || '💼'} {business.name}</h3>
                    {!ownsIt ? (
                      <>
                        <p>Purchase Price: ${business.purchase_price?.toLocaleString() || '5,000'}</p>
                        <p className="description">{business.description}</p>
                        {meetsLevel ? (
                          <button 
                            onClick={() => buyBusiness(business)} 
                            disabled={player?.cash < (business.purchase_price || 5000)}
                            className="hire-btn"
                          >
                            {player?.cash >= (business.purchase_price || 5000) ? 
                              `Buy Business ($${(business.purchase_price || 5000).toLocaleString()})` : 
                              'Not Enough Cash'
                            }
                          </button>
                        ) : (
                          <p className="locked">🔒 Level {business.min_level_required} Required</p>
                        )}
                      </>
                    ) : (
                      <>
                        {(() => {
                          const ownedBusiness = ownedBusinesses.find(ob => ob.business_id === business.id);
                          const upgradeLevel = ownedBusiness?.upgrade_level || 1;
                          const upgradeCost = getUpgradeCost(business, upgradeLevel);
                          const quantityMultiplier = 1 + ((upgradeLevel - 1) * 0.5);
                          const cashMultiplier = 1 + ((upgradeLevel - 1) * 0.3);
                          
                          return (
                            <>
                              <div className="business-level-badge">Level {upgradeLevel}/10</div>
                              <p>Production Cost: ${productionCost.toLocaleString()} + 5 tickets</p>
                              <p>
                                {business.reward_item_id ? 
                                  `Reward: ${Math.floor((business.reward_item_quantity || 1) * quantityMultiplier)}x Items` :
                                  `Profit: $${Math.floor((business.profit || 0) * cashMultiplier).toLocaleString()}`
                                } | Time: {business.duration_minutes}m
                              </p>
                              {meetsLevel ? (
                                <>
                                  {isRunning ? (
                                    <>
                                      <p>Status: {isReady ? 'Ready!' : 'Producing...'}</p>
                                      {isReady ? (
                                        <button 
                                          onClick={() => collectBusiness(business)} 
                                          className="collect-btn"
                                        >
                                          {business.reward_item_id ?
                                            `Collect Items` :
                                            `Collect $${Math.floor((business.profit || 0) * cashMultiplier).toLocaleString()}`
                                          }
                                        </button>
                                      ) : (
                                        <p className="timer">
                                          {Math.ceil((new Date(completedAt) - new Date()) / 60000)} min left
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <button 
                                      onClick={() => startBusiness(business)} 
                                      disabled={player?.cash < productionCost || player?.tickets < 5}
                                    >
                                      Start Production (${productionCost.toLocaleString()})
                                    </button>
                                  )}
                                  {upgradeLevel < 10 && (
                                    <button 
                                      onClick={() => upgradeBusiness(business)}
                                      disabled={player?.cash < upgradeCost}
                                      className="upgrade-business-btn"
                                    >
                                      Upgrade to Lvl {upgradeLevel + 1} (${upgradeCost.toLocaleString()})
                                    </button>
                                  )}
                                  <button 
                                    onClick={async () => {
                                      const sellPrice = Math.floor((business.purchase_price || 5000) / 3);
                                      if (window.confirm(`Sell ${business.name} for $${sellPrice.toLocaleString()}? (1/3 of purchase price)`)) {
                                        const ownedBusiness = ownedBusinesses.find(ob => ob.business_id === business.id);
                                        if (ownedBusiness) {
                                          const { error } = await supabase
                                            .from('the_life_player_businesses')
                                            .delete()
                                            .eq('id', ownedBusiness.id);
                                          
                                          if (!error) {
                                            await supabase
                                              .from('the_life_players')
                                              .update({ cash: player.cash + sellPrice })
                                              .eq('user_id', user.id);
                                            
                                            setMessage({ type: 'success', text: `Sold ${business.name} for $${sellPrice.toLocaleString()}!` });
                                            loadPlayer();
                                            loadOwnedBusinesses();
                                            loadDrugOps();
                                          }
                                        }
                                      }
                                    }}
                                    className="sell-business-btn"
                                  >
                                    Sell Business (${Math.floor((business.purchase_price || 5000) / 3).toLocaleString()})
                                  </button>
                                </>
                              ) : (
                                <p className="locked">🔒 Level {business.min_level_required} Required</p>
                              )}
                            </>
                          );
                        })()}
                      </>
                    )}
                  </div>
                );
              })}
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
                    <h3>Worker Slots</h3>
                    <p className="big-number">
                      {brothel.workers || 0}/{((brothel.worker_slots || 3) + (brothel.additional_slots || 0))} 👯
                    </p>
                    <small style={{color: '#a0aec0', fontSize: '0.75rem'}}>
                      Base: {brothel.worker_slots || 3} + Upgrades: {brothel.additional_slots || 0}
                    </small>
                  </div>
                  <div className="brothel-stat">
                    <h3>Income Per Hour</h3>
                    <p className="big-number">${brothel.income_per_hour?.toLocaleString()}</p>
                  </div>
                  <div className="brothel-stat">
                    <h3>Available to Collect</h3>
                    <p className="big-number collectible-amount">
                      ${(() => {
                        if (!brothel.last_collection) return 0;
                        const lastCollection = new Date(brothel.last_collection);
                        const now = new Date();
                        const hoursPassed = (now - lastCollection) / 1000 / 60 / 60;
                        const income = Math.floor(hoursPassed * brothel.income_per_hour);
                        return income.toLocaleString();
                      })()}
                    </p>
                  </div>
                  <div className="brothel-stat">
                    <h3>Total Earned</h3>
                    <p className="big-number">${brothel.total_earned?.toLocaleString()}</p>
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
                          ({brothel.workers || 0}/{((brothel.worker_slots || 3) + (brothel.additional_slots || 0))} Slots)
                        </span>
                      </span>
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
                    </h3>
                    {showHiredWorkers && (
                      <div className="hired-workers-grid">
                        {hiredWorkers.map(hw => (
                          <div key={hw.id} className="hired-worker-card">
                            <div className="hired-worker-image">
                              <img src={hw.worker.image_url} alt={hw.worker.name} />
                            </div>
                            <div className="hired-worker-info">
                              <h4>{hw.worker.name}</h4>
                              <p className="income-rate">${hw.worker.income_per_hour}/hour</p>
                              <p className="rarity-badge rarity-{hw.worker.rarity}">{hw.worker.rarity}</p>
                              <button 
                                onClick={() => sellWorker(hw)}
                                style={{
                                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                  color: 'white',
                                  border: 'none',
                                  padding: '8px 15px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                  fontWeight: 'bold',
                                  marginTop: '10px',
                                  width: '100%',
                                  transition: 'all 0.3s'
                                }}
                                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                              >
                                💰 Sell (${Math.floor(hw.worker.hire_cost / 3).toLocaleString()})
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="brothel-actions">
                  <button onClick={collectBrothelIncome} className="collect-btn">
                    💰 Collect Income
                  </button>
                  {player?.level >= 5 && (() => {
                    const currentTotal = (brothel.worker_slots || 3) + (brothel.additional_slots || 0);
                    const maxReached = currentTotal >= 50;
                    return (
                      <button 
                        onClick={upgradeBrothelSlots} 
                        className="upgrade-slots-btn"
                        disabled={maxReached || player.cash < (brothel.slots_upgrade_cost || 50000)}
                      >
                        {maxReached ? '✅ Max Slots Reached (50)' : `⬆️ Upgrade Slots (+2) - $${(brothel.slots_upgrade_cost || 50000).toLocaleString()}`}
                      </button>
                    );
                  })()}
                </div>

                <h3>🎯 Available Workers</h3>
                {(() => {
                  const totalSlots = (brothel?.worker_slots || 3) + (brothel?.additional_slots || 0);
                  const usedSlots = brothel?.workers || 0;
                  const slotsFull = usedSlots >= totalSlots;
                  
                  return slotsFull && (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '2px solid rgba(239, 68, 68, 0.5)',
                      borderRadius: '8px',
                      padding: '15px',
                      marginBottom: '20px',
                      textAlign: 'center'
                    }}>
                      <p style={{ color: '#fca5a5', margin: 0, fontWeight: 'bold' }}>
                        ⚠️ All worker slots full! {player?.level >= 5 ? 'Upgrade your brothel to hire more workers.' : 'Level up or upgrade your brothel to get more slots.'}
                      </p>
                    </div>
                  );
                })()}
                <div className="workers-grid">
                  {availableWorkers.map(worker => {
                    const hiredCount = hiredWorkers.filter(hw => hw.worker_id === worker.id).length;
                    const canAfford = player?.cash >= worker.hire_cost;
                    const meetsLevel = player?.level >= worker.min_level_required;
                    const totalSlots = (brothel?.worker_slots || 3) + (brothel?.additional_slots || 0);
                    const usedSlots = brothel?.workers || 0;
                    const slotsFull = usedSlots >= totalSlots;

                    return (
                      <div key={worker.id} className="worker-card">
                        <div className="worker-image-container">
                          <img src={worker.image_url} alt={worker.name} className="worker-image" />
                          {hiredCount > 0 && (
                            <div className="hired-badge">HIRED x{hiredCount}</div>
                          )}
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
                          {slotsFull ? (
                            <button disabled className="locked-btn">🚫 No Slots Available</button>
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
                <img src="https://imagens.publico.pt/imagens.aspx/1352137?tp=UH&db=IMAGENS&type=JPG" alt="Start Brothel" className="brothel-init-image" />
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
            <h2>🎒 Your Inventory</h2>
            <p>Items you've collected from businesses and activities</p>
            {theLifeInventory.length === 0 ? (
              <p className="no-items">No items yet. Run businesses to earn items!</p>
            ) : (
              <div className="equipment-grid">
                {theLifeInventory.map(inv => (
                  <div key={inv.id} className="equipment-card">
                    <div className="item-rarity-badge" style={{
                      backgroundColor: inv.item.rarity === 'legendary' ? '#FFD700' :
                                     inv.item.rarity === 'epic' ? '#9C27B0' :
                                     inv.item.rarity === 'rare' ? '#2196F3' : '#666'
                    }}>
                      {inv.item.rarity}
                    </div>
                    <div className="item-image-container">
                      <img 
                        src={inv.item.icon || 'https://images.unsplash.com/photo-1606400082777-ef05f3c5cde9?w=400'} 
                        alt={inv.item.name}
                        className="item-image"
                      />
                    </div>
                    <h4>{inv.item.name}</h4>
                    <p className="item-description">{inv.item.description}</p>
                    <p className="item-quantity">Quantity: {inv.quantity}</p>
                    {inv.item.type === 'special' && inv.item.usable && (
                      <button 
                        onClick={() => {
                          if (inv.item.name === 'Jail Free Card') {
                            useJailFreeCard();
                          }
                        }}
                        className="use-item-btn"
                      >
                        Use Item
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'jail' && (
          <div className="jail-info-section">
            <h2>🔒 Jail System</h2>
            <p>When you fail a crime, you might get sent to jail.</p>
            
            {isInJail ? (
              <div className="jail-active">
                <div className="jail-status">
                  <h3>⚠️ YOU ARE IN JAIL</h3>
                  <p>Time Remaining: {jailTimeRemaining ? `${jailTimeRemaining.minutes}m ${jailTimeRemaining.seconds}s` : 'Loading...'}</p>
                </div>
                
                <div className="jail-escape-options">
                  {/* Jail Free Card Option */}
                  {theLifeInventory.some(inv => inv.item?.name === 'Jail Free Card' && inv.quantity > 0) && (
                    <div className="jail-escape-option">
                      <h4>🔓 Jail Free Card</h4>
                      <p>Use your legendary card to escape instantly!</p>
                      <p className="escape-cost">Cost: 1 Jail Free Card</p>
                      <button onClick={useJailFreeCard} className="escape-jail-btn card-btn">
                        Use Jail Free Card
                      </button>
                    </div>
                  )}

                  {/* Bribe Option */}
                  {(() => {
                    const { bribeAmount, percentage } = calculateBribeAmount();
                    const totalWealth = (player.cash || 0) + (player.bank_balance || 0);
                    const canAfford = totalWealth >= bribeAmount;
                    
                    return (
                      <div className="jail-escape-option">
                        <h4>💰 Bribe the Cops</h4>
                        <p>Pay off the police to look the other way...</p>
                        <p className="escape-cost">
                          Cost: ${bribeAmount.toLocaleString()} ({percentage}% of your wealth)
                        </p>
                        <p className="escape-info">
                          💡 Longer jail time = Higher bribe cost
                        </p>
                        <button 
                          onClick={payBribe} 
                          className={`escape-jail-btn bribe-btn ${!canAfford ? 'disabled' : ''}`}
                          disabled={!canAfford}
                        >
                          {canAfford ? 'Pay Bribe' : 'Not Enough Money'}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="jail-info">
                <div className="info-card">
                  <h3>How Jail Works</h3>
                  <ul>
                    <li>🎲 Failing crimes can send you to jail</li>
                    <li>⏰ Jail time varies by crime severity</li>
                    <li>🚫 You can't do anything while in jail</li>
                    <li>🔓 Two ways to escape early:</li>
                    <ul>
                      <li>💳 Use a Jail Free Card (instant)</li>
                      <li>💰 Bribe the cops (costs % of wealth)</li>
                    </ul>
                  </ul>
                </div>

                <div className="info-card">
                  <h3>💳 Jail Free Card</h3>
                  <p>This legendary item instantly releases you from jail!</p>
                  <p>You currently have: {theLifeInventory.find(inv => inv.item?.name === 'Jail Free Card')?.quantity || 0} cards</p>
                  <p className="hint">💡 These are rare - use them wisely!</p>
                </div>

                <div className="info-card">
                  <h3>💰 Bribe System</h3>
                  <p>You can always pay a bribe to escape jail early.</p>
                  <p>💸 Cost: 5% - 50% of your total wealth (cash + bank)</p>
                  <p>⏱️ Longer sentences require higher bribes</p>
                  <p className="hint">💡 Formula: 5% base + 2% per 30 minutes (max 50%)</p>
                </div>
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

        {activeTab === 'hospital' && (
          <div className="hospital-section">
            <h2>🏥 Hospital</h2>
            {player?.hp === 0 ? (
              <div className="hospital-emergency">
                <div className="hospital-status">
                  <h3>💀 Critical Condition!</h3>
                  <p>Your HP is at 0. You need immediate medical attention!</p>
                </div>
                <div className="recovery-option">
                  <h4>🚑 Emergency Recovery</h4>
                  <p>Restore to full HP instantly</p>
                  {(() => {
                    const recoveryCost = Math.floor((player.cash + player.bank_balance) * 0.15);
                    return (
                      <>
                        <div className="recovery-cost">
                          Cost: ${recoveryCost.toLocaleString()} (15% of total wealth)
                        </div>
                        <button 
                          className="recovery-btn"
                          onClick={async () => {
                            const totalWealth = player.cash + player.bank_balance;
                            if (totalWealth < recoveryCost) {
                              setMessage({ type: 'error', text: 'Not enough money for recovery!' });
                              return;
                            }
                            
                            let newCash = player.cash;
                            let newBank = player.bank_balance;
                            
                            // Deduct from cash first, then bank if needed
                            if (player.cash >= recoveryCost) {
                              newCash -= recoveryCost;
                            } else {
                              const remaining = recoveryCost - player.cash;
                              newCash = 0;
                              newBank -= remaining;
                            }
                            
                            const { data, error } = await supabase
                              .from('the_life_players')
                              .update({
                                hp: player.max_hp,
                                cash: newCash,
                                bank_balance: newBank,
                                hospital_until: null
                              })
                              .eq('user_id', user.id)
                              .select()
                              .single();
                            
                            if (!error) {
                              setPlayer(data);
                              setMessage({ type: 'success', text: 'Fully recovered! You\'re back in action!' });
                            }
                          }}
                          disabled={player.cash + player.bank_balance < recoveryCost}
                        >
                          Pay for Recovery
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : isInHospital ? (
              <div className="hospital-active">
                <div className="hospital-status">
                  <h3>🤕 You are recovering...</h3>
                  <p>You were beaten up or lost all your HP</p>
                  <div className="hospital-timer">
                    <span className="timer-label">Release Time:</span>
                    <span className="timer-value">{new Date(player.hospital_until).toLocaleString()}</span>
                  </div>
                </div>
                <div className="hospital-info">
                  <p>💊 Rest up and recover your strength</p>
                  <p>⏰ You'll be released automatically when the timer expires</p>
                </div>
              </div>
            ) : (
              <div className="hospital-info">
                <h3>💊 Medical Services</h3>
                <p>Purchase medical services to restore your HP</p>
                
                <div className="hospital-services">
                  <div className="service-item">
                    <div className="service-icon">💊</div>
                    <h4>Small Med Kit</h4>
                    <p>Restores 25 HP</p>
                    <div className="service-price">$500</div>
                    <button 
                      className="service-buy-btn"
                      onClick={async () => {
                        if (player.cash < 500) {
                          setMessage({ type: 'error', text: 'Not enough cash!' });
                          return;
                        }
                        const { data, error } = await supabase
                          .from('the_life_players')
                          .update({
                            cash: player.cash - 500,
                            hp: Math.min(player.max_hp, player.hp + 25)
                          })
                          .eq('user_id', user.id)
                          .select()
                          .single();
                        if (!error) {
                          setPlayer(data);
                          setMessage({ type: 'success', text: 'Restored 25 HP!' });
                        }
                      }}
                      disabled={player.cash < 500 || player.hp >= player.max_hp}
                    >
                      Buy
                    </button>
                  </div>

                  <div className="service-item">
                    <div className="service-icon">💉</div>
                    <h4>Large Med Kit</h4>
                    <p>Restores 50 HP</p>
                    <div className="service-price">$900</div>
                    <button 
                      className="service-buy-btn"
                      onClick={async () => {
                        if (player.cash < 900) {
                          setMessage({ type: 'error', text: 'Not enough cash!' });
                          return;
                        }
                        const { data, error } = await supabase
                          .from('the_life_players')
                          .update({
                            cash: player.cash - 900,
                            hp: Math.min(player.max_hp, player.hp + 50)
                          })
                          .eq('user_id', user.id)
                          .select()
                          .single();
                        if (!error) {
                          setPlayer(data);
                          setMessage({ type: 'success', text: 'Restored 50 HP!' });
                        }
                      }}
                      disabled={player.cash < 900 || player.hp >= player.max_hp}
                    >
                      Buy
                    </button>
                  </div>

                  <div className="service-item">
                    <div className="service-icon">🧪</div>
                    <h4>Full Recovery</h4>
                    <p>Restores to MAX HP</p>
                    <div className="service-price">$1,500</div>
                    <button 
                      className="service-buy-btn"
                      onClick={async () => {
                        if (player.cash < 1500) {
                          setMessage({ type: 'error', text: 'Not enough cash!' });
                          return;
                        }
                        const { data, error } = await supabase
                          .from('the_life_players')
                          .update({
                            cash: player.cash - 1500,
                            hp: player.max_hp
                          })
                          .eq('user_id', user.id)
                          .select()
                          .single();
                        if (!error) {
                          setPlayer(data);
                          setMessage({ type: 'success', text: 'Fully restored!' });
                        }
                      }}
                      disabled={player.cash < 1500 || player.hp >= player.max_hp}
                    >
                      Buy
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'market' && (
          <div className="market-section">
            <h2>🛒 Black Market</h2>
            <p>Illegal operations, supplies, and drug trafficking</p>
            
            {/* Market Sub-tabs */}
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

            {/* Street Resell */}
            {marketSubTab === 'resell' && (
              <div className="market-content">
                <h3>🚶 Street Resell</h3>
                <p className="market-warning">⚠️ High risk! Sell drugs one by one for maximum profit, but risk jail time</p>
                {theLifeInventory.filter(inv => inv.item.type === 'drug').length === 0 ? (
                  <p className="no-items">You have no drugs to sell on the streets</p>
                ) : (
                  <div className="market-items-grid">
                    {theLifeInventory.filter(inv => inv.item.type === 'drug').map(inv => {
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
                            onClick={async () => {
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
                                  
                                  // Show event popup for street bust
                                  showEventMessage('jail_street');
                                  
                                  setMessage({ type: 'error', text: `Busted! Cops confiscated your drugs. ${jailTime} min in jail, lost 15 HP!` });
                                  loadPlayer();
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
                                  loadPlayer();
                                  loadTheLifeInventory();
                                }
                              }
                            }}
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

            {/* Monhe Store */}
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
                      onClick={async () => {
                        if (player.cash < 500) {
                          setMessage({ type: 'error', text: 'Not enough cash!' });
                          return;
                        }
                        const { error } = await supabase
                          .from('the_life_players')
                          .update({
                            cash: player.cash - 500,
                            hp: Math.min(player.max_hp, player.hp + 25)
                          })
                          .eq('user_id', user.id);
                        if (!error) {
                          setMessage({ type: 'success', text: 'Restored 25 HP!' });
                          loadPlayer();
                        }
                      }}
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
                      onClick={async () => {
                        if (player.cash < 900) {
                          setMessage({ type: 'error', text: 'Not enough cash!' });
                          return;
                        }
                        const { error } = await supabase
                          .from('the_life_players')
                          .update({
                            cash: player.cash - 900,
                            hp: Math.min(player.max_hp, player.hp + 50)
                          })
                          .eq('user_id', user.id);
                        if (!error) {
                          setMessage({ type: 'success', text: 'Restored 50 HP!' });
                          loadPlayer();
                        }
                      }}
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
                      onClick={async () => {
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
                          loadPlayer();
                        }
                      }}
                      disabled={player.cash < 1500}
                    >
                      Buy
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Docks */}
            {marketSubTab === 'docks' && (
              <div className="market-content">
                <h3>🚢 The Docks</h3>
                <p>Ship drugs in bulk - 0 risk, cheaper prices, 2 shipments per day</p>
                {(() => {
                  const today = new Date().toDateString();
                  const lastDockUse = player?.last_dock_date ? new Date(player.last_dock_date).toDateString() : null;
                  const usesToday = (lastDockUse === today) ? (player?.dock_uses_today || 0) : 0;
                  const usesRemaining = 2 - usesToday;
                  
                  return (
                    <>
                      <div className="dock-info">
                        <span className="dock-uses">📦 Shipments Today: {usesToday}/2</span>
                        <span className="dock-remaining">Remaining: {usesRemaining}</span>
                      </div>
                      {theLifeInventory.filter(inv => inv.item.type === 'drug').length === 0 ? (
                        <p className="no-items">You have no drugs to ship</p>
                      ) : usesRemaining <= 0 ? (
                        <p className="no-items">No more shipments available today. Come back tomorrow!</p>
                      ) : (
                        <div className="market-items-grid">
                          {theLifeInventory.filter(inv => inv.item.type === 'drug').map(inv => {
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
                                  onClick={async () => {
                                    const newUsesToday = (lastDockUse === today ? usesToday : 0) + 1;
                                    
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
                                      loadPlayer();
                                      loadTheLifeInventory();
                                    }
                                  }}
                                >
                                  Ship Cargo
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
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
        </>
        )}
      </div>

      {/* Event Popup Modal */}
      {showEventPopup && eventPopupData && (
        <div className="event-popup-overlay" onClick={() => setShowEventPopup(false)}>
          <div className="event-popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="event-popup-close" onClick={() => setShowEventPopup(false)}>×</button>
            <div className="event-popup-image">
              <img src={eventPopupData.image_url} alt="Event" />
            </div>
            <div className="event-popup-message">
              <p>{eventPopupData.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
