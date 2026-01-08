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
        // Get username from user_profiles or user metadata
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('twitch_username')
          .eq('user_id', user.id)
          .single();

        const { data: newPlayer, error: createError } = await supabase
          .from('the_life_players')
          .insert({
            user_id: user.id,
            xp: 0,
            level: 1,
            hp: 100,
            max_hp: 100,
            stamina: 300,
            max_stamina: 300,
            cash: 500,
            bank_balance: 0,
            twitch_username: profileData?.twitch_username || user?.user_metadata?.preferred_username || null
          })
          .select()
          .single();

        if (createError) throw createError;
        playerData = newPlayer;
      } else if (playerData && !playerData.twitch_username) {
        // Update existing player with username if missing
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('twitch_username')
          .eq('user_id', user.id)
          .single();

        const updates = {};
        if (!playerData.twitch_username) {
          updates.twitch_username = profileData?.twitch_username || user?.user_metadata?.preferred_username || null;
        }

        if (Object.keys(updates).length > 0) {
          const { data: updatedPlayer } = await supabase
            .from('the_life_players')
            .update(updates)
            .eq('user_id', user.id)
            .select()
            .single();
          
          if (updatedPlayer) playerData = updatedPlayer;
        }
      }

      // Calculate equipped item bonuses
      if (playerData.equipped_weapon_id || playerData.equipped_gear_id) {
        const equipmentIds = [];
        if (playerData.equipped_weapon_id) equipmentIds.push(playerData.equipped_weapon_id);
        if (playerData.equipped_gear_id) equipmentIds.push(playerData.equipped_gear_id);

        const { data: equippedItems } = await supabase
          .from('the_life_items')
          .select('id, boost_type, boost_amount')
          .in('id', equipmentIds);

        if (equippedItems) {
          equippedItems.forEach(item => {
            if (item.boost_type === 'power' && item.boost_amount) {
              playerData.power = (playerData.power || 0) + item.boost_amount;
            } else if (item.boost_type === 'defense' && item.boost_amount) {
              playerData.defense = (playerData.defense || 0) + item.boost_amount;
            }
          });
        }
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
          stamina: Math.min(player.stamina + 10, player.max_stamina),
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
        text: `Daily bonus claimed! +10 stamina (${newStreak} day streak)` 
      });
    } catch (err) {
      console.error('Error claiming daily bonus:', err);
    }
  };

  const startStaminaRefill = () => {
    const interval = setInterval(async () => {
      if (!player) return;

      const lastRefill = new Date(player.last_stamina_refill);
      const now = new Date();
      const hoursPassed = (now - lastRefill) / 1000 / 60 / 60;

      if (hoursPassed >= 1 && player.stamina < player.max_stamina) {
        const staminaToAdd = Math.floor(hoursPassed) * 20;
        const newStamina = Math.min(player.stamina + staminaToAdd, player.max_stamina);

        const { data, error } = await supabase
          .from('the_life_players')
          .update({
            stamina: newStamina,
            last_stamina_refill: now.toISOString()
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
      // Clean up stale presence first (older than 90 seconds)
      await supabase.rpc('cleanup_stale_pvp_presence');

      // Get online players from presence system (last heartbeat within 90 seconds)
      const { data: presenceData, error: presenceError } = await supabase
        .from('the_life_pvp_presence')
        .select('player_id, user_id')
        .gte('last_heartbeat', new Date(Date.now() - 90 * 1000).toISOString());

      if (presenceError) throw presenceError;

      if (!presenceData || presenceData.length === 0) {
        setOnlinePlayers([]);
        return;
      }

      // Get player IDs that are online (excluding current user)
      const onlinePlayerIds = presenceData
        .filter(p => p.user_id !== user.id)
        .map(p => p.player_id);

      if (onlinePlayerIds.length === 0) {
        setOnlinePlayers([]);
        return;
      }

      // Fetch full player data for online players
      const { data, error } = await supabase
        .from('the_life_players')
        .select('id, user_id, level, xp, cash, bank_balance, pvp_wins, pvp_losses, hp, max_hp, power, intelligence, defense, avatar_url, se_username, hospital_until, jail_until')
        .in('id', onlinePlayerIds)
        .limit(50);

      if (error) throw error;

      // Filter out players in hospital or jail
      const now = new Date();
      const availablePlayers = data?.filter(p => {
        const inHospital = p.hospital_until && new Date(p.hospital_until) > now;
        const inJail = p.jail_until && new Date(p.jail_until) > now;
        return !inHospital && !inJail;
      }) || [];

      // Enrich with usernames from SE connections and profiles
      if (availablePlayers && availablePlayers.length > 0) {
        const userIds = availablePlayers.map(p => p.user_id);
        
        // Fetch SE usernames in batch
        const { data: seConnections } = await supabase
          .from('streamelements_connections')
          .select('user_id, se_username')
          .in('user_id', userIds);

        // Fetch Twitch usernames in batch
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, twitch_username')
          .in('user_id', userIds);

        // Create lookup maps
        const seUsernameMap = {};
        seConnections?.forEach(conn => {
          if (conn.se_username) {
            seUsernameMap[conn.user_id] = conn.se_username;
          }
        });

        const twitchUsernameMap = {};
        profiles?.forEach(profile => {
          if (profile.twitch_username) {
            twitchUsernameMap[profile.user_id] = profile.twitch_username;
          }
        });

        // Enrich player data with usernames (priority: SE > Twitch > fallback)
        const enrichedData = availablePlayers.map(playerData => {
          const username = seUsernameMap[playerData.user_id] || 
                          twitchUsernameMap[playerData.user_id] || 
                          'Player';
          
          return {
            ...playerData,
            username,
            net_worth: (playerData.cash || 0) + (playerData.bank_balance || 0)
          };
        });

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
          opsData[`${prod.business_id}_reward_cash`] = prod.reward_cash || 0;
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
        .order('level', { ascending: false })
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
      startStaminaRefill();
    }
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔴 Setting up realtime subscription for user:', user.id);

    const channel = supabase
      .channel(`thelife-updates-${user.id}`, {
        config: {
          broadcast: { self: true },
          presence: { key: user.id }
        }
      })
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'the_life_players'
        }, 
        (payload) => {
          console.log('📨 Received player update event:', payload);
          
          // Only update if this is the current user's data
          if (payload.new && payload.new.user_id === user.id) {
            console.log('🔥 REALTIME: My player data changed!', payload.new);
            setPlayer(prevPlayer => ({
              ...prevPlayer,
              ...payload.new
            }));
            
            // If player was sent to hospital or jail, show message
            if (payload.new.hp === 0 && payload.new.hospital_until) {
              console.log('💀 Player sent to hospital!');
              setMessage({ 
                type: 'error', 
                text: 'You were attacked and sent to the hospital!' 
              });
            }
          } else {
            console.log('📭 Update was for another player, ignoring');
          }
        }
      )
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
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'the_life_player_inventory' 
        }, 
        (payload) => {
          console.log('Inventory changed, reloading...', payload);
          loadTheLifeInventory();
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to realtime updates!');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel error - retrying connection...');
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Subscription timed out');
        } else if (status === 'CLOSED') {
          console.warn('⚠️ Channel closed');
        }
      });

    return () => {
      console.log('🔴 Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id]); // Only depend on user.id, not player

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
