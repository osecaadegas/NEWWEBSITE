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

  // Generate avatar URL based on username
  const getAvatarUrl = (username, userId) => {
    const seed = userId || username || 'player';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
  };

  // Load chat messages
  useEffect(() => {
    loadChatMessages();
    
    // Subscribe to new messages
    const chatSubscription = supabase
      .channel('pvp_chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'the_life_pvp_chat'
      }, (payload) => {
        setChatMessages(prev => [...prev, payload.new]);
        // Auto scroll to bottom on new message
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .subscribe();

    return () => {
      chatSubscription.unsubscribe();
    };
  }, []);

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

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('the_life_pvp_chat')
        .insert({
          player_id: player.id,
          username: player.username || 'Player',
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
                  const winChance = Math.min(95, Math.max(5, 50 + ((player?.level || 0) - target.level) * 5));
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

                      <div className="pvp-potential">
                        💸 ${potential.toLocaleString()}
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

      {/* PVP Chat Section */}
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
            chatMessages.map((msg) => (
              <div key={msg.id} className="chat-message">
                <div className="message-header">
                  <span className="message-user">{msg.username}</span>
                  <span className="message-time">{formatTime(msg.created_at)}</span>
                </div>
                <div className="message-text">{msg.message}</div>
              </div>
            ))
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
    </div>
  );
}
