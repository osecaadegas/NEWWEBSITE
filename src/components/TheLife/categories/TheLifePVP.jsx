import { supabase } from '../../../config/supabaseClient';
import { useState, useEffect, useRef } from 'react';

/**
 * PVP Category Component
 * Handles player vs player battles and chat
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
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const scrollContainerRef = useRef(null);
  const chatEndRef = useRef(null);
  const [usernameMap, setUsernameMap] = useState({});
  const [pvpLogs, setPvpLogs] = useState([]);

  // Generate avatar URL based on username
  const getAvatarUrl = (username, userId) => {
    const seed = userId || username || 'player';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
  };

  // Calculate win chance based on skills, XP, and HP
  const calculateWinChance = (attacker, defender) => {
    const attackerPower = 
      (attacker.power || 0) * 2 +
      (attacker.defense || 0) * 1.5 +
      (attacker.intelligence || 0) * 1 +
      (attacker.xp || 0) * 0.01 +
      (attacker.hp || 0) * 0.5;
    
    const defenderPower = 
      (defender.power || 0) * 2 +
      (defender.defense || 0) * 1.5 +
      (defender.intelligence || 0) * 1 +
      (defender.xp || 0) * 0.01 +
      (defender.hp || 0) * 0.5;
    
    const rawWinChance = (attackerPower / (attackerPower + defenderPower)) * 100;
    return Math.max(5, Math.min(95, rawWinChance));
  };

  // Send heartbeat to mark player as online
  const sendHeartbeat = async () => {
    if (!player?.id || !user?.id) return;
    
    try {
      await supabase.rpc('update_pvp_presence', {
        p_player_id: player.id,
        p_user_id: user.id
      });
    } catch (err) {
      console.error('Error sending heartbeat:', err);
    }
  };

  // Remove presence when leaving
  const removePresence = async () => {
    if (!player?.id) return;
    
    try {
      await supabase
        .from('the_life_pvp_presence')
        .delete()
        .eq('player_id', player.id);
    } catch (err) {
      console.error('Error removing presence:', err);
    }
  };

  // Load chat messages and setup subscriptions
  useEffect(() => {
    loadChatMessages();
    loadPvpLogs();
    
    // Send initial heartbeat
    sendHeartbeat();
    
    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat();
    }, 30000);

    // Subscribe to new messages
    const chatSubscription = supabase
      .channel('pvp_chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'the_life_pvp_chat'
      }, async (payload) => {
        setChatMessages(prev => [...prev, payload.new]);
        // Auto scroll to bottom on new message
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .subscribe();

    // Subscribe to presence changes for real-time online status
    const presenceSubscription = supabase
      .channel('pvp_presence')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'the_life_pvp_presence'
      }, () => {
        // Reload online players when presence changes
        loadOnlinePlayers();
      })
      .subscribe();

    // Auto-refresh online players every 20 seconds
    const intervalId = setInterval(() => {
      loadOnlinePlayers();
    }, 20000);

    return () => {
      // Clean up on unmount
      removePresence();
      chatSubscription.unsubscribe();
      presenceSubscription.unsubscribe();
      clearInterval(heartbeatInterval);
      clearInterval(intervalId);
    };
  }, [player?.id, user?.id]);

  // Load usernames when chat messages change
  useEffect(() => {
    if (chatMessages.length > 0) {
      loadUsernames();
    }
  }, [chatMessages]);

  const loadChatMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('the_life_pvp_chat')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setChatMessages(data || []);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
    } catch (err) {
      console.error('Error loading chat:', err);
    }
  };

  const loadUsernames = async () => {
    try {
      // Get unique user_ids from chat messages
      const userIds = [...new Set(chatMessages.map(msg => msg.user_id).filter(Boolean))];
      if (userIds.length === 0) return;

      // Fetch SE usernames
      const { data: seConnections } = await supabase
        .from('streamelements_connections')
        .select('user_id, se_username')
        .in('user_id', userIds);

      // Fetch Twitch usernames
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, twitch_username')
        .in('user_id', userIds);

      // Build username map
      const newUsernameMap = {};
      
      // Priority: SE username > Twitch username > fallback to stored username
      userIds.forEach(userId => {
        const seConn = seConnections?.find(c => c.user_id === userId);
        const profile = profiles?.find(p => p.user_id === userId);
        
        newUsernameMap[userId] = seConn?.se_username || profile?.twitch_username || 'Player';
      });

      setUsernameMap(newUsernameMap);
    } catch (err) {
      console.error('Error loading usernames:', err);
    }
  };

  const loadPvpLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('the_life_pvp_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('PVP logs query error:', error);
        throw error;
      }
      
      console.log('Loaded PVP logs:', data?.length || 0);
      setPvpLogs(data || []);
    } catch (err) {
      console.error('Error loading PVP logs:', err);
    }
  };

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      // Get username from SE connection or profile
      let username = 'Player';
      
      const { data: seConn } = await supabase
        .from('streamelements_connections')
        .select('se_username')
        .eq('user_id', user.id)
        .single();
      
      if (seConn?.se_username) {
        username = seConn.se_username;
      } else {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('twitch_username')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.twitch_username) {
          username = profile.twitch_username;
        }
      }

      const { error } = await supabase
        .from('the_life_pvp_chat')
        .insert({
          player_id: player.id,
          user_id: user.id,
          username: username,
          message: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setMessage({ type: 'error', text: 'Failed to send message' });
    } finally {
      setSendingMessage(false);
    }
  };

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const newScrollLeft = direction === 'left' 
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };
  const attackPlayer = async (targetPlayer) => {
    if (player.stamina < 3) {
      setMessage({ type: 'error', text: 'Need 3 stamina to attack!' });
      return;
    }

    if (player.hp < 20) {
      setMessage({ type: 'error', text: 'Not enough HP to attack!' });
      return;
    }

    try {
      // Fetch fresh target data to prevent stale cash values
      const { data: freshTarget, error: fetchError } = await supabase
        .from('the_life_players')
        .select('*')
        .eq('id', targetPlayer.id)
        .single();
      
      if (fetchError || !freshTarget) {
        setMessage({ type: 'error', text: 'Target player not found!' });
        return;
      }
      
      // Calculate win chance using skills
      const winChance = calculateWinChance(player, freshTarget);
      const roll = Math.random() * 100;
      const won = roll < winChance;

      const hpLost = Math.floor(Math.random() * 30) + 10;
      const cashStolen = won ? Math.floor(freshTarget.cash * 0.1) : 0;

      let updates = {
        stamina: player.stamina - 3,
      };

      if (won) {
        updates.cash = player.cash + cashStolen;
        updates.pvp_wins = (player.pvp_wins || 0) + 1;
        // Winner doesn't lose HP
        updates.hp = player.hp;
        
        // Winner beats loser - loser always goes to hospital and loses money
        const targetUpdates = {
          hp: 0,
          cash: Math.max(0, freshTarget.cash - cashStolen),
          hospital_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        };
        
        console.log('Updating target player:', freshTarget.id, 'Updates:', targetUpdates);
        
        const { data: targetUpdateResult, error: targetUpdateError } = await supabase
          .from('the_life_players')
          .update(targetUpdates)
          .eq('id', freshTarget.id)
          .select();
        
        if (targetUpdateError) {
          console.error('Failed to update target player:', targetUpdateError);
          throw targetUpdateError;
        }
        
        console.log('Target player updated successfully:', targetUpdateResult);

        setMessage({ 
          type: 'success', 
          text: `Victory! You stole $${cashStolen.toLocaleString()} and sent them to hospital!`
        });
      } else {
        updates.pvp_losses = (player.pvp_losses || 0) + 1;
        
        // Attacker loses - calculate how much they pay
        const cashLost = Math.floor(player.cash * 0.1);
        updates.cash = Math.max(0, player.cash - cashLost);
        
        // Losing player always goes to hospital with 0 HP for 30 minutes
        updates.hp = 0;
        updates.hospital_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        
        // Defender wins and gets the money
        const defenderUpdates = {
          cash: freshTarget.cash + cashLost,
          pvp_wins: (freshTarget.pvp_wins || 0) + 1
        };
        
        console.log('Updating defender (they won):', freshTarget.id, 'Updates:', defenderUpdates);
        
        const { data: defenderUpdateResult, error: defenderUpdateError } = await supabase
          .from('the_life_players')
          .update(defenderUpdates)
          .eq('id', freshTarget.id)
          .select();
        
        if (defenderUpdateError) {
          console.error('Failed to update defender:', defenderUpdateError);
          throw defenderUpdateError;
        }
        
        console.log('Defender updated successfully:', defenderUpdateResult);
        
        setMessage({ 
          type: 'error', 
          text: `💀 Defeated! Lost $${cashLost.toLocaleString()} and sent to hospital for 30 minutes` 
        });
        // Redirect to hospital tab after a short delay
        setTimeout(() => {
          if (setActiveTab) setActiveTab('hospital');
        }, 1500);
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
      loadPvpLogs(); // Refresh battle logs
    } catch (err) {
      console.error('Error attacking player:', err);
      setMessage({ type: 'error', text: 'Attack failed' });
    }
  };

  return (
    <div className="pvp-section-v2">
      <div className="pvp-header-compact">
        <h2>🥊 Player vs Player</h2>
        <span className="online-count">{onlinePlayers.length} Online</span>
      </div>

      {isInHospital ? (
        <div className="hospital-warning-box">
          <span className="warning-icon">🏥</span>
          <p>You cannot attack players while in hospital!</p>
        </div>
      ) : (
        <>
          <div className="pvp-scroll-container">
            <button 
              className="scroll-arrow scroll-arrow-left" 
              onClick={() => scroll('left')}
              aria-label="Scroll left"
            >
              ←
            </button>
            <div className="pvp-players-scroll" ref={scrollContainerRef}>
              {onlinePlayers.length === 0 ? (
                <div className="no-players-compact">
                  <span>😴</span>
                  <p>No players online</p>
                </div>
              ) : (
                onlinePlayers.map(target => {
                  const winChance = Math.round(calculateWinChance(player, target));
                  const potential = Math.floor(target.cash * 0.1);
                  return (
                    <div key={target.id} className="pvp-card-compact">
                      <div className="pvp-card-top">
                        <img 
                          src={getAvatarUrl(target.username, target.user_id)} 
                          alt={target.username || 'Player'}
                          className="pvp-avatar-small"
                        />
                        <div className="pvp-player-info-compact">
                          <h4>{target.username || 'Player'}</h4>
                          <span className="level-badge-small">Lvl {target.level}</span>
                        </div>
                      </div>
                      
                      <div className="pvp-stats-compact">
                        <div className="stat-row">
                          <span className="stat-icon-sm">🏆</span>
                          <span className="stat-text">{target.pvp_wins || 0} wins</span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-icon-sm">💵</span>
                          <span className="stat-text">${target.cash?.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="win-chance-compact">
                        <div className="chance-bar-sm">
                          <div className="chance-fill-sm" style={{width: `${winChance}%`}}></div>
                        </div>
                        <span className="chance-label">{winChance}%</span>
                      </div>

                      <button 
                        onClick={() => attackPlayer(target)}
                        disabled={player?.hp < 20}
                        className="attack-btn-compact"
                      >
                        ⚔️ Attack
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <button 
              className="scroll-arrow scroll-arrow-right" 
              onClick={() => scroll('right')}
              aria-label="Scroll right"
            >
              →
            </button>
          </div>
        </>
      )}

      {/* PVP Chat and Battle Logs Section */}
      <div className="pvp-bottom-split">
        {/* Left: PVP Chat */}
        <div className="pvp-chat-section">
          <div className="chat-header">
            <span className="chat-icon">💬</span>
            <h3>PVP Chat</h3>
          </div>
          <div className="chat-messages">
            {chatMessages.length === 0 ? (
              <div className="no-messages">
                <p>No messages yet. Be the first to chat!</p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const displayName = msg.user_id && usernameMap[msg.user_id] 
                  ? usernameMap[msg.user_id] 
                  : msg.username || 'Player';
                
                return (
                  <div key={msg.id} className="chat-message">
                    <div className="message-header">
                      <span className="message-user">{displayName}</span>
                      <span className="message-time">{formatTime(msg.created_at)}</span>
                    </div>
                    <div className="message-text">{msg.message}</div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendChatMessage} className="chat-input-form">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              maxLength={200}
              disabled={sendingMessage || isInHospital}
              className="chat-input"
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim() || sendingMessage || isInHospital}
              className="chat-send-btn"
            >
              {sendingMessage ? '...' : '📤'}
            </button>
          </form>
        </div>

        {/* Right: Battle History */}
        <div className="pvp-logs-section">
          <div className="chat-header">
            <span className="chat-icon">⚔️</span>
            <h3>Battle History</h3>
          </div>
          <div className="pvp-logs-list">
            {pvpLogs.length === 0 ? (
              <div className="no-messages">
                <p>No battles yet!</p>
              </div>
            ) : (
              pvpLogs.map((log) => (
                <div key={log.id} className="pvp-log-item">
                  <div className="log-header">
                    <span className={log.winner_id === log.attacker_id ? 'log-winner' : 'log-loser'}>
                      Attacker
                    </span>
                    <span className="log-vs">vs</span>
                    <span className={log.winner_id === log.defender_id ? 'log-winner' : 'log-loser'}>
                      Defender
                    </span>
                  </div>
                  <div className="log-details">
                    <span className="log-result">
                      {log.winner_id === log.attacker_id ? 'Attacker' : 'Defender'} won
                    </span>
                    {log.cash_stolen > 0 && (
                      <span className="log-cash">💰 ${log.cash_stolen.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="log-time">{formatTime(log.created_at)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
