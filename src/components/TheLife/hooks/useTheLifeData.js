import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';

/**
 * Custom hook that manages all The Life game data and state
 * This centralizes data fetching and state management for all category components
 */
export const useTheLifeData = (user) => {
  // Core player state
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Tab management
  const [activeTab, setActiveTab] = useState('crimes');
  
  // Category-specific state
  const [robberies, setRobberies] = useState([]);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [ownedBusinesses, setOwnedBusinesses] = useState([]);
  const [drugOps, setDrugOps] = useState([]);
  const [brothel, setBrothel] = useState(null);
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [hiredWorkers, setHiredWorkers] = useState([]);
  const [showHiredWorkers, setShowHiredWorkers] = useState(true);
  const [theLifeInventory, setTheLifeInventory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [jailTimeRemaining, setJailTimeRemaining] = useState(null);
  const [hospitalTimeRemaining, setHospitalTimeRemaining] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [marketSubTab, setMarketSubTab] = useState('store');
  const [showEventPopup, setShowEventPopup] = useState(false);
  const [eventPopupData, setEventPopupData] = useState(null);
  const [categoryInfo, setCategoryInfo] = useState({});

  // Initialize player data
  const initializePlayer = async () => {
    try {
      let { data: playerData, error } = await supabase
        .from('the_life_players')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
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
      await claimDailyBonus(1);
      return;
    }

    const lastBonusDate = new Date(lastBonus);
    const hoursSinceBonus = (now - lastBonusDate) / 1000 / 60 / 60;

    if (hoursSinceBonus >= 24 && hoursSinceBonus < 48) {
      await claimDailyBonus(playerData.consecutive_logins + 1);
    } else if (hoursSinceBonus >= 48) {
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
    }, 60000);

    return () => clearInterval(interval);
  };

  // Load functions for different categories
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

  const loadOnlinePlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('the_life_players')
        .select('id, user_id, level, xp, cash, bank_balance, pvp_wins, pvp_losses')
        .neq('user_id', user.id)
        .gte('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .limit(20);

      if (error) throw error;

      // Enrich with usernames
      if (data && data.length > 0) {
        const enrichedData = await Promise.all(
          data.map(async (playerData) => {
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
              if (metadata.identities && metadata.identities.length > 0) {
                const twitchIdentity = metadata.identities.find(i => i.provider === 'twitch');
                if (twitchIdentity?.identity_data) {
                  twitchUsername = twitchIdentity.identity_data.preferred_username || 
                                  twitchIdentity.identity_data.user_name ||
                                  twitchIdentity.identity_data.full_name;
                }
              }
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
        setOnlinePlayers(enrichedData);
      } else {
        setOnlinePlayers([]);
      }
    } catch (err) {
      console.error('Error loading online players:', err);
    }
  };

  const loadDrugOps = async () => {
    try {
      const { data: playerData } = await supabase
        .from('the_life_players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!playerData) return;

      const { data, error } = await supabase
        .from('the_life_business_productions')
        .select('*')
        .eq('player_id', playerData.id)
        .eq('collected', false);

      if (error && error.code !== 'PGRST116') throw error;
      
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

      if (data && data.length > 0) {
        const enrichedData = await Promise.all(
          data.map(async (playerData) => {
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
              if (metadata.identities && metadata.identities.length > 0) {
                const twitchIdentity = metadata.identities.find(i => i.provider === 'twitch');
                if (twitchIdentity?.identity_data) {
                  twitchUsername = twitchIdentity.identity_data.preferred_username || 
                                  twitchIdentity.identity_data.user_name ||
                                  twitchIdentity.identity_data.full_name;
                }
              }
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

  const loadCategoryInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('the_life_category_info')
        .select('*');

      if (error) {
        console.warn('Category info not available:', error.message);
        setCategoryInfo({});
        return;
      }
      
      // Convert array to object keyed by category_key
      const infoMap = {};
      data?.forEach(item => {
        infoMap[item.category_key] = item;
      });
      setCategoryInfo(infoMap);
    } catch (err) {
      console.error('Error loading category info:', err);
      setCategoryInfo({});
    }
  };

  // Initialize data on mount
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
      loadCategoryInfo();
      startTicketRefill();
    }
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('thelife-changes')
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
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'the_life_category_info' 
        }, 
        (payload) => {
          console.log('Category info changed, reloading...', payload);
          loadCategoryInfo();
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
        initializePlayer();
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setJailTimeRemaining({ minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player?.jail_until]);

  // Hospital countdown timer
  useEffect(() => {
    if (!player?.hospital_until) return;

    const interval = setInterval(() => {
      const now = new Date();
      const hospitalEnd = new Date(player.hospital_until);
      const diff = hospitalEnd - now;

      if (diff <= 0) {
        setHospitalTimeRemaining(null);
        initializePlayer();
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setHospitalTimeRemaining({ minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player?.hospital_until]);

  return {
    // State
    player,
    setPlayer,
    loading,
    message,
    setMessage,
    activeTab,
    setActiveTab,
    robberies,
    onlinePlayers,
    businesses,
    ownedBusinesses,
    drugOps,
    setDrugOps,
    brothel,
    setBrothel,
    availableWorkers,
    hiredWorkers,
    showHiredWorkers,
    setShowHiredWorkers,
    theLifeInventory,
    leaderboard,
    jailTimeRemaining,
    hospitalTimeRemaining,
    depositAmount,
    setDepositAmount,
    withdrawAmount,
    setWithdrawAmount,
    marketSubTab,
    setMarketSubTab,
    showEventPopup,
    setShowEventPopup,
    eventPopupData,
    categoryInfo,
    
    // Load functions
    initializePlayer,
    loadRobberies,
    loadBusinesses,
    loadOwnedBusinesses,
    loadTheLifeInventory,
    loadOnlinePlayers,
    loadDrugOps,
    loadBrothel,
    loadAvailableWorkers,
    loadHiredWorkers,
    loadLeaderboard,
    loadCategoryInfo,
    showEventMessage
  };
};
