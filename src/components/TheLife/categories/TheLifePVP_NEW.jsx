import { supabase } from '../../../config/supabaseClient';
import { useState, useEffect, useRef } from 'react';

/**
 * REBUILT PVP Component - Clean, Modern, Fully Functional
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
  const [battleLogs, setBattleLogs] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [attacking, setAttacking] = useState(false);
  const [defeatedPopup, setDefeatedPopup] = useState(null);
  const chatEndRef = useRef(null);

  // Avatar generator
  const getAvatar = (userId, username) => {
    const seed = userId || username || 'player';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
  };

  // Load chat messages
  const loadChat = async () => {
    try {
      const { data } = await supabase
        .from('the_life_pvp_chat')
        .select(`
          *,
          player:the_life_players(se_username, user_id, avatar_url)
        `)
        .order('created_at', { ascending: true })
        .limit(50);

      setChatMessages(data || []);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('Chat load error:', err);
    }
  };

  // Load battle logs
  const loadBattleLogs = async () => {
    try {
      const { data } = await supabase
        .from('the_life_pvp_logs')
        .select(`
          *,
          attacker:the_life_players!attacker_id(se_username, user_id, avatar_url),
          defender:the_life_players!defender_id(se_username, user_id, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      setBattleLogs(data || []);
    } catch (err) {
      console.error('Battle log error:', err);
    }
  };

  // Send chat message
  const sendChat = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      await supabase.from('the_life_pvp_chat').insert({
        player_id: player.id,
        user_id: user.id,
        message: newMessage.trim()
      });

      setNewMessage('');
      loadChat();
    } catch (err) {
      console.error('Send message error:', err);
      setMessage({ type: 'error', text: 'Failed to send message' });
    } finally {
      setSendingMessage(false);
    }
  };

  // Calculate combat power with HP penalty
  const calculatePower = (playerData) => {
    const basePower = 
      (playerData.power || 0) * 2 +
      (playerData.intelligence || 0) * 1.5 +
      (playerData.defense || 0) * 1 +
      (playerData.level || 1) * 10;
    
    // HP penalty: if HP < 50%, reduce power
    const hpPercent = playerData.hp / playerData.max_hp;
    const hpMultiplier = hpPercent < 0.5 ? hpPercent * 2 : 1;
    
    return basePower * hpMultiplier;
  };

  // Attack player
  const attack = async (target) => {
    if (attacking) return;
    
    if (player.stamina < 3) {
      setMessage({ type: 'error', text: 'Need 3 stamina to attack!' });
      return;
    }

    if (player.hp < 20) {
      setMessage({ type: 'error', text: 'Need at least 20 HP to attack!' });
      return;
    }

    setAttacking(true);
    try {
      // Execute attack using database function (bypasses RLS)
      const { data: result, error } = await supabase.rpc('execute_pvp_attack', {
        p_attacker_user_id: user.id,
        p_defender_id: target.id
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      if (!result.success) {
        setMessage({ type: 'error', text: result.error });
        return;
      }

      // Show result message
      setMessage({ 
        type: result.won ? 'success' : 'error',
        text: result.message
      });

      // Refresh player data
      const { data: updatedPlayer } = await supabase
        .from('the_life_players')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (updatedPlayer) {
        setPlayer(updatedPlayer);
      }

      // Send broadcast notification to target player
      console.log('📢 Sending attack notification to target:', target.user_id);
      await supabase.channel(`player-attacks-${target.user_id}`).send({
        type: 'broadcast',
        event: 'player_attacked',
        payload: {
          target_user_id: target.user_id,
          attacker_username: player.se_username || 'Player',
          won: result.won,
          timestamp: new Date().toISOString()
        }
      });

      // Refresh lists
      loadOnlinePlayers();
      loadBattleLogs();

      // If lost, redirect to hospital after delay
      if (!result.won) {
        setTimeout(() => setActiveTab?.('hospital'), 1500);
      }

    } catch (err) {
      console.error('Attack error:', err);
      setMessage({ type: 'error', text: 'Attack failed! ' + (err.message || '') });
    } finally {
      setAttacking(false);
    }
  };

  // Send heartbeat and listen for attack notifications
  useEffect(() => {
    if (!player?.id || !user?.id) return;

    const sendHeartbeat = async () => {
      try {
        await supabase.rpc('update_pvp_presence', {
          p_player_id: player.id,
          p_user_id: user.id
        });
      } catch (err) {
        console.error('Heartbeat error:', err);
      }
    };

    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);

    // Listen for attack notifications via broadcast
    const attackChannel = supabase
      .channel(`player-attacks-${user.id}`)
      .on('broadcast', { event: 'player_attacked' }, (payload) => {
        console.log('🚨 BROADCAST: Received attack notification!', payload);
        if (payload.payload.target_user_id === user.id) {
          // Refresh player data immediately
          supabase
            .from('the_life_players')
            .select('*')
            .eq('user_id', user.id)
            .single()
            .then(({ data }) => {
              if (data) {
                console.log('🔄 Refreshed player data after attack:', data);
                setPlayer(data);
              }
            });
        }
      })
      .subscribe((status) => {
        console.log('📡 Attack notification channel status:', status);
      });

    return () => {
      clearInterval(heartbeatInterval);
      supabase.removeChannel(attackChannel);
    };
  }, [player?.id, user?.id]);

  // Load data
  useEffect(() => {
    loadChat();
    loadBattleLogs();
    loadOnlinePlayers();

    const chatSub = supabase
      .channel('pvp_chat')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'the_life_pvp_chat' },
        () => loadChat()
      )
      .subscribe();

    const logsSub = supabase
      .channel('pvp_logs')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'the_life_pvp_logs' },
        async (payload) => {
          loadBattleLogs();
          
          // Check if current player was defeated
          if (payload.new.defender_id === player?.id && payload.new.winner_id !== player?.id) {
            // Player was attacked and lost - show defeat popup
            const { data: attackerData } = await supabase
              .from('the_life_players')
              .select('se_username, avatar_url, user_id')
              .eq('id', payload.new.attacker_id)
              .single();

            if (attackerData) {
              setDefeatedPopup({
                attacker: attackerData,
                cashStolen: payload.new.cash_stolen
              });

              // Auto close after 10 seconds and redirect to hospital
              setTimeout(() => {
                setDefeatedPopup(null);
                setActiveTab?.('hospital');
              }, 10000);
            }
          }
        }
      )
      .subscribe();

    const refreshInterval = setInterval(() => {
      loadOnlinePlayers();
      loadBattleLogs();
    }, 20000);

    return () => {
      chatSub.unsubscribe();
      logsSub.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="pvp-rebuilt">
      {/* Header */}
      <div className="pvp-header-new">
        <h2>🥊 Player vs Player</h2>
        <div className="online-badge">{onlinePlayers.length} Online</div>
      </div>

      {isInHospital && (
        <div className="pvp-warning">
          <span>🏥</span>
          <p>You cannot attack while in hospital!</p>
        </div>
      )}

      {/* Defeated Popup */}
      {defeatedPopup && (
        <div className="pvp-defeat-overlay">
          <div className="pvp-defeat-card">
            <div className="defeat-header">
              <span className="defeat-icon">💀</span>
              <h2>YOU'VE BEEN BEATEN!</h2>
            </div>
            
            <div className="defeat-attacker">
              <img 
                src={defeatedPopup.attacker.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${defeatedPopup.attacker.user_id}`}
                alt={defeatedPopup.attacker.se_username}
                className="defeat-avatar"
              />
              <div className="defeat-attacker-info">
                <h3>{defeatedPopup.attacker.se_username || 'Player'}</h3>
                <p className="defeat-subtitle">defeated you in combat</p>
              </div>
            </div>

            <div className="defeat-losses">
              <div className="defeat-loss-item">
                <span className="loss-icon">💰</span>
                <div>
                  <p className="loss-label">Cash Stolen</p>
                  <p className="loss-value">${defeatedPopup.cashStolen?.toLocaleString()}</p>
                </div>
              </div>
              <div className="defeat-loss-item">
                <span className="loss-icon">❤️</span>
                <div>
                  <p className="loss-label">HP Lost</p>
                  <p className="loss-value">ALL (0 HP)</p>
                </div>
              </div>
            </div>

            <div className="defeat-message">
              <p className="defeat-advice">💪 Get stronger, smarter, and faster!</p>
              <p className="defeat-tip">🏦 Pro tip: Always keep your money in the bank for safety!</p>
            </div>

            <div className="defeat-redirect">
              <p>🏥 Sending you to hospital in 10 seconds...</p>
            </div>

            <button 
              onClick={() => {
                setDefeatedPopup(null);
                setActiveTab?.('hospital');
              }}
              className="defeat-close-btn"
            >
              Go to Hospital Now
            </button>
          </div>
        </div>
      )}

      {/* Online Players Grid */}
      <div className="pvp-players-section">
        <h3>🎯 Online Players</h3>
        <div className="pvp-players-grid">
          {onlinePlayers.length === 0 ? (
            <div className="no-players">
              <span>😴</span>
              <p>No players online</p>
            </div>
          ) : (
            onlinePlayers.map(target => {
              const power = calculatePower(target);
              const myPower = calculatePower(player);
              const winChance = Math.round(
                Math.max(5, Math.min(95, (myPower / (myPower + power)) * 100))
              );

              return (
                <div key={target.id} className="pvp-player-card">
                  <img 
                    src={target.avatar_url || getAvatar(target.user_id, target.se_username)} 
                    alt={target.se_username || 'Player'} 
                    className="player-avatar"
                  />
                  <div className="player-details">
                    <h4>{target.se_username || target.username || 'Player'}</h4>
                    <span className="player-level">Level {target.level}</span>
                    
                    <div className="player-stats-mini">
                      <div className="stat-mini">
                        <span>❤️ {target.hp}/{target.max_hp}</span>
                      </div>
                      <div className="stat-mini">
                        <span>💪 {target.power || 0}</span>
                      </div>
                      <div className="stat-mini">
                        <span>🧠 {target.intelligence || 0}</span>
                      </div>
                      <div className="stat-mini">
                        <span>🛡️ {target.defense || 0}</span>
                      </div>
                    </div>

                    <div className="player-cash">
                      💰 ${target.cash?.toLocaleString()}
                    </div>

                    <div className="win-chance-bar">
                      <div className="chance-fill" style={{width: `${winChance}%`}}></div>
                      <span className="chance-text">{winChance}% Win</span>
                    </div>

                    <button 
                      onClick={() => attack(target)}
                      disabled={isInHospital || attacking || player.hp < 20}
                      className="attack-button-new"
                    >
                      ⚔️ Attack
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat and Battle Log */}
      <div className="pvp-bottom-section">
        {/* Chat */}
        <div className="pvp-chat-box">
          <h3>💬 PvP Chat</h3>
          <div className="chat-messages-new">
            {chatMessages.map(msg => (
              <div key={msg.id} className="chat-msg">
                <img 
                  src={msg.player?.avatar_url || getAvatar(msg.player?.user_id, msg.player?.se_username)} 
                  alt="Avatar" 
                  className="msg-avatar"
                />
                <div className="msg-content">
                  <div className="msg-header">
                    <span className="msg-username">{msg.player?.se_username || 'Player'}</span>
                    <span className="msg-time">{formatTime(msg.created_at)}</span>
                  </div>
                  <p className="msg-text">{msg.message}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendChat} className="chat-input-form-new">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              maxLength={200}
              disabled={sendingMessage || isInHospital}
            />
            <button type="submit" disabled={!newMessage.trim() || sendingMessage}>
              {sendingMessage ? '...' : '📤'}
            </button>
          </form>
        </div>

        {/* Battle Log */}
        <div className="pvp-battle-log">
          <h3>⚔️ Battle History</h3>
          <div className="battle-log-list">
            {battleLogs.map(log => {
              const isAttackerWinner = log.winner_id === log.attacker_id;
              const winner = isAttackerWinner ? log.attacker : log.defender;
              const loser = isAttackerWinner ? log.defender : log.attacker;

              return (
                <div key={log.id} className="battle-log-item">
                  <div className="battle-participants">
                    <div className="participant winner">
                      <img 
                        src={winner?.avatar_url || getAvatar(winner?.user_id, winner?.se_username)} 
                        alt="Winner" 
                        className="battle-avatar"
                      />
                      <span className="participant-name">{winner?.se_username || 'Player'}</span>
                      <span className="winner-badge">👑</span>
                    </div>
                    <span className="vs">VS</span>
                    <div className="participant loser">
                      <img 
                        src={loser?.avatar_url || getAvatar(loser?.user_id, loser?.se_username)} 
                        alt="Loser" 
                        className="battle-avatar"
                      />
                      <span className="participant-name defeated">{loser?.se_username || 'Player'}</span>
                    </div>
                  </div>
                  {log.cash_stolen > 0 && (
                    <div className="battle-reward">
                      💰 ${log.cash_stolen.toLocaleString()} stolen
                    </div>
                  )}
                  <div className="battle-time">{formatTime(log.created_at)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
