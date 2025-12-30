import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import './GiveawaysPage.css';

export default function GiveawaysPage() {
  const { user } = useAuth();
  const [giveaways, setGiveaways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(null);
  const [userEntries, setUserEntries] = useState({});
  const [successMessage, setSuccessMessage] = useState({});
  const [allParticipants, setAllParticipants] = useState([]);
  const [recentWinners, setRecentWinners] = useState([]);

  useEffect(() => {
    fetchGiveaways();
    fetchAllParticipants();
    fetchRecentWinners();
    if (user) {
      fetchUserEntries();
    }
  }, [user]);

  const fetchGiveaways = async () => {
    try {
      const { data, error } = await supabase
        .from('giveaways')
        .select(`
          *,
          giveaway_entries(count),
          giveaway_winners(user_id)
        `)
        .eq('is_active', true)
        .gte('ends_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGiveaways(data || []);
    } catch (error) {
      console.error('Error fetching giveaways:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('giveaway_entries')
        .select('giveaway_id, tickets_count')
        .eq('user_id', user.id);

      if (error) throw error;

      const entriesMap = {};
      data?.forEach(entry => {
        entriesMap[entry.giveaway_id] = entry.tickets_count;
      });
      setUserEntries(entriesMap);
    } catch (error) {
      console.error('Error fetching user entries:', error);
    }
  };

  const fetchAllParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('giveaway_entries')
        .select(`
          user_id,
          tickets_count,
          entered_at,
          giveaways (title)
        `)
        .order('entered_at', { ascending: false });

      if (error) throw error;

      // Get SE usernames
      const { data: seAccounts } = await supabase
        .from('streamelements_connections')
        .select('user_id, se_username');

      const seUsernameMap = {};
      if (seAccounts) {
        seAccounts.forEach(account => {
          seUsernameMap[account.user_id] = account.se_username;
        });
      }

      // Enrich entries with SE usernames
      const enriched = data?.map(entry => ({
        ...entry,
        username: seUsernameMap[entry.user_id] || 'Unknown User',
        giveaway_title: entry.giveaways?.title || 'Unknown Giveaway'
      })) || [];

      setAllParticipants(enriched);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const fetchRecentWinners = async () => {
    try {
      const { data, error } = await supabase
        .from('giveaway_winners')
        .select(`
          user_id,
          selected_at,
          giveaways (title)
        `)
        .order('selected_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Get SE usernames
      const { data: seAccounts } = await supabase
        .from('streamelements_connections')
        .select('user_id, se_username');

      const seUsernameMap = {};
      if (seAccounts) {
        seAccounts.forEach(account => {
          seUsernameMap[account.user_id] = account.se_username;
        });
      }

      // Enrich winners with SE usernames
      const enriched = data?.map(winner => ({
        ...winner,
        username: seUsernameMap[winner.user_id] || 'Unknown User',
        giveaway_title: winner.giveaways?.title || 'Unknown Giveaway'
      })) || [];

      setRecentWinners(enriched);
    } catch (error) {
      console.error('Error fetching winners:', error);
    }
  };

  const enterGiveaway = async (giveaway, additionalTickets = 1) => {
    if (!user) {
      alert('Please login to enter giveaways');
      return;
    }

    setEntering(giveaway.id);

    try {
      const totalCost = giveaway.ticket_cost * additionalTickets;

      // If there's a cost, handle SE points
      if (totalCost > 0) {
        const { data: seConnection } = await supabase
          .from('streamelements_connections')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!seConnection) {
          alert('Please connect your StreamElements account first in Points Store');
          setEntering(null);
          return;
        }

        // Check if user has enough points
        const pointsResponse = await fetch(
          `https://api.streamelements.com/kappa/v2/points/${seConnection.se_channel_id}/${seConnection.se_username}`,
          {
            headers: {
              'Authorization': `Bearer ${seConnection.se_jwt_token}`,
              'Accept': 'application/json'
            }
          }
        );

        if (!pointsResponse.ok) throw new Error('Failed to fetch points');
        
        const pointsData = await pointsResponse.json();
        if (pointsData.points < totalCost) {
          alert(`Insufficient points. You need ${totalCost} points but have ${pointsData.points}`);
          setEntering(null);
          return;
        }

        // Deduct points
        const deductResponse = await fetch(
          `https://api.streamelements.com/kappa/v2/points/${seConnection.se_channel_id}/${seConnection.se_username}/-${totalCost}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${seConnection.se_jwt_token}`,
              'Accept': 'application/json'
            }
          }
        );

        if (!deductResponse.ok) throw new Error('Failed to deduct points');
      }

      // Check if user already has entry
      const currentTickets = userEntries[giveaway.id] || 0;

      if (currentTickets > 0 && !giveaway.allow_multiple_tickets) {
        setSuccessMessage({ [giveaway.id]: { type: 'error', text: 'You have already entered this giveaway' } });
        setTimeout(() => setSuccessMessage({}), 5000);
        setEntering(null);
        return;
      }

      if (currentTickets > 0) {
        // Update existing entry
        const { error } = await supabase
          .from('giveaway_entries')
          .update({ 
            tickets_count: currentTickets + additionalTickets,
            total_cost: (currentTickets + additionalTickets) * giveaway.ticket_cost
          })
          .eq('giveaway_id', giveaway.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new entry
        const { error } = await supabase
          .from('giveaway_entries')
          .insert([{
            giveaway_id: giveaway.id,
            user_id: user.id,
            tickets_count: additionalTickets,
            total_cost: totalCost
          }]);

        if (error) throw error;
      }

      const newTicketCount = currentTickets + additionalTickets;
      setSuccessMessage({ 
        [giveaway.id]: { 
          type: 'success', 
          text: `You have bought ${newTicketCount} ticket${newTicketCount > 1 ? 's' : ''} for "${giveaway.title}"` 
        } 
      });
      setTimeout(() => setSuccessMessage({}), 5000);
      
      fetchUserEntries();
      fetchGiveaways();
      fetchAllParticipants();
      fetchRecentWinners();
    } catch (error) {
      console.error('Error entering giveaway:', error);
      alert('Failed to enter giveaway. Please try again.');
    } finally {
      setEntering(null);
    }
  };

  const getTimeRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  if (loading) {
    return (
      <div className="giveaways-page">
        <div className="loading">Loading giveaways...</div>
      </div>
    );
  }

  return (
    <div className="giveaways-page">
      <div className="giveaways-container">
        <div className="giveaways-header">
          <h1>🎁 Giveaways</h1>
          <p className="giveaways-subtitle">Participate in amazing giveaways and win incredible prizes</p>
        </div>

        <div className="giveaways-main-layout">
          <div className="giveaways-content">
          {giveaways.length === 0 ? (
            <div className="coming-soon-banner">
              <div className="banner-icon">🎁</div>
              <h2>No Active Giveaways</h2>
              <p>Check back soon for new giveaways!</p>
            </div>
          ) : (
            <div className="giveaways-grid">
              {giveaways.map((giveaway) => {
                const entriesCount = giveaway.giveaway_entries?.[0]?.count || 0;
                const userTickets = userEntries[giveaway.id] || 0;
                const isWinner = giveaway.giveaway_winners?.some(w => w.user_id === user?.id);
                
                return (
                  <div key={giveaway.id} className="giveaway-card">
                    {successMessage[giveaway.id] && (
                      <div className={`card-message ${successMessage[giveaway.id].type}`}>
                        {successMessage[giveaway.id].type === 'success' ? '✓' : '!'} {successMessage[giveaway.id].text}
                      </div>
                    )}
                    
                    {giveaway.image_url && (
                      <div className="giveaway-image">
                        <img src={giveaway.image_url} alt={giveaway.title} />
                        <div className="time-badge">{getTimeRemaining(giveaway.ends_at)}</div>
                      </div>
                    )}
                    
                    <div className="giveaway-body">
                      <h3>{giveaway.title}</h3>
                      {giveaway.description && (
                        <p className="giveaway-description">{giveaway.description}</p>
                      )}

                      <div className="giveaway-info">
                        <div className="info-item">
                          <span className="label">Entry Cost:</span>
                          <span className="value">
                            {giveaway.ticket_cost === 0 ? 'FREE' : `${giveaway.ticket_cost} pts`}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="label">Winners:</span>
                          <span className="value">{giveaway.max_winners}</span>
                        </div>
                        <div className="info-item">
                          <span className="label">Total Entries:</span>
                          <span className="value">{entriesCount}</span>
                        </div>
                        {userTickets > 0 && (
                          <div className="info-item highlight">
                            <span className="label">Your Tickets:</span>
                            <span className="value">{userTickets}</span>
                          </div>
                        )}
                      </div>

                      {isWinner && (
                        <div className="winner-badge">
                          🏆 You Won This Giveaway!
                        </div>
                      )}

                      <div className="giveaway-actions">
                        {!user ? (
                          <button className="join-btn disabled">Login to Enter</button>
                        ) : userTickets > 0 && !giveaway.allow_multiple_tickets ? (
                          <button className="join-btn entered">✓ Entered</button>
                        ) : (
                          <button 
                            className="join-btn"
                            onClick={() => enterGiveaway(giveaway)}
                            disabled={entering === giveaway.id}
                          >
                            {entering === giveaway.id ? 'Entering...' : userTickets > 0 ? 'Buy More Tickets' : giveaway.ticket_cost === 0 ? 'Enter Free' : `Enter (${giveaway.ticket_cost} pts)`}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Participants Footer */}
          {allParticipants.length > 0 && (
            <div className="participants-footer">
              <h2>🎟️ Recent Entries</h2>
              <div className="participants-list">
                {allParticipants.slice(0, 20).map((entry, index) => (
                  <div key={index} className="participant-item">
                    <div className="participant-avatar">
                      {entry.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="participant-info">
                      <div className="participant-name">{entry.username}</div>
                      <div className="participant-details">
                        bought {entry.tickets_count} ticket{entry.tickets_count > 1 ? 's' : ''} for "{entry.giveaway_title}"
                      </div>
                    </div>
                    <div className="participant-time">
                      {new Date(entry.entered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Winners Sidebar */}
        {recentWinners.length > 0 && (
          <div className="winners-sidebar">
            <h2>🏆 Recent Winners</h2>
            <div className="winners-list">
              {recentWinners.map((winner, index) => (
                <div key={index} className="winner-item">
                  <div className="winner-trophy">🏆</div>
                  <div className="winner-info">
                    <div className="winner-name">{winner.username}</div>
                    <div className="winner-giveaway">{winner.giveaway_title}</div>
                    <div className="winner-date">
                      {new Date(winner.selected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
